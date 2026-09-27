/**
 * VotoCheck — Home v2 (Onda 1: até o 1º turno). Doc "Diagnóstico e Plano", seção 3.2.
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

function renderUrna(uf, contagemUf) {
  const votos = seisVotos(uf);
  const detalhe = (v) => {
    if (!uf) return v.slug === 'presidente' ? 'Todo o Brasil' : 'Escolha seu estado';
    const n = contagemUf?.[v.slug];
    if (v.slug === 'presidente') return `${fmt(contagemUf?.presidente)} candidatos · Brasil`;
    if (v.slug === 'senador') return `${fmt(n)} candidatos · 2 vagas em ${uf}`;
    if (v.slug === 'governador') return `${fmt(n)} candidatos · ${uf}`;
    const vagas = v.slug === 'deputado_federal' ? VAGAS_DEP_FEDERAL[uf] : vagasDepEstadual(uf);
    return `${fmt(n)} candidatos · ${vagas ?? '—'} vagas`;
  };
  const href = (v) => (v.slug === 'presidente' ? `/buscar?cargo=presidente` : uf ? `/buscar?cargo=${v.slug}&uf=${uf}` : `/buscar?cargo=${v.slug}`);
  return `
  <div class="vc-urna" aria-label="Os 6 votos da urna em 2026, na ordem oficial">
    <div class="vc-urna-topo"><span>Sua urna · 1º turno</span><strong>${uf ? escapeHtml(UF_NOMES[uf] || uf) : 'Brasil'}</strong></div>
    ${votos
      .map(
        (v) => `
      <a class="vc-voto" href="${href(v)}" data-ev="urna" data-ev-chave="${v.slug}">
        <span class="vc-voto-n">${v.ordem}</span>
        <span class="vc-voto-cargo">${escapeHtml(v.nome)}<small>${escapeHtml(detalhe(v))}</small></span>
        ${digitos(v.dig)}
      </a>`
      )
      .join('')}
    <div class="vc-urna-rodape"><span>Ordem oficial do TSE para 2026</span><a href="/cola">Montar minha cola →</a></div>
  </div>`;
}

function renderHero(uf, contagemUf, atualizadoEm) {
  return `
  <section class="vc-hero">
    <div class="vc-wrap vc-hero-grid">
      <div class="vc-reveal">
        <span class="vc-eyebrow" style="color:#7FB0FF">Eleições 2026 · Informação oficial com fonte</span>
        <h1>São 6 votos na urna.<br><em>Você já sabe os 6?</em></h1>
        <p class="vc-hero-sub">Confira quem são os candidatos do seu estado, o que já fizeram e monte sua cola. Tudo com dado oficial e a fonte de cada informação.</p>
        <form class="vc-busca" method="GET" action="/buscar" role="search">
          <span class="vc-busca-ico">${Icone.busca(20)}</span>
          <label class="sr-only" for="q-home">Nome ou número do candidato</label>
          <input id="q-home" type="search" name="q" placeholder="Nome ou número do candidato" autocomplete="off" />
          <label class="sr-only" for="uf-home">Estado</label>
          <select id="uf-home" name="uf" aria-label="Estado">
            <option value="">Todos</option>
            ${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
          <button class="vc-btn vc-btn--pri" type="submit">Buscar</button>
        </form>
        <p class="vc-busca-dica">Recebeu um santinho? Digite o número. Ex.: 4040, 1234</p>
        <div class="vc-hero-acoes">
          <a class="vc-btn vc-btn--claro" href="/quiz${uf ? `?cargo=deputado_federal&uf=${uf}` : ''}" data-ev="cta_home" data-ev-chave="quiz">${Icone.bussola(18)} Descobrir o que importa pra mim</a>
          <a class="vc-btn vc-btn--claro" href="/cola" data-ev="cta_home" data-ev-chave="cola">${Icone.impressora(18)} Montar minha cola</a>
        </div>
        <div class="vc-selo-fontes"><span class="ponto"></span><span>Fontes: <b>TSE</b> · <b>Câmara dos Deputados</b> · <b>Senado Federal</b></span>${atualizadoEm ? `<span>· dados atualizados em ${escapeHtml(fmtAtualizado(atualizadoEm))}</span>` : ''}</div>
      </div>
      <div class="vc-reveal" style="animation-delay:.08s">${renderUrna(uf, contagemUf)}</div>
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
        <h3>Em 2022, quem o seu voto elegeu?</h3>
        <p>Digite em quem votou e veja para onde o voto foi.</p>
        <span class="vc-mais">Saiba mais ${Icone.seta(16)}</span>
      </a>
      <a href="/perderam-o-mandato" class="vc-card vc-card--navy">
        <h3>Eleitos que perderam o mandato</h3>
        <p>E quanto da vaga veio dos votos de outros.</p>
        <span class="vc-mais">Saiba mais ${Icone.seta(16)}</span>
      </a>
    </div>
  </section>
  <section class="vc-sec vc-sec--branca" id="estados">
    <div class="vc-wrap vc-mapa-grid">
      <div>
        <span class="vc-eyebrow">${Icone.mapa(16)} Por estado</span>
        <h2 class="vc-h2">Escolha seu estado e veja quem está na disputa</h2>
        <p class="vc-lead">Deputado federal, estadual, senador e governador são escolhidos por estado. Toque no mapa ou na sigla para ver todos os candidatos, com número, partido e fonte oficial.</p>
        <div class="vc-ufs">${Object.keys(UF_NOMES)
          .sort()
          .map((u) => `<a href="/buscar?uf=${u}" class="${u === uf ? 'ativo' : ''}" data-ev="uf" data-ev-chave="${u}" title="${escapeHtml(UF_NOMES[u])}">${u}</a>`)
          .join('')}</div>
      </div>
      <div>${renderMapaBrasil()}</div>
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
      <h2 class="vc-h2">Seu voto em deputado pode eleger outra pessoa</h2>
      <p class="vc-lead">Para deputado, o voto conta primeiro para o partido ou federação e só depois para o candidato. Por isso vale conferir também quem está na mesma lista.</p>
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
        <a class="vc-btn vc-btn--pri" href="/buscar?cargo=deputado_federal${uf ? `&uf=${uf}` : ''}">Ver candidatos a deputado${uf ? ` em ${uf}` : ''}</a>
        <a class="vc-btn vc-btn--sec" href="/cargo/deputado_federal">O que faz um deputado federal</a>
        <a class="vc-btn vc-btn--sec" href="/quanto-vale-seu-voto${uf ? `?uf=${uf}` : ''}">Quanto vale o seu voto?</a>
      </div>
    </div>
  </section>`;
}

function renderQuizTeaser(uf) {
  const q = `/quiz${uf ? `?cargo=deputado_federal&uf=${uf}` : ''}`;
  // 27/09/2026: "Meu VotoCheck" ganhou o destaque navy (era o "Voto para deputado" que tinha) —
  // ver renderHomeV2 pra ordem nova dos blocos na home.
  return `
  <section class="vc-sec vc-sec--navy" id="meu-votocheck">
    <div class="vc-wrap vc-quiz-grid">
      <div>
        <span class="vc-eyebrow">${Icone.bussola(16)} Meu VotoCheck</span>
        <h2 class="vc-h2">Diga o que importa pra você. A gente mostra quem tem essas características.</h2>
        <p class="vc-lead">Seis perguntas, cerca de 2 minutos. Você escolhe os critérios e o VotoCheck organiza os candidatos que os atendem, com a fonte de cada dado.</p>
        <ul class="vc-lista-check">
          <li>${Icone.checkCirculo(20)} <span>Sem nota, sem ranking: o resultado mostra em quantos dos <em>seus</em> critérios cada candidato se encaixa</span></li>
          <li>${Icone.checkCirculo(20)} <span>Só entram as perguntas que você responder</span></li>
          <li>${Icone.checkCirculo(20)} <span>Não guardamos suas respostas nem pedimos cadastro</span></li>
        </ul>
        <a class="vc-btn vc-btn--pri" href="${q}" data-ev="cta_home" data-ev-chave="quiz_secao">Começar agora ${Icone.seta(18)}</a>
      </div>
      <div aria-hidden="false" class="vc-pergunta-demo-col">
        <div class="vc-pergunta-demo"><small>Pergunta 2 de 6</small><strong>Tem alguma preferência quanto ao sexo declarado do candidato?</strong>
          <div class="vc-opcoes"><a href="${q}">Prefiro masculino</a><a href="${q}">Prefiro feminino</a><a href="${q}">Tanto faz</a></div></div>
        <div class="vc-pergunta-demo"><small>Pergunta 5 de 6</small><strong>Trocar de partido durante o mandato pesa contra, pra você?</strong>
          <div class="vc-opcoes"><a href="${q}">Sim, pesa</a><a href="${q}">Não pesa</a><a href="${q}">Tanto faz</a></div></div>
        <div class="vc-pergunta-demo"><small>Pergunta 6 de 6</small><strong>Quanto o Estado deve atuar na economia e nos serviços?</strong>
          <div class="vc-opcoes"><a href="${q}">Mais Estado</a><a href="${q}">Estado no essencial</a></div></div>
      </div>
    </div>
  </section>`;
  // 27/09/2026: perguntas de exemplo atualizadas pro conjunto v4 (6 perguntas + espectro, "já
  // ocupou cargo" foi removida pelo Rodrigo nesta rodada e a numeração "de 7" virou "de 6").
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
      <p class="vc-lead">Não publicamos opinião. Cada informação no VotoCheck segue o mesmo caminho, com as mesmas regras para todos os candidatos, de qualquer partido.</p>
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

function renderNumeros({ totalCandidaturas, totalPessoas, porCargo }) {
  const max = Math.max(1, ...(porCargo || []).map((c) => c.qtd || 0));
  const totalBarras = (porCargo || []).reduce((s, c) => s + (c.qtd || 0), 0) || 1;
  const barras = (porCargo || [])
    .slice()
    .sort((a, b) => (b.qtd || 0) - (a.qtd || 0))
    // 27/09/2026: a barra usava `c.total`, campo que não existe na consulta (só vem `qtd` de
    // `estatisticasHomepageComCache`, ver src/index.js) — toda barra saía com a largura mínima
    // (1.5%), fixa, sem refletir a quantidade real de candidaturas por cargo. Corrigido pra usar
    // `c.qtd`, o mesmo campo já usado pra ordenar e pro número exibido. Na mesma passada, gráfico
    // ganhou tratamento visual novo (skill dataviz): barra fina, ponta arredondada/base quadrada.
    // 27/09/2026: removida a legenda "% do total" que aparecia num tooltip ao passar o cursor
    // (pedido do Rodrigo) — o % continua só no aria-label, pra quem usa leitor de tela/teclado.
    .map((c) => {
      const qtd = c.qtd || 0;
      const pct = ((qtd / totalBarras) * 100).toFixed(1).replace('.', ',');
      return `<div class="vc-barra" tabindex="0" aria-label="${escapeHtml(c.nome)}: ${fmt(qtd)} candidaturas, ${pct}% do total"><span class="vc-barra-rotulo">${escapeHtml(c.nome)}</span><span class="vc-barra-trilho"><i style="width:${Math.max(1.5, (qtd / max) * 100).toFixed(1)}%"></i></span><b>${fmt(qtd)}</b></div>`;
    })
    .join('');
  return `
  <section class="vc-sec">
    <div class="vc-wrap">
      <span class="vc-eyebrow">${Icone.grafico(16)} A base</span>
      <h2 class="vc-h2">Todos os candidatos registrados no TSE</h2>
      <div class="vc-stats">
        <div class="vc-stat"><b>${fmt(totalCandidaturas)}</b><span>candidaturas em 2026</span></div>
        <div class="vc-stat"><b>27</b><span>estados e o DF</span></div>
        <div class="vc-stat"><b>6</b><span>cargos em disputa</span></div>
        <div class="vc-stat"><b>3</b><span>fontes oficiais</span></div>
      </div>
      ${barras ? `<div class="vc-barras">${barras}</div>` : ''}
    </div>
  </section>`;
}

export function renderHomeV2({ uf = '', contagemUf = null, totalCandidaturas, totalPessoas, atualizadoEm, porCargo }) {
  // 27/09/2026: ordem nova pedida pelo Rodrigo — "Meu VotoCheck" passa a vir antes de "Voto para
  // deputado" (e ganha o destaque navy que era do quociente), com a publicidade A1 continuando
  // logo depois do bloco do VotoCheck, como já era.
  const corpo = `
    ${renderHero(uf, contagemUf, atualizadoEm)}
    ${renderMapa(uf)}
    ${renderQuizTeaser(uf)}
    <div class="vc-wrap" style="padding:40px 24px">${renderPublicidade('A1', 'home')}</div>
    ${renderQuociente(uf)}
    ${renderMetodo()}
    ${renderNumeros({ totalCandidaturas, totalPessoas, porCargo })}
    ${renderCtaTriplo({ contexto: 'home' })}
  `;
  return pagina({
    titulo: 'VotoCheck — Conheça os candidatos de 2026 antes de votar',
    descricao: 'São 6 votos na urna. Confira quem são os candidatos do seu estado, com dado oficial do TSE, Câmara e Senado e a fonte de cada informação. Sem ranking e sem nota.',
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
