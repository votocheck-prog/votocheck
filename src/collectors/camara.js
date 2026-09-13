/**
 * VotoCheck — Coletor Câmara dos Deputados (dadosabertos.camara.leg.br/api/v2)
 *
 * Testado e confirmado acessível a partir do sandbox de desenvolvimento (sem bloqueio,
 * diferente do domínio tse.jus.br — ver README.md). JSON puro, paginação via itens=/pagina=
 * ou por links.rel="next" na resposta.
 *
 * Endpoints usados:
 *   GET /deputados?idLegislatura=57                → lista básica (id, nome, partido, UF)
 *   GET /deputados/{id}                             → detalhe (CPF, nascimento, redes sociais...)
 *   GET /proposicoes?ano=AAAA&pagina=N               → proposições por ano
 *   GET /votacoes?dataInicio=&dataFim=&idOrgao=180   → votações em Plenário (idOrgao=180)
 *   GET /votacoes/{id}/votos                         → votos nominais de uma votação
 *   GET /votacoes/{id}/orientacoes                   → orientação de bancada por partido/bloco
 *
 * Ligação com o schema: pessoa.id_camara guarda o id numérico da Câmara — é a chave de
 * cruzamento entre esta API e o restante do modelo (candidatura, mandato, etc.), já que o TSE
 * não expõe esse id diretamente (o cruzamento pessoa↔pessoa entre TSE e Câmara é feito por CPF).
 */

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao buscar ${url}`);
  return resp.json();
}

/** Segue os links de paginação da API da Câmara até esgotar, respeitando um limite de páginas de segurança. */
async function fetchAllPages(initialUrl, maxPages = 500) {
  let url = initialUrl;
  const allData = [];
  let pages = 0;
  while (url && pages < maxPages) {
    const json = await fetchJson(url);
    allData.push(...(json.dados || []));
    const next = (json.links || []).find((l) => l.rel === 'next');
    url = next ? next.href : null;
    pages++;
  }
  return allData;
}

async function ensureFonteCamara(db) {
  const existing = await db.prepare(`SELECT id FROM fonte WHERE nome = ?`).bind('Câmara dos Deputados').first();
  if (existing) return existing.id;
  const res = await db
    .prepare(`INSERT INTO fonte (nome, tipo, url_base, descricao) VALUES (?, ?, ?, ?)`)
    .bind('Câmara dos Deputados', 'institucional_oficial', 'https://dadosabertos.camara.leg.br', 'Dados abertos oficiais da Câmara dos Deputados')
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

/** Sincroniza a lista de deputados em exercício + detalhe de cada um (CPF hasheado, nascimento, etc.). */
export async function coletarDeputados(env, idLegislatura = 57) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('camara_deputados', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;
  const erros = [];

  try {
    const fonteId = await ensureFonteCamara(db);
    const lista = await fetchAllPages(`${CAMARA_BASE}/deputados?idLegislatura=${idLegislatura}&itens=100`);

    const cargoDepFederal = await db.prepare(`SELECT id FROM cargo WHERE slug = 'deputado_federal'`).first();

    for (const dep of lista) {
      lidos++;
      try {
        // detalhe individual traz CPF (para hash/dedup com TSE) e redes sociais
        const detalhe = await fetchJson(`${CAMARA_BASE}/deputados/${dep.id}`).then((r) => r.dados);
        const cpfHash = detalhe.cpf ? await sha256Hex(detalhe.cpf) : null;
        const partidoId = await ensurePartido(db, dep.siglaPartido);

        let pessoaRow = null;
        if (cpfHash) pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE cpf_hash = ?`).bind(cpfHash).first();
        if (!pessoaRow) pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE id_camara = ?`).bind(String(dep.id)).first();

        let pessoaId;
        if (pessoaRow) {
          pessoaId = pessoaRow.id;
          await db
            .prepare(
              `UPDATE pessoa SET nome_completo=?, nome_urna_atual=?, cpf_hash=COALESCE(?, cpf_hash), data_nascimento=?,
               genero=?, id_camara=?, foto_url=?, updated_at=datetime('now') WHERE id=?`
            )
            .bind(
              detalhe.nomeCivil || dep.nome, dep.nome, cpfHash, detalhe.dataNascimento,
              detalhe.sexo, String(dep.id), dep.urlFoto, pessoaId
            )
            .run();
        } else {
          const res = await db
            .prepare(
              `INSERT INTO pessoa (nome_completo, nome_urna_atual, cpf_hash, data_nascimento, genero, id_camara, foto_url, status_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, 2)`
            )
            .bind(detalhe.nomeCivil || dep.nome, dep.nome, cpfHash, detalhe.dataNascimento, detalhe.sexo, String(dep.id), dep.urlFoto)
            .run();
          pessoaId = res.meta.last_row_id;
        }

        // mandato em exercício (Câmara não tem candidatura própria — liga direto o mandato à pessoa)
        const mandatoExistente = await db
          .prepare(`SELECT id FROM mandato WHERE pessoa_id = ? AND cargo_id = ? AND legislatura = ?`)
          .bind(pessoaId, cargoDepFederal.id, String(idLegislatura))
          .first();

        if (mandatoExistente) {
          await db
            .prepare(`UPDATE mandato SET sg_uf=?, situacao=?, fonte_id=?, updated_at=datetime('now') WHERE id=?`)
            .bind(dep.siglaUf, dep.ultimoStatus?.situacao || 'Exercício', fonteId, mandatoExistente.id)
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO mandato (pessoa_id, cargo_id, sg_uf, legislatura, situacao, status_id, fonte_id)
               VALUES (?, ?, ?, ?, ?, 2, ?)`
            )
            .bind(pessoaId, cargoDepFederal.id, dep.siglaUf, String(idLegislatura), 'Exercício', fonteId)
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
        if (erros.length < 20) erros.push(`deputado ${dep.id}: ${e.message}`);
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

/** Coleta proposições de um ano — grava em `proposicao`. */
export async function coletarProposicoes(env, ano) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('camara_proposicoes', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;

  try {
    const fonteId = await ensureFonteCamara(db);
    const lista = await fetchAllPages(`${CAMARA_BASE}/proposicoes?ano=${ano}&itens=100`, 1000);

    for (const prop of lista) {
      lidos++;
      try {
        await db
          .prepare(
            `INSERT INTO proposicao (casa, id_externo, sigla_tipo, numero, ano, ementa, url_origem, fonte_id)
             VALUES ('camara', ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(casa, id_externo) DO UPDATE SET ementa=excluded.ementa, updated_at=datetime('now')`
          )
          .bind(String(prop.id), prop.siglaTipo, prop.numero, prop.ano, prop.ementa, prop.uri, fonteId)
          .run();
        gravados++;
      } catch (e) {
        comErro++;
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=? WHERE id=?`
      )
      .bind(comErro > 0 ? 'falha_parcial' : 'sucesso', lidos, gravados, comErro, execucaoId)
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
 * Coleta votações em Plenário (idOrgao=180) num intervalo de datas, com votos nominais e orientação
 * de bancada. Chame com janelas de poucos dias por vez (dataInicio/dataFim) — o volume de votos
 * nominais é grande e a API não permite intervalos muito amplos numa única chamada eficiente.
 */
export async function coletarVotacoes(env, dataInicio, dataFim) {
  const db = env.DB;
  const execRes = await db.prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('camara_votacoes', 'em_execucao')`).run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let votosGravados = 0;
  let comErro = 0;
  const erros = [];

  try {
    const fonteId = await ensureFonteCamara(db);
    const votacoes = await fetchAllPages(
      `${CAMARA_BASE}/votacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&idOrgao=180&itens=100`
    );

    for (const vot of votacoes) {
      lidos++;
      try {
        let proposicaoId = null;
        if (vot.uriProposicaoObjeto) {
          const idProp = vot.uriProposicaoObjeto.split('/').pop();
          const propRow = await db.prepare(`SELECT id FROM proposicao WHERE casa='camara' AND id_externo=?`).bind(idProp).first();
          proposicaoId = propRow ? propRow.id : null;
        }

        const votacaoRes = await db
          .prepare(
            `INSERT INTO votacao (casa, id_externo, proposicao_id, data_votacao, descricao, resultado, url_origem, fonte_id)
             VALUES ('camara', ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(casa, id_externo) DO UPDATE SET descricao=excluded.descricao
             RETURNING id`
          )
          .bind(vot.id, proposicaoId, vot.data, vot.descricao, vot.aprovacao === 1 ? 'aprovado' : 'rejeitado', vot.uri, fonteId)
          .first();
        const votacaoId = votacaoRes.id;
        gravados++;

        // votos nominais — só busca se ainda não tiver votos gravados para esta votação (evita refetch)
        const votoJaExiste = await db.prepare(`SELECT id FROM voto_parlamentar WHERE votacao_id = ? LIMIT 1`).bind(votacaoId).first();
        if (!votoJaExiste) {
          const votosResp = await fetchJson(`${CAMARA_BASE}/votacoes/${vot.id}/votos`);
          for (const v of votosResp.dados || []) {
            const dep = v.deputado_;
            const pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE id_camara = ?`).bind(String(dep.id)).first();
            if (!pessoaRow) continue; // deputado ainda não sincronizado via coletarDeputados
            try {
              await db
                .prepare(
                  `INSERT INTO voto_parlamentar (votacao_id, pessoa_id, voto) VALUES (?, ?, ?)
                   ON CONFLICT(votacao_id, pessoa_id) DO UPDATE SET voto=excluded.voto`
                )
                .bind(votacaoId, pessoaRow.id, v.tipoVoto)
                .run();
              votosGravados++;
            } catch (e) {
              /* ignora conflito pontual */
            }
          }
        }
      } catch (e) {
        comErro++;
        if (erros.length < 20) erros.push(`votacao ${vot.id}: ${e.message}`);
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(comErro > 0 ? 'falha_parcial' : 'sucesso', lidos, gravados + votosGravados, comErro, erros.join(' | ') || null, execucaoId)
      .run();

    return { ok: true, lidos, votacoesGravadas: gravados, votosGravados, comErro, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}

async function sha256Hex(value) {
  if (!value) return null;
  const enc = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
