/**
 * VotoCheck — Boletim semanal por estado (08/10/2026, plano pós-eleição A4).
 *
 * Inscrição opcional: só e-mail + UF. Confirmação dupla (o e-mail só entra na lista depois do
 * clique no link), descadastro em 1 clique pelo mesmo token. O site continua sem cadastro
 * obrigatório. Envio semanal começa depois do 2º turno (fábrica v2 — ver plano).
 *
 * Rotas (src/index.js): GET /boletim · POST /boletim · GET /boletim/confirmar?t= · GET /boletim/sair?t=
 * Tabela: boletim_inscricao (migration 0015).
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { enviarEmail } from './email.js';
import { emailValido } from './acompanhamento.js';
import { UF_NOMES } from './home_html.js';
import { Icone } from './icones.js';

function gerarToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Inscreve (ou reativa) e manda o e-mail de confirmação. Nunca lança.
 * Retorna { ok, status: 'enviado'|'ja_confirmado'|'invalido'|'erro' }.
 */
export async function inscreverBoletim(env, ctx, { email, uf, origem, site }) {
  const e = String(email || '').trim().toLowerCase();
  const u = String(uf || '').trim().toUpperCase();
  if (!emailValido(e) || !UF_NOMES[u]) return { ok: false, status: 'invalido' };
  const db = env.DB;
  try {
    const atual = await db.prepare(`SELECT token, confirmado, ativo, ultimo_envio_confirmacao FROM boletim_inscricao WHERE email = ?`).bind(e).first();
    if (atual && atual.confirmado && atual.ativo) {
      await db.prepare(`UPDATE boletim_inscricao SET uf = ? WHERE email = ?`).bind(u, e).run();
      return { ok: true, status: 'ja_confirmado' };
    }
    let token = atual?.token;
    if (!atual) {
      token = gerarToken();
      await db.prepare(`INSERT INTO boletim_inscricao (email, uf, token, origem) VALUES (?, ?, ?, ?)`).bind(e, u, token, String(origem || '').slice(0, 60)).run();
    } else {
      await db.prepare(`UPDATE boletim_inscricao SET uf = ?, ativo = 1, cancelado_em = NULL WHERE email = ?`).bind(u, e).run();
      // anti-abuso: no máximo 1 e-mail de confirmação a cada 10 minutos para o mesmo endereço
      const ultimo = atual.ultimo_envio_confirmacao ? Date.parse(atual.ultimo_envio_confirmacao.replace(' ', 'T') + 'Z') : 0;
      if (Date.now() - ultimo < 10 * 60 * 1000) return { ok: true, status: 'enviado' };
    }
    await db.prepare(`UPDATE boletim_inscricao SET ultimo_envio_confirmacao = datetime('now') WHERE email = ?`).bind(e).run();
    const msg = emailConfirmacao({ uf: u, token, site });
    ctx.waitUntil(enviarEmail(env, { to: e, ...msg }).then((r) => { if (!r.ok) console.error('boletim: e-mail de confirmação falhou', r); }));
    return { ok: true, status: 'enviado' };
  } catch (err) {
    console.error('boletim: falha ao inscrever', err);
    return { ok: false, status: 'erro' };
  }
}

export async function confirmarBoletim(env, token) {
  if (!/^[0-9a-f]{48}$/.test(token || '')) return null;
  const r = await env.DB.prepare(`SELECT uf FROM boletim_inscricao WHERE token = ?`).bind(token).first();
  if (!r) return null;
  await env.DB.prepare(`UPDATE boletim_inscricao SET confirmado = 1, ativo = 1, confirmado_em = COALESCE(confirmado_em, datetime('now')), cancelado_em = NULL WHERE token = ?`).bind(token).run();
  return r.uf;
}

export async function sairBoletim(env, token) {
  if (!/^[0-9a-f]{48}$/.test(token || '')) return false;
  const r = await env.DB.prepare(`UPDATE boletim_inscricao SET ativo = 0, cancelado_em = datetime('now') WHERE token = ?`).bind(token).run();
  return Boolean(r?.meta?.changes);
}

function emailConfirmacao({ uf, token, site }) {
  const nomeUf = UF_NOMES[uf] || uf;
  const link = `${site}/boletim/confirmar?t=${token}`;
  const sair = `${site}/boletim/sair?t=${token}`;
  const subject = 'Confirme seu e-mail para receber o boletim do VotoCheck';
  const text = `Falta um clique para receber o boletim semanal do VotoCheck sobre ${nomeUf}.

Confirme aqui: ${link}

Toda semana: como votaram os deputados e senadores do seu estado, quanto gastaram e o que mudou, sempre com a fonte oficial. O primeiro envio sai depois do 2º turno (25/10).

Não foi você? É só ignorar este e-mail: sem a confirmação, seu endereço não entra na lista.
Para sair a qualquer momento: ${sair}

VotoCheck · votocheck.com.br`;
  const html = `
  <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0A1440">
    <p style="font-size:16px;line-height:1.5">Falta um clique para receber o boletim semanal do VotoCheck sobre <strong>${escapeHtml(nomeUf)}</strong>.</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#0059F5;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;display:inline-block">Confirmar meu e-mail</a></p>
    <p style="font-size:14px;line-height:1.5;color:#3A4461">Toda semana: como votaram os deputados e senadores do seu estado, quanto gastaram e o que mudou, sempre com a fonte oficial. O primeiro envio sai depois do 2º turno (25/10).</p>
    <p style="font-size:13px;line-height:1.5;color:#6B7590;margin-top:28px">Não foi você? É só ignorar: sem a confirmação, seu endereço não entra na lista. Para sair a qualquer momento: <a href="${sair}" style="color:#6B7590">cancelar</a>.</p>
    <p style="font-size:12px;color:#9AA3B5">VotoCheck · votocheck.com.br</p>
  </div>`;
  return { subject, text, html };
}

/** Bloco de inscrição reutilizável (home, /eleitos/:uf, /boletim). Fundo navy. */
export function renderBlocoBoletim({ uf = '', origem = 'home', status = '' } = {}) {
  const aviso = {
    enviado: 'Pronto. Mandamos um e-mail para você confirmar. Se não aparecer, confira a caixa de spam.',
    ja_confirmado: 'Esse e-mail já está inscrito. Atualizamos o estado escolhido.',
    invalido: 'Confira o e-mail e escolha um estado para continuar.',
    erro: 'Não conseguimos salvar agora. Tente de novo em alguns minutos.',
  }[status];
  return `
  <section class="vc-sec vc-sec--navy bo-sec" id="boletim" aria-labelledby="bo-titulo">
    <style>${ESTILO_BOLETIM}</style>
    <div class="vc-wrap bo-grid">
      <div>
        <h2 class="vc-h2" id="bo-titulo">Toda semana, o que os eleitos do seu estado fizeram</h2>
        <p class="vc-lead">Como votaram, quanto gastaram e o que mudou, sempre com a fonte oficial. Um e-mail por semana, a partir do fim de outubro. Sai com 1 clique.</p>
      </div>
      <form class="bo-form" method="POST" action="/boletim" novalidate>
        <input type="hidden" name="origem" value="${escapeHtml(origem)}" />
        <div class="bo-hp" aria-hidden="true"><label>Site <input type="text" name="site" tabindex="-1" autocomplete="off" /></label></div>
        <label class="bo-label" for="bo-email-${escapeHtml(origem)}">Seu e-mail</label>
        <input class="bo-input" id="bo-email-${escapeHtml(origem)}" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nome@exemplo.com" />
        <label class="bo-label" for="bo-uf-${escapeHtml(origem)}">Seu estado</label>
        <select class="bo-input" id="bo-uf-${escapeHtml(origem)}" name="uf" required>
          <option value="">Escolha o estado</option>
          ${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${escapeHtml(UF_NOMES[u])}</option>`).join('')}
        </select>
        <button class="vc-btn vc-btn--pri bo-btn" type="submit">${Icone.sino(18)} Quero receber o boletim</button>
        ${aviso ? `<p class="bo-aviso${status === 'enviado' || status === 'ja_confirmado' ? ' ok' : ''}" role="status">${escapeHtml(aviso)}</p>` : ''}
        <p class="bo-nota">Usamos seu e-mail só para o boletim. Nada de spam e nada de repasse. <a href="/termos#boletim">Como tratamos seus dados</a>.</p>
      </form>
    </div>
  </section>`;
}

export function renderPaginaBoletim({ status = '', uf = '' } = {}) {
  return pagina({
    titulo: 'Boletim semanal do VotoCheck — o que os eleitos do seu estado fizeram',
    descricao: 'Receba toda semana como votaram, quanto gastaram e o que mudou com os deputados e senadores do seu estado, com fonte oficial. Grátis, sai com 1 clique.',
    caminho: '/boletim',
    larga: true,
    corpo: renderBlocoBoletim({ uf, origem: 'pagina', status }),
  });
}

export function renderResultadoBoletim({ titulo, texto, uf = '' }) {
  return pagina({
    titulo: `${titulo} — VotoCheck`,
    descricao: texto,
    caminho: '/boletim',
    noindex: true,
    corpo: `<div style="max-width:560px;margin:56px auto;text-align:center">
      <h1 style="font-size:28px;margin-bottom:12px">${escapeHtml(titulo)}</h1>
      <p style="color:var(--text-muted);font-size:17px;line-height:1.55">${escapeHtml(texto)}</p>
      <p style="margin-top:28px"><a class="vc-btn vc-btn--pri" href="${uf ? `/eleitos/${uf.toLowerCase()}` : '/eleitos'}">Ver os eleitos ${uf ? `de ${escapeHtml(uf)}` : 'por estado'}</a></p>
    </div>`,
  });
}

export const ESTILO_BOLETIM = `
  .bo-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
  .bo-form { background: #fff; color: var(--ink); border-radius: 20px; padding: 24px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.6); }
  .bo-label { display: block; font-size: 14px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
  .bo-input { width: 100%; font: 500 16px var(--font-body); color: var(--ink); background: #fff; border: 1.5px solid var(--line-2); border-radius: 12px; padding: 13px 14px; margin-bottom: 14px; }
  .bo-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.18); }
  .bo-btn { width: 100%; }
  .bo-aviso { margin: 12px 0 0; font-size: 14px; color: #A3311B; background: #FFF1EE; border-radius: 10px; padding: 10px 12px; }
  .bo-aviso.ok { color: #00735F; background: var(--teal-50); }
  .bo-nota { font-size: 12.5px; color: var(--muted); margin: 12px 0 0; }
  .bo-nota a { color: var(--blue); }
  .bo-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  @media (max-width: 860px) { .bo-grid { grid-template-columns: 1fr; gap: 24px; } }
`;
