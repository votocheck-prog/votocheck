#!/usr/bin/env node
/**
 * VotoCheck — Cruzamento de candidatos (2026) com a Dívida Ativa da União (PGFN)
 *
 * O QUE ISSO FAZ
 *   Lê os CSVs oficiais de "Dívida Ativa da União" (dados abertos da PGFN, base legal:
 *   Lei 12.527/2011 - LAI, Decreto 8.777/2016), cruza o NOME_DEVEDOR de cada linha com o
 *   nome_completo de todos os candidatos de `ANO_ELEICAO` cadastrados no D1, gera um arquivo
 *   .sql com o resultado (fica salvo pra auditoria) e, por padrão, JÁ APLICA no D1 (a partir de
 *   24/09/2026 — antes disso era um segundo passo manual, `apply_d1.py`, que gerava confusão).
 *   Aplicar direto é seguro: ver a REGRA DE OURO abaixo — nada fica visível publicamente até
 *   alguém confirmar pelo painel /admin/divida-ativa. Passe --gerar-apenas se quiser só o .sql.
 *
 * REGRA DE OURO (decisão explícita do Rodrigo — não mudar sem confirmar com ele de novo):
 *   O CPF nos dados da PGFN vem PARCIALMENTE MASCARADO (ex.: "XXX735.623XX") por exigência da
 *   LGPD. Isso significa que o cruzamento aqui é feito só por NOME, e nome não é identificador
 *   único — pode dar homônimo (duas pessoas diferentes com o mesmo nome completo). Publicar um
 *   match automático como se fosse confirmado seria arriscar atribuir uma dívida de terceiro a
 *   um candidato, o que é grave (difamação/erro de atribuição).
 *   Por isso, TODO resultado aqui entra no banco com status_id = 2 ("em_acompanhamento" / "a
 *   confirmar") e NUNCA com status_id = 1 ("confirmado"). A promoção pra confirmado só pode
 *   acontecer manualmente, depois de um humano checar o CPF completo do candidato (via consulta
 *   ao TSE, que tem o CPF completo) e confirmar que bate com o registro da PGFN. Ver o passo 3
 *   no final da execução deste script.
 *   Hoje (23/09/2026) NADA no site lê `atributo_candidato` ainda — os dados ficam só no banco,
 *   invisíveis ao público, até: (a) alguém confirmar manualmente, e (b) uma tela de exibição
 *   pública ser construída pra badges confirmados. Isso é proposital (v1 mínima, sem risco).
 *
 * DE ONDE VÊM OS DADOS
 *   https://dadosabertos.pgfn.gov.br/Dados_abertos_Nao_Previdenciario.zip — dívida ativa "não
 *   previdenciária" (tributos federais em geral: IRPF, IRPJ, COFINS, CSLL, etc.) — layout
 *   confirmado em 23/09/2026 lendo o arquivo real (via leitura remota por HTTP range request,
 *   sem baixar o ZIP inteiro), colunas separadas por ";", sem aspas/escaping:
 *     CPF_CNPJ;TIPO_PESSOA;TIPO_DEVEDOR;NOME_DEVEDOR;UF_DEVEDOR;UNIDADE_RESPONSAVEL;
 *     NUMERO_INSCRICAO;TIPO_SITUACAO_INSCRICAO;SITUACAO_INSCRICAO;RECEITA_PRINCIPAL;
 *     DATA_INSCRICAO;INDICADOR_AJUIZADO;VALOR_CONSOLIDADO
 *   O ZIP vem dividido em ~6 CSVs (arquivo_lai_SIDA_1_AAAAMM.csv ... _6_...) só por causa do
 *   tamanho (o conjunto todo passa de 9 GB descomprimido). Este script lê os 6.
 *   Ainda NÃO estamos processando os outros dois datasets da PGFN (Dados_abertos_Previdenciario.zip
 *   e Dados_abertos_FGTS.zip) — decisão de escopo pro v1, pra validar o pipeline com o dataset
 *   mais relevante (tributos gerais) antes de expandir. Pra rodar contra outro dataset depois,
 *   basta chamar este script com --url=<outro .zip> e um --trimestre diferente.
 *
 * POR QUE ISSO RODA NA SUA MÁQUINA, NÃO NO WORKER
 *   O Worker do Cloudflare tem limite de CPU/tempo/subrequest por requisição — processar um
 *   dataset de 9+ GB é inviável lá. Este script usa a lib `unzipit` (já é dependência do
 *   projeto) com HTTPRangeReader pra ler o ZIP remoto sob demanda (não baixa o arquivo inteiro
 *   pra disco, só o que precisa), descomprime uma entrada de cada vez, e nunca converte um
 *   buffer inteiro em string de uma vez só (arquivos individuais passam de 1 GB e o V8 tem um
 *   limite de ~1 bilhão de caracteres por string — por isso o parsing de linha é feito direto
 *   em cima do Buffer, achando os bytes de quebra de linha, e só cada LINHA vira string).
 *
 * REQUISITOS
 *   - Node 18+ (usa fetch global, exigido pelo HTTPRangeReader do unzipit).
 *   - As mesmas variáveis de ambiente do scripts/apply_d1.py: CF_TOKEN, CF_ACCOUNT_ID (opcional,
 *     tem default), CF_D1_ID (opcional, tem default) — usadas aqui só pra LER a lista de
 *     candidatos 2026 do D1 (via scripts/d1_shim.mjs), nenhuma escrita acontece nesta etapa.
 *   - RAM livre: recomendado pelo menos 4 GB (a maior entrada do ZIP descomprime pra ~2.7 GB;
 *     processamos uma entrada por vez e descartamos antes de ir pra próxima, mas o pico de
 *     memória de uma entrada isolada ainda é grande). Se faltar memória, rode com:
 *       node --max-old-space-size=4096 scripts/importar_pgfn.mjs
 *   - Tempo esperado: dominado pelo download (~1.3 GB comprimidos no total) — de alguns minutos
 *     a ~30-60 min dependendo da sua conexão. Rode uma vez por trimestre (quando a PGFN publica
 *     atualização), não em todo deploy.
 *
 * COMO USAR
 *   1. CF_TOKEN=... node scripts/importar_pgfn.mjs
 *      (no PowerShell: $env:CF_TOKEN="..."; node scripts/importar_pgfn.mjs)
 *      Isso já aplica os resultados no D1 sozinho (status_id=2, "a confirmar" — ver REGRA DE
 *      OURO acima). Se preferir só gerar o .sql sem aplicar nada, rode com --gerar-apenas.
 *   2. Revise o resumo impresso no final (quantos candidatos deram match) e acesse
 *      https://votocheck.com.br/admin/divida-ativa (pede o ADMIN_TOKEN do Worker) — lá aparece
 *      cada match pendente com um resumo legível, e dois botões: "Confirmar" (só depois de checar
 *      o CPF completo do candidato via TSE) ou "Descartar" (homônimo).
 *   3. NUNCA pule essa checagem manual de CPF — é o próprio painel que promove pra confirmado
 *      (status_id=1) e só a partir daí o dado passa a poder aparecer no perfil público.
 *      (Se preferir mexer direto no banco em vez do painel, o SQL gerado em
 *      scripts/output/pgfn_divida_ativa_<trimestre>.sql fica salvo pra auditoria/uso manual com
 *      scripts/apply_d1.py, mas isso não é mais necessário no fluxo normal.)
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzip, HTTPRangeReader } from 'unzipit';
import AdmZip from 'adm-zip';
import { parseTseCsv, rowsToObjects } from '../src/lib/tse_parser.js';
import { DB } from './d1_shim.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ANO_ELEICAO = Number(args.ano) || 2026;
const PGFN_ZIP_URL = args.url || 'https://dadosabertos.pgfn.gov.br/Dados_abertos_Nao_Previdenciario.zip';
const OUTPUT_DIR = path.join(__dirname, 'output');

const ATRIBUTO_SLUG = 'divida_ativa_uniao_a_confirmar';
const FONTE_NOME = 'Procuradoria-Geral da Fazenda Nacional (PGFN)';
const REGRA_URL = 'https://votocheck.com.br/sobre#metodologia-divida-ativa-uniao';

// --- Cruzamento adicional por CPF (24/09/2026) -----------------------------------------------
// Ideia do Rodrigo: o nome sozinho pode dar homônimo, mas dá pra reduzir isso MUITO sem
// armazenar CPF em lugar nenhum. O dado aberto do TSE (consulta_cand) publica o CPF COMPLETO
// de cada candidato (NR_CPF_CANDIDATO) — é informação pública de agente político, diferente do
// CPF de eleitor comum. A PGFN, por sua vez, publica o CPF parcialmente mascarado no formato
// "XXX735.623XX" (3 mascarados, 6 dígitos centrais visíveis, 2 mascarados — confirmado lendo a
// amostra real). Então: pra cada candidato que bateu por NOME, buscamos o CPF completo dele no
// TSE (nunca gravamos isso em disco/banco/SQL — fica só em memória, descartado ao fim da
// execução) e conferimos se os 6 dígitos centrais batem com os da PGFN.
//   - Bate  -> confiança alta, mas AINDA ASSIM entra com status_id=2 (a REGRA DE OURO não mudou:
//              nenhum match automático publica sozinho). O texto do atributo deixa claro que o
//              CPF já foi conferido, então o clique de confirmação no painel vira um passo rápido
//              de auditoria, não a checagem em si.
//   - Não bate -> quase certamente homônimo (nome igual, pessoa diferente) -> o registro NEM
//              ENTRA no banco (nunca chega a virar pendência). Isso reduz falso-positivo sem
//              precisar de nenhuma revisão humana.
//   - Não deu pra conferir (TSE fora do ar, nome ambíguo pra mais de um CPF, formato de máscara
//              da PGFN diferente do esperado) -> comportamento antigo, sem mudança: entra como
//              "a confirmar" pedindo checagem manual de CPF via TSE, igual sempre foi.
// Rode com --pular-cpf pra desligar essa etapa e voltar ao comportamento só-por-nome de antes.
const TSE_CDN_BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const TSE_ZIP_LOCAL_PATH = path.join(__dirname, 'input', `consulta_cand_${ANO_ELEICAO}.zip`);

// Exige nome+sobrenome (2+ palavras) no índice de candidatos — reduz (não elimina) o risco de
// colisão com nomes de uma palavra só. A checagem manual de CPF continua sendo a defesa real.
const MIN_PALAVRAS_NOME = 2;

// Mesmo tamanho de lote usado em apply_d1.py, pelo mesmo motivo (limite prático de tamanho de
// corpo por chamada à API do D1).
const BATCH_SIZE = 400;

/** Aplica o SQL gerado direto no D1, em lotes — mesma lógica de scripts/apply_d1.py, mas usando
 *  o d1_shim.mjs (já importado neste arquivo) em vez de chamar um script Python separado. */
async function aplicarNoD1(sqlLines) {
  // sqlLines já vem sem BEGIN TRANSACTION/COMMIT úteis aqui — cada statement é aplicado como
  // uma chamada independente à API do D1, então removemos essas duas linhas de controle de
  // transação (a API do D1 não roda o lote inteiro dentro de uma única transação SQL de
  // qualquer forma) e aplicamos o restante em lotes.
  const statements = sqlLines.filter((l) => l !== 'BEGIN TRANSACTION;' && l !== 'COMMIT;');
  const total = statements.length;
  let ok = 0;
  let falhas = 0;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const lote = statements.slice(i, i + BATCH_SIZE).join('\n');
    try {
      await DB.prepare(lote).run();
      ok++;
    } catch (e) {
      falhas++;
      console.error(`  [lote ${Math.floor(i / BATCH_SIZE) + 1}] FALHA: ${e.message}`);
    }
  }
  console.log(`  lotes aplicados: ${ok} ok, ${falhas} falha(s), de ${Math.ceil(total / BATCH_SIZE)} no total.`);
  if (falhas > 0) {
    throw new Error(
      `${falhas} lote(s) falharam ao aplicar no D1 — o SQL completo continua salvo em scripts/output/ ` +
        `pra você aplicar manualmente com scripts/apply_d1.py depois de investigar o erro acima.`
    );
  }
}

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sha256Hex(value) {
  if (!value) return null;
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatarValorBRL(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Deriva o trimestre (ex.: "2026T2") a partir do nome do arquivo PGFN (padrão _AAAAMM.csv). */
function trimestreDoNomeArquivo(nomeArquivo) {
  const m = nomeArquivo.match(/_(\d{4})(\d{2})\.csv$/i);
  if (!m) return null;
  const ano = m[1];
  const mes = Number(m[2]);
  const trimestre = Math.ceil(mes / 3);
  return `${ano}T${trimestre}`;
}

async function carregarCandidatos() {
  console.log(`[importar_pgfn] Buscando candidaturas ${ANO_ELEICAO} no D1...`);
  const { results } = await DB.prepare(
    `SELECT c.id as candidatura_id, p.nome_completo, p.nome_urna_atual, ca.nome as cargo_nome, c.sg_uf
     FROM candidatura c
     JOIN pessoa p ON p.id = c.pessoa_id
     JOIN cargo ca ON ca.id = c.cargo_id
     WHERE c.ano_eleicao = ?`
  )
    .bind(ANO_ELEICAO)
    .all();
  console.log(`[importar_pgfn] ${results.length} candidaturas carregadas do D1.`);

  const indice = new Map();
  let ignoradosPorNomeCurto = 0;
  for (const row of results) {
    const chave = normalizarNome(row.nome_completo);
    if (!chave || chave.split(' ').length < MIN_PALAVRAS_NOME) {
      ignoradosPorNomeCurto++;
      continue;
    }
    if (!indice.has(chave)) indice.set(chave, []);
    indice.get(chave).push(row);
  }
  console.log(
    `[importar_pgfn] ${indice.size} nomes distintos indexados (${ignoradosPorNomeCurto} candidaturas ignoradas por nome curto/ausente).`
  );
  return indice;
}

/** Baixa (ou usa cache local em scripts/input/) o ZIP de candidatos do TSE — mesmo dataset e
 *  mesma URL que collectors/tse_candidatos.js e importar_local.mjs já usam em produção. */
async function obterZipCandidatosTse() {
  if (existsSync(TSE_ZIP_LOCAL_PATH)) {
    console.log(`[importar_pgfn] Usando ZIP de candidatos TSE já baixado: ${TSE_ZIP_LOCAL_PATH}`);
    return readFileSync(TSE_ZIP_LOCAL_PATH);
  }
  const url = `${TSE_CDN_BASE}/consulta_cand/consulta_cand_${ANO_ELEICAO}.zip`;
  console.log(`[importar_pgfn] Baixando dataset de candidatos do TSE (pra conferência de CPF): ${url}`);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'application/zip,*/*',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao baixar ${url}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  mkdirSync(path.dirname(TSE_ZIP_LOCAL_PATH), { recursive: true });
  writeFileSync(TSE_ZIP_LOCAL_PATH, buffer);
  console.log(`[importar_pgfn] ZIP do TSE salvo em cache local: ${TSE_ZIP_LOCAL_PATH}`);
  return buffer;
}

/**
 * Busca, no dataset aberto do TSE, o CPF completo (NR_CPF_CANDIDATO) de cada nome em
 * `nomesDesejados` (já normalizados — só os nomes que deram match no PGFN, pra não processar o
 * Brasil inteiro à toa). NUNCA grava isso em disco/banco — só em memória, descartado ao final
 * desta função ser usada. Retorna Map(nomeNormalizado -> Set de CPFs em texto puro, só dígitos).
 * Em caso de falha (TSE fora do ar, bloqueio de rede, etc.) retorna null e AVISA — quem chamou
 * deve cair de volta pro fluxo manual-only, nunca travar a importação inteira por causa disso.
 */
async function carregarCpfsTsePorNome(nomesDesejados) {
  try {
    const zipBuffer = await obterZipCandidatosTse();
    const zip = new AdmZip(zipBuffer);
    const entradas = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith('.csv'));
    console.log(`[importar_pgfn] ${entradas.length} arquivo(s) CSV de candidatos do TSE — cruzando CPF só dos ${nomesDesejados.size} nome(s) que bateram no PGFN...`);

    const mapa = new Map(); // nomeNormalizado -> Set(cpf só-dígitos)
    for (const entrada of entradas) {
      const texto = entrada.getData().toString('latin1');
      const { header, rows } = parseTseCsv(texto);
      const objetos = rowsToObjects(header, rows);
      for (const row of objetos) {
        const nome = row.NM_CANDIDATO;
        if (!nome) continue;
        const chave = normalizarNome(nome);
        if (!nomesDesejados.has(chave)) continue;
        const cpfDigitos = String(row.NR_CPF_CANDIDATO || '').replace(/\D/g, '');
        if (cpfDigitos.length !== 11) continue;
        if (!mapa.has(chave)) mapa.set(chave, new Set());
        mapa.get(chave).add(cpfDigitos);
      }
    }
    console.log(`[importar_pgfn] CPF do TSE localizado para ${mapa.size} de ${nomesDesejados.size} nome(s) buscados.`);
    return mapa;
  } catch (e) {
    console.warn(
      `[importar_pgfn] AVISO: não foi possível baixar/ler o dataset de candidatos do TSE pra conferência ` +
        `de CPF (${e.message}). Seguindo sem essa conferência — todo mundo cai no fluxo manual-only de ` +
        `sempre (checagem de CPF via TSE feita por você, no painel).`
    );
    return null;
  }
}

/** Extrai os 6 dígitos centrais visíveis do CPF mascarado da PGFN (formato confirmado em
 *  23/09/2026: "XXX735.623XX" — 3 mascarados, 3 dígitos, ponto, 3 dígitos, 2 mascarados).
 *  Retorna null se o formato vier diferente do esperado (não força — prefere não conferir a
 *  conferir errado). */
function digitosVisiveisPgfn(cpfMascarado) {
  if (!cpfMascarado) return null;
  const m = String(cpfMascarado)
    .trim()
    .match(/^X{3}(\d{3})\.?(\d{3})X{2}$/i);
  if (!m) return null;
  return m[1] + m[2];
}

/**
 * Confere um candidato específico contra o cruzamento de CPF. Retorna:
 *   'confere'      -> os 6 dígitos centrais batem (mesma pessoa, confiança alta)
 *   'nao_confere'  -> os 6 dígitos centrais NÃO batem (quase certamente homônimo)
 *   'indisponivel' -> não deu pra conferir (sem dado do TSE, nome ambíguo p/ >1 CPF, ou máscara
 *                     da PGFN em formato inesperado) — cai no fluxo manual-only de sempre
 */
function conferirCpf(nomeNormalizado, cpfMascaradoPgfn, cpfsTsePorNome) {
  if (!cpfsTsePorNome) return 'indisponivel';
  const digitosPgfn = digitosVisiveisPgfn(cpfMascaradoPgfn);
  if (!digitosPgfn) return 'indisponivel';
  const candidatosCpf = cpfsTsePorNome.get(nomeNormalizado);
  if (!candidatosCpf || candidatosCpf.size !== 1) return 'indisponivel'; // 0 ou >1 CPF pro mesmo nome — ambíguo, não arrisca
  const [cpfReal] = candidatosCpf;
  const digitosReais = cpfReal.slice(3, 9);
  return digitosReais === digitosPgfn ? 'confere' : 'nao_confere';
}

/** Itera as linhas de um Buffer sem nunca converter o Buffer inteiro em string
 *  (entradas do PGFN passam de 1 GB descomprimidas, acima do limite de string do V8). */
function* linhasDoBuffer(buffer) {
  const len = buffer.length;
  let start = 0;
  while (start < len) {
    let end = buffer.indexOf(0x0a, start);
    if (end === -1) end = len;
    let lineEnd = end;
    if (lineEnd > start && buffer[lineEnd - 1] === 0x0d) lineEnd--; // remove \r
    if (lineEnd > start) {
      yield buffer.toString('latin1', start, lineEnd);
    }
    start = end + 1;
  }
}

/** PGFN não usa aspas/escaping no ";" — confirmado na amostra real (23/09/2026). Split direto. */
function parseLinhaPgfn(linha) {
  return linha.split(';');
}

const COLUNAS_OBRIGATORIAS = [
  'CPF_CNPJ',
  'TIPO_PESSOA',
  'TIPO_DEVEDOR',
  'NOME_DEVEDOR',
  'UF_DEVEDOR',
  'NUMERO_INSCRICAO',
  'SITUACAO_INSCRICAO',
  'RECEITA_PRINCIPAL',
  'DATA_INSCRICAO',
  'INDICADOR_AJUIZADO',
  'VALOR_CONSOLIDADO',
];

function processarBuffer(nomeEntrada, buffer, indiceCandidatos, resultados, estatisticas) {
  let header = null;
  let colIdx = null;
  for (const linha of linhasDoBuffer(buffer)) {
    if (!header) {
      header = parseLinhaPgfn(linha);
      colIdx = Object.fromEntries(header.map((c, i) => [c.trim(), i]));
      for (const c of COLUNAS_OBRIGATORIAS) {
        if (!(c in colIdx)) {
          throw new Error(
            `[importar_pgfn] Coluna esperada "${c}" não encontrada em ${nomeEntrada} — o layout ` +
              `da PGFN pode ter mudado desde 23/09/2026. Confira as colunas reais antes de prosseguir ` +
              `(não force o parsing às cegas).`
          );
        }
      }
      continue;
    }
    estatisticas.linhasLidas++;
    const campos = parseLinhaPgfn(linha);
    if (campos[colIdx.TIPO_PESSOA] !== 'Pessoa física') continue;

    const chave = normalizarNome(campos[colIdx.NOME_DEVEDOR]);
    if (!chave) continue;
    const candidatosMatch = indiceCandidatos.get(chave);
    if (!candidatosMatch) continue;

    estatisticas.linhasComMatch++;
    const registro = {
      tipoDevedor: campos[colIdx.TIPO_DEVEDOR],
      ufDevedor: campos[colIdx.UF_DEVEDOR],
      numeroInscricao: campos[colIdx.NUMERO_INSCRICAO],
      situacaoInscricao: campos[colIdx.SITUACAO_INSCRICAO],
      receitaPrincipal: campos[colIdx.RECEITA_PRINCIPAL],
      dataInscricao: campos[colIdx.DATA_INSCRICAO],
      indicadorAjuizado: campos[colIdx.INDICADOR_AJUIZADO],
      valorConsolidado: Number(String(campos[colIdx.VALOR_CONSOLIDADO]).replace(',', '.')) || 0,
      arquivoOrigem: nomeEntrada,
      cpfMascarado: campos[colIdx.CPF_CNPJ],
    };

    for (const candidato of candidatosMatch) {
      if (!resultados.has(candidato.candidatura_id)) {
        resultados.set(candidato.candidatura_id, { candidato, registros: [] });
      }
      resultados.get(candidato.candidatura_id).registros.push(registro);
    }
  }
}

function montarValorAtributo(registros, confiancaCpf) {
  const total = registros.reduce((s, r) => s + r.valorConsolidado, 0);
  const temAjuizado = registros.some((r) => r.indicadorAjuizado === 'SIM');
  const tiposDevedor = [...new Set(registros.map((r) => r.tipoDevedor))];
  const situacoes = [...new Set(registros.map((r) => r.situacaoInscricao))];
  const receitas = [...new Set(registros.map((r) => r.receitaPrincipal))].slice(0, 6);
  const ufs = [...new Set(registros.map((r) => r.ufDevedor))];
  const base =
    `Nome encontrado na Dívida Ativa da União (PGFN), dado aberto trimestral — ` +
    `${registros.length} registro(s) de inscrição, valor consolidado somado R$ ${formatarValorBRL(total)}` +
    `${temAjuizado ? ', com pelo menos uma execução judicial em andamento' : ''}. ` +
    `Natureza da dívida: ${tiposDevedor.join(', ')}. Situação: ${situacoes.join(', ')}. ` +
    `Tipo(s) de receita: ${receitas.join('; ')}. UF do devedor no registro: ${ufs.join(', ')}. `;

  if (confiancaCpf === 'confere') {
    return (
      base +
      `CPF CONFERIDO AUTOMATICAMENTE — os 6 dígitos centrais do CPF deste candidato (fonte: dado ` +
      `aberto do TSE, consulta_cand) batem com os dígitos visíveis no registro da PGFN. Confiança ` +
      `alta de que é a mesma pessoa. Mesmo assim, por regra do VotoCheck, isto só aparece no perfil ` +
      `público depois de um curador confirmar pelo painel administrativo — aqui a confirmação é uma ` +
      `auditoria rápida, não a checagem em si (que já foi feita automaticamente).`
    );
  }
  return (
    base +
    `AGUARDANDO CONFIRMAÇÃO MANUAL — o CPF divulgado pela PGFN vem parcialmente mascarado (LGPD), ` +
    `então este cruzamento é feito só por nome completo e pode ser homônimo. Não publicar como ` +
    `confirmado sem checar o CPF completo do candidato (consulta ao TSE) contra este registro.`
  );
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const indiceCandidatos = await carregarCandidatos();

  console.log(`[importar_pgfn] Abrindo ZIP remoto (leitura sob demanda via HTTP range): ${PGFN_ZIP_URL}`);
  const reader = new HTTPRangeReader(PGFN_ZIP_URL);
  const { entries } = await unzip(reader);
  const nomesCsv = Object.keys(entries).filter((n) => n.toLowerCase().endsWith('.csv'));
  if (nomesCsv.length === 0) {
    throw new Error('[importar_pgfn] Nenhum .csv encontrado dentro do ZIP — layout do pacote pode ter mudado.');
  }
  console.log(`[importar_pgfn] ${nomesCsv.length} arquivo(s) CSV no ZIP: ${nomesCsv.join(', ')}`);

  const trimestre = args.trimestre || trimestreDoNomeArquivo(nomesCsv[0]) || 'sem-data';
  console.log(`[importar_pgfn] Trimestre identificado: ${trimestre}`);

  const resultados = new Map(); // candidatura_id -> { candidato, registros: [] }
  const estatisticas = { linhasLidas: 0, linhasComMatch: 0 };

  for (const nome of nomesCsv) {
    const tamanhoMB = (entries[nome].size / 1e6).toFixed(0);
    console.log(`[importar_pgfn] Baixando/descomprimindo ${nome} (~${tamanhoMB} MB descomprimido)...`);
    const t0 = Date.now();
    const arrayBuffer = await entries[nome].arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`  ...pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s, processando linhas...`);
    processarBuffer(nome, buffer, indiceCandidatos, resultados, estatisticas);
    console.log(
      `  total até agora: ${estatisticas.linhasLidas} linhas lidas, ${resultados.size} candidatura(s) distinta(s) com match`
    );
  }

  console.log(
    `\n[importar_pgfn] Leitura concluída. ${resultados.size} candidatura(s) com possível dívida ativa (a confirmar).`
  );

  // --- Conferência de CPF via TSE (24/09/2026) --- ver comentário no topo do arquivo.
  const confiancaPorCandidatura = new Map(); // candidatura_id -> 'confere' | 'nao_confere' | 'indisponivel'
  if (!args['pular-cpf'] && resultados.size > 0) {
    const nomesParaConferir = new Set(
      [...resultados.values()].map(({ candidato }) => normalizarNome(candidato.nome_completo))
    );
    const cpfsTsePorNome = await carregarCpfsTsePorNome(nomesParaConferir);
    let nConfere = 0;
    let nNaoConfere = 0;
    let nIndisponivel = 0;
    for (const [candidaturaId, { candidato, registros }] of resultados) {
      const chave = normalizarNome(candidato.nome_completo);
      const cpfMascarado = registros.find((r) => r.cpfMascarado)?.cpfMascarado;
      const resultado = conferirCpf(chave, cpfMascarado, cpfsTsePorNome);
      confiancaPorCandidatura.set(candidaturaId, resultado);
      if (resultado === 'confere') nConfere++;
      else if (resultado === 'nao_confere') nNaoConfere++;
      else nIndisponivel++;
    }
    // Remove da lista quem o CPF contradisse — provável homônimo, nunca devia nem virar pendência.
    for (const [candidaturaId, resultado] of confiancaPorCandidatura) {
      if (resultado === 'nao_confere') resultados.delete(candidaturaId);
    }
    console.log(
      `[importar_pgfn] Conferência de CPF via TSE: ${nConfere} confirmado(s) por CPF (alta confiança), ` +
        `${nNaoConfere} descartado(s) automaticamente por CPF NÃO bater (provável homônimo — nunca chegou a virar pendência), ` +
        `${nIndisponivel} sem conferência possível (segue fluxo manual de sempre).`
    );
  } else if (args['pular-cpf']) {
    console.log(`[importar_pgfn] --pular-cpf: pulando a conferência de CPF via TSE (comportamento só-por-nome de antes).`);
  }

  const dataColeta = new Date().toISOString().slice(0, 10);
  const sqlLines = [];
  sqlLines.push(`-- Gerado por scripts/importar_pgfn.mjs em ${new Date().toISOString()} — NÃO editar manualmente.`);
  sqlLines.push(`-- Trimestre PGFN: ${trimestre} | Fonte: ${PGFN_ZIP_URL}`);
  sqlLines.push(
    `-- Todo registro entra com status_id = 2 (em_acompanhamento/"a confirmar"). NUNCA promover em massa —`
  );
  sqlLines.push(`-- ver instruções de revisão manual impressas no final da execução deste script.`);
  sqlLines.push('BEGIN TRANSACTION;');
  sqlLines.push(
    `INSERT INTO fonte (nome, tipo, url_base, descricao)
     SELECT ${sqlEscape(FONTE_NOME)}, 'institucional_oficial', 'https://dadosabertos.pgfn.gov.br', 'Dados abertos da Dívida Ativa da União — Lei 12.527/2011 (LAI) e Decreto 8.777/2016 (Política de Dados Abertos)'
     WHERE NOT EXISTS (SELECT 1 FROM fonte WHERE nome = ${sqlEscape(FONTE_NOME)});`
  );

  for (const [candidaturaId, { registros }] of resultados) {
    const idExterno = `pgfn-${trimestre}-candidatura-${candidaturaId}`;
    const hash = sha256Hex(JSON.stringify(registros));
    const numerosAmostra = registros
      .map((r) => r.numeroInscricao)
      .slice(0, 10)
      .join(', ');
    const localizacao = `${registros.length} registro(s) de inscrição em dívida ativa — números: ${numerosAmostra}${
      registros.length > 10 ? '...' : ''
    }`;
    const valor = montarValorAtributo(registros, confiancaPorCandidatura.get(candidaturaId));

    sqlLines.push(
      `INSERT INTO evidencia (tipo, fonte_id, url, data_publicacao, id_externo, hash_arquivo, localizacao, status_id)
       SELECT 'csv_oficial', (SELECT id FROM fonte WHERE nome = ${sqlEscape(FONTE_NOME)}), ${sqlEscape(
        PGFN_ZIP_URL
      )}, ${sqlEscape(dataColeta)}, ${sqlEscape(idExterno)}, ${sqlEscape(hash)}, ${sqlEscape(localizacao)}, 1
       WHERE NOT EXISTS (SELECT 1 FROM evidencia WHERE id_externo = ${sqlEscape(idExterno)});`
    );

    // Atualiza um match já existente, mas só enquanto ninguém revisou manualmente ainda
    // (status_id = 2). Se um humano já confirmou (1), contestou (3) ou tomou qualquer outra
    // decisão, uma nova rodada trimestral NUNCA sobrescreve isso silenciosamente.
    sqlLines.push(
      `UPDATE atributo_candidato
       SET valor = ${sqlEscape(valor)}, evidencia_id = (SELECT id FROM evidencia WHERE id_externo = ${sqlEscape(
        idExterno
      )})
       WHERE candidatura_id = ${candidaturaId} AND atributo_slug = ${sqlEscape(ATRIBUTO_SLUG)} AND status_id = 2;`
    );

    sqlLines.push(
      `INSERT INTO atributo_candidato (candidatura_id, atributo_slug, valor, regra_publicada_url, evidencia_id, status_id)
       SELECT ${candidaturaId}, ${sqlEscape(ATRIBUTO_SLUG)}, ${sqlEscape(valor)}, ${sqlEscape(
        REGRA_URL
      )}, (SELECT id FROM evidencia WHERE id_externo = ${sqlEscape(idExterno)}), 2
       WHERE NOT EXISTS (SELECT 1 FROM atributo_candidato WHERE candidatura_id = ${candidaturaId} AND atributo_slug = ${sqlEscape(
        ATRIBUTO_SLUG
      )});`
    );
  }

  sqlLines.push('COMMIT;');
  const outPath = path.join(OUTPUT_DIR, `pgfn_divida_ativa_${trimestre}.sql`);
  writeFileSync(outPath, sqlLines.join('\n\n'), 'utf8');

  console.log(`\n[importar_pgfn] Resumo:`);
  console.log(`  Linhas lidas no total: ${estatisticas.linhasLidas}`);
  console.log(`  Linhas com match (pessoa física, nome bate exatamente): ${estatisticas.linhasComMatch}`);
  console.log(`  Candidaturas distintas com possível dívida: ${resultados.size}`);
  console.log(`  SQL gerado em: ${outPath}`);

  // A partir de 24/09/2026 (seção 31), este script também APLICA o SQL direto no D1 (usando o
  // mesmo d1_shim.mjs do apply_d1.py) — antes disso era um passo manual separado
  // (`python3 scripts/apply_d1.py ...`), e ficou claro que essa separação confundia mais do que
  // ajudava. Continua seguro aplicar direto: todo registro entra com status_id=2 e nada disso
  // aparece publicamente até alguém confirmar pelo painel /admin/divida-ativa. Passe
  // --gerar-apenas se quiser só o arquivo .sql, sem aplicar.
  if (args['gerar-apenas']) {
    console.log(`\n[importar_pgfn] --gerar-apenas: nada foi aplicado no D1. Pra aplicar depois:`);
    console.log(`     python3 scripts/apply_d1.py ${path.relative(process.cwd(), outPath)}`);
  } else if (resultados.size === 0) {
    console.log(`\n[importar_pgfn] Nenhum candidato deu match — nada para aplicar no D1.`);
  } else {
    console.log(`\n[importar_pgfn] Aplicando no D1...`);
    await aplicarNoD1(sqlLines);
    console.log(`[importar_pgfn] Aplicado com sucesso.`);
  }

  console.log(`\nPróximos passos:`);
  console.log(`  1. Abra o painel de revisão no navegador: https://votocheck.com.br/admin/divida-ativa`);
  console.log(`     (pede o ADMIN_TOKEN configurado no Worker — se não configurou nenhum, deixe em branco)`);
  console.log(`  2. Pra cada candidato listado, confira o CPF completo dele no TSE (consulta pública) contra`);
  console.log(`     o registro da PGFN descrito no card, e clique em "Confirmar" ou "Descartar (homônimo)".`);
  console.log(`  3. NUNCA confirme sem checar o CPF completo — nome sozinho pode ser homônimo.`);
  console.log(`  (Nada disso aparece no site público até você clicar em "Confirmar" no painel.)`);
  console.log(`\n[apenas se preferir SQL direto em vez do painel] Query de revisão manual:`);
  console.log(`     SELECT ac.id, p.nome_completo, p.nome_urna_atual, c.sg_uf, ca.nome as cargo, ac.valor`);
  console.log(`     FROM atributo_candidato ac`);
  console.log(`     JOIN candidatura c ON c.id = ac.candidatura_id`);
  console.log(`     JOIN pessoa p ON p.id = c.pessoa_id`);
  console.log(`     JOIN cargo ca ON ca.id = c.cargo_id`);
  console.log(`     WHERE ac.atributo_slug = '${ATRIBUTO_SLUG}' AND ac.status_id = 2;`);
  console.log(`  Promover manualmente (só depois de checar o CPF via TSE):`);
  console.log(`     UPDATE atributo_candidato SET status_id = 1 WHERE id = <id>;`);
  console.log(`  Descartar homônimo:`);
  console.log(`     DELETE FROM atributo_candidato WHERE id = <id>;`);
}

main().catch((e) => {
  console.error('[importar_pgfn] Erro fatal:', e);
  process.exit(1);
});
