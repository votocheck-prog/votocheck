/**
 * VotoCheck — Monitoramento e Cobrança (Fase 1): captura de acompanhamento.
 *
 * Escopo desta fase (decidido com o Rodrigo em 20/09/2026): só a captura — usuário informa
 * e-mail e escolhe acompanhar até 3 Representantes Públicos. NENHUM e-mail é enviado ainda
 * (Fase 2, depende de escolher um provedor — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md).
 *
 * Cancelamento: como ainda não enviamos e-mail, o link de cancelamento só existe na hora da
 * inscrição (mostrado na própria página, uma vez). Quando a Fase 2 existir, esse mesmo token
 * pode ir no rodapé de cada e-mail enviado.
 *
 * Regra de marca aplicada aqui também: nunca é pedido nem sugerido qual dos 3 é "melhor" —
 * a pessoa escolhe cada um independentemente, na página do próprio candidato.
 */

export const MAX_ACOMPANHAMENTOS_POR_EMAIL = 3;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email) {
  return typeof email === 'string' && email.length <= 255 && REGEX_EMAIL.test(email.trim());
}

/** Token de cancelamento — só precisa ser imprevisível o bastante pra não ser adivinhado. */
function gerarToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cria um acompanhamento (email + pessoaId). Retorna:
 *  - { ok: true, tokenCancelamento }              — criado agora
 *  - { ok: true, jaExistia: true, tokenCancelamento } — já existia e estava ativo (idempotente)
 *  - { ok: false, motivo: 'email_invalido' | 'limite_atingido' }
 */
export async function criarAcompanhamento(env, { email, pessoaId }) {
  const emailNormalizado = String(email || '').trim().toLowerCase();
  if (!emailValido(emailNormalizado)) {
    return { ok: false, motivo: 'email_invalido' };
  }

  const db = env.DB;

  const existente = await db
    .prepare(`SELECT token_cancelamento, ativo FROM acompanhamento WHERE email = ? AND pessoa_id = ?`)
    .bind(emailNormalizado, pessoaId)
    .first();

  if (existente && existente.ativo) {
    return { ok: true, jaExistia: true, tokenCancelamento: existente.token_cancelamento };
  }

  if (!existente) {
    const { count } = (await db
      .prepare(`SELECT COUNT(*) as count FROM acompanhamento WHERE email = ? AND ativo = 1`)
      .bind(emailNormalizado)
      .first()) || { count: 0 };
    if (count >= MAX_ACOMPANHAMENTOS_POR_EMAIL) {
      return { ok: false, motivo: 'limite_atingido' };
    }
  }

  const token = gerarToken();
  if (existente) {
    // existia mas estava cancelado — reativa com um token novo em vez de duplicar a linha
    await db
      .prepare(`UPDATE acompanhamento SET ativo = 1, token_cancelamento = ?, cancelado_em = NULL, criado_em = datetime('now') WHERE email = ? AND pessoa_id = ?`)
      .bind(token, emailNormalizado, pessoaId)
      .run();
  } else {
    await db
      .prepare(`INSERT INTO acompanhamento (email, pessoa_id, token_cancelamento) VALUES (?, ?, ?)`)
      .bind(emailNormalizado, pessoaId, token)
      .run();
  }

  return { ok: true, tokenCancelamento: token };
}

/** Cancela pelo token — idempotente (cancelar de novo não é erro). */
export async function cancelarPorToken(env, token) {
  if (!token || typeof token !== 'string') return { ok: false, motivo: 'token_invalido' };
  const db = env.DB;
  const linha = await db.prepare(`SELECT id, ativo FROM acompanhamento WHERE token_cancelamento = ?`).bind(token).first();
  if (!linha) return { ok: false, motivo: 'nao_encontrado' };
  if (linha.ativo) {
    await db.prepare(`UPDATE acompanhamento SET ativo = 0, cancelado_em = datetime('now') WHERE id = ?`).bind(linha.id).run();
  }
  return { ok: true };
}
