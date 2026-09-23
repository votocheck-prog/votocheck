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
import { renderHomepage, renderResultados } from './lib/busca_html.js';
import { renderPerfil, renderNaoEncontrado } from './lib/perfil_html.js';
import { renderSobre } from './lib/sobre_html.js';
import { renderCargoPagina, GUIA_CARGOS } from './lib/cargos_guia.js';
import { renderTermos, renderFaq } from './lib/institucional_html.js';
import { renderPartidos, PARTIDOS_INFO } from './lib/partidos_html.js';
import { renderJudiciario } from './lib/judiciario_html.js';
import { criarAcompanhamento, cancelarPorToken } from './lib/acompanhamento.js';
import { emailConfirmacaoAcompanhamento } from './lib/acompanhamento_email.js';
import { enviarEmail } from './lib/email.js';
import { render404, pagina, SITE_URL } from './lib/estilo_html.js';
import { FAVICON_32_B64, FAVICON_180_B64, OG_IMAGE_B64 } from './lib/assets_data.js';

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
 * Pra cada sigla em PARTIDOS_INFO, busca até 10 candidaturas de 2026 em ordem alfabética
 * (critério neutro — nunca "principais" no sentido de mérito, ver nota em partidos_html.js).
 * Retorna um objeto { [sigla]: [{pessoa_id, nome_urna_atual, cargo_nome, sg_uf}, ...] }.
 */
async function carregarRepresentantesPorPartido(env, ctx) {
  const cache = caches.default;
  const cacheado = await cache.match(CACHE_KEY_PARTIDOS);
  if (cacheado) return cacheado.json();

  const db = env.DB;
  const siglas = PARTIDOS_INFO.map((p) => p.sigla);
  const placeholders = siglas.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT pessoa_id, nome_urna_atual, cargo_nome, sg_uf, sigla FROM (
         SELECT c.pessoa_id, p.nome_urna_atual, ca.nome as cargo_nome, c.sg_uf, pa.sigla,
                ROW_NUMBER() OVER (PARTITION BY pa.sigla ORDER BY p.nome_urna_atual ASC) as rn
         FROM candidatura c
         JOIN pessoa p ON p.id = c.pessoa_id
         JOIN cargo ca ON ca.id = c.cargo_id
         JOIN partido pa ON pa.id = c.partido_id
         WHERE c.ano_eleicao = ? AND pa.sigla IN (${placeholders})
       ) WHERE rn <= 10
       ORDER BY sigla, nome_urna_atual`
    )
    .bind(ANO_ATUAL, ...siglas)
    .all();

  const porSigla = {};
  for (const row of results || []) {
    if (!porSigla[row.sigla]) porSigla[row.sigla] = [];
    porSigla[row.sigla].push(row);
  }

  const resposta = new Response(JSON.stringify(porSigla), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL_CACHE_STATS_SEGUNDOS}` },
  });
  ctx.waitUntil(cache.put(CACHE_KEY_PARTIDOS, resposta));

  return porSigla;
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      const stats = await estatisticasHomepageComCache(env, ctx);
      return html(renderHomepage(stats));
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
      if (q) {
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

      const [{ results }, contagem] = await Promise.all([
        db
          .prepare(
            `SELECT c.pessoa_id, p.nome_completo, p.nome_urna_atual, p.foto_url, p.data_nascimento,
                    ca.nome as cargo_nome, c.sg_uf, c.numero_urna, c.situacao_candidatura, c.situacao_totalizacao_turno,
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

      return html(
        renderResultados({
          q,
          cargo,
          uf,
          ordenar,
          resultados: results || [],
          totalResultados: contagem?.total || 0,
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
      return html(renderPartidos({ representantesPorSigla }));
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

    if (url.pathname === '/favicon.ico' && request.method === 'GET') {
      return imagemPng(FAVICON_32_B64);
    }

    if (url.pathname === '/apple-touch-icon.png' && request.method === 'GET') {
      return imagemPng(FAVICON_180_B64);
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

      const [candidaturasRes, mandatosRes, filiacoesRes] = await Promise.all([
        db
          .prepare(
            `SELECT c.*, ca.nome as cargo_nome, pa.sigla as partido_sigla, pa.nome as partido_nome,
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
      ]);

      return html(
        renderPerfil({
          pessoa,
          candidaturas: candidaturasRes.results || [],
          mandatos: mandatosRes.results || [],
          filiacoes: filiacoesRes.results || [],
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

    const rotaKey = `${request.method} ${url.pathname}`;
    const handler = ROTAS[rotaKey];
    if (handler) {
      if (!requireAdminToken(request, env)) return new Response('Unauthorized', { status: 401 });
      const result = await handler(request, env, url);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }

    return html404(render404(url.pathname));
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
      })()
    );
  },
};
