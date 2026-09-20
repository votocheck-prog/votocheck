/**
 * VotoCheck — Coletor Senado Federal (legis.senado.leg.br/dadosabertos)
 *
 * Testado e confirmado acessível a partir do sandbox de desenvolvimento (sem bloqueio).
 *
 * ATENÇÃO — a API do Senado tem duas gerações de endpoints coexistindo:
 *   - Endpoints legados (`/senador/{codigo}/autorias`, `/senador/{codigo}/votacoes`) retornam
 *     um JSON com formato de XML convertido (namespaces, PascalCase) e estão marcados como
 *     DESCONTINUADOS (a própria API retorna `Descontinuacao.DataDesativacaoCompleta` já vencida).
 *   - Endpoints novos (`/processo`, `/votacao`) retornam JSON limpo (camelCase) e são os
 *     recomendados pela própria documentação como substitutos. Este coletor usa os novos.
 *   - `/senador/lista/atual` (lista de senadores em exercício) segue no formato legado e não tem
 *     substituto documentado — mantido como está, é o único caminho para a lista básica.
 *
 * Endpoints usados:
 *   GET /senador/lista/atual                          → lista de senadores em exercício (legado, sem substituto)
 *   GET /processo?senador={codigo}&itens=N             → matérias de autoria do senador (substitui /autorias)
 *   GET /votacao?senador={codigo}                       → votações nominais do senador, com voto de TODOS
 *                                                          os presentes embutido em cada item (campo `votos`)
 */

const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';

async function fetchJson(url, tentativa = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ao buscar ${url}`);
    return await resp.json();
  } catch (err) {
    if (tentativa < 4) {
      await new Promise((r) => setTimeout(r, 1000 * tentativa));
      return fetchJson(url, tentativa + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureFonteSenado(db) {
  const existing = await db.prepare(`SELECT id FROM fonte WHERE nome = ?`).bind('Senado Federal').first();
  if (existing) return existing.id;
  const res = await db
    .prepare(`INSERT INTO fonte (nome, tipo, url_base, descricao) VALUES (?, ?, ?, ?)`)
    .bind('Senado Federal', 'institucional_oficial', 'https://legis.senado.leg.br/dadosabertos', 'Dados abertos oficiais do Senado Federal')
    .run();
  return res.meta.last_row_id;
}

async function ensurePartido(db, sigla) {
  if (!sigla) return null;
  const existing = await db.prepare(`SELECT id FROM partido WHERE sigla = ?`).bind(sigla).first();
  if (existing) return existing.id;
  const res = await db.prepare(`INSERT INTO partido (sigla, nome) VALUES (?, ?)`).bind(sigla, sigla).run();
  return res.meta.last_row_id;
}

async function sha256Hex(value) {
  if (!value) return null;
  const enc = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normaliza nome de pessoa para comparação: maiúsculas, sem acento, sem pontuação,
 * espaços colapsados.
 */
function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chave de comparação tolerante a reordenação/omissão de nomes do meio: normaliza e ordena
 * os tokens alfabeticamente. Usada apenas como sinal auxiliar (ver `pontuarMatchNome`) —
 * nunca sozinha, para não casar por acaso duas pessoas com os mesmos sobrenomes comuns.
 */
function chaveTokensOrdenados(nome) {
  return normalizarNome(nome).split(' ').filter(Boolean).sort().join(' ');
}

/**
 * Compara dois nomes completos e retorna um nível de confiança:
 *   'exato'   — string normalizada idêntica
 *   'tokens'  — mesmo conjunto de tokens, ordem diferente (ex.: nome do meio omitido/reordenado)
 *   'nenhum'  — sem correspondência
 * Só 'exato' ou 'tokens' + demais critérios (UF, data nasc.) formam match automático —
 * ver comentário em cruzarSenadoresComTse.
 */
function compararNomes(nomeA, nomeB) {
  const a = normalizarNome(nomeA);
  const b = normalizarNome(nomeB);
  if (!a || !b) return 'nenhum';
  if (a === b) return 'exato';
  if (chaveTokensOrdenados(nomeA) === chaveTokensOrdenados(nomeB)) return 'tokens';
  return 'nenhum';
}

/**
 * Normaliza data de nascimento para o formato ISO YYYY-MM-DD, aceitando tanto o formato
 * do TSE (DD/MM/YYYY) quanto o formato já-ISO do Senado (YYYY-MM-DD ou com timestamp).
 */
function normalizarData(data) {
  if (!data) return null;
  const str = String(data).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return null;
}

/** Sincroniza a lista de senadores em exercício. id_senado é a chave de cruzamento para os demais endpoints. */
export async function coletarSenadores(env) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('senado_senadores', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;
  const erros = [];

  try {
    const fonteId = await ensureFonteSenado(db);
    const json = await fetchJson(`${SENADO_BASE}/senador/lista/atual`);
    const lista = json?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
    const cargoSenador = await db.prepare(`SELECT id FROM cargo WHERE slug = 'senador'`).first();

    for (const item of Array.isArray(lista) ? lista : [lista]) {
      lidos++;
      try {
        const ident = item.IdentificacaoParlamentar;
        const mandatoInfo = item.Mandato;
        const codigoSenado = ident.CodigoParlamentar;
        const partidoId = await ensurePartido(db, ident.SiglaPartidoParlamentar);

        let pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE id_senado = ?`).bind(String(codigoSenado)).first();
        let pessoaId;
        if (pessoaRow) {
          pessoaId = pessoaRow.id;
          await db
            .prepare(
              `UPDATE pessoa SET nome_completo=?, nome_urna_atual=?, genero=?, id_senado=?, foto_url=?, updated_at=datetime('now') WHERE id=?`
            )
            .bind(
              ident.NomeCompletoParlamentar || ident.NomeParlamentar, ident.NomeParlamentar,
              ident.SexoParlamentar === 'Masculino' ? 'M' : 'F', String(codigoSenado), ident.UrlFotoParlamentar, pessoaId
            )
            .run();
        } else {
          const res = await db
            .prepare(
              `INSERT INTO pessoa (nome_completo, nome_urna_atual, genero, id_senado, foto_url, status_id)
               VALUES (?, ?, ?, ?, ?, 2)`
            )
            .bind(
              ident.NomeCompletoParlamentar || ident.NomeParlamentar, ident.NomeParlamentar,
              ident.SexoParlamentar === 'Masculino' ? 'M' : 'F', String(codigoSenado), ident.UrlFotoParlamentar
            )
            .run();
          pessoaId = res.meta.last_row_id;
        }

        const mandatoExistente = await db
          .prepare(`SELECT id FROM mandato WHERE pessoa_id = ? AND cargo_id = ? AND sg_uf = ?`)
          .bind(pessoaId, cargoSenador.id, ident.UfParlamentar)
          .first();

        const dataInicio = mandatoInfo?.PrimeiraLegislaturaDoMandato?.DataInicio || null;
        const dataFim = mandatoInfo?.SegundaLegislaturaDoMandato?.DataFim || mandatoInfo?.PrimeiraLegislaturaDoMandato?.DataFim || null;

        if (mandatoExistente) {
          await db
            .prepare(`UPDATE mandato SET data_inicio=?, data_fim=?, situacao=?, fonte_id=?, updated_at=datetime('now') WHERE id=?`)
            .bind(dataInicio, dataFim, 'Em exercício', fonteId, mandatoExistente.id)
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO mandato (pessoa_id, cargo_id, sg_uf, data_inicio, data_fim, situacao, status_id, fonte_id)
               VALUES (?, ?, ?, ?, ?, ?, 2, ?)`
            )
            .bind(pessoaId, cargoSenador.id, ident.UfParlamentar, dataInicio, dataFim, 'Em exercício', fonteId)
            .run();
        }

        if (partidoId) {
          const filiacaoAtiva = await db
            .prepare(`SELECT id FROM filiacao_partidaria WHERE pessoa_id = ? AND partido_id = ? AND data_fim IS NULL`)
            .bind(pessoaId, partidoId)
            .first();
          if (!filiacaoAtiva) {
            await db
              .prepare(`INSERT INTO filiacao_partidaria (pessoa_id, partido_id, status_id, fonte_id) VALUES (?, ?, 2, ?)`)
              .bind(pessoaId, partidoId, fonteId)
              .run();
          }
        }

        gravados++;
      } catch (e) {
        comErro++;
        if (erros.length < 20) erros.push(`senador: ${e.message}`);
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(comErro > 0 ? 'falha_parcial' : 'sucesso', lidos, gravados, comErro, erros.join(' | ') || null, execucaoId)
      .run();

    return { ok: true, lidos, gravados, comErro, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}

/**
 * Coleta votações nominais de todos os senadores atualmente sincronizados, num período.
 * Usa /votacao?senador={codigo} — cada resultado já traz o array `votos` com o voto de
 * TODOS os presentes na sessão, não só do senador consultado; por isso gravamos todos de uma vez
 * e evitamos reprocessar a mesma votação (id = codigoSessaoVotacao) mais de uma vez.
 */
/**
 * @param {string|null} dataMinima - "AAAA-MM-DD" opcional. A API do Senado não aceita filtro de
 *   data (sempre retorna o histórico da sessão legislativa por senador), então o filtro é aplicado
 *   aqui mesmo, depois de buscar — não reduz o número de chamadas à API, só o que é gravado no D1.
 */
export async function coletarVotacoesSenado(env, dataMinima = null) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('senado_votacoes', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let votacoesGravadas = 0;
  let votosGravados = 0;
  let comErro = 0;
  const erros = [];
  const votacoesProcessadas = new Set();

  try {
    const fonteId = await ensureFonteSenado(db);
    const { results: senadores } = await db.prepare(`SELECT id, id_senado FROM pessoa WHERE id_senado IS NOT NULL`).all();

    // Pré-carrega id_senado -> pessoa.id e proposicao(casa=senado).id_externo -> id uma única vez,
    // em vez de 1 SELECT por voto individual e 1 SELECT por votação (mesmo ganho aplicado em
    // coletarVotacoes/camara.js — ver comentário lá pro porquê).
    const pessoaPorIdSenado = new Map(senadores.map((s) => [String(s.id_senado), s.id]));
    const { results: propRows } = await db.prepare(`SELECT id, id_externo FROM proposicao WHERE casa='senado'`).all();
    const proposicaoPorIdExterno = new Map(propRows.map((p) => [String(p.id_externo), p.id]));

    const TAMANHO_LOTE_VOTOS = 30;

    for (const senador of senadores) {
      lidos++;
      try {
        const lista = await fetchJson(`${SENADO_BASE}/votacao?senador=${senador.id_senado}`);
        for (const vot of Array.isArray(lista) ? lista : []) {
          const idVotacao = String(vot.codigoSessaoVotacao);
          if (votacoesProcessadas.has(idVotacao)) continue;
          votacoesProcessadas.add(idVotacao);
          if (dataMinima && vot.dataSessao && vot.dataSessao < dataMinima) continue;

          let proposicaoId = null;
          if (vot.codigoMateria) {
            const chave = String(vot.codigoMateria);
            proposicaoId = proposicaoPorIdExterno.get(chave) || null;
            if (!proposicaoId) {
              const propRes = await db
                .prepare(
                  `INSERT INTO proposicao (casa, id_externo, sigla_tipo, numero, ano, ementa, fonte_id)
                   VALUES ('senado', ?, ?, ?, ?, ?, ?) RETURNING id`
                )
                .bind(chave, vot.sigla, vot.numero, vot.ano, vot.ementa, fonteId)
                .first();
              proposicaoId = propRes.id;
              proposicaoPorIdExterno.set(chave, proposicaoId);
            }
          }

          const votacaoRes = await db
            .prepare(
              `INSERT INTO votacao (casa, id_externo, proposicao_id, data_votacao, descricao, resultado, votos_sim, votos_nao, votos_abstencao, fonte_id)
               VALUES ('senado', ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(casa, id_externo) DO UPDATE SET descricao=excluded.descricao
               RETURNING id`
            )
            .bind(
              idVotacao, proposicaoId, vot.dataSessao, vot.descricaoVotacao, vot.resultadoVotacao,
              vot.totalVotosSim, vot.totalVotosNao, vot.totalVotosAbstencao, fonteId
            )
            .first();
          const votacaoId = votacaoRes.id;
          votacoesGravadas++;

          const linhas = [];
          for (const v of vot.votos || []) {
            const pessoaId = pessoaPorIdSenado.get(String(v.codigoParlamentar));
            if (!pessoaId) continue;
            if (!v.siglaVotoParlamentar) continue; // mesmo caso do coletor da Câmara — ver comentário lá
            linhas.push([votacaoId, pessoaId, v.siglaVotoParlamentar]);
          }
          for (let i = 0; i < linhas.length; i += TAMANHO_LOTE_VOTOS) {
            const lote = linhas.slice(i, i + TAMANHO_LOTE_VOTOS);
            const placeholders = lote.map(() => '(?,?,?)').join(',');
            try {
              await db
                .prepare(
                  `INSERT INTO voto_parlamentar (votacao_id, pessoa_id, voto) VALUES ${placeholders}
                   ON CONFLICT(votacao_id, pessoa_id) DO UPDATE SET voto=excluded.voto`
                )
                .bind(...lote.flat())
                .run();
              votosGravados += lote.length;
            } catch (e) {
              comErro++;
              if (erros.length < 20) erros.push(`votacao ${idVotacao} lote ${i}: ${e.message}`);
            }
          }
        }
      } catch (e) {
        comErro++;
        if (erros.length < 20) erros.push(`senador ${senador.id_senado}: ${e.message}`);
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(comErro > 0 ? 'falha_parcial' : 'sucesso', lidos, votacoesGravadas + votosGravados, comErro, erros.join(' | ') || null, execucaoId)
      .run();

    return { ok: true, lidos, votacoesGravadas, votosGravados, comErro, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}

/**
 * Cruza senadores (pessoa.id_senado IS NOT NULL) com candidaturas do TSE que ainda NÃO
 * possuem id_senado preenchido, tentando identificar se a mesma pessoa já é conhecida por
 * ter sido candidata em alguma eleição registrada pelo TSE.
 *
 * Por que este cruzamento existe: o Senado não expõe CPF em nenhum endpoint público testado
 * (ver README), então não é possível reaproveitar o cpf_hash como chave de deduplicação
 * (como fazemos com a Câmara). O critério aqui é heurístico — nome + UF + data de nascimento —
 * e por isso é deliberadamente conservador:
 *
 *   1. Nome: 'exato' (idêntico após normalização) ou 'tokens' (mesmo conjunto de tokens,
 *      cobre nomes do meio reordenados/abreviados) — nunca aceita nomes apenas parecidos.
 *   2. UF: compara a UF do mandato de senador com a sg_uf da candidatura do TSE.
 *   3. Data de nascimento: compara em formato ISO normalizado (aceita DD/MM/YYYY do TSE e
 *      YYYY-MM-DD do Senado); exige igualdade exata.
 *
 * Só é considerado MATCH AUTOMÁTICO quando os três critérios batem para EXATAMENTE UMA
 * pessoa candidata do TSE. Qualquer ambiguidade (nenhuma pessoa compatível, ou mais de uma)
 * é registrada em historico_alteracao com origem='coletor_automatico' e um motivo que
 * deixa claro que é uma pendência para curadoria manual — nenhuma fusão é feita nesses casos,
 * para não arriscar atribuir bens/declarações/candidaturas de uma pessoa a outra.
 *
 * Quando dá match automático, as duas linhas de pessoa são unificadas: a linha do TSE
 * (que já tem candidaturas, bens, etc. dependentes via FK) é preservada, recebe id_senado e
 * os demais campos do Senado (foto, se ausente), e a linha do Senado "solta" é removida após
 * repontar mandato/filiacao_partidaria/voto_parlamentar para o id da pessoa do TSE. Cada passo
 * fica registrado em historico_alteracao para auditoria.
 */
export async function cruzarSenadoresComTse(env) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('senado_cruzamento_tse', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let matchesAutomaticos = 0;
  let pendenciasAmbiguas = 0;
  let comErro = 0;
  const erros = [];

  try {
    const { results: senadores } = await db
      .prepare(
        `SELECT p.id AS pessoa_id, p.id_senado, p.nome_completo, p.nome_urna_atual, p.data_nascimento,
                m.sg_uf AS uf_mandato
         FROM pessoa p
         LEFT JOIN mandato m ON m.pessoa_id = p.id AND m.cargo_id = (SELECT id FROM cargo WHERE slug = 'senador')
         WHERE p.id_senado IS NOT NULL`
      )
      .all();

    for (const senador of senadores) {
      lidos++;
      try {
        // A lista de senadores em exercício não traz data de nascimento — precisa do detalhe.
        let dataNascimentoSenado = senador.data_nascimento;
        if (!dataNascimentoSenado) {
          const detalhe = await fetchJson(`${SENADO_BASE}/senador/${senador.id_senado}`);
          dataNascimentoSenado = detalhe?.DetalheParlamentar?.Parlamentar?.DadosBasicosParlamentar?.DataNascimento || null;
          if (dataNascimentoSenado) {
            await db
              .prepare(`UPDATE pessoa SET data_nascimento=?, updated_at=datetime('now') WHERE id=? AND data_nascimento IS NULL`)
              .bind(dataNascimentoSenado, senador.pessoa_id)
              .run();
          }
        }
        const dataNascNormalizada = normalizarData(dataNascimentoSenado);
        if (!dataNascNormalizada || !senador.uf_mandato) {
          // Sem data de nascimento ou UF de mandato não há como cruzar com segurança — pula.
          continue;
        }

        const { results: candidatosComData } = await db
          .prepare(
            `SELECT DISTINCT p.id AS pessoa_id, p.nome_completo, p.nome_urna_atual, p.data_nascimento
             FROM pessoa p
             JOIN candidatura c ON c.pessoa_id = p.id
             WHERE p.id_senado IS NULL
               AND p.data_nascimento IS NOT NULL
               AND c.sg_uf = ?`
          )
          .bind(senador.uf_mandato)
          .all();

        const nomeSenado = senador.nome_completo || senador.nome_urna_atual;
        const candidatosMatch = candidatosComData.filter((cand) => {
          const dataCandNorm = normalizarData(cand.data_nascimento);
          if (!dataCandNorm || dataCandNorm !== dataNascNormalizada) return false;
          const nomeCand = cand.nome_completo || cand.nome_urna_atual;
          const nivel = compararNomes(nomeSenado, nomeCand);
          return nivel === 'exato' || nivel === 'tokens';
        });

        if (candidatosMatch.length === 1) {
          const alvo = candidatosMatch[0];
          await mesclarPessoas(db, {
            pessoaOrigemId: senador.pessoa_id,
            pessoaDestinoId: alvo.pessoa_id,
            motivo: `Cruzamento automático Senado-TSE: nome+UF(${senador.uf_mandato})+data_nascimento(${dataNascNormalizada}) coincidem com exatamente uma candidatura do TSE.`,
          });
          matchesAutomaticos++;
        } else if (candidatosMatch.length > 1) {
          // Evita duplicar a mesma pendência em execuções repetidas do cron: só grava se não
          // houver uma pendência ainda ABERTA (sem decisão de curadoria) para este senador.
          const pendenciaExistente = await db
            .prepare(
              `SELECT h.id FROM historico_alteracao h
               WHERE h.tabela_referencia = 'pessoa' AND h.registro_id = ? AND h.campo = 'id_senado_cruzamento'
                 AND NOT EXISTS (
                   SELECT 1 FROM historico_alteracao h2
                   WHERE h2.tabela_referencia = 'pessoa' AND h2.registro_id = h.registro_id
                     AND h2.campo = 'id_senado_cruzamento_resolvida' AND h2.created_at >= h.created_at
                 )`
            )
            .bind(senador.pessoa_id)
            .first();

          if (!pendenciaExistente) {
            const candidatosJson = JSON.stringify(
              candidatosMatch.map((c) => ({ pessoa_id: c.pessoa_id, nome_completo: c.nome_completo, nome_urna_atual: c.nome_urna_atual }))
            );
            await db
              .prepare(
                `INSERT INTO historico_alteracao (tabela_referencia, registro_id, campo, valor_anterior, valor_novo, motivo, origem)
                 VALUES ('pessoa', ?, 'id_senado_cruzamento', ?, ?, ?, 'coletor_automatico')`
              )
              .bind(
                senador.pessoa_id,
                JSON.stringify({ id_senado: senador.id_senado, nome_senado: nomeSenado, uf: senador.uf_mandato, data_nascimento: dataNascNormalizada }),
                candidatosJson,
                `Pendência de curadoria: ${candidatosMatch.length} candidaturas do TSE em ${senador.uf_mandato} coincidem em nome+data_nascimento(${dataNascNormalizada}) com o senador id_senado=${senador.id_senado} (${nomeSenado}). Match automático não aplicado — requer curadoria manual.`
              )
              .run();
          }
          pendenciasAmbiguas++;
        }
        // candidatosMatch.length === 0: nenhuma correspondência — não registra nada, para não
        // poluir o histórico com "não encontrado" (a maioria dos senadores nunca foi candidata
        // em pleito coberto pelo TSE neste ciclo).
      } catch (e) {
        comErro++;
        if (erros.length < 20) erros.push(`senador ${senador.id_senado}: ${e.message}`);
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(
        comErro > 0 ? 'falha_parcial' : 'sucesso',
        lidos,
        matchesAutomaticos,
        comErro,
        erros.concat(pendenciasAmbiguas ? [`${pendenciasAmbiguas} pendências ambíguas registradas em historico_alteracao`] : []).join(' | ') || null,
        execucaoId
      )
      .run();

    return { ok: true, lidos, matchesAutomaticos, pendenciasAmbiguas, comErro, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}

/**
 * Mescla duas linhas de pessoa que representam a mesma pessoa física: preserva a linha
 * destino (normalmente a do TSE, que já acumula candidaturas/bens/declarações), copia para
 * ela os campos do Senado que estejam ausentes, repõe as FKs de mandato/filiacao_partidaria/
 * voto_parlamentar da linha origem para o destino, e remove a linha origem. Cada mudança de
 * campo relevante é registrada em historico_alteracao para auditoria.
 */
export async function mesclarPessoas(db, { pessoaOrigemId, pessoaDestinoId, motivo }) {
  const origem = await db.prepare(`SELECT * FROM pessoa WHERE id = ?`).bind(pessoaOrigemId).first();
  const destino = await db.prepare(`SELECT * FROM pessoa WHERE id = ?`).bind(pessoaDestinoId).first();
  if (!origem || !destino) return;

  const camposParaCopiar = ['id_senado', 'foto_url', 'genero'];
  for (const campo of camposParaCopiar) {
    if (!destino[campo] && origem[campo]) {
      await db
        .prepare(`UPDATE pessoa SET ${campo} = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(origem[campo], pessoaDestinoId)
        .run();
      await db
        .prepare(
          `INSERT INTO historico_alteracao (tabela_referencia, registro_id, campo, valor_anterior, valor_novo, motivo, origem)
           VALUES ('pessoa', ?, ?, ?, ?, ?, 'coletor_automatico')`
        )
        .bind(pessoaDestinoId, campo, destino[campo] || null, origem[campo], motivo)
        .run();
    }
  }

  // Repointa registros dependentes da pessoa "solta" (só existia por causa do Senado) para o destino.
  await db.prepare(`UPDATE mandato SET pessoa_id = ? WHERE pessoa_id = ?`).bind(pessoaDestinoId, pessoaOrigemId).run();
  await db.prepare(`UPDATE filiacao_partidaria SET pessoa_id = ? WHERE pessoa_id = ?`).bind(pessoaDestinoId, pessoaOrigemId).run();
  await db.prepare(`UPDATE OR IGNORE voto_parlamentar SET pessoa_id = ? WHERE pessoa_id = ?`).bind(pessoaDestinoId, pessoaOrigemId).run();
  // Remove votos que ficaram duplicados (mesma votacao_id + pessoa_id já existente no destino)
  // e que por isso o UPDATE OR IGNORE acima não conseguiu mover.
  await db.prepare(`DELETE FROM voto_parlamentar WHERE pessoa_id = ?`).bind(pessoaOrigemId).run();

  await db
    .prepare(
      `INSERT INTO historico_alteracao (tabela_referencia, registro_id, campo, valor_anterior, valor_novo, motivo, origem)
       VALUES ('pessoa', ?, 'merge_pessoa_duplicada', ?, ?, ?, 'coletor_automatico')`
    )
    .bind(pessoaDestinoId, String(pessoaOrigemId), String(pessoaDestinoId), motivo)
    .run();

  await db.prepare(`DELETE FROM pessoa WHERE id = ?`).bind(pessoaOrigemId).run();
}
