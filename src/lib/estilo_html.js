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
  header.topo .tagline {
    font-size: 13px;
    color: var(--text-muted);
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
    <span class="tagline">Confira antes de decidir.</span>
  </header>`;
}

export function rodape() {
  return `<footer class="rodape">
    Dados de fontes públicas oficiais (TSE, Câmara dos Deputados, Senado Federal), com origem e histórico rastreáveis.
    Nenhuma informação aqui é opinião do VotoCheck — veja sempre a fonte de cada dado.
    <br>&copy; VotoCheck
  </footer>`;
}

export function pagina({ titulo, descricao, corpo }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(descricao)}" />
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
