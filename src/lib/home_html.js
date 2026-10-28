/**
 * VotoCheck — Home v3 (08/10/2026, pós-1º turno — "home ponte", plano pós-eleição A1).
 * Hero com busca + painel "eleitos no seu estado" → 2º turno (até 25/10) → cards → mapa →
 * boletim → publicidade → voto para deputado → método → números do resultado → apoio.
 * O painel e os números vêm de RESULTADO_2026 (estático, sem D1); a urna dos 6 votos saiu.
 *
 * (histórico) Home v2 (Onda 1: até o 1º turno). Doc "Diagnóstico e Plano", seção 3.2.
 *
 * Ordem das dobras: faixa (no wrapper) → hero com busca + urna dos 6 votos → mapa → quociente →
 * quiz → publicidade A1 → como verificamos → números → siga/compartilhe/apoie.
 *
 * Linguagem (D04): quem concorre = "candidato(a)"; quem tem mandato = "eleito(a)"; os dois juntos
 * = "candidatos e eleitos". Nunca ranking, nota ou recomendação.
 */
import { pagina, escapeHtml, SITE_URL } from './estilo_html.js';
import { Icone } from './icones.js';
import { renderMapaBrasil } from './mapa_brasil.js';
import { renderPublicidade } from './publicidade.js';
import { renderCtaTriplo } from './apoio_html.js';
import { totaisEleitos, governadorUf, presidenteEleito, fonteResultado } from './eleitos_html.js';
import { RESULTADO_2026 } from './resultado_2026.js';
import { nomeProprio } from './perfil_html.js';
import { renderBlocoBoletim } from './boletim.js';
import { formCep, ESTILO_MUNICIPIO } from './municipio_html.js';

export const UF_NOMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// Cadeiras de deputado federal por UF em 2026 (513 no total, mantidas pelo STF em 2025).
export const VAGAS_DEP_FEDERAL = {
  SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18, GO: 17, PA: 17, SC: 16, PB: 12,
  ES: 10, PI: 10, AL: 9, AC: 8, AM: 8, AP: 8, DF: 8, MT: 8, MS: 8, RN: 8, RO: 8, RR: 8, SE: 8, TO: 8,
};
/** Constituição, art. 27: estaduais = 3x os federais até 36; acima disso, +1 por federal acima de 12. */
export function vagasDepEstadual(uf) {
  const f = VAGAS_DEP_FEDERAL[uf];
  if (!f) return null;
  return f <= 12 ? 3 * f : 36 + (f - 12);
}

/** '2026-09-26 07:00:39' (UTC) → '26/09, 4h' (Brasília). */
export function fmtAtualizado(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'));
  if (isNaN(d)) return String(iso);
  const sp = new Date(d.getTime() - 3 * 3600000);
  return `${String(sp.getUTCDate()).padStart(2, '0')}/${String(sp.getUTCMonth() + 1).padStart(2, '0')}, ${sp.getUTCHours()}h`;
}
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const digitos = (n) => `<span class="vc-digitos" aria-hidden="true">${'<span></span>'.repeat(n)}</span>`;

/** Os 6 votos na ordem oficial da urna (TSE, 2026). DF: deputado distrital no lugar do estadual. */
export function seisVotos(uf) {
  const estadual = uf === 'DF' ? { slug: 'deputado_distrital', nome: 'Deputado Distrital' } : { slug: 'deputado_estadual', nome: 'Deputado Estadual' };
  return [
    { ordem: 1, slug: 'deputado_federal', nome: 'Deputado Federal', dig: 4 },
    { ordem: 2, slug: estadual.slug, nome: estadual.nome, dig: 5 },
    { ordem: 3, slug: 'senador', nome: 'Senador · 1ª vaga', dig: 3 },
    { ordem: 4, slug: 'senador', nome: 'Senador · 2ª vaga', dig: 3 },
    { ordem: 5, slug: 'governador', nome: 'Governador', dig: 2 },
    { ordem: 6, slug: 'presidente', nome: 'Presidente', dig: 2 },
  ];
}


/** Painel do hero (27/10/2026): quem representa o visitante a partir de 2027 — presidente, governador
 *  e as bancadas do estado. Dado estático do TSE (RESULTADO_2026), sem D1. */
function renderPainel(uf) {
  const t = totaisEleitos(uf);
  const base = uf ? `/eleitos/${uf.toLowerCase()}` : '/eleitos';
  const pres = presidenteEleito();
  const linhas = [];
  if (pres) linhas.push({ n: '1', cargo: 'Presidente', det: `${nomeProprio(pres.nome)} (${pres.partido}) · posse em 5/1/2027`, href: '/segundo-turno' });
  if (uf) {
    const g = governadorUf(uf);
    linhas.push({ n: '1', cargo: 'Governador', det: g.eleito ? `${nomeProprio(g.eleito.nome)} (${g.eleito.partido}) · posse em 6/1/2027` : 'resultado em carga', href: `${base}#governador` });
  } else {
    linhas.push({ n: t.governador, cargo: 'Governadores', det: 'posse em 6/1/2027', href: '/eleitos' });
  }
  linhas.push({ n: t.senador, cargo: uf ? 'Senadores eleitos' : 'Senadores', det: 'mandato até 2035', href: `${base}#senado` });
  linhas.push({ n: t.deputado_federal, cargo: 'Deputados federais', det: 'posse em 1º/2/2027', href: `${base}#camara` });
  linhas.push({ n: t.deputado_estadual, cargo: uf === 'DF' ? 'Deputados distritais' : 'Deputados estaduais', det: 'mandato até 2031', href: `${base}#assembleia` });
  return `
  <div class="vc-urna vc-painel" aria-label="Quem representa ${uf ? escapeHtml(UF_NOMES[uf] || uf) : 'o Brasil'} a partir de 2027">
    <div class="vc-urna-topo"><span>Quem te representa em 2027</span><strong>${uf ? escapeHtml(UF_NOMES[uf] || uf) : 'Brasil'}</strong></div>
    ${linhas
      .map(
        (l) => `
      <a class="vc-voto" href="${l.href}" data-ev="painel" data-ev-chave="${escapeHtml(l.cargo)}">
        <span class="vc-voto-n tabnum">${escapeHtml(String(l.n))}</span>
        <span class="vc-voto-cargo">${escapeHtml(l.cargo)}<small>${escapeHtml(l.det)}</small></span>
        <span class="vc-painel-seta" aria-hidden="true">${Icone.seta(16)}</span>
      </a>`
      )
      .join('')}
    <div class="vc-urna-rodape"><span>Resultado oficial do TSE · 1º e 2º turno</span><a href="${base}">Ver todos →</a></div>
  </div>`;
}

function renderHero(uf) {
  return `
  <section class="vc-hero">
    <div class="vc-wrap vc-hero-grid">
      <div class="vc-reveal">
        <span class="vc-eyebrow" style="color:#7FB0FF">Acompanhamento e cobrança · com fonte oficial</span>
        <h1>A eleição durou um dia.<br><em>O mandato dura quatro anos.</em></h1>
        <p class="vc-hero-sub">Descubra quem te representa, veja o que cada um faz com o seu voto e cobre direto no gabinete, sempre com o fato e a fonte na mão.</p>
        <style>${ESTILO_MUNICIPIO} .vc-hero .cep-label{font-size:15px} .vc-hero-ou{margin:18px 0 8px;font-size:14px;color:#9FB0E0;font-weight:600}</style>
        ${formCep({ tema: 'navy', id: 'cep-hero' }).replace('Seu CEP', 'Digite seu CEP e veja quem te representa').replace('Ver minha cidade', 'Ver meus representantes')}
        <p class="vc-hero-ou">ou busque pelo nome de quem você quer acompanhar</p>
        <form class="vc-busca" method="GET" action="/buscar" role="search">
          <span class="vc-busca-ico">${Icone.busca(20)}</span>
          <label class="sr-only" for="q-home">Nome ou número do eleito</label>
          <input id="q-home" type="search" name="q" placeholder="Nome ou número do eleito" autocomplete="off" />
          <label class="sr-only" for="uf-home">Estado</label>
          <select id="uf-home" name="uf" aria-label="Estado">
            <option value="">Todos</option>
            ${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
          <button class="vc-btn vc-btn--pri" type="submit">Buscar</button>
        </form>
        <div class="vc-selo-fontes"><span class="ponto"></span><span>Fontes: <b>TSE</b> · <b>Câmara dos Deputados</b> · <b>Senado Federal</b></span></div>
      </div>
      <div class="vc-reveal" style="animation-delay:.08s">${renderPainel(uf)}</div>
    </div>
  </section>`;
}

/** 27/10/2026: o "porquê" do acompanhamento — três fatos com fonte e o caminho para cobrar. */
function renderPorQue() {
  return `
  <section class="vc-sec vc-sec--branca" id="por-que">
    <style>
      .vc-pq-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 8px; }
      .vc-pq { background: var(--navy); color: #fff; border-radius: 20px; padding: 24px 22px; display: flex; flex-direction: column; gap: 8px; }
      .vc-pq b { font-family: var(--font-display); font-size: clamp(34px, 4vw, 46px); line-height: 1; color: #5FE3C8; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
      .vc-pq strong { font-size: 17px; line-height: 1.3; color: #fff; }
      .vc-pq span { font-size: 14.5px; line-height: 1.5; color: #C3CDF0; }
      .vc-pq small { margin-top: auto; padding-top: 8px; font-size: 12px; color: #93A2D8; }
      .vc-pq a { color: #9EC0FF; }
      .vc-pq-passos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; counter-reset: pq; }
      .vc-pq-passo { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
      .vc-pq-passo h3 { display: flex; gap: 10px; align-items: center; font-size: 17px; margin: 0 0 6px; }
      .vc-pq-passo h3::before { counter-increment: pq; content: counter(pq); display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--blue); color: #fff; font-size: 15px; flex: none; }
      .vc-pq-passo p { margin: 0; font-size: 14.5px; color: var(--ink-2); line-height: 1.5; }
      @media (max-width: 860px) { .vc-pq-grid, .vc-pq-passos { grid-template-columns: 1fr; } }
    </style>
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.megafone(16)} Por que acompanhar</span>
      <h2 class="vc-h2">Quem não é acompanhado decide sozinho</h2>
      <p class="vc-lead">Você não precisa concordar com ninguém para acompanhar. Precisa saber o que foi feito em seu nome, e perguntar. Opinião, cada um tem a sua. Os fatos são os mesmos para todos.</p>
      <div class="vc-pq-grid">
        <div class="vc-pq"><b>1.461</b><strong>dias de mandato de deputado</strong><span>Seu voto levou segundos na urna. O que ele autorizou dura de 1º de fevereiro de 2027 a 31 de janeiro de 2031.</span><small>Fonte: Constituição, art. 44</small></div>
        <div class="vc-pq"><b>R$ 51 mi</b><strong>da cota parlamentar em "divulgação do mandato"</strong><span>Só em 2026, deputados federais usaram dinheiro público para divulgar o próprio trabalho. <a href="/dinheiro-publico/cota">Veja o do seu deputado</a>.</span><small>Fonte: Câmara dos Deputados, dados abertos</small></div>
        <div class="vc-pq"><b>R$ 4,9 bi</b><strong>de fundo eleitoral em 2026</strong><span>O valor das próximas eleições será votado pelos eleitos de agora. Saiba como cada um vai votar antes que vote.</span><small>Fonte: Congresso Nacional, LOA 2026</small></div>
      </div>
      <div class="vc-pq-passos">
        <div class="vc-pq-passo"><h3>Encontre</h3><p>Pelo CEP ou pelo nome: quem te representa, com votos, partido, patrimônio e contatos oficiais.</p></div>
        <div class="vc-pq-passo"><h3>Acompanhe</h3><p>Como votou, quanto gastou da cota e quanto dinheiro público recebeu, com a fonte de cada dado.</p></div>
        <div class="vc-pq-passo"><h3>Cobre</h3><p>Escolha um fato e mande a pergunta pronta ao gabinete. Cada cobrança entra no contador público do eleito.</p></div>
      </div>
      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="vc-btn vc-btn--pri" href="#cep-hero" data-ev="cta_home" data-ev-chave="porque_cep">${Icone.mapa(18)} Achar os meus pelo CEP</a>
        <a class="vc-btn vc-btn--sec" href="/meus-representantes" data-ev="cta_home" data-ev-chave="porque_meus">${Icone.coracao(18)} Meus representantes <b data-fav-count hidden class="nav-fav-n"></b></a>
      </div>
    </div>
  </section>`;
}

function renderMapa(uf) {
  // 27/09/2026: o banner do dinheiro público virou uma caixa igual às outras 2 (mesmo tamanho,
  // mesmo estilo — título em dourado, fundo navy, texto claro), e a fileira caiu de "banner +
  // 3 caixas" para só 3 caixas (a de "quanto vale o seu voto" foi pro bloco "Voto para deputado",
  // como uma 3ª opção ao lado das outras 2). Cada caixa ganhou um "saiba mais →" no rodapé, como
  // se fossem notícias — ver .vc-card--navy em ds.js.
  return `
  <section class="vc-sec vc-sec--branca" id="estados">
    <div class="vc-wrap vc-mapa-grid">
      <div>
        <span class="vc-eyebrow">${Icone.mapa(16)} Por estado</span>
        <h2 class="vc-h2">Escolha seu estado e veja quem te representa</h2>
        <p class="vc-lead">Deputados, senadores e governador representam o estado inteiro. Toque na sigla para ver todos os eleitos, com votos, partido, contatos oficiais e o botão para cobrar cada um.</p>
        <div class="vc-ufs">${Object.keys(UF_NOMES)
          .sort()
          .map((u) => `<a href="/eleitos/${u.toLowerCase()}" class="${u === uf ? 'ativo' : ''}" data-ev="uf" data-ev-chave="${u}" title="${escapeHtml(UF_NOMES[u])}">${u}</a>`)
          .join('')}</div>
        <style>${ESTILO_MUNICIPIO}</style>
        <p class="vc-lead" style="margin:24px 0 0;font-size:16px">Quer saber quem tem mais ligação com a sua cidade? Digite o CEP e veja os deputados eleitos mais votados nela.</p>
        ${formCep({ id: 'cep-home' })}
      </div>
      <div>${renderMapaBrasil().replace(/href="\/buscar\?uf=([A-Z]{2})"/g, (_, u) => `href="/eleitos/${u.toLowerCase()}"`).replace(/Ver candidatos de/g, 'Ver eleitos de')}</div>
    </div>
  </section>`;
}

/** 12/10/2026: banner rotativo das páginas temáticas (substitui as 3 caixas navy e ocupa o espaço
 *  que era do 2º turno). Rolagem nativa com scroll-snap: funciona sem JS (arrasta/rola); com JS
 *  ganha pontos, setas e avanço automático a cada 7 s, que pausa no hover/foco e não roda com
 *  prefers-reduced-motion. */
function renderVitrine(uf) {
  const q = uf ? `?uf=${uf}` : '';
  const slides = [
    { href: '/partidos', ev: 'partidos', eyebrow: 'Congresso 2027', titulo: 'Quem ganhou e quem perdeu cadeiras', texto: 'A nova bancada de cada partido na Câmara e no Senado, e os que mais cresceram e encolheram em relação a hoje.', num: '98 → 121', legenda: 'deputados do PL a partir de 2027', cta: 'Ver os partidos' },
    { href: `/dinheiro-publico${q}`, ev: 'dinheiro', eyebrow: 'Dinheiro público', titulo: 'R$ 5,6 bi do seu imposto pagaram as campanhas', texto: 'Quanto cada candidato recebeu do fundo eleitoral e do fundo partidário, e quanto custou cada voto.', num: '65%', legenda: 'do dinheiro foi para quem não se elegeu', cta: 'Ver para onde foi' },
    { href: '', ev: 'cidade', eyebrow: 'Sua cidade', titulo: 'Quem tem base eleitoral onde você mora', texto: 'Digite o CEP e veja os deputados mais votados na sua cidade e os que dependem mais dela, com perfil e contatos.', num: 'CEP', legenda: 'basta digitar para ver os seus', cta: 'Buscar pela cidade', ancora: '#estados' },
    { href: '/judiciario', ev: 'judiciario', eyebrow: 'Judiciário', titulo: 'Ninguém ali é eleito. Mas decide muita coisa', texto: 'Quem são os ministros do STF e do TSE, quem os indicou e o que cabe a cada tribunal na eleição.', num: '0', legenda: 'votos recebidos por ministros do STF', cta: 'Entender o Judiciário' },
    { href: `/quanto-vale-seu-voto${q}`, ev: 'quanto_vale', eyebrow: 'Seu voto', titulo: 'Quanto vale o seu voto para deputado', texto: 'O peso do voto muda muito de estado para estado. Veja quantos votos custa uma cadeira onde você vota.', num: '1 voto', legenda: 'não vale o mesmo em todo o país', cta: 'Calcular o meu' },
    { href: '/perderam-o-mandato', ev: 'perderam', eyebrow: 'Perderam o mandato', titulo: 'Eleitos em 2022 que perderam a vaga', texto: 'Você ajudou a eleger algum deles? E quanto da vaga veio dos votos de outras pessoas da mesma lista.', num: '6', legenda: 'casos documentados, com a fonte de cada um', cta: 'Ver os casos' },
  ];
  const n = slides.length;
  return `
  <section class="vc-vit" aria-roledescription="carrossel" aria-label="Para explorar no VotoCheck">
    <style>
      .vc-vit { padding: 40px 0 8px; }
      .vc-vit-trilho { display: grid; grid-auto-flow: column; grid-auto-columns: 100%; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; border-radius: 22px; scrollbar-width: none; }
      .vc-vit-trilho::-webkit-scrollbar { display: none; }
      .vc-vit-slide { scroll-snap-align: start; background: var(--navy); color: #fff; display: grid; grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); gap: 32px; align-items: center; padding: 40px 44px; position: relative; overflow: hidden; text-decoration: none; min-height: 268px; }
      .vc-vit-slide::after { content: ''; position: absolute; right: -120px; top: -140px; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, rgba(0,180,149,.20), transparent 65%); pointer-events: none; }
      .vc-vit-slide small { display: block; font-size: 12.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8FB0FF; margin-bottom: 10px; }
      .vc-vit-slide h3 { color: #fff; font-size: clamp(24px, 3vw, 34px); line-height: 1.12; letter-spacing: -.02em; margin: 0 0 12px; }
      .vc-vit-slide p { color: #C3CDF0; font-size: 16px; line-height: 1.55; margin: 0 0 20px; max-width: 520px; }
      .vc-vit-cta { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; color: var(--navy); background: #fff; border-radius: 999px; padding: 11px 18px; }
      .vc-vit-slide:hover .vc-vit-cta, .vc-vit-slide:focus-visible .vc-vit-cta { background: #5FE3C8; }
      .vc-vit-slide:focus-visible { outline: 3px solid #5FE3C8; outline-offset: -3px; }
      .vc-vit-num { position: relative; z-index: 1; border-left: 1px solid rgba(255,255,255,.16); padding-left: 32px; }
      .vc-vit-num b { display: block; font-family: var(--font-display); font-size: clamp(44px, 6vw, 76px); line-height: 1; color: #5FE3C8; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
      .vc-vit-num span { display: block; color: #C3CDF0; font-size: 15px; margin-top: 10px; max-width: 260px; }
      .vc-vit-ctrl { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
      .vc-vit-pontos { display: flex; gap: 6px; flex-wrap: wrap; }
      .vc-vit-pontos button { font: 600 13px var(--font-body); color: var(--ink-2); background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 7px 12px; cursor: pointer; min-height: 36px; }
      .vc-vit-pontos button[aria-current="true"] { background: var(--navy); color: #fff; border-color: var(--navy); }
      .vc-vit-setas { display: flex; gap: 6px; }
      .vc-vit-setas button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: #fff; cursor: pointer; display: grid; place-items: center; color: var(--ink); }
      .vc-vit-setas button:hover, .vc-vit-pontos button:hover { border-color: var(--blue); }
      .vc-vit-setas .ant svg { transform: rotate(180deg); }
      @media (max-width: 760px) {
        .vc-vit { padding-top: 28px; }
        .vc-vit-slide { grid-template-columns: 1fr; gap: 18px; padding: 28px 22px; min-height: 0; }
        .vc-vit-num { border-left: 0; padding-left: 0; order: -1; }
        .vc-vit-num b { font-size: 44px; }
        .vc-vit-pontos { display: none; }
        .vc-vit-ctrl { justify-content: flex-end; }
        .vc-vit-ctrl::before { content: attr(data-pos); font-size: 13px; color: var(--muted); font-weight: 600; margin-right: auto; }
      }
      @media (prefers-reduced-motion: reduce) { .vc-vit-trilho { scroll-behavior: auto; } }
    </style>
    <div class="vc-wrap">
      <div class="vc-vit-trilho" tabindex="-1">
        ${slides
          .map(
            (sl, i) => `
        <a class="vc-vit-slide" href="${sl.href}${sl.ancora || ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${n}: ${escapeHtml(sl.eyebrow)}" data-ev="home_vitrine" data-ev-chave="${sl.ev}"${i ? ' tabindex="-1"' : ''}>
          <div><small>${escapeHtml(sl.eyebrow)}</small><h3>${escapeHtml(sl.titulo)}</h3><p>${escapeHtml(sl.texto)}</p><span class="vc-vit-cta">${escapeHtml(sl.cta)} ${Icone.seta(16)}</span></div>
          <div class="vc-vit-num" aria-hidden="true"><b>${escapeHtml(sl.num)}</b><span>${escapeHtml(sl.legenda)}</span></div>
        </a>`
          )
          .join('')}
      </div>
      <div class="vc-vit-ctrl" data-pos="1 de ${n}">
        <div class="vc-vit-pontos">${slides.map((sl, i) => `<button type="button" data-ir="${i}" aria-label="Ir para: ${escapeHtml(sl.eyebrow)}"${i ? '' : ' aria-current="true"'}>${escapeHtml(sl.eyebrow)}</button>`).join('')}</div>
        <div class="vc-vit-setas"><button type="button" class="ant" data-passo="-1" aria-label="Anterior">${Icone.seta(18)}</button><button type="button" data-passo="1" aria-label="Próximo">${Icone.seta(18)}</button></div>
      </div>
    </div>
    <script>
    (function(){
      var raiz=document.currentScript.closest('.vc-vit'), tr=raiz.querySelector('.vc-vit-trilho'), sl=tr.children, n=sl.length, atual=0, timer=null, pausa=false;
      var ctrl=raiz.querySelector('.vc-vit-ctrl'), pts=raiz.querySelectorAll('[data-ir]');
      var reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      function marcar(i){ atual=i; ctrl.setAttribute('data-pos',(i+1)+' de '+n); pts.forEach(function(p,k){ if(k===i)p.setAttribute('aria-current','true'); else p.removeAttribute('aria-current'); }); for(var k=0;k<n;k++){ if(k===i)sl[k].removeAttribute('tabindex'); else sl[k].setAttribute('tabindex','-1'); } }
      function ir(i){ i=(i+n)%n; tr.scrollTo({left:sl[i].offsetLeft-tr.offsetLeft,behavior:reduz?'auto':'smooth'}); marcar(i); }
      var t; tr.addEventListener('scroll',function(){ clearTimeout(t); t=setTimeout(function(){ var i=Math.round(tr.scrollLeft/tr.clientWidth); if(i!==atual)marcar(i); },80); },{passive:true});
      pts.forEach(function(p){ p.addEventListener('click',function(){ ir(+p.dataset.ir); }); });
      raiz.querySelectorAll('[data-passo]').forEach(function(b){ b.addEventListener('click',function(){ ir(atual+(+b.dataset.passo)); }); });
      function inicia(){ if(reduz||timer)return; timer=setInterval(function(){ if(!pausa&&!document.hidden)ir(atual+1); },7000); }
      ['mouseenter','focusin','touchstart'].forEach(function(e){ raiz.addEventListener(e,function(){ pausa=true; },{passive:true}); });
      ['mouseleave','focusout'].forEach(function(e){ raiz.addEventListener(e,function(){ pausa=false; }); });
      if('IntersectionObserver' in window){ new IntersectionObserver(function(en){ en.forEach(function(x){ if(x.isIntersecting)inicia(); else{ clearInterval(timer); timer=null; } }); },{threshold:.4}).observe(raiz); } else inicia();
    })();
    </script>
  </section>`;
}

/** 12/10/2026: Meu VotoCheck volta à home, remodelado para os eleitos + "Meus representantes". */
function renderMeuVotoCheck(uf) {
  return `
  <section class="vc-sec" id="meu-votocheck">
    <div class="vc-wrap vc-mvc">
      <style>
        .vc-mvc { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(0,1fr); gap: 40px; align-items: center; }
        .vc-mvc-lista { display: grid; gap: 10px; }
        .vc-mvc-lista div { display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: start; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; }
        .vc-mvc-lista b { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--navy); color: #fff; font-family: var(--font-display); font-size: 17px; }
        .vc-mvc-lista strong { display: block; color: var(--ink); font-size: 16px; margin-bottom: 2px; }
        .vc-mvc-lista span { color: var(--ink-2); font-size: 14.5px; line-height: 1.5; }
        .vc-mvc-acoes { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
        @media (max-width: 860px) { .vc-mvc { grid-template-columns: 1fr; gap: 24px; } }
      </style>
      <div>
        <span class="vc-eyebrow">${Icone.bussola(16)} Meu VotoCheck</span>
        <h2 class="vc-h2">Quem foi eleito do jeito que você quer?</h2>
        <p class="vc-lead">Diga o que importa pra você, inclusive se quer alguém com base na sua cidade, e veja quais deputados e senadores eleitos combinam. Sem ranking e sem o VotoCheck escolher por você.</p>
        <div class="vc-mvc-acoes">
          <a class="vc-btn vc-btn--pri" href="/quiz${uf ? `?uf=${uf}` : ''}" data-ev="cta_home" data-ev-chave="quiz">${Icone.bussola(18)} Fazer o Meu VotoCheck</a>
          <a class="vc-btn vc-btn--sec" href="/meus-representantes" data-ev="cta_home" data-ev-chave="meus">${Icone.coracao(18)} Meus representantes <b data-fav-count hidden class="nav-fav-n"></b></a>
        </div>
      </div>
      <div class="vc-mvc-lista">
        <div><b>1</b><p style="margin:0"><strong>Responda em 2 minutos</strong><span>Base na sua cidade pelo CEP, idade, escolaridade, patrimônio, troca de partido e papel do Estado.</span></p></div>
        <div><b>2</b><p style="margin:0"><strong>Veja quem combina</strong><span>Entre os eleitos do seu estado, em ordem alfabética, com o motivo de cada diferença.</span></p></div>
        <div><b>3</b><p style="margin:0"><strong>Salve e cobre</strong><span>Até 3 deputados federais, 3 estaduais e 3 senadores, com perfil e contatos oficiais. Fica só no seu aparelho.</span></p></div>
      </div>
    </div>
  </section>`;
}

function renderQuociente(uf) {
  // 27/09/2026: "Voto para deputado" trocou de fundo com "Meu VotoCheck" (agora branco, era
  // navy — ver renderHomeV2) e ganhou um 3º botão ("Quanto vale o seu voto?"), que antes era um
  // dos mini-cards do bloco do mapa.
  return `
  <section class="vc-sec vc-sec--branca" id="seu-voto">
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.votoCaixa(16)} Voto para deputado</span>
      <h2 class="vc-h2">Seu voto em deputado pode ter eleito outra pessoa</h2>
      <p class="vc-lead">Para deputado, o voto conta primeiro para o partido ou federação e só depois para o candidato. Em 2026, ${(totaisEleitos().deputado_federal || 513).toLocaleString('pt-BR')} deputados federais foram eleitos assim: a maioria pelo quociente, o resto pelas sobras.</p>
      <div class="vc-passos">
        <div class="vc-passo"><h3>Você vota no candidato</h3><p>Ou só no número do partido (voto de legenda).</p></div>
        <div class="vc-passo"><h3>O voto soma para o partido</h3><p>Todos os votos do partido ou federação entram num mesmo total.</p></div>
        <div class="vc-passo"><h3>O partido ganha cadeiras</h3><p>Pelo quociente eleitoral: quanto mais votos na lista, mais vagas.</p></div>
        <div class="vc-passo"><h3>As cadeiras vão para os mais votados da lista</h3><p>Que também precisam de um mínimo de votos próprios (10% do quociente).</p></div>
      </div>
      <div class="vc-exemplo">
        <div class="vc-exemplo-num">2002</div>
        <p><strong class="vc-exemplo-titulo">Exemplo real:</strong> em 2002, os votos do deputado Enéas Carneiro (Prona-SP) levaram mais cinco colegas de partido à Câmara, um deles com menos de 300 votos. A regra do mínimo de 10% do quociente veio depois, na reforma eleitoral de 2015, justamente para limitar esse efeito.</p>
      </div>
      <div style="margin-top:24px; display:flex; gap:12px; flex-wrap:wrap;">
        <a class="vc-btn vc-btn--pri" href="${uf ? `/eleitos/${uf.toLowerCase()}#camara` : '/eleitos'}">Ver deputados eleitos${uf ? ` em ${uf}` : ''}</a>
        <a class="vc-btn vc-btn--sec" href="/cargo/deputado_federal">O que faz um deputado federal</a>
        <a class="vc-btn vc-btn--sec" href="/quanto-vale-seu-voto${uf ? `?uf=${uf}` : ''}">Quanto vale o seu voto?</a>
      </div>
    </div>
  </section>`;
}


function renderMetodo() {
  // 27/09/2026: "Como verificamos" ganhou o destaque navy (era branco) — pedido do Rodrigo pra dar
  // mais peso a esse bloco. Os componentes internos (.vc-fluxo, .vc-passaporte, .vc-nao-fazemos)
  // já são cards brancos opacos, então funcionam sem ajuste em cima de qualquer fundo.
  return `
  <section class="vc-sec vc-sec--navy" id="metodo">
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.escudoCheck(16)} Como verificamos</span>
      <h2 class="vc-h2">Cada dado tem origem, data e contexto</h2>
      <p class="vc-lead">Os dados não têm opinião. Cada informação no VotoCheck segue o mesmo caminho, com as mesmas regras para todos, de qualquer partido. Isso vale também para temas como o fundo eleitoral: mostramos <a href="/sobre#posicao" style="color:#7FB0FF">fatos, não opinião</a>.</p>
      <div class="vc-fluxo">
        <div><small>1 · Fonte</small><strong>Quem publicou</strong><span>TSE, Câmara ou Senado, sempre a origem oficial.</span></div>
        <div><small>2 · Evidência</small><strong>O registro</strong><span>A votação, a declaração ou o documento em si.</span></div>
        <div><small>3 · Dado</small><strong>O fato</strong><span>Ex.: votou "Sim"; declarou tais bens.</span></div>
        <div><small>4 · Contexto</small><strong>O que significa</strong><span>Qual projeto, em qual fase, com qual regra.</span></div>
      </div>
      <div class="vc-passaporte">
        <div><b>Fonte</b>Câmara dos Deputados</div>
        <div><b>Registro</b>Votação nominal em Plenário</div>
        <div><b>Coletado em</b>diariamente, às 4h</div>
        <div><b>Link</b><a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener">dados abertos ↗</a></div>
      </div>
      <div class="vc-nao-fazemos">
        <span>${Icone.semNota(16)} Não damos nota</span>
        <span>${Icone.semNota(16)} Não fazemos ranking</span>
        <span>${Icone.semNota(16)} Não indicamos voto</span>
        <span>${Icone.checkCirculo(16)} Corrigimos erros em público</span>
      </div>
    </div>
  </section>`;
}

function renderNumeros() {
  const t = totaisEleitos();
  const total = Number(RESULTADO_2026.candidaturas_totalizadas) || 0;
  return `
  <section class="vc-sec">
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.grafico(16)} O resultado</span>
      <h2 class="vc-h2">${t.total.toLocaleString('pt-BR')} eleitos entre ${total.toLocaleString('pt-BR')} candidaturas</h2>
      <p class="vc-lead">Cerca de 1 em cada ${Math.round(total / Math.max(1, t.total))} candidaturas virou mandato, além do presidente da República. Agora começa o que vale mais: acompanhar o que cada um faz.</p>
      <div class="vc-stats">
        <div class="vc-stat"><b>${t.deputado_federal.toLocaleString('pt-BR')}</b><span>deputados federais</span></div>
        <div class="vc-stat"><b>${t.deputado_estadual.toLocaleString('pt-BR')}</b><span>deputados estaduais e distritais</span></div>
        <div class="vc-stat"><b>${t.senador}</b><span>senadores</span></div>
        <div class="vc-stat"><b>${t.governador}</b><span>governadores</span></div>
      </div>
      <p class="el-fonte" style="font-size:12.5px;color:var(--muted);margin-top:16px">${escapeHtml(fonteResultado())}</p>
    </div>
  </section>`;
}

export function renderHomeV2({ uf = '', contagemUf = null, totalCandidaturas, totalPessoas, atualizadoEm, porCargo, pessoas2T = {} }) {
  // 27/09/2026: ordem nova pedida pelo Rodrigo — "Meu VotoCheck" passa a vir antes de "Voto para
  // deputado" (e ganha o destaque navy que era do quociente), com a publicidade A1 continuando
  // logo depois do bloco do VotoCheck, como já era.
  const corpo = `
    ${renderHero(uf)}
    ${renderPorQue()}
    ${renderVitrine(uf)}
    ${renderMapa(uf)}
    ${renderMeuVotoCheck(uf)}
    ${renderBlocoBoletim({ uf, origem: 'home' })}
    <div class="vc-wrap" style="padding:40px 24px">${renderPublicidade('A1', 'home')}</div>
    ${renderQuociente(uf)}
    ${renderMetodo()}
    ${renderNumeros()}
    ${renderCtaTriplo({ contexto: 'home' })}
  `;
  return pagina({
    titulo: 'VotoCheck — Quem te representa e o que faz com o seu voto',
    descricao: 'Descubra pelo CEP quem te representa, acompanhe votações, cota parlamentar e dinheiro público de cada eleito de 2026 e cobre direto no gabinete, com fato e fonte. Dados do TSE, Câmara e Senado.',
    caminho: '/',
    larga: true,
    ogImagem: 'https://votocheck.com.br/og/pagina/home.jpg',
    corpo,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VotoCheck',
      url: SITE_URL,
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/buscar?q={q}`, 'query-input': 'required name=q' },
    },
  });
}
