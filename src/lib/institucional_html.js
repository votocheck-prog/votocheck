/**
 * VotoCheck — Termos e Condições + Perguntas Frequentes (FAQ).
 *
 * Conteúdo institucional de apoio (rodapé), no mesmo estilo de sobre_html.js. O texto de
 * Termos é um rascunho de boa-fé alinhado aos princípios do produto (independência, não
 * ranqueamento, fonte rastreável) — NÃO substitui revisão jurídica antes de publicar em
 * produção; Rodrigo pediu esse link no rodapé, mas o texto abaixo precisa passar por um
 * advogado antes de ser tratado como o Termo definitivo do VotoCheck.
 */
import { pagina } from './estilo_html.js';

export function renderTermos() {
  const corpo = `
    <div style="max-width:680px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">Termos e Condições</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:32px;">
        Última revisão: 20/09/2026. Este texto descreve como o VotoCheck funciona e o que você
        pode esperar dele — não é aconselhamento jurídico, e está sujeito a revisão.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">1. O que é o VotoCheck</h2>
      <p>
        O VotoCheck é uma plataforma independente que organiza, verifica e contextualiza
        informações públicas sobre candidatos e representantes eleitos. Não somos filiados a
        partido, candidato ou órgão público, e não recebemos recurso público para operar.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">2. Origem dos dados</h2>
      <p>
        As informações exibidas vêm de fontes públicas oficiais — Tribunal Superior Eleitoral
        (TSE), Câmara dos Deputados e Senado Federal — sempre com a fonte identificada junto ao
        dado. O VotoCheck organiza e contextualiza essas informações, mas não é o autor
        original delas.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">3. O que o VotoCheck não faz</h2>
      <p>
        Não ranqueamos, pontuamos ou recomendamos candidatos. Não damos opinião sobre quem
        merece o voto de ninguém. Qualquer critério de ordenação de listas (nome, idade,
        partido) é neutro — nunca uma avaliação de mérito.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">4. Precisão e correções</h2>
      <p>
        Fazemos o possível para manter os dados atualizados e corretos, mas erros e atrasos nas
        fontes originais podem acontecer. Se você identificar uma informação desatualizada,
        incompleta ou incorreta, pode nos contatar pelo e-mail abaixo — o canal formal de
        contestação, aberto a candidatos e cidadãos, está em desenvolvimento.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">5. Uso do site</h2>
      <p>
        O conteúdo do VotoCheck pode ser usado livremente para fins pessoais e não comerciais,
        sempre citando a fonte. Não é permitido usar o site para automatizar coleta massiva de
        dados (scraping) sem autorização prévia.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">6. Sustentação financeira</h2>
      <p>
        O VotoCheck se sustenta por doações individuais e por uma cota publicitária limitada de
        empresas apoiadoras, sem qualquer contrapartida editorial — nenhum anunciante ou
        doador tem influência sobre o conteúdo mostrado.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">7. Contato</h2>
      <p>
        Dúvidas, correções ou sugestões: <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.
      </p>
    </div>
  `;
  return pagina({
    titulo: 'Termos e Condições — VotoCheck',
    descricao: 'Termos e condições de uso do VotoCheck: origem dos dados, o que a plataforma faz e não faz, e como se sustenta financeiramente.',
    caminho: '/termos',
    corpo,
  });
}

const PERGUNTAS = [
  {
    pergunta: 'O VotoCheck indica em quem eu devo votar?',
    resposta:
      'Não. O VotoCheck nunca ranqueia, pontua ou recomenda candidatos. Organizamos fatos e fontes — a decisão de voto é sempre sua.',
  },
  {
    pergunta: 'De onde vêm os dados?',
    resposta:
      'De fontes públicas oficiais: Tribunal Superior Eleitoral (TSE), Câmara dos Deputados e Senado Federal. Cada informação mostra sua origem.',
  },
  {
    pergunta: 'O VotoCheck é ligado a algum partido, candidato ou governo?',
    resposta:
      'Não. Somos uma iniciativa independente, sem recurso público e sem influência de partido ou candidato sobre o que é mostrado.',
  },
  {
    pergunta: 'Como o VotoCheck se sustenta financeiramente?',
    resposta:
      'Por doações individuais via PIX e por uma pequena cota publicitária de empresas apoiadoras, sem viés ideológico ou partidário e sem influência editorial.',
  },
  {
    pergunta: 'Encontrei uma informação errada ou desatualizada. O que faço?',
    resposta:
      'Escreva para contato@votocheck.com.br. Um canal formal de contestação, aberto a candidatos e cidadãos, está em desenvolvimento.',
  },
  {
    pergunta: 'O VotoCheck cobre vereadores e prefeitos?',
    resposta:
      'Ainda não. Hoje cobrimos Presidente, Governador, Senador, Deputado Federal, Deputado Estadual e Deputado Distrital. O nível municipal é um passo futuro.',
  },
  {
    pergunta: 'O que é o "Monitore e Cobre"?',
    resposta:
      'Uma etapa em construção: você poderá acompanhar o mandato de um Representante Público (ou até 3, se ainda estiver decidindo) e receber resumos periódicos da atuação dele, além de um canal para se manifestar sobre pautas do momento. Ainda não está disponível.',
  },
];

export function renderFaq() {
  const itens = PERGUNTAS.map(
    (p) => `
    <details class="faq-item">
      <summary>${p.pergunta}</summary>
      <p>${p.resposta}</p>
    </details>`
  ).join('');

  const corpo = `
    <div style="max-width:680px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">Perguntas Frequentes</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:32px;">
        Dúvida que não está aqui? Escreva para <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.
      </p>
      <div class="faq-lista">${itens}</div>
    </div>
  `;
  return pagina({
    titulo: 'Perguntas Frequentes — VotoCheck',
    descricao: 'Perguntas frequentes sobre o VotoCheck: fontes de dados, independência, financiamento e como corrigir uma informação.',
    caminho: '/faq',
    corpo,
  });
}
