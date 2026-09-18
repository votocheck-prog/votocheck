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

import { FAVICON_32_B64 } from './assets_data.js';

export const SITE_URL = 'https://votocheck.com.br';

export const CORES = {
  bg: '#F7F6F2',
  surface: '#F9F8F5',
  border: '#D4D1CA',
  text: '#28251D',
  textMuted: '#7A7974',
  primary: '#01696F',
  primarySoft: '#E4EFEE',
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
    font-weight: 700;
    font-size: 18px;
    text-decoration: none;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  header.topo .logo span { color: var(--primary); }
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
    <a class="logo" href="/">Voto<span>Check</span></a>
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
