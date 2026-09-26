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
  return { desde, porDia: porDia.results, unicos: unicos.results, topRotas: topRotas.results, eventos: topEventos.results, origens: origens.results };
}
