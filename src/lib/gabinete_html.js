/**
 * VotoCheck — quadro de posicionamentos e acesso do gabinete (01/11/2026).
 *
 * Ficha: os mesmos 7 temas para todos os eleitos, com a resposta oficial do gabinete ou "sem resposta ainda"
 * (e o número de eleitores que pediram). Ninguém edita a resposta do gabinete: o VotoCheck só publica.
 * /gabinete: o gabinete entra com o e-mail OFICIAL (o mesmo publicado pela Câmara/Senado) e um código de
 * 6 dígitos enviado para ele (OTP, 15 min, 5 tentativas). Sessão de 7 dias por cookie HttpOnly.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { TEMAS_POSICIONAMENTO } from './cobranca_html.js';
import { enviarEmail } from './email.js';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const aleatorio = (n) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return hex(b); };
const dataBR = (s) => String(s || '').slice(0, 10).split('-').reverse().join('/');

export function blocoPosicionamentos({ pessoaId, nome, posicionamentos = [], pedidos = {} }) {
  const por = Object.fromEntries(posicionamentos.map((p) => [p.tema, p]));
  const primeiro = escapeHtml(String(nome).split(' ')[0]);
  const respondidos = posicionamentos.length;
  const cards = TEMAS_POSICIONAMENTO.map((t) => {
    const p = por[t.id];
    const n = pedidos[`pos-${t.id}`] || 0;
    return `
      <article class="ps-card${p ? ' ps-card--ok' : ''}">
        <small>${escapeHtml(t.titulo)}</small>
        <h3>${escapeHtml(t.pergunta)}</h3>
        ${p
          ? `<blockquote>${escapeHtml(p.texto)}</blockquote><span class="ps-meta">${Icone.checkCirculo(14)} Resposta oficial do gabinete · ${dataBR(p.atualizado_em)}</span>`
          : `<p class="ps-vazio">Sem resposta ainda.</p><span class="ps-meta">${n ? `${n} ${n === 1 ? 'pessoa pediu' : 'pessoas pediram'} este posicionamento` : 'Seja a primeira pessoa a pedir'}</span>
             <a class="ps-pedir" href="/cobrar/${pessoaId}?tema=pos-${t.id}">Pedir posicionamento →</a>`}
      </article>`;
  }).join('');
  return `
    <section class="fx-sec ps" id="posicionamentos" aria-labelledby="t-ps">
      <style>${ESTILO_POS}</style>
      <h2 id="t-ps">O que ${primeiro} pensa sobre os temas que mais pesam</h2>
      <p class="fx-sub">As mesmas ${TEMAS_POSICIONAMENTO.length} perguntas para todos os eleitos. A resposta é escrita pelo próprio gabinete, autenticado pelo e-mail oficial, e publicada sem edição. ${respondidos ? `${respondidos} de ${TEMAS_POSICIONAMENTO.length} respondidas.` : 'Nenhuma respondida até agora.'}</p>
      <div class="ps-grid">${cards}</div>
      <p class="ps-gab">É do gabinete? <a href="/gabinete">Responda pelo acesso do gabinete</a> com o e-mail oficial.</p>
    </section>`;
}

export const ESTILO_POS = `
  .ps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .ps-card { display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
  .ps-card--ok { border-color: #A7EBDB; background: #F4FDFA; }
  .ps-card small { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--blue); }
  .ps-card h3 { font-size: 15.5px; line-height: 1.4; margin: 0; color: var(--ink); }
  .ps-card blockquote { margin: 4px 0 0; font-size: 14.5px; line-height: 1.55; color: var(--ink-2); white-space: pre-wrap; }
  .ps-vazio { margin: 4px 0 0; font-size: 14.5px; color: var(--muted); font-style: italic; }
  .ps-meta { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--muted); margin-top: auto; }
  .ps-card--ok .ps-meta { color: #00735F; }
  .ps-pedir { font-size: 14px; font-weight: 700; color: var(--blue); text-decoration: none; }
  .ps-pedir:hover { text-decoration: underline; }
  .ps-gab { font-size: 13.5px; color: var(--muted); margin: 14px 0 0; }
`;

// ---------- acesso do gabinete ----------
export async function pedirCodigo(env, emailBruto) {
  const email = String(emailBruto || '').trim().toLowerCase();
  const alvo = await env.DB.prepare(
    `SELECT co.pessoa_id, p.nome_urna_atual, p.nome_completo FROM contato_oficial co JOIN pessoa p ON p.id = co.pessoa_id WHERE co.tipo = 'email' AND lower(co.valor) = ? AND co.invalido = 0 LIMIT 1`
  ).bind(email).first();
  // Mesma resposta exista ou não: não revela quais e-mails são oficiais.
  if (!alvo) return { ok: true };
  const atual = await env.DB.prepare(`SELECT expira_em FROM gabinete_otp WHERE email = ? AND pessoa_id = ?`).bind(email, alvo.pessoa_id).first();
  if (atual && Date.parse(atual.expira_em) - 14 * 60000 > Date.now()) return { ok: true }; // 1 código por minuto
  const codigo = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await env.DB.prepare(
    `INSERT INTO gabinete_otp (email, pessoa_id, codigo_hash, expira_em, tentativas) VALUES (?,?,?,?,0)
     ON CONFLICT(email, pessoa_id) DO UPDATE SET codigo_hash = excluded.codigo_hash, expira_em = excluded.expira_em, tentativas = 0`
  ).bind(email, alvo.pessoa_id, await sha(`${codigo}|${email}`), new Date(Date.now() + 15 * 60000).toISOString()).run();
  await enviarEmail(env, {
    to: email,
    subject: `Código de acesso do gabinete no VotoCheck: ${codigo}`,
    text: `Código de acesso ao quadro de posicionamentos de ${alvo.nome_urna_atual || alvo.nome_completo} no VotoCheck: ${codigo}\n\nVale por 15 minutos. Se não foi o gabinete que pediu, ignore este e-mail.\nvotocheck.com.br/gabinete`,
  });
  return { ok: true };
}

export async function validarCodigo(env, emailBruto, codigo) {
  const email = String(emailBruto || '').trim().toLowerCase();
  const r = await env.DB.prepare(`SELECT * FROM gabinete_otp WHERE email = ? ORDER BY expira_em DESC LIMIT 1`).bind(email).first();
  if (!r || Date.parse(r.expira_em) < Date.now() || r.tentativas >= 5) return { ok: false, motivo: 'Código vencido ou tentativas esgotadas. Peça um novo.' };
  if ((await sha(`${String(codigo || '').trim()}|${email}`)) !== r.codigo_hash) {
    await env.DB.prepare(`UPDATE gabinete_otp SET tentativas = tentativas + 1 WHERE email = ? AND pessoa_id = ?`).bind(email, r.pessoa_id).run();
    return { ok: false, motivo: 'Código incorreto.' };
  }
  const sessao = aleatorio(24);
  await env.DB.prepare(`UPDATE gabinete_otp SET sessao = ?, sessao_expira = ?, expira_em = ? WHERE email = ? AND pessoa_id = ?`)
    .bind(await sha(sessao), new Date(Date.now() + 7 * 86400000).toISOString(), new Date(0).toISOString(), email, r.pessoa_id).run();
  return { ok: true, sessao };
}

export async function sessaoGabinete(env, request) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)vc_gab=([a-f0-9]{48})/);
  if (!m) return null;
  const r = await env.DB.prepare(
    `SELECT g.email, g.pessoa_id, g.sessao_expira, p.nome_urna_atual, p.nome_completo FROM gabinete_otp g JOIN pessoa p ON p.id = g.pessoa_id WHERE g.sessao = ?`
  ).bind(await sha(m[1])).first();
  if (!r || Date.parse(r.sessao_expira) < Date.now()) return null;
  return r;
}

export const cookieSessao = (s, maxAge = 7 * 86400) => `vc_gab=${s}; Path=/gabinete; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

function casca(titulo, corpo) {
  return pagina({
    titulo,
    descricao: 'Acesso dos gabinetes ao quadro de posicionamentos do VotoCheck, com o e-mail oficial.',
    caminho: '/gabinete',
    noindex: true,
    corpo: `<style>${ESTILO_POS}
      .gb { max-width: 760px; margin: 0 auto; padding: 36px 0 64px; }
      .gb h1 { font-size: clamp(26px, 4vw, 36px); margin: 0 0 10px; }
      .gb p.lead { color: var(--ink-2); font-size: 16px; line-height: 1.55; }
      .gb form { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px; margin-top: 18px; }
      .gb label { display: block; font-weight: 700; font-size: 14px; margin: 12px 0 6px; }
      .gb input, .gb textarea { width: 100%; box-sizing: border-box; font: 400 15.5px/1.55 var(--font-body); border: 1.5px solid var(--line-2); border-radius: 12px; padding: 11px 14px; }
      .gb textarea { min-height: 120px; resize: vertical; }
      .gb input:focus, .gb textarea:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.14); }
      .gb .msg { font-weight: 600; margin: 12px 0 0; } .gb .msg--erro { color: #B42318; } .gb .msg--ok { color: #00735F; }
      .gb .tema { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 14px; }
      .gb .tema small { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--blue); }
      .gb .tema p { margin: 4px 0 8px; font-weight: 600; }
      .gb .acoes { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
    </style><div class="vc-wrap"><div class="gb">${corpo}</div></div>`,
  });
}

export function renderGabineteEntrar({ etapa = 'email', email = '', msg = '', erro = false } = {}) {
  const aviso = msg ? `<p class="msg ${erro ? 'msg--erro' : 'msg--ok'}" role="status">${escapeHtml(msg)}</p>` : '';
  return casca('Acesso do gabinete — VotoCheck', `
    <h1>Acesso do gabinete</h1>
    <p class="lead">Para responder ao quadro de posicionamentos, entre com o <b>e-mail oficial</b> do mandato, o mesmo publicado pela Câmara dos Deputados ou pelo Senado. Mandamos um código de 6 dígitos para ele.</p>
    ${etapa === 'email' ? `
    <form method="POST" action="/gabinete">
      <label for="g-email">E-mail oficial do gabinete</label>
      <input id="g-email" name="email" type="email" required autocomplete="email" placeholder="dep.nome@camara.leg.br" value="${escapeHtml(email)}">
      <div class="acoes"><button class="vc-btn vc-btn--pri" type="submit">Receber código</button></div>${aviso}
    </form>` : `
    <form method="POST" action="/gabinete/codigo">
      <input type="hidden" name="email" value="${escapeHtml(email)}">
      <label for="g-cod">Código enviado para ${escapeHtml(email)}</label>
      <input id="g-cod" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000">
      <div class="acoes"><button class="vc-btn vc-btn--pri" type="submit">Entrar</button><a class="vc-btn vc-btn--sec" href="/gabinete">Usar outro e-mail</a></div>${aviso}
    </form>`}
    <p style="font-size:13.5px;color:var(--muted);margin-top:16px">Se o e-mail for oficial, o código chega em até 1 minuto (confira o spam). Mandatos que começam em 2027 recebem o e-mail oficial na posse.</p>`);
}

export function renderGabineteEditor({ sessao, posicionamentos = [], msg = '' }) {
  const por = Object.fromEntries(posicionamentos.map((p) => [p.tema, p.texto]));
  const nome = sessao.nome_urna_atual || sessao.nome_completo;
  return casca('Posicionamentos do gabinete — VotoCheck', `
    <h1>Posicionamentos de ${escapeHtml(nome)}</h1>
    <p class="lead">Escreva com as palavras do gabinete. O texto é publicado na ficha exatamente como enviado, com a data. Pode atualizar quando quiser. Até 1.500 caracteres por tema; campo vazio = "sem resposta".</p>
    ${msg ? `<p class="msg msg--ok" role="status">${escapeHtml(msg)}</p>` : ''}
    <form method="POST" action="/gabinete/salvar">
      ${TEMAS_POSICIONAMENTO.map((t) => `
      <div class="tema"><small>${escapeHtml(t.titulo)}</small><p>${escapeHtml(t.pergunta)}</p>
        <label class="sr-only" for="t-${t.id}">${escapeHtml(t.titulo)}</label>
        <textarea id="t-${t.id}" name="${t.id}" maxlength="1500">${escapeHtml(por[t.id] || '')}</textarea></div>`).join('')}
      <div class="acoes"><button class="vc-btn vc-btn--pri" type="submit">Publicar posicionamentos</button><a class="vc-btn vc-btn--sec" href="/candidato/${sessao.pessoa_id}#posicionamentos">Ver na ficha</a><a class="vc-btn vc-btn--sec" href="/gabinete/sair">Sair</a></div>
    </form>`);
}

export async function salvarPosicionamentos(env, sessao, form) {
  const stmts = [];
  for (const t of TEMAS_POSICIONAMENTO) {
    const v = String(form.get(t.id) || '').trim().slice(0, 1500);
    if (v) stmts.push(env.DB.prepare(`INSERT INTO posicionamento (pessoa_id, tema, texto, atualizado_em, email_autor) VALUES (?,?,?,datetime('now'),?)
      ON CONFLICT(pessoa_id, tema) DO UPDATE SET texto = excluded.texto, atualizado_em = CASE WHEN posicionamento.texto = excluded.texto THEN posicionamento.atualizado_em ELSE excluded.atualizado_em END, email_autor = excluded.email_autor`).bind(sessao.pessoa_id, t.id, v, sessao.email));
    else stmts.push(env.DB.prepare(`DELETE FROM posicionamento WHERE pessoa_id = ? AND tema = ?`).bind(sessao.pessoa_id, t.id));
  }
  await env.DB.batch(stmts);
}
