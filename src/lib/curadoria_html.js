/**
 * VotoCheck — Página HTML da interface de curadoria manual
 *
 * Servida em GET /admin/curadoria. É uma página estática autocontida (sem build step, sem
 * framework) que consome as rotas JSON GET /admin/curadoria/pendencias e
 * POST /admin/curadoria/pendencias/:id/resolver — ambas protegidas pelo mesmo ADMIN_TOKEN das
 * demais rotas admin. A página pede o token uma vez (prompt) e guarda em memória (não persiste
 * em localStorage, para não deixar o token de administrador salvo no navegador).
 */
export const CURADORIA_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>VotoCheck — Curadoria de cruzamento Senado × TSE</title>
<style>
  :root {
    --bg: #F7F6F2;
    --surface: #F9F8F5;
    --border: #D4D1CA;
    --text: #28251D;
    --text-muted: #7A7974;
    --primary: #01696F;
    --primary-hover: #0C4E54;
    --warning: #964219;
    --success: #437A22;
    --error: #A12C7B;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  header {
    padding: 24px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  header h1 { font-size: 22px; margin: 0 0 4px; }
  header p { margin: 0; color: var(--text-muted); font-size: 14px; }
  main { max-width: 900px; margin: 0 auto; padding: 24px 32px 64px; }
  .status-bar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; font-size: 14px; color: var(--text-muted);
  }
  button {
    font-family: inherit; font-size: 14px; cursor: pointer;
    border-radius: 6px; border: 1px solid var(--border); background: var(--surface);
    color: var(--text); padding: 8px 14px;
  }
  button:hover { border-color: var(--primary); }
  button.primary { background: var(--primary); color: white; border-color: var(--primary); }
  button.primary:hover { background: var(--primary-hover); }
  button.ghost { background: transparent; border-color: transparent; color: var(--text-muted); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    padding: 20px; margin-bottom: 16px;
  }
  .card-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .card-header h3 { margin: 0; font-size: 16px; }
  .card-header .meta { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
  .motivo { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
  .candidatos { display: flex; flex-direction: column; gap: 10px; }
  .candidato {
    border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px;
    display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  }
  .candidato .info b { font-size: 14px; }
  .candidato .info .detalhes { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .badge {
    display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
    background: var(--border); color: var(--text); margin-right: 6px;
  }
  .empty { text-align: center; color: var(--text-muted); padding: 48px 0; font-size: 14px; }
  .rejeitar-row { display: flex; justify-content: flex-end; margin-top: 12px; }
  .toast {
    position: fixed; bottom: 20px; right: 20px; padding: 12px 18px; border-radius: 8px;
    font-size: 14px; color: white; opacity: 0; transition: opacity 0.2s; pointer-events: none;
  }
  .toast.show { opacity: 1; }
  .toast.success { background: var(--success); }
  .toast.error { background: var(--error); }
  .token-gate { max-width: 420px; margin: 80px auto; text-align: center; }
  .token-gate input {
    width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);
    font-size: 14px; margin: 12px 0; font-family: inherit;
  }
</style>
</head>
<body>

<div id="gate" class="token-gate">
  <h2>Curadoria VotoCheck</h2>
  <p style="color:var(--text-muted); font-size:14px;">Informe o ADMIN_TOKEN configurado no Worker para acessar as pendências.</p>
  <input id="tokenInput" type="password" placeholder="ADMIN_TOKEN" autocomplete="off" />
  <button class="primary" id="btnEntrar" style="width:100%;">Entrar</button>
</div>

<div id="app" style="display:none;">
  <header>
    <h1>Curadoria de cruzamento Senado × TSE</h1>
    <p>Pendências em que nome + UF + data de nascimento coincidem com mais de uma candidatura do TSE. Escolha a pessoa correta ou rejeite se nenhuma corresponder.</p>
  </header>
  <main>
    <div class="status-bar">
      <span id="contagem">Carregando…</span>
      <button id="btnAtualizar" class="ghost">Atualizar</button>
    </div>
    <div id="lista"></div>
  </main>
</div>

<div id="toast" class="toast"></div>

<script>
let ADMIN_TOKEN = '';

function mostrarToast(msg, tipo) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (tipo || 'success');
  setTimeout(() => { el.className = 'toast ' + (tipo || 'success'); }, 3200);
}

async function chamarApi(path, options) {
  const resp = await fetch(path, Object.assign({}, options, {
    headers: Object.assign({ 'Authorization': 'Bearer ' + ADMIN_TOKEN, 'Content-Type': 'application/json' }, (options && options.headers) || {}),
  }));
  // Mesmo bug corrigido em divida_ativa_html.js (23/09/2026): 401 vem como texto puro
  // "Unauthorized", não JSON — resp.json() direto quebrava com um erro de JS ilegível.
  if (resp.status === 401) {
    throw new Error('Token incorreto (ou não configurado no Worker). Confira o ADMIN_TOKEN e tente de novo.');
  }
  let json;
  try {
    json = await resp.json();
  } catch (e) {
    throw new Error('Resposta inesperada do servidor (HTTP ' + resp.status + ', não era JSON).');
  }
  if (!resp.ok || json.ok === false) {
    throw new Error(json.error || ('HTTP ' + resp.status));
  }
  return json;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderCandidaturas(candidaturas) {
  if (!candidaturas || !candidaturas.length) return 'Sem candidaturas registradas';
  return candidaturas.map((c) =>
    '<span class="badge">' + escapeHtml(c.cargo_nome || '') + ' ' + escapeHtml(c.ano_eleicao || '') + ' — ' + escapeHtml(c.sg_uf || '') + '</span>'
  ).join(' ');
}

function renderPendencia(p) {
  const senado = p.senado || {};
  const candidatosHtml = (p.candidatos || []).map((c) => (
    '<div class="candidato">' +
      '<div class="info">' +
        '<b>' + escapeHtml(c.nome_completo || c.nome_urna_atual || '(sem nome)') + '</b>' +
        '<div class="detalhes">pessoa_id=' + escapeHtml(c.pessoa_id) + ' · ' + renderCandidaturas(c.candidaturas) + '</div>' +
      '</div>' +
      '<button class="primary" data-action="aceitar" data-historico="' + p.historico_id + '" data-pessoa="' + c.pessoa_id + '">Este é o senador</button>' +
    '</div>'
  )).join('');

  return (
    '<div class="card" data-card="' + p.historico_id + '">' +
      '<div class="card-header">' +
        '<h3>' + escapeHtml(senado.nome_senado || '(nome desconhecido)') + ' · UF ' + escapeHtml(senado.uf || '?') + '</h3>' +
        '<span class="meta">id_senado=' + escapeHtml(senado.id_senado || '?') + ' · nasc. ' + escapeHtml(senado.data_nascimento || '?') + '</span>' +
      '</div>' +
      '<div class="motivo">' + escapeHtml(p.motivo || '') + '</div>' +
      '<div class="candidatos">' + candidatosHtml + '</div>' +
      '<div class="rejeitar-row">' +
        '<button data-action="rejeitar" data-historico="' + p.historico_id + '">Nenhuma corresponde — rejeitar pendência</button>' +
      '</div>' +
    '</div>'
  );
}

async function carregarPendencias() {
  const lista = document.getElementById('lista');
  const contagem = document.getElementById('contagem');
  contagem.textContent = 'Carregando…';
  try {
    const json = await chamarApi('/admin/curadoria/pendencias');
    if (!json.pendencias.length) {
      lista.innerHTML = '<div class="empty">Nenhuma pendência de curadoria no momento.</div>';
    } else {
      lista.innerHTML = json.pendencias.map(renderPendencia).join('');
    }
    contagem.textContent = json.total + ' pendência(s) aberta(s)';
  } catch (e) {
    contagem.textContent = 'Erro ao carregar: ' + e.message;
    if (e.message.indexOf('Token incorreto') === 0) {
      ADMIN_TOKEN = '';
      document.getElementById('app').style.display = 'none';
      document.getElementById('gate').style.display = 'block';
      document.getElementById('tokenInput').value = '';
      document.getElementById('tokenInput').focus();
      mostrarToast('Token incorreto — tente de novo.', 'error');
    }
  }
}

async function resolverPendencia(historicoId, decisao, pessoaDestinoId) {
  const card = document.querySelector('[data-card="' + historicoId + '"]');
  const botoes = card ? card.querySelectorAll('button') : [];
  botoes.forEach((b) => (b.disabled = true));
  try {
    await chamarApi('/admin/curadoria/pendencias/' + historicoId + '/resolver', {
      method: 'POST',
      body: JSON.stringify({ decisao: decisao, pessoaDestinoId: pessoaDestinoId || null, curador: 'painel-web' }),
    });
    mostrarToast(decisao === 'aceitar' ? 'Fusão aplicada com sucesso.' : 'Pendência rejeitada — nenhuma fusão aplicada.', 'success');
    if (card) card.remove();
    carregarPendencias();
  } catch (e) {
    mostrarToast('Erro: ' + e.message, 'error');
    botoes.forEach((b) => (b.disabled = false));
  }
}

document.getElementById('lista') || (function(){})();

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn) return;
  const historicoId = btn.getAttribute('data-historico');
  const acao = btn.getAttribute('data-action');
  if (acao === 'aceitar') {
    const pessoaId = btn.getAttribute('data-pessoa');
    if (!confirm('Confirmar esta pessoa como o senador correto? Isso funde os dois registros e não pode ser desfeito automaticamente.')) return;
    resolverPendencia(historicoId, 'aceitar', pessoaId);
  } else if (acao === 'rejeitar') {
    if (!confirm('Rejeitar esta pendência? O senador continuará como um registro separado da candidatura no TSE.')) return;
    resolverPendencia(historicoId, 'rejeitar', null);
  }
});

document.getElementById('btnAtualizar').addEventListener('click', carregarPendencias);

document.getElementById('btnEntrar').addEventListener('click', () => {
  const val = document.getElementById('tokenInput').value.trim();
  if (!val) return;
  ADMIN_TOKEN = val;
  document.getElementById('gate').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  carregarPendencias();
});
document.getElementById('tokenInput').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') document.getElementById('btnEntrar').click();
});
</script>
</body>
</html>`;
