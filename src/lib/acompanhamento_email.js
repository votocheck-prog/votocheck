/**
 * VotoCheck — Conteúdo dos e-mails de acompanhamento (via Resend — ver lib/email.js).
 *
 * ATUALIZADO 24/09/2026 (seção 33): esta rodada deixa de ser "só o e-mail de confirmação".
 * Agora tem duas peças:
 *
 *   1) emailConfirmacaoAcompanhamento — disparado uma vez quando alguém se cadastra em
 *      /acompanhar (ou reativa depois de cancelar). Reescrito pra explicar sucintamente o que a
 *      plataforma faz, confirmar quem a pessoa escolheu acompanhar, e destacar o papel de
 *      MONITORAR e COBRAR — avisando que um canal de cobrança dedicado está a caminho (não existe
 *      ainda — ver jornada_html.js) e que o resumo mensal (item 2 abaixo) começa a chegar.
 *
 *   2) emailClippingMensal — o "resumo periódico" que este mesmo e-mail de confirmação, na versão
 *      anterior, dizia que "ainda estamos construindo". Ver src/lib/clipping_mensal.js pra como os
 *      dados desse resumo são montados (só com base em voto_parlamentar/presenca — dado real e
 *      verificável, nunca inferência sobre quem não teve registro).
 *
 * Tom: sóbrio, igual ao resto do produto — nunca "parabéns" ou linguagem de marketing, nunca
 * sugere que um representante é "melhor" que outro (mesmo indiretamente, pelo tom da mensagem).
 */
import { escapeHtml } from './estilo_html.js';

export function emailConfirmacaoAcompanhamento({ nomeRepresentante, cargoNome, ufSigla, tokenCancelamento, origem }) {
  const nome = escapeHtml(nomeRepresentante || 'este Representante Público');
  const cargoUfTexto = [cargoNome, ufSigla].filter(Boolean).join(' · ');
  const cargoUfHtml = escapeHtml(cargoUfTexto);
  const linkCancelar = `${origem}/acompanhar/cancelar?token=${encodeURIComponent(tokenCancelamento)}`;

  const subject = `Você está acompanhando ${nomeRepresentante || 'um Representante Público'} no VotoCheck`;

  const text = `Combinado — você está acompanhando ${nomeRepresentante || 'este Representante Público'}${cargoUfTexto ? ` (${cargoUfTexto})` : ''} no VotoCheck.

O VotoCheck organiza, verifica e contextualiza informações sobre candidatos e representantes — histórico, votações, presença, patrimônio, pendências — sempre com a fonte de cada informação à vista. A ideia não é dizer em quem votar, e sim dar o que falta pra você decidir sozinho: acompanhar não é só saber o que ele fez, é também ter uma base pra cobrar o que não foi feito. Estamos construindo um canal dedicado pra isso; por enquanto, este e-mail é o primeiro passo.

A partir do próximo mês, quando houver atuação registrada, você recebe aqui um resumo mensal do que ${nomeRepresentante || 'este Representante Público'} fez (ou deixou de fazer) — sempre com a fonte de onde tiramos cada informação.

Não pediu isso ou mudou de ideia? Cancele quando quiser: ${linkCancelar}

— VotoCheck (votocheck.com.br)
Verificação independente de quem te representa. Sem ranking, sempre com a fonte.`;

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size:15px; line-height:1.5;">
        Combinado — você está acompanhando <strong>${nome}</strong>${cargoUfTexto ? ` <span style="color:#666;">(${cargoUfHtml})</span>` : ''} no VotoCheck.
      </p>
      <p style="font-size:14px; line-height:1.5; color:#444;">
        O VotoCheck organiza, verifica e contextualiza informações sobre candidatos e representantes
        — histórico, votações, presença, patrimônio, pendências — sempre com a fonte de cada
        informação à vista. A ideia não é dizer em quem votar, e sim dar o que falta pra você decidir
        sozinho: acompanhar não é só saber o que ele fez, é também ter uma base pra <strong>cobrar</strong>
        o que não foi feito. Estamos construindo um canal dedicado pra isso; por enquanto, este e-mail
        é o primeiro passo.
      </p>
      <p style="font-size:14px; line-height:1.5; color:#444;">
        A partir do próximo mês, quando houver atuação registrada, você recebe aqui um
        <strong>resumo mensal</strong> do que ${nome} fez (ou deixou de fazer) — sempre com a fonte
        de onde tiramos cada informação.
      </p>
      <p style="font-size:13px; color:#888; margin-top:24px;">
        Não pediu isso ou mudou de ideia? <a href="${linkCancelar}" style="color:#888;">Cancele quando quiser</a>.
      </p>
      <p style="font-size:12px; color:#aaa; margin-top:32px; border-top:1px solid #eee; padding-top:12px;">
        VotoCheck — Verificação independente de quem te representa. Sem ranking, sempre com a fonte.
      </p>
    </div>`;

  return { subject, html, text };
}

/**
 * E-mail mensal de acompanhamento ("clipping") — só é chamado quando `clipping_mensal.js` já
 * confirmou que existe pelo menos um dado real (voto ou presença) pro período de referência. Nunca
 * é chamado "vazio": ausência de dado é tratada como "ainda não checamos", nunca como "não fez
 * nada" (ver comentário em clipping_mensal.js sobre por que essa distinção importa).
 *
 * `votos`: array de { data, descricao, casa, voto, urlOrigem } — já ordenado, mais recente primeiro.
 * `presenca`: { percentual, totalSessoes, totalPresencas } | null — resumo do período, se existir.
 */
export function emailClippingMensal({
  nomeRepresentante,
  cargoNome,
  ufSigla,
  mesReferenciaLabel,
  votos,
  presenca,
  linkPerfil,
  tokenCancelamento,
  origem,
}) {
  const nome = escapeHtml(nomeRepresentante || 'este Representante Público');
  const cargoUfTexto = [cargoNome, ufSigla].filter(Boolean).join(' · ');
  const cargoUfHtml = escapeHtml(cargoUfTexto);
  const linkCancelar = `${origem}/acompanhar/cancelar?token=${encodeURIComponent(tokenCancelamento)}`;
  const votosLista = Array.isArray(votos) ? votos : [];

  const subject = `${mesReferenciaLabel}: o que ${nomeRepresentante || 'quem você acompanha'} fez no VotoCheck`;

  const linhasVotoText = votosLista
    .map((v) => `- ${v.data || ''}: votou "${v.voto}" em "${v.descricao}"${v.urlOrigem ? ` (fonte: ${v.urlOrigem})` : ''}`)
    .join('\n');
  const presencaText = presenca
    ? `Presença em ${mesReferenciaLabel}: ${presenca.percentual}% (${presenca.totalPresencas} de ${presenca.totalSessoes} sessões).`
    : '';

  const text = `Resumo de ${mesReferenciaLabel} de ${nomeRepresentante || 'este Representante Público'}${cargoUfTexto ? ` (${cargoUfTexto})` : ''} no VotoCheck.

${presencaText}
${votosLista.length ? `\nVotações registradas no período:\n${linhasVotoText}\n` : ''}
Perfil completo, com todas as fontes: ${linkPerfil}

Não quer mais receber esse resumo? Cancele quando quiser: ${linkCancelar}

— VotoCheck (votocheck.com.br)
Verificação independente de quem te representa. Sem ranking, sempre com a fonte.`;

  const votosHtml = votosLista.length
    ? `<ul style="padding-left:18px; font-size:14px; line-height:1.6; color:#333;">
        ${votosLista
          .map(
            (v) => `<li>${escapeHtml(v.data || '')}: votou <strong>${escapeHtml(v.voto)}</strong> em ${escapeHtml(v.descricao)}${v.urlOrigem ? ` — <a href="${v.urlOrigem}" style="color:#888;">fonte</a>` : ''}</li>`
          )
          .join('')}
      </ul>`
    : '';

  const presencaHtml = presenca
    ? `<p style="font-size:14px; line-height:1.5; color:#444;">
        Presença em ${escapeHtml(mesReferenciaLabel)}: <strong>${presenca.percentual}%</strong>
        (${presenca.totalPresencas} de ${presenca.totalSessoes} sessões).
      </p>`
    : '';

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size:15px; line-height:1.5;">
        Resumo de <strong>${escapeHtml(mesReferenciaLabel)}</strong> de <strong>${nome}</strong>${cargoUfTexto ? ` <span style="color:#666;">(${cargoUfHtml})</span>` : ''} no VotoCheck.
      </p>
      ${presencaHtml}
      ${votosHtml}
      <p style="font-size:13px; color:#666; margin-top:16px;">
        <a href="${linkPerfil}" style="color:#666;">Ver perfil completo, com todas as fontes</a>
      </p>
      <p style="font-size:13px; color:#888; margin-top:24px;">
        Não quer mais receber esse resumo? <a href="${linkCancelar}" style="color:#888;">Cancele quando quiser</a>.
      </p>
      <p style="font-size:12px; color:#aaa; margin-top:32px; border-top:1px solid #eee; padding-top:12px;">
        VotoCheck — Verificação independente de quem te representa. Sem ranking, sempre com a fonte.
      </p>
    </div>`;

  return { subject, html, text };
}
