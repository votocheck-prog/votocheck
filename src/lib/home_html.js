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
import { renderSegundoTurno, totaisEleitos, governadorUf, antesDo2T, disputas2T } from './eleitos_html.js';
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


/** Painel do hero (08/10/2026): eleitos do estado do visitante, ou do Brasil. Dado estático do TSE. */
function renderPainel(uf) {
  const t = totaisEleitos(uf);
  const base = uf ? `/eleitos/${uf.toLowerCase()}` : '/eleitos';
  const pres = disputas2T().find((d) => d.cargo === 'presidente');
  const nomes = (lista) => lista.map((c) => nomeProprio(c.nome)).join(' × ');
  const linhas = [];
  if (pres && antesDo2T()) linhas.push({ n: '2T', cargo: 'Presidente', det: `2º turno: ${nomes(pres.cands)}`, href: '/eleitos#segundo-turno' });
  if (uf) {
    const g = governadorUf(uf);
    linhas.push({ n: g.segundo ? '2T' : t.governador, cargo: 'Governador', det: g.eleito ? `${nomeProprio(g.eleito.nome)} (${g.eleito.partido}), eleito no 1º turno` : g.segundo ? `2º turno: ${nomes(g.segundo)}` : 'resultado em carga', href: `${base}#governador` });
  } else {
    const n2 = disputas2T().filter((d) => d.cargo === 'governador').length;
    linhas.push({ n: t.governador, cargo: 'Governadores', det: `eleitos no 1º turno${n2 ? ` · ${n2} estados no 2º turno` : ''}`, href: '/eleitos' });
  }
  linhas.push({ n: t.senador, cargo: 'Senadores', det: 'eleitos · mandato até 2035', href: `${base}#senado` });
  linhas.push({ n: t.deputado_federal, cargo: 'Deputados federais', det: 'eleitos · mandato até 2031', href: `${base}#camara` });
  linhas.push({ n: t.deputado_estadual, cargo: uf === 'DF' ? 'Deputados distritais' : 'Deputados estaduais', det: 'eleitos · mandato até 2031', href: `${base}#assembleia` });
  return `
  <div class="vc-urna vc-painel" aria-label="Eleitos em 2026${uf ? ` em ${escapeHtml(UF_NOMES[uf] || uf)}` : ' no Brasil'}">
    <div class="vc-urna-topo"><span>Eleitos em 2026</span><strong>${uf ? escapeHtml(UF_NOMES[uf] || uf) : 'Brasil'}</strong></div>
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
    <div class="vc-urna-rodape"><span>Resultado oficial do TSE · ${escapeHtml((RESULTADO_2026.totalizacao_t1 || '').replace(' ', ', '))}</span><a href="${base}">Ver todos os eleitos →</a></div>
  </div>`;
}

function renderHero(uf, contagemUf, atualizadoEm) {
  const base = uf ? `/eleitos/${uf.toLowerCase()}` : '/eleitos';
  return `
  <section class="vc-hero">
    <div class="vc-wrap vc-hero-grid">
      <div class="vc-reveal">
        <span class="vc-eyebrow" style="color:#7FB0FF">Eleições 2026 · Resultado oficial com fonte</span>
        <h1>As urnas falaram.<br><em>Agora começa a cobrança.</em></h1>
        <p class="vc-hero-sub">Veja quem foi eleito no seu estado, com votos, partido, patrimônio e o dinheiro público que cada um recebeu. E acompanhe o que cada um faz com o mandato.</p>
        <form class="vc-busca" method="GET" action="/buscar" role="search">
          <span class="vc-busca-ico">${Icone.busca(20)}</span>
          <label class="sr-only" for="q-home">Nome ou número do eleito ou candidato</label>
          <input id="q-home" type="search" name="q" placeholder="Nome ou número do eleito ou candidato" autocomplete="off" />
          <label class="sr-only" for="uf-home">Estado</label>
          <select id="uf-home" name="uf" aria-label="Estado">
            <option value="">Todos</option>
            ${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
          <button class="vc-btn vc-btn--pri" type="submit">Buscar</button>
        </form>
        <p class="vc-busca-dica">Digite o nome do seu deputado ou o número em que você votou.</p>
        <div class="vc-hero-acoes">
          <a class="vc-btn vc-btn--claro" href="${base}" data-ev="cta_home" data-ev-chave="eleitos">${Icone.pessoas(18)} Ver os eleitos ${uf ? `de ${escapeHtml(uf)}` : 'por estado'}</a>
          ${antesDo2T() ? `<a class="vc-btn vc-btn--claro" href="#segundo-turno" data-ev="cta_home" data-ev-chave="2turno">${Icone.calendario(18)} Quem disputa o 2º turno</a>` : ''}
        </div>
        <div class="vc-selo-fontes"><span class="ponto"></span><span>Fontes: <b>TSE</b> · <b>Câmara dos Deputados</b> · <b>Senado Federal</b></span></div>
      </div>
      <div class="vc-reveal" style="animation-delay:.08s">${renderPainel(uf)}</div>
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
  <section class="vc-sec" style="padding:40px 0" id="dinheiro">
    <div class="vc-wrap vc-grid vc-grid-3">
      <a href="/dinheiro-publico${uf ? `?uf=${uf}` : ''}" class="vc-card vc-card--navy" data-ev="home_dinheiro">
        <h3>R$ 5,3 bi em dinheiro público nas campanhas de 2026</h3>
        <p>Veja quanto cada candidato do seu estado recebeu do fundo eleitoral e do fundo partidário.</p>
        <span class="vc-mais">Saiba mais ${Icone.seta(16)}</span>
      </a>
      <a href="/2022${uf ? `?uf=${uf}` : ''}" class="vc-card vc-card--navy">
        <h3>Em 2022, quem o seu voto ajudou a eleger indiretamente</h3>
        <p>Digite em quem votou e veja para onde o voto foi.</p>
        <span class="vc-mais">Saiba mais ${Icone.seta(16)}</span>
      </a>
      <a href="/perderam-o-mandato" class="vc-card vc-card--navy">
        <h3>Eleitos que perderam o mandato, você ajudou a elegê-los?</h3>
        <p>E quanto da vaga veio dos votos de outros.</p>
        <span class="vc-mais">Saiba mais ${Icone.seta(16)}</span>
      </a>
    </div>
  </section>
  <section class="vc-sec vc-sec--branca" id="estados">
    <div class="vc-wrap vc-mapa-grid">
      <div>
        <span class="vc-eyebrow">${Icone.mapa(16)} Por estado</span>
        <h2 class="vc-h2">Escolha seu estado e veja quem foi eleito</h2>
        <p class="vc-lead">Deputados federais e estaduais, senadores e governador são eleitos por estado. Toque na sigla para ver todos os eleitos, com votos, partido e a ficha completa de cada um.</p>
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
      <p class="vc-lead">Os dados não têm opinião. Cada informação no VotoCheck segue o mesmo caminho, com as mesmas regras para todos, de qualquer partido. Quando o VotoCheck tem posição sobre uma regra do sistema, como o valor do fundo eleitoral, ela vem separada e rotulada: <a href="/sobre#posicao" style="color:#7FB0FF">Posição do VotoCheck</a>.</p>
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
  const n2 = disputas2T().filter((d) => d.cargo === 'governador').length;
  const total = Number(RESULTADO_2026.candidaturas_totalizadas) || 0;
  return `
  <section class="vc-sec">
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.grafico(16)} O resultado</span>
      <h2 class="vc-h2">${t.total.toLocaleString('pt-BR')} eleitos entre ${total.toLocaleString('pt-BR')} candidaturas</h2>
      <p class="vc-lead">Cerca de 1 em cada ${Math.round(total / Math.max(1, t.total))} candidaturas virou mandato no 1º turno. ${n2 ? `Presidente e governador em ${n2} estados ainda vão ao 2º turno.` : ''}</p>
      <div class="vc-stats">
        <div class="vc-stat"><b>${t.deputado_federal.toLocaleString('pt-BR')}</b><span>deputados federais</span></div>
        <div class="vc-stat"><b>${t.deputado_estadual.toLocaleString('pt-BR')}</b><span>deputados estaduais e distritais</span></div>
        <div class="vc-stat"><b>${t.senador}</b><span>senadores</span></div>
        <div class="vc-stat"><b>${t.governador}</b><span>governadores no 1º turno</span></div>
      </div>
      <p class="el-fonte" style="font-size:12.5px;color:var(--muted);margin-top:16px">Fonte: TSE, resultado oficial do 1º turno (totalização de ${escapeHtml((RESULTADO_2026.totalizacao_t1 || '').replace(' ', ', '))}).</p>
    </div>
  </section>`;
}

export function renderHomeV2({ uf = '', contagemUf = null, totalCandidaturas, totalPessoas, atualizadoEm, porCargo, pessoas2T = {} }) {
  // 27/09/2026: ordem nova pedida pelo Rodrigo — "Meu VotoCheck" passa a vir antes de "Voto para
  // deputado" (e ganha o destaque navy que era do quociente), com a publicidade A1 continuando
  // logo depois do bloco do VotoCheck, como já era.
  const corpo = `
    ${renderHero(uf, contagemUf, atualizadoEm)}
    ${antesDo2T() ? renderSegundoTurno({ pessoas: pessoas2T, ufFoco: uf }) : ''}
    ${renderMapa(uf)}
    ${renderBlocoBoletim({ uf, origem: 'home' })}
    <div class="vc-wrap" style="padding:40px 24px">${renderPublicidade('A1', 'home')}</div>
    ${renderQuociente(uf)}
    ${renderMetodo()}
    ${renderNumeros()}
    ${renderCtaTriplo({ contexto: 'home' })}
  `;
  return pagina({
    titulo: 'VotoCheck — Quem foi eleito em 2026 e o que faz com o mandato',
    descricao: 'Veja os eleitos de 2026 no seu estado (deputados, senadores e governador), com votos, partido, patrimônio e dinheiro público de campanha. Dado oficial do TSE, Câmara e Senado, com fonte.',
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
