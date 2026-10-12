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
      <h2 id="posicao" style="font-size:19px; margin-top:32px;">Fundo eleitoral: fatos, não opinião</h2>
      <p>
        O VotoCheck é neutro também sobre as regras do sistema político. Não defendemos nem
        atacamos o fundo eleitoral ou qualquer outra regra. O que fazemos é mostrar os fatos com
        fonte oficial: quanto dinheiro público foi para as campanhas, para quem foi, quanto custou
        cada voto, quem aprovou o valor e quando ele será votado de novo.
      </p>
      <p>
        Esses números valem para todos os partidos, do mesmo jeito. A conclusão é sua, e cobrar
        quem vota o fundo também. Fichas, listas de eleitos e votações seguem as mesmas regras.
      </p>
      <p>
        Também não inventamos informação. Todo dado mostrado aqui tem uma fonte oficial
        identificada (TSE, Câmara dos Deputados, Senado Federal) — o que chamamos de
        "passaporte da evidência".
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Acompanhe quem foi eleito</h2>
      <p>
        Veja os eleitos do seu estado em <a href="/eleitos">Eleitos 2026</a>, descubra pelo CEP quem
        tem mais ligação com a sua cidade e receba todo mês, no <a href="/boletim">boletim</a>, o
        que os deputados e senadores do seu estado fizeram, sempre com a fonte. Para novidades com
        mais frequência, siga o VotoCheck no Instagram e no TikTok.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Meu VotoCheck e Meus representantes</h2>
      <p>
        No <a href="/quiz">Meu VotoCheck</a> você declara o que procura em quem te representa, inclusive
        se quer alguém com base eleitoral na sua cidade, e vê quais eleitos de 2026 têm essas
        características. Não há ranking nem nota, e o VotoCheck não escolhe por você. Os eleitos que
        você quiser acompanhar (até 3 deputados federais, 3 estaduais e 3 senadores) ficam salvos em
        <a href="/meus-representantes">Meus representantes</a>, só no seu aparelho, com perfil e contatos
        oficiais à mão para cobrar.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Cobertura atual</h2>
      <p>
        Estamos em fase de MVP para as eleições de 2026, com dados de candidaturas (TSE),
        deputados federais e senadores em exercício (Câmara e Senado). A cobertura está em
        expansão contínua — bens declarados, redes sociais, proposições e votações entram nas
        próximas atualizações.
      </p>

      <h2 id="metodologia-divida-ativa-uniao" style="font-size:19px; margin-top:32px;">Metodologia — Dívida Ativa da União</h2>
      <p>
        Cruzamos periodicamente os dados abertos da <strong>Dívida Ativa da União</strong>
        (Procuradoria-Geral da Fazenda Nacional — PGFN, publicados sob a Lei de Acesso à
        Informação) com o nome completo de cada candidato cadastrado no VotoCheck.
      </p>
      <p>
        Por exigência da LGPD, a própria PGFN divulga o CPF parcialmente oculto (ex.:
        "XXX735.623XX"). Isso significa que o cruzamento é feito só pelo nome completo — e nome,
        sozinho, não identifica uma pessoa com certeza: pode haver homônimos.
      </p>
      <p>
        Por isso, todo resultado desse cruzamento entra no VotoCheck com o status
        <strong>"a confirmar"</strong> e <strong>não aparece publicamente</strong> até que a
        equipe do VotoCheck confirme manualmente — consultando o CPF completo do candidato
        junto ao TSE — que o registro realmente pertence àquela pessoa e não a um homônimo. Só
        depois dessa confirmação manual um dado de dívida ativa passa a ser exibido no perfil do
        candidato, sempre com a fonte e o número de inscrição correspondentes.
      </p>
      <p>
        Isto é uma aplicação direta do nosso princípio de "passaporte da evidência": nenhuma
        informação é publicada sem fonte identificada, e nenhum cruzamento automático por nome é
        publicado como se fosse um fato confirmado.
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
