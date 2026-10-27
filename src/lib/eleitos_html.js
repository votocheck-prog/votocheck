/**
 * VotoCheck — Eleitos 2026 (08/10/2026, plano pós-eleição, lotes A1/A3).
 *
 * /eleitos            → resumo nacional + 2º turno + os 27 estados
 * /eleitos/:uf        → eleitos do estado por cargo (governador, Senado, Câmara, Assembleia)
 * renderSegundoTurno  → também usado na home até 25/10
 *
 * Ordem dentro de cada cargo: número de votos (dado do TSE), do maior para o menor. É dado,
 * não ranking — e a página diz isso. Fonte: resultados.tse.jus.br (RESULTADO_2026).
 */
import { pagina, escapeHtml, SITE_URL } from './estilo_html.js';
import { Icone } from './icones.js';
import { ESTILO_BUSCA } from './busca_html.js';
import { nomeProprio } from './perfil_html.js';
import { renderPublicidade } from './publicidade.js';
import { UF_NOMES } from './home_html.js';
import { RESULTADO_2026 } from './resultado_2026.js';
import { renderBlocoBoletim } from './boletim.js';
import { formCep, ESTILO_MUNICIPIO } from './municipio_html.js';
import { botaoFav } from './meus_html.js';

// Preposição de cada UF: "no Rio de Janeiro", "na Bahia", "em São Paulo".
const ART = { AC: 'o', AL: '', AP: 'o', AM: 'o', BA: 'a', CE: 'o', DF: 'o', ES: 'o', GO: '', MA: 'o', MT: 'o', MS: 'o', MG: '', PA: 'o', PB: 'a', PR: 'o', PE: '', PI: 'o', RJ: 'o', RN: 'o', RS: 'o', RO: '', RR: '', SC: '', SP: '', SE: '', TO: 'o' };
export const emUf = (uf) => `${{ o: 'no', a: 'na', '': 'em' }[ART[uf] ?? '']} ${UF_NOMES[uf] || uf}`;
export const deUf = (uf) => `${{ o: 'do', a: 'da', '': 'de' }[ART[uf] ?? '']} ${UF_NOMES[uf] || uf}`;

export const DATA_2T_FIM = Date.UTC(2026, 9, 26, 3); // 25/10 meia-noite em Brasília
export const antesDo2T = (agora = Date.now()) => agora < DATA_2T_FIM;

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const fmtPct = (n) => (n == null ? '' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const dataTot = () => (RESULTADO_2026.totalizacao_t1 || '').replace(' ', ', ');
const dataTot2 = () => (RESULTADO_2026.totalizacao_t2 || '').replace(' ', ', ');
/** 27/10/2026: rodapé de fonte com os dois turnos (o 1º foi retotalizado depois de decisões da Justiça Eleitoral). */
export const fonteResultado = () => `Fonte: TSE, resultado oficial de 2026 (1º turno: totalização de ${dataTot()}${RESULTADO_2026.totalizacao_t2 ? `; 2º turno: ${dataTot2()}` : ''}).`;
/** Nota do Rio de Janeiro: não houve 2º turno para governador (TRE-RJ, 15/10/2026). */
export const NOTA_RJ = 'No Rio de Janeiro não houve 2º turno para governador. Depois que o TSE manteve o indeferimento da candidatura de Anthony Garotinho, os votos dele foram anulados e o TRE-RJ retotalizou o resultado: Douglas Ruas (PL) passou a 50,88% dos votos válidos e foi proclamado eleito em 15/10/2026.';

/** Totais de eleitos no 1º turno. Sem uf = Brasil. */
export function totaisEleitos(uf = '') {
  // 27/10/2026: soma os eleitos do 1º turno com os do 2º (governadores; o presidente é nacional).
  const t = { ...(RESULTADO_2026.eleitos_t1 || {}) };
  for (const r of RESULTADO_2026.resultado_t2 || []) if (r.eleito && r.cargo === 'governador') t[`${r.uf}|governador`] = (t[`${r.uf}|governador`] || 0) + 1;
  const soma = (cargo) => Object.entries(t).filter(([k]) => (!uf || k.startsWith(`${uf}|`)) && k.endsWith(`|${cargo}`)).reduce((a, [, v]) => a + v, 0);
  return {
    governador: soma('governador'),
    senador: soma('senador'),
    deputado_federal: soma('deputado_federal'),
    deputado_estadual: soma('deputado_estadual') + soma('deputado_distrital'),
    total: Object.entries(t).filter(([k]) => !uf || k.startsWith(`${uf}|`)).reduce((a, [, v]) => a + v, 0),
  };
}

/** Governador do estado: { eleito } ou { segundo: [a, b] }. */
export function governadorUf(uf) {
  const g = (RESULTADO_2026.governadores || {})[uf] || [];
  const eleito = g.find((x) => /^Eleit/i.test(x.situacao || ''));
  if (eleito) return { eleito };
  const segundo = g.filter((x) => x.situacao === '2º turno');
  return segundo.length ? { segundo } : {};
}

/** Disputas do 2º turno agrupadas (presidente primeiro). `pessoas` = { sq: {pessoa_id, foto_url} }.
 *  27/10/2026: com o resultado carregado, usa os votos do 2º turno (e a marca de eleito). */
export function disputas2T(pessoas = {}) {
  const grupos = new Map();
  const temT2 = (RESULTADO_2026.resultado_t2 || []).length > 0;
  for (const c of temT2 ? RESULTADO_2026.resultado_t2 : RESULTADO_2026.segundo_turno || []) {
    const chave = `${c.cargo}|${c.uf}`;
    if (!grupos.has(chave)) grupos.set(chave, { cargo: c.cargo, uf: c.uf, cands: [] });
    grupos.get(chave).cands.push({ ...c, ...(pessoas[c.sq] || {}), t2: temT2 });
  }
  return [...grupos.values()];
}

/** Presidente eleito em 2026 (2º turno), ou null. */
export function presidenteEleito() {
  return (RESULTADO_2026.resultado_t2 || []).find((r) => r.cargo === 'presidente' && r.eleito) || null;
}

function foto(c, nome) {
  const ini = escapeHtml((nome || '?').slice(0, 1));
  const img = c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : ini;
  return c.pessoa_id ? `<a class="bx-foto" href="/candidato/${c.pessoa_id}" tabindex="-1" aria-hidden="true">${img}</a>` : `<span class="bx-foto" aria-hidden="true">${img}</span>`;
}

function linha2T(c) {
  const nome = nomeProprio(c.nome);
  return `
    <div class="el2-cand${c.t2 && c.eleito ? ' el2-cand--eleito' : ''}">
      ${foto(c, nome)}
      <div class="el2-info">
        ${c.pessoa_id ? `<a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>` : `<span class="bx-nome">${escapeHtml(nome)}</span>`}
        <div class="bx-meta">${c.t2 && c.eleito ? '<span class="el2-eleito">Eleito</span> · ' : ''}${escapeHtml(c.partido)} · ${escapeHtml(c.numero)}</div>
      </div>
      <div class="el2-pct"><b class="tabnum">${fmtPct(c.pct)}</b><small>${c.t2 ? `${fmt(c.votos)} votos` : 'no 1º turno'}</small></div>
      <span class="el2-barra" aria-hidden="true"><i style="width:${Math.min(100, Number(c.pct) || 0).toFixed(1)}%"></i></span>
    </div>`;
}

/** Bloco "2º turno · 25/10". `ufFoco` põe a disputa do estado do visitante logo depois da presidencial. */
export function renderSegundoTurno({ pessoas = {}, ufFoco = '', comTitulo = true } = {}) {
  const lista = disputas2T(pessoas);
  if (!lista.length) return '';
  lista.sort((a, b) => (a.cargo === 'presidente' ? -1 : b.cargo === 'presidente' ? 1 : a.uf === ufFoco ? -1 : b.uf === ufFoco ? 1 : a.uf.localeCompare(b.uf)));
  const ufsGov = lista.filter((d) => d.cargo === 'governador').map((d) => d.uf);
  const cards = lista
    .map(
      (d) => `
      <article class="el2-card${d.cargo === 'presidente' ? ' el2-card--pres' : ''}" aria-label="${d.cargo === 'presidente' ? 'Presidente' : `Governador de ${escapeHtml(UF_NOMES[d.uf] || d.uf)}`}">
        <h3>${d.cargo === 'presidente' ? 'Presidente da República' : `Governador · ${escapeHtml(UF_NOMES[d.uf] || d.uf)}`}</h3>
        ${d.cands.map(linha2T).join('')}
      </article>`
    )
    .join('');
  return `
  <section class="vc-sec vc-sec--branca" id="segundo-turno">
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}</style>
    <div class="vc-wrap">
      ${comTitulo ? `<h2 class="vc-h2">Resultado do 2º turno</h2>
      <p class="vc-lead">Presidente e governador em ${ufsGov.length} estados (${ufsGov.join(', ')}), em 25 de outubro de 2026.</p>` : ''}
      <div class="el2-grid">${cards}</div>
      <p class="el-fonte">${lista[0]?.cands[0]?.t2 ? `Fonte: TSE, resultado oficial do 2º turno (totalização de ${escapeHtml(dataTot2())}).` : `Fonte: TSE, resultado oficial do 1º turno (totalização de ${escapeHtml(dataTot())}).`} Percentual sobre os votos válidos.</p>
    </div>
  </section>`;
}

const SECOES_UF = (uf) => [
  { slug: 'governador', titulo: 'Governador', ancora: 'governador' },
  { slug: 'senador', titulo: 'Senado Federal', ancora: 'senado', sub: 'Mandato de 8 anos, até 2035.' },
  { slug: 'deputado_federal', titulo: 'Câmara dos Deputados', ancora: 'camara', sub: 'Mandato de 4 anos. Posse em 1º de fevereiro de 2027.' },
  uf === 'DF'
    ? { slug: 'deputado_distrital', titulo: 'Câmara Legislativa do DF', ancora: 'assembleia', sub: 'Mandato de 4 anos.' }
    : { slug: 'deputado_estadual', titulo: 'Assembleia Legislativa', ancora: 'assembleia', sub: 'Mandato de 4 anos.' },
];

function linhaEleito(c, uf = '') {
  const nome = nomeProprio(c.nome_urna_atual || c.nome_completo);
  // Só a exceção ganha etiqueta: "média" (vaga das sobras). Quociente é o caso comum.
  const via = /média/i.test(c.st || '') ? 'pelas sobras' : c.st === '2º turno' ? '2º turno' : '';
  return `
    <div class="bx-card el-card">
      ${foto(c, nome)}
      <div class="bx-info">
        <a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>
        <div class="bx-meta">${escapeHtml(c.partido_sigla || '')}${c.votos_t2 ? ` · <span class="tabnum">${fmt(c.votos_t2)}</span> votos no 2º turno` : c.votos_t1 ? ` · <span class="tabnum">${fmt(c.votos_t1)}</span> votos` : ''}</div>
      </div>
      <div class="bx-dir">${via ? `<span class="el-via">${via}</span>` : ''}${c.eleito ? botaoFav({ id: c.pessoa_id, cargo: c.cargo_slug, nome, partido: c.partido_sigla || '', uf }) : ''}</div>
    </div>`;
}

export function renderEleitosUf({ uf, linhas = [] }) {
  const nomeUf = UF_NOMES[uf] || uf;
  const t = totaisEleitos(uf);
  const gov = governadorUf(uf);
  const porCargo = (slug) => linhas.filter((l) => l.cargo_slug === slug);
  const secoes = SECOES_UF(uf)
    .map((s) => {
      const itens = porCargo(s.slug);
      let cabeca = s.sub || '';
      if (s.slug === 'governador') cabeca = gov.segundo ? 'Ninguém passou de 50% dos votos válidos: a decisão fica para o 2º turno, em 25 de outubro.' : /2º turno/.test(gov.eleito?.situacao || '') ? 'Eleito no 2º turno, em 25 de outubro. Posse em 6 de janeiro de 2027.' : uf === 'RJ' ? `${NOTA_RJ} Posse em 6 de janeiro de 2027.` : 'Eleito no 1º turno. Posse em 6 de janeiro de 2027.';
      const cards = itens.filter((c) => c.eleito).map((c) => linhaEleito(c, uf));
      if (cards.length > 10) cards.splice(10, 0, renderPublicidade('A2', `eleitos${uf}${s.slug}`));
      return `
      <section class="el-sec" id="${s.ancora}" aria-labelledby="t-${s.ancora}">
        <div class="el-sec-topo"><h2 id="t-${s.ancora}">${escapeHtml(s.titulo)}</h2><span class="el-conta tabnum">${itens.filter((x) => x.eleito).length || itens.length} ${s.slug === 'governador' && gov.segundo ? 'no 2º turno' : itens.length === 1 ? 'eleito' : 'eleitos'}</span></div>
        <p class="el-sub">${escapeHtml(cabeca)}</p>
        ${cards.length ? `<div class="bx-grid">${cards.join('')}</div>` : `<div class="bx-vazio">Resultado ainda não carregado para este cargo. Volte em alguns minutos.</div>`}
      </section>`;
    })
    .join('');

  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <nav class="fx-migalha el-migalha" aria-label="Você está em"><a href="/eleitos">Eleitos 2026</a> › ${escapeHtml(nomeUf)}</nav>
        <h1>Quem foi eleito ${escapeHtml(emUf(uf))}</h1>
        <p class="el-lead">${fmt(t.total)} eleitos em 2026: ${t.governador ? 'o governador, ' : ''}${fmt(t.senador)} senadores, ${fmt(t.deputado_federal)} deputados federais e ${fmt(t.deputado_estadual)} deputados ${uf === 'DF' ? 'distritais' : 'estaduais'}. Toque no nome para ver o histórico, o patrimônio e o dinheiro da campanha de cada um.</p>
        <nav class="el-indice" aria-label="Ir para">${SECOES_UF(uf).map((s) => `<a href="#${s.ancora}">${escapeHtml(s.titulo)}</a>`).join('')}</nav>
        <style>${ESTILO_MUNICIPIO}</style>
        <div class="el-cep">${formCep({ tema: 'navy', id: 'cep-uf' }).replace('Seu CEP', 'Os mais votados na sua cidade: digite o CEP')}</div>
      </div>
    </section>
    <div class="bx-corpo">
      <div class="vc-wrap">
        <p class="el-nota">Dentro de cada cargo, a lista segue o número de votos, do maior para o menor. É dado do TSE, não ranking de quem é melhor. A maioria das vagas de deputado sai pelo quociente (votos do partido ou federação). Quem aparece com a etiqueta <b>pelas sobras</b> ganhou uma das vagas que restaram, distribuídas pela maior média.</p>
        ${secoes}
        <nav class="el-ufs" aria-label="Outros estados">${Object.keys(UF_NOMES).sort().map((u) => `<a href="/eleitos/${u.toLowerCase()}" class="${u === uf ? 'ativo' : ''}" title="${escapeHtml(UF_NOMES[u])}">${u}</a>`).join('')}</nav>
        <p class="el-fonte">${escapeHtml(fonteResultado())} Erro ou dado desatualizado? Escreva para <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.</p>
      </div>
    </div>
    ${renderBlocoBoletim({ uf, origem: `eleitos_${uf.toLowerCase()}` })}`;

  return pagina({
    titulo: `Eleitos ${emUf(uf)} em 2026: deputados, senadores e governador — VotoCheck`,
    descricao: `Lista oficial dos eleitos ${emUf(uf)} em 2026: ${fmt(t.deputado_federal)} deputados federais, ${fmt(t.deputado_estadual)} ${uf === 'DF' ? 'distritais' : 'estaduais'}, senadores e governador, com votos, partido e ficha de cada um. Fonte: TSE.`,
    caminho: `/eleitos/${uf.toLowerCase()}`,
    larga: true,
    corpo,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Eleitos ${emUf(uf)} em 2026`,
      numberOfItems: linhas.length,
      itemListElement: linhas.slice(0, 100).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/candidato/${l.pessoa_id}`, name: nomeProprio(l.nome_urna_atual || l.nome_completo) })),
    },
  });
}

export function renderEleitosIndex({ pessoas = {} } = {}) {
  const t = totaisEleitos();
  const pres = presidenteEleito();
  const estados = Object.keys(UF_NOMES)
    .sort()
    .map((u) => {
      const tu = totaisEleitos(u);
      const g = governadorUf(u);
      const govTxt = g.eleito ? `Governador: ${nomeProprio(g.eleito.nome)} (${g.eleito.partido})${/2º turno/.test(g.eleito.situacao || '') ? ', no 2º turno' : ''}` : g.segundo ? 'Governador: 2º turno' : '';
      return `<a class="el-uf-card" href="/eleitos/${u.toLowerCase()}"><b>${escapeHtml(UF_NOMES[u])}</b><span class="tabnum">${fmt(tu.total)} eleitos</span><small>${escapeHtml(govTxt)}</small></a>`;
    })
    .join('');
  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <h1>Eleitos em 2026</h1>
        <p class="el-lead">${pres ? `${escapeHtml(nomeProprio(pres.nome))} (${escapeHtml(pres.partido)}) foi eleito presidente no 2º turno, com ${fmtPct(pres.pct)} dos votos válidos. ` : ''}Nos estados, ${fmt(t.total)} pessoas foram eleitas: ${fmt(t.deputado_federal)} deputados federais, ${fmt(t.deputado_estadual)} deputados estaduais e distritais, ${fmt(t.senador)} senadores e ${fmt(t.governador)} governadores. Escolha seu estado.</p>
      </div>
    </section>
    <div class="bx-corpo"><div class="vc-wrap"><div class="el-uf-grid">${estados}</div></div></div>
    <div class="vc-wrap"><a class="el-2t-link" href="/segundo-turno">${Icone.calendario(18)} <span><b>Resultado do 2º turno</b> Presidente e governadores em 6 estados, com os votos de 25 de outubro</span> →</a></div>
    <div class="vc-wrap"><p class="el-fonte" style="padding-bottom:48px">${escapeHtml(fonteResultado())}</p></div>`;
  return pagina({
    titulo: 'Eleitos em 2026 por estado: deputados, senadores e governadores — VotoCheck',
    descricao: `Quem foi eleito em 2026 em cada estado: ${fmt(t.deputado_federal)} deputados federais, ${fmt(t.deputado_estadual)} estaduais e distritais, ${fmt(t.senador)} senadores e ${fmt(t.governador)} governadores, com o resultado do 2º turno. Fonte: TSE.`,
    caminho: '/eleitos',
    larga: true,
    corpo,
  });
}

/** Página avulsa do 2º turno (12/10/2026): saiu da home para não ocupar espaço lá. */
export function renderPaginaSegundoTurno({ pessoas = {}, ufFoco = '' } = {}) {
  const pres = presidenteEleito();
  const bloco = renderSegundoTurno({ pessoas, ufFoco, comTitulo: false });
  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <nav class="fx-migalha el-migalha" aria-label="Você está em"><a href="/eleitos">Eleitos 2026</a> › 2º turno</nav>
        <h1>Resultado do 2º turno de 2026</h1>
        <p class="el-lead">${pres ? `${escapeHtml(nomeProprio(pres.nome))} (${escapeHtml(pres.partido)}) foi eleito presidente da República com ${fmtPct(pres.pct)} dos votos válidos, em 25 de outubro. ` : ''}Também houve 2º turno para governador em 6 estados. Toque no nome para ver histórico, patrimônio, dinheiro de campanha e como acompanhar o mandato.</p>
        <p class="el-lead" style="margin-top:12px;font-size:14.5px;color:#9FB0E0">${escapeHtml(NOTA_RJ)}</p>
      </div>
    </section>
    ${bloco || `<div class="vc-wrap" style="padding:40px 0"><div class="bx-vazio">Resultado do 2º turno ainda não carregado.</div></div>`}
    <div class="vc-wrap" style="padding-bottom:48px"><p class="el-fonte"><a href="/eleitos">Ver todos os eleitos de 2026 por estado →</a></p></div>`;
  return pagina({
    titulo: 'Resultado do 2º turno 2026: presidente e governadores eleitos — VotoCheck',
    descricao: `Resultado oficial do 2º turno de 25 de outubro de 2026${pres ? `: ${nomeProprio(pres.nome)} (${pres.partido}) eleito presidente com ${fmtPct(pres.pct)} dos votos válidos` : ''}, e os governadores eleitos em AC, AM, DF, ES, RN e TO. Votos e ficha de cada um. Fonte: TSE.`,
    caminho: '/segundo-turno',
    larga: true,
    corpo,
  });
}

export const ESTILO_ELEITOS = `
  .el-2t-link { display: flex; align-items: center; gap: 12px; margin: 8px 0 24px; padding: 16px 18px; background: #fff; border: 1px solid var(--line); border-radius: 16px; text-decoration: none; color: var(--ink); font-size: 14.5px; }
  .el-2t-link:hover { border-color: var(--blue); }
  .el-2t-link svg { color: var(--blue); flex: none; }
  .el-2t-link span { flex: 1; color: var(--ink-2); }
  .el-2t-link b { display: block; font-family: var(--font-display); font-size: 17px; color: var(--ink); }
  .el-lead { color: #C3CDF0; font-size: 16.5px; max-width: 760px; margin: 0; line-height: 1.55; }
  .el-migalha { margin: 0 0 10px; font-size: 13.5px; color: #93A2D8; }
  .el-migalha a { color: #9EC0FF; text-decoration: none; }
  .el-indice { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
  .el-indice a { font-size: 13.5px; font-weight: 600; text-decoration: none; color: #C8D2F5; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 7px 13px; }
  .el-indice a:hover { border-color: #fff; color: #fff; }
  .el-cep { max-width: 620px; margin-top: 8px; }
  .el-nota { font-size: 14px; color: var(--muted); max-width: 820px; margin: 0 0 8px; line-height: 1.55; }
  .el-nota b { color: var(--ink); }
  .el-sec { padding: 28px 0 8px; scroll-margin-top: 16px; }
  .el-sec-topo { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 6px; }
  .el-sec-topo h2 { font-size: 22px; margin: 0; }
  .el-conta { font-size: 14px; font-weight: 700; color: var(--blue); white-space: nowrap; }
  .el-sub { font-size: 14px; color: var(--muted); margin: 6px 0 14px; }
  .el-card { grid-template-columns: 52px 1fr auto; }
  .el-via { font-size: 11.5px; font-weight: 700; color: #00735F; background: var(--teal-50); border-radius: 999px; padding: 2px 8px; }
  .el-ufs { display: flex; gap: 6px; flex-wrap: wrap; margin: 36px 0 12px; }
  .el-ufs a { font-size: 13px; font-weight: 700; text-decoration: none; color: var(--ink); border: 1px solid var(--line-2); border-radius: 8px; padding: 6px 9px; min-width: 40px; text-align: center; }
  .el-ufs a:hover { border-color: var(--blue); color: var(--blue); }
  .el-ufs a.ativo { background: var(--navy); border-color: var(--navy); color: #fff; }
  .el-fonte { font-size: 12.5px; color: var(--muted); margin: 18px 0 0; }
  .el-uf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .el-uf-card { display: flex; flex-direction: column; gap: 2px; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; text-decoration: none; color: var(--ink); transition: border-color .15s ease, box-shadow .15s ease; }
  .el-uf-card:hover { border-color: var(--blue); box-shadow: var(--shadow-sm); color: var(--ink); }
  .el-uf-card b { font-family: var(--font-display); font-size: 16.5px; }
  .el-uf-card span { font-size: 14px; color: var(--blue); font-weight: 700; }
  .el-uf-card small { font-size: 12.5px; color: var(--muted); }
  .el2-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-top: 8px; }
  .el2-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 16px 8px; }
  .el2-card--pres { grid-column: 1 / -1; background: var(--navy); border-color: var(--navy); }
  .el2-card h3 { font-size: 13px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; }
  .el2-card--pres h3 { color: #7FB0FF; }
  .el2-cand { display: grid; grid-template-columns: 52px 1fr auto; grid-template-rows: auto 6px; column-gap: 14px; row-gap: 8px; align-items: center; padding: 8px 0 12px; }
  .el2-cand + .el2-cand { border-top: 1px solid var(--line); padding-top: 14px; }
  .el2-card--pres .el2-cand + .el2-cand { border-top-color: rgba(255,255,255,.12); }
  .el2-card--pres .bx-nome { color: #fff; }
  .el2-card--pres .bx-nome:hover { color: #9EC0FF; }
  .el2-card--pres .bx-meta, .el2-card--pres .el2-pct small { color: #B9C4EA; }
  .el2-card--pres .el2-pct b { color: #fff; }
  .el2-card--pres .bx-foto { background: rgba(255,255,255,.1); color: #fff; }
  .el2-info { min-width: 0; }
  .el2-pct { text-align: right; }
  .el2-pct b { display: block; font-family: var(--font-display); font-size: 20px; line-height: 1.1; color: var(--ink); }
  .el2-pct small { font-size: 12px; color: var(--muted); }
  .el2-eleito { font-weight: 800; color: #00735F; }
  .el2-card--pres .el2-eleito { color: #5FE3C8; }
  .el2-cand--eleito .el2-barra i { background: var(--teal, #00B495); }
  .el2-card--pres .el2-cand--eleito .el2-barra i { background: #5FE3C8; }
  .el2-barra { grid-column: 2 / -1; height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
  .el2-barra i { display: block; height: 100%; border-radius: 99px; background: var(--blue); }
  .el2-card--pres .el2-barra { background: rgba(255,255,255,.12); }
  .el2-card--pres .el2-barra i { background: #7FB0FF; }
  @media (max-width: 520px) { .el2-grid { grid-template-columns: 1fr; } .el-sec-topo h2 { font-size: 19px; } }
`;
