/**
 * VotoCheck — estilo/base compartilhado entre as páginas públicas (busca, perfil).
 * Mesma paleta da landing page provisória (src/lib/landing_html.js), pra manter consistência
 * visual enquanto não existe um design system formal (Brand Blueprint em V2/).
 *
 * Princípios de marca aplicados aqui (ver Plano de Guerra / Brand Blueprint):
 *   - Nunca usa ✔️ (sugere aprovação de político) — usa pills de status neutras.
 *   - Nunca ordena/pontua candidatos por "melhor/pior" — resultados sempre em ordem alfabética.
 *   - "Passaporte da evidência" sempre visível: toda informação mostra de onde veio.
 *   - Assinatura: "Confira antes de decidir."
 */

import { FAVICON_32_B64, LOGO_HEADER_B64 } from './assets_data.js';

export const SITE_URL = 'https://votocheck.com.br';

// Paleta alinhada à marca real (ver Marca e Logo/LogoVC_RetanguloFT.png) — atualizada em
// 20/09/2026. Antes disso o site usava um teal provisório que não vinha da logo (nunca tinha
// sido conferido contra o arquivo de marca real). Cores extraídas por amostragem de pixel da
// logo e checadas contra WCAG AA (contraste ≥ 4.5:1 pra texto normal):
//   --primary (azul da logo) sobre branco: 5.6:1 · --text (navy) sobre --bg: 16.6:1 ·
//   --text-muted sobre --bg: 5.6:1 · --accent (verde) NÃO passa em texto pequeno (2.6:1) —
//   por isso só é usado em elementos gráficos/decorativos (mapa, faixas), nunca em texto.
export const CORES = {
  bg: '#F6F8FB',
  surface: '#FFFFFF',
  border: '#DCE1E8',
  text: '#0A1440',
  textMuted: '#5B6478',
  primary: '#0059F5',
  primarySoft: '#E3ECFF',
  accent: '#00B495',
  accentSoft: '#E1F6F2',
};

export const ESTILO_BASE = `
  :root {
    --bg: ${CORES.bg};
    --surface: ${CORES.surface};
    --border: ${CORES.border};
    --text: ${CORES.text};
    --text-muted: ${CORES.textMuted};
    --primary: ${CORES.primary};
    --primary-soft: ${CORES.primarySoft};
    --accent: ${CORES.accent};
    --accent-soft: ${CORES.accentSoft};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.55;
  }
  a { color: var(--primary); }
  header.topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  header.topo .logo {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--text);
  }
  header.topo .logo img {
    height: 52px;
    width: auto;
    display: block;
  }
  header.topo .nav {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  header.topo .nav a.link-sobre {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 14px;
  }
  header.topo .nav a.link-sobre:hover { color: var(--primary); }
  header.topo .tagline {
    font-size: 13px;
    color: var(--text-muted);
  }
  @media (max-width: 560px) {
    header.topo .tagline { display: none; }
    header.topo { padding: 14px 16px; }
    header.topo .logo img { height: 38px; }
    main.container { padding: 24px 16px 48px; }
  }
  main.container {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  footer.rodape {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    padding: 32px 24px;
    border-top: 1px solid var(--border);
    margin-top: 48px;
  }
  .status-pill {
    display: inline-block;
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    white-space: nowrap;
  }
  .status-pill[data-status="confirmado"] { border-color: var(--primary); color: var(--primary); }
  .status-pill[data-status="contestacao_registrada"] { border-color: #B24C1F; color: #B24C1F; }
  .status-pill[data-status="informacao_insuficiente"],
  .status-pill[data-status="depende_de_terceiros"] { border-color: #9A8B3F; color: #9A8B3F; }
  .fonte-tag {
    font-size: 12px;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
  }
  input, select, button {
    font-family: inherit;
    font-size: 15px;
  }

  /* ===== Hero / introdução (homepage) ===== */
  .hero-eyebrow {
    display: inline-block;
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--primary);
    border: 1px solid var(--primary);
    border-radius: 999px;
    padding: 4px 14px;
    margin-bottom: 20px;
  }
  .hero-intro {
    font-size: 16px;
    color: var(--text-muted);
    max-width: 620px;
    margin: 0 auto 28px;
    text-align: left;
  }

  /* ===== Três bandeiras (pilares da marca) — cartões visuais com ícone ===== */
  .pilares {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    max-width: 860px;
    margin: 32px auto 8px;
  }
  @media (max-width: 720px) {
    .pilares { grid-template-columns: 1fr; }
  }
  .pilar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    text-align: left;
  }
  .pilar-icone {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: var(--primary-soft);
    color: var(--primary);
    margin-bottom: 12px;
  }
  .pilar strong {
    display: block;
    font-size: 15px;
    color: var(--text);
    margin-bottom: 6px;
  }
  .pilar span {
    font-size: 13.5px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* ===== Banners (placeholders — ver banners_html.js) ===== */
  .banners-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin: 32px auto;
    max-width: 970px;
  }
  .banner-slot {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .banner-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .banner-slot--fino { max-height: 90px; }
  .banner-slot--largo { max-height: 250px; }

  /* ===== Mapa clicável do Brasil (mapa_brasil.js) ===== */
  .secao-titulo {
    font-size: 22px;
    text-align: center;
    margin: 0 0 6px;
  }
  .secao-subtitulo {
    font-size: 14px;
    color: var(--text-muted);
    text-align: center;
    max-width: 520px;
    margin: 0 auto 20px;
  }
  .mapa-brasil-toggle {
    display: block;
    text-align: center;
    margin: 20px 0 8px;
  }
  .mapa-brasil-toggle summary {
    cursor: pointer;
    color: var(--primary);
    font-weight: 600;
    font-size: 14px;
    list-style: none;
    display: inline-block;
  }
  .mapa-brasil-toggle summary::-webkit-details-marker { display: none; }
  .mapa-brasil-toggle summary::after { content: ' ▾'; }
  .mapa-brasil-toggle[open] summary::after { content: ' ▴'; }
  .mapa-brasil-wrap {
    text-align: center;
    max-width: 460px;
    margin: 16px auto 0;
  }
  .mapa-brasil { width: 100%; height: auto; }
  .uf-path {
    fill: var(--accent-soft);
    stroke: var(--surface);
    stroke-width: 1.2;
    transition: fill 0.15s ease;
  }
  .uf-link:hover .uf-path,
  .uf-link:focus .uf-path {
    fill: var(--primary);
  }
  .uf-link { cursor: pointer; }
  .mapa-brasil-credito {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 6px;
  }

  /* ===== Guia dos cargos (cargos_guia.js) ===== */
  .cargo-guia {
    margin-top: 56px;
    padding-top: 40px;
    border-top: 1px solid var(--border);
  }
  .cargo-guia-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px 18px;
    margin-bottom: 10px;
  }
  .cargo-guia-item summary {
    cursor: pointer;
    list-style: none;
    padding: 14px 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }
  .cargo-guia-item summary::-webkit-details-marker { display: none; }
  .cargo-guia-nome { font-weight: 600; }
  .cargo-guia-meta { font-size: 13px; color: var(--text-muted); }
  .cargo-guia-corpo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    padding: 0 0 20px;
  }
  .cargo-guia-corpo ul {
    margin: 6px 0 0;
    padding-left: 18px;
    font-size: 14px;
    color: var(--text);
  }
  .cargo-guia-corpo li { margin-bottom: 6px; }
  .cargo-guia-titulo {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin: 0;
  }
  .cargo-guia-titulo--faz { color: var(--primary); }
  .cargo-guia-titulo--nao { color: var(--text-muted); }

  /* ===== Chips + tooltip "Entenda cada cargo" (cargos_guia.js) ===== */
  .cargo-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }
  .cargo-chip-wrap { position: relative; display: inline-block; }
  .cargo-chip {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary);
    background: var(--primary-soft);
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 8px 16px;
    cursor: pointer;
  }
  .cargo-chip:hover, .cargo-chip:focus { border-color: var(--primary); }
  .cargo-tooltip {
    display: none;
    position: absolute;
    z-index: 5;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(10, 20, 64, 0.12);
    padding: 14px 16px;
    text-align: left;
    font-size: 13px;
  }
  .cargo-tooltip strong { display: block; font-size: 14px; margin-bottom: 2px; }
  .cargo-tooltip-meta { display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 8px; }
  .cargo-tooltip p { margin: 0 0 10px; color: var(--text); }
  .cargo-tooltip a { font-size: 13px; font-weight: 600; }
  .cargo-tooltip.aberto { display: block; }
  @media (hover: hover) {
    .cargo-chip-wrap:hover .cargo-tooltip { display: block; }
  }

  /* ===== Página de um cargo (/cargo/:slug) — atuação por tema ===== */
  .temas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    margin-top: 12px;
  }
  .tema-linha {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    border-radius: 8px;
    padding: 12px 14px;
  }
  .tema-linha--sem-papel { border-left-color: var(--border); }
  .tema-linha--sem-papel p { color: var(--text-muted); }
  .tema-linha h4 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.02em; }
  .tema-linha p { margin: 0; font-size: 14px; }
  .cargo-sem-cobertura {
    display: inline-block;
    margin-top: 10px;
    font-size: 12.5px;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px dashed var(--border);
    border-radius: 8px;
    padding: 8px 12px;
  }

  /* ===== Jornada (CONHEÇA/CONFIRA/ENTENDA/DECIDA/MONITORE/COBRE) — jornada_html.js ===== */
  .jornada { margin-top: 56px; padding-top: 40px; border-top: 1px solid var(--border); text-align: center; }
  .jornada-lema {
    font-size: clamp(18px, 3.4vw, 28px);
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 8px;
    line-height: 1.5;
    overflow-wrap: break-word;
  }
  .jornada-lema .seta { color: var(--primary); font-weight: 400; margin: 0 4px; }
  .jornada-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
    gap: 14px;
    margin-top: 20px;
  }
  .etapa-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px;
    text-align: left;
  }
  .etapa-card--construcao { background: var(--bg); border-style: dashed; }
  .etapa-icone { color: var(--primary); margin-bottom: 8px; }
  .etapa-titulo { margin: 0 0 8px; font-size: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .etapa-texto { margin: 0; font-size: 13.5px; color: var(--text-muted); }
  .etapa-detalhe { margin-top: 10px; }
  .etapa-detalhe summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);
    list-style: none;
  }
  .etapa-detalhe summary::-webkit-details-marker { display: none; }
  .etapa-detalhe summary::after { content: ' ↓'; }
  .etapa-detalhe[open] summary::after { content: ' ↑'; }
  .etapa-perguntas { margin: 10px 0 0; padding-left: 18px; font-size: 13px; }
  .etapa-perguntas li { margin-bottom: 6px; }
  .etapa-perguntas a { font-weight: 600; }
  .etapa-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
  }

  /* ===== Obtenção de dados — jornada_html.js ===== */
  .obtencao-dados { margin-top: 56px; padding-top: 40px; border-top: 1px solid var(--border); }
  .fontes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    max-width: 820px;
    margin: 0 auto 32px;
  }
  .fonte-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    text-align: left;
  }
  .fonte-card strong { display: block; margin: 4px 0 4px; font-size: 14px; }
  .fonte-card p { margin: 0; font-size: 13px; color: var(--text-muted); }
  .stats-linha {
    display: flex;
    gap: 24px;
    justify-content: center;
    margin-top: 40px;
    flex-wrap: wrap;
    text-align: center;
  }
  .stats-linha strong { display: block; font-size: 22px; }
  .stats-linha span { color: var(--text-muted); font-size: 13px; }
  .stats-nota { text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 12px; }
  .eleicoes-2026 { margin-top: 48px; padding-top: 32px; border-top: 1px dashed var(--border); }
  .eleicoes-2026-titulo { font-size: 15px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; text-align: center; margin: 0 0 4px; }

  /* ===== Gráfico "Cobertura por cargo" (barras horizontais — skill dataviz) ===== */
  .grafico-cargos-wrap { max-width: 640px; margin: 40px auto 0; }
  .grafico-titulo { font-size: 15px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; text-align: center; margin: 0 0 16px; }
  .grafico-cargos { display: flex; flex-direction: column; gap: 12px; }
  .grafico-linha {
    display: grid;
    grid-template-columns: 170px 1fr 56px;
    grid-template-areas: "rotulo trilha valor";
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: inherit;
  }
  .grafico-rotulo { grid-area: rotulo; font-size: 13px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grafico-trilha { grid-area: trilha; height: 20px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .grafico-barra { display: block; height: 100%; background: var(--primary); border-radius: 4px; min-width: 4px; }
  .grafico-linha:hover .grafico-barra { background: var(--text); }
  .grafico-valor { grid-area: valor; font-size: 13px; font-weight: 600; text-align: left; }
  @media (max-width: 480px) {
    .grafico-linha {
      grid-template-columns: 1fr 48px;
      grid-template-areas: "rotulo rotulo" "trilha valor";
      row-gap: 4px;
    }
    .grafico-rotulo { text-align: left; white-space: normal; overflow: visible; text-overflow: clip; }
  }

  /* ===== Monitoramento e Cobrança (teaser) — jornada_html.js ===== */
  .monitoramento {
    margin-top: 56px;
    padding: 32px 24px;
    border-top: 1px solid var(--border);
    border-radius: 10px;
    text-align: center;
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
  }
  .monitoramento .etapa-icone { display: flex; justify-content: center; }
  .monitoramento-texto { font-size: 14px; color: var(--text-muted); max-width: 560px; margin: 0 auto 16px; }

  /* ===== CTA de apoio (doação + publicidade) — jornada_html.js ===== */
  .cta-apoio {
    margin-top: 56px;
    padding-top: 40px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .cta-apoio .etapa-icone { display: flex; justify-content: center; color: var(--accent); }
  .cta-apoio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    max-width: 640px;
    margin: 24px auto 0;
  }
  .cta-apoio-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    text-align: left;
  }
  .cta-apoio-card strong { display: block; margin-bottom: 6px; }
  .cta-apoio-card p { margin: 0 0 12px; font-size: 13.5px; color: var(--text-muted); }
  .pix-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 140px;
    height: 140px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 12px;
    text-align: center;
  }

  /* ===== FAQ (institucional_html.js) ===== */
  .faq-lista { display: flex; flex-direction: column; gap: 10px; }
  .faq-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px 16px;
  }
  .faq-item summary { cursor: pointer; padding: 12px 0; font-weight: 600; list-style: none; }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item summary::before { content: '+ '; color: var(--primary); }
  .faq-item[open] summary::before { content: '− '; }
  .faq-item p { margin: 0 0 14px; color: var(--text-muted); font-size: 14px; }

  /* ===== Página de Partidos (partidos_html.js) ===== */
  .partido-lista { display: flex; flex-direction: column; gap: 14px; }
  .partido-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
    text-align: left;
  }
  .partido-cabecalho { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .partido-sigla { font-size: 17px; font-weight: 700; }
  .partido-numero { font-size: 12px; color: var(--text-muted); }
  .partido-familia {
    display: inline-block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--primary);
    background: var(--primary-soft);
    border-radius: 999px;
    padding: 2px 10px;
    margin-left: auto;
  }
  .partido-nome { color: var(--text-muted); font-size: 13.5px; margin: 2px 0 10px; }
  .partido-historico { font-size: 13.5px; margin: 0 0 12px; }
  .partido-representantes { display: flex; flex-wrap: wrap; gap: 6px; }
  .partido-representante {
    font-size: 12.5px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
    text-decoration: none;
  }
  .partido-representante:hover { border-color: var(--primary); color: var(--primary); }
  .partido-sem-representante { font-size: 12.5px; color: var(--text-muted); font-style: italic; }
  .partido-presidencia {
    font-size: 13px;
    color: var(--text);
    background: var(--bg);
    border-radius: 6px;
    padding: 8px 10px;
    margin: 0 0 12px;
  }
  .partido-presidencia--nota { color: var(--text-muted); font-style: italic; }
  .partido-presidencia-fonte { font-size: 11.5px; margin-left: 6px; }
  .partido-presidencia-alerta {
    display: inline-block;
    margin-left: 8px;
    font-size: 11px;
    color: #B24C1F;
    cursor: help;
  }

  /* ===== Diagrama de espectro político (partidos_html.js, 23/09/2026) =====
     Uma cor só (--primary) pra todos os chips, de propósito — ver nota no topo de
     partidos_html.js: posição no espectro nunca é codificada por cor neste produto. */
  .espectro-wrap { margin: 20px 0 32px; }
  .espectro-eixo {
    position: relative;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
  }
  .espectro-linha {
    position: absolute;
    top: 11px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--border);
  }
  .espectro-coluna {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .espectro-coluna::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary);
    z-index: 1;
  }
  .espectro-zona-nome {
    font-size: 11px;
    text-align: center;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .espectro-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; min-height: 26px; }
  .espectro-chip {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--primary);
    background: var(--primary-soft);
    border-radius: 999px;
    padding: 3px 9px;
    text-decoration: none;
    white-space: nowrap;
  }
  .espectro-chip:hover { background: var(--primary); color: #fff; }
  .espectro-vazia { font-size: 11px; color: var(--text-muted); }
  @media (max-width: 640px) {
    .espectro-eixo { grid-template-columns: repeat(3, 1fr); row-gap: 20px; }
    .espectro-linha { display: none; }
  }

  /* ===== Filtro de partidos (partidos_html.js, 23/09/2026) ===== */
  .partido-filtro-wrap { margin: 0 0 20px; }
  .partido-filtro-label { display: block; font-size: 12.5px; color: var(--text-muted); margin-bottom: 6px; }
  .partido-filtro {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
  }
  .partido-filtro:focus { outline: none; border-color: var(--primary); }
  .partido-filtro-vazio { font-size: 13px; color: var(--text-muted); margin-top: 10px; }

  /* ===== Diagrama de hierarquia do Judiciário (judiciario_html.js, 23/09/2026) =====
     CNJ fica visualmente separado da árvore de recursos (não é uma instância de julgamento) —
     ver nota no topo de judiciario_html.js. */
  .jud-arvore { margin: 20px 0 8px; }
  .jud-topo { display: flex; flex-direction: column; align-items: center; }
  .jud-conector {
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 0;
    text-align: center;
  }
  .jud-conector--topo { padding-bottom: 8px; }
  .jud-ramos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: start;
  }
  .jud-ramo { display: flex; flex-direction: column; align-items: stretch; }
  .jud-ramo-titulo {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin-bottom: 10px;
  }
  .jud-ramo-base { display: flex; flex-direction: column; gap: 8px; }
  .jud-nodo {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2px 12px;
  }
  .jud-nodo summary {
    cursor: pointer;
    list-style: none;
    padding: 10px 0;
    font-size: 12.5px;
    font-weight: 600;
  }
  .jud-nodo summary::-webkit-details-marker { display: none; }
  .jud-nodo summary::after { content: ' ＋'; color: var(--primary); font-weight: 400; }
  .jud-nodo[open] summary::after { content: ' −'; }
  .jud-nodo p { margin: 0 0 12px; font-size: 13px; color: var(--text-muted); }
  .jud-nodo--destaque { border-color: var(--primary); background: var(--primary-soft); }
  .jud-cnj-linha {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px dashed var(--border);
    text-align: center;
  }
  .jud-cnj-rotulo { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
  .jud-cnj-linha .jud-nodo { display: inline-block; max-width: 380px; text-align: left; }
  @media (max-width: 640px) {
    .jud-ramos { grid-template-columns: 1fr; gap: 24px; }
  }
`;

/** Converte o código de status (tabela `status`) numa pill visual — nunca usa ✔️. */
export function statusPill(codigo, descricao) {
  if (!codigo) return '';
  return `<span class="status-pill" data-status="${escapeHtml(codigo)}">${escapeHtml(descricao || codigo)}</span>`;
}

/** Escapa texto para uso seguro em HTML (evita XSS em dados vindos de fontes externas). */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cabecalho() {
  return `<header class="topo">
    <a class="logo" href="/" aria-label="VotoCheck — página inicial">
      <img src="data:image/png;base64,${LOGO_HEADER_B64}" alt="VotoCheck" width="204" height="73" />
    </a>
    <nav class="nav">
      <a class="link-sobre" href="/sobre">Sobre</a>
      <span class="tagline">Confira antes de decidir.</span>
    </nav>
  </header>`;
}

export function rodape() {
  return `<footer class="rodape">
    Dados de fontes públicas oficiais (TSE, Câmara dos Deputados, Senado Federal), com origem e histórico rastreáveis.
    Nenhuma informação aqui é opinião do VotoCheck — veja sempre a fonte de cada dado.
    <br>
    <a href="/sobre" style="color:var(--text-muted);">Sobre o VotoCheck</a> ·
    <a href="/partidos" style="color:var(--text-muted);">Partidos Políticos</a> ·
    <a href="/judiciario" style="color:var(--text-muted);">O Judiciário</a> ·
    <a href="/termos" style="color:var(--text-muted);">Termos e Condições</a> ·
    <a href="/faq" style="color:var(--text-muted);">Perguntas Frequentes</a>
    <br>&copy; VotoCheck
  </footer>`;
}

/**
 * Wrapper de página compartilhado. `caminho` (ex.: "/buscar") é opcional — usado só para
 * montar a URL canônica e a URL de og:url; sem ele, cai no "/" (aceitável para páginas sem
 * estado próprio de URL, como a 404).
 */
export function pagina({ titulo, descricao, corpo, caminho = '/', noindex = false }) {
  const urlCompleta = `${SITE_URL}${caminho}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(descricao)}" />
${noindex ? '<meta name="robots" content="noindex, nofollow" />\n' : ''}<link rel="canonical" href="${urlCompleta}" />
<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,${FAVICON_32_B64}" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="VotoCheck" />
<meta property="og:title" content="${escapeHtml(titulo)}" />
<meta property="og:description" content="${escapeHtml(descricao)}" />
<meta property="og:url" content="${urlCompleta}" />
<meta property="og:image" content="${SITE_URL}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(titulo)}" />
<meta name="twitter:description" content="${escapeHtml(descricao)}" />
<meta name="twitter:image" content="${SITE_URL}/og-image.png" />
<style>${ESTILO_BASE}</style>
</head>
<body>
${cabecalho()}
<main class="container">
${corpo}
</main>
${rodape()}
</body>
</html>`;
}

/** Página de erro 404 com a mesma casca visual do site (em vez do "Not found" cru). */
export function render404(caminho = '/') {
  return pagina({
    titulo: 'Página não encontrada — VotoCheck',
    descricao: 'Essa página não existe ou foi movida.',
    caminho,
    noindex: true,
    corpo: `
      <div style="text-align:center; padding:64px 0;">
        <h1 style="font-size:28px; margin-bottom:12px;">Página não encontrada</h1>
        <p style="color:var(--text-muted); max-width:480px; margin:0 auto 28px;">
          O endereço que você tentou acessar não existe ou foi movido. Você pode buscar um
          candidato ou representante, ou voltar para a página inicial.
        </p>
        <a href="/" style="display:inline-block; padding:12px 24px; background:var(--primary); color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">
          Voltar para a página inicial
        </a>
      </div>`,
  });
}
