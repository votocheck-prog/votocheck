/**
 * VotoCheck — medição própria, sem cookie e sem identificador persistente (D14, 26/09/2026).
 *
 * Por que no D1 e não em Web Analytics/Analytics Engine: o token atual da Cloudflare não tem as
 * permissões de RUM/Analytics, e o plano Workers Paid inclui 50 milhões de escritas no D1 por
 * mês — contar visitas aqui cabe com folga e dá números próprios para o mídia kit.
 *
 * O que é gravado:
 *  - metrica_diaria(dia, evento, chave, n): contadores agregados por dia (pageview por rota,
 *    eventos de clique, impressão/clique de anúncio). Nunca um registro por pessoa.
 *  - visitante_dia(dia, h): hash SHA-256 de (IP + user-agent + sal do dia). O sal muda todo dia
 *    e não é guardado, então o hash não pode ser revertido nem ligado entre dias. Serve só para
 *    contar visitantes únicos do dia. Linhas com mais de 35 dias podem ser apagadas.
 */

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse|monitor|uptime/i;

export const SQL_METRICAS = `
CREATE TABLE IF NOT EXISTS metrica_diaria (
  dia TEXT NOT NULL, evento TEXT NOT NULL, chave TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, evento, chave)
);
CREATE TABLE IF NOT EXISTS visitante_dia (
  dia TEXT NOT NULL, h TEXT NOT NULL, PRIMARY KEY (dia, h)
);`;

export function diaSP(d = new Date()) {
  return new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

export function ehBot(request) {
  return BOT_RE.test(request.headers.get('user-agent') || '');
}

/** Normaliza a rota para agregação: /candidato/123 → /candidato, /cargo/x → /cargo/x. */
export function rotaAgregada(pathname) {
  if (pathname.startsWith('/candidato/')) return '/candidato';
  if (pathname.startsWith('/quiz/resultado')) return '/quiz/resultado';
  return pathname.slice(0, 60);
}

export async function contar(env, evento, chave = '', n = 1) {
  if (!env?.DB) return;
  await env.DB.prepare(
    `INSERT INTO metrica_diaria (dia, evento, chave, n) VALUES (?, ?, ?, ?)
     ON CONFLICT(dia, evento, chave) DO UPDATE SET n = n + excluded.n`
  )
    .bind(diaSP(), String(evento).slice(0, 40), String(chave).slice(0, 120), n)
    .run();
}

async function hashVisitante(request) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = request.headers.get('user-agent') || '';
  const dado = new TextEncoder().encode(`${ip}|${ua}|votocheck|${diaSP()}`);
  const dig = await crypto.subtle.digest('SHA-256', dado);
  return [...new Uint8Array(dig)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Registra uma visita de página (chamado com ctx.waitUntil — nunca atrasa a resposta). */
export async function registrarVisita(env, request, pathname) {
  try {
    if (ehBot(request)) return;
    const ref = request.headers.get('referer') || '';
    let origem = 'direto';
    try {
      const u = new URL(url0(request));
      const utm = u.searchParams.get('utm_source');
      if (utm) origem = `utm:${utm}`;
      else if (ref) {
        const h = new URL(ref).hostname.replace(/^www\./, '');
        if (!h.endsWith('votocheck.com.br')) origem = h;
        else origem = 'interno';
      }
    } catch {}
    const h = await hashVisitante(request);
    await Promise.all([
      contar(env, 'pageview', rotaAgregada(pathname)),
      origem !== 'interno' ? contar(env, 'origem', origem) : null,
      env.DB.prepare(`INSERT OR IGNORE INTO visitante_dia (dia, h) VALUES (?, ?)`).bind(diaSP(), h).run(),
    ]);
  } catch (e) {
    console.error('registrarVisita falhou:', e?.message || e);
  }
}
function url0(request) {
  return request.url;
}

const EVENTOS_PERMITIDOS = new Set([
  'seguir', 'compartilhar', 'copiar', 'urna', 'uf', 'cta_home', 'pub_impressao', 'apoio_empresa',
  'cola_add', 'cola_imprimir', 'cola_compartilhar', 'quiz_inicio', 'quiz_fim', 'quiz_compartilhar', 'ficha_acao',
  // 27/09/2026 — card de compartilhamento da cola (ver lib/cola_html.js).
  'cola_card_gerado', 'cola_card_compartilhar',
]);

/** POST /e — eventos do navegador (sendBeacon). Aceita só nomes conhecidos. */
export async function registrarEvento(env, request) {
  try {
    if (ehBot(request)) return new Response(null, { status: 204 });
    const txt = await request.text();
    if (txt.length > 600) return new Response(null, { status: 204 });
    const j = JSON.parse(txt || '{}');
    if (!EVENTOS_PERMITIDOS.has(j.e)) return new Response(null, { status: 204 });
    await contar(env, j.e, j.k || '');
  } catch {}
  return new Response(null, { status: 204 });
}

/** Painel simples /admin/metricas (JSON + HTML mínimo). */
export async function resumoMetricas(env, dias = 14) {
  const desde = diaSP(new Date(Date.now() - dias * 86400000));
  const [porDia, unicos, topRotas, topEventos, origens] = await Promise.all([
    env.DB.prepare(`SELECT dia, SUM(n) as pageviews FROM metrica_diaria WHERE evento='pageview' AND dia >= ? GROUP BY dia ORDER BY dia`).bind(desde).all(),
    env.DB.prepare(`SELECT dia, COUNT(*) as visitantes FROM visitante_dia WHERE dia >= ? GROUP BY dia ORDER BY dia`).bind(desde).all(),
    env.DB.prepare(`SELECT chave, SUM(n) as n FROM metrica_diaria WHERE evento='pageview' AND dia >= ? GROUP BY chave ORDER BY n DESC LIMIT 20`).bind(desde).all(),
    env.DB.prepare(`SELECT evento, chave, SUM(n) as n FROM metrica_diaria WHERE evento NOT IN ('pageview','origem') AND dia >= ? GROUP BY evento, chave ORDER BY n DESC LIMIT 60`).bind(desde).all(),
    env.DB.prepare(`SELECT chave, SUM(n) as n FROM metrica_diaria WHERE evento='origem' AND dia >= ? GROUP BY chave ORDER BY n DESC LIMIT 20`).bind(desde).all(),
  ]);
  return { desde, dias, porDia: porDia.results, unicos: unicos.results, topRotas: topRotas.results, eventos: topEventos.results, origens: origens.results };
}

function escapeHtmlM(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function barrasHtml(linhas, chaveVal) {
  const max = Math.max(1, ...linhas.map((l) => l[chaveVal] || 0));
  return linhas
    .map((l) => {
      const v = l[chaveVal] || 0;
      const pct = Math.round((v / max) * 100);
      return `<div class="mx-barra"><span class="mx-barra-rotulo">${escapeHtmlM(l.dia)}</span><div class="mx-barra-trilho"><i style="width:${pct}%"></i></div><b>${v.toLocaleString('pt-BR')}</b></div>`;
    })
    .join('');
}

/**
 * Painel HTML de /admin/metricas (27/09/2026, pedido do Rodrigo — ver pendência 0.1 do
 * documento de continuidade). NÃO é um funil de sessão de verdade (não guardamos a sequência de
 * páginas de cada visitante — ver aviso no rodapé da própria página); é o melhor "de onde vem,
 * por onde passa, onde abandona" que dá pra montar com os contadores agregados que já existem
 * (`metrica_diaria`/`visitante_dia`), sem schema novo. Os dois mini-funis (Quiz e Cola) usam
 * pares de eventos que já são registrados no clique: quiz_inicio→quiz_fim, cola_add→
 * cola_imprimir/cola_compartilhar/cola_card_gerado.
 */
export function renderPainelMetricas({ desde, dias, porDia, unicos, topRotas, eventos, origens, token }) {
  const totalPageviews = porDia.reduce((a, r) => a + (r.pageviews || 0), 0);
  const totalVisitantes = unicos.reduce((a, r) => a + (r.visitantes || 0), 0);

  const porEvento = {};
  for (const e of eventos) porEvento[e.evento] = (porEvento[e.evento] || 0) + e.n;
  const pct = (num, den) => (den > 0 ? `${Math.round((num / den) * 100)}%` : '—');

  const funilQuiz = [
    { rotulo: 'Começou o Meu VotoCheck', n: porEvento.quiz_inicio || 0 },
    { rotulo: 'Terminou e viu resultado', n: porEvento.quiz_fim || 0, taxa: pct(porEvento.quiz_fim || 0, porEvento.quiz_inicio || 0) },
    { rotulo: 'Compartilhou o resultado', n: porEvento.quiz_compartilhar || 0, taxa: pct(porEvento.quiz_compartilhar || 0, porEvento.quiz_inicio || 0) },
  ];
  const funilCola = [
    { rotulo: 'Adicionou candidato à cola', n: porEvento.cola_add || 0 },
    { rotulo: 'Imprimiu / salvou em PDF', n: porEvento.cola_imprimir || 0, taxa: pct(porEvento.cola_imprimir || 0, porEvento.cola_add || 0) },
    { rotulo: 'Gerou card de compartilhamento', n: porEvento.cola_card_gerado || 0, taxa: pct(porEvento.cola_card_gerado || 0, porEvento.cola_add || 0) },
    { rotulo: 'Convidou alguém (WhatsApp)', n: porEvento.cola_compartilhar || 0, taxa: pct(porEvento.cola_compartilhar || 0, porEvento.cola_add || 0) },
  ];

  const funilHtml = (titulo, linhas) => `
    <div class="mx-funil">
      <h3>${titulo}</h3>
      ${linhas
        .map(
          (l, i) => `<div class="mx-funil-etapa">
            <span class="mx-funil-n">${i + 1}</span>
            <div class="mx-funil-corpo"><span>${escapeHtmlM(l.rotulo)}</span><b>${Number(l.n).toLocaleString('pt-BR')}</b></div>
            ${l.taxa ? `<span class="mx-funil-taxa" title="Sobre o passo anterior do funil">${l.taxa}</span>` : ''}
          </div>`
        )
        .join('')}
    </div>`;

  const tabelaHtml = (linhas, colChave, tituloCol) =>
    linhas.length
      ? `<table class="mx-tabela"><thead><tr><th>${tituloCol}</th><th style="text-align:right">Total</th></tr></thead><tbody>${linhas
          .map((l) => `<tr><td>${escapeHtmlM(l[colChave])}</td><td style="text-align:right">${Number(l.n).toLocaleString('pt-BR')}</td></tr>`)
          .join('')}</tbody></table>`
      : '<p class="mx-vazio">Sem dados no período.</p>';

  const linkPeriodo = (d) => `?t=${encodeURIComponent(token || '')}&dias=${d}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>VotoCheck — Acessos e funis</title>
<style>
  :root { --bg:#F7F6F2; --surface:#fff; --border:#D4D1CA; --text:#28251D; --text-muted:#7A7974; --primary:#0059F5; --teal:#00B495; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
  header { padding:24px 32px; border-bottom:1px solid var(--border); background:var(--surface); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  header h1 { font-size:20px; margin:0 0 4px; }
  header p { margin:0; color:var(--text-muted); font-size:13.5px; }
  .mx-periodos a { font-size:13px; font-weight:600; text-decoration:none; color:var(--text-muted); border:1px solid var(--border); border-radius:999px; padding:6px 12px; margin-left:6px; }
  .mx-periodos a.ativo { background:var(--primary); color:#fff; border-color:var(--primary); }
  main { max-width:980px; margin:0 auto; padding:24px 32px 64px; display:grid; gap:22px; }
  .mx-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
  .mx-kpi { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 18px; }
  .mx-kpi span { font-size:12.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
  .mx-kpi b { display:block; font-size:28px; margin-top:4px; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px 22px; }
  .card h2 { font-size:16px; margin:0 0 14px; }
  .mx-barra { display:grid; grid-template-columns:78px 1fr 56px; gap:10px; align-items:center; font-size:12.5px; margin:6px 0; }
  .mx-barra-rotulo { color:var(--text-muted); }
  .mx-barra-trilho { height:9px; border-radius:999px; background:#EDEBE4; overflow:hidden; }
  .mx-barra-trilho i { display:block; height:100%; background:var(--primary); border-radius:999px; }
  .mx-barra b { text-align:right; font-variant-numeric:tabular-nums; }
  .mx-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  @media (max-width:760px) { .mx-grid2 { grid-template-columns:1fr; } }
  .mx-tabela { width:100%; border-collapse:collapse; font-size:13.5px; }
  .mx-tabela th { text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); padding:4px 6px 8px; border-bottom:1px solid var(--border); }
  .mx-tabela td { padding:7px 6px; border-bottom:1px solid #EDEBE4; }
  .mx-vazio { color:var(--text-muted); font-size:13.5px; }
  .mx-funil { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px 20px; }
  .mx-funil h3 { font-size:14.5px; margin:0 0 12px; }
  .mx-funil-etapa { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px dashed #E5E2D9; }
  .mx-funil-etapa:last-child { border-bottom:0; }
  .mx-funil-n { width:22px; height:22px; border-radius:50%; background:var(--primary); color:#fff; font-size:11.5px; font-weight:700; display:grid; place-items:center; flex:none; }
  .mx-funil-corpo { flex:1; display:flex; justify-content:space-between; gap:10px; font-size:13.5px; }
  .mx-funil-corpo b { font-variant-numeric:tabular-nums; }
  .mx-funil-taxa { font-size:12px; font-weight:700; color:var(--teal); background:#E3F7F1; border-radius:999px; padding:2px 9px; flex:none; }
  .mx-aviso { font-size:12.5px; color:var(--text-muted); background:#FFF8EB; border:1px solid #F1DDB4; border-radius:10px; padding:12px 14px; }
  .mx-aviso a { color:inherit; }
</style>
</head>
<body>
<header>
  <div>
    <h1>Acessos e funis — VotoCheck</h1>
    <p>Desde ${escapeHtmlM(desde)} · medição própria, sem cookie de terceiro</p>
  </div>
  <nav class="mx-periodos">
    <a href="${linkPeriodo(7)}" class="${dias === 7 ? 'ativo' : ''}">7 dias</a>
    <a href="${linkPeriodo(14)}" class="${dias === 14 ? 'ativo' : ''}">14 dias</a>
    <a href="${linkPeriodo(30)}" class="${dias === 30 ? 'ativo' : ''}">30 dias</a>
  </nav>
</header>
<main>
  <div class="mx-kpis">
    <div class="mx-kpi"><span>Pageviews no período</span><b>${totalPageviews.toLocaleString('pt-BR')}</b></div>
    <div class="mx-kpi"><span>Visitantes únicos (soma diária)</span><b>${totalVisitantes.toLocaleString('pt-BR')}</b></div>
    <div class="mx-kpi"><span>Iniciou o Meu VotoCheck</span><b>${(porEvento.quiz_inicio || 0).toLocaleString('pt-BR')}</b></div>
    <div class="mx-kpi"><span>Cliques em "Anunciar/apoiar"</span><b>${(porEvento.apoio_empresa || 0).toLocaleString('pt-BR')}</b></div>
  </div>

  <div class="card">
    <h2>Pageviews por dia</h2>
    ${porDia.length ? barrasHtml(porDia, 'pageviews') : '<p class="mx-vazio">Sem dados no período.</p>'}
  </div>
  <div class="card">
    <h2>Visitantes únicos por dia</h2>
    ${unicos.length ? barrasHtml(unicos, 'visitantes') : '<p class="mx-vazio">Sem dados no período.</p>'}
  </div>

  <div class="mx-grid2">
    <div class="card">
      <h2>De onde vem (origem/referência)</h2>
      ${tabelaHtml(origens, 'chave', 'Origem')}
    </div>
    <div class="card">
      <h2>Por onde mais passa (páginas mais vistas)</h2>
      ${tabelaHtml(topRotas, 'chave', 'Página')}
    </div>
  </div>

  <div class="mx-grid2">
    ${funilHtml('Funil · Meu VotoCheck (quiz)', funilQuiz)}
    ${funilHtml('Funil · Cola eleitoral', funilCola)}
  </div>

  <div class="mx-aviso">
    Isto conta cliques e páginas vistas, agregados por dia — não é um funil de sessão de verdade
    (não sabemos a sequência exata de páginas de uma mesma pessoa, só o que ela clicou, em algum
    momento, naquele dia). Os dois funis acima são a aproximação possível com o que já é
    registrado hoje: pares de eventos do início e do fim de um fluxo. Uma visão por sessão (com
    entrada, caminho e ponto de abandono) está pendente — ver item 0.1 do documento de
    continuidade. <a href="?t=${encodeURIComponent(token || '')}&dias=${dias}&formato=json">Ver JSON cru</a>.
  </div>
</main>
</body>
</html>`;
}
