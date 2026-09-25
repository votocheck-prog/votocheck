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
import { PERGUNTAS, ESPECTRO, ZONAS_ESPECTRO, partidosOrdenados, zonaPrincipal } from './quiz_config.js';
import { Icone } from './icones.js';
import { renderCtaApoio } from './jornada_html.js';

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

/** Passo 0 — escolher cargo (e UF, quando aplicável) antes de começar o quiz. Presidente não
 *  pede UF (candidatura nacional, sg_uf = 'BR'). */
function renderEscolhaCargo() {
  const opcoesCargo = CARGOS_QUIZ.map((c) => `<option value="${c.slug}">${escapeHtml(c.nome)}</option>`).join('');
  const opcoesUf = UFS.map((u) => `<option value="${u}">${u}</option>`).join('');
  return `
    <div style="max-width:560px; margin:0 auto; text-align:center;">
      <div class="pilar-icone" style="margin:0 auto 16px;">${Icone.bussola(24)}</div>
      <h1 style="font-size:clamp(24px,4vw,32px); margin-bottom:10px;">Meu VotoCheck</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:28px;">
        Declare o que importa pra você e encontre candidatos que apresentam essas características —
        sem ranking, sem nota, sem o VotoCheck escolher por você. Comece escolhendo o cargo (e o
        estado, quando fizer sentido) que você quer decidir.
      </p>
      <form method="GET" action="/quiz" class="card" style="text-align:left;">
        <label for="quiz-cargo" style="display:block; font-size:13px; color:var(--text-muted); margin-bottom:6px;">Cargo</label>
        <select id="quiz-cargo" name="cargo" required style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:14px;">
          <option value="" disabled selected>Escolha um cargo…</option>
          ${opcoesCargo}
        </select>
        <div id="quiz-uf-wrap">
          <label for="quiz-uf" style="display:block; font-size:13px; color:var(--text-muted); margin-bottom:6px;">Estado (UF)</label>
          <select id="quiz-uf" name="uf" style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:14px;">
            <option value="" disabled selected>Escolha um estado…</option>
            ${opcoesUf}
          </select>
        </div>
        <button type="submit" style="width:100%; padding:13px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
          Começar
        </button>
      </form>
      <p style="font-size:12.5px; color:var(--text-muted); margin-top:16px;">
        As recomendações comparam só candidatos do mesmo cargo (e estado, quando aplicável) —
        vota-se para cargos diferentes com regras e realidades bem diferentes entre si.
      </p>
    </div>
    <script>
      (function () {
        var cargoSel = document.getElementById('quiz-cargo');
        var ufWrap = document.getElementById('quiz-uf-wrap');
        var ufSel = document.getElementById('quiz-uf');
        var semUf = ${JSON.stringify(CARGOS_QUIZ.filter((c) => c.semUf).map((c) => c.slug))};
        function atualizar() {
          var escondeUf = semUf.indexOf(cargoSel.value) !== -1;
          ufWrap.style.display = escondeUf ? 'none' : 'block';
          ufSel.required = !escondeUf;
        }
        cargoSel.addEventListener('change', atualizar);
        atualizar();
      })();
    </script>`;
}

export function renderQuizEscolhaCargo() {
  return pagina({
    titulo: 'Meu VotoCheck — VotoCheck',
    descricao: 'Declare suas preferências e encontre candidatos com essas características — sem ranking, sem nota.',
    caminho: '/quiz',
    corpo: renderEscolhaCargo(),
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
  return `
    <div class="quiz-card quiz-card--espectro" data-slug="${ESPECTRO.slug}" data-tipo="espectro">
      <div class="quiz-card-num">${indice} de ${total}</div>
      <p class="quiz-card-texto">${escapeHtml(ESPECTRO.textoIntro)}</p>
      <div class="quiz-espectro-opcoes">
        <div class="quiz-espectro-opcao"><strong>A</strong><span>${escapeHtml(ESPECTRO.opcaoA)}</span></div>
        <div class="quiz-espectro-opcao"><strong>B</strong><span>${escapeHtml(ESPECTRO.opcaoB)}</span></div>
      </div>
      <input type="range" class="quiz-slider quiz-slider--espectro" min="1" max="5" step="0.1" value="3" data-tocado="false" />
      <p class="quiz-escala-estado" data-intensidade>Arraste pro lado que mais combina com o que você pensa — sem toque, conta como "tanto faz".</p>
      <p class="quiz-card-ajuda">${escapeHtml(ESPECTRO.aviso)}</p>
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
        <div class="quiz-partido-bloco">
          <span class="quiz-partido-bloco-nome">${ZONAS_ESPECTRO[i]}</span>
          <div class="quiz-partido-chips">${chips}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="quiz-card quiz-card--filtro">
      <div class="quiz-card-num">Último passo</div>
      <p class="quiz-card-texto">Quer excluir algum bloco ou partido específico da sua busca?</p>
      <p class="quiz-card-ajuda">
        Isso não pontua nem pesa na recomendação — só inclui ou exclui quem aparece no resultado.
        Todos começam marcados (inclusos); desmarque quem você não quer ver. Deixar tudo marcado
        (ou desmarcado) tem o mesmo efeito de não filtrar por partido.
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
    <div style="max-width:640px; margin:0 auto;">
      <p style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:4px;">
        Meu VotoCheck · ${escapeHtml(cargoInfo ? cargoInfo.nome : cargo)}${cargoInfo && !cargoInfo.semUf ? ` · ${escapeHtml(uf)}` : ''}
        · <a href="/quiz" style="color:var(--text-muted);">trocar</a>
      </p>
      <div class="quiz-aviso-topo">Só as perguntas que você responder entram na sua recomendação.</div>
      <div class="quiz-progresso-wrap"><div class="quiz-progresso-barra" id="quiz-progresso" style="width:0%"></div></div>
      <p id="quiz-progresso-legenda" class="quiz-progresso-legenda">0 de ${totalPerguntas} perguntas respondidas</p>

      <form method="GET" action="/quiz/resultado" id="quiz-form">
        <input type="hidden" name="cargo" value="${escapeHtml(cargo)}" />
        ${cargoInfo && !cargoInfo.semUf ? `<input type="hidden" name="uf" value="${escapeHtml(uf)}" />` : ''}
        <div class="quiz-cards">${cardsHtml}</div>
        ${filtroPartidos()}
        <button type="submit" style="width:100%; margin-top:20px; padding:15px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:600; font-size:16px; cursor:pointer;">
          Ver resultado
        </button>
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
            if (respondidas === 0) texto += ' — cada uma que você responder deixa a recomendação mais precisa';
            else if (respondidas < cards.length) texto += ' — quanto mais, melhor sua recomendação';
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
            var estado = card.querySelector('[data-intensidade], .quiz-escala-estado');
            slider.addEventListener('input', function () {
              if (slider.getAttribute('data-tocado') !== 'true') {
                slider.setAttribute('data-tocado', 'true');
                card.classList.add('quiz-respondida');
                card.classList.remove('quiz-card--apagada');
              }
              hidden.value = slider.value;
              if (tipo === 'espectro') {
                var v = parseFloat(slider.value);
                var texto = v <= 1.6 ? 'Bem próximo da opção A'
                  : v <= 2.6 ? 'Mais pra opção A'
                  : v < 3.4 ? 'Bem no meio-termo'
                  : v < 4.4 ? 'Mais pra opção B'
                  : 'Bem próximo da opção B';
                estado.textContent = texto;
              } else {
                estado.textContent = 'Resposta registrada.';
              }
              atualizarProgresso();
            });
          }
        });

        // Estado inicial: todos os cards começam "apagados" (não respondidos) — feedback visual
        // imediato de gamificação (card muda de apagado pra ativo ao ser respondido).
        cards.forEach(function (c) { c.classList.add('quiz-card--apagada'); });
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
// Resultado
// ============================================================

function linhaCandidato(c, tagsDivergencia) {
  const idadeTexto = c.data_nascimento ? '' : ''; // idade não é central aqui, mantém a linha enxuta
  return `
    <a href="/candidato/${c.pessoa_id}" class="quiz-resultado-linha">
      <div class="quiz-resultado-avatar">
        ${c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" />` : escapeHtml((c.nome_urna_atual || '?').slice(0, 1))}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600;">${escapeHtml(c.nome_urna_atual)}</div>
        <div style="font-size:13px; color:var(--text-muted);">
          ${escapeHtml(c.cargo_nome)}${c.sg_uf && c.sg_uf !== 'BR' ? ` · ${escapeHtml(c.sg_uf)}` : ''}${c.partido_sigla ? ` · ${escapeHtml(c.partido_sigla)}` : ''}
        </div>
        ${tagsDivergencia && tagsDivergencia.length ? `<div class="quiz-resultado-diverge">Diverge em: ${escapeHtml(tagsDivergencia.join(', '))}</div>` : ''}
      </div>
    </a>`;
}

const RUBRICA_PERGUNTA = Object.fromEntries([...PERGUNTAS, ESPECTRO].map((p) => [p.slug, p.textoResumo || p.texto]));
// Rótulos curtos pra usar nas tags "diverge em: ..." — mais legível que repetir a pergunta inteira.
const RUBRICA_CURTA = {
  divida_ativa_uniao_confirmada: 'dívida ativa',
  ja_ocupou_cargo: 'já ocupou o cargo',
  alinhamento_bancada: 'alinhamento com a bancada',
  trocou_de_partido: 'troca de partido',
  declarou_bens: 'declaração de bens',
  formacao_superior: 'formação superior',
  espectro_estado_mercado: 'papel do Estado',
};

/** "Seu perfil de eleitor" — resumo das respostas do próprio usuário, nunca uma pontuação de
 *  candidato (ver doc, seção Gamificação: "o jogo é em cima da jornada do usuário"). */
function renderPerfilEleitor(respostasLegiveis) {
  if (!respostasLegiveis.length) return '';
  return `
    <div class="card quiz-perfil-eleitor">
      <strong style="font-size:14px;">Seu perfil de eleitor</strong>
      <p style="font-size:13px; color:var(--text-muted); margin:6px 0 10px;">O que você valorizou nesta rodada — não é uma pontuação, é um resumo das suas próprias respostas.</p>
      <ul style="margin:0; padding-left:18px; font-size:13.5px;">
        ${respostasLegiveis.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
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

  const corpo = `
    <div style="max-width:640px; margin:0 auto;">
      <p style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:8px;">
        <a href="/quiz?${escapeHtml(voltarQuery)}" style="color:var(--text-muted);">← Ajustar respostas</a>
      </p>
      <h1 style="font-size:24px; text-align:center; margin-bottom:6px;">
        Resultado — ${escapeHtml(cargoNome)}${uf ? ` · ${escapeHtml(uf)}` : ''}
      </h1>
      <p style="text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:28px;">
        ${semNenhumaResposta
          ? 'Você não respondeu nenhuma pergunta ainda — aqui está a lista completa, em ordem alfabética.'
          : `Comparado com ${totalPerguntasRespondidas} pergunta(s) que você respondeu, entre ${totalCandidatos} candidatura(s) nesse recorte.`}
      </p>

      ${renderPerfilEleitor(respostasLegiveis)}

      ${!semNenhumaResposta ? `
        <h2 style="font-size:16px; margin:28px 0 12px;">Combinam com você (${combinam.length})</h2>
        ${combinam.length
          ? combinam.map((c) => linhaCandidato(c, [])).join('')
          : '<p style="color:var(--text-muted); font-size:13.5px;">Ninguém bateu com todos os critérios que você respondeu neste recorte — veja abaixo quem chegou mais perto.</p>'}

        <h2 style="font-size:16px; margin:28px 0 12px;">Não bateram em tudo — veja onde divergem (${naoBateram.length})</h2>
        ${naoBateram.length
          ? naoBateram.map((c) => linhaCandidato(c.candidato, c.tags)).join('')
          : '<p style="color:var(--text-muted); font-size:13.5px;">Ninguém neste recorte divergiu de nenhuma resposta sua.</p>'}
      ` : `
        <div>${(combinam || []).map((c) => linhaCandidato(c, [])).join('')}</div>
      `}

      <p style="font-size:12px; color:var(--text-muted); text-align:center; margin-top:28px;">
        Esta lista nunca é um ranking — a ordem é sempre alfabética. "Combina"/"diverge" descreve só
        os critérios que você escolheu responder, não uma nota do candidato.
      </p>

      ${renderCtaApoio({ contexto: 'quiz' })}
    </div>`;

  return pagina({
    titulo: `Meu VotoCheck — resultado — VotoCheck`,
    descricao: 'Candidatos que combinam com as suas respostas no Meu VotoCheck, sem ranking.',
    caminho: `/quiz/resultado`,
    noindex: true,
    corpo,
  });
}

export { PERGUNTAS, ESPECTRO, RUBRICA_CURTA };
