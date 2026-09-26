/**
 * VotoCheck — "Em 2022, para onde foi o seu voto?" (/2022) e "Eleitos que perderam o mandato"
 * (/perderam-o-mandato). 26/09/2026.
 *
 * Dados: resultado oficial de 2022 (resultados.tse.jus.br, eleição 546), guardado no KV em
 * r22:<UF>:<fed|est>. Nada aqui é opinião: votos, quociente eleitoral, vagas por lista.
 * "% do quociente" = votos próprios ÷ quociente eleitoral. Abaixo de 100%, a pessoa precisou de
 * votos da lista (legenda e colegas) para ocupar a vaga — é assim que o sistema proporcional
 * funciona, não uma irregularidade.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { UF_NOMES } from './home_html.js';
import { nomeProprio } from './perfil_html.js';
import { renderCtaTriplo, linkWhatsApp } from './apoio_html.js';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-BR');
const pct = (v, qe) => Math.round((100 * v) / qe);
const eleito = (st) => /^Eleito/i.test(st || '');
const nomeLista = (l) => (l.tp === 'f' ? l.nm : `${nomeProprio(l.nm)}`);

const ESTILO = `
  .e22-hero { background: var(--navy); color: #fff; padding: 48px 0 40px; }
  .e22-hero .vc-eyebrow { color: #8FB0FF; }
  .e22-hero h1 { color: #fff; font-size: clamp(30px, 4.6vw, 50px); line-height: 1.08; letter-spacing: -.025em; margin: 8px 0 12px; max-width: 900px; }
  .e22-hero h1 em { font-style: normal; color: #5FE3C8; }
  .e22-hero p { color: #C3CDF0; font-size: 17px; max-width: 740px; margin: 0; }
  .e22-busca { background: #fff; color: var(--ink); border-radius: 20px; padding: 18px; margin-top: 22px; max-width: 780px; display: grid; gap: 12px; }
  .e22-busca .linha { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .e22-busca select, .e22-busca input { padding: 11px 12px; border-radius: 12px; border: 1.5px solid var(--line-2); font-size: 15px; font-weight: 600; background: #fff; }
  .e22-busca input { flex: 1; min-width: 220px; }
  .e22-sug { display: grid; gap: 4px; max-height: 260px; overflow: auto; }
  .e22-sug a { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 10px; text-decoration: none; color: var(--ink); font-size: 14.5px; }
  .e22-sug a:hover { background: var(--blue-50); }
  .e22-sug small { color: var(--muted); }
  .e22-sec { padding: 36px 0 0; }
  .e22-sec h2 { font-size: clamp(22px, 2.8vw, 28px); margin: 0 0 6px; }
  .e22-sec > .vc-wrap > p { color: var(--muted); margin: 0 0 16px; max-width: 780px; }
  .e22-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
  .e22-voto { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin: 14px 0 0; }
  @media (max-width: 760px) { .e22-voto { grid-template-columns: 1fr; } }
  .e22-voto div { background: var(--paper); border-radius: 14px; padding: 14px; }
  .e22-voto b { display: block; font-family: var(--font-display); font-size: 24px; }
  .e22-voto span { font-size: 13px; color: var(--muted); }
  .e22-frase { font-size: 18px; line-height: 1.5; margin: 0; }
  .e22-frase strong { color: var(--navy); }
  .e22-eleitos { display: grid; gap: 8px; margin-top: 14px; }
  .e22-el { display: grid; grid-template-columns: minmax(0,1fr) 140px 88px; gap: 12px; align-items: center; font-size: 14.5px; }
  .e22-el .trilho { height: 8px; background: var(--paper); border-radius: 999px; overflow: hidden; position: relative; }
  .e22-el .trilho i { display: block; height: 100%; background: var(--teal); border-radius: 999px; }
  .e22-el .trilho i.baixo { background: #F2994A; }
  .e22-el b { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--font-display); }
  .e22-el a { color: var(--ink); text-decoration: none; font-weight: 600; }
  .e22-el a:hover { color: var(--blue); }
  .e22-el small { color: var(--muted); font-weight: 400; }
  @media (max-width: 560px) { .e22-el { grid-template-columns: minmax(0,1fr) 80px 60px; font-size: 13.5px; } }
  .e22-legenda { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); margin-top: 10px; }
  .e22-legenda i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .e22-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 860px) { .e22-grid2 { grid-template-columns: 1fr; } }
  .e22-nota { background: var(--blue-50); border-radius: 14px; padding: 14px 16px; font-size: 14px; color: var(--ink-2); }
  .pm-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 22px; display: grid; gap: 10px; }
  .pm-topo { display: flex; gap: 14px; align-items: center; }
  .pm-topo img { width: 64px; height: 64px; border-radius: 14px; object-fit: cover; background: var(--blue-50); }
  .pm-topo h3 { margin: 0; font-size: 19px; }
  .pm-topo span { font-size: 13.5px; color: var(--muted); }
  .pm-motivo { font-size: 14.5px; color: var(--ink-2); margin: 0; }
  .pm-num { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
  .pm-num div { background: var(--paper); border-radius: 12px; padding: 10px 12px; }
  .pm-num b { display: block; font-family: var(--font-display); font-size: 19px; }
  .pm-num span { font-size: 12px; color: var(--muted); }
  .pm-frase { font-size: 15px; margin: 0; }
  .pm-fontes { font-size: 12.5px; color: var(--muted); }
`;

function barraEleito(c, qe) {
  const p = pct(c[2], qe);
  const link = c[5] ? `<a href="/candidato/${c[5]}">${escapeHtml(nomeProprio(c[1]))}</a>` : `<span style="font-weight:600">${escapeHtml(nomeProprio(c[1]))}</span>`;
  return `<div class="e22-el"><span>${link} <small>${escapeHtml(c[4])} · ${fmt(c[2])} votos</small></span>
    <span class="trilho" title="${p}% do quociente eleitoral com votos próprios"><i class="${p < 50 ? 'baixo' : ''}" style="width:${Math.min(100, p)}%"></i></span><b>${p}%</b></div>`;
}

export function renderVoto2022({ uf, cargo, dados, n }) {
  const cargoNome = cargo === 'est' ? (uf === 'DF' ? 'deputado distrital' : 'deputado estadual') : 'deputado federal';
  const qe = dados.qe;
  let alvo = null;
  let lista = null;
  if (n) {
    for (const l of dados.listas) {
      const c = l.c.find((x) => x[0] === n);
      if (c) { alvo = c; lista = l; break; }
    }
  }
  const todosEleitos = dados.listas.flatMap((l) => l.c.filter((c) => eleito(c[3])));
  const sozinhos = todosEleitos.filter((c) => c[2] >= qe).length;
  const puxadores = dados.listas.flatMap((l) => l.c.filter((c) => c[2] >= qe).map((c) => ({ c, l }))).sort((a, b) => b.c[2] - a.c[2]);
  const menos = [...todosEleitos].sort((a, b) => a[2] - b[2]).slice(0, 8);
  const busca = dados.listas.flatMap((l) => l.c.map((c) => [c[0], c[1], c[4], c[2]]));
  const url = `https://votocheck.com.br/2022?uf=${uf}&cargo=${cargo}${n ? `&n=${n}` : ''}`;

  let resultado = '';
  if (alvo && lista) {
    const eleitosLista = lista.c.filter((c) => eleito(c[3]));
    const foiEleito = eleito(alvo[3]);
    const totalLista = lista.nom + lista.leg;
    const outros = eleitosLista.filter((c) => c[0] !== alvo[0]);
    const frase = foiEleito
      ? `<strong>${escapeHtml(nomeProprio(alvo[1]))}</strong> foi eleito com ${fmt(alvo[2])} votos, ${pct(alvo[2], qe)}% do quociente eleitoral. ${pct(alvo[2], qe) >= 100 ? (outros.length ? `Sobraram votos, e essa sobra ajudou a lista a eleger mais ${outros.length} ${outros.length === 1 ? 'pessoa' : 'pessoas'}.` : 'Foi o único eleito da lista.') : 'O resto veio dos votos dados a colegas e à legenda.'}`
      : `<strong>${escapeHtml(nomeProprio(alvo[1]))}</strong> não foi eleito. ${eleitosLista.length ? `Mas o seu voto contou para a lista, que elegeu ${eleitosLista.length} ${eleitosLista.length === 1 ? 'pessoa' : 'pessoas'}: <strong>${eleitosLista.slice(0, 3).map((c) => escapeHtml(nomeProprio(c[1]))).join(', ')}</strong>${eleitosLista.length > 3 ? ' e outros' : ''}.` : 'E a lista não elegeu ninguém: esse voto não ajudou a eleger ninguém.'}`;
    const texto = foiEleito
      ? `Em 2022 votei em ${nomeProprio(alvo[1])}. Descobri quem mais meu voto ajudou a eleger:`
      : `Em 2022 votei em ${nomeProprio(alvo[1])}, que não se elegeu. Mas meu voto ajudou a eleger outra pessoa. Descubra para onde foi o seu:`;
    resultado = `
    <section class="e22-sec" id="resultado">
      <div class="vc-wrap">
        <div class="e22-card">
          <span class="vc-eyebrow">${Icone.votoCaixa(16)} Seu voto em 2022 · ${escapeHtml(cargoNome)} · ${escapeHtml(uf)}</span>
          <p class="e22-frase" style="margin-top:8px">${frase}</p>
          <div class="e22-voto">
            <div><b>${fmt(alvo[2])}</b><span>votos de ${escapeHtml(nomeProprio(alvo[1]))} (${escapeHtml(alvo[4])})</span></div>
            <div><b>${fmt(totalLista)}</b><span>votos da lista ${escapeHtml(nomeLista(lista))}, somando legenda</span></div>
            <div><b>${lista.vag}</b><span>${lista.vag === 1 ? 'vaga conquistada' : 'vagas conquistadas'} pela lista</span></div>
          </div>
          ${alvo[5] ? `<p style="margin:14px 0 0;font-size:15px">${escapeHtml(nomeProprio(alvo[1]))} é candidato de novo em 2026. <a href="/candidato/${alvo[5]}">Ver a ficha →</a></p>` : ''}
          ${eleitosLista.length ? `<h3 style="font-size:17px;margin:20px 0 0">Quem a lista elegeu, e quanto cada um trouxe de votos próprios</h3>
          <div class="e22-eleitos">${eleitosLista.map((c) => barraEleito(c, qe)).join('')}</div>
          <div class="e22-legenda"><span><i style="background:var(--teal)"></i>% do quociente eleitoral (${fmt(qe)} votos) com votos próprios</span><span><i style="background:#F2994A"></i>abaixo de 50%: entrou principalmente com votos de outros</span></div>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
            <a class="vc-btn vc-btn--pri" href="${linkWhatsApp(texto, url)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(texto)}" data-share-url="${url}" data-ev="v2022_compartilhar">${Icone.whatsapp(18)} Mandar para 3 pessoas</a>
            <a class="vc-btn vc-btn--sec" href="/buscar?cargo=${cargo === 'est' ? (uf === 'DF' ? 'deputado_distrital' : 'deputado_estadual') : 'deputado_federal'}&uf=${uf}">Ver candidatos de 2026</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  const corpo = `
    <style>${ESTILO}</style>
    <section class="e22-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.bussola(16)} Eleição de 2022</span>
        <h1>Em 2022, <em>quem o seu voto ajudou a eleger?</em></h1>
        <p>Para deputado, o voto vai primeiro para o partido ou federação. Muita gente votou em alguém e ajudou a eleger outra pessoa. Digite o nome em quem você votou.</p>
        <form class="e22-busca" method="GET" action="/2022" onsubmit="return false">
          <div class="linha">
            <select name="uf" onchange="location='/2022?uf='+this.value+'&cargo=${cargo}'">${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${u}</option>`).join('')}</select>
            <select name="cargo" onchange="location='/2022?uf=${uf}&cargo='+this.value"><option value="fed" ${cargo === 'fed' ? 'selected' : ''}>Deputado federal</option><option value="est" ${cargo === 'est' ? 'selected' : ''}>${uf === 'DF' ? 'Deputado distrital' : 'Deputado estadual'}</option></select>
            <input type="search" placeholder="Nome de urna ou número" autocomplete="off" data-e22-busca aria-label="Buscar candidato de 2022">
          </div>
          <div class="e22-sug" data-e22-sug></div>
        </form>
      </div>
    </section>
    ${resultado}
    <section class="e22-sec">
      <div class="vc-wrap">
        <h2>${escapeHtml(UF_NOMES[uf] || uf)} em 2022: ${escapeHtml(cargoNome)}</h2>
        <p>Quociente eleitoral: <strong>${fmt(qe)} votos</strong> por vaga. Dos ${todosEleitos.length} eleitos, só <strong>${sozinhos}</strong> ${sozinhos === 1 ? 'alcançou' : 'alcançaram'} esse número com votos próprios. Os outros ${todosEleitos.length - sozinhos} entraram com a ajuda dos votos da lista.</p>
        <div class="e22-grid2">
          <div class="e22-card">
            <h3 style="font-size:17px;margin:0 0 4px">Quem puxou votos para a lista</h3>
            <p style="font-size:13.5px;color:var(--muted);margin:0 0 10px">Passaram do quociente sozinhos. A sobra foi para os colegas de lista.</p>
            <div class="e22-eleitos">${puxadores.slice(0, 10).map((x) => barraEleito(x.c, qe)).join('') || '<p style="margin:0">Ninguém alcançou o quociente sozinho.</p>'}</div>
          </div>
          <div class="e22-card">
            <h3 style="font-size:17px;margin:0 0 4px">Eleitos com menos votos próprios</h3>
            <p style="font-size:13.5px;color:var(--muted);margin:0 0 10px">Ocuparam a vaga graças aos votos dados a outras pessoas da mesma lista.</p>
            <div class="e22-eleitos">${menos.map((c) => barraEleito(c, qe)).join('')}</div>
          </div>
        </div>
        <div class="e22-nota" style="margin-top:14px">${Icone.escudoCheck(16)} <strong>Como funciona:</strong> cada lista (partido ou federação) ganha vagas conforme o total de votos que recebeu, somando os dados aos candidatos e à legenda. As vagas vão para os mais votados da lista. Por isso um voto pode eleger outra pessoa. É a regra do sistema proporcional, não uma irregularidade. <a href="/perderam-o-mandato">Veja eleitos de 2022 que perderam o mandato →</a></div>
        <div class="vc-fonte" style="margin-top:10px">${Icone.documento(14)} Fonte: TSE · resultado oficial das eleições de 2022 (totalização final). Quociente eleitoral: votos válidos ÷ vagas.</div>
      </div>
    </section>
    ${renderCtaTriplo({ contexto: 'home', url })}
    <script>
    (function(){
      var D=${JSON.stringify(busca).replace(/</g, '\\u003c')};
      var i=document.querySelector('[data-e22-busca]'), s=document.querySelector('[data-e22-sug]');
      function n(t){return (t||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}
      i.addEventListener('input',function(){
        var t=n(i.value.trim()); if(t.length<2){s.innerHTML='';return}
        var r=D.filter(function(c){return n(c[1]).indexOf(t)>=0||String(c[0]).indexOf(t)===0}).slice(0,12);
        s.innerHTML=r.map(function(c){return '<a href="/2022?uf=${uf}&cargo=${cargo}&n='+c[0]+'#resultado"><span>'+c[1].replace(/</g,'&lt;')+' <small>'+c[2]+' · '+c[0]+'</small></span><small>'+c[3].toLocaleString('pt-BR')+' votos</small></a>'}).join('')||'<small style="padding:8px">Nenhum candidato com esse nome.</small>';
      });
    })();
    </script>`;

  return pagina({
    titulo: `Em 2022, quem o seu voto ajudou a eleger? ${cargoNome} em ${UF_NOMES[uf] || uf} | VotoCheck`,
    descricao: `Descubra quem o seu voto para ${cargoNome} em 2022 ajudou a eleger em ${UF_NOMES[uf] || uf}. Só ${sozinhos} dos ${todosEleitos.length} eleitos alcançaram o quociente eleitoral sozinhos.`,
    caminho: `/2022?uf=${uf}&cargo=${cargo}${n ? `&n=${n}` : ''}`,
    larga: true,
    corpo,
  });
}

/** Eleitos para a Câmara em 2022 que perderam o mandato. Fonte da perda: histórico oficial do
 *  deputado na Câmara + notícia oficial citada. Números de 2022: resultado do TSE. */
export const PERDERAM_MANDATO = [
  { nome: 'Deltan Dallagnol', uf: 'PR', partido: 'PODE', idCamara: 220705, data: '06/06/2023', votos: 344917, qe: 201288, lista: 'Podemos', listaVotos: 429991, vagas: 1, top: null,
    motivo: 'O TSE cassou o registro da candidatura com base na Lei da Ficha Limpa, por ele ter pedido exoneração do Ministério Público quando havia procedimentos em andamento que poderiam levar a processo disciplinar. A Câmara declarou a perda do mandato.',
    fontes: [['TSE', 'https://www.tse.jus.br/comunicacao/noticias/2023/Maio/por-unanimidade-tse-cassa-registro-do-deputado-federal-deltan-dallagnol-pode'], ['Câmara', 'https://www.camara.leg.br/noticias/962585-tse-declara-perda-de-mandato-do-deputado-deltan-dallagnol/']] },
  { nome: 'Marcelo Lima', uf: 'SP', partido: 'Solidariedade (depois PSB)', idCamara: 220634, data: '30/11/2023', votos: 110430, qe: 332891, lista: 'Solidariedade', listaVotos: 379310, vagas: 1, sucessor: 'Paulinho da Força',
    motivo: 'O TSE decretou a perda do mandato por infidelidade partidária: ele deixou o partido pelo qual foi eleito sem justa causa.',
    fontes: [['TSE', 'https://www.tse.jus.br/comunicacao/noticias/2023/Novembro/plenario-decreta-perda-do-mandato-do-deputado-federal-marcelo-lima-psb-sp'], ['CNN Brasil', 'https://www.cnnbrasil.com.br/politica/camara-declara-perda-de-mandato-de-marcelo-lima-e-paulinho-da-forca-assume/']] },
  { nome: 'Chiquinho Brazão', uf: 'RJ', partido: 'União Brasil', idCamara: 204476, data: '24/04/2025', votos: 77367, qe: 186435, lista: 'União Brasil', listaVotos: 967553, vagas: 6, top: ['Daniela do Waguinho', 213706], sucessor: 'Ricardo Abrão',
    motivo: 'A Mesa da Câmara declarou a perda do mandato por excesso de faltas às sessões (Constituição, art. 55, III), enquanto ele estava preso.',
    fontes: [['O Tempo', 'https://www.otempo.com.br/politica/congresso/2025/4/24/chiquinho-brazao-tem-mandato-cassado-pela-mesa-diretora-da-camara-por-excesso-de-faltas']] },
  { nome: 'Delegado Ramagem', uf: 'RJ', partido: 'PL', idCamara: 220619, data: '18/12/2025', votos: 59170, qe: 186435, lista: 'Partido Liberal', listaVotos: 1717302, vagas: 11, top: ['General Pazuello', 205324], sucessor: 'Dr. Flávio',
    motivo: 'A Mesa da Câmara declarou a perda do mandato por ausência em mais de um terço das sessões (Constituição, art. 55, III).',
    fontes: [['Câmara', 'https://www.camara.leg.br/noticias/1234829-mesa-diretora-da-camara-declara-a-perda-dos-mandatos-de-eduardo-bolsonaro-e-delegado-ramagem/']] },
  { nome: 'Eduardo Bolsonaro', uf: 'SP', partido: 'PL', idCamara: 92346, data: '18/12/2025', votos: 741701, qe: 332891, lista: 'Partido Liberal', listaVotos: 5343667, vagas: 17, top: ['Carla Zambelli', 946244], sucessor: 'Missionário José Olimpio',
    motivo: 'A Mesa da Câmara declarou a perda do mandato por ausência em mais de um terço das sessões deliberativas (Constituição, art. 55, III).',
    fontes: [['Câmara', 'https://www.camara.leg.br/noticias/1234829-mesa-diretora-da-camara-declara-a-perda-dos-mandatos-de-eduardo-bolsonaro-e-delegado-ramagem/']] },
  { nome: 'Glaycon Franco', uf: 'MG', partido: 'PV (federação com PT e PCdoB)', idCamara: 236284, data: '14/09/2026', votos: 59818, qe: 210964, lista: 'Federação Brasil da Esperança', listaVotos: 1787525, vagas: 10, top: ['Reginaldo Lopes', 196760], sucessor: 'Gilmar Machado', suplente: true,
    motivo: 'Suplente em 2022, assumiu a vaga em 2026. O TSE confirmou a perda do mandato por infidelidade partidária e a Câmara declarou a vaga.',
    fontes: [['O Tempo', 'https://www.otempo.com.br/eleicoes/2026/deputados-federais/2026/9/15/gilmar-machado-toma-posse-na-camara-a-19-dias-da-eleicao-apos-perda-de-mandato-de-glaycon-franco'], ['Congresso em Foco', 'https://www.congressoemfoco.com.br/noticia/122334/deputado-do-psdb-perde-mandato-por-infidelidade-partidaria']] },
];

export function renderPerderamMandato() {
  const cards = PERDERAM_MANDATO.map((p) => {
    const pq = pct(p.votos, p.qe);
    const frase = p.suplente
      ? `Em 2022 teve ${fmt(p.votos)} votos e ficou como suplente da lista ${escapeHtml(p.lista)}, que somou ${fmt(p.listaVotos)} votos.`
      : pq >= 100
        ? `Teve ${fmt(p.votos)} votos, ${pq}% do quociente: passou dele sozinho${p.vagas > 1 ? `, e a sobra ajudou a eleger colegas da lista ${escapeHtml(p.lista)} (${p.vagas} vagas no total)` : `. Foi o único eleito da lista ${escapeHtml(p.lista)}`}.`
        : `Teve ${fmt(p.votos)} votos, só ${pq}% do quociente. A vaga veio dos votos da lista ${escapeHtml(p.lista)} (${fmt(p.listaVotos)} votos, ${p.vagas} ${p.vagas === 1 ? 'vaga' : 'vagas'})${p.top ? `, puxada por ${escapeHtml(p.top[0])} (${fmt(p.top[1])} votos)` : ''}. Quem votou em outros nomes da lista ajudou a colocá-lo lá.`;
    return `<article class="pm-card">
      <div class="pm-topo">${p.idCamara ? `<img src="https://www.camara.leg.br/internet/deputado/bandep/${p.idCamara}.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}<div><h3>${escapeHtml(p.nome)}</h3><span>${escapeHtml(p.partido)} · ${p.uf} · perdeu o mandato em ${p.data}</span></div></div>
      <p class="pm-motivo">${escapeHtml(p.motivo)}${p.sucessor ? ` A vaga ficou com ${escapeHtml(p.sucessor)}, suplente da mesma lista.` : ''}</p>
      <div class="pm-num"><div><b>${fmt(p.votos)}</b><span>votos próprios em 2022</span></div><div><b>${fmt(p.qe)}</b><span>quociente eleitoral (${p.uf})</span></div><div><b>${pq}%</b><span>do quociente com votos próprios</span></div></div>
      <p class="pm-frase">${frase}</p>
      <div class="pm-fontes">Fontes: ${p.fontes.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${escapeHtml(n)}</a>`).join(' · ')} · Câmara dos Deputados (histórico do mandato) · TSE (resultado 2022)</div>
    </article>`;
  }).join('');
  const texto = 'Seis deputados federais eleitos em 2022 já perderam o mandato. Alguns chegaram lá com poucos votos próprios, puxados pelos votos de outros. Veja como:';
  const url = 'https://votocheck.com.br/perderam-o-mandato';
  const corpo = `
    <style>${ESTILO}</style>
    <section class="e22-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.alerta(16)} Câmara dos Deputados · 2023–2026</span>
        <h1>Você votou. Eles entraram. <em>E perderam o mandato.</em></h1>
        <p>Deputados eleitos em 2022 que perderam o mandato nesta legislatura, com o motivo oficial e como cada um foi eleito: com votos próprios ou com os votos da lista.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">
          <a class="vc-btn vc-btn--pri" href="${linkWhatsApp(texto, url)}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(texto)}" data-share-url="${url}" data-ev="pm_compartilhar">${Icone.whatsapp(18)} Mandar para 3 pessoas</a>
          <a class="vc-btn vc-btn--sec" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.35)" href="/2022">Em 2022, quem o meu voto elegeu?</a>
        </div>
      </div>
    </section>
    <section class="e22-sec">
      <div class="vc-wrap">
        <div class="e22-grid2">${cards}</div>
        <div class="e22-nota" style="margin-top:16px">${Icone.escudoCheck(16)} <strong>Sobre esta lista:</strong> inclui só perdas de mandato definitivas registradas no histórico oficial da Câmara na legislatura 2023–2027 (não inclui renúncias, licenças, suspensões temporárias nem trocas por recontagem de votos). "% do quociente" é a parte da vaga que a pessoa conquistou com os próprios votos; o resto veio dos votos dados à lista. Isso é regra do sistema proporcional, e não tem relação com o motivo da perda do mandato.</div>
      </div>
    </section>
    ${renderCtaTriplo({ contexto: 'home', url })}`;
  return pagina({
    titulo: 'Eleitos em 2022 que perderam o mandato, e como foram eleitos | VotoCheck',
    descricao: 'Deputados federais eleitos em 2022 que perderam o mandato: motivo oficial, votos próprios e quanto da vaga veio dos votos de outros candidatos da lista.',
    caminho: '/perderam-o-mandato',
    larga: true,
    corpo,
  });
}
