/**
 * VotoCheck — /dinheiro-publico/cota (12/10/2026). Cota parlamentar (CEAP) dos deputados federais:
 * quanto cada um foi reembolsado pela Câmara em 2026 e quanto disso foi "divulgação da atividade
 * parlamentar" (posts, anúncios, gráfica, vídeo). Dado: arquivo oficial da Câmara, importado por
 * scripts/importar_cota.py para cota_resumo / cota_parlamentar.
 *
 * Neutro: ordenar por valor é ordenar por fato declarado. A página não diz se gastar é bom ou ruim;
 * explica a regra (uso permitido; vedado nos 120 dias antes da eleição para quem é candidato).
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { UF_NOMES } from './home_html.js';
import { nomeProprio, brl } from './perfil_html.js';
import { linkWhatsApp, renderCtaTriplo } from './apoio_html.js';
import { renderPublicidade } from './publicidade.js';
import { ESTILO_DP } from './dinheiro_html.js';
import { deUf } from './eleitos_html.js';

const ROTULO_CAT = [
  [/DIVULGA/, 'Divulgação do mandato'], [/VE[IÍ]CULOS/, 'Aluguel de carros'], [/ESCRIT[OÓ]RIO/, 'Escritório no estado'],
  [/COMBUST/, 'Combustível'], [/HOSPEDAGEM/, 'Hospedagem'], [/AERONAVES/, 'Aluguel de aviões'], [/TELEFONIA/, 'Telefonia'],
  [/SEGURAN/, 'Segurança'], [/T[AÁ]XI/, 'Táxi, pedágio e estacionamento'], [/PASSAGEM A[EÉ]REA/, 'Passagens aéreas'],
  [/ALIMENTA/, 'Alimentação'], [/TERRESTRES/, 'Passagens terrestres e fluviais'], [/EMBARCA/, 'Aluguel de barcos'],
  [/POSTAIS/, 'Correios'], [/PUBLICA[CÇ]/, 'Assinaturas'], [/CURSO/, 'Cursos e eventos'], [/CONSULTORIA/, 'Consultorias'],
  [/TOKENS/, 'Certificado digital'], [/MORADIA/, 'Auxílio-moradia'],
];
export const rotuloCategoria = (c) => (ROTULO_CAT.find(([re]) => re.test(String(c).toUpperCase())) || [null, nomeProprio(String(c).toLowerCase())])[1];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mi = (v) => `R$ ${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const dataBr = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

const ESTILO = `
  .ct-meses { display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 6px; align-items: end; height: 150px; margin: 6px 0 4px; }
  .ct-mes { display: grid; grid-template-rows: auto 1fr auto; height: 100%; text-align: center; gap: 4px; }
  .ct-mes b { font-size: 11px; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ct-mes i { align-self: end; display: block; background: #F2994A; border-radius: 6px 6px 2px 2px; min-height: 2px; }
  .ct-mes.veto i { background: var(--line-2); }
  .ct-mes span { font-size: 12px; color: var(--muted); }
  .ct-legenda { font-size: 13px; color: var(--muted); margin: 6px 0 0; }
  .ct-legenda i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: var(--line-2); margin-right: 4px; vertical-align: -1px; }
  @media (max-width: 560px) { .ct-mes b { font-size: 9.5px; } .ct-meses { gap: 3px; } }
  .ct-caixa { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
`;

/** `linhas`: todos os deputados do ano (cota_resumo + pessoa_id/foto). `categorias`: soma nacional por categoria. */
export function renderCota({ uf, ano, linhas, categorias }) {
  const nac = linhas.reduce((a, l) => ({ total: a.total + l.total, div: a.div + l.divulgacao, n: a.n + (l.divulgacao > 0 ? 1 : 0) }), { total: 0, div: 0, n: 0 });
  const meses = Array(12).fill(0);
  for (const l of linhas) {
    try { JSON.parse(l.divulgacao_mes || '[]').forEach((v, i) => { meses[i] += v; }); } catch { /* linha sem meses */ }
  }
  const ultimoMes = meses.reduce((u, v, i) => (v > 0 ? i : u), 0);
  const maxMes = Math.max(1, ...meses);
  const pico = meses.indexOf(Math.max(...meses));
  const atualizado = linhas.reduce((m, l) => (l.atualizado_em > m ? l.atualizado_em : m), '');
  const daUf = linhas.filter((l) => l.uf === uf).sort((a, b) => b.divulgacao - a.divulgacao || b.total - a.total);
  const maxUf = Math.max(1, ...daUf.map((l) => l.divulgacao));
  const totUf = daUf.reduce((s, l) => s + l.divulgacao, 0);
  const maxCat = Math.max(1, ...categorias.map((c) => c.valor));
  const local = deUf(uf);
  const urlShare = `https://votocheck.com.br/dinheiro-publico/cota?uf=${uf}`;
  const textoShare = `${mi(nac.div)} da cota parlamentar pagaram a divulgação do mandato de deputados federais em ${ano}. Veja quanto foi cada um ${local}:`;

  const barrasMes = meses.slice(0, Math.max(ultimoMes + 1, 6)).map((v, i) => {
    const veto = i >= 5 && i <= 8; // 120 dias antes de 04/10: a partir de 03/06 (jun–set), para candidatos
    return `<div class="ct-mes${veto ? ' veto' : ''}"><b>${v >= 1e5 ? (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : v > 0 ? '<0,1' : '0'}</b><i style="height:${Math.max(1, (v / maxMes) * 100).toFixed(1)}%"></i><span>${MESES[i]}</span></div>`;
  }).join('');

  const itens = daUf.map((l) => {
    const nome = nomeProprio(l.nome || '');
    const tag = l.pessoa_id ? 'a' : 'div';
    return `<${tag} class="dp-item" ${l.pessoa_id ? `href="/candidato/${l.pessoa_id}#cota"` : ''} style="grid-template-columns:44px minmax(0,1fr) auto">
        <span class="dp-foto">${l.foto_url ? `<img src="${escapeHtml(l.foto_url)}" alt="" loading="lazy">` : ''}</span>
        <span style="min-width:0"><span class="dp-nome">${escapeHtml(nome)}</span><span class="dp-meta">${escapeHtml(l.partido || '')} · cota total ${brl(l.total)}</span>
          <span class="dp-trilho"><i style="width:${Math.max(1.5, (l.divulgacao / maxUf) * 100).toFixed(1)}%"></i></span></span>
        <span class="dp-valor"><b>${brl(l.divulgacao)}</b><span>em divulgação</span></span>
      </${tag}>`;
  }).join('');

  const corpo = `
    <style>${ESTILO_DP}${ESTILO}</style>
    <section class="dp-hero">
      <div class="vc-wrap">
        <nav class="fx-migalha" style="margin:0 0 10px;font-size:13.5px"><a href="/dinheiro-publico" style="color:#FFC08A;text-decoration:none">Dinheiro público</a> <span style="color:#93A2D8">›</span> <span style="color:#C3CDF0">Cota parlamentar</span></nav>
        <span class="vc-eyebrow">${Icone.cifrao(16)} Cota parlamentar ${ano} · Câmara dos Deputados</span>
        <h1><em>${mi(nac.div)}</em> pagaram a divulgação do mandato de deputados federais em ${ano}</h1>
        <p>A cota parlamentar reembolsa despesas do mandato com dinheiro público. Uma das categorias é "divulgação da atividade parlamentar": posts patrocinados, vídeos, gráfica e anúncios. É permitido, mas a regra da Câmara proíbe para quem é candidato nos 120 dias antes da eleição.</p>
        <div class="dp-kpis">
          <div><b>${mi(nac.total)}</b><span>cota total reembolsada em ${ano}</span></div>
          <div><b>${mi(nac.div)}</b><span>só em divulgação (${Math.round((100 * nac.div) / Math.max(1, nac.total))}% da cota)</span></div>
          <div><b>${mi(meses[pico])}</b><span>em ${MESES[pico]}, o mês recorde de divulgação</span></div>
          <div><b>${nac.n.toLocaleString('pt-BR')}</b><span>deputados usaram a cota para divulgação</span></div>
        </div>
        <div class="dp-share">
          <a class="vc-btn vc-btn--pri" href="${linkWhatsApp(textoShare, urlShare)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(textoShare)}" data-share-url="${urlShare}" data-ev="cota_compartilhar">${Icone.whatsapp(18)} Mandar para 3 pessoas</a>
          <a class="vc-btn vc-btn--sec" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.35)" href="https://www.instagram.com/votocheck" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="instagram:cota">${Icone.instagram(18)} Seguir @votocheck</a>
        </div>
      </div>
    </section>
    <div class="vc-wrap" style="padding-bottom:56px">
      <section class="dp-sec" style="margin-top:28px">
        <h2>Divulgação do mandato, mês a mês (R$ milhões)</h2>
        <p>Soma de todos os deputados federais. O gasto cai a partir de junho, quando começa a proibição para quem é candidato.</p>
        <div class="ct-caixa">
          <div class="ct-meses">${barrasMes}</div>
          <p class="ct-legenda"><i></i> de junho a setembro: 120 dias antes da eleição (04/10), vedado para quem é candidato. Lançamentos podem chegar com atraso de algumas semanas.</p>
        </div>
      </section>
      <form class="dp-filtros" method="GET" action="/dinheiro-publico/cota" id="estado">
        <label style="font-weight:600">Estado
          <select name="uf" onchange="this.form.submit()">${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${escapeHtml(UF_NOMES[u])}</option>`).join('')}</select></label>
        <noscript><button class="vc-btn vc-btn--sec vc-btn--sm">Ver</button></noscript>
      </form>
      <div class="dp-grid">
        <section class="dp-sec">
          <h2>Deputados ${escapeHtml(local)}: quanto foi para divulgação</h2>
          <p>${daUf.length} deputados com despesa na cota em ${ano}, somando ${brl(totUf)} em divulgação. Em ordem do valor, do maior para o menor: é um fato declarado, não ranking de qualidade. Toque no nome para ver a ficha.</p>
          <div class="dp-lista">${itens || '<p style="padding:16px;margin:0">Nenhuma despesa registrada.</p>'}</div>
        </section>
        <aside>
          <section class="dp-sec">
            <h2>Para onde vai a cota</h2>
            <p>Todos os deputados federais, ${ano}, por categoria.</p>
            <div class="vc-barras dp-partidos" style="margin:0">${categorias.slice(0, 8)
              .map((c) => `<div class="vc-barra"><span>${escapeHtml(rotuloCategoria(c.categoria))}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (c.valor / maxCat) * 100).toFixed(1)}%"></i></span><b>${brl(c.valor)}</b></div>`)
              .join('')}</div>
          </section>
          <div class="dp-nota">${Icone.escudoCheck(16)} <strong>Como ler:</strong> valores líquidos reembolsados pela Câmara, com nota fiscal pública para cada despesa. A cota existe por lei e o valor mensal varia por estado. Usar não é irregular; a regra só proíbe divulgação nos 120 dias antes da eleição para quem é candidato (Ato da Mesa nº 43/2009).</div>
          <div class="vc-fonte" style="margin-top:10px">${Icone.documento(14)} Fonte: Câmara dos Deputados · cota parlamentar (CEAP) ${ano}, dados abertos${atualizado ? `, atualizados em ${dataBr(atualizado)}` : ''}</div>
          <div style="margin-top:18px">${renderPublicidade('A2', 'cota' + uf)}</div>
        </aside>
      </div>
    </div>
    ${renderCtaTriplo({ contexto: 'home', url: urlShare })}`;

  return pagina({
    titulo: `Cota parlamentar ${ano}: quanto os deputados ${local} gastaram com divulgação | VotoCheck`,
    descricao: `${mi(nac.div)} da cota parlamentar pagaram divulgação do mandato de deputados federais em ${ano}. Veja quanto cada deputado ${local} gastou, com fonte na Câmara.`,
    caminho: `/dinheiro-publico/cota?uf=${uf}`,
    larga: true,
    corpo,
  });
}

/** Bloco da ficha (id="cota"): só para quem tem despesa na cota no ano. */
export function blocoCotaPerfil({ cota, categorias = [], uf = '', ano }) {
  if (!cota) return '';
  const max = Math.max(1, ...categorias.map((c) => c.valor));
  return `
    <section class="fx-sec" id="cota">
      <h2>Cota parlamentar em ${ano}</h2>
      <p class="fx-sub">Despesas do mandato reembolsadas pela Câmara com dinheiro público: ${brl(cota.total)} no ano, dos quais <strong>${brl(cota.divulgacao)}</strong> em divulgação da atividade parlamentar.</p>
      <div class="vc-barras" style="margin:0 0 10px">${categorias.slice(0, 6)
        .map((c) => `<div class="vc-barra${/divulga/i.test(c.categoria) ? ' fx-barra-pub' : ''}"><span>${escapeHtml(rotuloCategoria(c.categoria))}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (c.valor / max) * 100).toFixed(1)}%"></i></span><b>${brl(c.valor)}</b></div>`)
        .join('')}</div>
      <p style="font-size:14px;margin:0 0 8px"><a href="/dinheiro-publico/cota?uf=${escapeHtml(uf)}">Compare com os outros deputados do estado →</a></p>
      <div class="vc-fonte">${Icone.documento(14)} Fonte: Câmara dos Deputados · cota parlamentar (CEAP) ${ano}, dados abertos${cota.atualizado_em ? `, atualizados em ${dataBr(cota.atualizado_em)}` : ''}. Cada despesa tem nota fiscal pública.</div>
    </section>`;
}
