/**
 * VotoCheck — Coletor TSE: bens declarados por candidatos (bem_candidato_AAAA.zip)
 *
 * Mesma infraestrutura de download/ZIP do coletor de candidatos (ver tse_candidatos.js) —
 * reaproveita fetchZip com o mesmo fallback configurável via FALLBACK_BASE_URL.
 *
 * Depende de `candidatura` já populada (precisa rodar coletarCandidatos antes) porque
 * o cruzamento é feito via sq_candidato_tse + ano_eleicao.
 *
 * Guarda cada bem como um atributo_candidato (atributo_slug = 'bem_N') e também
 * atualiza candidatura.bens_declarados_total com a soma, útil para exibição rápida no perfil.
 */

import { decodeLatin1, parseTseCsv, rowsToObjects, mapBemCandidatoRow } from '../lib/tse_parser.js';
import { unzip } from '../vendor_unzipit.js';

const TSE_CDN_BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';

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

export async function coletarBensCandidatos(env, ano = 2026) {
  const db = env.DB;
  const execRes = await db
    .prepare(`INSERT INTO execucao_coletor (coletor, status) VALUES ('tse_bens_candidatos', 'em_execucao')`)
    .run();
  const execucaoId = execRes.meta.last_row_id;

  let lidos = 0;
  let gravados = 0;
  let comErro = 0;
  let semCandidaturaCorrespondente = 0;
  const erros = [];
  // acumula soma de bens por sq_candidato_tse para depois gravar em lote no candidatura.bens_declarados_total
  const somaPorCandidato = new Map();

  try {
    const { buffer, sourceUrl } = await fetchZip(`bem_candidato/bem_candidato_${ano}.zip`, env);
    const { entries } = await unzip(buffer);

    for (const [name, entry] of Object.entries(entries)) {
      if (!name.toLowerCase().endsWith('.csv')) continue;
      const text = decodeLatin1(await entry.arrayBuffer());
      const { header, rows } = parseTseCsv(text);
      const objects = rowsToObjects(header, rows);

      for (const row of objects) {
        lidos++;
        try {
          const mapped = mapBemCandidatoRow(row);
          if (!mapped.sq_candidato_tse) continue;

          const candidatura = await db
            .prepare(`SELECT id FROM candidatura WHERE sq_candidato_tse = ? AND ano_eleicao = ?`)
            .bind(mapped.sq_candidato_tse, ano)
            .first();

          if (!candidatura) {
            semCandidaturaCorrespondente++;
            continue;
          }

          const slug = `bem_${mapped.codigo_tipo_bem || 'outro'}_${lidos}`;
          const valorTexto = mapped.valor_bem != null ? String(mapped.valor_bem) : null;

          await db
            .prepare(
              `INSERT INTO atributo_candidato (candidatura_id, atributo_slug, valor, regra_publicada_url, status_id)
               VALUES (?, ?, ?, ?, 1)
               ON CONFLICT(candidatura_id, atributo_slug) DO UPDATE SET valor=excluded.valor`
            )
            .bind(
              candidatura.id,
              slug,
              JSON.stringify({ descricao_tipo: mapped.descricao_tipo_bem, descricao: mapped.descricao_bem, valor: mapped.valor_bem }),
              'https://dadosabertos.tse.jus.br/dataset/candidatos-2026'
            )
            .run();

          if (mapped.valor_bem != null) {
            const atual = somaPorCandidato.get(candidatura.id) || 0;
            somaPorCandidato.set(candidatura.id, atual + mapped.valor_bem);
          }

          gravados++;
        } catch (e) {
          comErro++;
          if (erros.length < 20) erros.push(`${name}: ${e.message}`);
        }
      }
    }

    // grava a soma total de bens por candidatura (facilita exibir "patrimônio declarado: R$ X" sem somar em runtime)
    for (const [candidaturaId, total] of somaPorCandidato) {
      await db.prepare(`UPDATE candidatura SET bens_declarados_total = ? WHERE id = ?`).bind(total, candidaturaId).run();
    }

    await db
      .prepare(
        `UPDATE execucao_coletor SET finalizado_em=datetime('now'), status=?, registros_lidos=?, registros_gravados=?,
         registros_com_erro=?, detalhes_erro=? WHERE id=?`
      )
      .bind(
        comErro > 0 ? 'falha_parcial' : 'sucesso',
        lidos,
        gravados,
        comErro,
        [erros.join(' | '), semCandidaturaCorrespondente ? `${semCandidaturaCorrespondente} bens sem candidatura correspondente` : null]
          .filter(Boolean)
          .join(' || ') || null,
        execucaoId
      )
      .run();

    return { ok: true, sourceUrl, lidos, gravados, comErro, semCandidaturaCorrespondente, execucaoId };
  } catch (e) {
    await db
      .prepare(`UPDATE execucao_coletor SET finalizado_em=datetime('now'), status='falha', detalhes_erro=? WHERE id=?`)
      .bind(String(e.message || e), execucaoId)
      .run();
    return { ok: false, error: String(e.message || e), execucaoId };
  }
}
