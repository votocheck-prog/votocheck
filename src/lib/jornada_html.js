/**
 * VotoCheck — "Definição" (o que é, como funciona), "Obtenção de dados" e
 * "Monitoramento e Cobrança" da homepage.
 *
 * Cada palavra do lema ("Conheça. Confira. Entenda. Decida.") vira uma etapa do processo,
 * mais duas etapas novas (Monitore. Cobre.) que ainda não têm produto por trás — só a
 * explicação do que vem a seguir. Ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 18,
 * para o item de roadmap completo (captura de e-mail, tabela D1, envio mensal automatizado).
 *
 * Regra de honestidade de marca: nunca descrever como pronto algo que ainda não existe.
 * MONITORE/COBRE são marcados como "em construção" explicitamente — não é uma feature
 * escondida atrás de um botão que não funciona, é uma etapa do processo anunciada com prazo
 * em aberto.
 */
import { Icone } from './icones.js';

const ETAPAS = [
  {
    icone: Icone.bussola,
    titulo: 'Conheça',
    texto:
      'Descubra quais Representantes Públicos — mandatos em exercício ou candidaturas — têm histórico e propostas alinhados ao que você valoriza. Busque por nome, cargo, estado ou direto no mapa.',
  },
  {
    icone: Icone.documento,
    titulo: 'Confira',
    texto:
      'Reunimos o que está disponível nas fontes públicas oficiais (TSE, Câmara dos Deputados, Senado Federal): votações, presença, propostas e, quando houve mandato anterior, o desempenho registrado. Quando uma informação não está disponível, isso fica marcado como pendente — nunca preenchido com suposição.',
  },
  {
    icone: Icone.lampada,
    titulo: 'Entenda',
    texto:
      'Colocamos em contexto o que é relevante na atuação de cada um: votos em pautas importantes, presença, coerência entre discurso e ação.',
    detalheResumo: 'Saiba mais: perguntas essenciais antes de decidir',
    perguntas: [
      'O que essa pessoa já entregou (se teve mandato) ou já fez antes (se é a primeira candidatura)?',
      'As propostas atuais são compatíveis com o histórico de votos e falas já registrado?',
      'Que interesses, alianças ou apoios podem influenciar as decisões dela no cargo?',
      'O que ela faria diferente diante dos principais problemas do seu estado ou país — e como isso poderá ser cobrado depois?',
      'Como ela se posiciona sobre temas polêmicos (aborto, redução da maioridade penal, ideologia de gênero, entre outros)? Isso está alinhado com o que você pensa?',
      'Qual é o partido e a coligação dela? Quem são as pessoas e instituições desse entorno político, e qual o histórico delas? <a href="/partidos">Veja o guia de partidos políticos →</a>',
    ],
  },
  {
    icone: Icone.escudoCheck,
    titulo: 'Decida',
    texto:
      'A decisão é sempre sua — o VotoCheck nunca ranqueia, pontua ou recomenda um nome. Se quiser, você pode nos contar sua escolha (ou até 3 favoritos, se ainda estiver decidindo) pra receber um acompanhamento do mandato depois da eleição.',
  },
  {
    icone: Icone.sino,
    titulo: 'Monitore',
    texto:
      'Depois de eleito, o mandato continua sendo acompanhado: presença, votações e propostas seguem atualizadas na página de cada Representante Público.',
    emConstrucao: true,
  },
  {
    icone: Icone.megafone,
    titulo: 'Cobre',
    texto:
      'Um canal para se manifestar sobre pautas do momento e cobrar atuação dos Representantes Públicos que você escolheu acompanhar — com base no que foi prometido e no que foi de fato feito.',
    emConstrucao: true,
  },
];

export function renderJornada() {
  const cards = ETAPAS.map(
    (e) => `
      <div class="etapa-card${e.emConstrucao ? ' etapa-card--construcao' : ''}">
        <div class="etapa-icone">${e.icone(28)}</div>
        <h3 class="etapa-titulo">${e.titulo}${e.emConstrucao ? '<span class="etapa-badge">Em construção</span>' : ''}</h3>
        <p class="etapa-texto">${e.texto}</p>
        ${
          e.perguntas
            ? `<details class="etapa-detalhe">
                 <summary>${e.detalheResumo || 'Saiba mais'}</summary>
                 <ul class="etapa-perguntas">${e.perguntas.map((p) => `<li>${p}</li>`).join('')}</ul>
               </details>`
            : ''
        }
      </div>`
  ).join('');

  const lema = ETAPAS.map((e) => e.titulo.toUpperCase()).join(' <span class="seta">→</span> ');

  return `
    <section class="jornada" aria-labelledby="jornada-titulo">
      <h2 id="jornada-titulo" class="jornada-lema">${lema}</h2>
      <p class="secao-subtitulo">
        Cada palavra do nosso lema é uma etapa — e o acompanhamento não termina na eleição.
      </p>
      <div class="jornada-grid">${cards}</div>
    </section>`;
}

// ===== Obtenção de dados =====

const FONTES = [
  {
    icone: Icone.balanca,
    nome: 'TSE',
    texto: 'Candidaturas, dados biográficos, patrimônio declarado e situação de cada candidatura, direto do Tribunal Superior Eleitoral.',
  },
  {
    icone: Icone.predio,
    nome: 'Câmara dos Deputados',
    texto: 'Votações nominais em Plenário, proposições apresentadas e presença dos deputados federais em exercício.',
  },
  {
    icone: Icone.escudoCheck,
    nome: 'Senado Federal',
    texto: 'Votações nominais, proposições e presença dos senadores em exercício.',
  },
];

/**
 * "Obtenção de dados" tem uma parte FIXA (o que é evergreen — de onde vêm os dados, a busca,
 * o mapa — continua fazendo sentido antes, durante e depois da eleição) e uma parte específica
 * do ciclo eleitoral de 2026 (números de candidatura), que soma no final e sai de cena quando
 * deixar de fazer sentido mostrar (ver `mostrarBlocoEleicoes2026`).
 */
export function renderObtencaoDados({ totalCandidaturas, totalPessoas, atualizadoEm, porCargo, buscaHtml, mapaHtml }) {
  const fontesHtml = FONTES.map(
    (f) => `
      <div class="fonte-card">
        <div class="etapa-icone">${f.icone(24)}</div>
        <strong>${f.nome}</strong>
        <p>${f.texto}</p>
      </div>`
  ).join('');

  return `
    <section class="obtencao-dados" aria-labelledby="obtencao-titulo">
      <h2 id="obtencao-titulo" class="secao-titulo">Obtenção de dados</h2>
      <p class="secao-subtitulo">
        Toda informação aqui vem de fontes públicas oficiais, sempre com a origem visível.
        Nenhum dado é opinião do VotoCheck.
      </p>
      <div class="fontes-grid">${fontesHtml}</div>
      ${buscaHtml}
      ${mapaHtml}
      ${mostrarBlocoEleicoes2026() ? renderBlocoEleicoes2026({ totalCandidaturas, totalPessoas, atualizadoEm, porCargo }) : ''}
    </section>`;
}

function renderBlocoEleicoes2026({ totalCandidaturas, totalPessoas, atualizadoEm, porCargo }) {
  return `
    <div class="eleicoes-2026">
      <h3 class="eleicoes-2026-titulo">Eleições 2026</h3>
      <div class="stats-linha">
        <div><strong>${totalCandidaturas.toLocaleString('pt-BR')}</strong><span>candidaturas 2026</span></div>
        <div><strong>${totalPessoas.toLocaleString('pt-BR')}</strong><span>pessoas cadastradas</span></div>
      </div>
      <p class="stats-nota">
        Cobertura em expansão: Presidencial, Governadores, Senadores e Deputados Federais/Estaduais/Distritais.
        Última atualização de dados: ${atualizadoEm ? atualizadoEm : 'em coleta'}.
      </p>
      ${renderGraficoCobertura(porCargo)}
    </div>`;
}

// Deputado Estadual e Deputado Distrital viram uma barra só no gráfico (o DF acumula as duas
// competências — ver cargos_guia.js — então separar as duas infla visualmente uma diferença
// que não é comparável da mesma forma que os outros cargos). A barra unificada não linka pra
// `/buscar` (não existe um único `cargo.slug` que junte os dois no filtro).
function unificarCargos(porCargo) {
  const estadual = porCargo.find((c) => c.slug === 'deputado_estadual');
  const distrital = porCargo.find((c) => c.slug === 'deputado_distrital');
  if (!estadual || !distrital) return porCargo;
  const combinado = {
    slug: null,
    nome: 'Dep. Estadual/Distrital',
    qtd: (Number(estadual.qtd) || 0) + (Number(distrital.qtd) || 0),
  };
  const resultado = [];
  let inserido = false;
  for (const c of porCargo) {
    if (c.slug === 'deputado_estadual') {
      resultado.push(combinado);
      inserido = true;
    } else if (c.slug === 'deputado_distrital') {
      // pulado — já entrou combinado no lugar do estadual
    } else {
      resultado.push(c);
    }
  }
  if (!inserido) resultado.push(combinado);
  return resultado;
}

/**
 * "Cobertura por cargo" como gráfico de barras horizontais (skill dataviz): uma única cor
 * (magnitude, não identidade), barras finas com ponta arredondada, rótulo direto no fim da
 * barra — o próprio texto já é acessível a leitor de tela, sem precisar de uma tabela
 * equivalente ao lado.
 */
function renderGraficoCobertura(porCargo) {
  if (!porCargo || !porCargo.length) return '';
  const linhasDados = unificarCargos(porCargo);
  const max = Math.max(...linhasDados.map((c) => Number(c.qtd) || 0), 1);
  const linhas = linhasDados
    .map((c) => {
      const pct = Math.max(4, Math.round(((Number(c.qtd) || 0) / max) * 100));
      const conteudo = `
          <span class="grafico-rotulo">${c.nome}</span>
          <span class="grafico-trilha"><span class="grafico-barra" style="width:${pct}%"></span></span>
          <span class="grafico-valor">${Number(c.qtd).toLocaleString('pt-BR')}</span>`;
      return c.slug
        ? `<a class="grafico-linha" href="/buscar?cargo=${encodeURIComponent(c.slug)}">${conteudo}</a>`
        : `<div class="grafico-linha">${conteudo}</div>`;
    })
    .join('');

  return `
    <div class="grafico-cargos-wrap">
      <h4 class="grafico-titulo">Cobertura por cargo</h4>
      <div class="grafico-cargos">${linhas}</div>
    </div>`;
}

// ===== Monitoramento e Cobrança =====

// 1º turno das eleições gerais de 2026 — usado só pra decidir a ordem das seções na home
// (pré-eleição: obtenção de dados é o destaque; pós-eleição: monitoramento sobe pra logo
// abaixo da Definição). Ajuste aqui se o TSE alterar oficialmente a data.
const DATA_1_TURNO_2026 = new Date('2026-10-04T00:00:00-03:00');

export function faseEleitoral(agora = new Date()) {
  return agora >= DATA_1_TURNO_2026 ? 'pos' : 'pre';
}

// Fim do 2º turno de 2026 — usado só pra decidir até quando o bloco "Eleições 2026" (números de
// candidatura + gráfico de cobertura) continua na home. Regra combinada com o Rodrigo em 20/09:
// o bloco fica visível até o 1º turno, continua até o 2º turno, e depois some — mas o corte
// exato (nesta data, ou um pouco depois, ex.: até a diplomação) ainda está em aberto. Ajustar
// esta constante quando isso for decidido; até lá, este é o padrão de segurança.
const DATA_2_TURNO_2026 = new Date('2026-10-25T23:59:59-03:00');

export function mostrarBlocoEleicoes2026(agora = new Date()) {
  return agora <= DATA_2_TURNO_2026;
}

export function renderMonitoramentoCobranca(fase) {
  const chamada =
    fase === 'pre'
      ? 'Ainda estamos na fase de conhecer, conferir e comparar candidatos. Depois da eleição, esta seção ganha destaque logo no topo da home.'
      : 'A eleição já aconteceu — acompanhar o mandato e cobrar atuação é o próximo passo.';

  return `
    <section class="monitoramento" aria-labelledby="monitoramento-titulo">
      <div class="etapa-icone">${Icone.megafone(28)}</div>
      <h2 id="monitoramento-titulo" class="secao-titulo">Monitoramento e Cobrança</h2>
      <p class="secao-subtitulo">${chamada}</p>
      <p class="monitoramento-texto">
        A ideia: você escolhe acompanhar um Representante Público (ou até 3, se ainda não tiver
        decidido) e recebe resumos periódicos da atuação dele — votos, presença, propostas — pra
        cobrar o que foi prometido. Um canal de manifestação sobre pautas do momento também está
        planejado, sempre com a mesma regra do resto do produto: fatos e fontes, nunca opinião do
        VotoCheck sobre quem está certo.
      </p>
      <span class="etapa-badge">Em construção — ainda não disponível</span>
    </section>`;
}

// ===== CTA de apoio (doação + publicidade) =====

// Config a preencher por Rodrigo antes de ativar o QR Code real (mesmo padrão de
// habilitação usado em banners_html.js — nunca inventar uma chave PIX aqui).
const PIX_CONFIG = {
  chave: '',
  qrImagemUrl: '',
};

export function renderCtaApoio() {
  const temPix = Boolean(PIX_CONFIG.chave || PIX_CONFIG.qrImagemUrl);
  return `
    <section class="cta-apoio" aria-labelledby="apoio-titulo">
      <div class="etapa-icone">${Icone.coracao(28)}</div>
      <h2 id="apoio-titulo" class="secao-titulo">Como o VotoCheck se sustenta</h2>
      <p class="secao-subtitulo">
        Somos independentes: não recebemos recurso público e nenhum partido ou candidato
        influencia o que é mostrado aqui.
      </p>
      <div class="cta-apoio-grid">
        <div class="cta-apoio-card">
          <strong>Doações individuais</strong>
          <p>Cada contribuição via PIX ajuda a manter o site no ar e a cobertura em expansão.</p>
          ${
            temPix
              ? `<img src="${PIX_CONFIG.qrImagemUrl}" alt="QR Code PIX para doação" style="width:140px;height:140px;" />`
              : `<div class="pix-placeholder">${Icone.qrcode(40)}<span>QR Code PIX em breve</span></div>`
          }
        </div>
        <div class="cta-apoio-card">
          <strong>Cota publicitária</strong>
          <p>
            Uma pequena cota de anúncios de empresas apoiadoras, sem viés ideológico ou partidário —
            interesse em apoiar a causa e expor a marca, nada além disso.
          </p>
          <a href="mailto:contato@votocheck.com.br">Quero apoiar como empresa →</a>
        </div>
      </div>
    </section>`;
}
