#!/usr/bin/env node
/**
 * VotoCheck — Importação local de candidatos TSE (fallback de carga inicial)
 *
 * Por que este script existe:
 *   O download direto de cdn.tse.jus.br retornou HTTP 403 (bloqueio Akamai) a partir do
 *   sandbox de desenvolvimento usado para montar este projeto. Ainda não sabemos se o mesmo
 *   bloqueio afeta a rede da Cloudflare (onde o Worker roda) ou a sua rede doméstica/pessoal.
 *   Este script roda NA SUA MÁQUINA (Node.js, fora do Worker) e serve de plano B garantido:
 *   se ele funcionar aqui, você faz a carga inicial completa por este caminho enquanto
 *   investigamos se o Worker também consegue buscar direto do TSE para as atualizações incrementais.
 *
 * Como usar:
 *   1. npm install (instala unzipit, adm-zip, etc. — ver package.json)
 *   2. node scripts/importar_local.mjs --ano=2026
 *   3. O script baixa o ZIP, converte cada linha em INSERTs SQL e grava em
 *      ./scripts/output/candidatos_2026.sql — depois rode:
 *        wrangler d1 execute votocheck-db --remote --file=scripts/output/candidatos_2026.sql
 *      (ou --local para testar antes contra o D1 local)
 *
 * Se este script também receber 403 na sua rede:
 *   - Tente abrir a URL do ZIP direto no navegador — se funcionar lá mas não aqui, pode ser
 *     bloqueio por User-Agent/headers específicos do Node; ajuste os headers abaixo.
 *   - Alternativa: baixe manualmente o ZIP pelo navegador em
 *     https://dadosabertos.tse.jus.br/dataset/candidatos-2026 e salve em
 *     ./scripts/input/consulta_cand_2026.zip — o script detecta o arquivo local e pula o download.
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const ANO = Number(args.ano) || 2026;

const TSE_CDN_BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const LOCAL_ZIP_PATH = path.join(__dirname, 'input', `consulta_cand_${ANO}.zip`);
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_SQL_PATH = path.join(OUTPUT_DIR, `candidatos_${ANO}.sql`);

// Cargos do MVP (ver src/lib/tse_parser.js CARGOS_MVP): 1 Presidente, 3 Governador, 5 Senador,
// 6 Dep. Federal, 7 Dep. Estadual, 8 Dep. Distrital
const CARGOS_MVP = new Set([1, 3, 5, 6, 7, 8]);

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sha256Hex(value) {
  if (!value) return null;
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function tseTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (v === '' || v === '#NULO' || v === '#NE') return null;
  return v;
}

function tseNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (v === '' || v === '#NULO' || v === '#NE') return null;
  const n = Number(v.replace(',', '.'));
  if (Number.isNaN(n) || n === -1 || n === -3) return null;
  return n;
}

/** Parser CSV estilo TSE: ';' delimitado, tudo entre aspas, "" para aspas literais. */
function parseTseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };

  const parseLine = (line) => {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  };

  const header = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

function rowsToObjects(header, rows) {
  return rows.map((row) => {
    const obj = {};
    header.forEach((col, idx) => {
      obj[col] = row[idx] !== undefined ? row[idx] : null;
    });
    return obj;
  });
}

async function obterZipBuffer() {
  if (existsSync(LOCAL_ZIP_PATH)) {
    console.log(`[importar_local] Usando ZIP local já baixado: ${LOCAL_ZIP_PATH}`);
    return readFileSync(LOCAL_ZIP_PATH);
  }

  const url = `${TSE_CDN_BASE}/consulta_cand/consulta_cand_${ANO}.zip`;
  console.log(`[importar_local] Baixando ${url} ...`);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'application/zip,*/*',
    },
  });

  if (!resp.ok) {
    console.error(`[importar_local] ERRO: HTTP ${resp.status} ao baixar o ZIP.`);
    console.error(`[importar_local] Se isto falhar também na sua rede, baixe manualmente pelo navegador em:`);
    console.error(`  https://dadosabertos.tse.jus.br/dataset/candidatos-2026`);
    console.error(`  e salve o arquivo em: ${LOCAL_ZIP_PATH}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  mkdirSync(path.dirname(LOCAL_ZIP_PATH), { recursive: true });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(LOCAL_ZIP_PATH, buffer);
  console.log(`[importar_local] ZIP salvo em ${LOCAL_ZIP_PATH} (cache para próximas execuções)`);
  return buffer;
}

function mapConsultaCandRow(row) {
  return {
    sq_candidato_tse: tseTextOrNull(row.SQ_CANDIDATO),
    ano_eleicao: tseNumberOrNull(row.ANO_ELEICAO),
    turno: tseNumberOrNull(row.NR_TURNO) ?? 1,
    codigo_cargo_tse: tseNumberOrNull(row.CD_CARGO),
    sg_uf: tseTextOrNull(row.SG_UF),
    numero_urna: tseNumberOrNull(row.NR_CANDIDATO),
    nome_urna: tseTextOrNull(row.NM_URNA_CANDIDATO),
    nome_completo: tseTextOrNull(row.NM_CANDIDATO),
    nome_social: tseTextOrNull(row.NM_SOCIAL_CANDIDATO),
    cpf: tseTextOrNull(row.NR_CPF_CANDIDATO),
    titulo_eleitoral: tseTextOrNull(row.NR_TITULO_ELEITORAL_CANDIDATO),
    data_nascimento: tseTextOrNull(row.DT_NASCIMENTO),
    genero: tseTextOrNull(row.DS_GENERO),
    cor_raca: tseTextOrNull(row.DS_COR_RACA),
    grau_instrucao: tseTextOrNull(row.DS_GRAU_INSTRUCAO),
    numero_partido: tseNumberOrNull(row.NR_PARTIDO),
    sigla_partido: tseTextOrNull(row.SG_PARTIDO),
    nome_partido: tseTextOrNull(row.NM_PARTIDO),
    sq_coligacao: tseTextOrNull(row.SQ_COLIGACAO),
    nome_coligacao: tseTextOrNull(row.NM_COLIGACAO),
    composicao_coligacao: tseTextOrNull(row.DS_COMPOSICAO_COLIGACAO),
    situacao_candidatura: tseTextOrNull(row.DS_SITUACAO_CANDIDATURA),
    situacao_totalizacao_turno: tseTextOrNull(row.DS_SIT_TOT_TURNO),
    // Achado em 25/09/2026 comparando com src/lib/tse_parser.js (usado pelo coletor do Worker,
    // já corrigido antes desta sessão): este script tinha os mesmos dois campos descartados —
    // nunca chegavam a virar coluna. Corrigido agora, mesmos nomes de campo do TSE que o parser
    // do Worker já usa (ver migrations/0004_reeleicao_declarou_bens.sql).
    reeleicao: tseTextOrNull(row.ST_REELEICAO),
    declarou_bens: tseTextOrNull(row.ST_DECLARAR_BENS),
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const zipBuffer = await obterZipBuffer();
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith('.csv'));
  console.log(`[importar_local] ${entries.length} arquivos CSV encontrados no ZIP.`);

  const sqlLines = [];
  sqlLines.push('-- Gerado por scripts/importar_local.mjs — NÃO editar manualmente.');
  // NUNCA emitir BEGIN TRANSACTION/COMMIT aqui: o D1 recusa esses comandos em SQL aplicado via
  // `wrangler d1 execute --file=` — ele já aplica o arquivo inteiro como uma transação própria
  // internamente (API state.storage.transaction()), e trata BEGIN/SAVEPOINT manual como erro
  // (achado em 25/09/2026, rodando este script na máquina do Rodrigo pela 1ª vez — ver também
  // importar_pgfn.mjs, que já tratava isso ao aplicar via API direta, mas nunca ao gerar arquivo
  // pra wrangler).
  sqlLines.push(`INSERT OR IGNORE INTO fonte (nome, tipo, url_base, descricao) VALUES ('Tribunal Superior Eleitoral', 'institucional_oficial', 'https://dadosabertos.tse.jus.br', 'Dados abertos oficiais do TSE');`);

  let lidos = 0;
  let gravados = 0;
  let ignorados = 0;
  const partidosVistos = new Map(); // numero -> {sigla, nome}

  for (const entry of entries) {
    const text = entry.getData().toString('latin1');
    const { header, rows } = parseTseCsv(text);
    const objects = rowsToObjects(header, rows);

    for (const row of objects) {
      lidos++;
      const mapped = mapConsultaCandRow(row);
      if (!mapped.sq_candidato_tse || !mapped.ano_eleicao || !CARGOS_MVP.has(mapped.codigo_cargo_tse)) {
        ignorados++;
        continue;
      }
      if (mapped.numero_partido && !partidosVistos.has(mapped.numero_partido)) {
        partidosVistos.set(mapped.numero_partido, { sigla: mapped.sigla_partido, nome: mapped.nome_partido });
      }

      const cpfHash = sha256Hex(mapped.cpf);

      // pessoa: upsert simplificado via INSERT OR IGNORE + UPDATE (SQLite não tem MERGE nativo,
      // e D1 não garante ROWID estável entre execuções — por isso usamos sq_candidato_tse_atual como chave de busca)
      sqlLines.push(
        `INSERT INTO pessoa (nome_completo, nome_social, nome_urna_atual, cpf_hash, titulo_eleitoral, data_nascimento, genero, cor_raca, grau_instrucao, sq_candidato_tse_atual, status_id)
         SELECT ${sqlEscape(mapped.nome_completo)}, ${sqlEscape(mapped.nome_social)}, ${sqlEscape(mapped.nome_urna)}, ${sqlEscape(cpfHash)}, ${sqlEscape(mapped.titulo_eleitoral)}, ${sqlEscape(mapped.data_nascimento)}, ${sqlEscape(mapped.genero)}, ${sqlEscape(mapped.cor_raca)}, ${sqlEscape(mapped.grau_instrucao)}, ${sqlEscape(mapped.sq_candidato_tse)}, 2
         WHERE NOT EXISTS (SELECT 1 FROM pessoa WHERE cpf_hash = ${sqlEscape(cpfHash)} OR sq_candidato_tse_atual = ${sqlEscape(mapped.sq_candidato_tse)});`
      );

      sqlLines.push(
        `INSERT INTO candidatura (pessoa_id, ano_eleicao, turno, cargo_id, sg_uf, sq_candidato_tse, numero_urna, nome_urna, partido_id, sq_coligacao, nome_coligacao, composicao_coligacao, situacao_candidatura, situacao_totalizacao_turno, reeleicao, declarou_bens, status_id, fonte_id)
         SELECT
           (SELECT id FROM pessoa WHERE cpf_hash = ${sqlEscape(cpfHash)} OR sq_candidato_tse_atual = ${sqlEscape(mapped.sq_candidato_tse)} LIMIT 1),
           ${sqlEscape(mapped.ano_eleicao)}, ${sqlEscape(mapped.turno)},
           (SELECT id FROM cargo WHERE codigo_tse = ${sqlEscape(mapped.codigo_cargo_tse)}),
           ${sqlEscape(mapped.sg_uf)}, ${sqlEscape(mapped.sq_candidato_tse)}, ${sqlEscape(mapped.numero_urna)}, ${sqlEscape(mapped.nome_urna)},
           (SELECT id FROM partido WHERE numero = ${sqlEscape(mapped.numero_partido)}),
           ${sqlEscape(mapped.sq_coligacao)}, ${sqlEscape(mapped.nome_coligacao)}, ${sqlEscape(mapped.composicao_coligacao)},
           ${sqlEscape(mapped.situacao_candidatura)}, ${sqlEscape(mapped.situacao_totalizacao_turno)},
           ${sqlEscape(mapped.reeleicao)}, ${sqlEscape(mapped.declarou_bens)}, 2,
           (SELECT id FROM fonte WHERE nome = 'Tribunal Superior Eleitoral')
         WHERE NOT EXISTS (SELECT 1 FROM candidatura WHERE ano_eleicao = ${sqlEscape(mapped.ano_eleicao)} AND sq_candidato_tse = ${sqlEscape(mapped.sq_candidato_tse)});`
      );
      // Backfill pra quem já foi inserido antes desta correção (achado em 25/09/2026 — ver nota em
      // mapConsultaCandRow) — UPDATE incondicional é seguro mesmo pra quem acabou de ser inserido
      // pelo INSERT acima (só reescreve os mesmos dois valores). Custo baixo: chave já é indexada
      // (UNIQUE(ano_eleicao, sq_candidato_tse)).
      sqlLines.push(
        `UPDATE candidatura SET reeleicao = ${sqlEscape(mapped.reeleicao)}, declarou_bens = ${sqlEscape(mapped.declarou_bens)}
         WHERE ano_eleicao = ${sqlEscape(mapped.ano_eleicao)} AND sq_candidato_tse = ${sqlEscape(mapped.sq_candidato_tse)};`
      );
      gravados++;
    }
  }

  for (const [numero, { sigla, nome }] of partidosVistos) {
    sqlLines.push(
      `INSERT OR IGNORE INTO partido (numero, sigla, nome) VALUES (${sqlEscape(numero)}, ${sqlEscape(sigla)}, ${sqlEscape(nome)});`
    );
  }

  // Partidos precisam vir ANTES das candidaturas para o subselect funcionar — reordena o array
  const partidoInserts = sqlLines.filter((l) => l.startsWith('INSERT OR IGNORE INTO partido'));
  const resto = sqlLines.filter((l) => !l.startsWith('INSERT OR IGNORE INTO partido'));
  const finalSql = [resto[0], resto[1], ...partidoInserts, ...resto.slice(2)].join('\n\n');

  const { writeFileSync } = await import('node:fs');
  writeFileSync(OUTPUT_SQL_PATH, finalSql, 'utf8');

  console.log(`\n[importar_local] Concluído.`);
  console.log(`  Linhas lidas:      ${lidos}`);
  console.log(`  Candidaturas para gravar: ${gravados}`);
  console.log(`  Ignoradas (fora do MVP ou sem chave): ${ignorados}`);
  console.log(`  Partidos distintos: ${partidosVistos.size}`);
  console.log(`  SQL gerado em: ${OUTPUT_SQL_PATH}`);
  console.log(`\nPróximo passo — aplicar no D1:`);
  console.log(`  wrangler d1 execute votocheck-db --remote --file=${path.relative(process.cwd(), OUTPUT_SQL_PATH)}`);
}

main().catch((e) => {
  console.error('[importar_local] Erro fatal:', e);
  process.exit(1);
});
