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
 * PENDENTE DE CONFIRMAÇÃO DO RODRIGO: o texto de ESPECTRO.opcaoA/opcaoB abaixo é um rascunho
 * meu, reconstruindo a partir do que o doc registra em prosa (tema: grau de controle do Estado
 * sobre recursos/infraestrutura; ajuste aceito: "indicando gestores públicos para essas áreas"
 * no lugar de "escolhendo pessoas ligadas ao governo") — o doc nunca cita o texto final literal
 * que o Rodrigo escreveu. NÃO publicar sem ele confirmar ou substituir este texto.
 */

// ============================================================
// Zonas do espectro político — mesma classificação de partidos_html.js (ZONAS_ESPECTRO,
// derivada de `familiaIdeologica`), reexportada aqui só por conveniência de import.
// ============================================================
export { ZONAS_ESPECTRO } from './partidos_html.js';

export const TANTO_FAZ = 'tanto_faz';

/** As 6 perguntas pontuadas + a pergunta de espectro (integrada ao fluxo principal — deixou de
 *  ser "Rodada 2/opcional", ver doc seção "mecânica final"). `ordem` = ordem de exibição no quiz. */
export const PERGUNTAS = [
  {
    slug: 'divida_ativa_uniao_confirmada',
    ordem: 1,
    tipo: 'sim_nao',
    texto: 'Ter pendência confirmada na Dívida Ativa da União pesa contra, pra você?',
    ajuda: 'Considera só pendências que já passaram por checagem manual do CPF (nem toda pendência aparece — a curadoria está em andamento).',
    opcoes: [
      { valor: 'sim', label: 'Sim, pesa contra' },
      { valor: 'nao', label: 'Não, não pesa' },
    ],
  },
  {
    slug: 'ja_ocupou_cargo',
    ordem: 2,
    tipo: 'tres_opcoes',
    texto: 'Você prefere quem já ocupou esse cargo antes, ou dar chance a quem nunca ocupou?',
    ajuda: 'Baseado no registro oficial do TSE de candidatura à reeleição no mesmo cargo.',
    opcoes: [
      { valor: 'ja_ocupou', label: 'Prefiro quem já ocupou' },
      { valor: 'nunca_ocupou', label: 'Prefiro dar chance a quem nunca ocupou' },
    ],
  },
  {
    slug: 'alinhamento_bancada',
    ordem: 3,
    tipo: 'escala',
    texto: 'Você valoriza mais um representante que vota alinhado com o próprio partido, ou que vota independente disso?',
    ajuda: 'Só considera candidatos em exercício com votações nominais já coletadas — cobertura ainda parcial.',
    extremoEsquerdo: 'Vota independente',
    extremoDireito: 'Vota alinhado com o partido',
  },
  {
    slug: 'trocou_de_partido',
    ordem: 4,
    tipo: 'sim_nao',
    texto: 'Trocar de partido durante o mandato pesa negativamente pra você?',
    ajuda: 'Baseado no número de filiações partidárias já registradas para essa pessoa.',
    opcoes: [
      { valor: 'sim', label: 'Sim, pesa contra' },
      { valor: 'nao', label: 'Não, não pesa' },
    ],
  },
  {
    slug: 'declarou_bens',
    ordem: 5,
    tipo: 'sim_nao',
    texto: 'Importa pra você que o candidato tenha declarado bens em todos os ciclos em que concorreu?',
    ajuda: 'Baseado na declaração de bens da candidatura de 2026 registrada no TSE.',
    opcoes: [
      { valor: 'sim', label: 'Sim, importa' },
      { valor: 'nao', label: 'Não importa' },
    ],
  },
  {
    slug: 'formacao_superior',
    ordem: 6,
    tipo: 'sim_nao',
    texto: 'Ter uma formação com ensino superior (ou maior) é relevante no preparo do candidato pra assumir a posição?',
    ajuda: 'Baseado na escolaridade declarada ao TSE, já exibida no perfil de cada candidato.',
    opcoes: [
      { valor: 'sim', label: 'Sim, é relevante' },
      { valor: 'nao', label: 'Não é relevante' },
    ],
  },
];

/**
 * Pergunta de espectro — cursor de escala dupla, integrada ao mesmo fluxo das 6 acima (deixou de
 * ser opcional). O resultado usa a família ideológica do PARTIDO do candidato, nunca uma posição
 * pessoal verificada dele — isso é explicado na própria UI, perto do cursor (ver quiz_html.js).
 *
 * ⚠ TEXTO PENDENTE — ver nota no topo do arquivo. `opcaoA`/`opcaoB` são um rascunho meu, não o
 * texto final do Rodrigo.
 */
export const ESPECTRO = {
  slug: 'espectro_estado_mercado',
  ordem: 7,
  tipo: 'espectro',
  textoIntro: 'Sobre o papel do Estado em setores estratégicos (energia, água, infraestrutura):',
  opcaoA: 'O Estado deve ter um papel forte nesses setores, inclusive indicando gestores públicos para essas áreas.',
  opcaoB: 'Esses setores devem ser conduzidos principalmente pela iniciativa privada, com o Estado tendo um papel menor.',
  aviso: 'Usa a família ideológica do partido do candidato (a mesma da página de Partidos), nunca uma posição pessoal verificada dele — e só entra na sua recomendação se você tocar no cursor.',
};

export const TODAS_PERGUNTAS = [...PERGUNTAS, ESPECTRO];

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

function avaliarTresOpcoes(resposta, valorCandidato) {
  // valorCandidato: 'S' | 'N' | null (candidatura.reeleicao)
  if (valorCandidato === null || valorCandidato === undefined) return 'sem_dado';
  const candidatoJaOcupou = valorCandidato === 'S';
  if (resposta === 'ja_ocupou') return candidatoJaOcupou ? 'match' : 'diverge';
  if (resposta === 'nunca_ocupou') return candidatoJaOcupou ? 'diverge' : 'match';
  return 'match';
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
export function resumoResposta(slug, valor) {
  if (slug === ESPECTRO.slug) {
    const v = Number(valor);
    if (Number.isNaN(v)) return null;
    if (v <= 2) return `Sobre o papel do Estado: mais perto de "${ESPECTRO.opcaoA}"`;
    if (v >= 4) return `Sobre o papel do Estado: mais perto de "${ESPECTRO.opcaoB}"`;
    return 'Sobre o papel do Estado: ficou no meio-termo entre as duas opções.';
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
  return `${p.texto} → ${opcao.label}`;
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
  if ('ja_ocupou_cargo' in respostas) {
    porPergunta.ja_ocupou_cargo = avaliarTresOpcoes(respostas.ja_ocupou_cargo, sinais.reeleicao);
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
