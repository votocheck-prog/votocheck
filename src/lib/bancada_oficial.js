/**
 * VotoCheck — bancada atual dos partidos a partir das FONTES OFICIAIS (27/09/2026).
 *
 * Por que existe: a versão anterior contava bancada pelo D1 (`mandato` + `filiacao_partidaria`) e
 * saía errada, conferida contra as APIs oficiais em 27/09/2026:
 *   - PT aparecia com 80 deputados (Câmara: 65), PL com 143 (98), MDB com 63 (38). O coletor da
 *     Câmara grava TODO mundo que passou pela legislatura 57 (suplentes que saíram, licenciados),
 *     com data_fim vazia, e nunca fecha a filiação antiga de quem trocou de partido.
 *   - Senador nunca aparecia: o coletor do Senado grava data_fim = fim do mandato (2027/2031), e a
 *     consulta exigia data_fim IS NULL.
 * Agora a contagem vem direto de quem publica o dado, com cache de 12 h:
 *   - Deputado federal: Câmara, /api/v2/deputados (só quem está em exercício hoje; soma 513).
 *   - Senador: Senado, /dadosabertos/senador/lista/atual (81 em exercício).
 *   - Deputado estadual/distrital: não existe API nacional das 27 Assembleias. Usamos os ELEITOS
 *     EM 2022 (resultado oficial do TSE, já no KV em r22:<UF>:est), com rótulo explícito na tela,
 *     porque a composição atual pode ter mudado com trocas de partido.
 *   - Presidente da República: fixo abaixo (fato público, mandato 2023–2026).
 * O D1 entra só para transformar nome em link para a ficha (id_camara/id_senado → pessoa.id);
 * se falhar, o nome aparece com link para a página oficial.
 */

const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

/** Chefia do Executivo federal em exercício. pessoaId = ficha no VotoCheck (conferida em 27/09/2026). */
export const EXECUTIVO_FEDERAL = [
  { sigla: 'PT', nome: 'Lula', cargo: 'Presidente da República', curto: 'Presidente', pessoaId: 5092, urlOficial: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/presidente' },
];

// Siglas das fontes oficiais que não batem com a sigla usada em PARTIDOS_INFO.
const ALIAS = { UNIAO: 'UNIAO BRASIL', PODE: 'PODEMOS' };
// Partidos de 2022 que foram incorporados/renomeados depois (fatos registrados no TSE):
// PSC → Podemos (2023), PTB + Patriota → PRD (2023), PROS → Solidariedade (2023),
// PMN → Mobiliza (2023), PMB → Democrata.
const SUCESSOR_2022 = { PSC: 'PODEMOS', PTB: 'PRD', PATRIOTA: 'PRD', PROS: 'SOLIDARIEDADE', PMN: 'MOBILIZA', PMB: 'DEMOCRATA' };

export const normSigla = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

function mapaSiglas(partidosInfo) {
  const m = {};
  for (const p of partidosInfo) m[normSigla(p.sigla)] = p.sigla;
  return (s, ano2022 = false) => {
    let n = normSigla(s);
    if (ano2022 && SUCESSOR_2022[n]) n = SUCESSOR_2022[n];
    n = ALIAS[n] || n;
    return m[n] || null;
  };
}

const UA = { 'User-Agent': 'VotoCheck/1.0 (https://votocheck.com.br; contato@votocheck.com.br)', Accept: 'application/json' };

async function deputadosEmExercicio() {
  const r = await fetch('https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1000&ordem=ASC&ordenarPor=nome', { headers: UA });
  if (!r.ok) throw new Error(`Câmara ${r.status}`);
  const j = await r.json();
  return (j.dados || []).map((d) => ({ id: String(d.id), nome: d.nome, sigla: d.siglaPartido, uf: d.siglaUf }));
}

async function senadoresEmExercicio() {
  const r = await fetch('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json', { headers: UA });
  if (!r.ok) throw new Error(`Senado ${r.status}`);
  const j = await r.json();
  const lista = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  return (Array.isArray(lista) ? lista : [lista]).map((p) => {
    const i = p.IdentificacaoParlamentar || {};
    return { id: String(i.CodigoParlamentar), nome: i.NomeParlamentar, sigla: i.SiglaPartidoParlamentar, uf: i.UfParlamentar, sexo: i.SexoParlamentar };
  });
}

async function estaduaisEleitos2022(env) {
  if (!env.OG) return [];
  const listas = await Promise.all(UFS.map((uf) => env.OG.get(`r22:${uf}:est`, { type: 'json', cacheTtl: 86400 }).catch(() => null)));
  const out = [];
  listas.forEach((d, k) => {
    for (const l of d?.listas || []) for (const c of l.c || []) if (/^Eleito/i.test(c[3] || '')) out.push({ sigla: c[4], uf: UFS[k] });
  });
  return out;
}

/** Links para a ficha: id da Câmara/Senado → pessoa.id, e votos de 2022 (critério de ordem). */
async function ligarFichas(env) {
  if (!env.DB) return { camara: {}, senado: {} };
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.id_camara, p.id_senado,
            (SELECT MAX(v.votos) FROM votos_2022 v WHERE v.pessoa_id = p.id AND v.cargo = 'deputado_federal') AS v22
     FROM pessoa p WHERE p.id_camara IS NOT NULL OR p.id_senado IS NOT NULL`
  ).all();
  const camara = {}, senado = {};
  for (const r of results || []) {
    if (r.id_camara) camara[String(r.id_camara)] = { pessoaId: r.id, v22: r.v22 || 0 };
    if (r.id_senado) senado[String(r.id_senado)] = { pessoaId: r.id };
  }
  return { camara, senado };
}

/**
 * Retorna { porSigla: { [siglaPARTIDOS_INFO]: { presidente, senador, deputado_federal, estadual_2022,
 * congresso, nomes: [{nome, curto, uf, href}] } }, dataRef, fontes }.
 * "nomes" (até 6, na ordem): Presidente → senadores (ordem alfabética) → deputados federais mais
 * votados em 2022 (dado oficial do TSE; sem voto registrado, ordem alfabética).
 */
export async function montarBancadaOficial(env, partidosInfo) {
  const siglaDe = mapaSiglas(partidosInfo);
  const [deps, sens, est] = await Promise.all([
    deputadosEmExercicio(),
    senadoresEmExercicio(),
    estaduaisEleitos2022(env).catch(() => []),
  ]);
  let fichas = { camara: {}, senado: {} };
  try { fichas = await ligarFichas(env); } catch (e) { console.error('bancada: ligarFichas falhou', e); }

  const porSigla = {};
  const bloco = (s) => (porSigla[s] ||= { presidente: 0, senador: 0, deputado_federal: 0, estadual_2022: 0, congresso: 0, _sen: [], _dep: [], nomes: [] });

  for (const e of EXECUTIVO_FEDERAL) bloco(e.sigla).presidente += 1;
  for (const s of sens) {
    const sg = siglaDe(s.sigla); if (!sg) continue;
    const b = bloco(sg); b.senador += 1;
    const f = fichas.senado[s.id];
    b._sen.push({ nome: s.nome, curto: s.sexo === 'Feminino' ? 'Senadora' : 'Senador', uf: s.uf, href: f ? `/candidato/${f.pessoaId}` : `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${s.id}`, externo: !f });
  }
  for (const d of deps) {
    const sg = siglaDe(d.sigla); if (!sg) continue;
    const b = bloco(sg); b.deputado_federal += 1;
    const f = fichas.camara[d.id];
    b._dep.push({ nome: d.nome, curto: 'Dep. federal', uf: d.uf, v22: f?.v22 || 0, href: f ? `/candidato/${f.pessoaId}` : `https://www.camara.leg.br/deputados/${d.id}`, externo: !f });
  }
  for (const e of est) {
    const sg = siglaDe(e.sigla, true); if (!sg) continue;
    bloco(sg).estadual_2022 += 1;
  }
  const ord = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  for (const [sg, b] of Object.entries(porSigla)) {
    b.congresso = b.senador + b.deputado_federal;
    const exec = EXECUTIVO_FEDERAL.filter((e) => e.sigla === sg).map((e) => ({ nome: e.nome, curto: e.curto, uf: '', href: e.pessoaId ? `/candidato/${e.pessoaId}` : e.urlOficial, externo: !e.pessoaId }));
    b.nomes = [...exec, ...b._sen.sort(ord), ...b._dep.sort((x, y) => (y.v22 - x.v22) || ord(x, y))].slice(0, 6);
    delete b._sen; delete b._dep;
  }
  return {
    porSigla,
    dataRef: new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10),
    totais: { deputado_federal: deps.length, senador: sens.length, estadual_2022: est.length },
  };
}
