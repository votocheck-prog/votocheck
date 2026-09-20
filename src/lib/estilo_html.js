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
    height: 30px;
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

  /* ===== Quatro bandeiras (pilares da marca) ===== */
  .pilares {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    max-width: 820px;
    margin: 0 auto 8px;
  }
  .pilar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 12px 14px;
    text-align: left;
  }
  .pilar strong {
    display: block;
    font-size: 13px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text);
    margin-bottom: 4px;
  }
  .pilar span {
    font-size: 13px;
    color: var(--text-muted);
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
    <br><a href="/sobre" style="color:var(--text-muted);">Sobre o VotoCheck</a>
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
