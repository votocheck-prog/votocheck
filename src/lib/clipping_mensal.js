/**
 * VotoCheck — Dados do "clipping mensal" (resumo de atuação enviado a quem acompanha um
 * Representante Público — ver acompanhamento_email.js e o bloco de envio em index.js/scheduled()).
 *
 * Criado em 24/09/2026 (seção 33), a pedido do Rodrigo: "mensalmente vamos mandar também um
 * clipping das principais ações que os políticos estão fazendo ou deixando de fazer".
 *
 * REGRA MAIS IMPORTANTE DESTE ARQUIVO: ausência de dado NUNCA vira "não fez nada". Hoje só temos
 * `voto_parlamentar` e `presenca` — e só pra quem já é deputado federal/senador em exercício, e só
 * pros períodos que os coletores já rodaram. Um candidato sem mandato, ou um período que ainda não
 * foi coletado, produz `null` aqui — e `null` significa "não mandar e-mail este mês", nunca "sem
 * atuação". Tratar lacuna de coleta como inação seria uma acusação falsa contra a pessoa, o oposto
 * do que o VotoCheck se propõe a fazer. Ver Mapa Mestre / regra de nunca inferir o que não foi
 * verificado (mesmo princípio já aplicado em perfil_html.js e divida_ativa.js).
 *
 * `anoMes` é sempre 'YYYY-MM' — mesmo formato usado em presenca.periodo_referencia.
 */

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** 'YYYY-MM' → 'agosto de 2026'. */
export function mesReferenciaLabel(anoMes) {
  const [ano, mes] = String(anoMes).split('-').map(Number);
  const nome = NOMES_MES[(mes || 1) - 1] || anoMes;
  return `${nome} de ${ano}`;
}

/** 'YYYY-MM-DD' (data atual) → 'YYYY-MM' do mês anterior — o período que já fechou e pode ser resumido. */
export function mesAnteriorDe(dataIso) {
  const d = new Date(`${dataIso.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

/**
 * Monta o conteúdo do clipping de `pessoaId` pra `anoMes`. Retorna `null` quando não há NENHUM
 * dado real pro período (nem voto, nem presença) — quem chama deve interpretar isso como "ainda
 * não dá pra dizer nada com evidência", não como "não fez nada".
 */
export async function montarClippingMensal(env, { pessoaId, anoMes }) {
  const db = env.DB;

  const votosRes = await db
    .prepare(
      `SELECT v.casa, v.data_votacao, v.descricao, v.url_origem, vp.voto
       FROM voto_parlamentar vp
       JOIN votacao v ON v.id = vp.votacao_id
       WHERE vp.pessoa_id = ? AND substr(v.data_votacao, 1, 7) = ?
       ORDER BY v.data_votacao DESC
       LIMIT 20`
    )
    .bind(pessoaId, anoMes)
    .all();

  const presencaRow = await db
    .prepare(
      `SELECT percentual_presenca, total_sessoes, total_presencas
       FROM presenca
       WHERE pessoa_id = ? AND periodo_referencia = ? AND status_id = 2`
    )
    .bind(pessoaId, anoMes)
    .first();

  const votos = (votosRes.results || []).map((v) => ({
    casa: v.casa,
    data: v.data_votacao,
    descricao: v.descricao,
    voto: v.voto,
    urlOrigem: v.url_origem,
  }));

  const presenca = presencaRow
    ? {
        percentual: presencaRow.percentual_presenca,
        totalSessoes: presencaRow.total_sessoes,
        totalPresencas: presencaRow.total_presencas,
      }
    : null;

  if (!votos.length && !presenca) {
    return null; // sem dado real pro período — nunca mandar e-mail nesse caso (ver comentário acima)
  }

  return { votos, presenca };
}

/**
 * Roda o clipping mensal pra todos os acompanhamentos ativos, uma vez por mês. Chamado a partir de
 * `scheduled()` em index.js, já dentro de um `ctx.waitUntil`. Nunca lança — cada acompanhamento é
 * isolado (um erro num não derruba os outros), e todo o processamento é best-effort igual ao resto
 * do envio de e-mail (ver lib/email.js).
 *
 * Guarda de segurança: só processa acompanhamentos com pelo menos `IDADE_MINIMA_DIAS` dias, pra
 * nunca mandar um "resumo mensal" pra quem acabou de se inscrever ontem.
 */
const IDADE_MINIMA_DIAS = 20;

export async function processarClippingsMensais(env, { origem, dataAtualIso, enviarEmail, emailClippingMensal }) {
  const db = env.DB;
  const anoMesAlvo = mesAnteriorDe(dataAtualIso);

  const pendentes = await db
    .prepare(
      `SELECT a.id, a.email, a.pessoa_id, a.token_cancelamento
       FROM acompanhamento a
       WHERE a.ativo = 1
         AND (a.ultimo_clipping_checado IS NULL OR a.ultimo_clipping_checado != ?)
         AND julianday(?) - julianday(a.criado_em) >= ?`
    )
    .bind(anoMesAlvo, dataAtualIso, IDADE_MINIMA_DIAS)
    .all();

  const linhas = pendentes.results || [];
  let nEnviados = 0;
  let nSemDado = 0;
  let nErro = 0;

  for (const linha of linhas) {
    try {
      const pessoa = await db
        .prepare(
          `SELECT p.nome_urna_atual, ca.nome as cargo_nome, c.sg_uf
           FROM pessoa p
           LEFT JOIN candidatura c ON c.pessoa_id = p.id
           LEFT JOIN cargo ca ON ca.id = c.cargo_id
           WHERE p.id = ?
           ORDER BY c.ano_eleicao DESC
           LIMIT 1`
        )
        .bind(linha.pessoa_id)
        .first();

      const dados = await montarClippingMensal(env, { pessoaId: linha.pessoa_id, anoMes: anoMesAlvo });

      if (!dados) {
        nSemDado++;
        await db
          .prepare(`UPDATE acompanhamento SET ultimo_clipping_checado = ? WHERE id = ?`)
          .bind(anoMesAlvo, linha.id)
          .run();
        continue;
      }

      const { subject, html, text } = emailClippingMensal({
        nomeRepresentante: pessoa?.nome_urna_atual,
        cargoNome: pessoa?.cargo_nome,
        ufSigla: pessoa?.sg_uf,
        mesReferenciaLabel: mesReferenciaLabel(anoMesAlvo),
        votos: dados.votos,
        presenca: dados.presenca,
        linkPerfil: `${origem}/candidato/${linha.pessoa_id}`,
        tokenCancelamento: linha.token_cancelamento,
        origem,
      });

      const resultado = await enviarEmail(env, { to: linha.email, subject, html, text });
      if (resultado.ok) {
        nEnviados++;
        await db
          .prepare(`UPDATE acompanhamento SET ultimo_clipping_checado = ? WHERE id = ?`)
          .bind(anoMesAlvo, linha.id)
          .run();
      } else {
        // não marca como checado — tenta de novo no próximo disparo do cron dentro do mesmo mês
        nErro++;
      }
    } catch (e) {
      nErro++;
      console.log(`processarClippingsMensais: erro no acompanhamento ${linha.id} —`, String(e?.message || e));
    }
  }

  return { anoMesAlvo, total: linhas.length, nEnviados, nSemDado, nErro };
}
