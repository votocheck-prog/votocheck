/**
 * VotoCheck — Página de apoio "Partidos Políticos".
 *
 * Escopo desta 1ª versão (combinado com o Rodrigo em 20/09/2026 — ver pendência na seção 19 do
 * documento de continuidade): classificação de família ideológica + uma nota histórica bem
 * resumida por partido, mais os representantes REAIS de cada partido puxados do banco (nunca
 * inventados). NÃO inclui ainda a árvore genealógica completa de fusões/cisões nem uma leitura
 * de "posições em pautas" por partido — isso fica pra uma 2ª fase, que exige checagem fato a
 * fato partido por partido (ver aviso no topo da página em si).
 *
 * `familiaIdeologica`: classificação corrente na ciência política/imprensa especializada, não
 * uma opinião do VotoCheck — igual ao restante do produto, nunca é usada pra ranquear partido
 * como "melhor" ou "pior".
 *
 * `representantes`: NÃO é uma lista de "principais" no sentido de mérito — é um recorte de até
 * 10 candidaturas de 2026 do partido, em ordem alfabética (critério neutro, igual ao resto do
 * produto). Alimentado por consulta ao D1 (ver `carregarRepresentantesPorPartido` em
 * `src/index.js`), nunca por texto fixo — link de cada nome vai pro perfil real na plataforma.
 *
 * ATUALIZAÇÃO 23/09/2026 — diagrama de espectro + interatividade (pedido do Rodrigo: as páginas
 * de apoio estavam "um monte de texto despejado, sem interatividade nenhuma").
 *
 * Decisão de design deliberada: o diagrama de espectro (Esquerda → Direita) usa UMA cor só
 * (var(--primary), a mesma do resto do site) pra todos os partidos, nunca uma escala
 * esquerda=vermelho/direita=azul (ou o inverso). Political science aside, no imaginário
 * brasileiro essas cores já carregam associação partidária forte (PT/vermelho, oposição/azul em
 * ciclos recentes) — colorir por posição no espectro seria o produto tomando partido visualmente,
 * o que fere o mesmo princípio que já impede "posição em pautas" por partido (ver nota acima e
 * decisão do Rodrigo em 20/09/2026). Posição = só posição no eixo horizontal, nunca cor.
 *
 * `faixaEspectro()` é DERIVADA automaticamente do texto de `familiaIdeologica` já existente e já
 * aprovado — não é um novo campo hardcoded por partido. Isso evita ter duas fontes de verdade
 * (texto + posição) que podem divergir com o tempo; qualquer ajuste futuro na classificação de
 * um partido já se reflete no diagrama sem precisar editar em dois lugares. Partidos cuja família
 * é composta (ex.: "Centro-esquerda / esquerda") ocupam uma faixa entre duas zonas — a posição
 * exibida é o centro dessa faixa, arredondado; a classificação completa aparece no atributo
 * `title` do chip (tooltip nativo do navegador, sem JS) e continua no card abaixo, inalterada.
 *
 * `presidenteNacional` (adicionado 23/09/2026, a pedido do Rodrigo — decisão explícita dele
 * depois de eu recomendar manter a página só com dado automático, dado o risco de defasagem):
 * cada entrada foi checada uma a uma no site oficial do partido (ou, quando o partido não tinha
 * página oficial clara, em pelo menos duas matérias de veículos diferentes) NESTA sessão
 * (verificadoEm = 23/09/2026) — nunca por memória de treinamento, que pode estar desatualizada.
 * `fonteUrl` é sempre a fonte usada pra confirmar. `nota`, quando presente, sinaliza um caso
 * especial encontrado na pesquisa (disputa judicial em curso, sucessão recente, ou estrutura sem
 * presidente único) — ela é IMPORTANTE, não decorativa: mostra por que aquele nome específico tem
 * mais chance de já estar desatualizado quando alguém ler isso depois.
 *
 * DELIBERADAMENTE NÃO incluído nesta rodada: "líder de bancada" (pedido original do Rodrigo, ao
 * lado do presidente). Motivo: liderança de bancada na Câmara/Senado muda por sessão legislativa
 * (às vezes mais de uma vez por ano) — MUITO mais volátil que presidência partidária, que já se
 * mostrou instável o bastante nesta pesquisa (ver Cidadania e Solidariedade abaixo). Fixar um nome
 * aqui ficaria desatualizado rápido demais pra manter à mão. Alternativa mais segura: linkar
 * direto pra página oficial de lideranças da Câmara (fonte sempre atual, sem curadoria manual) —
 * ver `LINK_LIDERANCAS_CAMARA` e o aviso na própria página. Rodrigo topou essa troca quando
 * apresentei o achado (ver conversa desta sessão).
 *
 * `fundacao` (adicionado 23/09/2026, a pedido do Rodrigo): ano de fundação de cada partido, com
 * nota entre parênteses quando a sigla atual é resultado de uma refundação/renomeação (ex.: PL
 * registrado em 2006 como "Partido da República", renomeado PL em 2019) — pra não sugerir uma
 * continuidade histórica maior do que a real. Exibido de forma resumida no card (só o ano) com o
 * texto completo disponível no atributo `title` (tooltip nativo).
 *
 * LIDERANÇA POR MAIOR CARGO PÚBLICO EM EXERCÍCIO (adicionado 23/09/2026, a pedido do Rodrigo —
 * critério dele: "presidente/senador/ministro/dep federal/governador/dep estadual, prefeito/
 * vereador, etc"): ALÉM da presidência nacional curada acima, cada card agora também pode mostrar,
 * dinamicamente (consulta ao D1, nunca hardcoded — ver `carregarLiderancaPorCargoPorPartido` em
 * `src/index.js`), quem entre os filiados ATUAIS do partido (`filiacao_partidaria`, não
 * `candidatura`) ocupa hoje o cargo público de maior hierarquia institucional. A ordem de
 * hierarquia é a mesma de `cargos_guia.js`/tabela `cargo`: presidente > governador > senador >
 * deputado federal > deputado estadual > deputado distrital.
 *
 * LACUNA CONHECIDA, documentada em vez de escondida: o critério que o Rodrigo pediu inclui
 * "ministro" e "prefeito/vereador", mas o schema atual do VotoCheck NÃO tem esses cargos como
 * mandato consultável — ministro nunca teve coleta implementada, e prefeito/vereador são de 2024
 * (fora do ciclo eleitoral de 2026 que a base cobre agora), então não há filiação-a-mandato pra
 * cruzar. Ou seja: esta consulta reflete o maior cargo entre os 6 cobertos pela nossa base hoje,
 * não o "maior cargo público" no sentido pleno. O aviso no topo da página deixa isso explícito.
 * Quando/se a coleta de prefeitos/vereadores (2024) ou de ministérios for implementada, esta
 * consulta se estende sozinha (é dinâmica) — só precisa incluir os novos cargos na tabela `cargo`.
 *
 * Por que os DOIS campos (presidência curada + maior cargo em exercício) e não um só: podem ser
 * pessoas diferentes (ex.: o presidente do partido não ocupa nenhum mandato eletivo no momento,
 * ou o parlamentar mais graduado do partido não é o presidente partidário) — mostrar os dois é
 * mais honesto do que forçar uma única resposta pra "quem lidera o partido", pergunta que não tem
 * resposta única na prática política brasileira.
 *
 * Mesma lógica de hierarquia foi aplicada à ordenação da lista de `representantes` de cada card
 * (antes só alfabética) — ver `ORDER BY` em `carregarRepresentantesPorPartido`: agora ordena por
 * cargo (maior primeiro) e só depois por nome, atendendo ao pedido original do Rodrigo de que "os
 * principais representantes do partido devem vir de hierarquia política".
 */
import { nomeProprio } from './perfil_html.js';
import { pagina, escapeHtml } from './estilo_html.js';
import { LOGOS_PARTIDOS, LOGOS_COMMONS } from './partidos_logos.js';
import { Icone } from './icones.js';

export const LINK_LIDERANCAS_CAMARA = 'https://www.camara.leg.br/deputados/liderancas-e-bancadas/liderancas';
export const LIDERANCA_VERIFICADA_EM = '23/09/2026';

export const PARTIDOS_INFO = [
  { sigla: 'PT', numero: 13, nome: 'Partido dos Trabalhadores', familiaIdeologica: 'Centro-esquerda / esquerda', fundacao: '1980', historico: 'Fundado em 1980, a partir do movimento sindical e de setores da esquerda e da Igreja Católica progressista.',
    presidenteNacional: { nome: 'Edinho Silva', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PL', numero: 22, nome: 'Partido Liberal', familiaIdeologica: 'Direita', fundacao: '2006 (registrado como Partido da República; renomeado PL em 2019)', historico: 'Sigla histórica reorganizada ao longo do tempo por sucessivas fusões com outras legendas de centro-direita e direita.',
    presidenteNacional: { nome: 'Valdemar Costa Neto', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'MDB', numero: 15, nome: 'Movimento Democrático Brasileiro', familiaIdeologica: 'Centro', fundacao: '1966', historico: 'Origem no MDB fundado em 1966, durante o bipartidarismo do regime militar; um dos partidos mais antigos em atividade contínua.',
    presidenteNacional: { nome: 'Baleia Rossi', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSDB', numero: 45, nome: 'Partido da Social Democracia Brasileira', familiaIdeologica: 'Centro / centro-direita', fundacao: '1988', historico: 'Fundado em 1988 por um grupo de dissidentes do então MDB/PMDB.',
    presidenteNacional: { nome: 'Marconi Perillo', fonteUrl: 'https://www.psdb.org.br/quem-e-quem/marconi-perillo/' } },
  { sigla: 'PP', numero: 11, nome: 'Progressistas', familiaIdeologica: 'Centro-direita / direita', fundacao: '1993 (como PPR, de fusões com raiz na Arena; nome "Progressistas" desde 2017)', historico: 'Resultado de fusões sucessivas de legendas com raiz na antiga Arena, do regime militar.',
    presidenteNacional: { nome: 'Ciro Nogueira', fonteUrl: 'https://progressistas.org.br/o-presidente/' } },
  { sigla: 'União Brasil', numero: 44, nome: 'União Brasil', familiaIdeologica: 'Centro-direita / direita', fundacao: '2022', historico: 'Criado em 2021–2022 pela fusão do DEM (herdeiro histórico da Arena/PFL) com o PSL.',
    presidenteNacional: { nome: 'Antonio Rueda', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSD', numero: 55, nome: 'Partido Social Democrático', familiaIdeologica: 'Centro / centro-direita', fundacao: '2011', historico: 'Fundado em 2011 por Gilberto Kassab, reunindo dissidentes de vários outros partidos.',
    presidenteNacional: { nome: 'Gilberto Kassab', fonteUrl: 'https://psd.org.br/executiva-nacional/' } },
  { sigla: 'Republicanos', numero: 10, nome: 'Republicanos', familiaIdeologica: 'Direita', fundacao: '2005 (como PRB; renomeado Republicanos em 2019)', historico: 'Sigla renomeada em 2019 — antes chamava-se PRB.',
    presidenteNacional: { nome: 'Marcos Pereira', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PDT', numero: 12, nome: 'Partido Democrático Trabalhista', familiaIdeologica: 'Centro-esquerda', fundacao: '1980', historico: 'Fundado por Leonel Brizola em torno de 1979–1980, como herdeiro do trabalhismo histórico de Getúlio Vargas.',
    presidenteNacional: { nome: 'Carlos Lupi', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSB', numero: 40, nome: 'Partido Socialista Brasileiro', familiaIdeologica: 'Centro-esquerda', fundacao: '1985', historico: 'Refundado em 1985, remetendo a uma sigla socialista anterior ao regime militar.',
    presidenteNacional: { nome: 'João Campos', fonteUrl: 'https://psb40.org.br/quem-somos/presidente/', nota: 'Assumiu em 1º/06/2025, sucedendo Carlos Siqueira — presidência recente.', risco: true } },
  { sigla: 'PSOL', numero: 50, nome: 'Partido Socialismo e Liberdade', familiaIdeologica: 'Esquerda', fundacao: '2004', historico: 'Fundado em 2004 por um grupo de dissidentes do PT.',
    presidenteNacional: { nome: 'Paula Coradi', fonteUrl: 'https://psol50.org.br/presidencia/', nota: 'O PSOL criou o cargo único de presidência recentemente — antes o partido era dirigido por coordenação coletiva.', risco: true } },
  { sigla: 'PCdoB', numero: 65, nome: 'Partido Comunista do Brasil', familiaIdeologica: 'Esquerda', fundacao: '1962', historico: 'Fundado em 1962, a partir de uma cisão do antigo Partido Comunista Brasileiro (PCB).',
    presidenteNacional: { nome: 'Luciana Santos', fonteUrl: 'https://pcdob.org.br/congressos/pcdob-elege-nova-direcao-e-reconduz-luciana-santos-a-presidencia/' } },
  { sigla: 'Podemos', numero: 20, nome: 'Podemos', familiaIdeologica: 'Centro', fundacao: '1945 (como PTN; renomeado Podemos em 2017)', historico: 'Sigla renomeada em 2017 — antes chamava-se PTN.',
    presidenteNacional: { nome: 'Renata Abreu', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'Novo', numero: 30, nome: 'Partido Novo', familiaIdeologica: 'Direita liberal', fundacao: '2015', historico: 'Fundado em 2015, com plataforma declaradamente liberal na economia.',
    presidenteNacional: { nome: 'Eduardo Ribeiro', fonteUrl: 'https://novo.org.br/diretorio-nacional/' } },
  { sigla: 'Cidadania', numero: 23, nome: 'Cidadania', familiaIdeologica: 'Centro', fundacao: '1992 (refundação da sigla; PPS até 2019, Cidadania desde então)', historico: 'Sigla renomeada em 2019 — antes chamava-se PPS, ela mesma sucessora do antigo PCB refundado em 1992.',
    presidenteNacional: { nome: 'Alex Manente', fonteUrl: 'https://www.correiobraziliense.com.br/politica/2026/07/7457292-tse-garante-comando-de-alex-manente-no-cidadania-ate-as-eleicoes-de-2026.html', nota: 'Presidência disputada judicialmente ao longo de 2026 (idas e vindas entre Manente e Roberto Freire); o TSE confirmou Manente "até as eleições de 2026" em julho — pode mudar de novo depois do pleito. É o card com maior chance de estar desatualizado quando alguém ler isso.', risco: true } },
  { sigla: 'Solidariedade', numero: 77, nome: 'Solidariedade', familiaIdeologica: 'Centro', fundacao: '2013', historico: 'Fundado em 2013 por um grupo ligado ao movimento sindical, dissidente do PCdoB.',
    presidenteNacional: { nome: 'Paulinho da Força', fonteUrl: 'https://solidariedade.org.br/perfil/paulinho-da-forca/', nota: 'Reassumiu a presidência depois da prisão do sucessor indicado, Eurípedes Camargo — sucessão recente.', risco: true } },
  { sigla: 'Rede', numero: 18, nome: 'Rede Sustentabilidade', familiaIdeologica: 'Centro-esquerda / ambientalista', fundacao: '2015', historico: 'Fundado em 2015 por Marina Silva, com pauta socioambiental como eixo central.',
    presidenteNacional: { semPresidenteUnico: true, nota: 'O estatuto da Rede não prevê presidente único: dois porta-vozes revezam a função a cada ano. Marina Silva, fundadora, deixou de ser filiada. Divulgar um único nome aqui seria impreciso sobre a própria estrutura do partido — por isso não cravamos um nome.' } },
  { sigla: 'PV', numero: 43, nome: 'Partido Verde', familiaIdeologica: 'Centro-esquerda / ambientalista', fundacao: '1986', historico: 'Fundado em 1986, um dos primeiros partidos verdes da América Latina.',
    presidenteNacional: { nome: 'José Luiz Penna', fonteUrl: 'https://pv.org.br/jose-luiz-penna-presidente/', nota: 'No cargo continuamente há cerca de 25 anos — o mais estável desta lista.' } },
  { sigla: 'Avante', numero: 70, nome: 'Avante', familiaIdeologica: 'Centro', fundacao: '1988 (como PTdoB; renomeado Avante em 2017)', historico: 'Sigla renomeada em 2017 — antes chamava-se PTdoB.',
    presidenteNacional: { nome: 'Luís Tibé', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  // 26/09/2026: os 11 partidos que faltavam para completar os 30 com candidatos em 2026. Presidência
  // conforme a página oficial do TSE (partidos registrados); família ideológica conforme a
  // classificação usual das enciclopédias (Wikipédia pt/en) na data — mesmo critério dos demais.
  { sigla: 'MISSÃO', numero: 14, nome: 'Partido Missão', familiaIdeologica: 'Direita', fundacao: '2023 (registro no TSE em 2025)', historico: 'Criado em 2023 por integrantes do Movimento Brasil Livre (MBL); teve o registro deferido pelo TSE em novembro de 2025. 2026 é sua primeira eleição geral.',
    presidenteNacional: { nome: 'Renan Santos', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'PSTU', numero: 16, nome: 'Partido Socialista dos Trabalhadores Unificado', familiaIdeologica: 'Esquerda', fundacao: '1994 (registro em 1995)', historico: 'Formado em 1994 pela fusão da Convergência Socialista com outros grupos que deixaram o PT; de orientação trotskista.',
    presidenteNacional: { nome: 'José Maria de Almeida', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'PCB', numero: 21, nome: 'Partido Comunista Brasileiro', familiaIdeologica: 'Esquerda', fundacao: '1922 (refundado em 1993)', historico: 'Fundado em 1922. Em 1992 parte da direção criou o PPS (hoje Cidadania); militantes refundaram o PCB em 1993 com a sigla e os símbolos históricos.',
    presidenteNacional: { nome: 'Edmilson Costa', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'PRD', numero: 25, nome: 'Partido Renovação Democrática', familiaIdeologica: 'Centro', fundacao: '2023 (fusão de PTB e Patriota)', historico: 'Nasceu da fusão do PTB com o Patriota, homologada pelo TSE em novembro de 2023.',
    presidenteNacional: { nome: 'Marcus Vinícius de Vasconcelos Ferreira', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'DC', numero: 27, nome: 'Democracia Cristã', familiaIdeologica: 'Centro-direita', fundacao: '1995 (como PSDC; renomeado DC em 2018)', historico: 'Fundado em 1995 como Partido Social Democrata Cristão (PSDC); passou a se chamar Democracia Cristã em 2018.',
    presidenteNacional: { nome: 'João Caldas da Silva', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'PRTB', numero: 28, nome: 'Partido Renovador Trabalhista Brasileiro', familiaIdeologica: 'Direita', fundacao: '1994 (registro em 1997)', historico: 'Fundado em 1994; ganhou projeção com as candidaturas presidenciais de Levy Fidelix e com a vice-presidência de Hamilton Mourão (eleito em 2018).',
    presidenteNacional: { nome: 'Leonardo Alves de Araújo', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'PCO', numero: 29, nome: 'Partido da Causa Operária', familiaIdeologica: 'Esquerda', fundacao: '1995 (registro em 1997)', historico: 'Surgiu em 1995 de dissidentes da corrente Causa Operária, que atuava dentro do PT; de orientação trotskista.',
    presidenteNacional: { nome: 'Rui Costa Pimenta', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'Mobiliza', numero: 33, nome: 'Mobilização Nacional', familiaIdeologica: 'Centro / centro-direita', fundacao: '1984 (como PMN)', historico: 'Fundado em 1984 como Partido da Mobilização Nacional (PMN), com pauta nacionalista; hoje usa a sigla Mobiliza.',
    presidenteNacional: { nome: 'Antonio Carlos Bosco Massarollo', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'Democrata', numero: 35, nome: 'Democrata', familiaIdeologica: 'Centro-direita', fundacao: '2008 (como PMB; renomeado Democrata em 2025)', historico: 'Criado em 2008 como Partido da Mulher Brasileira (PMB), registrado em 2015; o TSE aprovou a mudança de nome para Democrata em dezembro de 2025.',
    presidenteNacional: { nome: 'Suêd Haidar Nogueira', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'Agir', numero: 36, nome: 'Agir', familiaIdeologica: 'Centro / centro-direita', fundacao: '1985 (como PJ; depois PRN e PTC)', historico: 'Fundado em 1985 como Partido da Juventude; como PRN elegeu Fernando Collor em 1989; foi PTC a partir de 2000 e passou a se chamar Agir em 2022.',
    presidenteNacional: { nome: 'Daniel S. Tourinho', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
  { sigla: 'UP', numero: 80, nome: 'Unidade Popular', familiaIdeologica: 'Esquerda', fundacao: '2016 (registro em 2019)', historico: 'Fundada em 2016 a partir de movimentos populares; obteve registro no TSE em dezembro de 2019.',
    presidenteNacional: { nome: 'Leonardo Péricles', fonteUrl: 'https://www.tse.jus.br/partidos/partidos-registrados-no-tse/registrados-no-tse' } },
];

// ATUALIZAÇÃO 24/09/2026 (pedido do Rodrigo): PARTIDOS_INFO acima está em ordem "como foi
// digitado" (nenhum critério — coincidência de PT vir primeiro é ruim de imagem, ainda mais em
// tempo de polarização, mesmo sem intenção nenhuma). Critério escolhido pra exibição:
// número eleitoral oficial do TSE (o mesmo número da urna) — numérico, oficial, neutro, e é o
// único critério "natural" que todo brasileiro já reconhece sem precisar de explicação (ao
// contrário de "ano de fundação", que embutiria uma narrativa de "quem é mais antigo/legítimo",
// ou "ordem alfabética", que muda a depender de usar a sigla ou o nome completo). A legenda no
// topo da página deixa esse critério explícito — ver `LEGENDA_ORDENACAO` e seu uso em
// `renderPartidos`. NUNCA ordenar por número de filiados, de candidatos, ou qualquer métrica de
// "relevância" — isso sim seria o produto tomando partido.
export const LEGENDA_ORDENACAO =
  'Partidos listados em ordem crescente do número eleitoral oficial (o mesmo número usado na urna) — critério numérico e neutro, não é ranking de relevância, tamanho de bancada ou preferência do VotoCheck.';

export function partidosOrdenados() {
  return [...PARTIDOS_INFO].sort((a, b) => a.numero - b.numero);
}

export const ZONAS_ESPECTRO = ['Esquerda', 'Centro-esquerda', 'Centro', 'Centro-direita', 'Direita'];

/** Deriva a faixa [zonaMin, zonaMax] (1–5) direto do texto de `familiaIdeologica`. Ver nota no topo do arquivo.
 * Exportada (24/09/2026) para reaproveitamento no filtro de partido/ideologia e na pergunta de
 * espectro do quiz "Meu VotoCheck" — ver src/lib/quiz_config.js: nunca duplicar essa classificação. */
export function faixaEspectro(familia) {
  const tokens = familia.toLowerCase().split('/').map((t) => t.trim());
  const zonas = [];
  for (const t of tokens) {
    if (t.includes('centro-esquerda')) zonas.push(2);
    else if (t.includes('centro-direita')) zonas.push(4);
    else if (t.includes('esquerda')) zonas.push(1);
    else if (t.includes('direita')) zonas.push(5);
    else if (t.includes('centro')) zonas.push(3);
  }
  if (!zonas.length) zonas.push(3);
  return [Math.min(...zonas), Math.max(...zonas)];
}

export function zonaPrincipal(familia) {
  const [min, max] = faixaEspectro(familia);
  return Math.round((min + max) / 2);
}

/** Slug estável pro anchor do card (usado tanto pelos chips do diagrama quanto pelo card em si). */
export function siglaSlug(sigla) {
  return sigla
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Ano curto (ex.: "2006") pro rótulo do card — o texto completo (com nota de renomeação, quando
 * houver) fica no atributo `title`, não é escondido, só não polui a linha do cabeçalho. */
function anoFundacaoCurto(fundacao) {
  const m = /^\d{4}/.exec(fundacao || '');
  return m ? m[0] : fundacao || '';
}

/** Logo oficial do partido em base64 (ver `partidos_logos.js` — sourced e licença documentadas lá).
 * Retorna null quando ainda não temos logo pra essa sigla, pra sempre haver um fallback tratável. */
function logoPartidoHtml(sigla) {
  const logo = LOGOS_PARTIDOS[sigla];
  if ((logo && logo.base64) || LOGOS_COMMONS[sigla]) {
    return `<img class="partido-logo" src="/static/partido/${siglaSlug(sigla)}?v=2" alt="Logo do ${escapeHtml(sigla)}" width="48" height="48" loading="lazy" />`;
  }
  // Fallback sem logo: iniciais num círculo, nunca uma imagem quebrada.
  const iniciais = sigla.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase();
  return `<span class="partido-logo partido-logo--fallback" aria-hidden="true">${escapeHtml(iniciais)}</span>`;
}

const CARGOS_ORDEM = [
  ['presidente', 'Presidente'], ['governador', 'Governador'], ['senador', 'Senador'],
  ['deputado_federal', 'Dep. federal'], ['deputado_estadual', 'Dep. estadual'], ['deputado_distrital', 'Dep. distrital'],
];

const ESTILO_PARTIDOS = `
  .pt-hero { background: var(--navy); color: #fff; padding: 52px 0 40px; position: relative; overflow: hidden; }
  .pt-hero h1 { color: #fff; font-size: clamp(32px, 4.6vw, 52px); margin: 0 0 12px; }
  .pt-hero p { color: #C3CDF0; font-size: 18px; max-width: 700px; margin: 0; }
  .pt-kpis { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 26px; }
  .pt-kpis b { display: block; font-family: var(--font-display); font-size: 34px; color: #fff; }
  .pt-kpis span { font-size: 13.5px; color: #9AA7D6; }
  .pt-espectro { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 22px; margin-top: -28px; position: relative; z-index: 2; box-shadow: var(--shadow); }
  .pt-eixo { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; }
  .pt-zona { border-radius: 12px; padding: 12px 10px; background: var(--paper); }
  .pt-zona h3 { font-family: var(--font-body); font-size: 12px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; text-align: center; }
  .pt-zona .chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .pt-zona a { font-size: 13px; font-weight: 700; text-decoration: none; color: var(--ink); background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; }
  .pt-zona a:hover { border-color: var(--blue); color: var(--blue); }
  .pt-grad { height: 6px; border-radius: 999px; margin: 14px 0 6px; background: linear-gradient(90deg, #7A8BD6, #B9C4EA 50%, #7A8BD6); opacity: .6; }
  .pt-grad-rot { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
  @media (max-width: 760px) { .pt-eixo { grid-template-columns: 1fr; } .pt-zona .chips { justify-content: flex-start; } .pt-zona h3 { text-align: left; } }
  .pt-ferramentas { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 28px 0 8px; }
  .pt-ferramentas input { flex: 1; min-width: 220px; padding: 13px 16px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 15px; }
  .pt-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin-top: 14px; }
  @media (max-width: 860px) { .pt-grid { grid-template-columns: 1fr; } }
  .pt-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px; scroll-margin-top: 90px; display: flex; flex-direction: column; }
  .pt-card:target { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.15); }
  .pt-topo { display: grid; grid-template-columns: 56px 1fr auto; gap: 14px; align-items: center; }
  .pt-topo .partido-logo { width: 56px; height: 56px; border-radius: 14px; object-fit: contain; background: #fff; border: 1px solid var(--line); padding: 4px; }
  .pt-topo .partido-logo--fallback { display: grid; place-items: center; font-weight: 800; font-size: 15px; color: var(--blue); background: var(--blue-50); border: 0; }
  .pt-sigla { font-family: var(--font-display); font-weight: 800; font-size: 22px; line-height: 1.1; }
  .pt-nome { font-size: 13.5px; color: var(--muted); }
  .pt-num { text-align: center; background: var(--navy); color: #fff; border-radius: 12px; padding: 6px 12px; }
  .pt-num small { display: block; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #93A2D8; }
  .pt-num b { font-family: var(--font-display); font-size: 24px; line-height: 1; }
  .pt-fam { display: inline-block; margin: 14px 0 8px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--blue); background: var(--blue-50); border-radius: 999px; padding: 4px 10px; }
  .pt-hist { font-size: 14.5px; color: var(--ink-2); margin: 0 0 12px; }
  .pt-linha { font-size: 13.5px; color: var(--ink-2); padding: 8px 0; border-top: 1px solid var(--line); }
  .pt-linha a { font-weight: 600; }
  .pt-cands { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line); }
  .pt-cands-tit { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); margin-bottom: 8px; }
  .pt-cands-tit b { color: var(--ink); font-size: 15px; }
  .pt-mini { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; margin-bottom: 10px; }
  .pt-mini div { background: var(--paper); border-radius: 10px; padding: 7px 8px; font-size: 12px; color: var(--muted); }
  .pt-mini b { display: block; font-size: 16px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .pt-reps { display: flex; flex-wrap: wrap; gap: 6px; }
  .pt-reps a { font-size: 12.5px; text-decoration: none; color: var(--ink-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
  .pt-reps a:hover { border-color: var(--blue); color: var(--blue); }
`;

/** Diagrama de espectro: 5 zonas com os partidos (links para o card). */
function renderDiagramaEspectro() {
  const porZona = ZONAS_ESPECTRO.map(() => []);
  for (const p of partidosOrdenados()) porZona[zonaPrincipal(p.familiaIdeologica) - 1].push(p);
  return `
  <section class="pt-espectro" aria-labelledby="espectro-titulo">
    <h2 id="espectro-titulo" style="font-size:20px;margin:0 0 4px">Onde cada partido fica no espectro</h2>
    <p style="color:var(--muted);font-size:14px;margin:0 0 16px">Pela família ideológica atribuída por ciência política e imprensa especializada. Toque num partido para ver o card.</p>
    <div class="pt-eixo">${porZona
      .map(
        (ps, i) => `<div class="pt-zona"><h3>${ZONAS_ESPECTRO[i]}</h3><div class="chips">${ps
          .map((p) => `<a href="#partido-${siglaSlug(p.sigla)}" title="${escapeHtml(p.familiaIdeologica)}">${escapeHtml(p.sigla)}</a>`)
          .join('') || '<span style="color:var(--muted)">—</span>'}</div></div>`
      )
      .join('')}</div>
    <div class="pt-grad"></div><div class="pt-grad-rot"><span>Mais Estado</span><span>Estado no essencial</span></div>
  </section>`;
}

/** Monta a página de partidos (v2, 26/09/2026). */
export function renderPartidos({ representantesPorSigla = {}, liderancaCargoPorSigla = {}, contagemPorSigla = {} } = {}) {
  const lista = partidosOrdenados();
  const totalCands = Object.values(contagemPorSigla).reduce((a, c) => a + (c.total || 0), 0);
  const cards = lista
    .map((p) => {
      const reps = representantesPorSigla[p.sigla] || [];
      const cont = contagemPorSigla[p.sigla] || {};
      const pres = p.presidenteNacional;
      const presidencia = pres
        ? pres.semPresidenteUnico
          ? `<div class="pt-linha">Sem presidente único: ${escapeHtml(pres.nota)}</div>`
          : `<div class="pt-linha">Presidência nacional: <strong>${escapeHtml(pres.nome)}</strong> <a href="${escapeHtml(pres.fonteUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px">fonte ↗</a>${pres.risco ? ` <span title="${escapeHtml(pres.nota)}" style="color:var(--amber);font-size:12.5px">· pode ter mudado</span>` : ''}</div>`
        : '';
      const lider = liderancaCargoPorSigla[p.sigla];
      const liderHtml = lider
        ? `<div class="pt-linha">Filiado com mandato no Congresso: <a href="/candidato/${lider.pessoa_id}">${escapeHtml(nomeProprio(lider.nome_urna_atual))}</a> · ${escapeHtml(lider.cargo_nome)}${lider.sg_uf && lider.sg_uf !== 'BR' ? ` (${escapeHtml(lider.sg_uf)})` : ''}</div>`
        : '';
      const mini = CARGOS_ORDEM.filter(([slug]) => cont[slug])
        .map(([slug, rot]) => `<div><b>${Number(cont[slug]).toLocaleString('pt-BR')}</b>${rot}</div>`)
        .join('');
      return `
      <article class="pt-card" id="partido-${siglaSlug(p.sigla)}" data-busca="${escapeHtml(`${p.sigla} ${p.nome} ${p.numero}`.toLowerCase())}" data-zona="${zonaPrincipal(p.familiaIdeologica)}">
        <div class="pt-topo">
          ${logoPartidoHtml(p.sigla)}
          <div><div class="pt-sigla">${escapeHtml(p.sigla)}</div><div class="pt-nome">${escapeHtml(p.nome)} · desde ${escapeHtml(anoFundacaoCurto(p.fundacao))}</div></div>
          <div class="pt-num"><small>Número</small><b>${p.numero}</b></div>
        </div>
        <span class="pt-fam">${escapeHtml(p.familiaIdeologica)}</span>
        <p class="pt-hist">${escapeHtml(p.historico)}</p>
        ${presidencia}
        ${liderHtml}
        <div class="pt-cands">
          <div class="pt-cands-tit"><span>Candidaturas em 2026</span><b>${cont.total ? Number(cont.total).toLocaleString('pt-BR') : '—'}</b></div>
          ${mini ? `<div class="pt-mini">${mini}</div>` : ''}
          ${reps.length ? `<div style="font-size:12px;color:var(--muted);margin:2px 0 6px">Alguns candidatos em 2026 (por cargo):</div><div class="pt-reps">${reps.map((r) => `<a href="/candidato/${r.pessoa_id}">${escapeHtml(nomeProprio(r.nome_urna_atual))} · ${escapeHtml(r.cargo_nome)}${r.sg_uf && r.sg_uf !== 'BR' ? `-${escapeHtml(r.sg_uf)}` : ''}</a>`).join('')}</div>` : ''}
        </div>
      </article>`;
    })
    .join('');

  const corpo = `
    <style>${ESTILO_PARTIDOS}</style>
    <section class="pt-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow" style="color:#7FB0FF">${Icone.pessoas(16)} Partidos · Eleições 2026</span>
        <h1>Seu voto para deputado começa no partido</h1>
        <p>Para deputado, o voto soma primeiro para o partido ou federação. Conheça cada um: número, origem, quem preside, onde fica no espectro e quem são seus candidatos.</p>
        <div class="pt-kpis">
          <div><b>${lista.length}</b><span>partidos com guia completo</span></div>
          <div><b>${totalCands ? totalCands.toLocaleString('pt-BR') : '—'}</b><span>candidaturas desses partidos</span></div>
          <div><b>5</b><span>faixas no espectro</span></div>
        </div>
      </div>
    </section>
    <div class="vc-wrap" style="padding-bottom:56px">
      ${renderDiagramaEspectro()}
      <div class="pt-ferramentas">
        <label class="sr-only" for="partido-filtro">Filtrar partidos</label>
        <input type="search" id="partido-filtro" placeholder="Filtrar por sigla, nome ou número (ex.: PT, Novo, 22)" autocomplete="off" />
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0">Em ordem do número oficial de urna: critério neutro, não é ranking de tamanho ou relevância.</p>
      <p id="partido-filtro-vazio" hidden style="color:var(--muted)">Nenhum partido encontrado com esse termo.</p>
      <div class="pt-grid" id="partido-lista">${cards}</div>
      <details class="vc-card" style="margin-top:28px; padding:14px 18px;">
        <summary style="cursor:pointer; font-weight:600;">Sobre estes dados: fontes, classificação e limites</summary>
        <p style="margin-top:10px">A família ideológica segue leituras correntes de ciência política e imprensa especializada; não é opinião do VotoCheck. As notas históricas são resumos simplificados.</p>
        <p style="margin-top:8px">Presidência nacional verificada nas fontes oficiais listadas em ${escapeHtml(LIDERANCA_VERIFICADA_EM)}; pode mudar. Liderança de bancada muda a cada sessão: consulte a <a href="${escapeHtml(LINK_LIDERANCAS_CAMARA)}" target="_blank" rel="noopener noreferrer">página oficial da Câmara</a>.</p>
        <p style="margin-top:8px">"Filiado com mandato no Congresso" é calculado automaticamente a partir de mandatos atuais na Câmara e no Senado; ministérios, prefeituras e câmaras municipais ainda não entram. Partidos sem guia completo aparecem na busca de candidatos normalmente.</p>
        <p style="margin-top:8px">Logos: arquivos do Wikimedia Commons em domínio público ou licença livre, usados só para identificar cada partido. ${Object.values(LOGOS_COMMONS).filter((l) => l.credito).map((l) => escapeHtml(l.credito)).join('. ')}.</p>
      </details>
    </div>
    <script>
      (function () {
        var input = document.getElementById('partido-filtro'); if (!input) return;
        var cards = Array.prototype.slice.call(document.querySelectorAll('.pt-card'));
        var vazio = document.getElementById('partido-filtro-vazio');
        input.addEventListener('input', function () {
          var t = input.value.trim().toLowerCase(), n = 0;
          cards.forEach(function (c) { var ok = !t || c.getAttribute('data-busca').indexOf(t) !== -1; c.hidden = !ok; if (ok) n++; });
          vazio.hidden = n !== 0;
        });
      })();
    </script>
  `;
  return pagina({
    titulo: 'Partidos políticos 2026: número, espectro e candidatos | VotoCheck',
    descricao: 'Guia dos partidos nas eleições 2026: número de urna, espectro político, origem, presidência e candidaturas por cargo, com a fonte de cada dado.',
    caminho: '/partidos',
    larga: true,
    corpo,
  });
}
