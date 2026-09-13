/**
 * VotoCheck — Parser de arquivos CSV do TSE (dadosabertos.tse.jus.br)
 *
 * Regras de formato oficiais (confirmadas via documentação TSE + amostras reais):
 *  - Encoding: Latin-1 (ISO-8859-1) — NUNCA UTF-8 direto, precisa decodificar corretamente
 *  - Delimitador: ponto-e-vírgula (;)
 *  - TODOS os campos vêm entre aspas duplas, inclusive numéricos
 *  - Sentinela de nulo: #NULO (texto) — em campos numéricos aparece como -1
 *  - Sentinela de "não existia naquele ano": #NE (texto) — em campos numéricos aparece como -3
 *  - UF pode ser sigla de estado, 'BR' (nacional, ex: Presidente), 'VT' (voto em trânsito), 'ZZ' (exterior)
 *
 * Este módulo é usado tanto pelo Worker (importação incremental via cron)
 * quanto pelo script de importação local (carga inicial em volume).
 */

/** Decodifica um ArrayBuffer em Latin-1 (ISO-8859-1) para string JS (UTF-16). */
export function decodeLatin1(buffer) {
  const bytes = new Uint8Array(buffer);
  // TextDecoder('iso-8859-1') é suportado nativamente no runtime de Workers.
  return new TextDecoder('iso-8859-1').decode(bytes);
}

/**
 * Parser de CSV "estilo TSE": delimitador ';', todos os campos entre aspas duplas,
 * possível escaping de aspas internas como "" (regra RFC4180 padrão).
 * Retorna { header: string[], rows: string[][] }.
 */
export function parseTseCsv(text) {
  // Normaliza quebras de linha e remove BOM se presente.
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

/** Converte uma lista de linhas + header em lista de objetos {coluna: valor}. */
export function rowsToObjects(header, rows) {
  return rows.map((row) => {
    const obj = {};
    header.forEach((col, idx) => {
      obj[col] = row[idx] !== undefined ? row[idx] : null;
    });
    return obj;
  });
}

/** Resolve sentinelas TSE para valores JS (null) — usar em campos de TEXTO. */
export function tseTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (v === '' || v === '#NULO' || v === '#NE') return null;
  return v;
}

/** Resolve sentinelas TSE para valores JS em campos NUMÉRICOS (-1 = nulo, -3 = não existia). */
export function tseNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (v === '' || v === '#NULO') return null;
  if (v === '#NE') return null;
  const n = Number(v.replace(',', '.'));
  if (Number.isNaN(n)) return null;
  if (n === -1 || n === -3) return null; // sentinelas numéricas equivalentes
  return n;
}

/**
 * Mapeia uma linha bruta do consulta_cand_AAAA.csv (já convertida para objeto pelo rowsToObjects)
 * para o formato que o schema D1 do VotoCheck espera nas tabelas pessoa/candidatura.
 * Mantém os nomes de campo originais do TSE como comentário para rastreabilidade.
 */
export function mapConsultaCandRow(row) {
  return {
    // identificação da candidatura
    sq_candidato_tse: tseTextOrNull(row.SQ_CANDIDATO),
    ano_eleicao: tseNumberOrNull(row.ANO_ELEICAO),
    turno: tseNumberOrNull(row.NR_TURNO) ?? 1,
    codigo_cargo_tse: tseNumberOrNull(row.CD_CARGO),
    descricao_cargo: tseTextOrNull(row.DS_CARGO),
    sg_uf: tseTextOrNull(row.SG_UF),
    numero_urna: tseNumberOrNull(row.NR_CANDIDATO),
    nome_urna: tseTextOrNull(row.NM_URNA_CANDIDATO),

    // identificação da pessoa
    nome_completo: tseTextOrNull(row.NM_CANDIDATO),
    nome_social: tseTextOrNull(row.NM_SOCIAL_CANDIDATO),
    cpf: tseTextOrNull(row.NR_CPF_CANDIDATO), // será hasheado antes de gravar — nunca gravar em claro
    titulo_eleitoral: tseTextOrNull(row.NR_TITULO_ELEITORAL_CANDIDATO),
    email: tseTextOrNull(row.NM_EMAIL),
    data_nascimento: tseTextOrNull(row.DT_NASCIMENTO),
    genero: tseTextOrNull(row.DS_GENERO),
    cor_raca: tseTextOrNull(row.DS_COR_RACA),
    grau_instrucao: tseTextOrNull(row.DS_GRAU_INSTRUCAO),
    estado_civil: tseTextOrNull(row.DS_ESTADO_CIVIL),
    ocupacao: tseTextOrNull(row.DS_OCUPACAO),

    // partido / coligação
    numero_partido: tseNumberOrNull(row.NR_PARTIDO),
    sigla_partido: tseTextOrNull(row.SG_PARTIDO),
    nome_partido: tseTextOrNull(row.NM_PARTIDO),
    sq_coligacao: tseTextOrNull(row.SQ_COLIGACAO),
    nome_coligacao: tseTextOrNull(row.NM_COLIGACAO),
    composicao_coligacao: tseTextOrNull(row.DS_COMPOSICAO_COLIGACAO),

    // situação
    situacao_candidatura: tseTextOrNull(row.DS_SITUACAO_CANDIDATURA),
    detalhe_situacao_candidatura: tseTextOrNull(row.DS_DETALHE_SITUACAO_CAND),
    situacao_totalizacao_turno: tseTextOrNull(row.DS_SIT_TOT_TURNO),

    // outros
    reeleicao: tseTextOrNull(row.ST_REELEICAO),
    declarou_bens: tseTextOrNull(row.ST_DECLARAR_BENS),
    valor_max_despesa_campanha: tseNumberOrNull(row.VR_DESPESA_MAX_CAMPANHA),
    data_geracao_arquivo: tseTextOrNull(row.DT_GERACAO),
  };
}

/** Mapeia uma linha do rede_social_candidato_AAAA.csv. Colunas esperadas: SQ_CANDIDATO, NR_ORDEM_REDE_SOCIAL, DS_URL. */
export function mapRedeSocialRow(row) {
  return {
    sq_candidato_tse: tseTextOrNull(row.SQ_CANDIDATO),
    ordem: tseNumberOrNull(row.NR_ORDEM_REDE_SOCIAL),
    url: tseTextOrNull(row.DS_URL),
  };
}

/** Mapeia uma linha do bem_candidato_AAAA.csv. */
export function mapBemCandidatoRow(row) {
  return {
    sq_candidato_tse: tseTextOrNull(row.SQ_CANDIDATO),
    codigo_tipo_bem: tseTextOrNull(row.CD_TIPO_BEM_CANDIDATO),
    descricao_tipo_bem: tseTextOrNull(row.DS_TIPO_BEM_CANDIDATO),
    descricao_bem: tseTextOrNull(row.DS_BEM_CANDIDATO),
    valor_bem: tseNumberOrNull(row.VR_BEM_CANDIDATO),
    data_ultima_atualizacao: tseTextOrNull(row.DT_ULTIMA_ATUALIZACAO),
  };
}

/** Gera hash SHA-256 hex de um valor (usado para cpf_hash — nunca gravar CPF em claro). */
export async function sha256Hex(value) {
  if (!value) return null;
  const enc = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Códigos de cargo do TSE relevantes ao MVP (todos os cargos majoritários e proporcionais):
 *  1 = Presidente | 3 = Governador | 5 = Senador | 6 = Deputado Federal
 *  7 = Deputado Estadual | 8 = Deputado Distrital
 * (2=Vice-Presidente e 4=Vice-Governador ficam de fora do MVP — são chapa, não cargo autônomo)
 */
export const CARGOS_MVP = new Set([1, 3, 5, 6, 7, 8]);
