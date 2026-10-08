/**
 * VotoCheck — /quanto-vale-seu-voto (26/09/2026). Quantos eleitores cada vaga de deputado federal
 * representa em cada estado, e quantos eleitores não escolheram deputado nenhum em 2022.
 * Dados: resultado oficial de 2022 (TSE). A distribuição de vagas (mín. 8, máx. 70 por estado) é a
 * mesma de 2026.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { UF_NOMES } from './home_html.js';
import { DEP_FEDERAL_2022 } from './eleitorado_2022.js';
import { renderCtaTriplo, linkWhatsApp } from './apoio_html.js';

const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
const ufs = Object.entries(DEP_FEDERAL_2022).map(([uf, d]) => ({
  uf,
  ...d,
  porVaga: d.eleitores / d.vagas,
  semEscolha: (d.abstencao + d.brancos + d.nulos) / d.eleitores,
}));
const SP = ufs.find((u) => u.uf === 'SP');

const ESTILO = `
  .pv-hero { background: var(--navy); color: #fff; padding: 52px 0 44px; }
  .pv-hero .vc-eyebrow { color: #8FB0FF; }
  .pv-hero h1 { color: #fff; font-size: clamp(30px, 4.6vw, 52px); line-height: 1.08; letter-spacing: -.025em; margin: 8px 0 14px; max-width: 900px; }
  .pv-hero h1 em { font-style: normal; color: #5FE3C8; }
  .pv-hero p { color: #C3CDF0; font-size: 17px; max-width: 720px; margin: 0; }
  .pv-destaque { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-top: 26px; max-width: 760px; }
  .pv-destaque > div { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 16px 18px; }
  .pv-destaque b { display: block; font-family: var(--font-display); font-size: 28px; color: #fff; }
  .pv-destaque span { font-size: 13px; color: #AEB9E0; }
  .pv-vs { font-family: var(--font-display); font-weight: 800; color: #5FE3C8; font-size: 20px; }
  @media (max-width: 620px) { .pv-destaque { grid-template-columns: 1fr; } .pv-vs { text-align: center; } }
  .pv-sec { padding: 44px 0 0; }
  .pv-sec h2 { font-size: clamp(22px, 2.8vw, 28px); margin: 0 0 6px; }
  .pv-sec > .vc-wrap > p { color: var(--muted); margin: 0 0 18px; max-width: 760px; }
  .pv-tabela { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 10px 18px; }
  .pv-linha { display: grid; grid-template-columns: 150px minmax(0,1fr) 120px 90px; gap: 14px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
  .pv-linha:last-child { border-bottom: 0; }
  .pv-linha.eu { background: var(--blue-50); margin: 0 -18px; padding: 8px 18px; font-weight: 700; }
  .pv-trilho { height: 8px; background: var(--paper); border-radius: 999px; overflow: hidden; }
  .pv-trilho i { display: block; height: 100%; background: var(--blue); border-radius: 999px; }
  .pv-trilho.lar i { background: #F2994A; }
  .pv-linha b { font-family: var(--font-display); text-align: right; font-variant-numeric: tabular-nums; }
  .pv-linha small { color: var(--muted); text-align: right; }
  @media (max-width: 620px) { .pv-linha { grid-template-columns: 92px minmax(0,1fr) 84px; } .pv-linha small { display: none; } }
  .pv-cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
  @media (max-width: 820px) { .pv-cards { grid-template-columns: 1fr; } }
  .pv-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px; }
  .pv-card h3 { font-size: 17px; margin: 0 0 6px; }
  .pv-card p { font-size: 14.5px; color: var(--ink-2); margin: 0; }
`;

export function renderPesoVoto({ uf }) {
  const eu = ufs.find((u) => u.uf === uf) || SP;
  const menor = [...ufs].sort((a, b) => a.porVaga - b.porVaga)[0];
  const maior = [...ufs].sort((a, b) => b.porVaga - a.porVaga)[0];
  const vezes = maior.porVaga / menor.porVaga;
  const porVaga = [...ufs].sort((a, b) => b.porVaga - a.porVaga);
  const semEsc = [...ufs].sort((a, b) => b.semEscolha - a.semEscolha);
  const maxSem = semEsc[0].semEscolha;
  const nome = (u) => UF_NOMES[u.uf] || u.uf;
  const texto = `Seu voto para deputado federal não vale o mesmo em todo o Brasil: em ${nome(menor)} uma vaga representa ${fmt(menor.porVaga)} eleitores; em ${nome(maior)}, ${fmt(maior.porVaga)}. E você, sabe quanto vale o seu?`;
  const urlShare = `https://votocheck.com.br/quanto-vale-seu-voto?uf=${eu.uf}`;
  const pesoEu = maior.porVaga / eu.porVaga;

  const linhasVaga = porVaga
    .map((u) => `<div class="pv-linha${u.uf === eu.uf ? ' eu' : ''}"><span>${escapeHtml(nome(u))}</span><span class="pv-trilho"><i style="width:${((u.porVaga / maior.porVaga) * 100).toFixed(1)}%"></i></span><b>${fmt(u.porVaga)}</b><small>${u.vagas} vagas</small></div>`)
    .join('');
  const linhasSem = semEsc
    .map((u) => `<div class="pv-linha${u.uf === eu.uf ? ' eu' : ''}"><span>${escapeHtml(nome(u))}</span><span class="pv-trilho lar"><i style="width:${((u.semEscolha / maxSem) * 100).toFixed(1)}%"></i></span><b>${(u.semEscolha * 100).toFixed(0)}%</b><small>${fmt(u.abstencao + u.brancos + u.nulos)}</small></div>`)
    .join('');

  const corpo = `
    <style>${ESTILO}</style>
    <section class="pv-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.balanca(16)} Quanto vale o seu voto</span>
        <h1>Seu voto para deputado federal <em>não vale o mesmo</em> em todo o Brasil</h1>
        <p>Cada estado tem entre 8 e 70 vagas na Câmara, e o número não acompanha a população. Resultado: uma vaga pode representar ${vezes.toFixed(0)} vezes mais eleitores num estado do que em outro.</p>
        <div class="pv-destaque">
          <div><b>${fmt(menor.porVaga)}</b><span>eleitores por vaga em ${escapeHtml(nome(menor))}</span></div>
          <span class="pv-vs">vs</span>
          <div><b>${fmt(maior.porVaga)}</b><span>eleitores por vaga em ${escapeHtml(nome(maior))}</span></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">
          <a class="vc-btn vc-btn--pri" href="${linkWhatsApp(texto, urlShare)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(texto)}" data-share-url="${urlShare}" data-ev="peso_compartilhar">${Icone.whatsapp(18)} Mandar para 3 pessoas</a>
          <a class="vc-btn vc-btn--sec" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.35)" href="/buscar?cargo=deputado_federal&uf=${eu.uf}">Ver candidatos a deputado em ${escapeHtml(eu.uf)}</a>
        </div>
      </div>
    </section>

    <section class="pv-sec">
      <div class="vc-wrap">
        <form method="GET" action="/quanto-vale-seu-voto" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:18px">
          <label style="font-weight:600">Seu estado
            <select name="uf" onchange="this.form.submit()" style="padding:10px 12px;border-radius:12px;border:1.5px solid var(--line-2);font-weight:600">${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === eu.uf ? 'selected' : ''}>${escapeHtml(UF_NOMES[u])}</option>`).join('')}</select>
          </label>
        </form>
        <div class="pv-cards">
          <div class="pv-card"><h3>${escapeHtml(nome(eu))}</h3><p>Cada uma das <strong>${eu.vagas} vagas</strong> de deputado federal representa <strong>${fmt(eu.porVaga)} eleitores</strong>.</p></div>
          <div class="pv-card"><h3>Comparado a ${escapeHtml(nome(maior))}</h3><p>${eu.uf === maior.uf ? 'É o estado onde cada vaga representa mais eleitores.' : `Aqui, cada voto tem <strong>${pesoEu.toFixed(1).replace('.', ',')} vezes</strong> mais peso na escolha de uma vaga.`}</p></div>
          <div class="pv-card"><h3>Em 2022</h3><p><strong>${(eu.semEscolha * 100).toFixed(0)}% dos eleitores</strong> do estado não escolheram deputado federal: faltaram, votaram em branco ou anularam.</p></div>
        </div>
      </div>
    </section>

    <section class="pv-sec">
      <div class="vc-wrap">
        <h2>Eleitores por vaga de deputado federal</h2>
        <p>Quanto maior a barra, mais eleitores disputam o peso de cada cadeira. Eleitorado de 2022 dividido pelas vagas do estado, que são as mesmas em 2026.</p>
        <div class="pv-tabela">${linhasVaga}</div>
      </div>
    </section>

    <section class="pv-sec">
      <div class="vc-wrap">
        <h2>Quem não escolheu deputado em 2022</h2>
        <p>Abstenção, votos em branco e nulos para deputado federal, como parte do eleitorado. É gente que deixou a escolha para os outros.</p>
        <div class="pv-tabela">${linhasSem}</div>
        <div class="vc-fonte" style="margin-top:12px">${Icone.documento(14)} Fonte: TSE · resultado oficial das eleições de 2022 para deputado federal (totalização final). Vagas por estado: Constituição, art. 45, e LC 78/1993.</div>
      </div>
    </section>

    <section class="pv-sec" style="padding-bottom:10px">
      <div class="vc-wrap">
        <div class="pv-cards">
          <div class="pv-card"><h3>Por que é assim?</h3><p>A Constituição fixa no mínimo 8 e no máximo 70 deputados por estado. Estados pequenos ficam acima da proporção; São Paulo fica abaixo.</p></div>
          <div class="pv-card"><h3>Seu voto vai para o partido</h3><p>Para deputado, o voto soma primeiro para o partido ou federação e pode eleger outra pessoa da mesma lista. <a href="/#seu-voto">Entenda</a>.</p></div>
          <div class="pv-card"><h3>Quem ficou com as vagas</h3><p>Veja os deputados eleitos em 2026 no seu estado, com votos e a ficha de cada um. <a href="/eleitos">Ver os eleitos</a>.</p></div>
        </div>
      </div>
    </section>
    ${renderCtaTriplo({ contexto: 'home', url: urlShare })}`;

  return pagina({
    titulo: `Quanto vale o seu voto para deputado federal em ${nome(eu)} | VotoCheck`,
    descricao: `Em ${nome(eu)}, cada vaga de deputado federal representa ${fmt(eu.porVaga)} eleitores. Veja a comparação entre os estados e quantos eleitores não escolheram deputado em 2022.`,
    caminho: `/quanto-vale-seu-voto?uf=${eu.uf}`,
    larga: true,
    corpo,
  });
}
