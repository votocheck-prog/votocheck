/**
 * VotoCheck — Página HTML de curadoria manual da Dívida Ativa da União (PGFN)
 *
 * Servida em GET /admin/divida-ativa. Espelha o mesmo padrão de curadoria_html.js: página
 * estática autocontida, sem build step, que consome GET /admin/divida-ativa/pendencias e
 * POST /admin/divida-ativa/pendencias/:id/resolver — ambas protegidas pelo mesmo ADMIN_TOKEN
 * das demais rotas admin. O token é pedido uma vez e guardado só em memória (nunca em
 * localStorage), pra não deixar o token salvo no navegador.
 *
 * Por que essa tela existe: os matches gerados por scripts/importar_pgfn.mjs entram no banco
 * com status_id=2 ("a confirmar") e NUNCA aparecem no site público. Antes desta tela, a única
 * forma de revisar e confirmar/descartar um match era rodando SQL manualmente — inviável pro
 * Rodrigo no dia a dia. Esta tela deixa isso visual: lista cada match, mostra o texto completo
 * (nome, cargo, UF, valores, natureza da dívida) e dois botões — "Confirmar" só deve ser clicado
 * depois de checar o CPF completo do candidato via TSE contra o registro da PGFN.
 */
export const DIVIDA_ATIVA_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>VotoCheck — Curadoria de Dívida Ativa (PGFN)</title>
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
  button.perigo { background: var(--error); color: white; border-color: var(--error); }
  button.ghost { background: transparent; border-color: transparent; color: var(--text-muted); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    padding: 20px; margin-bottom: 16px;
  }
  .card-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
  .card-header h3 { margin: 0; font-size: 16px; }
  .card-header .meta { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
  .valor-texto { font-size: 13.5px; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
  .acoes-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .empty { text-align: center; color: var(--text-muted); padding: 48px 0; font-size: 14px; }
  .aviso {
    background: #FBF0E8; border: 1px solid var(--warning); color: var(--warning);
    border-radius: 8px; padding: 12px 16px; font-size: 13.5px; margin-bottom: 20px;
  }
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
  <h2>Curadoria — Dívida Ativa (PGFN)</h2>
  <p style="color:var(--text-muted); font-size:14px;">Informe o ADMIN_TOKEN configurado no Worker para acessar as pendências.</p>
  <input id="tokenInput" type="password" placeholder="ADMIN_TOKEN" autocomplete="off" />
  <button class="primary" id="btnEntrar" style="width:100%;">Entrar</button>
</div>

<div id="app" style="display:none;">
  <header>
    <h1>Curadoria — Dívida Ativa da União (PGFN)</h1>
    <p>Candidatos cujo nome bateu com um registro da Dívida Ativa da União. Nenhum desses dados aparece publicamente até você confirmar.</p>
  </header>
  <main>
    <div class="aviso">
      <strong>Antes de confirmar:</strong> o CPF divulgado pela PGFN vem parcialmente mascarado (LGPD) — o cruzamento abaixo é só por nome completo e pode ser homônimo. Só clique em "Confirmar" depois de checar o CPF completo do candidato via consulta ao TSE contra o registro descrito no card. Se não bater, clique em "Descartar (homônimo)".
    </div>
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
  // O Worker responde 401 com texto puro "Unauthorized" (não é JSON) quando o token está
  // errado/ausente — tentar resp.json() direto nesse caso quebrava com um erro de JS ilegível
  // ("Unexpected token 'U'...") em vez de avisar claramente que o token está errado.
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

function renderPendencia(p) {
  const nome = p.nome_completo || p.nome_urna_atual || '(sem nome)';
  const cpfConferido = String(p.valor || '').indexOf('CPF CONFERIDO AUTOMATICAMENTE') !== -1;
  const badge = cpfConferido
    ? ' <span style="display:inline-block; font-size:11px; font-weight:600; color:var(--success); border:1px solid var(--success); border-radius:4px; padding:1px 6px; vertical-align:middle;">CPF conferido</span>'
    : ' <span style="display:inline-block; font-size:11px; font-weight:600; color:var(--warning); border:1px solid var(--warning); border-radius:4px; padding:1px 6px; vertical-align:middle;">só nome — checar CPF</span>';
  return (
    '<div class="card" data-card="' + p.id + '">' +
      '<div class="card-header">' +
        '<h3>' + escapeHtml(nome) + (p.nome_urna_atual && p.nome_urna_atual !== p.nome_completo ? ' <span style="color:var(--text-muted); font-weight:400;">(urna: ' + escapeHtml(p.nome_urna_atual) + ')</span>' : '') + badge + '</h3>' +
        '<span class="meta">' + escapeHtml(p.cargo_nome || '') + ' · ' + escapeHtml(p.sg_uf || '') + (p.partido_sigla ? ' · ' + escapeHtml(p.partido_sigla) : '') + ' · pessoa_id=' + escapeHtml(p.pessoa_id) + '</span>' +
      '</div>' +
      '<div class="valor-texto">' + escapeHtml(p.valor) + '</div>' +
      '<div class="acoes-row">' +
        '<button data-action="descartar" data-id="' + p.id + '">Descartar (homônimo)</button>' +
        '<button class="primary" data-action="confirmar" data-id="' + p.id + '">Confirmar (já checou o CPF via TSE)</button>' +
      '</div>' +
    '</div>'
  );
}

async function carregarPendencias() {
  const lista = document.getElementById('lista');
  const contagem = document.getElementById('contagem');
  contagem.textContent = 'Carregando…';
  try {
    const json = await chamarApi('/admin/divida-ativa/pendencias');
    if (!json.pendencias.length) {
      lista.innerHTML = '<div class="empty">Nenhuma pendência de dívida ativa no momento.</div>';
    } else {
      lista.innerHTML = json.pendencias.map(renderPendencia).join('');
    }
    contagem.textContent = json.total + ' pendência(s) a confirmar';
  } catch (e) {
    contagem.textContent = 'Erro ao carregar: ' + e.message;
    if (e.message.indexOf('Token incorreto') === 0) {
      // Token errado logo de cara — melhor voltar pro portão de entrada do que deixar a tela
      // "app" travada mostrando erro pra sempre.
      ADMIN_TOKEN = '';
      document.getElementById('app').style.display = 'none';
      document.getElementById('gate').style.display = 'block';
      document.getElementById('tokenInput').value = '';
      document.getElementById('tokenInput').focus();
      mostrarToast('Token incorreto — tente de novo.', 'error');
    }
  }
}

async function resolverPendencia(id, decisao) {
  const card = document.querySelector('[data-card="' + id + '"]');
  const botoes = card ? card.querySelectorAll('button') : [];
  botoes.forEach((b) => (b.disabled = true));
  try {
    await chamarApi('/admin/divida-ativa/pendencias/' + id + '/resolver', {
      method: 'POST',
      body: JSON.stringify({ decisao: decisao, curador: 'painel-web' }),
    });
    mostrarToast(decisao === 'confirmar' ? 'Confirmado — já aparece no perfil público.' : 'Descartado como homônimo.', 'success');
    if (card) card.remove();
    carregarPendencias();
  } catch (e) {
    mostrarToast('Erro: ' + e.message, 'error');
    botoes.forEach((b) => (b.disabled = false));
  }
}

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const acao = btn.getAttribute('data-action');
  if (acao === 'confirmar') {
    if (!confirm('Confirma que já checou o CPF COMPLETO deste candidato via TSE e bate com o registro da PGFN? Isso publica a informação no perfil público.')) return;
    resolverPendencia(id, 'confirmar');
  } else if (acao === 'descartar') {
    if (!confirm('Descartar esta pendência como homônimo? O registro será apagado.')) return;
    resolverPendencia(id, 'descartar');
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
