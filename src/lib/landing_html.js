/**
 * VotoCheck — Landing page provisória
 *
 * Servida em GET / enquanto o site/app completo não existe. Estática, sem dependências,
 * apenas para o domínio não ficar em branco. Substituir quando o frontend real for construído.
 */
export const LANDING_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>VotoCheck — Verificação eleitoral independente</title>
<meta name="description" content="VotoCheck reúne dados públicos oficiais sobre candidatos e eleitos — TSE, Câmara e Senado — em um só lugar, com origem e histórico rastreáveis." />
<style>
  :root {
    --bg: #F7F6F2;
    --surface: #F9F8F5;
    --border: #D4D1CA;
    --text: #28251D;
    --text-muted: #7A7974;
    --primary: #01696F;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  main {
    max-width: 640px;
    text-align: center;
  }
  .badge {
    display: inline-block;
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--primary);
    border: 1px solid var(--primary);
    border-radius: 999px;
    padding: 4px 14px;
    margin-bottom: 24px;
  }
  h1 {
    font-size: clamp(28px, 5vw, 44px);
    margin: 0 0 16px;
    letter-spacing: -0.01em;
  }
  p.lead {
    font-size: 18px;
    color: var(--text-muted);
    margin: 0 0 32px;
  }
  .fontes {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 40px;
  }
  .fonte-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    color: var(--text);
  }
  footer {
    font-size: 13px;
    color: var(--text-muted);
  }
  footer a { color: var(--primary); text-decoration: none; }
</style>
</head>
<body>
<main>
  <span class="badge">Em construção</span>
  <h1>VotoCheck</h1>
  <p class="lead">Estamos construindo uma ferramenta de verificação eleitoral independente, que reúne dados públicos oficiais — sem opinião, sem viés — para consulta de candidatos e eleitos.</p>
  <div class="fontes">
    <span class="fonte-chip">TSE</span>
    <span class="fonte-chip">Câmara dos Deputados</span>
    <span class="fonte-chip">Senado Federal</span>
  </div>
  <footer>Dados de fontes públicas oficiais, com origem e histórico rastreáveis. &copy; VotoCheck</footer>
</main>
</body>
</html>`;
