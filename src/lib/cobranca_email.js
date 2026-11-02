/**
 * VotoCheck — cobrança por e-mail com resposta rastreada (01/11/2026).
 *
 * Fluxo:
 *  1. Eleitor escolhe o fato em /cobrar/:id, informa o e-mail (e, pré-marcado, "quero o resumo mensal").
 *  2. POST /cobrar/:id/email grava a cobrança como 'pendente' e manda um e-mail de confirmação ao eleitor
 *     (sem confirmar, nada vai ao gabinete: evita usar o site para mandar spam em nome de terceiros).
 *  3. GET /cobrar/confirmar?t= envia ao e-mail oficial do gabinete, com Reply-To resposta+<token>@votocheck.com.br.
 *     Se o eleitor manteve a opção marcada, cria o acompanhamento mensal (clipping) já confirmado.
 *  4. Quando o gabinete responde, o Email Routing entrega ao Worker (handler `email`): a resposta é repassada
 *     ao eleitor e a cobrança vira 'respondida'. O conteúdo da resposta não é publicado.
 *  Estatística pública: enviadas e respondidas por eleito e no total (contagem, sem nota).
 */
import { enviarEmail } from './email.js';
import { emailValido, criarAcompanhamento } from './acompanhamento.js';

const LIMITE_DIA_POR_EMAIL = 5;
const REMETENTE_COBRANCA = 'Eleitor via VotoCheck <cobranca@updates.votocheck.com.br>';

function token() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function iniciarCobrancaEmail(env, { pessoaId, email, texto, tema, cidade, mensal, uf, origem }) {
  const e = String(email || '').trim().toLowerCase();
  if (!emailValido(e)) return { ok: false, motivo: 'Confira o e-mail: parece incompleto.' };
  const t = String(texto || '').trim();
  if (t.length < 40 || t.length > 4000) return { ok: false, motivo: 'A mensagem precisa ter entre 40 e 4.000 caracteres.' };
  const destino = await env.DB.prepare(`SELECT valor FROM contato_oficial WHERE pessoa_id = ? AND tipo = 'email' AND invalido = 0 LIMIT 1`).bind(pessoaId).first();
  if (!destino?.valor) return { ok: false, motivo: 'Este eleito ainda não tem e-mail oficial de gabinete. Use o Instagram ou copie o texto.' };
  const hoje = await env.DB.prepare(`SELECT COUNT(*) AS n FROM cobranca_email WHERE email_eleitor = ? AND criado_em >= datetime('now', '-1 day')`).bind(e).first();
  if ((hoje?.n || 0) >= LIMITE_DIA_POR_EMAIL) return { ok: false, motivo: `Limite de ${LIMITE_DIA_POR_EMAIL} cobranças por dia por e-mail. Tente amanhã.` };
  const p = await env.DB.prepare(`SELECT nome_urna_atual, nome_completo FROM pessoa WHERE id = ?`).bind(pessoaId).first();
  const tk = token();
  await env.DB.prepare(
    `INSERT INTO cobranca_email (token, pessoa_id, tema, email_eleitor, cidade, uf, texto, destino_email, quer_mensal, status, origem) VALUES (?,?,?,?,?,?,?,?,?, 'pendente', ?)`
  ).bind(tk, pessoaId, String(tema || '').slice(0, 40), e, String(cidade || '').slice(0, 60), String(uf || '').slice(0, 2), t, destino.valor, mensal ? 1 : 0, String(origem || '').slice(0, 40)).run();
  const nome = p?.nome_urna_atual || p?.nome_completo || 'o eleito';
  const link = `https://votocheck.com.br/cobrar/confirmar?t=${tk}`;
  const env1 = await enviarEmail(env, {
    to: e,
    subject: `Confirme para enviarmos sua cobrança a ${nome}`,
    text: `Você pediu para o VotoCheck enviar esta mensagem ao gabinete de ${nome}:\n\n${t}\n\nPara enviar, confirme aqui (vale por 7 dias):\n${link}\n\nQuando o gabinete responder, a resposta chega neste e-mail.${mensal ? `\nVocê também vai receber, 1 vez por mês, um resumo do que ${nome} fez no mandato (cancele quando quiser, pelo link de cada e-mail).` : ''}\n\nSe não foi você, ignore: nada será enviado.\nVotoCheck · votocheck.com.br`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0A1440;max-width:560px">
      <p>Você pediu para o VotoCheck enviar esta mensagem ao gabinete de <b>${esc(nome)}</b>:</p>
      <blockquote style="margin:0 0 16px;padding:12px 16px;background:#F5F8FF;border-left:4px solid #0059F5;white-space:pre-wrap">${esc(t)}</blockquote>
      <p><a href="${link}" style="display:inline-block;background:#0059F5;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Confirmar e enviar</a></p>
      <p>Quando o gabinete responder, a resposta chega neste e-mail.${mensal ? ` Você também vai receber, 1 vez por mês, um resumo do que ${esc(nome)} fez no mandato (cancele quando quiser).` : ''}</p>
      <p style="color:#5B6478;font-size:13px">Se não foi você, ignore: nada será enviado. VotoCheck · votocheck.com.br</p></div>`,
  });
  return { ok: env1.ok, motivo: env1.ok ? null : 'Não conseguimos enviar o e-mail de confirmação agora. Tente de novo em alguns minutos.' };
}

export async function confirmarCobrancaEmail(env, tk) {
  if (!/^[a-f0-9]{32}$/.test(String(tk || ''))) return { ok: false, motivo: 'Link inválido.' };
  const c = await env.DB.prepare(
    `SELECT ce.*, p.nome_urna_atual, p.nome_completo, p.genero FROM cobranca_email ce JOIN pessoa p ON p.id = ce.pessoa_id WHERE ce.token = ?`
  ).bind(tk).first();
  if (!c) return { ok: false, motivo: 'Cobrança não encontrada.' };
  const nome = c.nome_urna_atual || c.nome_completo;
  if (c.status !== 'pendente') return { ok: true, jaEnviada: true, pessoaId: c.pessoa_id, nome };
  if (Date.parse(c.criado_em.replace(' ', 'T') + 'Z') < Date.now() - 7 * 86400000) return { ok: false, motivo: 'Este link venceu (7 dias). Faça a cobrança de novo.' };
  const local = [c.cidade, c.uf].filter(Boolean).join(' / ');
  const envio = await enviarEmail(env, {
    to: c.destino_email,
    from: REMETENTE_COBRANCA,
    replyTo: `resposta+${tk}@votocheck.com.br`,
    subject: `Pergunta de um eleitor${local ? ` de ${local}` : ''} pelo VotoCheck`,
    text: `${c.texto}\n\n---\nMensagem enviada por um eleitor (e-mail confirmado) pela plataforma VotoCheck (votocheck.com.br).\nPara responder ao eleitor, basta responder a este e-mail: a resposta é repassada a ele. O VotoCheck só contabiliza que houve resposta; o conteúdo não é publicado sem autorização do gabinete.`,
  });
  if (!envio.ok) return { ok: false, motivo: 'Não conseguimos enviar agora. Tente o mesmo link de novo em alguns minutos.' };
  await env.DB.prepare(`UPDATE cobranca_email SET status = 'enviada', enviado_em = datetime('now') WHERE token = ?`).bind(tk).run();
  // Conta também no contador geral de cobranças (canal e-mail).
  await env.DB.prepare(`INSERT OR IGNORE INTO cobranca (pessoa_id, tema, canal, uf_origem, chave_dia) VALUES (?, ?, 'email_votocheck', ?, ?)`)
    .bind(c.pessoa_id, c.tema || 'email', c.uf || '', tk.slice(0, 24)).run();
  if (c.quer_mensal) {
    try {
      await criarAcompanhamento(env, { email: c.email_eleitor, pessoaId: c.pessoa_id });
    } catch (e) { /* acompanhamento é cortesia: nunca derruba o envio */ }
  }
  return { ok: true, pessoaId: c.pessoa_id, nome, mensal: Boolean(c.quer_mensal) };
}

/** Extrai o texto puro de um e-mail MIME cru (multipart, quoted-printable, base64). */
export function textoDoEmail(raw) {
  const decQP = (s) => s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const utf8 = (bin) => { try { return new TextDecoder('utf-8').decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); } catch (e) { return bin; } };
  const parte = (bloco) => {
    const i = bloco.search(/\r?\n\r?\n/);
    if (i < 0) return null;
    const cab = bloco.slice(0, i).toLowerCase();
    let corpo = bloco.slice(i).replace(/^\r?\n\r?\n/, '');
    const bnd = cab.match(/boundary="?([^";\r\n]+)"?/);
    if (/content-type:\s*multipart\//.test(cab) && bnd) {
      const partes = corpo.split('--' + bnd[1]);
      let html = null;
      for (const pt of partes) {
        const r = parte(pt.replace(/^\r?\n/, ''));
        if (r && r.tipo === 'text') return r;
        if (r && r.tipo === 'html' && !html) html = r;
      }
      return html;
    }
    if (/content-transfer-encoding:\s*base64/.test(cab)) corpo = utf8(atob(corpo.replace(/\s+/g, '')));
    else if (/content-transfer-encoding:\s*quoted-printable/.test(cab)) corpo = utf8(decQP(corpo));
    if (/content-type:\s*text\/html/.test(cab)) return { tipo: 'html', texto: corpo.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&') };
    if (/content-type:\s*text\/plain/.test(cab) || !/content-type:/.test(cab)) return { tipo: 'text', texto: corpo };
    return null;
  };
  const r = parte(raw);
  return (r?.texto || '').trim();
}

/** Handler do Email Routing: resposta+<token>@votocheck.com.br → repassa ao eleitor e marca como respondida. */
export async function receberRespostaGabinete(message, env) {
  const m = String(message.to || '').match(/resposta\+([a-f0-9]{32})@/i);
  if (!m) { message.setReject('Endereço desconhecido'); return; }
  const tk = m[1].toLowerCase();
  const c = await env.DB.prepare(`SELECT ce.*, p.nome_urna_atual, p.nome_completo FROM cobranca_email ce JOIN pessoa p ON p.id = ce.pessoa_id WHERE ce.token = ?`).bind(tk).first();
  if (!c) { message.setReject('Cobrança não encontrada'); return; }
  const raw = await new Response(message.raw).text();
  // Remove o histórico citado (a pergunta original) para o eleitor ver só a resposta.
  let corpo = textoDoEmail(raw).split(/\n(?:Em .{5,120} escreveu:|On .{5,120} wrote:|-{2,}\s*Original Message|De: .*VotoCheck)/i)[0].trim();
  if (!corpo) corpo = '(O gabinete respondeu, mas a mensagem veio sem texto legível. Ela pode conter só anexos.)';
  const nome = c.nome_urna_atual || c.nome_completo;
  const remetente = String(message.from || '');
  await enviarEmail(env, {
    to: c.email_eleitor,
    subject: `Resposta do gabinete de ${nome}`,
    text: `O gabinete de ${nome} respondeu à sua cobrança feita pelo VotoCheck.\n\nRemetente: ${remetente}\n\n${corpo.slice(0, 20000)}\n\n---\nSua pergunta:\n${c.texto}\n\nVotoCheck · votocheck.com.br/candidato/${c.pessoa_id}`,
  });
  await env.DB.prepare(`UPDATE cobranca_email SET status = 'respondida', respondido_em = COALESCE(respondido_em, datetime('now')), respostas = respostas + 1 WHERE token = ?`).bind(tk).run();
}

/** Estatística pública: enviadas e respondidas (por eleito ou total). */
export async function estatisticaCobrancas(env, pessoaId = null) {
  const onde = pessoaId ? 'WHERE pessoa_id = ? AND' : 'WHERE';
  const st = env.DB.prepare(`SELECT SUM(status IN ('enviada','respondida')) AS enviadas, SUM(status = 'respondida') AS respondidas FROM cobranca_email ${onde} status != 'pendente'`);
  const r = await (pessoaId ? st.bind(pessoaId) : st).first().catch(() => null);
  return { enviadas: r?.enviadas || 0, respondidas: r?.respondidas || 0 };
}
