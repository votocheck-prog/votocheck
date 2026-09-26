/**
 * VotoCheck — /dinheiro-publico (26/09/2026). Quanto de dinheiro público (fundo eleitoral + fundo
 * partidário) foi para cada candidato, segundo a prestação de contas parcial entregue ao TSE.
 *
 * Ordenar por valor aqui é ordenar por um FATO declarado, não por qualidade: a página nunca diz se
 * receber muito é bom ou ruim. Todo valor vem com a data da base e a fonte.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { UF_NOMES } from './home_html.js';
import { nomeProprio, brl } from './perfil_html.js';
import { renderCtaTriplo, linkWhatsApp } from './apoio_html.js';
import { renderPublicidade } from './publicidade.js';

export const CARGOS_DINHEIRO = [
  { slug: 'deputado_federal', nome: 'Deputado federal' },
  { slug: 'deputado_estadual', nome: 'Deputado estadual' },
  { slug: 'deputado_distrital', nome: 'Deputado distrital' },
  { slug: 'senador', nome: 'Senador' },
  { slug: 'governador', nome: 'Governador' },
  { slug: 'presidente', nome: 'Presidente' },
];

const ESTILO = `
  .dp-hero { background: var(--navy); color: #fff; padding: 52px 0 44px; position: relative; overflow: hidden; }
  .dp-hero::after { content: ''; position: absolute; right: -140px; top: -140px; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, rgba(242,153,74,.25), transparent 65%); }
  .dp-hero .vc-eyebrow { color: #FFC08A; }
  .dp-hero h1 { color: #fff; font-size: clamp(30px, 4.6vw, 52px); line-height: 1.08; letter-spacing: -.025em; margin: 8px 0 14px; max-width: 900px; position: relative; z-index: 1; }
  .dp-hero h1 em { font-style: normal; color: #FFB067; }
  .dp-hero p { color: #C3CDF0; font-size: 17px; max-width: 720px; margin: 0; position: relative; z-index: 1; }
  .dp-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-top: 26px; position: relative; z-index: 1; }
  @media (max-width: 820px) { .dp-kpis { grid-template-columns: 1fr 1fr; } }
  .dp-kpis div { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 14px 16px; }
  .dp-kpis b { display: block; font-family: var(--font-display); font-size: 24px; color: #fff; }
  .dp-kpis span { font-size: 12.5px; color: #AEB9E0; }
  .dp-filtros { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 28px 0 8px; }
  .dp-filtros select { padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--line-2); font-weight: 600; font-size: 15px; background: #fff; }
  .dp-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .dp-chips a { font-size: 14px; font-weight: 600; text-decoration: none; color: var(--ink-2); border: 1.5px solid var(--line); background: #fff; border-radius: 999px; padding: 8px 14px; }
  .dp-chips a.ativo { background: var(--navy); border-color: var(--navy); color: #fff; }
  .dp-grid { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); gap: 24px; align-items: start; margin-top: 18px; }
  @media (max-width: 960px) { .dp-grid { grid-template-columns: 1fr; } }
  .dp-sec h2 { font-size: 21px; margin: 0 0 4px; }
  .dp-sec > p { color: var(--muted); font-size: 14px; margin: 0 0 14px; }
  .dp-lista { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .dp-item { display: grid; grid-template-columns: 28px 44px minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); text-decoration: none; color: inherit; }
  .dp-item:hover { background: var(--paper); }
  .dp-pos { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }
  .dp-foto { width: 44px; height: 44px; border-radius: 12px; overflow: hidden; background: var(--blue-50); }
  .dp-foto img { width: 100%; height: 100%; object-fit: cover; }
  .dp-nome { display: block; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dp-meta { display: block; font-size: 12.5px; color: var(--muted); }
  .dp-partidos .vc-barra, .dp-sec .vc-barra { grid-template-columns: minmax(0,1fr) minmax(0,1.3fr) 92px; }
  @media (max-width: 560px) { .dp-item { grid-template-columns: 22px 40px minmax(0,1fr) auto; gap: 10px; padding: 10px; } .dp-foto { width: 40px; height: 40px; } }
  .dp-trilho { height: 6px; border-radius: 999px; background: var(--paper); margin-top: 6px; overflow: hidden; }
  .dp-trilho i { display: block; height: 100%; background: #F2994A; border-radius: 999px; }
  .dp-valor { text-align: right; }
  .dp-valor b { font-family: var(--font-display); font-size: 16px; display: block; white-space: nowrap; }
  .dp-valor span { font-size: 12px; color: var(--muted); }
  .dp-partidos .vc-barra-trilho i { background: #F2994A; }
  .dp-nota { background: var(--blue-50); border-radius: 14px; padding: 14px 16px; font-size: 13.5px; color: var(--ink-2); margin-top: 14px; }
  .dp-share { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; position: relative; z-index: 1; }
`;

function bi(v) {
  return `R$ ${(v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`;
}

export function renderDinheiroPublico({ uf, cargo, nacional, lista, partidos, totalLista, dataRef }) {
  const cargoInfo = CARGOS_DINHEIRO.find((c) => c.slug === cargo) || CARGOS_DINHEIRO[0];
  const semUf = cargo === 'presidente';
  const local = semUf ? 'no Brasil' : `${uf === 'DF' ? 'no' : 'em'} ${UF_NOMES[uf] || uf}`;
  const dataTxt = dataRef ? dataRef.split('-').reverse().join('/') : '';
  const pub = nacional.fefc + nacional.fp;
  const maxLista = Math.max(1, ...lista.map((c) => c.publico));
  const maxPartido = Math.max(1, ...partidos.map((p) => p.publico));
  const textoShare = `${bi(pub)} de dinheiro público já foram para as campanhas de 2026. Veja quanto foi para cada candidato do seu estado:`;
  const urlShare = `https://votocheck.com.br/dinheiro-publico?uf=${uf}&cargo=${cargo}`;

  const itens = lista
    .map((c, i) => {
      const nome = nomeProprio(c.nome_urna_atual || '');
      const pct = c.total ? Math.round((100 * c.publico) / c.total) : 0;
      return `<a class="dp-item" href="/candidato/${c.pessoa_id}#campanha">
        <span class="dp-pos">${i + 1}º</span>
        <span class="dp-foto">${c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : ''}</span>
        <span style="min-width:0"><span class="dp-nome">${escapeHtml(nome)}</span><span class="dp-meta">${escapeHtml(c.partido_sigla || '')} · ${escapeHtml(String(c.numero_urna || ''))}</span>
          <span class="dp-trilho"><i style="width:${Math.max(1.5, (c.publico / maxLista) * 100).toFixed(1)}%"></i></span></span>
        <span class="dp-valor"><b>${brl(c.publico)}</b><span>${pct}% do arrecadado</span></span>
      </a>`;
    })
    .join('');

  const corpo = `
    <style>${ESTILO}</style>
    <section class="dp-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.cifrao(16)} Dinheiro público nas eleições 2026</span>
        <h1><em>${bi(pub)}</em> de dinheiro público já foram para as campanhas</h1>
        <p>É o fundo eleitoral e o fundo partidário que os próprios candidatos declararam ter recebido até ${escapeHtml(dataTxt)}. Veja quanto foi para cada um no seu estado.</p>
        <div class="dp-kpis">
          <div><b>${bi(nacional.fefc)}</b><span>fundo eleitoral</span></div>
          <div><b>${bi(nacional.fp)}</b><span>fundo partidário</span></div>
          <div><b>${nacional.total ? Math.round((100 * pub) / nacional.total) : 0}%</b><span>de tudo o que as campanhas arrecadaram</span></div>
          <div><b>${nacional.com.toLocaleString('pt-BR')}</b><span>candidaturas receberam dinheiro público</span></div>
        </div>
        <div class="dp-share">
          <a class="vc-btn vc-btn--pri" href="${linkWhatsApp(textoShare, urlShare)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(textoShare)}" data-share-url="${urlShare}" data-ev="dinheiro_compartilhar">${Icone.whatsapp(18)} Mandar para 3 pessoas</a>
          <a class="vc-btn vc-btn--sec" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.35)" href="https://www.instagram.com/votocheck" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="instagram:dinheiro">${Icone.instagram(18)} Seguir @votocheck</a>
        </div>
      </div>
    </section>
    <div class="vc-wrap" style="padding-bottom:56px">
      <form class="dp-filtros" method="GET" action="/dinheiro-publico">
        <input type="hidden" name="cargo" value="${escapeHtml(cargo)}">
        ${semUf ? '' : `<label style="font-weight:600">Estado
          <select name="uf" onchange="this.form.submit()">${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${escapeHtml(UF_NOMES[u])}</option>`).join('')}</select></label>`}
        <nav class="dp-chips" aria-label="Cargo">${CARGOS_DINHEIRO.filter((c) => c.slug !== 'deputado_distrital' || uf === 'DF').filter((c) => c.slug !== 'deputado_estadual' || uf !== 'DF')
          .map((c) => `<a class="${c.slug === cargo ? 'ativo' : ''}" href="/dinheiro-publico?uf=${uf}&cargo=${c.slug}">${c.nome}</a>`).join('')}</nav>
        <noscript><button class="vc-btn vc-btn--sec vc-btn--sm">Ver</button></noscript>
      </form>
      <div class="dp-grid">
        <section class="dp-sec">
          <h2>${escapeHtml(cargoInfo.nome)} ${escapeHtml(local)}: quanto cada um recebeu</h2>
          <p>Em ordem do valor público recebido, do maior para o menor. ${totalLista.toLocaleString('pt-BR')} candidaturas declararam alguma receita. Não é ranking de qualidade.</p>
          <div class="dp-lista">${itens || '<p style="padding:16px;margin:0">Nenhuma receita declarada ainda.</p>'}</div>
          ${totalLista > lista.length ? `<p style="font-size:13.5px;color:var(--muted);margin-top:10px">Mostrando os ${lista.length} que mais receberam. O valor de cada candidato também aparece na ficha dele.</p>` : ''}
        </section>
        <aside>
          <section class="dp-sec">
            <h2>Por partido</h2>
            <p>Soma do dinheiro público recebido pelos candidatos de cada partido, neste cargo ${escapeHtml(local)}.</p>
            <div class="vc-barras dp-partidos" style="margin:0">${partidos
              .slice(0, 12)
              .map((p) => `<div class="vc-barra"><span>${escapeHtml(p.sigla || '—')}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (p.publico / maxPartido) * 100).toFixed(1)}%"></i></span><b>${brl(p.publico)}</b></div>`)
              .join('')}</div>
          </section>
          <div class="dp-nota">${Icone.escudoCheck(16)} <strong>Como ler:</strong> são valores parciais, informados pelas próprias campanhas durante a eleição; o número muda até a prestação de contas final. O fundo eleitoral é dividido entre os partidos por regra da lei, e cada partido decide quanto repassa a cada candidato. Inclui doações estimadas em serviços ou materiais, e repasses entre candidatos contam para quem recebeu.</div>
          <div class="vc-fonte" style="margin-top:10px">${Icone.documento(14)} Fonte: TSE · prestação de contas eleitorais de candidatos 2026 (dados abertos, ${escapeHtml(dataTxt)})</div>
          <div style="margin-top:18px">${renderPublicidade('A2', 'dinheiro' + uf)}</div>
        </aside>
      </div>
    </div>
    ${renderCtaTriplo({ contexto: 'home', url: urlShare })}`;

  return pagina({
    titulo: `Dinheiro público na campanha: ${cargoInfo.nome.toLowerCase()} ${local} | VotoCheck`,
    descricao: `${bi(pub)} de fundo eleitoral e fundo partidário já foram para as campanhas de 2026. Veja quanto cada candidato a ${cargoInfo.nome.toLowerCase()} ${local} recebeu, com fonte no TSE.`,
    caminho: `/dinheiro-publico?uf=${uf}&cargo=${cargo}`,
    larga: true,
    corpo,
  });
}
