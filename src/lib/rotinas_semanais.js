/**
 * VotoCheck — rotinas semanais automáticas (27/10/2026). Antes eram scripts manuais
 * (scripts/importar_cota.py e scripts/coletar_contatos.py). Cada uma roda numa invocação própria do
 * cron diário (09:00 UTC) em um dia da semana diferente, para não somar CPU/subrequests com os coletores.
 *   quarta → atualizarCota(env)      cota parlamentar (CEAP) do ano, arquivo oficial da Câmara
 *   quinta → atualizarContatos(env)  e-mail e telefone de gabinete (Câmara + Senado)
 */
import { unzip } from '../vendor_unzipit.js';

const UA = { 'User-Agent': 'VotoCheck/1.0 (votocheck.com.br)', Accept: 'application/json' };

/** CSV com ';' e campos entre aspas (formato da Câmara). Devolve um iterador de objetos. */
function* linhasCsv(texto) {
  let i = 0;
  const n = texto.length;
  const lerLinha = () => {
    const campos = [];
    let campo = '';
    let aspas = false;
    while (i < n) {
      const c = texto[i++];
      if (aspas) {
        if (c === '"') {
          if (texto[i] === '"') { campo += '"'; i++; } else aspas = false;
        } else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ';') { campos.push(campo); campo = ''; }
      else if (c === '\n') { campos.push(campo.replace(/\r$/, '')); return campos; }
      else campo += c;
    }
    campos.push(campo);
    return campos;
  };
  const cab = lerLinha().map((h) => h.replace(/^﻿/, '').trim());
  while (i < n) {
    const v = lerLinha();
    if (v.length < 2) continue;
    const o = {};
    for (let k = 0; k < cab.length; k++) o[cab[k]] = v[k];
    yield o;
  }
}

const num = (v) => {
  const x = parseFloat(String(v || '0').replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};

async function emLotes(env, stmts, tam = 80) {
  for (let k = 0; k < stmts.length; k += tam) await env.DB.batch(stmts.slice(k, k + tam));
}

export async function atualizarCota(env, ano = new Date().getUTCFullYear()) {
  const r = await fetch(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!r.ok) return { ok: false, motivo: `Câmara respondeu ${r.status}` };
  const { entries } = await unzip(await r.arrayBuffer());
  const nome = Object.keys(entries).find((x) => x.toLowerCase().endsWith('.csv'));
  if (!nome) return { ok: false, motivo: 'zip sem CSV' };
  const texto = new TextDecoder('utf-8').decode(await entries[nome].arrayBuffer());
  const dep = new Map();
  const cat = new Map();
  for (const x of linhasCsv(texto)) {
    const id = x.ideCadastro;
    if (!id) continue; // lideranças e órgãos, não deputado
    const v = num(x.vlrLiquido);
    let d = dep.get(id);
    if (!d) { d = { nome: x.txNomeParlamentar, partido: x.sgPartido, uf: x.sgUF, total: 0, div: 0, mes: Array(12).fill(0) }; dep.set(id, d); }
    if (x.sgPartido) d.partido = x.sgPartido;
    if (x.sgUF) d.uf = x.sgUF;
    d.total += v;
    if (String(x.txtDescricao || '').toUpperCase().includes('DIVULGA')) {
      d.div += v;
      const m = parseInt(x.numMes, 10);
      if (m >= 1 && m <= 12) d.mes[m - 1] += v;
    }
    const ck = `${id}|${String(x.txtDescricao || '').trim().replace(/\.$/, '')}`;
    const c = cat.get(ck) || [0, 0];
    c[0] += v; c[1] += 1;
    cat.set(ck, c);
  }
  // Trava de segurança: um arquivo vazio ou truncado não pode apagar o que já está no ar.
  if (dep.size < 300) return { ok: false, motivo: `só ${dep.size} deputados no arquivo; nada alterado` };
  const hoje = new Date().toISOString().slice(0, 10);
  const r2 = (x) => Math.round(x * 100) / 100;
  const stmts = [env.DB.prepare('DELETE FROM cota_resumo WHERE ano = ?').bind(ano), env.DB.prepare('DELETE FROM cota_parlamentar WHERE ano = ?').bind(ano)];
  for (const [id, d] of dep) {
    stmts.push(env.DB.prepare('INSERT INTO cota_resumo VALUES (?,?,?,?,?,?,?,?,?)').bind(id, ano, d.nome, d.partido, d.uf, r2(d.total), r2(d.div), JSON.stringify(d.mes.map(r2)), hoje));
  }
  for (const [ck, [v, docs]] of cat) {
    const [id, categoria] = [ck.slice(0, ck.indexOf('|')), ck.slice(ck.indexOf('|') + 1)];
    stmts.push(env.DB.prepare('INSERT INTO cota_parlamentar VALUES (?,?,?,?,?)').bind(id, ano, categoria, r2(v), docs));
  }
  await emLotes(env, stmts);
  let tot = 0;
  for (const d of dep.values()) tot += d.total;
  return { ok: true, deputados: dep.size, categorias: cat.size, total: Math.round(tot) };
}

async function getJson(url) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
    } catch (e) { /* tenta de novo */ }
  }
  return null;
}

export async function atualizarContatos(env) {
  const { results: pc } = await env.DB.prepare('SELECT id, id_camara FROM pessoa WHERE id_camara IS NOT NULL').all();
  const { results: ps } = await env.DB.prepare('SELECT id, id_senado FROM pessoa WHERE id_senado IS NOT NULL').all();
  const pidCam = new Map(pc.map((r) => [String(r.id_camara), r.id]));
  const pidSen = new Map(ps.map((r) => [String(r.id_senado), r.id]));
  const linhas = [];
  const deps = (await getJson('https://dadosabertos.camara.leg.br/api/v2/deputados?itens=600&ordem=ASC&ordenarPor=nome'))?.dados || [];
  // Telefone exige o detalhe de cada deputado (1 requisição cada): em blocos de 25 em paralelo.
  const alvos = deps.filter((d) => pidCam.has(String(d.id)));
  for (let k = 0; k < alvos.length; k += 25) {
    const bloco = alvos.slice(k, k + 25);
    const det = await Promise.all(bloco.map((d) => getJson(`https://dadosabertos.camara.leg.br/api/v2/deputados/${d.id}`)));
    bloco.forEach((d, j) => {
      const pid = pidCam.get(String(d.id));
      const url = `https://www.camara.leg.br/deputados/${d.id}`;
      if (d.email) linhas.push([pid, 'email', String(d.email).toLowerCase(), 'Câmara dos Deputados', url]);
      const g = det[j]?.dados?.ultimoStatus?.gabinete || {};
      if (g.telefone) linhas.push([pid, 'telefone', `(61) ${g.telefone}`, 'Câmara dos Deputados', url]);
    });
  }
  const sen = (await getJson('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json'))?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  for (const s of sen) {
    const i = s.IdentificacaoParlamentar || {};
    const pid = pidSen.get(String(i.CodigoParlamentar));
    if (!pid) continue;
    const url = String(i.UrlPaginaParlamentar || '').replace('http://', 'https://');
    if (i.EmailParlamentar) linhas.push([pid, 'email', String(i.EmailParlamentar).toLowerCase(), 'Senado Federal', url]);
    let tel = i.Telefones?.Telefone || [];
    tel = Array.isArray(tel) ? tel : [tel];
    if (tel[0]?.NumeroTelefone) linhas.push([pid, 'telefone', `(61) ${tel[0].NumeroTelefone}`, 'Senado Federal', url]);
  }
  if (linhas.length < 300) return { ok: false, motivo: `só ${linhas.length} contatos coletados; nada alterado` };
  await emLotes(env, linhas.map((l) => env.DB.prepare(`INSERT OR REPLACE INTO contato_oficial (pessoa_id, tipo, valor, fonte, url_fonte, coletado_em) VALUES (?,?,?,?,?,datetime('now'))`).bind(...l)));
  return { ok: true, deputados: deps.length, senadores: sen.length, contatos: linhas.length };
}
