/**
 * VotoCheck — Envio de e-mail via Resend (Fase 2 do "Monitore e Cobre" — ver acompanhamento.js).
 *
 * Decisão de 20/09/2026: Resend, não Brevo (que o Rodrigo já usa em outro projeto dele) — ver
 * CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 21. Motivos: é a integração que a própria
 * documentação do Cloudflare Workers ensina oficialmente (fetch puro, sem SDK — combina com o
 * resto do projeto, que não usa wrangler nem pacotes externos pra isso); a cota free (100
 * e-mails/dia, 3.000/mês) é suficiente pro estágio atual; e evita o "vazamento" entre projetos
 * que o Brevo tem numa conta só (lá, o link de descadastro é por conta inteira, não por marca).
 *
 * Isolamento deliberado: TODA chamada de envio passa por `enviarEmail()` abaixo — nenhuma outra
 * parte do código deveria chamar a API do Resend diretamente. Se um dia for preciso trocar de
 * provedor (Brevo ou outro), é essa função (e só ela) que muda.
 *
 * Requer, em produção: `env.RESEND_API_KEY` (secret do Worker — já configurado pelo Rodrigo em
 * 21/09/2026) e um domínio de envio verificado no painel do Resend. O domínio `updates.
 * votocheck.com.br` foi verificado nessa mesma data (registros SPF/DKIM/DMARC no DNS via
 * Cloudflare) — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 22. Falta ainda aplicar a
 * migration `0002_monitoramento_cobranca.sql` (tabela `acompanhamento`) antes de qualquer envio
 * real fazer sentido em produção — sem redeploy do Worker com este arquivo, nada disso está no
 * ar de qualquer forma. Enquanto essas peças não estiverem todas no lugar, `enviarEmail()` falha
 * de forma silenciosa e segura: NUNCA deve derrubar o fluxo de quem está se cadastrando — o
 * registro em `acompanhamento` no D1 é a fonte de verdade; o e-mail é só uma cortesia
 * best-effort por cima dele.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

/** Remetente padrão — domínio verificado no Resend em 21/09/2026. */
export const REMETENTE_PADRAO = 'VotoCheck <naoresponda@updates.votocheck.com.br>';

/**
 * Envia um e-mail via Resend. Nunca lança exceção — sempre retorna `{ ok, motivo? }` pra quem
 * chamou decidir o que fazer. Uso esperado: disparado via `ctx.waitUntil(...)` a partir de uma
 * rota, nunca bloqueando a resposta ao usuário.
 */
export async function enviarEmail(env, { to, subject, html, text, from = REMETENTE_PADRAO }) {
  if (!env.RESEND_API_KEY) {
    return { ok: false, motivo: 'sem_api_key' };
  }
  if (!to || !subject || (!html && !text)) {
    return { ok: false, motivo: 'parametros_invalidos' };
  }

  try {
    const resposta = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      return { ok: false, motivo: 'resend_erro', status: resposta.status, corpo };
    }

    const dados = await resposta.json().catch(() => ({}));
    return { ok: true, id: dados.id };
  } catch (e) {
    return { ok: false, motivo: 'excecao', erro: String(e) };
  }
}
