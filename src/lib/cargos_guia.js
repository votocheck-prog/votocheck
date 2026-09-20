/**
 * VotoCheck — Guia de funções dos cargos eletivos.
 *
 * Atende ao pilar "Educação" do Brand Blueprint ("explicar competências, orçamento, processo
 * e limites") e ao princípio "Informar antes de interpretar / Explicar antes de julgar" da
 * Visão Institucional. Conteúdo institucional (o que a Constituição e as leis atribuem a cada
 * cargo) — não é opinião do VotoCheck sobre nenhum candidato ou partido, e não deve ser editado
 * para refletir avaliação de desempenho de ninguém.
 *
 * Cada entrada corresponde ao slug de `cargo` no banco (ver migrations/0001_schema_inicial.sql)
 * — se um novo cargo for adicionado ao schema, adicione a entrada correspondente aqui.
 */
export const GUIA_CARGOS = [
  {
    slug: 'presidente',
    nome: 'Presidente da República',
    poder: 'Executivo federal',
    mandato: '4 anos, com direito a uma reeleição',
    faz: [
      'Chefia a administração pública federal e nomeia ministros de Estado.',
      'Sanciona, veta ou promulga as leis aprovadas pelo Congresso Nacional.',
      'Comanda as Forças Armadas e conduz a política externa do país.',
      'Envia ao Congresso a proposta de orçamento da União e presta contas de sua execução.',
      'Pode editar medidas provisórias (força de lei imediata, mas temporária) em casos de relevância e urgência.',
    ],
    naoFaz: [
      'Não legisla sozinho: leis, orçamento e a maioria dos tratados internacionais dependem da aprovação do Congresso Nacional.',
      'Não administra diretamente estados e municípios — cada um tem seu próprio Executivo eleito.',
      'Não julga processos nem pode determinar decisões do Poder Judiciário.',
    ],
  },
  {
    slug: 'governador',
    nome: 'Governador',
    poder: 'Executivo estadual',
    mandato: '4 anos, com direito a uma reeleição',
    faz: [
      'Chefia a administração pública do estado e nomeia secretários estaduais.',
      'Sanciona, veta ou promulga as leis aprovadas pela Assembleia Legislativa.',
      'Comanda a Polícia Militar e a Polícia Civil do estado.',
      'É responsável pela rede estadual de saúde, educação e pelas estradas estaduais.',
      'Envia à Assembleia a proposta de orçamento do estado.',
    ],
    naoFaz: [
      'Não legisla sobre matérias de competência exclusiva da União (ex.: Código Penal, regras de trânsito nacionais, moeda).',
      'Não comanda as Forças Armadas nem conduz política externa.',
      'Não administra diretamente os municípios do estado — cada um tem prefeito e câmara própria.',
    ],
  },
  {
    slug: 'senador',
    nome: 'Senador',
    poder: 'Legislativo federal — Senado Federal',
    mandato: '8 anos (cada estado e o DF elegem 3 senadores, em turnos alternados a cada eleição)',
    faz: [
      'Propõe, discute e vota projetos de lei federais, junto com a Câmara dos Deputados.',
      'Aprova ou rejeita indicações do Presidente para cargos como ministros do STF, do TCU, presidente do Banco Central e chefes de missão diplomática.',
      'Autoriza operações de crédito (empréstimos) de estados, municípios e do próprio governo federal.',
      'Julga o Presidente, o Vice e ministros do STF em processos de impeachment.',
      'Fiscaliza o Poder Executivo federal, inclusive por meio de Comissões Parlamentares de Inquérito (CPIs).',
    ],
    naoFaz: [
      'Não administra: não é Poder Executivo, não gerencia secretarias nem executa obras diretamente.',
      'Não representa uma região específica do estado — representa o estado inteiro (diferente do deputado, cuja votação é mais pulverizada geograficamente).',
      'Não pode, sozinho, aprovar ou barrar uma lei — depende da maioria do Senado (e, quase sempre, também da Câmara).',
    ],
  },
  {
    slug: 'deputado_federal',
    nome: 'Deputado Federal',
    poder: 'Legislativo federal — Câmara dos Deputados',
    mandato: '4 anos',
    faz: [
      'Propõe, discute e vota projetos de lei federais, junto com o Senado.',
      'Participa da elaboração e aprovação do orçamento da União.',
      'Fiscaliza o Poder Executivo federal, inclusive por meio de CPIs.',
      'Pode dar início a processos de impeachment contra o Presidente da República.',
      'É o elo entre o eleitorado do estado e a legislação federal — número de cadeiras por estado é proporcional à população.',
    ],
    naoFaz: [
      'Não administra: não é Poder Executivo, não gerencia ministérios nem executa obras diretamente.',
      'Não legisla sobre matérias de competência exclusiva estadual ou municipal.',
      'Não pode, sozinho, aprovar ou barrar uma lei — depende da maioria da Câmara (e, quase sempre, também do Senado).',
    ],
  },
  {
    slug: 'deputado_estadual',
    nome: 'Deputado Estadual',
    poder: 'Legislativo estadual — Assembleia Legislativa',
    mandato: '4 anos',
    faz: [
      'Propõe, discute e vota leis estaduais.',
      'Participa da elaboração e aprovação do orçamento do estado.',
      'Fiscaliza o governador e a administração estadual.',
      'Pode instaurar CPIs estaduais.',
    ],
    naoFaz: [
      'Não administra: não é Poder Executivo, não gerencia secretarias nem executa obras diretamente.',
      'Não legisla sobre matérias de competência exclusiva federal ou municipal.',
      'Não representa o país no Congresso Nacional — atua só dentro do estado.',
    ],
  },
  {
    slug: 'deputado_distrital',
    nome: 'Deputado Distrital',
    poder: 'Legislativo distrital — Câmara Legislativa do DF',
    mandato: '4 anos',
    faz: [
      'Exerce, no Distrito Federal, o papel equivalente ao de deputado estadual e também de vereador — o DF não pode ser dividido em municípios, então acumula competências estaduais e municipais.',
      'Propõe, discute e vota leis distritais (inclusive as que, em outros estados, seriam leis municipais).',
      'Participa da elaboração e aprovação do orçamento do DF.',
      'Fiscaliza o governador do DF e a administração distrital.',
    ],
    naoFaz: [
      'Não administra: não é Poder Executivo, não gerencia secretarias nem executa obras diretamente.',
      'Não legisla sobre matérias de competência exclusiva federal.',
      'Não representa o DF no Congresso Nacional — isso cabe aos deputados federais e senadores eleitos pelo DF.',
    ],
  },
];

function itemCargo(c) {
  const listaFaz = c.faz.map((f) => `<li>${f}</li>`).join('');
  const listaNaoFaz = c.naoFaz.map((f) => `<li>${f}</li>`).join('');
  return `
    <details class="cargo-guia-item">
      <summary>
        <span class="cargo-guia-nome">${c.nome}</span>
        <span class="cargo-guia-meta">${c.poder} · mandato de ${c.mandato}</span>
      </summary>
      <div class="cargo-guia-corpo">
        <div>
          <h4 class="cargo-guia-titulo cargo-guia-titulo--faz">O que pode fazer</h4>
          <ul>${listaFaz}</ul>
        </div>
        <div>
          <h4 class="cargo-guia-titulo cargo-guia-titulo--nao">O que não faz</h4>
          <ul>${listaNaoFaz}</ul>
        </div>
      </div>
    </details>`;
}

/**
 * Seção "Guia dos cargos" — pilar Educação. Cada cargo é um <details>/<summary> (funciona sem
 * JS, cargo fecha por padrão pra não sobrecarregar a homepage) com o que pode e não pode fazer.
 * Conteúdo institucional/constitucional — nunca deve virar avaliação de mandato de ninguém.
 */
export function renderGuiaCargos() {
  return `
    <section class="cargo-guia" aria-labelledby="guia-cargos-titulo">
      <h2 id="guia-cargos-titulo" class="secao-titulo">Entenda cada cargo</h2>
      <p class="secao-subtitulo">
        Antes de comparar candidatos, vale saber o que cada cargo pode e não pode fazer.
        Clique para expandir.
      </p>
      ${GUIA_CARGOS.map(itemCargo).join('')}
    </section>`;
}
