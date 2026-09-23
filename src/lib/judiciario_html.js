/**
 * VotoCheck — Página de apoio "O Judiciário".
 *
 * O Judiciário não tem eleição direta (nenhum ministro, desembargador ou juiz é eleito pelo
 * voto popular), mas tem papel central no ecossistema que o VotoCheck cobre: é quem organiza as
 * eleições (Justiça Eleitoral), julga contas de campanha, pode cassar mandato, e tem a palavra
 * final sobre a constitucionalidade de leis aprovadas pelos cargos eletivos que o VotoCheck
 * acompanha. Conteúdo institucional/constitucional — mesmo princípio de `cargos_guia.js`: não é
 * opinião do VotoCheck sobre nenhuma decisão específica de nenhum tribunal.
 *
 * ATUALIZAÇÃO 23/09/2026 — diagrama de hierarquia (pedido do Rodrigo: a página estava "um monte
 * de texto despejado, sem interatividade nenhuma"). A antiga grade plana de 7 cards (`.orgaos-grid`)
 * virou uma árvore de 3 ramos (Comum / Eleitoral / Trabalho), cada um subindo de 1ª instância até
 * seu tribunal superior, com o STF no topo (controle constitucional sobre os três) e o CNJ ao
 * lado, deliberadamente FORA da escada de recursos — ele fiscaliza a administração da Justiça,
 * não julga processos, então colocá-lo na mesma linha vertical dos tribunais recursais sugeriria
 * um papel que ele não tem. Cada nó é um `<details>` nativo (sem JS obrigatório, mesmo padrão já
 * usado em `cargos_guia.js`/`faq`): a posição no diagrama já ensina a estrutura, o clique
 * aprofunda o texto.
 */
import { pagina } from './estilo_html.js';

const COMO_INGRESSAM = [
  'Juízes de primeira instância entram por concurso público de provas e títulos.',
  'Uma fração das vagas em tribunais (o "quinto constitucional") é reservada a advogados e membros do Ministério Público indicados pelo Executivo a partir de listas elaboradas pela própria categoria.',
  'Ministros do STF, STJ, TST e demais tribunais superiores são indicados pelo Presidente da República e precisam de aprovação do Senado Federal (sabatina) antes de tomar posse.',
];

/** Um nó clicável do diagrama de hierarquia — `<details>` nativo, funciona sem JS. */
function nodo(nome, texto, { destaque = false } = {}) {
  return `
    <details class="jud-nodo${destaque ? ' jud-nodo--destaque' : ''}">
      <summary>${nome}</summary>
      <p>${texto}</p>
    </details>`;
}

/** Um ramo da árvore: 1ª instância (pode ter 1 ou 2 nós lado a lado) → tribunal superior, com um conector rotulado entre os dois níveis. */
function ramo(titulo, nosBase, rotuloConector, noSuperior) {
  return `
    <div class="jud-ramo">
      <span class="jud-ramo-titulo">${titulo}</span>
      <div class="jud-ramo-base">${nosBase.join('')}</div>
      <div class="jud-conector"><span>↑ ${rotuloConector}</span></div>
      ${noSuperior}
    </div>`;
}

function renderDiagramaHierarquia() {
  const stf = nodo(
    'STF — Supremo Tribunal Federal',
    '11 ministros, indicados pelo Presidente da República e aprovados pelo Senado (sabatina pública). Guarda a Constituição: julga ações de inconstitucionalidade de leis, conflitos entre Poderes e processa autoridades com foro privilegiado (como o próprio Presidente). É a última palavra sobre questão constitucional vinda de qualquer um dos três ramos abaixo.',
    { destaque: true }
  );

  const cnj = nodo(
    'CNJ — Conselho Nacional de Justiça',
    'Fiscaliza a atuação administrativa, financeira e disciplinar do Judiciário e o cumprimento dos deveres funcionais de juízes — não julga processos judiciais comuns, controla o funcionamento da máquina da Justiça. Por isso fica fora da escada de recursos ao lado: não é uma instância de julgamento, atravessa os três ramos.'
  );

  const ramoComum = ramo(
    'Justiça Comum',
    [
      nodo('TJs — Tribunais de Justiça (estadual)', 'Julga a maior parte dos processos cíveis e criminais do dia a dia que não são de competência federal — é o ramo do Judiciário com mais volume de casos no Brasil. Um por estado.'),
      nodo('TRFs — Tribunais Regionais Federais', 'Julga causas que envolvem a União, autarquias e empresas públicas federais, e crimes de competência federal.'),
    ],
    'recurso especial',
    nodo('STJ — Superior Tribunal de Justiça', 'Uniformiza a interpretação da lei federal em todo o país (fora de matéria constitucional, que é papel do STF) e julga recursos especiais contra decisões dos TJs e TRFs.')
  );

  const ramoEleitoral = ramo(
    'Justiça Eleitoral',
    [nodo('TREs — Tribunais Regionais Eleitorais', 'Um por estado (e no DF): aplicam a legislação eleitoral na 1ª instância, registram candidaturas estaduais/municipais e julgam a maior parte dos processos eleitorais.')],
    'recurso',
    nodo('TSE — Tribunal Superior Eleitoral', 'Última instância da Justiça Eleitoral: organiza e normatiza as eleições, julga recursos das decisões dos TREs, registra candidaturas de âmbito federal e pode cassar mandatos por abuso de poder ou irregularidade eleitoral. É a principal fonte oficial de dados do VotoCheck sobre candidaturas.', { destaque: true })
  );

  const ramoTrabalho = ramo(
    'Justiça do Trabalho',
    [nodo('TRTs — Tribunais Regionais do Trabalho', '24 tribunais regionais, cada um cobrindo uma ou mais unidades da federação: julgam conflitos entre empregados e empregadores na 1ª e 2ª instância.')],
    'recurso',
    nodo('TST — Tribunal Superior do Trabalho', 'Última instância da Justiça do Trabalho: uniformiza a interpretação das leis trabalhistas em todo o país e julga recursos das decisões dos TRTs.')
  );

  return `
    <div class="jud-arvore">
      <div class="jud-topo">
        ${stf}
        <div class="jud-conector jud-conector--topo"><span>↑ questão constitucional</span></div>
      </div>
      <div class="jud-ramos">
        ${ramoComum}
        ${ramoEleitoral}
        ${ramoTrabalho}
      </div>
      <div class="jud-cnj-linha">
        <span class="jud-cnj-rotulo">Fiscaliza a administração dos três ramos (não julga processos):</span>
        ${cnj}
      </div>
    </div>`;
}

export function renderJudiciario() {
  const ingressoHtml = COMO_INGRESSAM.map((i) => `<li>${i}</li>`).join('');

  const corpo = `
    <div style="max-width:760px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">O Judiciário</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:28px;">
        Diferente dos cargos que o VotoCheck acompanha, ninguém no Judiciário é eleito pelo voto
        popular — mas o papel dele é decisivo pra todo o resto do sistema, inclusive nas próprias
        eleições.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Por que não tem eleição direta</h2>
      <p>
        O desenho constitucional brasileiro separa os Poderes e busca blindar decisões judiciais
        de pressão eleitoral direta. Isso não significa ausência de controle: concursos públicos,
        decisões colegiadas (vários juízes decidindo juntos), possibilidade de recurso a uma
        instância superior, fiscalização do CNJ e — no caso dos ministros do STF — a possibilidade
        de impeachment, de competência exclusiva do Senado Federal, são os principais freios.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Como se ingressa na carreira</h2>
      <ul>${ingressoHtml}</ul>

      <h2 class="secao-titulo" style="text-align:left; margin-top:48px;">Como o Judiciário se organiza</h2>
      <p class="secao-subtitulo" style="text-align:left; max-width:none; margin-bottom:8px;">
        Três ramos, cada um subindo de uma primeira instância até seu tribunal superior, com o STF
        no topo julgando questão constitucional vinda de qualquer um deles. Toque em cada caixa
        pra ver o que ela faz.
      </p>
      ${renderDiagramaHierarquia()}

      <h2 style="font-size:19px; margin-top:48px;">Onde isso cruza com o que o VotoCheck cobre</h2>
      <p>
        A Justiça Eleitoral (TSE e TREs) é a principal fonte oficial de dados do VotoCheck sobre
        candidaturas — veja o <a href="/#obtencao-titulo">bloco "Obtenção de dados"</a> na home. O
        STF, por sua vez, tem a palavra final sobre a constitucionalidade de leis aprovadas pelos
        cargos eletivos que acompanhamos (Congresso Nacional, assembleias estaduais), e o Senado
        Federal participa diretamente da aprovação dos ministros dos tribunais superiores — ver o
        <a href="/cargo/senador">guia do cargo de Senador</a>.
      </p>
    </div>
  `;
  return pagina({
    titulo: 'O Judiciário — VotoCheck',
    descricao: 'Como funciona o Judiciário brasileiro, por que não tem eleição direta, e como ele se relaciona com os cargos eletivos e com as eleições que o VotoCheck acompanha.',
    caminho: '/judiciario',
    corpo,
  });
}
