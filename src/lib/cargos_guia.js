/**
 * VotoCheck — Guia de funções dos cargos eletivos + atuação por tema.
 *
 * Atende ao pilar "Educação" do Brand Blueprint ("explicar competências, orçamento, processo
 * e limites") e ao princípio "Informar antes de interpretar / Explicar antes de julgar" da
 * Visão Institucional. Conteúdo institucional (o que a Constituição e as leis atribuem a cada
 * cargo) — não é opinião do VotoCheck sobre nenhum candidato ou partido, e não deve ser editado
 * para refletir avaliação de desempenho de ninguém.
 *
 * Cobre os 6 cargos hoje rastreados com dados de candidatura pelo VotoCheck (Presidente,
 * Governador, Senador, Dep. Federal, Dep. Estadual, Dep. Distrital) MAIS Prefeito e Vereador,
 * incluídos a partir de 20/09/2026 como conteúdo educativo (o que o cargo pode/não pode fazer)
 * mesmo sem cobertura de candidaturas municipais ainda — marcados com `coberturaDisponivel:
 * false` pra deixar isso explícito em vez de sugerir que dá pra buscar prefeitos/vereadores
 * aqui (ainda não dá).
 *
 * `atuacaoPorTema`: quando um cargo genuinamente não tem papel formal num tema (ex.: Deputado
 * Estadual em Política Externa), o texto diz isso explicitamente em vez de forçar uma resposta —
 * omitir ou inventar relevância seria menos honesto que dizer "não tem papel formal aqui".
 */

export const TEMAS = [
  { slug: 'seguranca', nome: 'Segurança' },
  { slug: 'saude', nome: 'Saúde' },
  { slug: 'educacao', nome: 'Educação' },
  { slug: 'economia', nome: 'Economia e dívida pública' },
  { slug: 'recursos_naturais', nome: 'Recursos naturais' },
  { slug: 'infraestrutura', nome: 'Infraestrutura' },
  { slug: 'politica_externa', nome: 'Política externa' },
];

export const GUIA_CARGOS = [
  {
    slug: 'presidente',
    nome: 'Presidente da República',
    poder: 'Executivo federal',
    mandato: '4 anos, com direito a uma reeleição',
    resumo: 'Chefia o governo federal, comanda as Forças Armadas e conduz as relações do Brasil com outros países.',
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
    atuacaoPorTema: {
      seguranca: 'Comanda a Polícia Federal, a Polícia Rodoviária Federal e as Forças Armadas; define a política nacional de segurança pública e o combate ao crime organizado transnacional.',
      saude: 'Chefia o Ministério da Saúde, financia parte do SUS com recursos federais, regula a ANVISA e a ANS, e lidera a resposta a emergências sanitárias nacionais.',
      educacao: 'Define diretrizes nacionais de educação (MEC), financia programas federais (FUNDEB, bolsas, universidades federais) e regula o ensino superior.',
      economia: 'Define a política econômica e fiscal federal, negocia com credores internacionais quando necessário, e sanciona a Lei Orçamentária Anual.',
      recursos_naturais: 'Define a política energética e mineral nacional, preside a política de royalties do petróleo e autoriza contratos de exploração via ANP.',
      infraestrutura: 'Planeja e financia rodovias federais, portos, aeroportos e ferrovias; concede serviços de infraestrutura à iniciativa privada.',
      politica_externa: 'Representa o Brasil no exterior, negocia e assina tratados internacionais, e nomeia embaixadores.',
    },
  },
  {
    slug: 'governador',
    nome: 'Governador',
    poder: 'Executivo estadual',
    mandato: '4 anos, com direito a uma reeleição',
    resumo: 'Chefia o governo do estado, comanda as polícias estadual e é responsável pela rede estadual de saúde e educação.',
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
    atuacaoPorTema: {
      seguranca: 'Comanda a Polícia Militar e a Polícia Civil do estado — a maior parte do policiamento do dia a dia no Brasil é estadual.',
      saude: 'Administra a rede estadual de saúde (hospitais estaduais, regulação de leitos) e organiza consórcios regionais entre municípios.',
      educacao: 'Administra a rede estadual de ensino — no Brasil, a maior parte do ensino médio é estadual.',
      economia: 'Administra o orçamento e a dívida do estado, e negocia renegociação de dívida estadual com a União.',
      recursos_naturais: 'Gerencia recursos hídricos de domínio estadual e recebe/aplica royalties de petróleo e minério destinados ao estado.',
      infraestrutura: 'Administra rodovias estaduais e obras estruturantes do estado.',
      politica_externa: 'Não tem papel formal em política externa — pode assinar acordos pontuais de cooperação ou comércio, mas sem status de tratado internacional.',
    },
  },
  {
    slug: 'senador',
    nome: 'Senador',
    poder: 'Legislativo federal — Senado Federal',
    mandato: '8 anos (cada estado e o DF elegem 3 senadores, em turnos alternados a cada eleição)',
    resumo: 'Representa o estado inteiro no Congresso, vota leis federais e aprova indicações e tratados do Presidente.',
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
    atuacaoPorTema: {
      seguranca: 'Aprova indicações ligadas à segurança pública federal (ex.: direção-geral da PF, quando sujeita a sabatina) e fiscaliza o Executivo federal na área.',
      saude: 'Aprova indicações de dirigentes de agências como ANVISA e ANS, e fiscaliza a aplicação de recursos federais de saúde.',
      educacao: 'Aprova o Plano Nacional de Educação e fiscaliza a aplicação de recursos federais em educação.',
      economia: 'Autoriza operações de crédito de estados e municípios (inclusive limites de endividamento) — atribuição exclusiva do Senado.',
      recursos_naturais: 'Aprova indicações de dirigentes de agências reguladoras (ANP, ANM, ANA) e fiscaliza contratos federais de exploração.',
      infraestrutura: 'Aprova empréstimos para obras de infraestrutura estadual/municipal e fiscaliza concessões federais.',
      politica_externa: 'Aprova (ou rejeita) todo tratado internacional assinado pelo Presidente e as indicações de embaixadores — sem essa aprovação, o tratado não produz efeito interno.',
    },
  },
  {
    slug: 'deputado_federal',
    nome: 'Deputado Federal',
    poder: 'Legislativo federal — Câmara dos Deputados',
    mandato: '4 anos',
    resumo: 'Representa o estado na Câmara, vota leis federais e fiscaliza o governo federal.',
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
    atuacaoPorTema: {
      seguranca: 'Legisla sobre o Código Penal e as leis de organização das polícias federais, e destina emendas orçamentárias a programas de segurança.',
      saude: 'Legisla sobre normas nacionais do SUS, planos de saúde e vigilância sanitária; destina emendas a hospitais e programas de saúde.',
      educacao: 'Legisla sobre as diretrizes e bases da educação nacional (LDB) e destina emendas a escolas e universidades.',
      economia: 'Vota o orçamento da União, leis tributárias federais e regras fiscais (como o arcabouço/teto de gastos).',
      recursos_naturais: 'Legisla sobre o marco regulatório de mineração, petróleo e águas de domínio da União.',
      infraestrutura: 'Legisla sobre marcos regulatórios de concessões e destina emendas a obras de infraestrutura.',
      politica_externa: 'Não vota diretamente tratados internacionais (atribuição do Senado), mas participa de comissões de relações exteriores e pode convocar ministros para prestar contas.',
    },
  },
  {
    slug: 'deputado_estadual',
    nome: 'Deputado Estadual',
    poder: 'Legislativo estadual — Assembleia Legislativa',
    mandato: '4 anos',
    resumo: 'Vota leis estaduais e fiscaliza o governador e a administração do estado.',
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
    atuacaoPorTema: {
      seguranca: 'Fiscaliza a Polícia Militar e a Polícia Civil do estado, aprova o orçamento da Secretaria de Segurança e legisla sobre a organização dessas polícias.',
      saude: 'Fiscaliza a Secretaria Estadual de Saúde e aprova o orçamento estadual da área.',
      educacao: 'Fiscaliza a Secretaria Estadual de Educação e aprova o orçamento da rede estadual de ensino.',
      economia: 'Vota o orçamento e as leis tributárias estaduais (como o ICMS).',
      recursos_naturais: 'Fiscaliza a aplicação de royalties estaduais e legisla sobre recursos hídricos de domínio estadual.',
      infraestrutura: 'Fiscaliza obras estaduais e aprova o orçamento de infraestrutura do estado.',
      politica_externa: 'Não tem papel formal em política externa — atuação restrita ao estado.',
    },
  },
  {
    slug: 'deputado_distrital',
    nome: 'Deputado Distrital',
    poder: 'Legislativo distrital — Câmara Legislativa do DF',
    mandato: '4 anos',
    resumo: 'No DF, acumula o papel de deputado estadual e de vereador — vota leis distritais e fiscaliza o governo do DF.',
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
    atuacaoPorTema: {
      seguranca: 'Papel equivalente ao do deputado estadual, incluindo sobre a guarda civil metropolitana do DF (que, por acumular competência municipal, não existe do mesmo jeito nos demais estados).',
      saude: 'Mesmo papel do deputado estadual, aplicado à rede de saúde do DF (que também acumula gestão local).',
      educacao: 'Mesmo papel do deputado estadual, sobre a rede de ensino do DF (que inclui o que seria "ensino municipal" em outros estados).',
      economia: 'Vota o orçamento e os tributos do DF (que também acumula tributos que, em outros estados, seriam municipais).',
      recursos_naturais: 'Papel equivalente ao do deputado estadual, mais limitado pela pequena extensão territorial do DF.',
      infraestrutura: 'Fiscaliza obras e aprova o orçamento de infraestrutura viária/urbana do DF.',
      politica_externa: 'Não tem papel formal em política externa.',
    },
  },
  {
    slug: 'prefeito',
    nome: 'Prefeito',
    poder: 'Executivo municipal',
    mandato: '4 anos, com direito a uma reeleição',
    resumo: 'Chefia o governo do município — educação infantil, saúde básica, transporte e obras urbanas.',
    coberturaDisponivel: false,
    faz: [
      'Chefia a administração pública do município e nomeia secretários municipais.',
      'Sanciona, veta ou promulga as leis aprovadas pela Câmara Municipal.',
      'Pode manter uma Guarda Municipal, focada em proteger bens, serviços e instalações do município.',
      'É responsável pela educação infantil e pelo ensino fundamental, pela atenção básica de saúde e por serviços urbanos (trânsito local, coleta de lixo, iluminação pública).',
      'Envia à Câmara Municipal a proposta de orçamento do município.',
    ],
    naoFaz: [
      'Não comanda a Polícia Militar nem a Polícia Civil — são estaduais.',
      'Não legisla sobre matérias de competência estadual ou federal.',
      'Não decide sobre tributos estaduais ou federais — só os municipais (como IPTU e ISS).',
    ],
    atuacaoPorTema: {
      seguranca: 'Pode manter Guarda Municipal (proteção de bens e instalações, não policiamento ostensivo geral) e políticas locais de prevenção, como iluminação pública; não comanda a Polícia Militar nem a Civil.',
      saude: 'Administra a atenção básica de saúde do município (postos de saúde, UBS); depende de repasses estaduais e federais para média e alta complexidade.',
      educacao: 'Responsável pela educação infantil (creches, pré-escola) e pelo ensino fundamental na rede municipal.',
      economia: 'Define e cobra os tributos municipais (IPTU, ISS) e o orçamento do município.',
      recursos_naturais: 'Cuida do licenciamento ambiental de impacto local, da coleta e destinação do lixo urbano e das áreas verdes municipais; recursos como petróleo e minério não são competência do município.',
      infraestrutura: 'Executa obras urbanas locais — pavimentação, saneamento básico (junto a concessionárias), transporte público e trânsito municipal.',
      politica_externa: 'Não tem papel formal em política externa — pode firmar acordos de cooperação com outras cidades (geminação), sem status de tratado internacional.',
    },
  },
  {
    slug: 'vereador',
    nome: 'Vereador',
    poder: 'Legislativo municipal — Câmara Municipal',
    mandato: '4 anos',
    resumo: 'Vota leis do município e fiscaliza o prefeito e a administração municipal.',
    coberturaDisponivel: false,
    faz: [
      'Propõe, discute e vota leis municipais.',
      'Participa da elaboração e aprovação do orçamento do município.',
      'Fiscaliza o prefeito e a administração municipal.',
      'Pode instaurar CPIs municipais.',
    ],
    naoFaz: [
      'Não administra: não é Poder Executivo, não gerencia secretarias nem executa obras diretamente.',
      'Não legisla sobre matérias de competência estadual ou federal.',
      'Não representa o município fora dele — atua só dentro da Câmara Municipal.',
    ],
    atuacaoPorTema: {
      seguranca: 'Fiscaliza a Guarda Municipal (quando existir) e aprova o orçamento da área de segurança urbana do município.',
      saude: 'Fiscaliza a Secretaria Municipal de Saúde e aprova o orçamento da rede básica de saúde local.',
      educacao: 'Fiscaliza a Secretaria Municipal de Educação e aprova o orçamento da rede municipal (creches e ensino fundamental).',
      economia: 'Vota o orçamento municipal e os tributos locais (IPTU, ISS).',
      recursos_naturais: 'Fiscaliza a gestão de resíduos sólidos e das áreas verdes municipais; sem competência sobre recursos minerais ou energéticos.',
      infraestrutura: 'Fiscaliza obras municipais e aprova o orçamento de infraestrutura urbana local.',
      politica_externa: 'Não tem papel formal em política externa.',
    },
  },
];

function popoverCargo(c) {
  return `
    <span class="cargo-chip-wrap">
      <button type="button" class="cargo-chip">${c.nome}</button>
      <span class="cargo-tooltip" role="tooltip">
        <strong>${c.nome}</strong>
        <span class="cargo-tooltip-meta">${c.poder} · mandato de ${c.mandato}</span>
        <p>${c.resumo}</p>
        <a href="/cargo/${c.slug}">Saiba mais →</a>
      </span>
    </span>`;
}

/**
 * Versão compacta pra homepage: uma fileira de "chips", um por cargo. Passar o mouse (desktop)
 * ou tocar (mobile — toca de novo em qualquer lugar da tela fecha) mostra um resumo curto +
 * link "Saiba mais" pra página completa do cargo (`renderCargoPagina`). O script inline no fim
 * é a única concessão a JS nesta seção — sem ele, o link "Saiba mais" de cada cargo ainda
 * funciona (basta que o usuário abra a página do cargo direto), só o hover/tap-to-toggle é que
 * não funciona sem JS.
 */
export function renderResumoCargos() {
  return `
    <section class="cargo-guia" aria-labelledby="guia-cargos-titulo">
      <h2 id="guia-cargos-titulo" class="secao-titulo">Entenda cada cargo</h2>
      <p class="secao-subtitulo">
        Antes de comparar Representantes Públicos, vale saber o que cada cargo pode e não pode
        fazer. Toque ou passe o mouse pra ver um resumo.
      </p>
      <div class="cargo-chips">
        ${GUIA_CARGOS.map(popoverCargo).join('')}
      </div>
      <script>
        (function () {
          var chips = document.querySelectorAll('.cargo-chip');
          chips.forEach(function (chip) {
            chip.addEventListener('click', function (e) {
              var pop = chip.nextElementSibling;
              var aberto = pop.classList.contains('aberto');
              document.querySelectorAll('.cargo-tooltip.aberto').forEach(function (p) { p.classList.remove('aberto'); });
              if (!aberto) pop.classList.add('aberto');
              e.stopPropagation();
            });
          });
          document.addEventListener('click', function () {
            document.querySelectorAll('.cargo-tooltip.aberto').forEach(function (p) { p.classList.remove('aberto'); });
          });
        })();
      </script>
    </section>`;
}

function linhaTema(tema, cargo) {
  const texto = cargo.atuacaoPorTema[tema.slug];
  const semPapel = /não tem papel formal/i.test(texto);
  return `
    <div class="tema-linha${semPapel ? ' tema-linha--sem-papel' : ''}">
      <h4>${tema.nome}</h4>
      <p>${texto}</p>
    </div>`;
}

/** Página completa de um cargo (/cargo/:slug) — faz/não-faz + atuação nos 7 grandes temas. */
export function renderCargoPagina(slug) {
  const c = GUIA_CARGOS.find((x) => x.slug === slug);
  if (!c) return null;
  const listaFaz = c.faz.map((f) => `<li>${f}</li>`).join('');
  const listaNaoFaz = c.naoFaz.map((f) => `<li>${f}</li>`).join('');
  const outros = GUIA_CARGOS.filter((x) => x.slug !== slug);
  return `
    <p style="margin-top:0;"><a href="/#guia-cargos-titulo" style="font-size:13px;">← Voltar ao guia dos cargos</a></p>
    <span class="hero-eyebrow">${c.poder}</span>
    <h1 style="margin:8px 0 4px;">${c.nome}</h1>
    <p class="secao-subtitulo" style="margin:0 0 8px; text-align:left; max-width:none;">
      Mandato de ${c.mandato}. ${c.resumo}
    </p>
    ${c.coberturaDisponivel === false ? `<p class="cargo-sem-cobertura">O VotoCheck ainda não cobre candidaturas para este cargo — a busca de candidatos não inclui ${c.nome.toLowerCase()}s por enquanto. Esta página é só o guia institucional do cargo.</p>` : ''}
    <div class="cargo-guia-corpo" style="padding-bottom:8px;">
      <div>
        <h4 class="cargo-guia-titulo cargo-guia-titulo--faz">O que pode fazer</h4>
        <ul>${listaFaz}</ul>
      </div>
      <div>
        <h4 class="cargo-guia-titulo cargo-guia-titulo--nao">O que não faz</h4>
        <ul>${listaNaoFaz}</ul>
      </div>
    </div>
    <h2 class="secao-titulo" style="text-align:left; margin-top:40px;">Atuação por tema</h2>
    <p class="secao-subtitulo" style="text-align:left; max-width:none;">
      Como esse cargo se relaciona (ou não) com as grandes pautas públicas.
    </p>
    <div class="temas-grid">
      ${TEMAS.map((t) => linhaTema(t, c)).join('')}
    </div>
    <h2 class="secao-titulo" style="text-align:left; margin-top:40px;">Outros cargos</h2>
    <div class="cargo-chips" style="justify-content:flex-start;">
      ${outros.map((o) => `<a class="cargo-chip" style="text-decoration:none; display:inline-block;" href="/cargo/${o.slug}">${o.nome}</a>`).join('')}
    </div>`;
}
