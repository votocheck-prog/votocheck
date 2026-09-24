/**
 * VotoCheck — Página de perfil de candidato/representante.
 *
 * "Passaporte da evidência" (Mapa Mestre §4): cada bloco de informação mostra explicitamente
 * de onde veio (fonte oficial) — nunca uma afirmação solta sem origem rastreável.
 */
import { pagina, escapeHtml, statusPill } from './estilo_html.js';

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  // aceita YYYY-MM-DD (Senado) ou DD/MM/YYYY (TSE)
  let d;
  const iso = String(dataNascimento).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = String(dataNascimento).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (br) d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  else return null;
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function blocoCandidatura(c) {
  const idade = calcularIdade(c.data_nascimento);
  return `
  <div class="card" style="margin-bottom:16px;">
    <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:8px;">
      <div>
        <strong>${escapeHtml(c.cargo_nome)} · ${escapeHtml(c.sg_uf)} · ${escapeHtml(c.ano_eleicao)}</strong>
        ${c.numero_urna ? `<div style="color:var(--text-muted); font-size:14px;">Número de urna: ${escapeHtml(c.numero_urna)}</div>` : ''}
        ${c.partido_sigla ? `<div style="color:var(--text-muted); font-size:14px;">${escapeHtml(c.partido_sigla)}${c.partido_nome ? ` — ${escapeHtml(c.partido_nome)}` : ''}</div>` : ''}
        ${c.nome_coligacao ? `<div style="color:var(--text-muted); font-size:14px;">Coligação: ${escapeHtml(c.nome_coligacao)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        ${statusPill(c.status_codigo, c.status_descricao)}
        ${c.situacao_candidatura ? `<div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Candidatura: ${escapeHtml(c.situacao_candidatura)}</div>` : ''}
        ${c.situacao_totalizacao_turno ? `<div style="font-size:13px; color:var(--text-muted);">Resultado: ${escapeHtml(c.situacao_totalizacao_turno)}</div>` : ''}
      </div>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
      Fonte: ${escapeHtml(c.fonte_nome || 'não informada')}${c.fonte_url ? ` — <a href="${escapeHtml(c.fonte_url)}" target="_blank" rel="noopener">consultar dados oficiais</a>` : ''}
    </div>
  </div>`;
}

function blocoMandato(m) {
  return `
  <div class="card" style="margin-bottom:12px;">
    <strong>${escapeHtml(m.cargo_nome)}${m.sg_uf ? ` · ${escapeHtml(m.sg_uf)}` : ''}</strong>
    ${m.legislatura ? `<div style="font-size:13px; color:var(--text-muted);">Legislatura ${escapeHtml(m.legislatura)}</div>` : ''}
    ${m.situacao ? `<div style="font-size:13px; color:var(--text-muted);">Situação: ${escapeHtml(m.situacao)}</div>` : ''}
    ${m.data_inicio ? `<div style="font-size:13px; color:var(--text-muted);">Início: ${escapeHtml(m.data_inicio)}${m.data_fim ? ` · Fim: ${escapeHtml(m.data_fim)}` : ''}</div>` : ''}
    <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
      Fonte: ${escapeHtml(m.fonte_nome || 'não informada')}
    </div>
  </div>`;
}

// Rótulo público de cada atributo_slug confirmado (ver lib/divida_ativa.js). Só usado depois que
// um humano confirma manualmente — ver a regra em atributo_candidato.status_id.
const RUBRICAS_ATRIBUTO = {
  divida_ativa_uniao_a_confirmar: 'Dívida Ativa da União (PGFN)',
};

/** Bloco de atributos CONFIRMADOS (status_id=1) — nunca renderiza um "a confirmar". Segue o
 *  princípio de "passaporte da evidência": todo item mostra a regra publicada que o rege. */
function blocoAtributos(atributos) {
  if (!atributos || !atributos.length) return '';
  return `
    <h2 style="font-size:18px; margin:28px 0 12px;">Informações verificadas</h2>
    ${atributos
      .map(
        (a) => `
      <div class="card" style="margin-bottom:12px;">
        <strong style="font-size:14px;">${escapeHtml(RUBRICAS_ATRIBUTO[a.atributo_slug] || a.atributo_slug)}</strong>
        <p style="font-size:13.5px; color:var(--text); margin:8px 0 0;">${escapeHtml(a.valor)}</p>
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
          ${a.evidencia_url ? `Fonte: <a href="${escapeHtml(a.evidencia_url)}" target="_blank" rel="noopener">documento oficial</a> · ` : ''}
          <a href="${escapeHtml(a.regra_publicada_url)}" target="_blank" rel="noopener">como verificamos isso</a>
        </div>
      </div>`
      )
      .join('')}
  `;
}

const MENSAGENS_ACOMPANHAR = {
  ok: { tipo: 'sucesso', texto: 'Combinado — você está acompanhando este Representante Público. Resumos periódicos por e-mail chegam assim que essa parte estiver pronta (ainda estamos construindo o envio).' },
  ja_existia: { tipo: 'sucesso', texto: 'Você já estava acompanhando este Representante Público.' },
  limite: { tipo: 'erro', texto: 'Esse e-mail já está acompanhando o máximo de 3 Representantes Públicos. Cancele um antes de adicionar outro.' },
  erro: { tipo: 'erro', texto: 'Não deu pra confirmar esse e-mail — confira e tente de novo.' },
};

/** Card de captura do "Monitore" (Fase 1 — ver acompanhamento.js): só e-mail, sem outro dado. */
function blocoAcompanhar(pessoaId, acompanhar) {
  const msg = acompanhar && acompanhar.status ? MENSAGENS_ACOMPANHAR[acompanhar.status] : null;
  const corBanner = msg?.tipo === 'sucesso' ? 'var(--primary)' : '#B24C1F';
  const banner = msg
    ? `<div style="margin-bottom:12px; padding:10px 14px; border:1px solid ${corBanner}; border-radius:8px; color:${corBanner}; font-size:13.5px;">
        ${escapeHtml(msg.texto)}
        ${msg.tipo === 'sucesso' && acompanhar.tokenCancelamento ? `<div style="margin-top:6px;"><a href="/acompanhar/cancelar?token=${encodeURIComponent(acompanhar.tokenCancelamento)}" style="font-size:12.5px;">Cancelar este acompanhamento →</a></div>` : ''}
      </div>`
    : '';

  return `
  <div class="card" style="margin-top:16px; border-color:var(--primary); background:var(--primary-soft);">
    <strong style="font-size:14px;">Acompanhar este Representante Público</strong>
    <p style="font-size:13px; color:var(--text); margin:6px 0 12px;">
      Receba atualizações sobre a atuação dele — você pode acompanhar até 3, mesmo sem ter decidido seu voto ainda.
      Sem spam: só isso, e você cancela quando quiser.
    </p>
    ${banner}
    <form method="POST" action="/acompanhar" style="display:flex; gap:8px; flex-wrap:wrap;">
      <input type="hidden" name="pessoa_id" value="${pessoaId}" />
      <input type="email" name="email" required placeholder="seu@email.com" style="flex:1; min-width:200px; padding:10px 12px; border:1px solid var(--border); border-radius:8px;" />
      <button type="submit" style="padding:10px 20px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Acompanhar</button>
    </form>
  </div>`;
}

export function renderPerfil({ pessoa, candidaturas, mandatos, filiacoes, atributos = [], acompanhar }) {
  const nomeExibicao = pessoa.nome_urna_atual || pessoa.nome_completo;
  const idade = calcularIdade(pessoa.data_nascimento);
  const principal = candidaturas[0];

  const corpo = `
    <div style="display:flex; gap:20px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
      <div style="width:88px; height:88px; border-radius:50%; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:32px; color:var(--primary); overflow:hidden; flex-shrink:0;">
        ${pessoa.foto_url ? `<img src="${escapeHtml(pessoa.foto_url)}" alt="" style="width:100%; height:100%; object-fit:cover;">` : escapeHtml(nomeExibicao.slice(0, 1))}
      </div>
      <div>
        <h1 style="margin:0 0 4px; font-size:28px;">${escapeHtml(nomeExibicao)}</h1>
        ${pessoa.nome_completo && pessoa.nome_completo !== nomeExibicao ? `<div style="color:var(--text-muted);">${escapeHtml(pessoa.nome_completo)}</div>` : ''}
        ${principal ? `<div style="color:var(--text-muted); font-size:14px; margin-top:4px;">${escapeHtml(principal.cargo_nome)} · ${escapeHtml(principal.sg_uf)}${principal.partido_sigla ? ` · ${escapeHtml(principal.partido_sigla)}` : ''}</div>` : ''}
      </div>
    </div>

    <div style="display:flex; gap:16px; flex-wrap:wrap; color:var(--text-muted); font-size:14px; margin-bottom:28px;">
      ${idade ? `<span>${idade} anos</span>` : ''}
      ${pessoa.genero ? `<span>${escapeHtml(pessoa.genero)}</span>` : ''}
      ${pessoa.grau_instrucao ? `<span>${escapeHtml(pessoa.grau_instrucao)}</span>` : ''}
      ${pessoa.cor_raca ? `<span>${escapeHtml(pessoa.cor_raca)}</span>` : ''}
    </div>

    <h2 style="font-size:18px; margin-bottom:12px;">Candidatura${candidaturas.length > 1 ? 's' : ''} 2026</h2>
    ${candidaturas.map(blocoCandidatura).join('') || '<p style="color:var(--text-muted);">Nenhuma candidatura registrada.</p>'}

    ${mandatos.length ? `
      <h2 style="font-size:18px; margin:28px 0 12px;">Mandato${mandatos.length > 1 ? 's' : ''} em exercício</h2>
      ${mandatos.map(blocoMandato).join('')}
    ` : ''}

    ${filiacoes.length ? `
      <h2 style="font-size:18px; margin:28px 0 12px;">Histórico partidário</h2>
      <ul style="padding-left:20px; color:var(--text-muted); font-size:14px;">
        ${filiacoes.map((f) => `<li>${escapeHtml(f.sigla)}${f.nome ? ` — ${escapeHtml(f.nome)}` : ''}${f.data_inicio ? ` (desde ${escapeHtml(f.data_inicio)})` : ''}</li>`).join('')}
      </ul>
    ` : ''}

    ${blocoAtributos(atributos)}

    ${blocoAcompanhar(pessoa.id, acompanhar)}

    <div class="card" style="margin-top:16px;">
      <strong style="font-size:14px;">Sobre estes dados</strong>
      <p style="font-size:13px; color:var(--text); margin:8px 0 0;">
        As informações desta página vêm de fontes públicas oficiais e são atualizadas periodicamente.
        Encontrou algo desatualizado ou incorreto? Em breve o VotoCheck terá um canal de contestação
        aberto ao próprio candidato e a qualquer cidadão.
      </p>
    </div>
  `;

  return pagina({
    titulo: `${nomeExibicao} — VotoCheck`,
    descricao: `Histórico, candidatura e fontes oficiais sobre ${nomeExibicao} no VotoCheck.`,
    caminho: `/candidato/${pessoa.id}`,
    corpo,
  });
}

export function renderNaoEncontrado(caminho = '/') {
  return pagina({
    titulo: 'Candidato não encontrado — VotoCheck',
    descricao: 'Página não encontrada.',
    caminho,
    noindex: true,
    corpo: `<div style="text-align:center; padding:60px 0;">
      <h1>Não encontramos essa pessoa</h1>
      <p style="color:var(--text-muted);">O registro pode ter sido removido ou o link está incorreto.</p>
      <p><a href="/">Voltar para a busca</a></p>
    </div>`,
  });
}
