/**
 * VotoCheck — Página de perfil de candidato/representante.
 *
 * "Passaporte da evidência" (Mapa Mestre §4): cada bloco de informação mostra explicitamente
 * de onde veio (fonte oficial) — nunca uma afirmação solta sem origem rastreável.
 */
import { pagina, escapeHtml, statusPill } from './estilo_html.js';
// Seção 34 (24/09/2026): CTA de apoio também no fim da página de perfil, por pedido do
// Rodrigo ("depois de cada página de esclarecimento e na home") — mesmo componente da home,
// só troca a frase de abertura via `contexto: 'perfil'`.
import { renderCtaApoio } from './jornada_html.js';
import { Icone } from './icones.js';
import { renderPublicidade } from './publicidade.js';
import { linkWhatsApp } from './apoio_html.js';

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

/**
 * Selos automáticos (presença / crescimento patrimonial) — ver src/lib/selos.js pro cálculo e
 * pra cobertura real hoje (as duas comparações ainda têm pouco ou nenhum dado disponível; isso
 * é esperado, não um bug — o selo simplesmente não aparece até haver dado suficiente).
 * Nunca usa cor verde/vermelho pra "bom/ruim" — o desvio é um dado comparativo, não um veredito
 * (mesmo princípio de nunca ranquear/pontuar candidato que rege o resto do produto).
 */
function blocoSelos(selos, cargoNome) {
  if (!selos || (!selos.presenca && !selos.patrimonio)) return '';
  const partes = [];
  if (selos.presenca) {
    const sinal = selos.presenca.desvioPct >= 0 ? 'acima' : 'abaixo';
    partes.push(`
      <span class="selo-automatico">
        Presença ${Math.abs(selos.presenca.desvioPct)}% ${sinal} da média de ${escapeHtml(cargoNome)}
        <span class="selo-automatico-info" title="Presença mais recente: ${selos.presenca.percentualPropio}% · Média de ${escapeHtml(cargoNome)} em exercício: ${Math.round(selos.presenca.mediaCargo)}%">ⓘ</span>
      </span>`);
  }
  if (selos.patrimonio) {
    const sinal = selos.patrimonio.desvioPct >= 0 ? 'acima' : 'abaixo';
    partes.push(`
      <span class="selo-automatico">
        Crescimento patrimonial ${Math.abs(selos.patrimonio.desvioPct)}% ${sinal} da média de ${escapeHtml(cargoNome)}
        <span class="selo-automatico-info" title="Variação própria entre os dois ciclos mais recentes: ${Math.round(selos.patrimonio.variacaoPropiaPct)}% · Média de ${escapeHtml(cargoNome)}: ${Math.round(selos.patrimonio.mediaCargoPct)}%">ⓘ</span>
      </span>`);
  }
  return `<div style="margin:4px 0 20px;">${partes.join('')}</div>`;
}

const MENSAGENS_ACOMPANHAR = {
  ok: { tipo: 'sucesso', texto: 'Combinado! Você vai receber o resumo mensal do mandato por e-mail, caso essa pessoa seja eleita.' },
  ja_existia: { tipo: 'sucesso', texto: 'Você já estava acompanhando esta pessoa.' },
  limite: { tipo: 'erro', texto: 'Esse e-mail já acompanha 3 pessoas, o máximo. Cancele um antes de adicionar outro.' },
  erro: { tipo: 'erro', texto: 'Não deu pra confirmar esse e-mail — confira e tente de novo.' },
};

/** Card de captura do "Monitore" (Fase 1 — ver acompanhamento.js): só e-mail, sem outro dado. */
function blocoAcompanhar(pessoaId, acompanhar, nome = '') {
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
    <strong style="font-size:16px; font-family:var(--font-display);">Acompanhe ${nome ? escapeHtml(nome) : 'este candidato'} depois da eleição</strong>
    <p style="font-size:14px; color:var(--ink-2); margin:6px 0 12px;">
      Se for eleito(a), você recebe por e-mail um resumo mensal do mandato: votos, presença e projetos, com a fonte.
      Até 3 pessoas por e-mail, mesmo sem ter decidido o voto. Sem spam, e você cancela quando quiser.
    </p>
    ${banner}
    <form method="POST" action="/acompanhar" style="display:flex; gap:8px; flex-wrap:wrap;">
      <input type="hidden" name="pessoa_id" value="${pessoaId}" />
      <input type="email" name="email" required placeholder="seu@email.com" style="flex:1; min-width:200px; padding:10px 12px; border:1px solid var(--border); border-radius:8px;" />
      <button type="submit" style="padding:10px 20px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Acompanhar</button>
    </form>
  </div>`;
}

/** "MARCIO ALVES DOS SANTOS" → "Marcio Alves dos Santos" (só quando o texto vem todo em maiúsculas). */
export function nomeProprio(txt) {
  if (!txt) return '';
  const s = String(txt).trim();
  if (s !== s.toUpperCase()) return s;
  const minus = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'del']);
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w, i) => (minus.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

/** "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL (PT / PC do B / PV)" → "Federação Brasil da Esperança (PT, PCdoB e PV)". */
function nomeFederacao(txt) {
  const m = String(txt || '').match(/^(.*?)(?:\s*-\s*[^(]*)?\s*\(([^)]*)\)\s*$/);
  if (!m) return nomeProprio(txt);
  const siglas = m[2].split('/').map((x) => x.trim().replace(/^PC do B$/i, 'PCdoB'));
  const fmtSigla = (x) => (x.length <= 5 || /^PCdoB$/.test(x) ? x : nomeProprio(x));
  const up = new Set(siglas.map((x) => x.toUpperCase()));
  const nome = m[1].split(/\s+/).map((w) => (up.has(w.toUpperCase()) && w.length <= 5 ? w.toUpperCase() : nomeProprio(w))).join(' ').replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (x) => x.toLowerCase());
  const lista = siglas.map(fmtSigla);
  return `${nome} (${lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0]})`;
}
export function brl(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (n >= 1e4) return `R$ ${Math.round(n / 1e3).toLocaleString('pt-BR')} mil`;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
export function brlCheio(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
const REDE_ROTULO = [
  [/instagram\.com/, 'Instagram'], [/facebook\.com|fb\.com/, 'Facebook'], [/tiktok\.com/, 'TikTok'], [/youtube\.com|youtu\.be/, 'YouTube'],
  [/(^|\/\/|\.)x\.com|twitter\.com/, 'X'], [/threads\.net/, 'Threads'], [/linkedin\.com/, 'LinkedIn'], [/kwai/, 'Kwai'], [/wa\.me|whatsapp/, 'WhatsApp'],
];
function rotuloRede(url) {
  for (const [re, nome] of REDE_ROTULO) if (re.test(url)) return nome;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Site'; }
}

const SLOT_COLA = { deputado_federal: 1, deputado_estadual: 2, deputado_distrital: 2, senador: 3, governador: 5, presidente: 6 };
const CARGOS_PROPORCIONAIS = new Set(['deputado_federal', 'deputado_estadual', 'deputado_distrital']);

function dataBr(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : escapeHtml(iso || '');
}

function marcaVoto(v) {
  const t = String(v || '').trim();
  if (t === 'Sim') return `<span class="fx-voto fx-voto--sim">Sim</span>`;
  if (t === 'Não') return `<span class="fx-voto fx-voto--nao">Não</span>`;
  return `<span class="fx-voto fx-voto--outro">${escapeHtml(t || '—')}</span>`;
}

const ESTILO_FICHA = `
  .fx-migalha { font-size: 13.5px; color: var(--muted); margin-bottom: 14px; }
  .fx-migalha a { color: var(--muted); text-decoration: none; } .fx-migalha a:hover { color: var(--blue); }
  .fx-topo { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px; box-shadow: var(--shadow-sm); display: grid; grid-template-columns: auto 1fr auto; gap: 22px; align-items: center; }
  .fx-foto { width: 104px; height: 104px; border-radius: 20px; background: linear-gradient(135deg, var(--blue-50), #DCE9FF); display: grid; place-items: center; font-family: var(--font-display); font-weight: 800; font-size: 38px; color: var(--blue); overflow: hidden; }
  .fx-foto img { width: 100%; height: 100%; object-fit: cover; }
  .fx-foto-wrap { display: grid; gap: 6px; justify-items: center; align-content: start; }
  .fx-sem-foto { font-size: 11px; line-height: 1.25; color: var(--muted); text-align: center; max-width: 104px; cursor: help; }
  .fx-topo h1 { font-size: clamp(26px, 3.4vw, 36px); margin: 0 0 4px; }
  .fx-nome-completo { color: var(--muted); font-size: 14.5px; margin-bottom: 10px; }
  .fx-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .fx-numero { text-align: center; background: var(--navy); color: #fff; border-radius: 16px; padding: 14px 20px; min-width: 150px; }
  .fx-numero small { display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: #93A2D8; }
  .fx-numero b { display: block; font-family: var(--font-display); font-size: 40px; font-weight: 800; letter-spacing: .08em; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .fx-numero a { font-size: 12.5px; color: #9EC0FF; font-weight: 600; text-decoration: none; }
  @media (max-width: 720px) { .fx-topo { grid-template-columns: auto 1fr; } .fx-numero { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; } .fx-foto { width: 76px; height: 76px; font-size: 28px; border-radius: 16px; } }
  .fx-acoes { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 28px; }
  .fx-resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 32px; }
  @media (max-width: 820px) { .fx-resumo { grid-template-columns: 1fr 1fr; } }
  .fx-kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
  .fx-kpi small { display: flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
  .fx-kpi b { display: block; font-family: var(--font-display); font-size: 21px; margin: 6px 0 2px; line-height: 1.2; }
  .fx-kpi span { font-size: 13px; color: var(--muted); }
  .fx-sec { margin: 0 0 32px; }
  .fx-sec > h2 { font-size: 21px; margin: 0 0 6px; }
  .fx-sec > p.fx-sub { color: var(--muted); margin: 0 0 14px; font-size: 15px; }
  .fx-tabela { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; font-size: 14.5px; }
  .fx-tabela td, .fx-tabela th { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  @media (max-width: 620px) {
    .fx-votos thead { display: none; }
    .fx-votos tr { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 14px; border-bottom: 1px solid var(--line); }
    .fx-votos td { padding: 0; border: 0; }
    .fx-votos td:nth-child(1) { grid-row: 1; grid-column: 1; font-size: 13px; color: var(--muted); align-self: center; }
    .fx-votos td:nth-child(3) { grid-row: 1; grid-column: 2; }
    .fx-votos td:nth-child(2) { grid-row: 2; grid-column: 1 / -1; }
  }
  .fx-temas { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 10px; }
  @media (max-width: 820px) { .fx-temas { grid-template-columns: 1fr; } }
  .fx-tema-bloco { padding: 18px 20px; }
  .fx-tema-bloco h3 { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 16.5px; margin: 0 0 2px; }
  .fx-tema-bloco h3 span { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--muted); }
  .fx-tema-bloco > p { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
  .fx-tema-bloco .vc-barras { background: none; border: 0; padding: 0; box-shadow: none; }
  .fx-tema-bloco .vc-barra { grid-template-columns: minmax(0,1.3fr) minmax(0,1fr) 34px; }
  #campanha .vc-barra { grid-template-columns: minmax(0,1.2fr) minmax(0,1fr) 96px; }
  .fx-barra-pub .vc-barra-trilho i { background: #F2994A; }
  .fx-kpi--pub b { color: #B4541A; }
  .fx-plano { padding: 20px 22px; }
  .fx-plano-resumo { font-size: 16px; line-height: 1.55; margin: 0 0 12px; color: var(--ink); }
  .fx-plano ul { list-style: none; padding: 0; margin: 0 0 14px; display: grid; gap: 10px; }
  .fx-plano li { font-size: 14.5px; color: var(--ink-2); line-height: 1.5; }
  .fx-plano-tema { display: inline-block; font-size: 11.5px; font-weight: 700; letter-spacing: .03em; color: var(--blue); background: var(--blue-50); border-radius: 999px; padding: 2px 9px; margin-right: 8px; }
  .fx-plano-pdf { display: flex; gap: 8px; flex-wrap: wrap; }
  .fx-plano-ia { display: block; font-size: 12px; color: var(--muted); margin-top: 10px; }
  .fx-proj { font-family: var(--font-display); color: var(--navy); }
  .fx-saiba { margin-top: 8px; }
  .fx-saiba summary { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; list-style: none; font-size: 13px; font-weight: 700; color: var(--blue); background: var(--blue-50); border-radius: 999px; padding: 4px 10px; }
  .fx-saiba summary::-webkit-details-marker { display: none; }
  .fx-saiba[open] summary { background: var(--blue); color: #fff; }
  .fx-saiba > div { margin-top: 8px; background: #fff; border: 1px solid var(--line-2); border-radius: 12px; padding: 12px 14px; box-shadow: 0 8px 24px rgba(10,20,64,.08); }
  .fx-saiba p { margin: 0 0 6px; font-size: 14px; color: var(--ink-2); line-height: 1.5; }
  .fx-saiba small { display: block; font-size: 11.5px; color: var(--muted); margin-top: 4px; }
  .fx-tabela th { font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); background: var(--paper); }
  .fx-tabela tr:last-child td { border-bottom: 0; }
  .fx-voto { display: inline-block; min-width: 48px; text-align: center; font-size: 12.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
  .fx-voto--sim { background: var(--navy); color: #fff; }
  .fx-voto--nao { background: #fff; color: var(--navy); border: 1.5px solid var(--navy); }
  .fx-voto--outro { background: #fff; color: var(--muted); border: 1.5px dashed var(--line-2); font-weight: 600; }
  .fx-lista { display: flex; flex-wrap: wrap; gap: 6px; }
  .fx-lista a { font-size: 13.5px; text-decoration: none; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; color: var(--ink-2); }
  .fx-lista a:hover { border-color: var(--blue); color: var(--blue); }
  .fx-lista a b { font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 600; margin-left: 4px; }
  .fx-lista a small { font-size: 11.5px; color: var(--muted); margin-left: 6px; }
  .fx-tag-m { font-style: normal; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #00735F; background: var(--teal-50); border-radius: 999px; padding: 1px 6px; margin-left: 6px; }
  .fx-dl { display: grid; grid-template-columns: 200px 1fr; background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .fx-dl dt, .fx-dl dd { margin: 0; padding: 11px 14px; border-bottom: 1px solid var(--line); font-size: 14.5px; }
  .fx-dl dt { color: var(--muted); background: var(--paper); }
  @media (max-width: 560px) { .fx-dl { grid-template-columns: 1fr; } .fx-dl dt { border-bottom: 0; padding-bottom: 2px; } }
  .fx-redes { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; margin: 0 0 10px; font-size: 13.5px; }
  .fx-redes a { font-weight: 600; text-decoration: none; }
  .fx-redes span { color: var(--muted); font-size: 12px; }
  .fx-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--navy); color: #fff; padding: 12px 18px; border-radius: 999px; font-weight: 600; font-size: 14.5px; box-shadow: var(--shadow); z-index: 90; display: none; }
  .fx-toast a { color: #9EC0FF; margin-left: 8px; }
`;

export function renderPerfil({ pessoa, candidaturas, mandatos, filiacoes, atributos = [], acompanhar, selos = null, votos = [], totalVotos = 0, mesmaLista = null, bens = [], redes = [], temas = null, fin = null, plano = null }) {
  const nomeExibicao = nomeProprio(pessoa.nome_urna_atual || pessoa.nome_completo);
  const nomeCompleto = nomeProprio(pessoa.nome_completo);
  const idade = calcularIdade(pessoa.data_nascimento);
  const principal = candidaturas.find((c) => Number(c.ano_eleicao) === 2026) || candidaturas[0];
  const cargoSlug = principal?.cargo_slug || '';
  const reeleicao = principal && mandatos.some((m) => m.cargo_nome === principal.cargo_nome);
  const inicial = escapeHtml((nomeExibicao || '?').slice(0, 1));
  const urlFicha = `https://votocheck.com.br/candidato/${pessoa.id}`;
  const textoShare = `${nomeExibicao}${principal?.numero_urna ? ` (${principal.numero_urna})` : ''}, candidato(a) a ${principal?.cargo_nome || ''} ${principal?.sg_uf || ''}: veja o que o VotoCheck reuniu, com dado oficial e fonte.`;
  const slot = SLOT_COLA[cargoSlug] || 0;

  const kpis = [];
  kpis.push(`<div class="fx-kpi"><small>${Icone.predio(14)} Mandato atual</small><b>${mandatos.length ? escapeHtml(mandatos[0].cargo_nome) : 'Não tem'}</b><span>${mandatos.length ? `${mandatos[0].sg_uf ? escapeHtml(mandatos[0].sg_uf) + ' · ' : ''}fonte: ${escapeHtml(mandatos[0].fonte_nome || 'Câmara/Senado')}` : 'sem mandato federal registrado'}</span></div>`);
  kpis.push(`<div class="fx-kpi"><small>${Icone.votoCaixa(14)} Votos registrados</small><b class="tabnum">${totalVotos ? totalVotos.toLocaleString('pt-BR') : '—'}</b><span>${totalVotos ? 'em votações nominais do Plenário' : mandatos.length ? 'nenhum voto nominal coletado ainda' : 'só existe para quem tem mandato'}</span></div>`);
  const totalBens = bens.reduce((a, b) => a + (Number(b.valor) || 0), 0);
  kpis.unshift(`<div class="fx-kpi"><small>${Icone.cifrao(14)} Patrimônio declarado</small><b class="tabnum">${bens.length ? brl(totalBens) : 'R$ 0'}</b><span>${bens.length ? `${bens.length} ${bens.length > 1 ? 'bens' : 'bem'} na declaração ao TSE` : 'nenhum bem na declaração ao TSE'}</span></div>`);
  const publico = fin ? (Number(fin.fefc) || 0) + (Number(fin.fundo_partidario) || 0) : 0;
  if (fin) kpis.splice(1, 0, `<div class="fx-kpi fx-kpi--pub"><small>${Icone.cifrao(14)} Dinheiro público na campanha</small><b class="tabnum">${brl(publico)}</b><span>${fin.total ? `${Math.round((100 * publico) / fin.total)}% do que arrecadou · <a href="#campanha">ver origem</a>` : 'nenhuma receita declarada ao TSE até agora'}</span></div>`);
  kpis.push(`<div class="fx-kpi"><small>${Icone.usuario(14)} Perfil</small><b>${idade ? `${idade} anos` : '—'}</b><span>${escapeHtml(nomeProprio(pessoa.grau_instrucao || '')) || 'escolaridade não informada'}</span></div>`);

  const blocoVotos = votos.length
    ? `
    <section class="fx-sec">
      <h2>Como votou recentemente</h2>
      <p class="fx-sub">Últimas votações nominais do Plenário em que há voto registrado. É um registro factual: não avaliamos se o voto foi certo ou errado.</p>
      <table class="fx-tabela fx-votos">
        <thead><tr><th style="width:110px">Data</th><th>O que foi votado</th><th style="width:90px">Voto</th></tr></thead>
        <tbody>${votos
          .map(
            (v) => `<tr><td class="tabnum">${dataBr(v.data_votacao)}</td><td>${v.ex_projeto ? `<strong class="fx-proj">${escapeHtml(v.ex_projeto)}</strong> ` : ''}${escapeHtml(String(v.descricao || '').replace(/\s*Sim: \d+.*$/, '').slice(0, 220))}${String(v.descricao || '').length > 220 ? '…' : ''}${v.url_origem ? ` <a href="${escapeHtml(v.url_origem)}" target="_blank" rel="noopener" style="font-size:13px;white-space:nowrap">registro oficial ↗</a>` : ''}${v.ex_resumo ? `
              <details class="fx-saiba"><summary>${Icone.lampada(14)} Saiba o que é</summary><div>
                <p><b>O projeto:</b> ${escapeHtml(v.ex_resumo)}</p>
                ${v.ex_votacao ? `<p><b>Nesta votação:</b> ${escapeHtml(v.ex_votacao)}</p>` : ''}
                <small>Explicação simplificada gerada por IA a partir da ementa oficial. Confira no registro oficial.</small>
              </div></details>` : ''}</td><td>${marcaVoto(v.voto)}</td></tr>`
          )
          .join('')}</tbody>
      </table>
      <div class="vc-fonte">${Icone.documento(14)} Fonte: ${votos[0]?.casa === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados'} (dados abertos) · votações desde dez/2024</div>
    </section>`
    : '';

  const blocoLista =
    mesmaLista && CARGOS_PROPORCIONAIS.has(cargoSlug) && mesmaLista.itens.length
      ? `
    <section class="fx-sec">
      <h2>Seu voto também conta para esta lista</h2>
      <p class="fx-sub">Para ${escapeHtml(principal.cargo_nome.toLowerCase())}, o voto soma primeiro para ${mesmaLista.federacao ? '' : 'o partido '}<strong>${escapeHtml(mesmaLista.federacao ? nomeFederacao(mesmaLista.rotulo) : mesmaLista.rotulo)}</strong>. Ele pode ajudar a eleger qualquer um destes ${mesmaLista.total.toLocaleString('pt-BR')} candidatos em ${escapeHtml(principal.sg_uf)}. <a href="/#seu-voto">Entenda</a></p>
      <p class="fx-sub" style="font-size:13px;margin-top:-6px">Primeiro quem já tem mandato no Congresso, depois quem teve mais votos para deputado em 2022 (resultado oficial do TSE). Quem puxa votos para a lista aparece antes; quem se beneficia deles, depois.</p>
      <div class="fx-lista">${mesmaLista.itens
        .map((i) => `<a href="/candidato/${i.pessoa_id}">${escapeHtml(nomeProprio(i.nome_urna_atual))}${i.tem_mandato ? '<em class="fx-tag-m">mandato</em>' : ''}${i.votos_2022 ? `<small>${i.votos_2022 >= 1000 ? `${Math.round(i.votos_2022 / 1000).toLocaleString('pt-BR')} mil` : i.votos_2022} votos em 2022</small>` : ''}<b>${escapeHtml(i.numero_urna ?? '')}</b></a>`)
        .join('')}${mesmaLista.total > mesmaLista.itens.length ? `<a href="/buscar?cargo=${cargoSlug}&uf=${principal.sg_uf}&ordenar=partido">e mais ${(mesmaLista.total - mesmaLista.itens.length).toLocaleString('pt-BR')} →</a>` : ''}</div>
    </section>`
      : '';


  const porTipo = {};
  for (const b of bens) {
    const t = nomeProprio((b.tipo || 'Outros').replace(/\s*\(.*?\)\s*/g, '').split(':')[0].trim());
    porTipo[t] = (porTipo[t] || 0) + (Number(b.valor) || 0);
  }
  const tipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
  const maxTipo = Math.max(1, ...tipos.map((t) => t[1]));
  // Temas dos projetos apresentados (26/09/2026) — classificação oficial da Câmara, nunca do VotoCheck.
  // Autoria principal (1º signatário) e coautoria em blocos separados, a pedido do Rodrigo.
  const lerTemas = (j) => { try { return JSON.parse(j || '[]'); } catch { return []; } };
  const temasAutor = temas ? lerTemas(temas.temas_json) : [];
  const temasCo = temas ? lerTemas(temas.temas_coautor_json) : [];
  const barrasTemas = (lista) => {
    const max = lista.length ? lista[0].n : 1;
    return `<div class="vc-barras" style="margin:0">${lista
      .slice(0, 5)
      .map((t) => `<div class="vc-barra"><span>${escapeHtml(t.tema)}</span><span class="vc-barra-trilho"><i style="width:${Math.max(3, (t.n / max) * 100).toFixed(1)}%"></i></span><b>${t.n}</b></div>`)
      .join('')}</div>`;
  };
  const blocoTemas = temas && (temas.total || temas.total_coautor)
    ? `
    <section class="fx-sec" id="temas">
      <h2>Temas dos projetos que apresentou</h2>
      <p class="fx-sub">Projetos de lei, de lei complementar, de emenda à Constituição e de decreto legislativo na Câmara desde 2023. O tema é a classificação oficial da própria Câmara, e um projeto pode ter mais de um. Mostra onde a atuação se concentra, não se os projetos avançaram.</p>
      <div class="fx-temas">
        <div class="vc-card fx-tema-bloco">
          <h3>Como autor principal <span>${temas.total} ${temas.total === 1 ? 'projeto' : 'projetos'}</span></h3>
          <p>Primeira assinatura no projeto: a iniciativa foi do parlamentar.</p>
          ${temasAutor.length ? barrasTemas(temasAutor) : '<p style="margin:0"><strong>Nenhum projeto como autor principal</strong> nesse período.</p>'}
        </div>
        <div class="vc-card fx-tema-bloco">
          <h3>Como coautor <span>${temas.total_coautor} ${temas.total_coautor === 1 ? 'projeto' : 'projetos'}</span></h3>
          <p>Projetos de outros parlamentares em que também assinou.</p>
          ${temasCo.length ? barrasTemas(temasCo) : '<p style="margin:0">Nenhum projeto como coautor nesse período.</p>'}
        </div>
      </div>
      <div class="vc-fonte">${Icone.documento(14)} Fonte: Câmara dos Deputados · autores e temas das proposições, 2023–2026 (dados abertos)</div>
      ${pessoa.id_camara ? `<p style="margin:8px 0 0;font-size:14px"><a href="https://www.camara.leg.br/deputados/${escapeHtml(String(pessoa.id_camara))}" target="_blank" rel="noopener">Ver os projetos na página da Câmara ↗</a></p>` : ''}
    </section>`
    : '';

  // Dinheiro de campanha (26/09/2026): prestação de contas parcial ao TSE.
  const fontesFin = fin
    ? [
        ['Fundo eleitoral (público)', Number(fin.fefc) || 0, 'pub'],
        ['Fundo partidário (público)', Number(fin.fundo_partidario) || 0, 'pub'],
        ['Doações de pessoas', Number(fin.pessoas_fisicas) || 0, ''],
        ['Recursos próprios', Number(fin.recursos_proprios) || 0, ''],
        ['Outras fontes (partido, outros candidatos, internet)', Number(fin.outros) || 0, ''],
      ].filter((x) => x[1] > 0)
    : [];
  const maxFin = Math.max(1, ...fontesFin.map((x) => x[1]));
  const blocoCampanha = !fin ? '' : `
    <section class="fx-sec" id="campanha">
      <h2>Dinheiro da campanha</h2>
      <p class="fx-sub">O que a campanha declarou ter recebido até agora na prestação de contas parcial à Justiça Eleitoral. Fundo eleitoral e fundo partidário são dinheiro público, repassado pelo partido.</p>
      ${
        fontesFin.length
          ? `<div class="vc-barras" style="margin:0 0 10px">${fontesFin
              .map(([n, v, t]) => `<div class="vc-barra${t ? ' fx-barra-pub' : ''}"><span>${n}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (v / maxFin) * 100).toFixed(1)}%"></i></span><b>${brl(v)}</b></div>`)
              .join('')}</div>
             <p style="font-size:14px;margin:0 0 8px">Total declarado: <strong>${brlCheio(fin.total)}</strong>, sendo <strong>${brlCheio(publico)}</strong> de dinheiro público. <a href="/dinheiro-publico?uf=${escapeHtml(principal?.sg_uf || '')}&cargo=${escapeHtml(cargoSlug || '')}">Compare com os outros candidatos →</a></p>`
          : `<div class="vc-card"><p style="margin:0">Nenhuma receita declarada ao TSE até ${fin?.data_referencia ? dataBr(fin.data_referencia) : 'a última atualização'}.</p></div>`
      }
      <div class="vc-fonte">${Icone.documento(14)} Fonte: TSE · prestação de contas eleitorais 2026 (dados abertos${fin?.data_referencia ? `, atualizados em ${dataBr(fin.data_referencia)}` : ''}). Inclui doações estimadas em serviços ou materiais.</div>
    </section>`;

  // Plano de governo (26/09/2026): resumo por IA da proposta registrada no TSE, com o PDF original.
  let blocoPlano = '';
  if (plano) {
    let props = [], arqs = [];
    try { props = JSON.parse(plano.propostas_json || '[]'); arqs = JSON.parse(plano.arquivos_json || '[]'); } catch { props = []; }
    blocoPlano = `
    <section class="fx-sec" id="plano">
      <h2>Plano de governo</h2>
      <p class="fx-sub">O que a candidatura registrou na Justiça Eleitoral como proposta de governo. Resumo em linguagem simples; leia o documento completo para conferir.</p>
      <div class="vc-card fx-plano">
        ${plano.resumo ? `<p class="fx-plano-resumo">${escapeHtml(plano.resumo)}</p>` : ''}
        <ul>${props.map((x) => `<li><span class="fx-plano-tema">${escapeHtml(x.tema || '')}</span>${escapeHtml(x.texto || '')}</li>`).join('')}</ul>
        <div class="fx-plano-pdf">${arqs.map((a, i) => `<a class="vc-btn vc-btn--sec vc-btn--sm" href="/plano/${encodeURIComponent(a)}" target="_blank" rel="noopener">${Icone.documento(16)} Ler o plano completo${arqs.length > 1 ? ` (parte ${i + 1})` : ''} · PDF oficial</a>`).join('')}</div>
        <small class="fx-plano-ia">Resumo gerado por IA a partir do documento oficial registrado no TSE. Pode conter imprecisões; o PDF é a fonte.</small>
      </div>
      <div class="vc-fonte">${Icone.documento(14)} Fonte: TSE · propostas de governo registradas pelas candidaturas de 2026 (dados abertos)</div>
    </section>`;
  }

  const blocoBens = `
    <section class="fx-sec" id="patrimonio">
      <h2>Patrimônio declarado</h2>
      <p class="fx-sub">Bens informados pelo próprio candidato à Justiça Eleitoral no registro de 2026. É o valor declarado, não uma avaliação de mercado.</p>
      ${
        bens.length
          ? `<div class="vc-barras" style="margin:0 0 14px">${tipos
              .slice(0, 6)
              .map(([t, v]) => `<div class="vc-barra"><span>${escapeHtml(t)}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (v / maxTipo) * 100).toFixed(1)}%"></i></span><b>${brl(v)}</b></div>`)
              .join('')}</div>
             <details class="vc-card" style="padding:14px 18px"><summary style="cursor:pointer;font-weight:600">Ver os ${bens.length} itens da declaração (total ${brlCheio(totalBens)})</summary>
               <table class="fx-tabela" style="margin-top:12px"><thead><tr><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead><tbody>${bens
                 .map((b) => `<tr><td>${escapeHtml(nomeProprio(b.tipo || ''))}</td><td>${escapeHtml(b.descricao || '')}</td><td style="text-align:right;white-space:nowrap" class="tabnum">${brlCheio(b.valor)}</td></tr>`)
                 .join('')}</tbody></table></details>`
          : `<div class="vc-card"><p>A declaração de bens entregue ao TSE para 2026 não lista nenhum bem.</p></div>`
      }
      <div class="vc-fonte">${Icone.documento(14)} Fonte: Tribunal Superior Eleitoral · bens de candidatos 2026 (dados abertos)</div>
    </section>`;

  const blocoRedes = redes.length
    ? `<div class="fx-redes">${redes
        .map((r) => `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener nofollow ugc">${escapeHtml(rotuloRede(r.url))} ↗</a>`)
        .join('')}<span>redes oficiais informadas ao TSE</span></div>`
    : '';

  const registro = [
    ['Nome completo', nomeCompleto],
    ['Nome na urna', nomeExibicao],
    principal ? ['Cargo', `${principal.cargo_nome} · ${principal.sg_uf}`] : null,
    principal?.numero_urna ? ['Número', principal.numero_urna] : null,
    principal?.partido_sigla ? ['Partido', `${principal.partido_sigla}${principal.partido_nome ? ` (${nomeProprio(principal.partido_nome)})` : ''}`] : null,
    principal?.nome_coligacao ? ['Federação / coligação', principal.nome_coligacao === 'PARTIDO ISOLADO' ? 'Nenhuma (partido isolado)' : principal.nome_coligacao] : null,
    idade ? ['Idade', `${idade} anos`] : null,
    pessoa.grau_instrucao ? ['Escolaridade', nomeProprio(pessoa.grau_instrucao)] : null,
    pessoa.genero ? ['Gênero declarado', nomeProprio(pessoa.genero === 'F' ? 'FEMININO' : pessoa.genero === 'M' ? 'MASCULINO' : pessoa.genero)] : null,
    pessoa.cor_raca ? ['Cor/raça declarada', nomeProprio(pessoa.cor_raca)] : null,
  ].filter(Boolean);

  const corpo = `
    <style>${ESTILO_FICHA}</style>
    <nav class="fx-migalha" aria-label="Você está em"><a href="/buscar">Candidatos</a>${principal ? ` › <a href="/buscar?uf=${escapeHtml(principal.sg_uf)}">${escapeHtml(principal.sg_uf)}</a> › <a href="/buscar?cargo=${escapeHtml(cargoSlug)}&uf=${escapeHtml(principal.sg_uf)}">${escapeHtml(principal.cargo_nome)}</a>` : ''}</nav>

    <div class="fx-topo">
      <div class="fx-foto-wrap"><div class="fx-foto">${pessoa.foto_url ? `<img src="${escapeHtml(pessoa.foto_url)}" alt="Foto de ${escapeHtml(nomeExibicao)}" loading="eager">` : inicial}</div>${pessoa.foto_url ? '' : '<small class="fx-sem-foto" title="Ainda não importamos as fotos da Justiça Eleitoral. Por enquanto só aparecem fotos oficiais de quem já tem mandato no Congresso.">Foto oficial ainda não carregada</small>'}</div>
      <div>
        <h1>${escapeHtml(nomeExibicao)}</h1>
        ${nomeCompleto && nomeCompleto !== nomeExibicao ? `<div class="fx-nome-completo">${escapeHtml(nomeCompleto)}</div>` : ''}
        ${blocoRedes}
        <div class="fx-chips">
          ${principal ? `<span class="vc-chip">${escapeHtml(principal.cargo_nome)} · ${escapeHtml(principal.sg_uf)}</span>` : ''}
          ${principal?.partido_sigla ? `<span class="vc-chip vc-chip--cinza">${escapeHtml(principal.partido_sigla)}</span>` : ''}
          ${reeleicao ? `<span class="vc-chip vc-chip--teal">Tenta a reeleição</span>` : ''}
        </div>
      </div>
      ${principal?.numero_urna ? `<div class="fx-numero"><small>Número na urna</small><b>${escapeHtml(principal.numero_urna)}</b><a href="#" data-copiar="${escapeHtml(principal.numero_urna)}" data-ev-chave="numero">Copiar número</a></div>` : ''}
    </div>

    <div class="fx-acoes">
      ${slot && principal?.numero_urna ? `<button class="vc-btn vc-btn--pri" type="button" id="add-cola" data-slot="${slot}" data-cargo="${escapeHtml(cargoSlug)}" data-nome="${escapeHtml(nomeExibicao)}" data-numero="${escapeHtml(principal.numero_urna)}" data-partido="${escapeHtml(principal.partido_sigla || '')}">${Icone.impressora(18)} Adicionar à minha cola</button>` : ''}
      <a class="vc-btn vc-btn--sec" href="${linkWhatsApp(textoShare, urlFicha)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(textoShare)}" data-share-url="${urlFicha}">${Icone.whatsapp(18)} Compartilhar</a>
      <a class="vc-btn vc-btn--sec" href="#acompanhar">${Icone.sino(18)} Acompanhar</a>
    </div>

    <div class="fx-resumo">${kpis.join('')}</div>

    ${blocoSelos(selos, principal ? principal.cargo_nome : '')}

    ${blocoPlano}

    ${blocoTemas}

    ${blocoBens}

    ${blocoCampanha}

    ${blocoVotos}

    ${blocoLista}

    <section class="fx-sec">
      <h2>Dados do registro de candidatura</h2>
      <p class="fx-sub">Informações declaradas pelo próprio candidato à Justiça Eleitoral.</p>
      <dl class="fx-dl">${registro.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>
      <div class="vc-fonte">${Icone.documento(14)} Fonte: Tribunal Superior Eleitoral (dados abertos, candidatos 2026)</div>
    </section>

    ${mandatos.length > 1 || (mandatos.length && !reeleicao) ? `<section class="fx-sec"><h2>Mandatos</h2>${mandatos.map(blocoMandato).join('')}</section>` : ''}

    ${filiacoes.length ? `
      <section class="fx-sec">
        <h2>Histórico partidário registrado</h2>
        <ul style="padding-left:20px; color:var(--ink-2); font-size:14.5px; margin:0">
          ${filiacoes.map((f) => `<li>${escapeHtml(f.sigla)}${f.nome ? ` · ${escapeHtml(nomeProprio(f.nome))}` : ''}${f.data_inicio ? ` (desde ${escapeHtml(dataBr(f.data_inicio))})` : ''}</li>`).join('')}
        </ul>
      </section>` : ''}

    ${blocoAtributos(atributos)}

    <div id="acompanhar">${blocoAcompanhar(pessoa.id, acompanhar, nomeExibicao)}</div>

    <div class="vc-card" style="margin-top:16px">
      <h3 style="font-size:16px">Encontrou algo errado ou desatualizado?</h3>
      <p>Escreva para <a href="mailto:contato@votocheck.com.br?subject=${encodeURIComponent(`Correção: ${nomeExibicao} (/candidato/${pessoa.id})`)}">contato@votocheck.com.br</a> com o link desta página. O próprio candidato também pode pedir correção. Toda correção feita fica registrada.</p>
    </div>

    <div style="margin:36px 0 8px">${renderPublicidade('A3', String(pessoa.id))}</div>

    <div class="fx-toast" id="toast-cola" role="status">Adicionado à sua cola ✓ <a href="/cola">Ver cola</a></div>
    <script>
    (function(){
      var b=document.getElementById('add-cola'); if(!b) return;
      b.addEventListener('click',function(){
        var K='vc_cola_2026',d={};try{d=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
        var s=b.dataset.slot; if(b.dataset.cargo==='senador'){ s=(d['3']&&d['3'].numero&&d['3'].numero!==b.dataset.numero)?'4':'3'; }
        d[s]={nome:b.dataset.nome,numero:b.dataset.numero,partido:b.dataset.partido};
        try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}
        window.vcEv&&vcEv('cola_add',b.dataset.cargo);
        var t=document.getElementById('toast-cola'); t.style.display='block'; setTimeout(function(){t.style.display='none'},4000);
      });
    })();
    </script>
  `;

  const partidoTxt = principal?.partido_sigla ? ` (${principal.partido_sigla})` : '';
  const numTxt = principal?.numero_urna ? ` ${principal.numero_urna}` : '';
  return pagina({
    titulo: principal
      ? `${nomeExibicao}${partidoTxt}${numTxt} — ${principal.cargo_nome} ${principal.sg_uf} 2026 | VotoCheck`
      : `${nomeExibicao} | VotoCheck`,
    descricao: principal
      ? `${nomeExibicao}, candidato(a) a ${principal.cargo_nome} em ${principal.sg_uf}${principal.numero_urna ? `, número ${principal.numero_urna}` : ''}${partidoTxt}. Dados oficiais do TSE${mandatos.length ? ', Câmara e Senado' : ''}, com a fonte de cada informação.`
      : `Dados oficiais sobre ${nomeExibicao} no VotoCheck, com a fonte de cada informação.`,
    caminho: `/candidato/${pessoa.id}`,
    ogImagem: `https://votocheck.com.br/og/candidato/${pessoa.id}.jpg`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: nomeCompleto || nomeExibicao,
      alternateName: nomeExibicao,
      url: `https://votocheck.com.br/candidato/${pessoa.id}`,
      ...(pessoa.foto_url ? { image: pessoa.foto_url.startsWith('/') ? `https://votocheck.com.br${pessoa.foto_url}` : pessoa.foto_url } : {}),
      ...(principal?.partido_nome ? { affiliation: { '@type': 'PoliticalParty', name: nomeProprio(principal.partido_nome) } } : {}),
    },
    corpo: corpo + renderCtaApoio({ contexto: 'perfil', url: urlFicha }),
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
