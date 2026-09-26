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
import { Icone } from './icones.js';

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

const ESTILO_JUD = `
  .jd-hero { background: var(--navy); color: #fff; padding: 52px 0 84px; }
  .jd-hero h1 { color: #fff; font-size: clamp(32px, 4.6vw, 52px); margin: 0 0 12px; max-width: 900px; }
  .jd-hero p { color: #C3CDF0; font-size: 18px; max-width: 720px; margin: 0; }
  .jd-fatos { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; margin-top: -52px; position: relative; z-index: 2; }
  @media (max-width: 820px) { .jd-fatos { grid-template-columns: 1fr; } }
  .jd-fato { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: var(--shadow); }
  .jd-fato b { display: block; font-family: var(--font-display); font-size: 34px; letter-spacing: -.02em; }
  .jd-fato span { font-size: 14.5px; color: var(--ink-2); }
  .jd-sec { padding: 56px 0 0; }
  .jd-arvore { background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 24px; }
  .jud-topo { max-width: 520px; margin: 0 auto; text-align: center; }
  .jud-ramos { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; margin-top: 8px; }
  @media (max-width: 820px) { .jud-ramos { grid-template-columns: 1fr; } }
  .jud-ramo { background: var(--paper); border-radius: 16px; padding: 14px; display: flex; flex-direction: column-reverse; gap: 8px; }
  .jud-ramo-titulo { order: -1; font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); text-align: center; }
  .jud-ramo-base { display: grid; gap: 8px; }
  .jud-conector { text-align: center; font-size: 12px; color: var(--blue); font-weight: 600; }
  .jud-conector--topo { margin: 8px 0; }
  .jud-nodo { background: #fff; border: 1px solid var(--line); border-radius: 12px; text-align: left; }
  .jud-nodo summary { cursor: pointer; list-style: none; padding: 12px 14px; font-weight: 700; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .jud-nodo summary::-webkit-details-marker { display: none; }
  .jud-nodo summary::after { content: '+'; flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--blue-50); color: var(--blue); font-weight: 800; font-size: 14px; }
  .jud-nodo[open] summary::after { content: '–'; }
  .jud-nodo p { margin: 0; padding: 0 14px 14px; font-size: 14px; color: var(--ink-2); }
  .jud-nodo--destaque { background: var(--navy); border-color: var(--navy); }
  .jud-nodo--destaque summary { color: #fff; font-size: 16px; }
  .jud-nodo--destaque p { color: #C3CDF0; }
  .jud-nodo--destaque summary::after { background: rgba(255,255,255,.14); color: #fff; }
  .jud-cnj-linha { margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--line-2); display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: center; }
  .jud-cnj-rotulo { font-size: 13px; color: var(--muted); max-width: 240px; }
  @media (max-width: 620px) { .jud-cnj-linha { grid-template-columns: 1fr; } }
`;

export function renderJudiciario() {
  const corpo = `
    <style>${ESTILO_JUD}</style>
    <section class="jd-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow" style="color:#7FB0FF">${Icone.balanca(16)} Entenda · O Judiciário</span>
        <h1>Ninguém no Judiciário é eleito. Mas ele decide muita coisa sobre a eleição.</h1>
        <p>É a Justiça Eleitoral que registra candidaturas, organiza a votação e pode cassar mandatos. E é o STF que diz se uma lei aprovada pelos eleitos vale ou não.</p>
      </div>
    </section>
    <div class="vc-wrap" style="padding-bottom:64px">
      <div class="jd-fatos">
        <div class="jd-fato"><b>TSE</b><span>Registra as candidaturas e organiza a eleição. É a principal fonte oficial dos dados do VotoCheck.</span></div>
        <div class="jd-fato"><b>11</b><span>ministros no STF, indicados pelo Presidente e aprovados pelo Senado depois de sabatina.</span></div>
        <div class="jd-fato"><b>Senado</b><span>Aprova os ministros dos tribunais superiores e é quem julga um eventual impeachment de ministro do STF.</span></div>
      </div>

      <section class="jd-sec">
        <span class="vc-eyebrow">${Icone.grafico(16)} Como se organiza</span>
        <h2 class="vc-h2">Três ramos, um topo</h2>
        <p class="vc-lead">Cada ramo sobe da primeira instância até seu tribunal superior. O STF, no topo, julga as questões constitucionais de qualquer um deles. Toque numa caixa para ver o que ela faz.</p>
        <div class="jd-arvore">${renderDiagramaHierarquia()}</div>
      </section>

      <section class="jd-sec">
        <div class="vc-grid vc-grid-3">
          <div class="vc-card"><div class="vc-ico">${Icone.escudoCheck(22)}</div><h3>Por que não tem eleição</h3>
            <p>A Constituição separa os Poderes e protege as decisões judiciais da pressão eleitoral. O controle vem de concurso público, decisões em colegiado, recursos, fiscalização do CNJ e, para ministros do STF, impeachment pelo Senado.</p></div>
          <div class="vc-card"><div class="vc-ico">${Icone.usuario(22)}</div><h3>Como se entra</h3>
            <p>${COMO_INGRESSAM.map((i) => escapeHtmlSimples(i)).join(' ')}</p></div>
          <div class="vc-card"><div class="vc-ico vc-ico--teal">${Icone.votoCaixa(22)}</div><h3>Onde cruza com o seu voto</h3>
            <p>Os senadores que você elege aprovam ministros dos tribunais superiores. Os deputados e senadores fazem as leis que o STF pode derrubar. <a href="/cargo/senador">Veja o que faz um senador</a>.</p></div>
        </div>
      </section>
    </div>
  `;
  return pagina({
    titulo: 'O Judiciário e a eleição: quem decide o quê | VotoCheck',
    descricao: 'Como funciona o Judiciário brasileiro, por que não tem eleição direta e como ele se relaciona com os cargos eletivos e com as eleições.',
    caminho: '/judiciario',
    larga: true,
    corpo,
  });
}

function escapeHtmlSimples(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
