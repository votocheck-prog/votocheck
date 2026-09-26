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

export async function decidirPeca(env, data, id, decisao) {
  const pauta = await lerPauta(env, data);
  if (!pauta) return false;
  const item = (pauta.itens || []).find((i) => i.id === id);
  if (!item) return false;
  item.status = decisao === 'aprovar' ? 'aprovada' : 'rejeitada';
  item.decidido_em = new Date().toISOString();
  await env.OG.put(`pauta:${data}`, JSON.stringify(pauta));
  return true;
}

export function renderPauta({ pauta, data, token }) {
  const q = (extra = '') => `t=${encodeURIComponent(token)}&d=${data}${extra}`;
  const itens = pauta?.itens || [];
  const cards = itens
    .map((i) => {
      const cor = i.status === 'aprovada' ? '#00806A' : i.status === 'rejeitada' ? '#B24C1F' : 'var(--muted)';
      const midia = (i.arquivos || [])
        .map((a) =>
          a.endsWith('.mp4')
            ? `<video src="/social/${escapeHtml(data)}/${escapeHtml(a)}?${q()}" controls preload="none" style="width:180px;border-radius:10px;background:#000"></video>`
            : `<a href="/social/${escapeHtml(data)}/${escapeHtml(a)}?${q()}" target="_blank"><img src="/social/${escapeHtml(data)}/${escapeHtml(a)}?${q()}" loading="lazy" style="width:120px;border-radius:8px;border:1px solid var(--line)"></a>`
        )
        .join('');
      return `
      <div class="vc-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
          <h3 style="margin:0">${escapeHtml(i.titulo)}</h3>
          <span style="font-weight:700;color:${cor};text-transform:uppercase;font-size:12.5px;letter-spacing:.06em">${escapeHtml(i.status || 'pendente')}</span>
        </div>
        <p style="margin:4px 0 12px">${escapeHtml(i.tipo)} · redes: ${escapeHtml((i.redes || []).join(', '))} · horário sugerido: ${escapeHtml(i.horario || '')}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${midia}</div>
        <details><summary style="cursor:pointer;font-weight:600">Legenda pronta</summary>
          <textarea readonly style="width:100%;min-height:150px;margin-top:8px;font:14px/1.5 var(--font-body);padding:10px;border-radius:10px;border:1px solid var(--line)">${escapeHtml(i.legenda || '')}</textarea>
        </details>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <a class="vc-btn vc-btn--pri vc-btn--sm" href="/admin/pauta/decidir?${q(`&id=${encodeURIComponent(i.id)}&acao=aprovar`)}">Aprovar</a>
          <a class="vc-btn vc-btn--sec vc-btn--sm" href="/admin/pauta/decidir?${q(`&id=${encodeURIComponent(i.id)}&acao=rejeitar`)}">Rejeitar</a>
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
      <p style="color:var(--muted);margin:0 0 20px">Aprove ou rejeite cada peça. Nada é publicado sem aprovação. Regras: sem candidato nominal, fonte na peça, sem impulsionamento pago.</p>
      ${cards || '<div class="vc-card"><p>Nenhuma peça gerada para esta data ainda.</p></div>'}`,
  });
}
