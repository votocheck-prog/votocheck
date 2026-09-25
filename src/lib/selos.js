/**
 * VotoCheck — Selos automáticos do perfil: presença acima/abaixo da média e crescimento
 * patrimonial acima/abaixo da média — ambos comparados com quem exerce o MESMO cargo
 * ("mesmos companheiros"), expressos como desvio percentual. Critério confirmado pelo Rodrigo
 * (ver doc "Proposta: Quiz do Meu VotoCheck", seção "Presença e patrimônio").
 *
 * Saíram do quiz (perguntas 1 e 7 da proposta original) porque pedir que o usuário escolha um
 * corte percentual sem nenhuma referência geraria números arbitrários — em vez disso, o VotoCheck
 * calcula a comparação objetiva e mostra o selo pra todo mundo, sem depender de responder nada.
 * Isso também evita virar ranking: o selo é relativo a uma média objetiva, não a uma posição numa
 * lista (nunca "top 10% em presença", sempre "X% acima/abaixo da média de [cargo]").
 *
 * COBERTURA REAL HOJE (24/09/2026) — documentando pra não prometer o que os dados ainda não dão:
 *   - Presença: a tabela `presenca` está zerada (nenhum coletor a popula ainda — ver documento de
 *     continuidade, seção 32.6). O selo simplesmente não aparece até essa coleta existir.
 *   - Patrimônio: exige BENS_DECLARADOS de pelo menos 2 ciclos eleitorais da mesma pessoa pra
 *     calcular uma variação — hoje só o ciclo 2026 está carregado. O selo não aparece até o
 *     próximo ciclo (ou um histórico retroativo) ser importado.
 * As duas funções abaixo já ficam prontas pra funcionar assim que os dados existirem — não
 * precisam de nenhuma mudança de código quando isso acontecer.
 */

/** Desvio percentual relativo: quanto `proprio` está acima/abaixo de `media`, em %. Mesma fórmula
 *  usada pelos dois selos (ver nota no topo do arquivo). Retorna null quando não dá pra calcular
 *  (média zero/ausente) — nunca inventa um número. */
function desvioPercentual(proprio, media) {
  if (proprio === null || proprio === undefined) return null;
  if (media === null || media === undefined || media === 0) return null;
  return Math.round(((proprio - media) / Math.abs(media)) * 1000) / 10; // 1 casa decimal
}

/** Selo de presença: percentual de presença mais recente da pessoa vs. a média do mesmo cargo
 *  (só entre quem está em exercício — mandato.data_fim IS NULL). */
async function selosPresenca(env, { pessoaId, cargoId }) {
  const db = env.DB;
  const row = await db
    .prepare(
      `WITH presenca_recente AS (
         SELECT pessoa_id, percentual_presenca,
                ROW_NUMBER() OVER (PARTITION BY pessoa_id ORDER BY periodo_referencia DESC) as rn
         FROM presenca
         WHERE percentual_presenca IS NOT NULL
       )
       SELECT
         (SELECT percentual_presenca FROM presenca_recente WHERE pessoa_id = ?1 AND rn = 1) as propria,
         (SELECT AVG(pr.percentual_presenca)
          FROM presenca_recente pr
          JOIN mandato m ON m.pessoa_id = pr.pessoa_id AND m.data_fim IS NULL AND m.cargo_id = ?2
          WHERE pr.rn = 1) as media`
    )
    .bind(pessoaId, cargoId)
    .first();

  if (!row || row.propria === null || row.media === null) return null;
  const desvio = desvioPercentual(row.propria, row.media);
  if (desvio === null) return null;
  return { percentualPropio: row.propria, mediaCargo: row.media, desvioPct: desvio };
}

/** Selo de patrimônio: variação % de `bens_declarados_total` entre os dois ciclos mais recentes
 *  da mesma pessoa, comparada à variação % média entre pares do mesmo cargo. */
async function selosPatrimonio(env, { pessoaId, cargoId }) {
  const db = env.DB;
  const row = await db
    .prepare(
      `WITH candidaturas_cargo AS (
         SELECT pessoa_id, ano_eleicao, bens_declarados_total,
                ROW_NUMBER() OVER (PARTITION BY pessoa_id ORDER BY ano_eleicao DESC) as rn
         FROM candidatura
         WHERE cargo_id = ?1 AND bens_declarados_total IS NOT NULL AND bens_declarados_total > 0
       ),
       variacao_por_pessoa AS (
         SELECT c1.pessoa_id,
                (c1.bens_declarados_total - c2.bens_declarados_total) * 100.0 / c2.bens_declarados_total as variacao_pct
         FROM candidaturas_cargo c1
         JOIN candidaturas_cargo c2 ON c2.pessoa_id = c1.pessoa_id AND c2.rn = c1.rn + 1
         WHERE c1.rn = 1
       )
       SELECT
         (SELECT variacao_pct FROM variacao_por_pessoa WHERE pessoa_id = ?2) as propria,
         (SELECT AVG(variacao_pct) FROM variacao_por_pessoa) as media`
    )
    .bind(cargoId, pessoaId)
    .first();

  if (!row || row.propria === null || row.media === null) return null;
  const desvio = desvioPercentual(row.propria, row.media);
  if (desvio === null) return null;
  return { variacaoPropiaPct: row.propria, mediaCargoPct: row.media, desvioPct: desvio };
}

/**
 * Calcula os dois selos automáticos pra uma pessoa/cargo. Nunca lança exceção — uma falha em
 * qualquer uma das duas consultas só faz aquele selo específico não aparecer (mesmo padrão
 * defensivo já usado no resto do produto, ver src/index.js).
 */
export async function calcularSelos(env, { pessoaId, cargoId }) {
  if (!cargoId) return { presenca: null, patrimonio: null };
  const [presenca, patrimonio] = await Promise.all([
    selosPresenca(env, { pessoaId, cargoId }).catch((e) => {
      console.error('Falha em selosPresenca:', e);
      return null;
    }),
    selosPatrimonio(env, { pessoaId, cargoId }).catch((e) => {
      console.error('Falha em selosPatrimonio:', e);
      return null;
    }),
  ]);
  return { presenca, patrimonio };
}
