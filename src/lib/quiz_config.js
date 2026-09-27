/**
 * VotoCheck — "Meu VotoCheck": configuração das perguntas do quiz e a lógica de correspondência
 * (match/diverge) entre uma resposta do usuário e o sinal correspondente do candidato.
 *
 * Fonte da especificação: doc "Proposta: Quiz do Meu VotoCheck" (Claude Project VotoCheck),
 * revisado e aprovado pelo Rodrigo em 24/09/2026 — ver checklist de decisões no fim do doc.
 *
 * DECISÕES DE ESCOPO tomadas nesta implementação, fora do que o doc já define explicitamente
 * (o doc descreve a mecânica de alto nível — "cada resposta liga a um critério" — mas não a
 * fórmula exata de match para cada tipo de pergunta; isso ficou para a implementação):
 *
 *   1) Perguntas 1 e 4 são formuladas como "isso pesa contra/negativamente pra você?" — uma
 *      resposta "não" é tratada como "esse critério não deve excluir ninguém" (sempre bate),
 *      não como "o candidato precisa ter o oposto". Perguntas 5 e 6 são formuladas como
 *      "importa pra você que...?" — mesma lógica: "não" = não filtra por isso. Só "sim" filtra
 *      ativamente (bate com quem NÃO tem o traço nas perguntas 1/4, bate com quem TEM o traço
 *      nas perguntas 5/6).
 *   2) Pergunta 3 (escala 0–10, alinhamento com a bancada) e a pergunta de espectro (cursor
 *      duplo) exigem uma fórmula de "distância" entre a posição do usuário e o sinal do
 *      candidato — não especificada no doc (a pergunta 3 é Rodada 2/opcional, "sem número
 *      visível" no cursor de espectro). Implementei uma régua 0–10 com tolerância de meio
 *      relativo (ver `avaliarEscala`/`avaliarEspectro` abaixo) — é uma interpretação razoável,
 *      não uma fórmula aprovada linha a linha. Documentado para revisão do Rodrigo antes de
 *      divulgar (ver checklist do doc: "revisar na prática antes de divulgar").
 *   3) Cobertura por pergunta segue exatamente o que a tabela do doc registra (ver `cobertura`
 *      abaixo, só para referência/documentação — a UI nunca esconde uma pergunta por causa
 *      disso, ela só aparece como "sem dado suficiente" por candidato quando faltar o sinal).
 *
 *   4) Texto de ESPECTRO.opcaoA/opcaoB (25/09/2026): aprovado pelo Rodrigo, texto dele próprio,
 *      com um único ajuste de neutralidade combinado com ele (ver comentário junto a `ESPECTRO`
 *      abaixo). Ele revisa como fica na prática e ajusta depois se achar necessário.
 */

// ============================================================
// Zonas do espectro político — mesma classificação de partidos_html.js (ZONAS_ESPECTRO,
// derivada de `familiaIdeologica`), reexportada aqui só por conveniência de import.
// ============================================================
export { ZONAS_ESPECTRO } from './partidos_html.js';

export const TANTO_FAZ = 'tanto_faz';

/** As 6 perguntas pontuadas + a pergunta de espectro (integrada ao fluxo principal — deixou de
 *  ser "Rodada 2/opcional", ver doc seção "mecânica final"). `ordem` = ordem de exibição no quiz. */
// v2 (26/09/2026) — decisões D06/D07 e verificação de dados: saíram as perguntas que não filtravam
// ninguém (dívida ativa: 0 casos confirmados; "declarou bens": campo que o TSE deixou de publicar
// em 2026; alinhamento com a bancada: orientação de bancada não coletada). Entraram faixa de idade
// e patrimônio declarado (dados do TSE para todos os candidatos). Escolaridade virou filtro opcional
// no último passo. As definições antigas ficam em PERGUNTAS_ARQUIVADAS para voltar quando houver dado.
// v3 (27/09/2026) — Rodrigo pediu 3 mudanças a partir do artefato de seleção do quiz:
//   1) sexo declarado entrou como pergunta nova (dado já vem do TSE, `pessoa.genero`, nunca
//      usado antes — ver DS_GENERO em scripts/importar_local.mjs, sempre presente pra quem já
//      foi importado, nenhum reimport necessário).
//   2) faixa_idade perdeu a 3ª faixa: virou só "abaixo de 50" / "acima de 50" (2 opções + tanto
//      faz, mesmo padrão de patrimonio). Ver avaliarCandidato abaixo pro corte em 50 anos.
//   3) formacao_superior deixou de ser o checkbox opcional do último passo (FILTRO_ESCOLARIDADE,
//      removido) e virou pergunta pontuada de verdade, no mesmo framing "importa pra você que
//      ele tenha X?" que já existia (avaliarSimNaoImporta, sem mudança de lógica — só mudou de
//      lugar na UI).
// v4 (27/09/2026, mesma tarde) — 2 ajustes a mais pedidos pelo Rodrigo:
//   1) "Você prefere quem já está no Congresso ou alguém que nunca esteve lá?" (era a pergunta 1)
//      foi removida por decisão dele — sem substituição, sem virar filtro. `avaliarTresOpcoes` só
//      existia pra essa pergunta, removida junto. `ordem` de todas as perguntas seguintes recuou
//      1 posição (e a de ESPECTRO, 7→6) pra não deixar buraco na sequência de exibição.
//   2) patrimonio: as opções de resposta passaram a descrever o candidato diretamente (mesmo
//      texto que já estava só na `ajuda`) em vez do antigo framing "Prefiro até/acima de X" —
//      pedido do Rodrigo pra ficar mais claro de cara, sem precisar abrir a ajuda. `valor` (chave
//      usada por avaliarCandidato) não mudou, só os `label`.
// Nas perguntas restantes, e em toda pergunta sim_nao/tres_opcoes do quiz, "tanto faz" nunca entra
// no array `opcoes`: é sempre o botão extra que cardSimNao/cardTresOpcoes acrescenta por conta
// própria em quiz_html.js, sempre por último — é assim que a regra "tanto faz sempre por último"
// já valia antes e continua valendo aqui, sem precisar repetir em cada pergunta.
export const PERGUNTAS = [
  {
    slug: 'faixa_idade',
    ordem: 1,
    tipo: 'tres_opcoes',
    texto: 'Tem alguma faixa de idade que você prefere?',
    ajuda: 'Pela data de nascimento declarada ao TSE.',
    opcoes: [
      { valor: 'abaixo50', label: 'Abaixo de 50 anos' },
      { valor: 'acima50', label: '50 anos ou mais' },
    ],
  },
  {
    slug: 'sexo_declarado',
    ordem: 2,
    tipo: 'sim_nao',
    texto: 'Tem alguma preferência quanto ao sexo declarado do candidato?',
    ajuda: 'Como consta no registro da candidatura no TSE.',
    opcoes: [
      { valor: 'masculino', label: 'Prefiro masculino' },
      { valor: 'feminino', label: 'Prefiro feminino' },
    ],
  },
  {
    slug: 'formacao_superior',
    ordem: 3,
    tipo: 'sim_nao',
    texto: 'Ter ensino superior completo importa pra você?',
    ajuda: 'Grau de instrução declarado ao TSE. Só conta como "tem" quem declarou superior completo, pós-graduação, mestrado ou doutorado.',
    opcoes: [
      { valor: 'sim', label: 'Sim, importa' },
      { valor: 'nao', label: 'Não importa' },
    ],
  },
  {
    slug: 'patrimonio',
    ordem: 4,
    tipo: 'tres_opcoes',
    texto: 'O tamanho do patrimônio declarado pesa na sua escolha?',
    ajuda: 'Soma dos bens que o próprio candidato declarou ao TSE em 2026. Quem não declarou bens conta como até R$ 1 milhão.',
    opcoes: [
      { valor: 'ate1mi', label: 'Não declarou ou declarou até R$ 1 milhão' },
      { valor: 'acima1mi', label: 'Declarou acima de R$ 1 milhão' },
    ],
  },
  {
    slug: 'trocou_de_partido',
    ordem: 5,
    tipo: 'sim_nao',
    texto: 'Trocar de partido durante o mandato pesa contra, pra você?',
    ajuda: 'Histórico de filiação disponível só para quem tem mandato no Congresso; para os demais, a pergunta não exclui ninguém.',
    opcoes: [
      { valor: 'sim', label: 'Sim, pesa contra' },
      { valor: 'nao', label: 'Não pesa' },
    ],
  },
];

/**
 * Pergunta de espectro — cursor de escala dupla, integrada ao mesmo fluxo das 6 acima (deixou de
 * ser opcional). O resultado usa a família ideológica do PARTIDO do candidato, nunca uma posição
 * pessoal verificada dele — isso é explicado na própria UI, perto do cursor (ver quiz_html.js).
 *
 * Texto final aprovado pelo Rodrigo em 25/09/2026 (substitui o rascunho anterior). Único ajuste
 * feito por mim, também aprovado por ele: troquei "escolhendo pessoas ligadas ao governo" —
 * carregava conotação de apadrinhamento que pesava contra a opção A sem necessidade — por
 * "podendo indicar diretamente os gestores responsáveis por essas áreas", que descreve o mesmo
 * fato (nomeação política de gestores) de forma neutra.
 */
export const ESPECTRO = {
  slug: 'espectro_estado_mercado',
  ordem: 6,
  tipo: 'espectro',
  textoIntro: 'Como você acredita que o Estado/poder público deve interferir na vida das pessoas?',
  opcaoA:
    'Alto controle e atuação, cuidando não só de assuntos essenciais como segurança, educação, saúde, regulação econômica e previdência, mas também controlando e monopolizando recursos naturais (petróleo, energia, minerais etc.) e infraestrutura (telecomunicações, estradas, ferrovias etc.), podendo indicar diretamente os gestores responsáveis por essas áreas — com uma estrutura administrativa maior, de maior custo, tributos mais altos, mas com o Estado no controle total das frentes não essenciais (recursos e infraestrutura).',
  opcaoB:
    'Atuação focada em assuntos essenciais como segurança, educação, saúde, regulação econômica e previdência, delegando o controle de outros assuntos a empresas privadas — ficando com a fiscalização e regulação, com uma estrutura de pessoas, ativos e custo mais enxuta, ágil e focada, mas com menor poder de controle sobre as frentes não essenciais (recursos e infraestrutura).',
  // Resumos curtos (26/09/2026) — só para leitura rápida no celular; o texto completo do Rodrigo
  // continua a um toque. Os dois lados citam ganho e custo, para não pender.
  tituloA: 'Estado amplo',
  resumoA: 'Cuida do essencial e também controla recursos naturais e infraestrutura. Estrutura maior e tributos mais altos, com mais controle direto.',
  tituloB: 'Estado focado no essencial',
  resumoB: 'Cuida do essencial e deixa recursos e infraestrutura com empresas privadas, fiscalizando. Estrutura mais enxuta, com menos controle direto.',
  niveis: ['Totalmente A', 'Mais para A', 'Meio-termo', 'Mais para B', 'Totalmente B'],
  aviso: 'Usa a família ideológica do partido do candidato (a mesma da página de Partidos), nunca uma posição pessoal verificada dele — e só entra no seu resultado se você tocar no cursor.',
};

export const TODAS_PERGUNTAS = [...PERGUNTAS, ESPECTRO];
export const PARAMETROS_QUIZ = [...PERGUNTAS, ESPECTRO];

// ============================================================
// Filtro de partido/ideologia — não pontuado, exclui/inclui candidatos (ver seção "Filtro de
// partido" do doc). Reaproveita a mesma classificação de partidos_html.js.
// ============================================================
export { faixaEspectro, zonaPrincipal, partidosOrdenados } from './partidos_html.js';

// ============================================================
// Avaliação: dado o valor respondido pelo usuário para uma pergunta + os sinais do candidato,
// devolve 'match' | 'diverge' | 'sem_dado'. Nunca lançar exceção — sinal ausente = 'sem_dado'.
// ============================================================

function avaliarSimNaoPesaContra(resposta, temTraco) {
  // "Isso pesa contra/importa pra você?" — framing de preferências (ver nota 1 no topo do
  // arquivo): "não" nunca exclui ninguém (sempre bate); só "sim" filtra ativamente.
  if (resposta === 'nao') return 'match';
  if (temTraco === null || temTraco === undefined) return 'sem_dado';
  return temTraco ? 'diverge' : 'match'; // "sim, pesa contra" → bate com quem NÃO tem o traço
}

function avaliarSimNaoImporta(resposta, temTraco) {
  // "Importa pra você que ele tenha X?" — "não importa" nunca exclui ninguém.
  if (resposta === 'nao') return 'match';
  if (temTraco === null || temTraco === undefined) return 'sem_dado';
  return temTraco ? 'match' : 'diverge'; // "sim, importa" → bate com quem TEM o traço
}

/** Escala 0–10: `posicaoUsuario` 0 = extremo esquerdo, 10 = extremo direito, null = não respondida.
 *  `valorCandidato` 0–100 (%) ou null. Tolerância: considera "do mesmo lado" com folga de 1 ponto
 *  na escala normalizada (0–10) em torno do centro — ver nota 2 no topo do arquivo. */
function avaliarEscala(posicaoUsuario, valorCandidatoPct) {
  if (posicaoUsuario === null || posicaoUsuario === undefined) return null; // não respondida — nem avaliar
  if (valorCandidatoPct === null || valorCandidatoPct === undefined) return 'sem_dado';
  const candidatoNormalizado = valorCandidatoPct / 10; // 0–10
  const ladoUsuario = posicaoUsuario < 5 ? -1 : posicaoUsuario > 5 ? 1 : 0;
  const ladoCandidato = candidatoNormalizado < 5 ? -1 : candidatoNormalizado > 5 ? 1 : 0;
  if (ladoUsuario === 0) return 'match'; // usuário ficou bem no meio — não discrimina
  return ladoUsuario === ladoCandidato ? 'match' : 'diverge';
}

/** Espectro: `posicaoUsuario` 1 (opção A / Esquerda) a 5 (opção B / Direita), null = não tocado.
 *  `zonaCandidato` 1–5 (zonaPrincipal do partido) ou null (partido ainda sem classificação). */
function avaliarEspectro(posicaoUsuario, zonaCandidato) {
  if (posicaoUsuario === null || posicaoUsuario === undefined) return null;
  if (zonaCandidato === null || zonaCandidato === undefined) return 'sem_dado';
  return Math.abs(posicaoUsuario - zonaCandidato) <= 1 ? 'match' : 'diverge';
}

/** Descreve, em linguagem natural, o que o usuário escolheu numa pergunta — usado só no "seu
 *  perfil de eleitor" (nunca perto de um candidato específico). Nunca lança exceção. */
const TEMA_CURTO = {
  faixa_idade: 'Idade',
  sexo_declarado: 'Sexo declarado',
  formacao_superior: 'Ensino superior completo',
  patrimonio: 'Patrimônio declarado',
  trocou_de_partido: 'Troca de partido',
};

export function resumoResposta(slug, valor) {
  if (slug === ESPECTRO.slug) {
    const v = Number(valor);
    if (Number.isNaN(v)) return null;
    const n = Math.min(5, Math.max(1, Math.round(v)));
    return `Papel do Estado: nível ${n} de 5 (${ESPECTRO.niveis[n - 1].toLowerCase()}${n <= 2 ? `, ${ESPECTRO.tituloA.toLowerCase()}` : n >= 4 ? `, ${ESPECTRO.tituloB.toLowerCase()}` : ''})`;
  }
  const p = PERGUNTAS.find((q) => q.slug === slug);
  if (!p) return null;
  if (p.tipo === 'escala') {
    const v = Number(valor);
    if (Number.isNaN(v)) return null;
    if (v < 5) return `${p.texto} → mais perto de "${p.extremoEsquerdo}"`;
    if (v > 5) return `${p.texto} → mais perto de "${p.extremoDireito}"`;
    return `${p.texto} → ficou no meio-termo.`;
  }
  const opcao = p.opcoes.find((o) => o.valor === valor);
  if (!opcao) return null;
  return TEMA_CURTO[slug] ? `${TEMA_CURTO[slug]}: ${opcao.label}` : `${p.texto} → ${opcao.label}`;
}

/**
 * Avalia todas as respostas do usuário contra os sinais de UM candidato.
 * `respostas`: { [slug]: valor } — só entram aqui os slugs efetivamente respondidos (o chamador
 * já deve ter filtrado "tanto faz"/não tocado antes de montar este objeto).
 * `sinais`: ver `calcularSinaisCandidato` em quiz_html.js/index.js.
 * Retorna { porPergunta: { [slug]: 'match'|'diverge'|'sem_dado' }, combina: bool, diverge: [slugs] }
 */
export function avaliarCandidato(respostas, sinais) {
  const porPergunta = {};

  if ('divida_ativa_uniao_confirmada' in respostas) {
    porPergunta.divida_ativa_uniao_confirmada = avaliarSimNaoPesaContra(
      respostas.divida_ativa_uniao_confirmada,
      sinais.dividaAtivaConfirmada
    );
  }
  if ('alinhamento_bancada' in respostas) {
    const r = avaliarEscala(respostas.alinhamento_bancada, sinais.alinhamentoBancadaPct);
    if (r) porPergunta.alinhamento_bancada = r;
  }
  if ('trocou_de_partido' in respostas) {
    porPergunta.trocou_de_partido = avaliarSimNaoPesaContra(respostas.trocou_de_partido, sinais.trocouPartido);
  }
  if ('declarou_bens' in respostas) {
    porPergunta.declarou_bens = avaliarSimNaoImporta(respostas.declarou_bens, sinais.declarouBens);
  }
  if ('formacao_superior' in respostas) {
    porPergunta.formacao_superior = avaliarSimNaoImporta(respostas.formacao_superior, sinais.grauInstrucaoSuperior);
  }
  if ('faixa_idade' in respostas) {
    const i = sinais.idade;
    if (i === null || i === undefined) porPergunta.faixa_idade = 'sem_dado';
    else {
      // v3 (27/09/2026): virou 2 faixas em vez de 3 — ver PERGUNTAS acima.
      const faixa = i < 50 ? 'abaixo50' : 'acima50';
      porPergunta.faixa_idade = faixa === respostas.faixa_idade ? 'match' : 'diverge';
    }
  }
  if ('sexo_declarado' in respostas) {
    if (sinais.sexoDeclarado === null || sinais.sexoDeclarado === undefined) porPergunta.sexo_declarado = 'sem_dado';
    else porPergunta.sexo_declarado = sinais.sexoDeclarado === respostas.sexo_declarado ? 'match' : 'diverge';
  }
  if ('patrimonio' in respostas) {
    const v = sinais.patrimonio ?? 0;
    const faixa = v <= 1000000 ? 'ate1mi' : 'acima1mi';
    porPergunta.patrimonio = faixa === respostas.patrimonio ? 'match' : 'diverge';
  }
  if ('espectro_estado_mercado' in respostas) {
    const r = avaliarEspectro(respostas.espectro_estado_mercado, sinais.zonaEspectro);
    if (r) porPergunta.espectro_estado_mercado = r;
  }

  const slugsDivergentes = Object.entries(porPergunta)
    .filter(([, v]) => v === 'diverge')
    .map(([k]) => k);
  const slugsCombina = Object.entries(porPergunta)
    .filter(([, v]) => v === 'match')
    .map(([k]) => k);

  return {
    porPergunta,
    combina: slugsDivergentes.length === 0,
    divergeEm: slugsDivergentes,
    combinaEm: slugsCombina,
  };
}
