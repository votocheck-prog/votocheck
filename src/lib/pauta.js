/**
 * VotoCheck — pauta diária da campanha (esteira D21, 26/09/2026).
 *
 * A "fábrica" (campanha/fabrica.py, rodando no GitHub Actions) gera as peças do dia, sobe as
 * imagens/vídeos para o KV "OG" com prefixo `s:<data>/` e grava o manifesto em `pauta:<data>`.
 * Esta página mostra a pauta para o Rodrigo aprovar ou rejeitar cada peça (1 toque) e baixar os
 * arquivos com a legenda pronta. Nada é publicado sem aprovação; sem aprovação em 24h, a peça
 * expira. Protegida por ADMIN_TOKEN (?t=), nunca indexada.
 */
import { pagina, escapeHtml } from './estilo_html.js';

export function dataSP(d = new Date()) {
  return new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

export async function servirArquivoSocial(env, caminho) {
  const obj = env.OG ? await env.OG.getWithMetadata(`s:${caminho}`, 'arrayBuffer') : null;
  if (!obj || !obj.value) return null;
  const tipo = caminho.endsWith('.mp4') ? 'video/mp4' : caminho.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new Response(obj.value, { headers: { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': `inline; filename="${caminho.split('/').pop()}"` } });
}

export async function lerPauta(env, data) {
  if (!env.OG) return null;
  return env.OG.get(`pauta:${data}`, 'json');
}

/** Chamada à API GraphQL do Buffer (https://api.buffer.com). */
export async function bufferGql(env, query, variables = {}) {
  if (!env.BUFFER_API_KEY) throw new Error('BUFFER_API_KEY ausente no Worker');
  const r = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${env.BUFFER_API_KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'VotoCheck/1.0' }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

/** 26/09/2026 — esteira automática: a peça nasce "pré-aprovada" e já agendada no Buffer.
 *  Recusar = apagar os agendamentos no Buffer (se ainda não saiu) e marcar como recusada. */
export async function decidirPeca(env, data, id, decisao) {
  const pauta = await lerPauta(env, data);
  if (!pauta) return { ok: false };
  const item = (pauta.itens || []).find((i) => i.id === id);
  if (!item) return { ok: false };
  const erros = [];
  if (decisao !== 'aprovar') {
    for (const b of item.buffer || []) {
      if (b.removido) continue;
      try {
        const d = await bufferGql(env, 'mutation Del($id: PostId!) { deletePost(input: { id: $id }) { ... on DeletePostSuccess { id } ... on MutationError { message } } }', { id: b.id });
        if (d?.deletePost?.message) erros.push(`${b.rede}: ${d.deletePost.message}`);
        else b.removido = true;
      } catch (e) {
        erros.push(`${b.rede}: ${String(e.message || e)}`);
      }
    }
  }
  item.status = decisao === 'aprovar' ? 'aprovada' : 'recusada';
  item.decidido_em = new Date().toISOString();
  if (erros.length) item.erro_recusa = erros.join(' | ');
  await env.OG.put(`pauta:${data}`, JSON.stringify(pauta));
  return { ok: true, erros };
}

export function renderPauta({ pauta, data, token }) {
  const q = (extra = '') => `t=${encodeURIComponent(token)}&d=${data}${extra}`;
  const itens = pauta?.itens || [];
  const cards = itens
    .map((i) => {
      const cor = i.status === 'aprovada' || i.status === 'pre-aprovada' ? '#00806A' : i.status === 'recusada' || i.status === 'rejeitada' ? '#B24C1F' : 'var(--muted)';
      const agendado = (i.buffer || []).filter((b) => !b.removido);
      const quando = i.publicar_em ? new Date(i.publicar_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      const aviso = i.status === 'pre-aprovada' && agendado.length
        ? `<p style="margin:0 0 10px;font-weight:600;color:#00806A">Agendada no Buffer para ${escapeHtml(quando)} (${escapeHtml(agendado.map((b) => b.rede).join(', '))}). Sai sozinha se você não recusar.</p>`
        : i.status === 'recusada' ? `<p style="margin:0 0 10px;color:#B24C1F">Recusada${i.erro_recusa ? ` — atenção: ${escapeHtml(i.erro_recusa)}. Confira no Buffer.` : ': agendamentos removidos do Buffer.'}</p>`
        : i.erro_buffer ? `<p style="margin:0 0 10px;color:#B24C1F">Não agendou no Buffer: ${escapeHtml(i.erro_buffer)}. Publique manualmente.</p>` : '';
      return `
      <div class="vc-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
          <h3 style="margin:0">${escapeHtml(i.titulo)}</h3>
          <span style="font-weight:700;color:${cor};text-transform:uppercase;font-size:12.5px;letter-spacing:.06em">${escapeHtml(i.status || 'pendente')}</span>
        </div>
        <p style="margin:4px 0 12px">${escapeHtml(i.tipo)} · redes: ${escapeHtml((i.redes || []).join(', '))} · horário sugerido: ${escapeHtml(i.horario || '')}</p>
        ${aviso}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${midia}</div>
        <details><summary style="cursor:pointer;font-weight:600">Legenda pronta</summary>
          <textarea readonly style="width:100%;min-height:150px;margin-top:8px;font:14px/1.5 var(--font-body);padding:10px;border-radius:10px;border:1px solid var(--line)">${escapeHtml(i.legenda || '')}</textarea>
        </details>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${i.status === 'recusada' ? '' : `<a class="vc-btn vc-btn--sec vc-btn--sm" style="border-color:#B24C1F;color:#B24C1F" href="/admin/pauta/decidir?${q(`&id=${encodeURIComponent(i.id)}&acao=rejeitar`)}">Recusar (não publicar)</a>`}
          ${i.status === 'pendente' ? `<a class="vc-btn vc-btn--pri vc-btn--sm" href="/admin/pauta/decidir?${q(`&id=${encodeURIComponent(i.id)}&acao=aprovar`)}">Aprovar</a>` : ''}
        </div>
      </div>`;
    })
    .join('');
  return pagina({
    titulo: `Pauta ${data} — VotoCheck`,
    descricao: 'Pauta interna.',
    caminho: '/admin/pauta',
    noindex: true,
    faixa: false,
    corpo: `
      <h1 style="font-size:30px;margin:0 0 6px">Pauta de ${escapeHtml(data)}</h1>
      <p style="color:var(--muted);margin:0 0 20px">As peças já estão agendadas no Buffer e saem sozinhas no horário indicado. Recuse o que não quiser publicar. Se algo sair e você não gostar, apague direto na rede. Nunca impulsionar peça que cite candidato.</p>
      ${cards || '<div class="vc-card"><p>Nenhuma peça gerada para esta data ainda.</p></div>'}`,
  });
}
