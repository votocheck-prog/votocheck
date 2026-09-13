/**
 * VotoCheck — Worker principal
 *
 * Rotas HTTP (para disparo manual/teste — protegidas por ADMIN_TOKEN quando configurado):
 *   GET  /                                     → landing page provisória (pública)
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
import { LANDING_HTML } from './lib/landing_html.js';

function requireAdminToken(request, env) {
  if (!env.ADMIN_TOKEN) return true; // sem token configurado = sem proteção (apenas dev local)
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

/** Formata uma data JS como YYYY-MM-DD (fuso UTC, suficiente para janelas de coleta diária). */
function ymd(date) {
  return date.toISOString().slice(0, 10);
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
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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

    return new Response('Not found', { status: 404 });
  },

  /**
   * event.cron identifica qual expressão cron disparou (útil quando há múltiplos horários
   * configurados em wrangler.toml para coletores diferentes). Por padrão, roda a sequência
   * completa de coleta na ordem que respeita as dependências:
   *   1) candidatos (base para bens/redes sociais, que fazem JOIN por sq_candidato_tse)
   *   2) redes sociais + bens (dependem de candidatos já existirem)
   *   3) deputados + senadores (independentes do TSE)
   *   4) cruzamento senado↔TSE por nome+UF+data de nascimento (heurístico, conservador —
   *      só funde pessoa quando há exatamente uma candidatura TSE compatível; ambiguidades
   *      ficam registradas em historico_alteracao para curadoria manual, nunca fundidas)
   *   5) proposições + votações (dependem de deputados/senadores já sincronizados para
   *      resolver o voto individual de cada pessoa_id)
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const candidatos = await coletarCandidatos(env, 2026);
        console.log('coletarCandidatos:', JSON.stringify(candidatos));

        const redes = await coletarRedesSociais(env, 2026);
        console.log('coletarRedesSociais:', JSON.stringify(redes));

        const bens = await coletarBensCandidatos(env, 2026);
        console.log('coletarBensCandidatos:', JSON.stringify(bens));

        const deputados = await coletarDeputados(env, 57);
        console.log('coletarDeputados:', JSON.stringify(deputados));

        const senadores = await coletarSenadores(env);
        console.log('coletarSenadores:', JSON.stringify(senadores));

        const cruzamentoSenadoTse = await cruzarSenadoresComTse(env);
        console.log('cruzarSenadoresComTse:', JSON.stringify(cruzamentoSenadoTse));

        const proposicoes = await coletarProposicoes(env, 2026);
        console.log('coletarProposicoes:', JSON.stringify(proposicoes));

        const fim = ymd(new Date());
        const inicio = ymd(new Date(Date.now() - 3 * 24 * 3600 * 1000));
        const votacoesCamara = await coletarVotacoes(env, inicio, fim);
        console.log('coletarVotacoes (Câmara):', JSON.stringify(votacoesCamara));

        const votacoesSenado = await coletarVotacoesSenado(env);
        console.log('coletarVotacoesSenado:', JSON.stringify(votacoesSenado));
      })()
    );
  },
};
