/**
 * VotoCheck — Página institucional "Sobre".
 *
 * Conteúdo baseado na descrição oficial do projeto: plataforma independente de verificação
 * eleitoral, sem vínculo partidário, sem ranking, sempre com fonte rastreável.
 */
import { pagina } from './estilo_html.js';

export function renderSobre() {
  const corpo = `
    <div style="max-width:680px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">Sobre o VotoCheck</h1>
      <p style="color:var(--text-muted); font-size:17px; margin-bottom:32px;">
        Escolher um representante não deveria ser um ato de fé. E cobrar quem foi eleito não
        deveria fazer o cidadão se sentir impotente.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">O que é</h2>
      <p>
        O VotoCheck é uma plataforma independente que organiza, verifica e contextualiza
        informações sobre candidatos e representantes para que cada pessoa possa tomar suas
        próprias decisões — antes, durante e depois das eleições.
      </p>
      <p>
        Reunimos histórico, propostas, atuação, votações, presença, contexto e evidências,
        deixando claro de onde veio cada informação.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">O que o VotoCheck não é</h2>
      <p>
        O VotoCheck não é um ranking. Não dizemos quem é o "melhor" ou o "pior" candidato, não
        damos nota, não recomendamos voto e não temos posição partidária. Os critérios de
        organização das listas (como ordenar por nome, idade ou partido) são sempre neutros —
        nunca uma avaliação de qualidade.
      </p>
      <p>
        Também não inventamos informação. Todo dado mostrado aqui tem uma fonte oficial
        identificada (TSE, Câmara dos Deputados, Senado Federal) — o que chamamos de
        "passaporte da evidência".
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Meu VotoCheck (em breve)</h2>
      <p>
        Quando o cidadão quiser descobrir quais características procura em um representante,
        o <strong>Meu VotoCheck</strong> vai permitir declarar suas próprias preferências e
        encontrar candidatos que apresentam essas características — sem ranking e sem o
        VotoCheck escolher por ele.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Cobertura atual</h2>
      <p>
        Estamos em fase de MVP para as eleições de 2026, com dados de candidaturas (TSE),
        deputados federais e senadores em exercício (Câmara e Senado). A cobertura está em
        expansão contínua — bens declarados, redes sociais, proposições e votações entram nas
        próximas atualizações.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Contestação e correção</h2>
      <p>
        Encontrou algo desatualizado, incompleto ou incorreto? Em breve o VotoCheck terá um
        canal de contestação aberto ao próprio candidato e a qualquer cidadão, com todo o
        histórico de alterações rastreável publicamente.
      </p>

      <p style="margin-top:40px; font-weight:600; color:var(--primary);">
        Conheça. Confira. Entenda. Decida.
      </p>
    </div>
  `;
  return pagina({
    titulo: 'Sobre — VotoCheck',
    descricao: 'O VotoCheck é uma plataforma independente que organiza, verifica e contextualiza informações sobre candidatos e representantes, sempre com a fonte de cada dado — sem ranking, sem indicar voto.',
    caminho: '/sobre',
    corpo,
  });
}
