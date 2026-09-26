/**
 * VotoCheck — "Meu VotoCheck": UI do quiz (/quiz) e da página de resultado (/quiz/resultado).
 *
 * Sem framework/build (mesma filosofia do resto do site) — uma página server-rendered com JS
 * progressivo só para a interação do quiz em si (cards, cursor de espectro, filtro de partido,
 * barra de progresso). Sem o JS, o formulário ainda existe e ainda pode ser enviado (cada campo
 * é um <input> real dentro de um <form method="GET">), só perde a gamificação visual.
 *
 * Fluxo:
 *   GET /quiz                     → passo 0: escolher cargo + UF (igual à busca)
 *   GET /quiz?cargo=&uf=          → o quiz em si: 6 perguntas + espectro + filtro de partido
 *   GET /quiz/resultado?...       → resultado (ver src/index.js para a lógica de match)
 *
 * Por que tudo em querystring (GET), nunca POST/D1: o resultado precisa ser um link
 * compartilhável/voltável, e a resposta ao quiz NUNCA é gravada no banco (ver decisão registrada
 * em src/index.js, rota /quiz/resultado) — o histórico deste projeto com a cota de escrita do D1
 * (ver documento de continuidade) pesou nessa escolha: zero escritas novas por interação de quiz.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { nomeProprio } from './perfil_html.js';
import { linkWhatsApp } from './apoio_html.js';
import { renderPublicidade } from './publicidade.js';
import { PERGUNTAS, ESPECTRO, ZONAS_ESPECTRO, partidosOrdenados, zonaPrincipal } from './quiz_config.js';
import { Icone } from './icones.js';
import { renderCtaApoio } from './jornada_html.js';
import { ESTILO_BUSCA, SLOT_COLA, calcularIdade } from './busca_html.js';
import { UF_NOMES } from './home_html.js';

const CARGOS_QUIZ = [
  { slug: 'presidente', nome: 'Presidente', semUf: true },
  { slug: 'governador', nome: 'Governador' },
  { slug: 'senador', nome: 'Senador' },
  { slug: 'deputado_federal', nome: 'Deputado Federal' },
  { slug: 'deputado_estadual', nome: 'Deputado Estadual' },
  { slug: 'deputado_distrital', nome: 'Deputado Distrital' },
];

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export function cargoQuizPorSlug(slug) {
  return CARGOS_QUIZ.find((c) => c.slug === slug) || null;
}

/** Passo 0 (v3, 26/09/2026) — hero navy no padrão das páginas redesenhadas; cargo em botões
 *  grandes; estado já vem detectado (ver index.js). */
const ICONE_CARGO = { presidente: 'predio', governador: 'mapa', senador: 'balanca', deputado_federal: 'pessoas', deputado_estadual: 'pessoas', deputado_distrital: 'pessoas' };

function renderEscolhaCargo(ufPadrao = '') {
  const ufOk = UFS.includes(ufPadrao) ? ufPadrao : '';
  const botoes = CARGOS_QUIZ.map(
    (c) => `<button type="submit" name="cargo" value="${c.slug}" class="qz-cargo" data-semuf="${c.semUf ? 1 : 0}">
      <i>${(Icone[ICONE_CARGO[c.slug]] || Icone.urna)(20)}</i><strong>${escapeHtml(c.nome)}</strong><span>${c.semUf ? 'Brasil' : 'no seu estado'}</span></button>`
  ).join('');
  return `
    <style>
      .qz-hero { background: var(--navy); color: #fff; padding: 56px 0 64px; position: relative; overflow: hidden; }
      .qz-hero::after { content: ''; position: absolute; right: -160px; top: -160px; width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle, rgba(0,180,149,.22), transparent 65%); pointer-events: none; }
      .qz-hero-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 48px; align-items: center; position: relative; z-index: 1; }
      @media (max-width: 900px) { .qz-hero-grid { grid-template-columns: 1fr; gap: 28px; } .qz-hero { padding: 40px 0 44px; } }
      .qz-hero .vc-eyebrow { color: #8FB0FF; }
      .qz-hero h1 { color: #fff; font-size: clamp(32px, 4.6vw, 52px); line-height: 1.06; letter-spacing: -.025em; margin: 8px 0 14px; }
      .qz-hero h1 em { font-style: normal; color: #5FE3C8; }
      .qz-hero-lead { color: #C3CDF0; font-size: 17px; margin: 0 0 18px; max-width: 520px; }
      .qz-selos { display: flex; gap: 8px; flex-wrap: wrap; }
      .qz-selos span { font-size: 13px; font-weight: 600; color: #DDE4FF; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 6px 12px; }
      .qz-painel { background: #fff; color: var(--ink); border-radius: 22px; padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,.28); }
      .qz-painel-topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
      .qz-painel-topo b { font-family: var(--font-display); font-size: 18px; }
      .qz-cargos { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
      @media (max-width: 520px) { .qz-cargos { grid-template-columns: 1fr 1fr; } }
      .qz-cargo { background: var(--paper); border: 1.5px solid transparent; border-radius: 16px; padding: 16px 14px; text-align: left; cursor: pointer; font-family: inherit; transition: border-color .15s, transform .15s, background .15s; }
      .qz-cargo:hover { border-color: var(--blue); background: #fff; transform: translateY(-2px); }
      .qz-cargo i { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--blue-50); color: var(--blue); margin-bottom: 10px; }
      .qz-cargo strong { display: block; font-family: var(--font-display); font-size: 16px; color: var(--ink); line-height: 1.2; }
      .qz-cargo span { font-size: 12.5px; color: var(--muted); }
      .qz-uf { display: inline-flex; gap: 8px; align-items: center; font-weight: 600; font-size: 14px; color: var(--muted); }
      .qz-uf select { border: 1.5px solid var(--line-2); background: #fff; border-radius: 999px; padding: 7px 12px; font-weight: 700; font-size: 15px; color: var(--ink); }
      .qz-painel small { display: block; font-size: 12.5px; color: var(--muted); margin-top: 12px; }
      .qz-passos { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
      @media (max-width: 820px) { .qz-passos { grid-template-columns: 1fr; } }
      .qz-passo { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
      .qz-passo b { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--navy); color: #fff; font-family: var(--font-display); margin-bottom: 12px; }
      .qz-passo h3 { font-size: 17px; margin: 0 0 6px; }
      .qz-passo p { font-size: 14.5px; color: var(--ink-2); margin: 0; }
      .qz-nao { margin-top: 18px; display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
      @media (max-width: 820px) { .qz-nao { grid-template-columns: 1fr; } }
      .qz-nao div { display: grid; grid-template-columns: 22px 1fr; gap: 10px; font-size: 14.5px; color: var(--ink-2); background: var(--blue-50); border-radius: 14px; padding: 14px 16px; }
      .qz-nao svg { color: var(--blue); margin-top: 2px; }
    </style>
    <section class="qz-hero">
      <div class="vc-wrap qz-hero-grid">
        <div>
          <span class="vc-eyebrow">${Icone.bussola(16)} Meu VotoCheck · 2 minutos</span>
          <h1>Diga o que importa <em>pra você</em>. A gente mostra quem tem.</h1>
          <p class="qz-hero-lead">Você escolhe os critérios. O VotoCheck cruza com os dados oficiais e mostra quais candidatos têm essas características, com a fonte de cada uma.</p>
          <div class="qz-selos"><span>Sem ranking</span><span>Sem nota</span><span>Sem cadastro</span><span>Anônimo</span></div>
        </div>
        <form class="qz-painel" method="GET" action="/quiz">
          <div class="qz-painel-topo">
            <b>Para qual voto você quer ajuda?</b>
            <label class="qz-uf">Estado
              <select name="uf" aria-label="Seu estado">
                <option value="">—</option>
                ${UFS.map((u) => `<option value="${u}" ${u === ufOk ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="qz-cargos">${botoes}</div>
          <small>Cada cargo é comparado só com quem disputa o mesmo cargo, no mesmo estado.</small>
        </form>
      </div>
    </section>
    <section class="vc-sec" style="padding:56px 0">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.lampada(16)} Como funciona</span>
        <h2 style="font-size:clamp(24px,3vw,32px);margin:6px 0 20px">Cinco perguntas. Você pode pular qualquer uma.</h2>
        <div class="qz-passos">
          <div class="qz-passo"><b>1</b><h3>Você responde</h3><p>Mandato, idade, patrimônio declarado, troca de partido e papel do Estado. "Tanto faz" tira o critério da conta.</p></div>
          <div class="qz-passo"><b>2</b><h3>A gente cruza</h3><p>Suas respostas são comparadas com o registro oficial de cada candidatura no TSE e com os mandatos na Câmara e no Senado.</p></div>
          <div class="qz-passo"><b>3</b><h3>Você decide</h3><p>A lista sai em ordem alfabética, dividida entre quem combina e quem diverge, com o motivo. Daí é só abrir a ficha e montar a cola.</p></div>
        </div>
        <div class="qz-nao">
          <div>${Icone.semNota(18)}<span><strong>Não é ranking.</strong> Ninguém ganha ponto nem nota.</span></div>
          <div>${Icone.escudoCheck(18)}<span><strong>Não é pesquisa.</strong> Suas respostas não são somadas nem publicadas.</span></div>
          <div>${Icone.check(18)}<span><strong>Não indica voto.</strong> O VotoCheck mostra dados; a escolha é sua.</span></div>
        </div>
      </div>
    </section>
    <script>
      document.querySelectorAll('.qz-cargo').forEach(function(b){ b.addEventListener('click', function(e){
        var uf=document.querySelector('.qz-uf select');
        if(b.dataset.semuf!=='1' && !uf.value){ e.preventDefault(); uf.focus(); uf.style.borderColor='var(--blue)'; uf.style.boxShadow='0 0 0 3px rgba(0,89,245,.2)'; }
      }); });
    </script>`;
}

export function renderQuizEscolhaCargo({ uf = '' } = {}) {
  return pagina({
    titulo: 'Meu VotoCheck — descubra quem tem o que importa pra você | VotoCheck',
    descricao: 'Em 2 minutos, diga o que importa pra você e veja quais candidatos têm essas características. Sem ranking, sem nota, sem cadastro.',
    caminho: '/quiz',
    ogImagem: 'https://votocheck.com.br/og/pagina/quiz.jpg',
    larga: true,
    corpo: renderEscolhaCargo(uf),
  });
}

function cardSimNao(p, indice, total) {
  return `
    <div class="quiz-card" data-slug="${p.slug}" data-tipo="sim_nao">
      <div class="quiz-card-num">${indice} de ${total}</div>
      <p class="quiz-card-texto">${escapeHtml(p.texto)}</p>
      ${p.ajuda ? `<p class="quiz-card-ajuda">${escapeHtml(p.ajuda)}</p>` : ''}
      <div class="quiz-opcoes" role="group">
        ${p.opcoes
          .map((o) => `<button type="button" class="quiz-opcao" data-valor="${escapeHtml(o.valor)}">${escapeHtml(o.label)}</button>`)
          .join('')}
        <button type="button" class="quiz-opcao quiz-opcao--tantofaz" data-valor="tanto_faz">Tanto faz</button>
      </div>
      <input type="hidden" name="${p.slug}" value="" />
    </div>`;
}

function cardTresOpcoes(p, indice, total) {
  return `
    <div class="quiz-card" data-slug="${p.slug}" data-tipo="tres_opcoes">
      <div class="quiz-card-num">${indice} de ${total}</div>
      <p class="quiz-card-texto">${escapeHtml(p.texto)}</p>
      ${p.ajuda ? `<p class="quiz-card-ajuda">${escapeHtml(p.ajuda)}</p>` : ''}
      <div class="quiz-opcoes quiz-opcoes--coluna" role="group">
        ${p.opcoes
          .map((o) => `<button type="button" class="quiz-opcao" data-valor="${escapeHtml(o.valor)}">${escapeHtml(o.label)}</button>`)
          .join('')}
        <button type="button" class="quiz-opcao quiz-opcao--tantofaz" data-valor="tanto_faz">Tanto faz</button>
      </div>
      <input type="hidden" name="${p.slug}" value="" />
    </div>`;
}

function cardEscala(p, indice, total) {
  return `
    <div class="quiz-card" data-slug="${p.slug}" data-tipo="escala">
      <div class="quiz-card-num">${indice} de ${total}</div>
      <p class="quiz-card-texto">${escapeHtml(p.texto)}</p>
      ${p.ajuda ? `<p class="quiz-card-ajuda">${escapeHtml(p.ajuda)}</p>` : ''}
      <div class="quiz-escala-rotulos">
        <span>${escapeHtml(p.extremoEsquerdo)}</span>
        <span>${escapeHtml(p.extremoDireito)}</span>
      </div>
      <input type="range" class="quiz-slider" min="0" max="10" step="1" value="5" data-tocado="false" />
      <p class="quiz-escala-estado">Toque no controle acima pra responder — sem toque, conta como "tanto faz".</p>
      <input type="hidden" name="${p.slug}" value="" />
    </div>`;
}

function cardEspectro(indice, total) {
  const opcao = (letra, titulo, resumo, completo) => `
        <div class="qe-op">
          <div class="qe-op-topo"><b>${letra}</b><strong>${escapeHtml(titulo)}</strong></div>
          <p>${escapeHtml(resumo)}</p>
          <details><summary>Ler a descrição completa</summary><p>${escapeHtml(completo)}</p></details>
        </div>`;
  return `
    <div class="quiz-card quiz-card--espectro" data-slug="${ESPECTRO.slug}" data-tipo="espectro">
      <div class="quiz-card-num">${indice} de ${total}</div>
      <p class="quiz-card-texto">${escapeHtml(ESPECTRO.textoIntro)}</p>
      <div class="qe-ops">
        ${opcao('A', ESPECTRO.tituloA, ESPECTRO.resumoA, ESPECTRO.opcaoA)}
        ${opcao('B', ESPECTRO.tituloB, ESPECTRO.resumoB, ESPECTRO.opcaoB)}
      </div>
      <div class="qe-regua">
        <div class="qe-pontas"><span>A</span><span>B</span></div>
        <input type="range" class="quiz-slider quiz-slider--espectro" min="1" max="5" step="1" value="3" data-tocado="false" aria-label="Nível entre A e B" />
        <div class="qe-niveis">${ESPECTRO.niveis.map((n, i) => `<button type="button" data-nivel="${i + 1}"><b>${i + 1}</b><span>${escapeHtml(n)}</span></button>`).join('')}</div>
      </div>
      <p class="quiz-escala-estado" data-intensidade>Toque num nível de 1 a 5. Sem toque, conta como "tanto faz".</p>
      <p class="quiz-card-ajuda">${escapeHtml(ESPECTRO.aviso)} Conta como aderente quem está no seu nível ou num nível vizinho.</p>
      <input type="hidden" name="${ESPECTRO.slug}" value="" />
    </div>`;
}

function filtroPartidos() {
  const porZona = ZONAS_ESPECTRO.map(() => []);
  for (const p of partidosOrdenados()) {
    porZona[zonaPrincipal(p.familiaIdeologica) - 1].push(p);
  }
  const blocos = porZona
    .map((partidos, i) => {
      if (!partidos.length) return '';
      const chips = partidos
        .map(
          (p) => `
          <label class="quiz-partido-chip">
            <input type="checkbox" name="partido_${escapeHtml(p.sigla)}" value="1" checked />
            ${escapeHtml(p.sigla)}
          </label>`
        )
        .join('');
      return `
        <div class="quiz-partido-bloco" data-bloco>
          <div class="qz-bloco-topo">
            <span class="quiz-partido-bloco-nome">${ZONAS_ESPECTRO[i]}</span>
            <label class="qz-bloco-chave"><span data-bloco-rotulo>Incluído</span><input type="checkbox" data-bloco-chave checked aria-label="Incluir ou excluir todo o bloco ${ZONAS_ESPECTRO[i]}" /></label>
          </div>
          <div class="quiz-partido-chips">${chips}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="quiz-card quiz-card--filtro">
      <div class="quiz-card-num">Último passo</div>
      <p class="quiz-card-texto">Quer excluir algum bloco ou partido específico da sua busca?</p>
      <p class="quiz-card-ajuda">
        Não pontua nem pesa: só tira da lista quem você não quer ver. Use a chave ao lado do bloco
        para excluir o bloco inteiro, ou desmarque partidos um a um. Deixar tudo marcado (ou tudo
        desmarcado) é o mesmo que não filtrar.
      </p>
      <input type="hidden" name="partidos_total" value="${partidosOrdenados().length}" />
      <div class="quiz-partido-blocos">${blocos}</div>
    </div>`;
}

/** Página do quiz em si (cargo+UF já escolhidos). Uma página só, progresso e feedback via JS —
 *  sem JS, ainda dá pra preencher os campos escondidos manualmente (URL) e enviar o form. */
export function renderQuiz({ cargo, uf }) {
  const cargoInfo = cargoQuizPorSlug(cargo);
  const totalPerguntas = PERGUNTAS.length + 1; // + espectro

  const cardsHtml = [
    ...PERGUNTAS.map((p, i) => {
      const indice = i + 1;
      if (p.tipo === 'sim_nao') return cardSimNao(p, indice, totalPerguntas);
      if (p.tipo === 'tres_opcoes') return cardTresOpcoes(p, indice, totalPerguntas);
      if (p.tipo === 'escala') return cardEscala(p, indice, totalPerguntas);
      return '';
    }),
    cardEspectro(totalPerguntas, totalPerguntas),
  ].join('');

  const corpo = `
    <style>
      .qz-ativo .quiz-card, .qz-ativo .qz-final { display: none; }
      .qz-ativo .quiz-card.qz-visivel, .qz-ativo .qz-final.qz-visivel { display: block; animation: vcsobe .3s ease both; }
      .qz-ativo .qz-final .quiz-card { display: block; }
      .qz-nav { display: none; }
      .qz-ativo .qz-nav { display: flex; justify-content: space-between; margin-top: 14px; }
      .quiz-card { opacity: 1 !important; background: #fff; border-radius: 18px; padding: 26px; }
      .quiz-card-texto { font-family: var(--font-display); font-size: clamp(21px, 2.6vw, 26px) !important; line-height: 1.25; color: var(--ink) !important; }
      .quiz-opcao { font-size: 16px !important; padding: 15px 16px !important; border-radius: 14px !important; }
      .quiz-opcao--ativa { background: var(--blue) !important; color: #fff !important; border-color: var(--blue) !important; }
      @media (max-width: 520px) { .quiz-card { padding: 20px 16px; } }
      .qe-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 6px 0 18px; }
      @media (max-width: 560px) { .qe-ops { grid-template-columns: 1fr; } }
      .qe-op { background: var(--paper); border-radius: 14px; padding: 14px 16px; }
      .qe-op-topo { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
      .qe-op-topo b { width: 28px; height: 28px; border-radius: 8px; background: var(--navy); color: #fff; display: grid; place-items: center; font-family: var(--font-display); flex: none; }
      .qe-op-topo strong { font-family: var(--font-display); font-size: 16.5px; color: var(--ink); }
      .qe-op > p { margin: 0; font-size: 14.5px; color: var(--ink-2); line-height: 1.5; }
      .qe-op details { margin-top: 8px; }
      .qe-op summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--blue); }
      .qe-op details p { font-size: 13.5px; color: var(--ink-2); margin: 8px 0 0; line-height: 1.55; }
      .qe-pontas { display: flex; justify-content: space-between; font-family: var(--font-display); font-weight: 800; color: var(--navy); font-size: 15px; padding: 0 2px; }
      .qe-regua .quiz-slider { margin: 4px 0 0; height: 28px; }
      .qe-niveis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 6px; }
      .qe-niveis button { background: #fff; border: 1.5px solid var(--line); border-radius: 10px; padding: 7px 2px; cursor: pointer; font-family: inherit; display: grid; gap: 1px; justify-items: center; }
      .qe-niveis b { font-family: var(--font-display); font-size: 16px; color: var(--ink); }
      .qe-niveis span { font-size: 11px; line-height: 1.2; color: var(--muted); }
      .qe-niveis button.ativo { background: var(--blue); border-color: var(--blue); }
      .qe-niveis button.ativo b, .qe-niveis button.ativo span { color: #fff; }
      .qz-bloco-topo { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
      .qz-bloco-topo .quiz-partido-bloco-nome { margin: 0; }
      .qz-bloco-chave { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
      .qz-bloco-chave input { appearance: none; width: 36px; height: 20px; border-radius: 999px; background: var(--line-2); position: relative; cursor: pointer; transition: background .15s; margin: 0; }
      .qz-bloco-chave input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
      .qz-bloco-chave input:checked { background: var(--teal); }
      .qz-bloco-chave input:checked::after { transform: translateX(16px); }
      .qz-bloco-chave input:indeterminate { background: #8FB0FF; }
      .qz-bloco-chave input:indeterminate::after { transform: translateX(8px); }
    </style>
    <div style="max-width:640px; margin:0 auto;">
      <p style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:4px;">
        Meu VotoCheck · ${escapeHtml(cargoInfo ? cargoInfo.nome : cargo)}${cargoInfo && !cargoInfo.semUf ? ` · ${escapeHtml(uf)}` : ''}
        · <a href="/quiz" style="color:var(--text-muted);">trocar</a>
      </p>
      <div class="quiz-aviso-topo">Só as perguntas que você responder entram no seu resultado. Pode pular.</div>
      <div class="quiz-progresso-wrap"><div class="quiz-progresso-barra" id="quiz-progresso" style="width:0%"></div></div>
      <p id="quiz-progresso-legenda" class="quiz-progresso-legenda">0 de ${totalPerguntas} perguntas respondidas</p>

      <form method="GET" action="/quiz/resultado" id="quiz-form">
        <input type="hidden" name="cargo" value="${escapeHtml(cargo)}" />
        ${cargoInfo && !cargoInfo.semUf ? `<input type="hidden" name="uf" value="${escapeHtml(uf)}" />` : ''}
        <div class="quiz-cards">${cardsHtml}</div>
        <div class="qz-final">
          <div class="quiz-card quiz-card--filtro">
            <div class="quiz-card-num">Filtro opcional</div>
            <label style="display:flex;gap:12px;align-items:center;font-size:16px;font-weight:600;cursor:pointer">
              <input type="checkbox" name="formacao_superior" value="sim" style="width:22px;height:22px" />
              Mostrar só quem tem ensino superior completo
            </label>
            <p class="quiz-card-ajuda" style="margin-top:8px">Pela escolaridade declarada ao TSE. Deixe desmarcado para não filtrar.</p>
          </div>
          ${filtroPartidos()}
          <button type="submit" class="vc-btn vc-btn--pri" style="width:100%; margin-top:16px;">Ver meu resultado</button>
        </div>
        <div class="qz-nav">
          <button type="button" class="vc-btn vc-btn--sec vc-btn--sm" id="qz-voltar">← Voltar</button>
          <button type="button" class="vc-btn vc-btn--sec vc-btn--sm" id="qz-pular">Pular →</button>
        </div>
      </form>
    </div>
    <script>
      (function () {
        var form = document.getElementById('quiz-form');
        var cards = Array.prototype.slice.call(form.querySelectorAll('.quiz-card[data-slug]'));
        var progresso = document.getElementById('quiz-progresso');
        var legenda = document.getElementById('quiz-progresso-legenda');

        function atualizarProgresso() {
          var respondidas = cards.filter(function (c) { return c.classList.contains('quiz-respondida'); }).length;
          progresso.style.width = (respondidas / cards.length * 100) + '%';
          if (legenda) {
            var texto = respondidas + ' de ' + cards.length + ' perguntas respondidas';
            if (respondidas === 0) texto += ' — cada uma que você responder deixa o resultado mais preciso';
            else if (respondidas < cards.length) texto += ' — quanto mais, mais preciso o resultado';
            else texto += ' — pronto pra ver o resultado';
            legenda.textContent = texto;
          }
        }

        cards.forEach(function (card) {
          var tipo = card.getAttribute('data-tipo');
          var hidden = card.querySelector('input[type=hidden]');

          if (tipo === 'sim_nao' || tipo === 'tres_opcoes') {
            var botoes = Array.prototype.slice.call(card.querySelectorAll('.quiz-opcao'));
            botoes.forEach(function (btn) {
              btn.addEventListener('click', function () {
                botoes.forEach(function (b) { b.classList.remove('quiz-opcao--ativa'); });
                btn.classList.add('quiz-opcao--ativa');
                var tantoFaz = btn.getAttribute('data-valor') === 'tanto_faz';
                hidden.value = tantoFaz ? '' : btn.getAttribute('data-valor');
                card.classList.toggle('quiz-respondida', !tantoFaz);
                card.classList.remove('quiz-card--apagada');
                atualizarProgresso();
              });
            });
          }

          if (tipo === 'escala' || tipo === 'espectro') {
            var slider = card.querySelector('.quiz-slider');
            card.querySelectorAll('[data-nivel]').forEach(function (b) {
              b.addEventListener('click', function () { slider.value = b.dataset.nivel; slider.dispatchEvent(new Event('input')); });
            });
            var estado = card.querySelector('[data-intensidade], .quiz-escala-estado');
            slider.addEventListener('input', function () {
              if (slider.getAttribute('data-tocado') !== 'true') {
                slider.setAttribute('data-tocado', 'true');
                card.classList.add('quiz-respondida');
                card.classList.remove('quiz-card--apagada');
              }
              hidden.value = slider.value;
              if (tipo === 'espectro') {
                var n = Math.round(parseFloat(slider.value));
                var nomes = ${JSON.stringify(ESPECTRO.niveis)};
                var viz = [n - 1, n, n + 1].filter(function (x) { return x >= 1 && x <= 5; });
                estado.innerHTML = '<strong>Nível ' + n + ' de 5: ' + nomes[n - 1] + '.</strong> Aderentes: níveis ' + viz.join(', ').replace(/, (\\d)$/, ' e $1') + '.';
                card.querySelectorAll('[data-nivel]').forEach(function (b) { b.classList.toggle('ativo', +b.dataset.nivel === n); });
              } else {
                estado.textContent = 'Resposta registrada.';
              }
              atualizarProgresso();
            });
          }
        });

        // v2 (26/09/2026, D07): uma pergunta por tela. Sem JS, tudo aparece junto (fallback).
        var passos = cards.concat([form.querySelector('.qz-final')]);
        var atual = 0;
        var nav = form.querySelector('.qz-nav');
        form.classList.add('qz-ativo');
        function mostrar(i) {
          atual = Math.max(0, Math.min(passos.length - 1, i));
          passos.forEach(function (p, k) { p.classList.toggle('qz-visivel', k === atual); });
          document.getElementById('qz-voltar').style.visibility = atual === 0 ? 'hidden' : 'visible';
          document.getElementById('qz-pular').style.display = atual === passos.length - 1 ? 'none' : '';
          var topo = form.getBoundingClientRect().top + window.scrollY - 90;
          if (window.scrollY > topo) window.scrollTo({ top: topo, behavior: 'smooth' });
        }
        document.getElementById('qz-voltar').addEventListener('click', function () { mostrar(atual - 1); });
        document.getElementById('qz-pular').addEventListener('click', function () { mostrar(atual + 1); });
        cards.forEach(function (card, idx) {
          card.querySelectorAll('.quiz-opcao').forEach(function (b) {
            b.addEventListener('click', function () { setTimeout(function () { if (atual === idx) mostrar(idx + 1); }, 280); });
          });
          var sl = card.querySelector('.quiz-slider');
          if (sl) {
            var ok = document.createElement('button'); ok.type = 'button'; ok.className = 'vc-btn vc-btn--pri vc-btn--sm'; ok.style.marginTop = '12px'; ok.textContent = 'Continuar →';
            ok.addEventListener('click', function () { mostrar(idx + 1); }); card.appendChild(ok);
          }
        });
        window.vcEv && vcEv('quiz_inicio', '${escapeHtml(cargo)}');
        form.addEventListener('submit', function () { window.vcEv && vcEv('quiz_fim', '${escapeHtml(cargo)}'); });
        document.querySelectorAll('[data-bloco]').forEach(function (bl) {
          var chave = bl.querySelector('[data-bloco-chave]'), rot = bl.querySelector('[data-bloco-rotulo]');
          var itens = bl.querySelectorAll('.quiz-partido-chip input');
          function sync() {
            var n = 0; itens.forEach(function (i) { if (i.checked) n++; });
            chave.checked = n === itens.length; chave.indeterminate = n > 0 && n < itens.length;
            rot.textContent = n === itens.length ? 'Incluído' : n === 0 ? 'Excluído' : 'Parcial';
          }
          chave.addEventListener('change', function () { itens.forEach(function (i) { i.checked = chave.checked; }); sync(); });
          itens.forEach(function (i) { i.addEventListener('change', sync); });
          sync();
        });
        mostrar(0);
      })();
    </script>`;

  return pagina({
    titulo: 'Meu VotoCheck — responda e encontre candidatos — VotoCheck',
    descricao: 'Declare suas preferências e encontre candidatos com essas características, sem ranking.',
    caminho: `/quiz?cargo=${encodeURIComponent(cargo)}${uf ? `&uf=${encodeURIComponent(uf)}` : ''}`,
    noindex: true,
    corpo,
  });
}

// ============================================================
// Resultado (redesenho 26/09/2026 — mesmo padrão visual da busca)
// ============================================================

function cardCandidato(c, tagsDivergencia) {
  const idade = calcularIdade(c.data_nascimento);
  const nome = nomeProprio(c.nome_urna_atual || '');
  const slot = SLOT_COLA[c.cargo_slug];
  const busca = `${nome} ${c.numero_urna || ''} ${c.partido_sigla || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return `
    <div class="bx-card qr-item" data-busca="${escapeHtml(busca)}">
      <a class="bx-foto" href="/candidato/${c.pessoa_id}" tabindex="-1" aria-hidden="true"${c.foto_url ? '' : ' title="Foto oficial ainda não carregada"'}>${c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : escapeHtml(nome.slice(0, 1))}</a>
      <div class="bx-info">
        <a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>
        <div class="bx-meta">${escapeHtml(c.partido_sigla || 'sem partido')}${c.sg_uf && c.sg_uf !== 'BR' ? ` · ${escapeHtml(c.sg_uf)}` : ''}${idade ? ` · ${idade} anos` : ''}</div>
        ${tagsDivergencia && tagsDivergencia.length ? `<div class="qr-tags">${tagsDivergencia.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="bx-dir">
        ${c.numero_urna ? `<span class="bx-num">${escapeHtml(c.numero_urna)}</span>` : ''}
        ${slot && c.numero_urna ? `<button type="button" class="bx-cola" data-cola-add data-slot="${slot}" data-cargo="${escapeHtml(c.cargo_slug)}" data-nome="${escapeHtml(nome)}" data-numero="${escapeHtml(c.numero_urna)}" data-partido="${escapeHtml(c.partido_sigla || '')}" aria-label="Adicionar ${escapeHtml(nome)} à cola">+ cola</button>` : ''}
      </div>
    </div>`;
}

const RUBRICA_PERGUNTA = Object.fromEntries([...PERGUNTAS, ESPECTRO].map((p) => [p.slug, p.textoResumo || p.texto]));
// Rótulos curtos pra usar nas tags "diverge em: ..." — mais legível que repetir a pergunta inteira.
const RUBRICA_CURTA = {
  divida_ativa_uniao_confirmada: 'dívida ativa',
  ja_ocupou_cargo: 'mandato no Congresso',
  alinhamento_bancada: 'alinhamento com a bancada',
  trocou_de_partido: 'troca de partido',
  declarou_bens: 'declaração de bens',
  formacao_superior: 'formação superior',
  espectro_estado_mercado: 'papel do Estado',
  faixa_idade: 'faixa de idade',
  patrimonio: 'patrimônio declarado',
};

const LOTE = 40;

const ESTILO_RESULTADO = `
  .qr-topo { background: var(--navy); color: #fff; padding: 34px 0 30px; }
  .qr-topo .vc-eyebrow { color: #8FB0FF; }
  .qr-topo h1 { color: #fff; font-size: clamp(26px, 3.6vw, 40px); line-height: 1.12; margin: 6px 0 12px; max-width: 820px; letter-spacing: -.02em; }
  .qr-topo h1 em { font-style: normal; color: #5FE3C8; }
  .qr-topo p { color: #C3CDF0; margin: 0; max-width: 720px; font-size: 16px; }
  .qr-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
  .qr-links a { font-size: 14px; font-weight: 600; color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; padding: 8px 14px; }
  .qr-links a:hover { background: rgba(255,255,255,.08); }
  .qr-kpis { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin-top: 22px; max-width: 640px; }
  .qr-kpis div { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 12px 14px; }
  .qr-kpis b { display: block; font-family: var(--font-display); font-size: 26px; color: #fff; font-variant-numeric: tabular-nums; }
  .qr-kpis span { font-size: 12.5px; color: #AEB9E0; }
  .qr-corpo { padding: 28px 0 56px; }
  .qr-grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 28px; align-items: start; }
  @media (max-width: 980px) { .qr-grid { grid-template-columns: 1fr; } .qr-lado { order: -1; } }
  .qr-lado { position: sticky; top: 88px; display: grid; gap: 14px; }
  @media (max-width: 980px) { .qr-lado { position: static; } .qr-nota { display: none; } }
  .qr-perfil { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px; }
  .qr-perfil h2 { font-size: 17px; margin: 0 0 4px; }
  .qr-perfil > p { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
  .qr-perfil ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .qr-perfil li { display: grid; grid-template-columns: 20px 1fr; gap: 8px; font-size: 14px; color: var(--ink-2); align-items: start; }
  .qr-perfil li svg { color: var(--teal); margin-top: 2px; }
  .qr-acoes { display: grid; gap: 8px; margin-top: 16px; }
  .qr-acoes small { font-size: 12px; color: var(--muted); }
  .qr-nota { background: var(--blue-50); border-radius: 14px; padding: 14px 16px; font-size: 13px; color: var(--ink-2); }
  .qr-sec-titulo { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin: 0 0 12px; }
  .qr-sec-titulo h2 { font-size: 20px; margin: 0; }
  .qr-sec-titulo span { font-size: 13.5px; color: var(--muted); }
  .qr-filtro { width: 100%; padding: 12px 14px; border: 1.5px solid var(--line-2); border-radius: 12px; font-size: 15px; margin-bottom: 16px; background: #fff; }
  .qr-filtro:focus { outline: none; border-color: var(--blue); }
  .qr-sec + .qr-sec { margin-top: 36px; }
  .qr-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px; }
  .qr-tags span { font-size: 11.5px; font-weight: 600; color: #8A4B12; background: #FFF3E3; border-radius: 999px; padding: 2px 8px; }
  .qr-tags span::before { content: '≠ '; }
  .qr-oculto { display: none !important; }
  .qr-mais { display: block; margin: 14px auto 0; }
  .qr-vazio { background: #fff; border: 1px dashed var(--line-2); border-radius: 14px; padding: 22px; color: var(--muted); font-size: 14.5px; }
  .qr-vazio strong { color: var(--ink); }
`;

function listaCandidatos(itens, idLista, comTags) {
  if (!itens.length) return '';
  const cards = itens.map((it, i) => {
    const html = comTags ? cardCandidato(it.candidato, it.tags) : cardCandidato(it, []);
    return i >= LOTE ? html.replace('class="bx-card qr-item"', 'class="bx-card qr-item qr-oculto" data-lote') : html;
  });
  return `
    <div class="bx-grid" id="${idLista}">${cards.join('')}</div>
    ${itens.length > LOTE ? `<button type="button" class="vc-btn vc-btn--sec qr-mais" data-mais="${idLista}">Mostrar mais ${Math.min(LOTE, itens.length - LOTE)} de ${itens.length - LOTE} restantes</button>` : ''}`;
}

function renderPerfilEleitor(respostasLegiveis, voltarQuery) {
  const textoConvite = 'Fiz o Meu VotoCheck: em 2 minutos você diz o que importa pra você e vê quais candidatos têm essas características. Sem ranking, com fonte oficial.';
  return `
    <div class="qr-perfil">
      <h2>Seu perfil de eleitor</h2>
      <p>O que você disse que importa nesta rodada. Não é nota de ninguém: é o resumo das suas respostas.</p>
      ${respostasLegiveis.length
        ? `<ul>${respostasLegiveis.map((r) => `<li>${Icone.checkCirculo(16)}<span>${escapeHtml(r)}</span></li>`).join('')}</ul>`
        : `<p style="font-size:14px;color:var(--ink-2);margin:0">Você pulou todas as perguntas. <a href="/quiz?${escapeHtml(voltarQuery)}">Responder agora</a> filtra a lista.</p>`}
      <div class="qr-acoes">
        <a class="vc-btn vc-btn--pri" href="/cola">${Icone.impressora(18)} Montar minha cola</a>
        <a class="vc-btn vc-btn--sec" href="${linkWhatsApp(textoConvite, 'https://votocheck.com.br/quiz')}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(textoConvite)}" data-share-url="https://votocheck.com.br/quiz" data-ev="quiz_compartilhar">${Icone.compartilhar(18)} Convidar alguém a fazer</a>
        <small>O convite leva só o link do quiz, nunca suas respostas ou candidatos.</small>
      </div>
    </div>`;
}

export function renderQuizResultado({
  cargo,
  uf,
  cargoNome,
  totalPerguntasRespondidas,
  combinam,
  naoBateram,
  totalCandidatos,
  respostasLegiveis,
  voltarQuery,
}) {
  const semNenhumaResposta = totalPerguntasRespondidas === 0;
  const local = uf ? ` em ${escapeHtml(UF_NOMES[uf] || uf)}` : ' no Brasil';
  const cargoMin = escapeHtml(String(cargoNome || '').toLowerCase());
  const nComb = combinam.length;

  const titulo = semNenhumaResposta
    ? `Todos os ${totalCandidatos} candidatos a ${cargoMin}${local}`
    : nComb === 0
      ? `Ninguém a ${cargoMin}${local} bate com tudo o que você pediu`
      : `<em>${nComb}</em> ${nComb === 1 ? 'candidato' : 'candidatos'} a ${cargoMin}${local} ${nComb === 1 ? 'combina' : 'combinam'} com o que você disse`;

  const sub = semNenhumaResposta
    ? 'Você não respondeu nenhuma pergunta, então a lista está completa, em ordem alfabética.'
    : `Comparamos suas ${totalPerguntasRespondidas} ${totalPerguntasRespondidas === 1 ? 'resposta' : 'respostas'} com os dados oficiais de ${totalCandidatos} candidaturas. A ordem é sempre alfabética: não é ranking.`;

  const secaoCombinam = semNenhumaResposta
    ? `<section class="qr-sec">${listaCandidatos(combinam, 'qr-l1', false)}</section>`
    : `<section class="qr-sec">
        <div class="qr-sec-titulo"><h2>Combinam com você</h2><span>${nComb} de ${totalCandidatos}</span></div>
        ${nComb
          ? listaCandidatos(combinam, 'qr-l1', false)
          : `<div class="qr-vazio"><strong>Nenhum candidato bateu com todos os critérios.</strong><br>Veja abaixo onde cada um diverge, ou <a href="/quiz?${escapeHtml(voltarQuery)}">afrouxe alguma resposta</a> (marcar "tanto faz" tira o critério).</div>`}
      </section>
      <section class="qr-sec">
        <div class="qr-sec-titulo"><h2>Divergem em algum ponto</h2><span>${naoBateram.length} candidatos · a etiqueta mostra onde</span></div>
        ${naoBateram.length
          ? listaCandidatos(naoBateram, 'qr-l2', true)
          : '<div class="qr-vazio">Ninguém neste recorte divergiu de nenhuma resposta sua.</div>'}
      </section>`;

  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_RESULTADO}</style>
    <section class="qr-topo">
      <div class="vc-wrap">
        <span class="vc-eyebrow">${Icone.bussola(16)} Meu VotoCheck · resultado</span>
        <h1>${titulo}</h1>
        <p>${sub}</p>
        ${semNenhumaResposta ? '' : `<div class="qr-kpis">
          <div><b>${nComb}</b><span>combinam</span></div>
          <div><b>${naoBateram.length}</b><span>divergem em algo</span></div>
          <div><b>${totalCandidatos}</b><span>no recorte</span></div>
        </div>`}
        <div class="qr-links">
          <a href="/quiz?${escapeHtml(voltarQuery)}">← Ajustar respostas</a>
          <a href="/quiz">Trocar de cargo</a>
          <a href="/buscar?cargo=${escapeHtml(cargo)}${uf ? `&uf=${escapeHtml(uf)}` : ''}">Ver lista completa</a>
        </div>
      </div>
    </section>
    <section class="qr-corpo">
      <div class="vc-wrap qr-grid">
        <div>
          <input class="qr-filtro" type="search" placeholder="Filtrar esta lista por nome, número ou partido" aria-label="Filtrar lista" data-qr-filtro>
          ${secaoCombinam}
          <div style="margin-top:32px">${renderPublicidade('A4', cargo + uf)}</div>
        </div>
        <aside class="qr-lado">
          ${renderPerfilEleitor(respostasLegiveis, voltarQuery)}
          <div class="qr-nota">${Icone.escudoCheck(16)} <strong>Como ler:</strong> "combina" e "diverge" falam só dos critérios que você escolheu responder. Dado ausente na fonte oficial nunca conta contra o candidato. Abra a ficha para ver a fonte de cada informação.</div>
        </aside>
      </div>
      <div class="vc-wrap" style="margin-top:28px">${renderCtaApoio({ contexto: 'quiz' })}</div>
    </section>
    <script>
    (function(){
      document.querySelectorAll('[data-mais]').forEach(function(b){
        b.addEventListener('click',function(){
          var ocultos=document.querySelectorAll('#'+b.dataset.mais+' [data-lote].qr-oculto');
          for(var i=0;i<${LOTE}&&i<ocultos.length;i++){ocultos[i].classList.remove('qr-oculto');ocultos[i].removeAttribute('data-lote');}
          var resta=ocultos.length-${LOTE};
          if(resta<=0)b.remove();else b.textContent='Mostrar mais '+Math.min(${LOTE},resta)+' de '+resta+' restantes';
        });
      });
      var f=document.querySelector('[data-qr-filtro]');
      if(f)f.addEventListener('input',function(){
        var t=f.value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
        document.querySelectorAll('.qr-item').forEach(function(el){
          if(!t){el.style.display='';return;}
          el.style.display=el.dataset.busca.indexOf(t)>=0?'grid':'none';
        });
        document.querySelectorAll('.qr-mais').forEach(function(b){b.style.display=t?'none':'';});
      });
    })();
    </script>`;

  return pagina({
    titulo: `Meu VotoCheck — resultado — VotoCheck`,
    descricao: 'Candidatos que combinam com as suas respostas no Meu VotoCheck, sem ranking.',
    caminho: `/quiz/resultado`,
    noindex: true,
    larga: true,
    corpo,
  });
}

export { PERGUNTAS, ESPECTRO, RUBRICA_CURTA };
