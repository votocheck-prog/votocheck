/**
 * VotoCheck — Lógica de curadoria manual dos matches "a confirmar" da Dívida Ativa da União (PGFN)
 *
 * Espelha o padrão já usado em lib/curadoria.js (pendências Senado↔TSE), mas aqui a fonte de
 * pendências é `atributo_candidato` com `atributo_slug = 'divida_ativa_uniao_a_confirmar'` e
 * `status_id = 2` (em_acompanhamento) — gerado por scripts/importar_pgfn.mjs.
 *
 * REGRA DE OURO (não mudar sem confirmar com o Rodrigo de novo): nada aqui promove um match
 * automaticamente. `confirmarPendencia` só deve ser chamado depois de um humano checar o CPF
 * completo do candidato (via TSE) contra o registro da PGFN. Ver a coluna `valor` de cada
 * pendência — ela já tem o aviso completo e o resumo dos registros encontrados.
 */

/** Lista candidatos com dívida ativa "a confirmar" (status_id = 2), mais recentes primeiro. */
export async function listarPendenciasDividaAtiva(env) {
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT ac.id, ac.valor, ac.regra_publicada_url, ac.created_at,
              p.id as pessoa_id, p.nome_completo, p.nome_urna_atual,
              c.sg_uf, c.numero_urna, ca.nome as cargo_nome, pa.sigla as partido_sigla
       FROM atributo_candidato ac
       JOIN candidatura c ON c.id = ac.candidatura_id
       JOIN pessoa p ON p.id = c.pessoa_id
       JOIN cargo ca ON ca.id = c.cargo_id
       LEFT JOIN partido pa ON pa.id = c.partido_id
       WHERE ac.atributo_slug = 'divida_ativa_uniao_a_confirmar' AND ac.status_id = 2
       ORDER BY ac.created_at DESC`
    )
    .all();

  return { ok: true, pendencias: results || [], total: (results || []).length };
}

/**
 * Aplica a decisão do curador sobre um match "a confirmar":
 *   - decisao='confirmar': promove pra status_id=1 (confirmado). SÓ deve ser usado depois de
 *     checar o CPF completo do candidato via TSE contra o registro da PGFN.
 *   - decisao='descartar': apaga o registro (homônimo — o nome bateu mas não é a mesma pessoa).
 * Em ambos os casos grava uma linha em historico_alteracao para auditoria.
 */
export async function resolverPendenciaDividaAtiva(env, { id, decisao, curador }) {
  const db = env.DB;

  const row = await db
    .prepare(
      `SELECT id, valor FROM atributo_candidato WHERE id = ? AND atributo_slug = 'divida_ativa_uniao_a_confirmar' AND status_id = 2`
    )
    .bind(id)
    .first();
  if (!row) {
    return { ok: false, error: 'Pendência não encontrada (id inválido, já resolvida, ou não é uma pendência de dívida ativa).' };
  }

  if (decisao === 'confirmar') {
    // O texto gerado por importar_pgfn.mjs é escrito pra fase de REVISÃO — ou "aguardando
    // confirmação manual..." (match só por nome) ou "CPF CONFERIDO AUTOMATICAMENTE..." (24/09/2026,
    // quando o cruzamento de CPF via TSE já bateu). Ao confirmar, troca qualquer um dos dois pela
    // mesma frase de estado confirmado — senão a página pública ficaria com linguagem de "ainda
    // em revisão" numa coisa que já foi confirmada.
    const avisoRevisao = / (?:AGUARDANDO CONFIRMAÇÃO MANUAL|CPF CONFERIDO AUTOMATICAMENTE) — .*$/s;
    const valorPublico = row.valor.replace(
      avisoRevisao,
      ' Confirmado manualmente pela equipe do VotoCheck após checagem do CPF completo do candidato via TSE.'
    );
    await db.prepare(`UPDATE atributo_candidato SET status_id = 1, valor = ? WHERE id = ?`).bind(valorPublico, id).run();
  } else if (decisao === 'descartar') {
    await db.prepare(`DELETE FROM atributo_candidato WHERE id = ?`).bind(id).run();
  } else {
    return { ok: false, error: "decisao deve ser 'confirmar' ou 'descartar'." };
  }

  await db
    .prepare(
      `INSERT INTO historico_alteracao (tabela_referencia, registro_id, campo, valor_anterior, valor_novo, motivo, origem)
       VALUES ('atributo_candidato', ?, 'divida_ativa_uniao_a_confirmar', '2', ?, ?, 'curadoria_manual')`
    )
    .bind(
      id,
      decisao === 'confirmar' ? '1' : 'excluido_homonimo',
      `Decisão de curadoria (${curador || 'curador não identificado'}) sobre dívida ativa PGFN: ${decisao}${
        decisao === 'confirmar' ? ' — CPF completo checado via TSE, confirmado.' : ' — homônimo, registro removido.'
      }`
    )
    .run();

  return { ok: true, decisao };
}
