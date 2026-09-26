/**
 * VotoCheck — Worker principal
 *
 * Rotas HTTP (para disparo manual/teste — protegidas por ADMIN_TOKEN quando configurado):
 *   GET  /                                     → homepage pública (busca de candidato + estatísticas)
 *   GET  /buscar?q=&cargo=&uf=&ordenar=&pagina= → resultados de busca (pública)
 *   GET  /candidato/:pessoaId                   → perfil público do candidato/representante
 *   POST /acompanhar                            → captura de "Monitore" + e-mail de confirmação via Resend (Fase 2)
 *   GET  /acompanhar/cancelar?token=            → cancela um acompanhamento pelo token
 *   GET  /sobre                                 → página institucional (pública)
 *   GET  /termos                                → termos e condições (pública)
 *   GET  /faq                                   → perguntas frequentes (pública)
 *   GET  /judiciario                            → guia institucional do Judiciário (pública)
 *   GET  /partidos                              → guia de partidos políticos (pública)
 *   GET  /cargo/:slug                           → guia completo de um cargo eletivo, incl. municipais (pública)
 *   GET  /robots.txt, /sitemap.xml              → SEO (público)
 *   GET  /favicon.ico, /apple-touch-icon.png, /og-image.png → assets de marca (público)
 *   GET  /healthcheck                          → healthcheck JSON (pública)
 *   POST /admin/coletar/tse-candidatos          → coleta candidatos TSE (?ano=2026)
 *   POST /admin/coletar/tse-redes-sociais       → coleta redes sociais dos candidatos (?ano=2026)
 *   POST /admin/coletar/tse-bens                → coleta bens declarados (?ano=2026)
 *   POST /admin/coletar/camara-deputados        → sincroniza deputados em exercício (?idLegislatura=57)
 *   POST /admin/coletar/camara-proposicoes      → coleta proposições (?ano=2026)
 *   POST /admin/coletar/camara-votacoes         → coleta votações em Plenário (?dataInicio=&dataFim=)
 *   POST /admin/coletar/senado-senadores        → sincroniza senadores em exercício
 *   POST /admin/coletar/senado-votacoes         → coleta votações nominais do Senado
 *   POST /admin/coletar/senado-cruzamento-tse   → cruza senadores com candidaturas do TSE (nome+UF+data nasc.)
 *   GET  /admin/execucoes                       → lista últimas execuções de coletores
 *   GET  /admin/curadoria                       → painel web para resolver pendências de cruzamento
 *   GET  /admin/curadoria/pendencias             → lista pendências (JSON)
 *   POST /admin/curadoria/pendencias/:id/resolver → aplica decisão do curador (JSON)
 *   GET  /admin/divida-ativa                     → painel web pra confirmar/descartar matches da PGFN (ver scripts/importar_pgfn.mjs)
 *   GET  /admin/divida-ativa/pendencias          → lista matches "a confirmar" (JSON)
 *   POST /admin/divida-ativa/pendencias/:id/resolver → confirma ou descarta um match (JSON)
 *
 * Cron Trigger (config em wrangler.toml):
 *   Dispara automaticamente os coletores no(s) horário(s) configurado(s). Ver scheduled() abaixo
 *   para a lógica de qual coletor roda em qual disparo.
 */

import { coletarCandidatos, coletarRedesSociais } from './collectors/tse_candidatos.js';
import { coletarBensCandidatos } from './collectors/tse_bens.js';
import { coletarDeputados, coletarProposicoes, coletarVotacoes } from './collectors/camara.js';
import { coletarSenadores, coletarVotacoesSenado, cruzarSenadoresComTse } from './collectors/senado.js';
import { listarPendencias, resolverPendencia } from './lib/curadoria.js';
import { CURADORIA_HTML } from './lib/curadoria_html.js';
import { listarPendenciasDividaAtiva, resolverPendenciaDividaAtiva } from './lib/divida_ativa.js';
import { DIVIDA_ATIVA_HTML } from './lib/divida_ativa_html.js';
import { processarClippingsMensais } from './lib/clipping_mensal.js';
import { emailClippingMensal } from './lib/acompanhamento_email.js';
import { renderHomepage, renderResultados } from './lib/busca_html.js';
import { renderPerfil, renderNaoEncontrado } from './lib/perfil_html.js';
import { renderSobre } from './lib/sobre_html.js';
import { renderCargoPagina, GUIA_CARGOS } from './lib/cargos_guia.js';
import { renderTermos, renderFaq } from './lib/institucional_html.js';
import { renderPartidos, PARTIDOS_INFO, zonaPrincipal, siglaSlug } from './lib/partidos_html.js';
import { LOGOS_PARTIDOS, LOGOS_COMMONS, urlCommons } from './lib/partidos_logos.js';
import { renderJudiciario } from './lib/judiciario_html.js';
import { calcularSelos } from './lib/selos.js';
import { renderQuizEscolhaCargo, renderQuiz, renderQuizResultado, cargoQuizPorSlug } from './lib/quiz_html.js';
import { PERGUNTAS, ESPECTRO, PARAMETROS_QUIZ, avaliarCandidato, resumoResposta } from './lib/quiz_config.js';
import { RUBRICA_CURTA } from './lib/quiz_html.js';
import { criarAcompanhamento, cancelarPorToken } from './lib/acompanhamento.js';
import { emailConfirmacaoAcompanhamento } from './lib/acompanhamento_email.js';
import { enviarEmail } from './lib/email.js';
import { render404, pagina, SITE_URL } from './lib/estilo_html.js';
import { FAVICON_32_B64, FAVICON_180_B64, OG_IMAGE_B64 } from './lib/assets_data.js';
import { LOGO_H_B64, LOGO_H_BRANCO_B64, ICONE_B64 } from './lib/marca_assets.js';
import { LOGOS_ANUNCIANTES } from './lib/anunciantes_logos.js';
import { PIX_QR_B64 } from './lib/jornada_html.js';
import { renderHomeV2, UF_NOMES } from './lib/home_html.js';
import { renderCola } from './lib/cola_html.js';
import { registrarVisita, registrarEvento, contar, resumoMetricas } from './lib/metricas.js';
import { urlDestinoAnunciante } from './lib/publicidade.js';
import { renderPauta, lerPauta, decidirPeca, servirArquivoSocial, dataSP } from './lib/pauta.js';

const ANO_ATUAL = 2026;
const html = (body) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const html404 = (body) => new Response(body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

/** Decodifica um PNG embutido em base64 (ver src/lib/assets_data.js) pra servir como Response binária. */
function imagemPng(base64, { cacheSegundos = 86400 } = {}) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${cacheSegundos}` },
  });
}

function requireAdminToken(request, env) {
  if (!env.ADMIN_TOKEN) return true; // sem token configurado = sem proteção (apenas dev local)
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

/** Formata uma data JS como YYYY-MM-DD (fuso UTC, suficiente para janelas de coleta diária). */
function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// Chave de cache sintética — não corresponde a uma rota real, só identifica esse dado no
// Cache API do Workers (por colo/edge, não é um KV global, mas já corta a esmagadora maioria
// das leituras repetidas no D1 vindas de visitas na homepage).
const CACHE_KEY_STATS_HOMEPAGE = new Request('https://cache.interno.votocheck/homepage-stats');
const TTL_CACHE_STATS_SEGUNDOS = 600; // 10 min — homepage não precisa de número em tempo real

/**
 * Estatísticas da homepage (totais + cobertura por cargo), com cache de 10 min via Cache API
 * do Workers. Adicionado em 20/09/2026: essas 2 consultas (uma delas com COUNT(*) sobre
 * `candidatura`/`pessoa`, e um GROUP BY por cargo) rodavam a CADA visita na homepage — a
 * página de maior tráfego do site — e são a principal suspeita de consumo de cota de LEITURA
 * do D1 vinda de tráfego real (ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seções 11 e 16).
 * Isso não elimina o teto do free tier, mas reduz esse consumo de "1 leitura pesada por
 * visita" para "1 a cada 10 min por região da Cloudflare", o que é uma redução grande sem
 * custo. Não decide sozinho fazer/adiar o upgrade do D1 — só reduz a pressão enquanto isso é
 * decidido.
 */
async function estatisticasHomepageComCache(env, ctx) {
  const cache = caches.default;
  const cacheado = await cache.match(CACHE_KEY_STATS_HOMEPAGE);
  if (cacheado) return cacheado.json();

  const db = env.DB;
  const [totais, ultimaExecucao, porCargoRes] = await Promise.all([
    db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM candidatura WHERE ano_eleicao = ?) as candidaturas,
                (SELECT COUNT(*) FROM pessoa) as pessoas`
      )
      .bind(ANO_ATUAL)
      .first(),
    db
      .prepare(`SELECT finalizado_em FROM execucao_coletor WHERE status != 'em_execucao' ORDER BY finalizado_em DESC LIMIT 1`)
      .first(),
    db
      .prepare(
        `SELECT ca.slug, ca.nome, COUNT(*) as qtd
         FROM candidatura c JOIN cargo ca ON ca.id = c.cargo_id
         WHERE c.ano_eleicao = ?
         GROUP BY ca.id
         ORDER BY ca.abrangencia, ca.nome`
      )
      .bind(ANO_ATUAL)
      .all(),
  ]);

  const resultado = {
    totalCandidaturas: totais?.candidaturas || 0,
    totalPessoas: totais?.pessoas || 0,
    atualizadoEm: ultimaExecucao?.finalizado_em || null,
    porCargo: porCargoRes?.results || [],
  };

  const resposta = new Response(JSON.stringify(resultado), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` },
  });
  ctx.waitUntil(cache.put(CACHE_KEY_STATS_HOMEPAGE, resposta));

  return resultado;
}

// Mesmo padrão de cache de 10 min da homepage (ver `estatisticasHomepageComCache`) — essa
// consulta usa uma window function (ROW_NUMBER) sobre `candidatura` inteira pra pegar até 10
// candidaturas por partido, o que não é barato, então não deve rodar a cada visita da página
// de partidos. Nunca foi testada contra o D1 de produção (cota travada nesta sessão — ver
// CONTINUIDADE_INFRA_UPDATE_2026-09-18.md seção 19); testada só localmente com dados simulados.
const CACHE_KEY_PARTIDOS = new Request('https://cache.interno.votocheck/partidos-representantes');

/**
 * Pra cada sigla em PARTIDOS_INFO, busca até 10 candidaturas de 2026, ordenadas por hierarquia
 * de cargo (maior cargo primeiro — mesma ordem institucional de `cargo`/`cargos_guia.js`:
 * presidente > governador > senador > dep. federal > dep. estadual > dep. distrital) e, dentro
 * do mesmo cargo, por nome (critério neutro pra desempate — nunca "principais" no sentido de
 * mérito, ver nota em partidos_html.js). ATUALIZADO 23/09/2026 a pedido do Rodrigo: antes a
 * ordem era só alfabética; ele pediu explicitamente que "os principais representantes do
 * partido devem vir de hierarquia política".
 * Retorna um objeto { [sigla]: [{pessoa_id, nome_urna_atual, cargo_nome, sg_uf}, ...] }.
 */
async function carregarRepresentantesPorPartido(env, ctx) {
  const cache = caches.default;
  const cacheado = await cache.match(CACHE_KEY_PARTIDOS);
  if (cacheado) return cacheado.json();

  const db = env.DB;
  // 27/09/2026: liga pelo NÚMERO do partido (oficial do TSE), não pela sigla — a sigla em
  // PARTIDOS_INFO ("Republicanos", "Novo", "Podemos", "União Brasil") não bate com a do TSE
  // ("REPUBLICANOS", "NOVO", "PODE", "UNIÃO"), e vários partidos apareciam "sem candidaturas".
  const numeros = PARTIDOS_INFO.map((p) => p.numero);
  const siglaPorNumero = Object.fromEntries(PARTIDOS_INFO.map((p) => [p.numero, p.sigla]));
  const placeholders = numeros.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT pessoa_id, nome_urna_atual, cargo_nome, sg_uf, numero FROM (
         SELECT c.pessoa_id, p.nome_urna_atual, ca.nome as cargo_nome, c.sg_uf, pa.numero,
                ROW_NUMBER() OVER (PARTITION BY pa.numero ORDER BY ca.id ASC, p.nome_urna_atual ASC) as rn
         FROM candidatura c
         JOIN pessoa p ON p.id = c.pessoa_id
         JOIN cargo ca ON ca.id = c.cargo_id
         JOIN partido pa ON pa.id = c.partido_id
         WHERE c.ano_eleicao = ? AND pa.numero IN (${placeholders})
       ) WHERE rn <= 10
       ORDER BY numero, rn`
    )
    .bind(ANO_ATUAL, ...numeros)
    .all();

  const porSigla = {};
  for (const row of results || []) {
    const sigla = siglaPorNumero[row.numero];
    if (!sigla) continue;
    if (!porSigla[sigla]) porSigla[sigla] = [];
    porSigla[sigla].push(row);
  }

  const resposta = new Response(JSON.stringify(porSigla), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` },
  });
  ctx.waitUntil(cache.put(CACHE_KEY_PARTIDOS, resposta));

  return porSigla;
}

// Adicionado 23/09/2026 a pedido do Rodrigo — ver rationale completo (critério de hierarquia,
// lacuna de ministro/prefeito/vereador não cobertos pelo schema atual) no cabeçalho de
// partidos_html.js. Nunca testada contra D1 de produção nesta sessão (cota travada) — só
// localmente com dados simulados.
const CACHE_KEY_LIDERANCA_CARGO = new Request('https://cache.interno.votocheck/partidos-lideranca-cargo');

/**
 * Pra cada sigla em PARTIDOS_INFO, encontra — entre os FILIADOS ATUAIS do partido
 * (`filiacao_partidaria.data_fim IS NULL`, não `candidatura`) — quem ocupa hoje
 * (`mandato.data_fim IS NULL`) o cargo de maior hierarquia institucional (presidente > governador
 * > senador > dep. federal > dep. estadual > dep. distrital, mesma ordem de `cargo.id`).
 * Retorna um objeto { [sigla]: {pessoa_id, nome_urna_atual, cargo_nome, sg_uf} }, com a sigla
 * ausente quando nenhum filiado atual tem mandato ativo num dos 6 cargos cobertos.
 */
async function carregarLiderancaPorCargoPorPartido(env, ctx) {
  const cache = caches.default;
  const cacheado = await cache.match(CACHE_KEY_LIDERANCA_CARGO);
  if (cacheado) return cacheado.json();

  const db = env.DB;
  // Mesmo ajuste de 27/09/2026: liga pelo número do partido, não pela sigla (ver acima).
  const siglaPorNumero = Object.fromEntries(PARTIDOS_INFO.map((p) => [p.numero, p.sigla]));
  const siglasTse = await db.prepare(`SELECT sigla, numero FROM partido WHERE numero IS NOT NULL`).all();
  const siglas = (siglasTse.results || []).filter((r) => siglaPorNumero[r.numero]).map((r) => r.sigla);
  const infoPorSiglaTse = Object.fromEntries((siglasTse.results || []).map((r) => [r.sigla, siglaPorNumero[r.numero]]));
  const placeholders = siglas.map(() => '?').join(',') || "''";
  const { results } = await db
    .prepare(
      `SELECT pessoa_id, nome_urna_atual, cargo_nome, sg_uf, sigla FROM (
         SELECT p.id as pessoa_id, p.nome_urna_atual, ca.nome as cargo_nome, m.sg_uf, pa.sigla,
                ROW_NUMBER() OVER (PARTITION BY pa.sigla ORDER BY ca.id ASC, m.data_inicio DESC) as rn
         FROM filiacao_partidaria fp
         JOIN pessoa p ON p.id = fp.pessoa_id
         JOIN mandato m ON m.pessoa_id = p.id AND m.data_fim IS NULL
         JOIN cargo ca ON ca.id = m.cargo_id
         JOIN partido pa ON pa.id = fp.partido_id
         WHERE fp.data_fim IS NULL AND pa.sigla IN (${placeholders})
       ) WHERE rn = 1`
    )
    .bind(...siglas)
    .all();

  const porSigla = {};
  for (const row of results || []) {
    const sigla = infoPorSiglaTse[row.sigla] || row.sigla;
    porSigla[sigla] = row;
  }

  const resposta = new Response(JSON.stringify(porSigla), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` },
  });
  ctx.waitUntil(cache.put(CACHE_KEY_LIDERANCA_CARGO, resposta));

  return porSigla;
}

/**
 * Data/hora da última coleta bem-sucedida — usada como "versão dos dados" pra invalidar caches
 * automaticamente (ver `buscarComCache` abaixo), em vez de depender de um calendário fixo de
 * atualização. Leitura barata: tabela pequena (uma linha por execução de coletor, não por
 * candidato), com LIMIT 1 ORDER BY.
 */
async function obterVersaoDados(env) {
  const row = await env.DB
    .prepare(`SELECT finalizado_em FROM execucao_coletor WHERE status != 'em_execucao' ORDER BY finalizado_em DESC LIMIT 1`)
    .first();
  return row?.finalizado_em || 'sem-execucao';
}

/**
 * Cache de `/buscar` com invalidação automática por versão dos dados (23/09/2026 — ver
 * CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 24). Antes, cada visita rodava um `COUNT(*)`
 * com JOIN de 4 tabelas sem NENHUM cache — incluindo as variantes sem filtro que estão no
 * sitemap.xml — e foi identificado como o principal suspeito de estourar a cota diária de
 * leitura do D1.
 *
 * A chave do cache inclui a querystring inteira (q/cargo/uf/ordenar/pagina — cada combinação
 * tem seu próprio cache) MAIS a "versão dos dados" de `obterVersaoDados`. Isso significa: o
 * TTL de 6 dias abaixo é só uma rede de segurança (caso a versão nunca mude por algum motivo);
 * o mecanismo real de atualização é automático — assim que uma coleta nova terminar (ex.:
 * resultado do 1º turno em 04/10, ou uma correção de candidatura indeferida), a versão muda e
 * TODAS as buscas em cache viram obsoletas na hora, sem precisar de calendário fixo nem de
 * purga manual. Rodrigo só precisa continuar rodando as coletas quando fizer sentido — o cache
 * reage sozinho.
 */
const TTL_CACHE_BUSCA_SEGUNDOS = 6 * 24 * 3600; // 6 dias — rede de segurança, não o mecanismo principal (ver acima)

async function buscarComCache(env, ctx, { queryString, buscar }) {
  const versao = await obterVersaoDados(env);
  const chave = new Request(
    `https://cache.interno.votocheck/buscar${queryString}${queryString.includes('?') ? '&' : '?'}_v=${encodeURIComponent(versao)}`
  );
  const cache = caches.default;
  const cacheado = await cache.match(chave);
  if (cacheado) return cacheado.json();

  const resultado = await buscar();

  const resposta = new Response(JSON.stringify(resultado), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL_CACHE_BUSCA_SEGUNDOS}` },
  });
  ctx.waitUntil(cache.put(chave, resposta));

  return resultado;
}

/** TSE usa um vocabulário fechado de grau de instrução — mapeia pra "tem formação superior
 *  completa (ou maior)?" (true/false) ou null quando o texto não bate com nenhuma categoria
 *  conhecida (nunca adivinha). Ver pergunta 6 do quiz, src/lib/quiz_config.js. */
function temFormacaoSuperior(grauInstrucao) {
  if (!grauInstrucao) return null;
  const g = grauInstrucao
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  if (g.includes('SUPERIOR COMPLETO') || g.includes('POS-GRADUA') || g.includes('MESTRADO') || g.includes('DOUTORADO')) return true;
  if (
    g.includes('SUPERIOR INCOMPLETO') ||
    g.includes('MEDIO') ||
    g.includes('FUNDAMENTAL') ||
    g.includes('ANALFABETO') ||
    g.includes('LE E ESCREVE')
  ) {
    return false;
  }
  return null;
}

const CACHE_KEY_QUIZ_PREFIX = 'https://cache.interno.votocheck/quiz-resultado-v3';

/**
 * GET /quiz/resultado — calcula, dentro do recorte de cargo (+UF), quais candidatos "combinam"
 * (bateram com TODOS os critérios que o usuário respondeu) e quais divergem em pelo menos um,
 * junto com o "seu perfil de eleitor". Nunca grava nada no banco (ver nota no topo de
 * quiz_html.js) — só lê, com o mesmo padrão de cache versionado já usado em /buscar e /partidos
 * (ver `obterVersaoDados`/`buscarComCache` acima), pra não bater na cota de leitura do D1 à toa
 * quando o mesmo link de resultado for reaberto.
 */
async function rotaQuizResultado(url, env, ctx) {
  const cargoSlug = (url.searchParams.get('cargo') || '').trim();
  const cargoInfo = cargoQuizPorSlug(cargoSlug);
  const ufParam = (url.searchParams.get('uf') || '').trim().toUpperCase();
  if (!cargoInfo || (!cargoInfo.semUf && !ufParam)) {
    return Response.redirect(new URL('/quiz', url.origin).toString(), 302);
  }
  const uf = cargoInfo.semUf ? 'BR' : ufParam;

  // Respostas efetivamente dadas (perguntas "tanto faz"/não tocadas não chegam à querystring —
  // ver quiz_html.js: o campo hidden só recebe valor quando o usuário toca no card/slider).
  const respostas = {};
  for (const p of PARAMETROS_QUIZ) {
    const v = url.searchParams.get(p.slug);
    if (v !== null && v !== '') {
      respostas[p.slug] = p.tipo === 'escala' || p.tipo === 'espectro' ? Number(v) : v;
    }
  }

  // Filtro de partido: "tudo marcado" ou "tudo desmarcado" contam como NENHUM filtro (ver
  // decisão registrada em quiz_html.js/filtroPartidos) — só filtra de verdade quando o usuário
  // deixou uma seleção parcial.
  const totalPartidosConhecidos = Number(url.searchParams.get('partidos_total')) || PARTIDOS_INFO.length;
  const siglasMarcadas = PARTIDOS_INFO.filter((p) => url.searchParams.get(`partido_${p.sigla}`) === '1').map((p) => p.sigla);
  const filtroPartidoAtivo = siglasMarcadas.length > 0 && siglasMarcadas.length < totalPartidosConhecidos;

  const cargoRow = await env.DB.prepare(`SELECT id, nome FROM cargo WHERE slug = ?`).bind(cargoSlug).first();
  if (!cargoRow) return html404(render404(url.pathname));

  const precisaTrocaPartido = 'trocou_de_partido' in respostas;
  const precisaDividaAtiva = 'divida_ativa_uniao_confirmada' in respostas;
  const precisaAlinhamento = 'alinhamento_bancada' in respostas;

  const colunasExtra = [
    precisaTrocaPartido
      ? `(SELECT COUNT(*) FROM filiacao_partidaria fp WHERE fp.pessoa_id = c.pessoa_id) > 1 as trocou_partido`
      : null,
    precisaDividaAtiva
      ? `EXISTS (SELECT 1 FROM atributo_candidato ac WHERE ac.candidatura_id = c.id AND ac.atributo_slug = 'divida_ativa_uniao_a_confirmar' AND ac.status_id = 1) as divida_ativa`
      : null,
    precisaAlinhamento
      ? `(SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE SUM(CASE WHEN vp.voto = vp.orientacao_bancada THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          FROM voto_parlamentar vp WHERE vp.pessoa_id = c.pessoa_id AND vp.orientacao_bancada IS NOT NULL AND vp.orientacao_bancada <> '') as alinhamento_pct`
      : null,
  ].filter(Boolean);

  const condicoes = ['c.ano_eleicao = ?', 'c.cargo_id = ?'];
  const params = [ANO_ATUAL, cargoRow.id];
  if (!cargoInfo.semUf) {
    condicoes.push('c.sg_uf = ?');
    params.push(uf);
  }
  if (filtroPartidoAtivo) {
    // 27/09/2026: filtra pelo número do partido (a sigla de PARTIDOS_INFO não bate com a do TSE).
    // 26/09/2026: filtra por EXCLUSÃO — só sai quem o usuário desmarcou. Antes era por inclusão e
    // derrubava junto os partidos que não estão em PARTIDOS_INFO (Missão, Agir, DC, PCO...).
    const numerosDesmarcados = PARTIDOS_INFO.filter((p) => !siglasMarcadas.includes(p.sigla)).map((p) => p.numero);
    condicoes.push(`(pa.numero IS NULL OR pa.numero NOT IN (${numerosDesmarcados.map(() => '?').join(',')}))`);
    params.push(...numerosDesmarcados);
  }

  const chaveCache = `${CACHE_KEY_QUIZ_PREFIX}${url.search}`;

  const buscarNoD1 = async () => {
    const { results } = await env.DB.prepare(
      `SELECT c.pessoa_id, p.nome_urna_atual, p.foto_url, p.grau_instrucao, c.sg_uf, ca.nome as cargo_nome, ca.slug as cargo_slug, c.numero_urna,
              pa.sigla as partido_sigla, pa.numero as partido_numero, c.reeleicao, c.declarou_bens,
              p.data_nascimento, c.bens_declarados_total,
              EXISTS (SELECT 1 FROM mandato m WHERE m.pessoa_id = c.pessoa_id AND m.data_fim IS NULL) as tem_mandato
              ${colunasExtra.length ? ', ' + colunasExtra.join(', ') : ''}
       FROM candidatura c
       JOIN pessoa p ON p.id = c.pessoa_id
       JOIN cargo ca ON ca.id = c.cargo_id
       LEFT JOIN partido pa ON pa.id = c.partido_id
       WHERE ${condicoes.join(' AND ')}
       ORDER BY p.nome_urna_atual ASC
       LIMIT 3000`
    )
      .bind(...params)
      .all();
    return results || [];
  };

  let candidatos = [];
  try {
    const versao = await obterVersaoDados(env);
    const chave = new Request(`${chaveCache}&_v=${encodeURIComponent(versao)}`);
    const cache = caches.default;
    const cacheado = await cache.match(chave);
    if (cacheado) {
      candidatos = await cacheado.json();
    } else {
      candidatos = await buscarNoD1();
      ctx.waitUntil(cache.put(chave, new Response(JSON.stringify(candidatos), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=86400' } })));
    }
  } catch (e) {
    console.error('Falha ao buscar candidatos pro quiz, tentando sem cache:', e);
    try {
      candidatos = await buscarNoD1();
    } catch (e2) {
      console.error('Falha em buscarNoD1 (quiz):', e2);
    }
  }

  const totalPerguntasRespondidas = Object.keys(respostas).length;
  const combinam = [];
  const naoBateram = [];

  if (totalPerguntasRespondidas > 0) {
    for (const c of candidatos) {
      const partidoInfo = PARTIDOS_INFO.find((p) => p.numero === c.partido_numero);
      const sinais = {
        reeleicao: c.tem_mandato ? 'S' : 'N',
        idade: idadeDe(c.data_nascimento),
        patrimonio: c.bens_declarados_total ?? 0,
        declarouBens: c.declarou_bens === 'S' ? true : c.declarou_bens === 'N' ? false : null,
        grauInstrucaoSuperior: temFormacaoSuperior(c.grau_instrucao),
        trocouPartido: precisaTrocaPartido ? Boolean(c.trocou_partido) : null,
        dividaAtivaConfirmada: precisaDividaAtiva ? Boolean(c.divida_ativa) : null,
        alinhamentoBancadaPct: precisaAlinhamento ? c.alinhamento_pct : null,
        zonaEspectro: partidoInfo ? zonaPrincipal(partidoInfo.familiaIdeologica) : null,
      };
      const avaliacao = avaliarCandidato(respostas, sinais);
      if (avaliacao.combina) {
        combinam.push(c);
      } else {
        naoBateram.push({ candidato: c, tags: avaliacao.divergeEm.map((slug) => RUBRICA_CURTA[slug] || slug) });
      }
    }
  }

  const respostasLegiveis = Object.entries(respostas)
    .map(([slug, valor]) => resumoResposta(slug, valor))
    .filter(Boolean);

  const voltarQuery = new URLSearchParams();
  voltarQuery.set('cargo', cargoSlug);
  if (!cargoInfo.semUf) voltarQuery.set('uf', uf);

  return html(
    renderQuizResultado({
      cargo: cargoSlug,
      uf: cargoInfo.semUf ? '' : uf,
      cargoNome: cargoRow.nome,
      totalPerguntasRespondidas,
      combinam: totalPerguntasRespondidas > 0 ? combinam : candidatos,
      naoBateram,
      totalCandidatos: candidatos.length,
      respostasLegiveis,
      voltarQuery: voltarQuery.toString(),
    })
  );
}

const ROTAS = {
  'POST /admin/coletar/tse-candidatos': async (req, env, url) => coletarCandidatos(env, Number(url.searchParams.get('ano')) || 2026),
  'POST /admin/coletar/tse-redes-sociais': async (req, env, url) => coletarRedesSociais(env, Number(url.searchParams.get('ano')) || 2026),
  'POST /admin/coletar/tse-bens': async (req, env, url) => coletarBensCandidatos(env, Number(url.searchParams.get('ano')) || 2026),
  'POST /admin/coletar/camara-deputados': async (req, env, url) => coletarDeputados(env, Number(url.searchParams.get('idLegislatura')) || 57),
  'POST /admin/coletar/camara-proposicoes': async (req, env, url) => coletarProposicoes(env, Number(url.searchParams.get('ano')) || 2026),
  'POST /admin/coletar/camara-votacoes': async (req, env, url) => {
    const fim = url.searchParams.get('dataFim') || ymd(new Date());
    const inicio = url.searchParams.get('dataInicio') || ymd(new Date(Date.now() - 3 * 24 * 3600 * 1000));
    return coletarVotacoes(env, inicio, fim);
  },
  'POST /admin/coletar/senado-senadores': async (req, env) => coletarSenadores(env),
  'POST /admin/coletar/senado-votacoes': async (req, env) => coletarVotacoesSenado(env),
  'POST /admin/coletar/senado-cruzamento-tse': async (req, env) => cruzarSenadoresComTse(env),
};

/**
 * Página de erro genérica, branded (23/09/2026 — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md,
 * seção 25) — usada só como ÚLTIMO recurso pelo `fetch` abaixo, quando alguma rota lança uma
 * exceção não prevista por nenhum dos try/catch específicos já existentes. Sem isso, qualquer
 * exceção não tratada vira a página crua "error code: 1101" da própria Cloudflare — sem marca,
 * sem link de volta, e sem log amigável. Isso NÃO substitui tratar a causa raiz (ex.: cota do
 * D1) — é uma rede de segurança final, não o mecanismo principal de resiliência.
 */
function paginaErroGenerico(caminho) {
  return pagina({
    titulo: 'Instabilidade temporária — VotoCheck',
    descricao: 'Estamos com uma instabilidade temporária. Tente novamente em alguns minutos.',
    caminho,
    noindex: true,
    corpo: `
      <div style="text-align:center; padding:64px 0;">
        <h1 style="font-size:28px; margin-bottom:12px;">Instabilidade temporária</h1>
        <p style="color:var(--text-muted); max-width:480px; margin:0 auto 28px;">
          Estamos com uma instabilidade temporária nos nossos servidores. Isso não afeta seus
          dados — tente novamente em alguns minutos.
        </p>
        <a href="/" style="display:inline-block; padding:12px 24px; background:var(--primary); color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">
          Voltar para a página inicial
        </a>
      </div>`,
  });
}

/** Candidatos por cargo numa UF (+ total de presidenciáveis), com cache de 10 min por UF. */
/** Idade a partir de 'DD/MM/AAAA' (TSE) ou 'AAAA-MM-DD'; null se não der pra calcular. */
function idadeDe(dn) {
  if (!dn) return null;
  const br = String(dn).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const iso = String(dn).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [a, m, d] = br ? [+br[3], +br[2], +br[1]] : iso ? [+iso[1], +iso[2], +iso[3]] : [null];
  if (!a) return null;
  const hoje = new Date();
  let i = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--;
  return i;
}

/** Candidaturas 2026 por partido (ligado pelo número) e por cargo, com cache de 10 min. */
async function contagemPorPartidoComCache(env, ctx) {
  const chave = new Request('https://cache.interno.votocheck/contagem-partido-v1');
  const cache = caches.default;
  const cacheado = await cache.match(chave);
  if (cacheado) return cacheado.json();
  const { results } = await env.DB.prepare(
    `SELECT pa.numero, ca.slug, COUNT(*) as n FROM candidatura c JOIN partido pa ON pa.id = c.partido_id JOIN cargo ca ON ca.id = c.cargo_id
     WHERE c.ano_eleicao = ? GROUP BY pa.numero, ca.slug`
  ).bind(ANO_ATUAL).all();
  const siglaPorNumero = Object.fromEntries(PARTIDOS_INFO.map((p) => [p.numero, p.sigla]));
  const out = {};
  for (const r of results || []) {
    const s = siglaPorNumero[r.numero];
    if (!s) continue;
    out[s] = out[s] || { total: 0 };
    out[s][r.slug] = r.n;
    out[s].total += r.n;
  }
  ctx.waitUntil(cache.put(chave, new Response(JSON.stringify(out), { headers: { 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` } })));
  return out;
}

async function contagemPorUfComCache(env, ctx, uf) {
  const chave = new Request(`https://cache.interno.votocheck/contagem-uf-${uf || 'BR'}`);
  const cache = caches.default;
  const cacheado = await cache.match(chave);
  if (cacheado) return cacheado.json();
  const { results } = await env.DB.prepare(
    `SELECT ca.slug, COUNT(*) as n FROM candidatura c JOIN cargo ca ON ca.id = c.cargo_id
     WHERE c.ano_eleicao = ? AND (c.sg_uf = ? OR ca.slug = 'presidente') GROUP BY ca.slug`
  ).bind(ANO_ATUAL, uf || '--').all();
  const out = {};
  for (const r of results || []) out[r.slug] = r.n;
  ctx.waitUntil(cache.put(chave, new Response(JSON.stringify(out), { headers: { 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` } })));
  return out;
}

async function fetchInterno(request, env, ctx) {
  const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      // Defensivo (23/09/2026): falha do D1 nunca derruba a home — degrada para números zerados.
      let stats = { totalCandidaturas: 0, totalPessoas: 0, atualizadoEm: null, porCargo: [] };
      try {
        stats = await estatisticasHomepageComCache(env, ctx);
      } catch (e) {
        console.error('Falha em estatisticasHomepageComCache:', e);
      }
      // Estado do visitante: ?uf= tem prioridade; senão, a região detectada pela Cloudflare (só BR).
      const ufParam = (url.searchParams.get('uf') || '').toUpperCase();
      const ufCf = request.cf?.country === 'BR' ? String(request.cf?.regionCode || '').toUpperCase() : '';
      const uf = UF_NOMES[ufParam] ? ufParam : UF_NOMES[ufCf] ? ufCf : '';
      let contagemUf = null;
      try {
        contagemUf = await contagemPorUfComCache(env, ctx, uf);
      } catch (e) {
        console.error('Falha em contagemPorUfComCache:', e);
      }
      return html(renderHomeV2({ ...stats, uf, contagemUf }));
    }

    if (url.pathname === '/buscar' && request.method === 'GET') {
      const db = env.DB;
      const q = (url.searchParams.get('q') || '').trim();
      const cargo = (url.searchParams.get('cargo') || '').trim();
      const uf = (url.searchParams.get('uf') || '').trim();
      const ordenarParam = (url.searchParams.get('ordenar') || 'nome').trim();
      const ordenar = ['nome', 'idade', 'partido'].includes(ordenarParam) ? ordenarParam : 'nome';
      const porPagina = 30;
      const paginaAtual = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
      const offset = (paginaAtual - 1) * porPagina;

      const condicoes = ['c.ano_eleicao = ?'];
      const params = [ANO_ATUAL];
      if (q && /^\d{2,5}$/.test(q)) {
        // Busca por número de urna (santinho) — caso de uso nº 1 da última semana (F3).
        condicoes.push('c.numero_urna = ?');
        params.push(Number(q));
      } else if (q) {
        condicoes.push('(p.nome_completo LIKE ? OR p.nome_urna_atual LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
      if (cargo) {
        condicoes.push('ca.slug = ?');
        params.push(cargo);
      }
      if (uf) {
        condicoes.push('c.sg_uf = ?');
        params.push(uf);
      }
      const whereSql = condicoes.join(' AND ');

      // Critérios de ordenação isonômicos (nenhum implica "melhor/pior" candidato — ver
      // ORDENACOES em busca_html.js). "idade": normaliza data_nascimento (formatos mistos
      // TSE "DD/MM/AAAA" e Senado "AAAA-MM-DD") para ISO antes de ordenar, do mais velho
      // (data menor) pro mais novo; sem data de nascimento sempre vai por último.
      const dataIsoExpr = `CASE
          WHEN p.data_nascimento LIKE '__/__/____' THEN substr(p.data_nascimento,7,4) || '-' || substr(p.data_nascimento,4,2) || '-' || substr(p.data_nascimento,1,2)
          WHEN p.data_nascimento LIKE '____-__-__%' THEN substr(p.data_nascimento,1,10)
          ELSE NULL
        END`;
      const ORDER_BY = {
        nome: 'p.nome_urna_atual ASC',
        idade: `(${dataIsoExpr}) IS NULL, (${dataIsoExpr}) ASC`,
        partido: '(pa.sigla IS NULL), pa.sigla ASC, p.nome_urna_atual ASC',
      };

      const buscarNoD1 = async () => {
        const [{ results }, contagem] = await Promise.all([
          db
            .prepare(
              `SELECT c.pessoa_id, p.nome_completo, p.nome_urna_atual, p.foto_url, p.data_nascimento,
                      ca.nome as cargo_nome, ca.slug as cargo_slug, c.sg_uf, c.numero_urna, c.situacao_candidatura, c.situacao_totalizacao_turno,
                      pa.sigla as partido_sigla
               FROM candidatura c
               JOIN pessoa p ON p.id = c.pessoa_id
               JOIN cargo ca ON ca.id = c.cargo_id
               LEFT JOIN partido pa ON pa.id = c.partido_id
               WHERE ${whereSql}
               ORDER BY ${ORDER_BY[ordenar]}
               LIMIT ? OFFSET ?`
            )
            .bind(...params, porPagina, offset)
            .all(),
          db
            .prepare(
              `SELECT COUNT(*) as total
               FROM candidatura c
               JOIN pessoa p ON p.id = c.pessoa_id
               JOIN cargo ca ON ca.id = c.cargo_id
               LEFT JOIN partido pa ON pa.id = c.partido_id
               WHERE ${whereSql}`
            )
            .bind(...params)
            .first(),
        ]);
        return { resultados: results || [], total: contagem?.total || 0 };
      };

      // Defensivo (23/09/2026 — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 25): uma
      // falha na CAMADA DE CACHE (ex.: erro ao ler/gravar em `caches.default`, ou na query de
      // versão em `obterVersaoDados`) não pode derrubar a busca inteira — cai pra rodar a query
      // direto no D1, sem cache, como antes desta feature existir. Se até isso falhar (ex.: cota
      // do D1 estourada), degrada pra uma página de resultados vazia com aviso, em vez de 500 cru.
      let listaResultados = [];
      let total = 0;
      try {
        ({ resultados: listaResultados, total } = await buscarComCache(env, ctx, {
          queryString: url.search,
          buscar: buscarNoD1,
        }));
      } catch (e) {
        console.error('Falha em buscarComCache, tentando direto no D1 sem cache:', e);
        try {
          ({ resultados: listaResultados, total } = await buscarNoD1());
        } catch (e2) {
          console.error('Falha em buscarNoD1 (sem cache também falhou):', e2);
        }
      }

      return html(
        renderResultados({
          q,
          cargo,
          uf,
          ordenar,
          resultados: listaResultados,
          totalResultados: total,
          paginaAtual,
          porPagina,
          caminho: url.pathname + url.search,
        })
      );
    }

    if (url.pathname === '/sobre' && request.method === 'GET') {
      return html(renderSobre());
    }

    if (url.pathname === '/termos' && request.method === 'GET') {
      return html(renderTermos());
    }

    if (url.pathname === '/faq' && request.method === 'GET') {
      return html(renderFaq());
    }

    if (url.pathname === '/judiciario' && request.method === 'GET') {
      return html(renderJudiciario());
    }

    if (url.pathname === '/partidos' && request.method === 'GET') {
      const representantesPorSigla = await carregarRepresentantesPorPartido(env, ctx);
      // Consulta nova (23/09/2026) e ainda não testada contra D1 de produção — falha aqui nunca
      // pode derrubar a página inteira, só faz o card ficar sem essa linha específica.
      let liderancaCargoPorSigla = {};
      try {
        liderancaCargoPorSigla = await carregarLiderancaPorCargoPorPartido(env, ctx);
      } catch (e) {
        console.error('Falha em carregarLiderancaPorCargoPorPartido:', e);
      }
      let contagemPorSigla = {};
      try {
        contagemPorSigla = await contagemPorPartidoComCache(env, ctx);
      } catch (e) {
        console.error('Falha em contagemPorPartidoComCache:', e);
      }
      return html(renderPartidos({ representantesPorSigla, liderancaCargoPorSigla, contagemPorSigla }));
    }

    if (url.pathname === '/quiz' && request.method === 'GET') {
      const cargoSlug = (url.searchParams.get('cargo') || '').trim();
      const ufCfQuiz = request.cf?.country === 'BR' ? String(request.cf?.regionCode || '').toUpperCase() : '';
      if (!cargoSlug) return html(renderQuizEscolhaCargo({ uf: (url.searchParams.get('uf') || ufCfQuiz).toUpperCase() }));
      const cargoInfo = cargoQuizPorSlug(cargoSlug);
      const ufParam = (url.searchParams.get('uf') || '').trim().toUpperCase();
      if (!cargoInfo || (!cargoInfo.semUf && !ufParam)) {
        return Response.redirect(new URL('/quiz', url.origin).toString(), 302);
      }
      return html(renderQuiz({ cargo: cargoSlug, uf: cargoInfo.semUf ? '' : ufParam }));
    }

    if (url.pathname === '/quiz/resultado' && request.method === 'GET') {
      return await rotaQuizResultado(url, env, ctx);
    }

    const cargoMatch = url.pathname.match(/^\/cargo\/([a-z_]+)$/);
    if (cargoMatch && request.method === 'GET') {
      const slug = cargoMatch[1];
      const corpoCargo = renderCargoPagina(slug);
      if (!corpoCargo) return html404(render404(url.pathname));
      const cargo = GUIA_CARGOS.find((c) => c.slug === slug);
      return html(
        pagina({
          titulo: `${cargo.nome} — o que pode e não pode fazer — VotoCheck`,
          descricao: `Entenda o que um(a) ${cargo.nome} pode e não pode fazer, e sua atuação nos principais temas públicos — sempre com base na Constituição e nas leis, sem opinião do VotoCheck.`,
          caminho: url.pathname,
          corpo: corpoCargo,
        })
      );
    }

    if (url.pathname === '/robots.txt' && request.method === 'GET') {
      return new Response(
        `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    if (url.pathname === '/sitemap.xml' && request.method === 'GET') {
      // Índice de sitemaps (F2, 27/09/2026): páginas fixas + todas as fichas de candidato 2026 em
      // blocos de 5.000 (limite do Google: 50.000 por arquivo). A busca "nome + número" no Google
      // é a maior fonte de tráfego da última semana de campanha.
      let total = 0;
      try {
        total = (await env.DB.prepare(`SELECT COUNT(DISTINCT pessoa_id) as n FROM candidatura WHERE ano_eleicao = ?`).bind(ANO_ATUAL).first())?.n || 0;
      } catch (e) {
        console.error('sitemap index: falha ao contar', e);
      }
      const blocos = Math.max(1, Math.ceil(total / 5000));
      const hoje = new Date().toISOString().slice(0, 10);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemap-paginas.xml</loc><lastmod>${hoje}</lastmod></sitemap>
${Array.from({ length: blocos }, (_, i) => `  <sitemap><loc>${SITE_URL}/sitemap-candidatos-${i + 1}.xml</loc><lastmod>${hoje}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
      return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    const sitemapCandMatch = url.pathname.match(/^\/sitemap-candidatos-(\d+)\.xml$/);
    if (sitemapCandMatch && request.method === 'GET') {
      const bloco = Math.max(1, Number(sitemapCandMatch[1]));
      const { results } = await env.DB.prepare(
        `SELECT DISTINCT pessoa_id FROM candidatura WHERE ano_eleicao = ? ORDER BY pessoa_id LIMIT 5000 OFFSET ?`
      ).bind(ANO_ATUAL, (bloco - 1) * 5000).all();
      if (!results || !results.length) return html404(render404(url.pathname));
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${results.map((r) => `  <url><loc>${SITE_URL}/candidato/${r.pessoa_id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('\n')}
</urlset>`;
      return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    if (url.pathname === '/sitemap-paginas.xml' && request.method === 'GET') {
      // Sitemap com as páginas estáticas + navegação por cargo (estável e de baixo volume).
      // As ~40 mil páginas individuais de candidato não entram aqui por enquanto — são
      // descobertas via link a partir dos resultados de busca, não via sitemap (evita gerar
      // um sitemap de dezenas de milhares de URLs a cada mudança de cobertura).
      // Cargos com cobertura de candidatura (busca funciona) vs. cargos cobertos só no guia
      // institucional (prefeito/vereador têm página em /cargo/:slug, mas ainda não têm
      // candidaturas no banco — ver cargos_guia.js).
      const cargosComBusca = ['presidente', 'governador', 'senador', 'deputado_federal', 'deputado_estadual', 'deputado_distrital'];
      const cargosGuiaSomente = ['prefeito', 'vereador'];
      const urls = [
        { loc: '/', prioridade: '1.0' },
        { loc: '/sobre', prioridade: '0.6' },
        { loc: '/buscar', prioridade: '0.8' },
        { loc: '/quiz', prioridade: '0.8' },
        { loc: '/cola', prioridade: '0.8' },
        { loc: '/partidos', prioridade: '0.6' },
        { loc: '/judiciario', prioridade: '0.4' },
        { loc: '/termos', prioridade: '0.3' },
        { loc: '/faq', prioridade: '0.4' },
        ...cargosComBusca.map((c) => ({ loc: `/buscar?cargo=${c}`, prioridade: '0.7' })),
        ...cargosComBusca.map((c) => ({ loc: `/cargo/${c}`, prioridade: '0.5' })),
        ...cargosGuiaSomente.map((c) => ({ loc: `/cargo/${c}`, prioridade: '0.4' })),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><priority>${u.prioridade}</priority></url>`).join('\n')}
</urlset>`;
      return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }

    // ===== Arquivos de marca (cache longo) =====
    const estaticos = {
      '/static/logo-h.png': LOGO_H_B64,
      '/static/logo-h-branco.png': LOGO_H_BRANCO_B64,
      '/static/icone.png': ICONE_B64,
      '/static/pix-qr.png': PIX_QR_B64,
    };
    const logoPartido = url.pathname.match(/^\/static\/partido\/([a-z0-9-]+)$/);
    if (logoPartido && request.method === 'GET') {
      const sigla = Object.keys(LOGOS_PARTIDOS).find((k) => siglaSlug(k) === logoPartido[1]);
      const logo = sigla && LOGOS_PARTIDOS[sigla];
      if (!logo || !logo.base64) {
        // Logo do Commons, guardada no KV na primeira visita (ver LOGOS_COMMONS).
        const siglaC = Object.keys(LOGOS_COMMONS).find((k) => siglaSlug(k) === logoPartido[1]);
        if (!siglaC || !env.OG) return html404(render404(url.pathname));
        const chave = `logo:${logoPartido[1]}`;
        let obj = await env.OG.getWithMetadata(chave, 'arrayBuffer');
        if (!obj || !obj.value) {
          const r = await fetch(urlCommons(LOGOS_COMMONS[siglaC].arquivo), { headers: { 'User-Agent': 'VotoCheck/1.0 (https://votocheck.com.br; contato@votocheck.com.br)' }, redirect: 'follow' });
          const tipo = r.headers.get('content-type') || '';
          if (!r.ok || !tipo.startsWith('image/')) return html404(render404(url.pathname));
          const buf = await r.arrayBuffer();
          await env.OG.put(chave, buf, { metadata: { tipo } });
          obj = { value: buf, metadata: { tipo } };
        }
        return new Response(obj.value, { headers: { 'Content-Type': obj.metadata?.tipo || 'image/png', 'Cache-Control': 'public, max-age=2592000' } });
      }
      const bin = atob(logo.base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': logo.mime, 'Cache-Control': 'public, max-age=2592000' } });
    }
    // Fotos oficiais do TSE (importadas por scripts/importar_fotos.py para o KV, chave foto:<sq>).
    const fotoTse = url.pathname.match(/^\/foto\/(\d{6,15})\.jpg$/);
    if (fotoTse && request.method === 'GET') {
      const buf = env.OG ? await env.OG.get(`foto:${fotoTse[1]}`, 'arrayBuffer') : null;
      if (!buf) return new Response('Not found', { status: 404 });
      return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=2592000' } });
    }
    const logoAnunciante = url.pathname.match(/^\/static\/anunciante\/([a-z0-9]+)\.png$/);
    if (logoAnunciante && LOGOS_ANUNCIANTES[logoAnunciante[1]] && request.method === 'GET') {
      return imagemPng(LOGOS_ANUNCIANTES[logoAnunciante[1]].b64, { cacheSegundos: 2592000 });
    }
    if (estaticos[url.pathname] && request.method === 'GET') {
      return imagemPng(estaticos[url.pathname], { cacheSegundos: 2592000 });
    }

    // ===== Pauta diária da campanha (D21) — protegida por ADMIN_TOKEN via ?t= =====
    const tokenOk = () => env.ADMIN_TOKEN && url.searchParams.get('t') === env.ADMIN_TOKEN;
    // Diagnóstico de fontes externas (26/09/2026): confere, a partir da Cloudflare, se as APIs
    // públicas de onde o site busca fotos (TSE) e logos (Wikimedia Commons) respondem. Só texto,
    // só hosts da lista, só com ADMIN_TOKEN.
    if (url.pathname === '/admin/diag-fonte' && request.method === 'GET') {
      if (!tokenOk()) return new Response('Unauthorized', { status: 401 });
      let alvo; try { alvo = new URL(url.searchParams.get('u') || ''); } catch { return new Response('url inválida', { status: 400 }); }
      if (!['divulgacandcontas.tse.jus.br', 'commons.wikimedia.org'].includes(alvo.hostname)) return new Response('host fora da lista', { status: 400 });
      const r = await fetch(alvo.toString(), { headers: { 'User-Agent': 'VotoCheck/1.0 (https://votocheck.com.br; contato@votocheck.com.br)', Accept: 'application/json,*/*' } });
      const ct = r.headers.get('content-type') || '';
      const corpo = ct.includes('json') || ct.includes('text') ? (await r.text()).slice(0, 6000) : `[${ct}, ${(await r.arrayBuffer()).byteLength} bytes]`;
      return new Response(`${r.status} ${ct}\n${corpo}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (url.pathname === '/admin/pauta' && request.method === 'GET') {
      if (!tokenOk()) return new Response('Unauthorized', { status: 401 });
      const data = url.searchParams.get('d') || dataSP();
      return html(renderPauta({ pauta: await lerPauta(env, data), data, token: url.searchParams.get('t') }));
    }
    if (url.pathname === '/admin/pauta/decidir' && request.method === 'GET') {
      if (!tokenOk()) return new Response('Unauthorized', { status: 401 });
      const data = url.searchParams.get('d') || dataSP();
      await decidirPeca(env, data, url.searchParams.get('id'), url.searchParams.get('acao'));
      return Response.redirect(`${url.origin}/admin/pauta?t=${encodeURIComponent(url.searchParams.get('t'))}&d=${data}`, 302);
    }
    const socialMatch = url.pathname.match(/^\/social\/(\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9_.-]+)$/);
    if (socialMatch && request.method === 'GET') {
      if (!tokenOk()) return new Response('Unauthorized', { status: 401 });
      return (await servirArquivoSocial(env, socialMatch[1])) || html404(render404(url.pathname));
    }
    if (url.pathname === '/api/pauta' && request.method === 'GET') {
      // Leitura da pauta pela própria fábrica (ex.: publicar aprovadas no Buffer). Token no header.
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      return Response.json(await lerPauta(env, url.searchParams.get('d') || dataSP()));
    }

    // ===== Medição (D14) =====
    if (url.pathname === '/e' && request.method === 'POST') {
      return registrarEvento(env, request);
    }
    if (url.pathname === '/admin/metricas' && request.method === 'GET') {
      if (!requireAdminToken(request, env) && url.searchParams.get('t') !== env.ADMIN_TOKEN) return new Response('Unauthorized', { status: 401 });
      return Response.json(await resumoMetricas(env, Number(url.searchParams.get('dias')) || 14));
    }

    // ===== Clique em anúncio: conta e redireciona com UTM =====
    const pubMatch = url.pathname.match(/^\/p\/([a-z0-9-]+)$/);
    if (pubMatch && request.method === 'GET') {
      const espaco = (url.searchParams.get('e') || 'na').slice(0, 4);
      const destino = urlDestinoAnunciante(pubMatch[1], espaco);
      if (!destino) return html404(render404(url.pathname));
      ctx.waitUntil(contar(env, 'pub_clique', `${pubMatch[1]}:${espaco}`).catch(() => {}));
      return Response.redirect(destino, 302);
    }

    // ===== Cola eleitoral (F7) — 100% no aparelho, nada é enviado ao servidor =====
    if (url.pathname === '/cola' && request.method === 'GET') {
      const ufParam = (url.searchParams.get('uf') || '').toUpperCase();
      const ufCf = request.cf?.country === 'BR' ? String(request.cf?.regionCode || '').toUpperCase() : '';
      const uf = UF_NOMES[ufParam] ? ufParam : UF_NOMES[ufCf] ? ufCf : '';
      return html(renderCola({ uf }));
    }
    const colaApiMatch = url.pathname === '/api/cola-candidato' && request.method === 'GET';
    if (colaApiMatch) {
      // Dados mínimos de um candidato para a cola (nome de urna, número, partido, cargo, UF).
      const id = Number(url.searchParams.get('id'));
      if (!id) return Response.json({ ok: false }, { status: 400 });
      const row = await env.DB.prepare(
        `SELECT c.pessoa_id as id, p.nome_urna_atual as nome, c.numero_urna as numero, pa.sigla as partido, ca.slug as cargo, c.sg_uf as uf
         FROM candidatura c JOIN pessoa p ON p.id = c.pessoa_id JOIN cargo ca ON ca.id = c.cargo_id LEFT JOIN partido pa ON pa.id = c.partido_id
         WHERE c.pessoa_id = ? AND c.ano_eleicao = ? LIMIT 1`
      ).bind(id, ANO_ATUAL).first();
      return Response.json({ ok: !!row, candidato: row }, { headers: { 'Cache-Control': 'public, max-age=600' } });
    }

    if (url.pathname === '/favicon.ico' && request.method === 'GET') {
      return imagemPng(FAVICON_32_B64);
    }

    if (url.pathname === '/apple-touch-icon.png' && request.method === 'GET') {
      return imagemPng(FAVICON_180_B64);
    }

    // Imagem de preview (WhatsApp/redes) pré-gerada por ficha e por página, guardada no KV "OG".
    const ogMatch = url.pathname.match(/^\/og\/(candidato|pagina)\/([a-z0-9_-]+)\.jpg$/);
    if (ogMatch && request.method === 'GET') {
      const chave = `${ogMatch[1] === 'candidato' ? 'c' : 'p'}:${ogMatch[2]}`;
      const img = env.OG ? await env.OG.get(chave, 'arrayBuffer') : null;
      if (!img) return Response.redirect(`${SITE_URL}/og-image.png`, 302);
      return new Response(img, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
    }

    if (url.pathname === '/og-image.png' && request.method === 'GET') {
      return imagemPng(OG_IMAGE_B64, { cacheSegundos: 604800 });
    }

    const perfilMatch = url.pathname.match(/^\/candidato\/(\d+)$/);
    if (perfilMatch && request.method === 'GET') {
      const db = env.DB;
      const pessoaId = Number(perfilMatch[1]);

      const pessoa = await db.prepare(`SELECT * FROM pessoa WHERE id = ?`).bind(pessoaId).first();
      if (!pessoa) return html404(renderNaoEncontrado(url.pathname));

      const [candidaturasRes, mandatosRes, filiacoesRes, atributosRes] = await Promise.all([
        db
          .prepare(
            `SELECT c.*, ca.nome as cargo_nome, ca.slug as cargo_slug, pa.sigla as partido_sigla, pa.nome as partido_nome,
                    s.codigo as status_codigo, s.descricao as status_descricao,
                    f.nome as fonte_nome, f.url_base as fonte_url, p.data_nascimento
             FROM candidatura c
             JOIN cargo ca ON ca.id = c.cargo_id
             LEFT JOIN partido pa ON pa.id = c.partido_id
             JOIN status s ON s.id = c.status_id
             LEFT JOIN fonte f ON f.id = c.fonte_id
             JOIN pessoa p ON p.id = c.pessoa_id
             WHERE c.pessoa_id = ?
             ORDER BY c.ano_eleicao DESC`
          )
          .bind(pessoaId)
          .all(),
        db
          .prepare(
            `SELECT m.*, ca.nome as cargo_nome, f.nome as fonte_nome
             FROM mandato m
             JOIN cargo ca ON ca.id = m.cargo_id
             LEFT JOIN fonte f ON f.id = m.fonte_id
             WHERE m.pessoa_id = ?`
          )
          .bind(pessoaId)
          .all(),
        db
          .prepare(
            `SELECT fp.*, pa.sigla, pa.nome
             FROM filiacao_partidaria fp
             JOIN partido pa ON pa.id = fp.partido_id
             WHERE fp.pessoa_id = ?
             ORDER BY fp.data_inicio DESC`
          )
          .bind(pessoaId)
          .all(),
        // Só atributos CONFIRMADOS (status_id=1) — os "a confirmar" (status_id=2, ver
        // scripts/importar_pgfn.mjs e lib/divida_ativa.js) nunca aparecem aqui de propósito.
        db
          .prepare(
            `SELECT ac.atributo_slug, ac.valor, ac.regra_publicada_url, ev.url as evidencia_url
             FROM atributo_candidato ac
             JOIN candidatura c ON c.id = ac.candidatura_id
             LEFT JOIN evidencia ev ON ev.id = ac.evidencia_id
             WHERE c.pessoa_id = ? AND ac.status_id = 1`
          )
          .bind(pessoaId)
          .all(),
      ]);

      // Selos automáticos (presença / crescimento patrimonial) — ver src/lib/selos.js. Cargo de
      // referência = o da candidatura de 2026 (a mais recente), quando existir; sem candidatura
      // 2026 não há cargo pra comparar contra pares, e os dois selos ficam ausentes (nunca um erro).
      let selos = null;
      const candidaturaAtual = (candidaturasRes.results || []).find((c) => c.ano_eleicao === ANO_ATUAL);
      if (candidaturaAtual) {
        try {
          selos = await calcularSelos(env, { pessoaId, cargoId: candidaturaAtual.cargo_id });
        } catch (e) {
          console.error('Falha em calcularSelos:', e);
        }
      }

      // v2 (27/09/2026): últimos votos nominais registrados + "Seu voto também conta para" (mesma
      // lista partidária/federação no mesmo cargo e UF). Falhas aqui nunca derrubam a ficha.
      let votos = [];
      let totalVotos = 0;
      let mesmaLista = null;
      try {
        const [vRes, tRes] = await Promise.all([
          db.prepare(
            `SELECT v.voto, vt.data_votacao, vt.descricao, vt.url_origem, vt.casa,
                    ex.projeto AS ex_projeto, ex.resumo AS ex_resumo, ex.esta_votacao AS ex_votacao
             FROM voto_parlamentar v JOIN votacao vt ON vt.id = v.votacao_id
             LEFT JOIN votacao_explicacao ex ON ex.votacao_id = vt.id
             WHERE v.pessoa_id = ? ORDER BY vt.data_votacao DESC, vt.id DESC LIMIT 8`
          ).bind(pessoaId).all(),
          db.prepare(`SELECT COUNT(*) as n FROM voto_parlamentar WHERE pessoa_id = ?`).bind(pessoaId).first(),
        ]);
        votos = vRes.results || [];
        totalVotos = tRes?.n || 0;
      } catch (e) {
        console.error('perfil: falha ao carregar votos', e);
      }
      try {
        const cand = (candidaturasRes.results || []).find((c) => c.ano_eleicao === ANO_ATUAL);
        if (cand && ['deputado_federal', 'deputado_estadual', 'deputado_distrital'].includes(cand.cargo_slug)) {
          const federacao = cand.nome_coligacao && cand.nome_coligacao !== 'PARTIDO ISOLADO' && cand.sq_coligacao;
          const filtro = federacao ? 'c.sq_coligacao = ?' : 'c.partido_id = ?';
          const valor = federacao ? cand.sq_coligacao : cand.partido_id;
          const [itensRes, totRes] = await Promise.all([
            db.prepare(
              `SELECT c.pessoa_id, p.nome_urna_atual, c.numero_urna FROM candidatura c JOIN pessoa p ON p.id = c.pessoa_id
               WHERE c.ano_eleicao = ? AND c.cargo_id = ? AND c.sg_uf = ? AND ${filtro} AND c.pessoa_id != ?
               ORDER BY p.nome_urna_atual LIMIT 30`
            ).bind(ANO_ATUAL, cand.cargo_id, cand.sg_uf, valor, pessoaId).all(),
            db.prepare(`SELECT COUNT(*) as n FROM candidatura c WHERE c.ano_eleicao = ? AND c.cargo_id = ? AND c.sg_uf = ? AND ${filtro}`)
              .bind(ANO_ATUAL, cand.cargo_id, cand.sg_uf, valor).first(),
          ]);
          mesmaLista = {
            federacao: Boolean(federacao),
            rotulo: federacao ? cand.nome_coligacao : cand.partido_sigla || '',
            total: totRes?.n || 0,
            itens: itensRes.results || [],
          };
        }
      } catch (e) {
        console.error('perfil: falha ao carregar mesma lista', e);
      }

      let bens = [];
      let redes = [];
      try {
        const cand = (candidaturasRes.results || []).find((c) => c.ano_eleicao === ANO_ATUAL);
        if (cand) {
          const [bRes, rRes] = await Promise.all([
            db.prepare(`SELECT tipo, descricao, valor FROM bem_candidato WHERE candidatura_id = ? ORDER BY valor DESC`).bind(cand.id).all(),
            db.prepare(`SELECT url FROM rede_social_candidato WHERE candidatura_id = ? ORDER BY ordem`).bind(cand.id).all(),
          ]);
          bens = bRes.results || [];
          redes = rRes.results || [];
        }
      } catch (e) {
        console.error('perfil: falha ao carregar bens/redes', e);
      }
      let temas = null;
      try {
        temas = await db.prepare(`SELECT casa, periodo, total, temas_json FROM autoria_temas WHERE pessoa_id = ?`).bind(pessoaId).first();
      } catch (e) {
        console.error('perfil: falha ao carregar temas', e);
      }

      return html(
        renderPerfil({
          temas,
          bens,
          redes,
          votos,
          totalVotos,
          mesmaLista,
          pessoa,
          candidaturas: candidaturasRes.results || [],
          mandatos: mandatosRes.results || [],
          filiacoes: filiacoesRes.results || [],
          atributos: atributosRes.results || [],
          selos,
          // feedback pós-POST de /acompanhar (ver rota abaixo) — sem JS, redirect com querystring
          acompanhar: {
            status: url.searchParams.get('acompanhar'),
            tokenCancelamento: url.searchParams.get('token'),
          },
        })
      );
    }

    if (url.pathname === '/acompanhar' && request.method === 'POST') {
      let form;
      try {
        form = await request.formData();
      } catch (e) {
        return new Response('Formulário inválido.', { status: 400 });
      }
      const email = form.get('email');
      const pessoaId = Number(form.get('pessoa_id'));
      const voltarPara = `/candidato/${pessoaId}`;
      if (!pessoaId) return new Response('Candidato inválido.', { status: 400 });

      let resultado;
      try {
        resultado = await criarAcompanhamento(env, { email, pessoaId });
      } catch (e) {
        // Nunca deixa um erro de D1 (tabela ausente, constraint, etc.) virar página de erro crua
        // pro usuário — loga o suficiente pra depurar depois e volta como "erro" genérico.
        console.error('Falha em criarAcompanhamento:', e);
        resultado = { ok: false, motivo: 'excecao_d1' };
      }
      const destino = new URL(voltarPara, url.origin);
      if (resultado.ok) {
        destino.searchParams.set('acompanhar', resultado.jaExistia ? 'ja_existia' : 'ok');
        destino.searchParams.set('token', resultado.tokenCancelamento);

        // E-mail de confirmação (Fase 2, via Resend — ver lib/email.js) é best-effort: nunca
        // atrasa nem quebra o redirect. Se RESEND_API_KEY não estiver configurado (caso desta
        // sessão) ou o domínio ainda não estiver verificado no Resend, enviarEmail() só falha
        // silenciosamente — o registro em `acompanhamento` já foi salvo, que é o que importa.
        ctx.waitUntil(
          (async () => {
            const pessoaEmail = await env.DB.prepare(
              `SELECT p.nome_urna_atual, ca.nome as cargo_nome, c.sg_uf
               FROM pessoa p
               LEFT JOIN candidatura c ON c.pessoa_id = p.id AND c.ano_eleicao = ?
               LEFT JOIN cargo ca ON ca.id = c.cargo_id
               WHERE p.id = ?
               LIMIT 1`
            )
              .bind(ANO_ATUAL, pessoaId)
              .first();
            if (!pessoaEmail) return;
            const { subject, html: corpoHtml, text } = emailConfirmacaoAcompanhamento({
              nomeRepresentante: pessoaEmail.nome_urna_atual,
              cargoNome: pessoaEmail.cargo_nome,
              ufSigla: pessoaEmail.sg_uf,
              tokenCancelamento: resultado.tokenCancelamento,
              origem: url.origin,
            });
            await enviarEmail(env, { to: email, subject, html: corpoHtml, text });
          })()
        );
      } else {
        destino.searchParams.set('acompanhar', resultado.motivo === 'limite_atingido' ? 'limite' : 'erro');
      }
      return Response.redirect(destino.toString(), 303);
    }

    if (url.pathname === '/acompanhar/cancelar' && request.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      let resultado;
      try {
        resultado = await cancelarPorToken(env, token);
      } catch (e) {
        console.error('Falha em cancelarPorToken:', e);
        resultado = { ok: false, motivo: 'excecao_d1' };
      }
      return html(
        pagina({
          titulo: 'Cancelar acompanhamento — VotoCheck',
          descricao: 'Cancelamento de acompanhamento de Representante Público no VotoCheck.',
          caminho: url.pathname,
          noindex: true,
          corpo: `
            <div style="max-width:520px; margin:60px auto; text-align:center;">
              <h1 style="font-size:24px;">${resultado.ok ? 'Acompanhamento cancelado' : 'Não encontramos esse acompanhamento'}</h1>
              <p style="color:var(--text-muted);">
                ${resultado.ok
                  ? 'Você não vai mais receber atualizações sobre esse Representante Público. Se mudou de ideia, é só acompanhar de novo na página dele.'
                  : 'O link pode já ter sido usado antes, ou está incorreto.'}
              </p>
              <p><a href="/">Voltar para a página inicial</a></p>
            </div>`,
        })
      );
    }

    if (url.pathname === '/healthcheck' && request.method === 'GET') {
      return Response.json({ status: 'ok', service: 'votocheck-worker' });
    }

    if (url.pathname === '/admin/execucoes' && request.method === 'GET') {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const { results } = await env.DB.prepare(`SELECT * FROM execucao_coletor ORDER BY iniciado_em DESC LIMIT 20`).all();
      return Response.json({ execucoes: results });
    }

    // Painel de curadoria (HTML) — o próprio painel pede o ADMIN_TOKEN ao usuário antes de
    // chamar as rotas JSON abaixo, por isso esta rota em si não exige token (só serve HTML
    // estático, sem dados sensíveis).
    if (url.pathname === '/admin/curadoria' && request.method === 'GET') {
      return new Response(CURADORIA_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/admin/curadoria/pendencias' && request.method === 'GET') {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const result = await listarPendencias(env);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }

    const resolverMatch = url.pathname.match(/^\/admin\/curadoria\/pendencias\/(\d+)\/resolver$/);
    if (resolverMatch && request.method === 'POST') {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const historicoId = Number(resolverMatch[1]);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return Response.json({ ok: false, error: 'Corpo da requisição precisa ser JSON válido.' }, { status: 400 });
      }
      const result = await resolverPendencia(env, {
        historicoId,
        decisao: body.decisao,
        pessoaDestinoId: body.pessoaDestinoId,
        curador: body.curador,
      });
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    // Painel de curadoria da Dívida Ativa (PGFN) — mesma lógica de proteção do painel acima:
    // a página em si só serve HTML estático, o token é exigido nas rotas JSON.
    if (url.pathname === '/admin/divida-ativa' && request.method === 'GET') {
      return new Response(DIVIDA_ATIVA_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/admin/divida-ativa/pendencias' && request.method === 'GET') {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const result = await listarPendenciasDividaAtiva(env);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }

    const resolverDividaMatch = url.pathname.match(/^\/admin\/divida-ativa\/pendencias\/(\d+)\/resolver$/);
    if (resolverDividaMatch && request.method === 'POST') {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const id = Number(resolverDividaMatch[1]);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return Response.json({ ok: false, error: 'Corpo da requisição precisa ser JSON válido.' }, { status: 400 });
      }
      const result = await resolverPendenciaDividaAtiva(env, {
        id,
        decisao: body.decisao,
        curador: body.curador,
      });
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    const rotaKey = `${request.method} ${url.pathname}`;
    const handler = ROTAS[rotaKey];
    if (handler) {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const result = await handler(request, env, url);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }

    return html404(render404(url.pathname));
}

export default {
  async fetch(request, env, ctx) {
    try {
      const resposta = await fetchInterno(request, env, ctx);
      // Medição (D14): conta visitas de páginas HTML públicas, sem cookie. Nunca atrasa a resposta.
      if (request.method === 'GET' && resposta.status === 200 && (resposta.headers.get('Content-Type') || '').startsWith('text/html')) {
        const p = new URL(request.url).pathname;
        if (!p.startsWith('/admin')) ctx.waitUntil(registrarVisita(env, request, p));
      }
      return resposta;
    } catch (e) {
      // Rede de segurança final — ver `paginaErroGenerico` acima. Qualquer rota que já tenha
      // seu próprio try/catch (ex.: `/`, `/buscar`, `/acompanhar`) nunca chega aqui; isso só
      // pega o que ainda não foi especificamente tratado.
      console.error('Erro não tratado no fetch:', e);
      const url = new URL(request.url);
      return new Response(paginaErroGenerico(url.pathname), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  },

  /**
   * event.cron identifica qual expressão cron disparou.
   *
   * ATUALIZADO em 18/09/2026 (auditoria de continuidade) — duas mudanças importantes em
   * relação à versão original deste handler:
   *
   *  1) ISOLAMENTO POR COLETOR: antes, os coletores rodavam em sequência com um único
   *     try/catch implícito (nenhum) — se coletarCandidatos (TSE) lançasse uma exceção não
   *     capturada (comum: o CDN do TSE bloqueia parte do tráfego vindo da rede da Cloudflare
   *     com HTTP 403, de forma intermitente), TODOS os coletores seguintes (Câmara, Senado)
   *     nunca chegavam a rodar. Isso foi confirmado em produção: o cron nem sequer estava
   *     registrado na Cloudflare desde o deploy original (bug separado, também corrigido em
   *     18/09), e as poucas execuções manuais de teste que rodaram TSE primeiro nunca
   *     chegaram aos coletores de Câmara/Senado. Agora cada coletor roda dentro do seu
   *     próprio try/catch: uma falha em um nunca impede os demais de rodar.
   *
   *  2) TSE tratado como "melhor esforço": candidatos/redes sociais/bens do TSE continuam
   *     tentando rodar automaticamente (não custa nada tentar), mas a carga inicial de
   *     volume e as atualizações de rotina do TSE são feitas manualmente (baixar o ZIP do
   *     navegador + aplicar direto no D1 via API) — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md.
   *     Isso porque, além do bloqueio intermitente, processar o ZIP nacional inteiro numa
   *     única invocação do Worker estoura o limite de subrequests/CPU (confirmado: execuções
   *     ficavam presas em "em_execucao" para sempre). Não vale reengenhar isso agora — o
   *     caminho manual já comprovou que funciona rápido e sem esses limites.
   *
   *  3) CADÊNCIA REDUZIDA: de 4x/dia para 1x/dia (ver wrangler.toml) — o plano free do D1 tem
   *     um teto diário de linhas escritas, e rodar a sequência completa várias vezes ao dia
   *     não traz benefício real (os dados de Câmara/Senado não mudam tão rápido) e aumenta o
   *     risco de estourar a cota no meio de uma coleta importante.
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        async function rodar(nome, fn) {
          try {
            const resultado = await fn();
            console.log(`${nome}:`, JSON.stringify(resultado));
            return resultado;
          } catch (e) {
            console.log(`${nome}: ERRO NÃO CAPTURADO —`, String(e?.message || e));
            return { ok: false, error: String(e?.message || e) };
          }
        }

        // TSE — melhor esforço; nunca bloqueia os coletores abaixo (ver nota acima).
        await rodar('coletarCandidatos', () => coletarCandidatos(env, 2026));
        await rodar('coletarRedesSociais', () => coletarRedesSociais(env, 2026));
        await rodar('coletarBensCandidatos', () => coletarBensCandidatos(env, 2026));

        // Câmara + Senado — sem bloqueio conhecido, roda de forma confiável.
        await rodar('coletarDeputados', () => coletarDeputados(env, 57));
        await rodar('coletarSenadores', () => coletarSenadores(env));
        await rodar('cruzarSenadoresComTse', () => cruzarSenadoresComTse(env));
        await rodar('coletarProposicoes', () => coletarProposicoes(env, 2026));

        const fim = ymd(new Date());
        const inicio = ymd(new Date(Date.now() - 3 * 24 * 3600 * 1000));
        await rodar('coletarVotacoes (Câmara)', () => coletarVotacoes(env, inicio, fim));
        await rodar('coletarVotacoesSenado', () => coletarVotacoesSenado(env));

        // Clipping mensal (seção 33, 24/09/2026) — só tenta processar nos primeiros dias do mês;
        // a coluna ultimo_clipping_checado já torna isso idempotente, mas restringir a janela evita
        // rodar essa consulta todo santo dia à toa e deixa o comportamento previsível pro Rodrigo.
        const diaDoMes = new Date().getUTCDate();
        if (diaDoMes <= 5) {
          await rodar('processarClippingsMensais', () =>
            processarClippingsMensais(env, {
              origem: 'https://votocheck.com.br',
              dataAtualIso: fim,
              enviarEmail,
              emailClippingMensal,
            })
          );
        }
      })()
    );
  },
};
