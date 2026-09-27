/**
 * Perfil dos filiados por partido — estatística oficial do TSE ("Perfil Filiação Partidária",
 * cdn.tse.jus.br/estatistica/sead/odsele/filiacao_partidaria/perfil_filiacao_partidaria.zip),
 * referência 08/2026 (arquivo gerado em 01/09/2026). Agregado pelo Claude em 27/09/2026 a partir do
 * CSV de 3,5 GB baixado pelo Rodrigo: é uma base AGREGADA (sem nome/CPF), então não serve para a
 * ficha individual do candidato — serve para o card de cada partido em /partidos.
 * Chave = número oficial do partido. Percentuais sobre o total de filiações do partido.
 */
export const FILIADOS_REF = '08/2026';
export const FILIADOS_POR_NUMERO = {
 "15": {
  "sigla": "MDB",
  "total": 2018641,
  "mulheres": 48,
  "ate34": 5,
  "sup": 15
 },
 "13": {
  "sigla": "PT",
  "total": 1665676,
  "mulheres": 48,
  "ate34": 7,
  "sup": 17
 },
 "11": {
  "sigla": "PP",
  "total": 1285934,
  "mulheres": 47,
  "ate34": 6,
  "sup": 15
 },
 "25": {
  "sigla": "PRD",
  "total": 1280750,
  "mulheres": 48,
  "ate34": 5,
  "sup": 13
 },
 "45": {
  "sigla": "PSDB",
  "total": 1260423,
  "mulheres": 47,
  "ate34": 5,
  "sup": 18
 },
 "12": {
  "sigla": "PDT",
  "total": 1073069,
  "mulheres": 47,
  "ate34": 5,
  "sup": 13
 },
 "44": {
  "sigla": "UNIÃO",
  "total": 1067357,
  "mulheres": 46,
  "ate34": 6,
  "sup": 16
 },
 "22": {
  "sigla": "PL",
  "total": 955306,
  "mulheres": 43,
  "ate34": 8,
  "sup": 16
 },
 "20": {
  "sigla": "PODE",
  "total": 796910,
  "mulheres": 46,
  "ate34": 9,
  "sup": 14
 },
 "40": {
  "sigla": "PSB",
  "total": 639067,
  "mulheres": 46,
  "ate34": 8,
  "sup": 17
 },
 "10": {
  "sigla": "REPUBLICANOS",
  "total": 565839,
  "mulheres": 50,
  "ate34": 13,
  "sup": 13
 },
 "55": {
  "sigla": "PSD",
  "total": 466241,
  "mulheres": 44,
  "ate34": 15,
  "sup": 19
 },
 "23": {
  "sigla": "CIDADANIA",
  "total": 413584,
  "mulheres": 45,
  "ate34": 4,
  "sup": 16
 },
 "65": {
  "sigla": "PCDOB",
  "total": 383643,
  "mulheres": 47,
  "ate34": 8,
  "sup": 14
 },
 "77": {
  "sigla": "SOLIDARIEDADE",
  "total": 374209,
  "mulheres": 46,
  "ate34": 18,
  "sup": 14
 },
 "43": {
  "sigla": "PV",
  "total": 340466,
  "mulheres": 44,
  "ate34": 7,
  "sup": 19
 },
 "50": {
  "sigla": "PSOL",
  "total": 291251,
  "mulheres": 52,
  "ate34": 25,
  "sup": 16
 },
 "70": {
  "sigla": "AVANTE",
  "total": 243564,
  "mulheres": 46,
  "ate34": 11,
  "sup": 13
 },
 "33": {
  "sigla": "MOBILIZA",
  "total": 207080,
  "mulheres": 47,
  "ate34": 6,
  "sup": 12
 },
 "36": {
  "sigla": "AGIR",
  "total": 194426,
  "mulheres": 47,
  "ate34": 8,
  "sup": 12
 },
 "27": {
  "sigla": "DC",
  "total": 182753,
  "mulheres": 46,
  "ate34": 6,
  "sup": 13
 },
 "28": {
  "sigla": "PRTB",
  "total": 142809,
  "mulheres": 46,
  "ate34": 8,
  "sup": 13
 },
 "30": {
  "sigla": "NOVO",
  "total": 82108,
  "mulheres": 28,
  "ate34": 21,
  "sup": 36
 },
 "18": {
  "sigla": "REDE",
  "total": 55748,
  "mulheres": 46,
  "ate34": 23,
  "sup": 20
 },
 "35": {
  "sigla": "DEMOCRATA",
  "total": 55519,
  "mulheres": 54,
  "ate34": 18,
  "sup": 15
 },
 "14": {
  "sigla": "MISSÃO",
  "total": 29911,
  "mulheres": 8,
  "ate34": 68,
  "sup": 18
 },
 "80": {
  "sigla": "UP",
  "total": 16197,
  "mulheres": 42,
  "ate34": 74,
  "sup": 13
 },
 "16": {
  "sigla": "PSTU",
  "total": 14639,
  "mulheres": 47,
  "ate34": 5,
  "sup": 24
 },
 "21": {
  "sigla": "PCB",
  "total": 11759,
  "mulheres": 47,
  "ate34": 3,
  "sup": 13
 },
 "29": {
  "sigla": "PCO",
  "total": 7054,
  "mulheres": 36,
  "ate34": 21,
  "sup": 22
 }
};
