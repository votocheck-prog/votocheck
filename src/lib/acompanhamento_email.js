/**
 * VotoCheck — Conteúdo do e-mail de confirmação de acompanhamento.
 *
 * Escopo desta rodada (20/09/2026): SÓ o e-mail de confirmação, disparado uma vez quando alguém
 * se cadastra em /acompanhar (ou reativa depois de ter cancelado). O resumo periódico de atuação
 * — o objetivo final do "Monitore" — é uma etapa separada e ainda não desenhada (depende de
 * decidir frequência e o que entra no conteúdo; ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md,
 * seção 21). Este e-mail deixa isso explícito pro destinatário, pra não prometer algo que ainda
 * não existe.
 *
 * Tom: sóbrio, igual ao resto do produto — nunca "parabéns" ou linguagem de marketing, nunca
 * sugere que esse representante é "melhor" que outro (mesmo indiretamente, pelo tom da mensagem).
 */
import { escapeHtml } from './estilo_html.js';

export function emailConfirmacaoAcompanhamento({ nomeRepresentante, cargoNome, ufSigla, tokenCancelamento, origem }) {
  const nome = escapeHtml(nomeRepresentante || 'este Representante Público');
  const cargoUfTexto = [cargoNome, ufSigla].filter(Boolean).join(' · ');
  const cargoUfHtml = escapeHtml(cargoUfTexto);
  const linkCancelar = `${origem}/acompanhar/cancelar?token=${encodeURIComponent(tokenCancelamento)}`;

  const subject = `Você está acompanhando ${nomeRepresentante || 'um Representante Público'} no VotoCheck`;

  const text = `Combinado — você está acompanhando ${nomeRepresentante || 'este Representante Público'}${cargoUfTexto ? ` (${cargoUfTexto})` : ''} no VotoCheck.

Assim que os resumos periódicos de atuação estiverem prontos (ainda estamos construindo essa parte), eles chegam aqui.

Não pediu isso ou mudou de ideia? Cancele quando quiser: ${linkCancelar}

— VotoCheck (votocheck.com.br)
Verificação independente de quem te representa. Sem ranking, sempre com a fonte.`;

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size:15px; line-height:1.5;">
        Combinado — você está acompanhando <strong>${nome}</strong>${cargoUfTexto ? ` <span style="color:#666;">(${cargoUfHtml})</span>` : ''} no VotoCheck.
      </p>
      <p style="font-size:14px; line-height:1.5; color:#444;">
        Assim que os resumos periódicos de atuação estiverem prontos (ainda estamos construindo
        essa parte), eles chegam aqui.
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
