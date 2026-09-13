/**
 * VotoCheck — Coletor TSE: candidatos (consulta_cand) + redes sociais + bens
 *
 * Fluxo:
 *   1. Baixa o ZIP do dataset (CDN oficial, com fallback configurável)
 *   2. Descompacta em memória (unzipit — biblioteca pura JS, compatível com Workers)
 *   3. Para cada CSV de UF dentro do ZIP: parse → map → upsert em D1
 *   4. Registra a execução em `execucao_coletor` para auditoria/monitoramento
 *
 * ATENÇÃO — risco conhecido (ver README.md "Riscos"):
 *   O download direto de cdn.tse.jus.br retornou HTTP 403 (bloqueio Akamai) a partir do
 *   sandbox de desenvolvimento. Ainda não testamos a partir da rede da Cloudflare (Worker).
 *   Se o Worker também for bloqueado, use FALLBACK_BASE_URL (mirror) ou rode a carga inicial
 *   localmente via scripts/importar_local.mjs a partir da sua própria rede doméstica.
 */

import { decodeLatin1, parseTseCsv, rowsToObjects, mapConsultaCandRow, mapRedeSocialRow, sha256Hex, CARGOS_MVP } from '../lib/tse_parser.js';
import { unzip } from '../vendor_unzipit.js';

const TSE_CDN_BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';

/** Baixa e retorna o ArrayBuffer de um dataset zipado do TSE, com fallback opcional. */
async function fetchZip(path, env) {
  const primaryUrl = `${TSE_CDN_BASE}/${path}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; VotoCheckBot/1.0; +https://votocheck.org)',
    Accept: '*/*',
  };

  let resp = await fetch(primaryUrl, { headers });
  if (resp.ok) return { buffer: await resp.arrayBuffer(), sourceUrl: primaryUrl };

  const primaryStatus = resp.status;

  if (env.FALLBACK_BASE_URL) {
    const fallbackUrl = `${env.FALLBACK_BASE_URL}/${path}`;
    resp = await fetch(fallbackUrl, { headers });
    if (resp.ok) return { buffer: await resp.arrayBuffer(), sourceUrl: fallbackUrl };
    throw new Error(`Falha ao baixar ${path}: primário=${primaryStatus}, fallback=${resp.status}`);
  }

  throw new Error(`Falha ao baixar ${path}: HTTP ${primaryStatus} (sem FALLBACK_BASE_URL configurado)`);
}

/** Garante que fonte 'TSE' exista em D1 e retorna seu id. */
async function ensureFonteTse(db) {
  const existing = await db.prepare(`SELECT id FROM fonte WHERE nome = ?`).bind('Tribunal Superior Eleitoral').first();
  if (existing) return existing.id;
  const res = await db
    .prepare(
      `INSERT INTO fonte (nome, tipo, url_base, descricao) VALUES (?, ?, ?, ?)`
    )
    .bind('Tribunal Superior Eleitoral', 'institucional_oficial', 'https://dadosabertos.tse.jus.br', 'Dados abertos oficiais do TSE')
    .run();
  return res.meta.last_row_id;
}

async function ensurePartido(db, numero, sigla, nome) {
  if (!numero) return null;
  const existing = await db.prepare(`SELECT id FROM partido WHERE numero = ?`).bind(numero).first();
  if (existing) return existing.id;
  const res = await db.prepare(`INSERT INTO partido (numero, sigla, nome) VALUES (?, ?, ?)`).bind(numero, sigla, nome).run();
  return res.meta.last_row_id;
}

async function getCargoIdByCodigoTse(db, codigoTse) {
  const row = await db.prepare(`SELECT id FROM cargo WHERE codigo_tse = ?`).bind(codigoTse).first();
  return row ? row.id : null;
}

/** Upsert de uma linha de candidato mapeada (mapConsultaCandRow) no D1. */
async function upsertCandidato(db, mapped, fonteId) {
  if (!mapped.sq_candidato_tse || !mapped.ano_eleicao) return { skipped: true, reason: 'sem sq_candidato ou ano' };
  if (!CARGOS_MVP.has(mapped.codigo_cargo_tse)) return { skipped: true, reason: 'cargo fora do MVP' };

  const cargoId = await getCargoIdByCodigoTse(db, mapped.codigo_cargo_tse);
  if (!cargoId) return { skipped: true, reason: `cargo_tse ${mapped.codigo_cargo_tse} não mapeado em tabela cargo` };

  const partidoId = await ensurePartido(db, mapped.numero_partido, mapped.sigla_partido, mapped.nome_partido);
  const cpfHash = await sha256Hex(mapped.cpf);

  // 1) upsert PESSOA (dedup por cpf_hash quando disponível; senão por nome + sq_candidato como fallback)
  let pessoaId;
  let pessoaRow = null;
  if (cpfHash) {
    pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE cpf_hash = ?`).bind(cpfHash).first();
  }
  if (!pessoaRow) {
    pessoaRow = await db.prepare(`SELECT id FROM pessoa WHERE sq_candidato_tse_atual = ?`).bind(mapped.sq_candidato_tse).first();
  }

  if (pessoaRow) {
    pessoaId = pessoaRow.id;
    await db
      .prepare(
        `UPDATE pessoa SET nome_completo=?, nome_social=?, nome_urna_atual=?, cpf_hash=?, titulo_eleitoral=?,
         data_nascimento=?, genero=?, cor_raca=?, grau_instrucao=?, sq_candidato_tse_atual=?, updated_at=datetime('now')
         WHERE id=?`
      )
      .bind(
        mapped.nome_completo, mapped.nome_social, mapped.nome_urna, cpfHash, mapped.titulo_eleitoral,
        mapped.data_nascimento, mapped.genero, mapped.cor_raca, mapped.grau_instrucao, mapped.sq_candidato_tse,
        pessoaId
      )
      .run();
  } else {
    const res = await db
      .prepare(
        `INSERT INTO pessoa (nome_completo, nome_social, nome_urna_atual, cpf_hash, titulo_eleitoral,
         data_nascimento, genero, cor_raca, grau_instrucao, sq_candidato_tse_atual, status_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2)`
      )
      .bind(
        mapped.nome_completo, mapped.nome_social, mapped.nome_urna, cpfHash, mapped.titulo_eleitoral,
        mapped.data_nascimento, mapped.genero, mapped.cor_raca, mapped.grau_instrucao, mapped.sq_candidato_tse
      )
      .run();
    pessoaId = res.meta.last_row_id;
  }

  // 2) upsert CANDIDATURA (chave única: ano_eleicao + sq_candidato_tse)
  const candidaturaExistente = await db
    .prepare(`SELECT id FROM candidatura WHERE ano_eleicao = ? AND sq_candidato_tse = ?`)
    .bind(mapped.ano_eleicao, mapped.sq_candidato_tse)
    .first();

  if (candidaturaExistente) {
    await db
      .prepare(
        `UPDATE candidatura SET turno=?, cargo_id=?, sg_uf=?, numero_urna=?, nome_urna=?, partido_id=?,
         sq_coligacao=?, nome_coligacao=?, composicao_coligacao=?, situacao_candidatura=?,
         situacao_totalizacao_turno=?, fonte_id=?, updated_at=datetime('now')
         WHERE id=?`
      )
      .bind(
        mapped.turno, cargoId, mapped.sg_uf, mapped.numero_urna, mapped.nome_urna, partidoId,
        mapped.sq_coligacao, mapped.nome_coligacao, mapped.composicao_coligacao, mapped.situacao_candidatura,
        mapped.situacao_totalizacao_turno, fonteId, candidaturaExistente.id
      )
      .run();
    return { skipped: false, action: 'update', pessoaId, candidaturaId: candidaturaExistente.id };
  }

  const res = await db
    .prepare(
      `INSERT INTO candidatura (pessoa_id, ano_eleicao, turno, cargo_id, sg_uf, sq_candidato_tse, numero_urna,
       nome_urna, partido_id, sq_coligacao, nome_coligacao, composicao_coligacao, situacao_candidatura,
       situacao_totalizacao_turno, status_id, fonte_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)`
    )
    .bind(
      pessoaId, mapped.ano_eleicao, mapped.turno, cargoId, mapped.sg_uf, mapped.sq_candidato_tse, mapped.numero_urna,
      mapped.nome_urna, partidoId, mapped.sq_coligacao, mapped.nome_coligacao, mapped.composicao_coligacao,
      mapped.situacao_candidatura, mapped.situacao_totalizacao_turno, fonteId
    )
    .run();

  return { skipped: false, action: 'insert', pessoaId, candidaturaId: res.meta.last_row_id };
}

/**
 * Executa a coleta completa de candidatos para um ano-eleição.
 * `env` deve conter: DB (binding D1), FALLBACK_BASE_URL (opcional).
 */
export async function coletarCandidatos(env, ano = 2026) {
  const db = env.DB;
  const execRes = await db
    .prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('tse_candidatos', 'em_execucao')`)
    .run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;
  const erros = [];

  try {
    const fonteId = await ensureFonteTse(db);
    const { buffer, sourceUrl } = await fetchZip(`consulta_cand/consulta_cand_${ano}.zip`, env);
    const { entries } = await unzip(buffer);

    for (const [name, entry] of Object.entries(entries)) {
      if (!name.toLowerCase().endsWith('.csv')) continue;
      // Arquivos vêm nomeados tipo "consulta_cand_2026_SP.csv" — pula o consolidado BRASIL se UFs já cobrem, mantém BR (Presidente)
      const csvBuffer = await entry.arrayBuffer();
      const text = decodeLatin1(csvBuffer);
      const { header, rows } = parseTseCsv(text);
      const objects = rowsToObjects(header, rows);

      for (const row of objects) {
        lidos++;
        try {
          const mapped = mapConsultaCandRow(row);
          const result = await upsertCandidato(db, mapped, fonteId);
          if (!result.skipped) gravados++;
        } catch (e) {
          comErro++;
          if (erros.length < 20) erros.push(`${name}: ${e.message}`);
        }
      }
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(comErro > 0 ? 'falha_parcial' : 'sucesso', lidos, gravados, comErro, erros.join(' | ') || null, execucaoId)
      .run();

    return { ok: true, sourceUrl, lidos, gravados, comErro, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}

/** Coleta redes sociais dos candidatos — depende de candidaturas já existirem (roda depois de coletarCandidatos). */
export async function coletarRedesSociais(env, ano = 2026) {
  const db = env.DB;
  const execRes = await db
    .prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('tse_redes_sociais', 'em_execucao')`)
    .run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;

  try {
    const { buffer } = await fetchZip(`consulta_cand/rede_social_candidato_${ano}.zip`, env);
    const { entries } = await unzip(buffer);

    for (const [name, entry] of Object.entries(entries)) {
      if (!name.toLowerCase().endsWith('.csv')) continue;
      const text = decodeLatin1(await entry.arrayBuffer());
      const { header, rows } = parseTseCsv(text);
      const objects = rowsToObjects(header, rows);

      for (const row of objects) {
        lidos++;
        try {
          const mapped = mapRedeSocialRow(row);
          if (!mapped.sq_candidato_tse || !mapped.url) continue;
          const candidatura = await db
            .prepare(`SELECT id FROM candidatura WHERE sq_candidato_tse = ? AND ano_eleicao = ?`)
            .bind(mapped.sq_candidato_tse, ano)
            .first();
          if (!candidatura) continue;

          // Guarda como atributo_candidato (atributo_slug = 'rede_social_N') para não precisar de tabela extra agora
          await db
            .prepare(
              `INSERT INTO atributo_candidato (candidatura_id, atributo_slug, valor, regra_publicada_url, status_id)
               VALUES (?, ?, ?, ?, 1)
               ON CONFLICT(candidatura_id, atributo_slug) DO UPDATE SET valor=excluded.valor`
            )
            .bind(candidatura.id, `rede_social_${mapped.ordem ?? 0}`, mapped.url, 'https://dadosabertos.tse.jus.br/dataset/candidatos-2026')
            .run();
          gravados++;
        } catch (e) {
          comErro++;
        }
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
