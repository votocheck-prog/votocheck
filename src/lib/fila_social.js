/**
 * VotoCheck — fila de publicação nas redes (08/10/2026).
 *
 * O plano grátis do Buffer aceita no máximo 10 posts agendados por canal ao mesmo tempo. Séries
 * longas (ex.: "Eleitos 2026" dos 27 estados) entram numa fila no KV (`fila_social`) e o cron
 * diário do Worker (09:00 UTC) agenda no Buffer só o que vence nas próximas 48 h.
 * As imagens já ficam no KV (`s:<data>/<arquivo>`, servidas em /midia/...) antes de entrar na fila.
 * Item: { id, dueAt (ISO UTC), titulo, legenda, imagens: [url], redes: ['instagram','tiktok'], status, buffer, erro }
 */
import { bufferGql } from './pauta.js';
import { enviarEmail } from './email.js';

const CANAIS = { instagram: '6ab804ccea19ca0bdef79c3a', youtube: '6ab8048fea19ca0bdef79ab9', tiktok: '6ab803e6ea19ca0bdef79607' };
const JANELA_MS = 48 * 3600 * 1000;

export async function processarFila(env, agora = Date.now()) {
  if (!env.OG || !env.BUFFER_API_KEY) return { ok: false, motivo: 'sem KV ou BUFFER_API_KEY' };
  const fila = (await env.OG.get('fila_social', 'json')) || [];
  let agendados = 0;
  const erros = [];
  for (const item of fila) {
    if (item.status !== 'aguardando') continue;
    const due = Date.parse(item.dueAt);
    if (!(due - agora <= JANELA_MS)) continue;
    if (due - agora < 10 * 60 * 1000) { item.status = 'perdido'; continue; }
    item.buffer = item.buffer || [];
    const falhas = [];
    for (const rede of item.redes || ['instagram', 'tiktok']) {
      if (item.buffer.some((b) => b.rede === rede)) continue;
      // 12/10/2026: item.video ({ url }) vira Reels no Instagram e vídeo no TikTok. A capa é o quadro em
      // 0,5 s (o Buffer não aceita capa personalizada). 1º comentário automático exige plano pago: o CTA
      // de comentário vai na própria legenda.
      const assets = item.video
        ? [{ video: { url: item.video.url, metadata: { thumbnailOffset: 500 } } }]
        : (item.imagens || []).slice(0, 10).map((url) => ({ image: { url } }));
      const entrada = { text: item.legenda, channelId: CANAIS[rede], schedulingType: 'automatic', mode: 'customScheduled', dueAt: item.dueAt, assets };
      entrada.metadata = rede === 'instagram'
        ? { instagram: { type: item.video ? 'reel' : 'post', shouldShareToFeed: true } }
        : { tiktok: { title: String(item.titulo || '').slice(0, 90) } };
      try {
        const d = await bufferGql(env, 'mutation P($i: CreatePostInput!) { createPost(input: $i) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }', { i: entrada });
        if (d?.createPost?.message) falhas.push(`${rede}: ${d.createPost.message}`);
        else item.buffer.push({ rede, id: d.createPost.post.id });
      } catch (e) {
        falhas.push(`${rede}: ${String(e.message || e)}`);
      }
    }
    if (falhas.length) { item.erro = falhas.join(' | '); erros.push(`${item.id}: ${item.erro}`); } else delete item.erro;
    if (item.buffer.length === (item.redes || ['instagram', 'tiktok']).length) { item.status = 'agendado'; agendados++; }
  }
  // 12/10/2026: o Instagram ficou 4 dias sem publicar (Buffer perdeu a autorização) e a fila dizia
  // "agendado". Agora confere no Buffer cada post já vencido e avisa por e-mail quando algo falha.
  const falhasPub = await verificarPublicacoes(env, fila, agora);
  // Canal desconectado no Buffer = nada sai, mesmo agendado. Checa todo dia e avisa.
  const desconectados = [];
  for (const [rede, id] of Object.entries(CANAIS)) {
    if (rede === 'youtube') continue;
    try {
      const d = await bufferGql(env, 'query C($id: ChannelId!) { channel(input: { id: $id }) { isDisconnected isLocked } }', { id });
      if (d?.channel?.isDisconnected || d?.channel?.isLocked) desconectados.push(rede);
    } catch (e) { /* falha de consulta não é desconexão */ }
  }
  if (desconectados.length) {
    await enviarEmail(env, { to: 'contato@votocheck.com.br', subject: `VotoCheck: Buffer desconectado (${desconectados.join(', ')})`, text: `O Buffer está sem autorização para publicar em: ${desconectados.join(', ')}. Nada será publicado nesses canais até reconectar em publish.buffer.com (Channels > Refresh).` }).catch(() => null);
  }
  await env.OG.put('fila_social', JSON.stringify(fila));
  return { ok: true, agendados, erros, falhasPublicacao: falhasPub, desconectados, pendentes: fila.filter((i) => i.status === 'aguardando').length };
}

async function verificarPublicacoes(env, fila, agora) {
  const novas = [];
  for (const item of fila) {
    if (item.status !== 'agendado' || Date.parse(item.dueAt) > agora - 20 * 60 * 1000) continue;
    item.publicado = item.publicado || {};
    let pendente = false;
    for (const b of item.buffer || []) {
      if (item.publicado[b.rede]) continue;
      try {
        const d = await bufferGql(env, 'query Q($id: PostId!) { post(input: { id: $id }) { status externalLink error { message } } }', { id: b.id });
        const st = d?.post?.status;
        if (st === 'sent') item.publicado[b.rede] = d.post.externalLink || 'ok';
        else if (st === 'error') { item.publicado[b.rede] = 'erro'; novas.push(`${item.titulo} (${b.rede}): ${d.post.error?.message || 'erro sem mensagem'}`); }
        else pendente = true;
      } catch (e) {
        pendente = true;
      }
    }
    if (!pendente) item.status = Object.values(item.publicado).some((v) => v === 'erro') ? 'erro' : 'publicado';
  }
  if (novas.length) {
    await enviarEmail(env, {
      to: 'contato@votocheck.com.br',
      subject: `VotoCheck: ${novas.length} post(s) não publicado(s) nas redes`,
      text: `A fila de publicação encontrou falhas no Buffer:\n\n${novas.join('\n')}\n\nSe a mensagem fala em autorização, reconecte o canal em publish.buffer.com (Channels > Refresh).`,
    }).catch(() => null);
  }
  return novas;
}
