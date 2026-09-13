/**
 * VotoCheck — Lógica de curadoria manual de pendências de cruzamento de identidade
 *
 * Hoje a única fonte de pendências é o cruzamento Senado↔TSE (ver `collectors/senado.js`,
 * função `cruzarSenadoresComTse`), que registra em `historico_alteracao` os casos em que
 * nome+UF+data de nascimento coincidem com MAIS DE UMA candidatura do TSE — ambiguidade que
 * o coletor automático deliberadamente não resolve sozinho.
 *
 * Convenção usada para marcar uma pendência como aberta/resolvida (sem alterar o schema):
 *   - Pendência aberta:   historico_alteracao.campo = 'id_senado_cruzamento'
 *     (valor_anterior = JSON com dados do senador; valor_novo = JSON com array de candidatos)
 *   - Pendência resolvida: nova linha com campo = 'id_senado_cruzamento_resolvida', gravada
 *     com created_at posterior à linha de abertura — é isso que faz a pendência "desaparecer"
 *     da listagem de pendentes (ver query em listarPendencias).
 */

import { mesclarPessoas } from '../collectors/senado.js';

/** Lista pendências de cruzamento Senado↔TSE que ainda não têm decisão de curadoria. */
export async function listarPendencias(env) {
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT h.id, h.registro_id AS pessoa_id, h.valor_anterior, h.valor_novo, h.motivo, h.created_at
       FROM historico_alteracao h
       WHERE h.tabela_referencia = 'pessoa' AND h.campo = 'id_senado_cruzamento'
         AND NOT EXISTS (
           SELECT 1 FROM historico_alteracao h2
           WHERE h2.tabela_referencia = 'pessoa' AND h2.registro_id = h.registro_id
             AND h2.campo = 'id_senado_cruzamento_resolvida' AND h2.created_at >= h.created_at
         )
       ORDER BY h.created_at DESC`
    )
    .all();

  const pendencias = [];
  for (const row of results) {
    let dadosSenado = {};
    let candidatos = [];
    try {
      dadosSenado = JSON.parse(row.valor_anterior || '{}');
    } catch (e) {
      dadosSenado = {};
    }
    try {
      candidatos = JSON.parse(row.valor_novo || '[]');
    } catch (e) {
      candidatos = [];
    }

    // Enriquece cada candidato com dados atuais da candidatura (ano, UF, cargo) — o JSON
    // gravado no momento do cruzamento só tem pessoa_id/nome, para não engessar o registro
    // histórico caso a candidatura mude depois.
    const candidatosEnriquecidos = [];
    for (const cand of candidatos) {
      const candidaturas = await db
        .prepare(
          `SELECT c.ano_eleicao, c.sg_uf, c.nome_urna, c.numero_urna, cg.nome AS cargo_nome, p.nome_partido AS sigla_partido
           FROM candidatura c
           JOIN cargo cg ON cg.id = c.cargo_id
           LEFT JOIN partido p ON p.id = c.partido_id
           WHERE c.pessoa_id = ?
           ORDER BY c.ano_eleicao DESC`
        )
        .bind(cand.pessoa_id)
        .all();
      candidatosEnriquecidos.push({ ...cand, candidaturas: candidaturas.results });
    }

    pendencias.push({
      historico_id: row.id,
      pessoa_senado_id: row.pessoa_id,
      senado: dadosSenado,
      candidatos: candidatosEnriquecidos,
      motivo: row.motivo,
      criada_em: row.created_at,
    });
  }

  return { ok: true, pendencias, total: pendencias.length };
}

/**
 * Aplica a decisão do curador para uma pendência:
 *   - decisao='aceitar' + pessoaDestinoId: funde a pessoa do Senado com a candidatura escolhida
 *     (reusa a mesma lógica de mesclarPessoas do coletor automático, para manter consistência).
 *   - decisao='rejeitar': marca a pendência como resolvida sem fundir nenhuma pessoa (o senador
 *     permanece como está — a pendência simplesmente não reaparece na listagem).
 * Em ambos os casos, grava uma linha 'id_senado_cruzamento_resolvida' em historico_alteracao
 * com origem='curadoria_manual', para que a pendência não volte a aparecer e para haver
 * auditoria de quem/quando decidiu (curador é texto livre, informado pelo chamador).
 */
export async function resolverPendencia(env, { historicoId, decisao, pessoaDestinoId, curador }) {
  const db = env.DB;

  const pendenciaRow = await db
    .prepare(`SELECT registro_id AS pessoa_id, valor_novo FROM historico_alteracao WHERE id = ? AND campo = 'id_senado_cruzamento'`)
    .bind(historicoId)
    .first();
  if (!pendenciaRow) {
    return { ok: false, error: 'Pendência não encontrada (id inválido ou já não é uma pendência de cruzamento).' };
  }

  if (decisao === 'aceitar') {
    if (!pessoaDestinoId) {
      return { ok: false, error: "decisao='aceitar' requer pessoaDestinoId (o pessoa_id da candidatura do TSE escolhida)." };
    }
    let candidatosValidos = [];
    try {
      candidatosValidos = JSON.parse(pendenciaRow.valor_novo || '[]').map((c) => c.pessoa_id);
    } catch (e) {
      candidatosValidos = [];
    }
    if (!candidatosValidos.includes(Number(pessoaDestinoId))) {
      return { ok: false, error: `pessoaDestinoId ${pessoaDestinoId} não está entre os candidatos originalmente sugeridos para esta pendência (${candidatosValidos.join(',')}). Se a pessoa certa não está na lista, rejeite esta pendência e trate o merge manualmente pelo banco.` };
    }

    await mesclarPessoas(db, {
      pessoaOrigemId: pendenciaRow.pessoa_id,
      pessoaDestinoId: Number(pessoaDestinoId),
      motivo: `Curadoria manual (${curador || 'curador não identificado'}): pendência #${historicoId} resolvida como match aceito com pessoa_id=${pessoaDestinoId}.`,
    });
  } else if (decisao !== 'rejeitar') {
    return { ok: false, error: "decisao deve ser 'aceitar' ou 'rejeitar'." };
  }

  await db
    .prepare(
      `INSERT INTO historico_alteracao (tabela_referencia, registro_id, campo, valor_anterior, valor_novo, motivo, origem)
       VALUES ('pessoa', ?, 'id_senado_cruzamento_resolvida', ?, ?, ?, 'curadoria_manual')`
    )
    .bind(
      pendenciaRow.pessoa_id,
      String(historicoId),
      decisao === 'aceitar' ? String(pessoaDestinoId) : 'rejeitado_sem_fusao',
      `Decisão de curadoria (${curador || 'curador não identificado'}): ${decisao}${decisao === 'aceitar' ? ` — fundido com pessoa_id=${pessoaDestinoId}` : ' — nenhuma fusão aplicada, senador permanece como pessoa separada'}.`
    )
    .run();

  return { ok: true, decisao, pessoaDestinoId: decisao === 'aceitar' ? Number(pessoaDestinoId) : null };
}
