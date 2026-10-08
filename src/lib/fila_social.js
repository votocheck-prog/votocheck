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
      const entrada = { text: item.legenda, channelId: CANAIS[rede], schedulingType: 'automatic', mode: 'customScheduled', dueAt: item.dueAt, assets: item.imagens.slice(0, 10).map((url) => ({ image: { url } })) };
      entrada.metadata = rede === 'instagram' ? { instagram: { type: 'post', shouldShareToFeed: true } } : { tiktok: { title: String(item.titulo || '').slice(0, 90) } };
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
  await env.OG.put('fila_social', JSON.stringify(fila));
  return { ok: true, agendados, erros, pendentes: fila.filter((i) => i.status === 'aguardando').length };
}
