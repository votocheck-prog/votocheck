/**
 * VotoCheck — espaços publicitários (A1–A5) e configuração de redes sociais.
 *
 * Decisões (doc "Diagnóstico e Plano", seções 3.5 e 9 — 26/09/2026):
 *  - Todo anúncio leva o rótulo visível "Publicidade" (exigência do CDC/CONAR) e rel="sponsored".
 *  - Anunciantes iniciais = empresas do fundador (D17: sem identificação de vínculo, decisão do
 *    Rodrigo). Serão substituídas por apoiadores externos quando houver.
 *  - Categorias vetadas: partido, causa política, apostas, empréstimo predatório, órgão de governo.
 *  - Nenhum pixel de terceiro. Impressão e clique são contados pela medição própria (/e e /p/:id).
 *  - Um anúncio por página no máximo por espaço; nunca entre blocos de dado da ficha.
 *
 * Para trocar/incluir anunciante: edite ANUNCIANTES. `ativo:false` tira do rodízio sem apagar.
 */
import { escapeHtml } from './estilo_html.js';

export const REDES = {
  instagram: 'https://www.instagram.com/votocheck',
  tiktok: 'https://www.tiktok.com/@votocheck',
};

export const ANUNCIANTES = [
  { id: 'bpkids', nome: 'BP Kids', sigla: 'BK', cor: '#F2994A', titulo: 'Camisetas personalizadas para crianças', texto: 'Estampas com o nome e o estilo de cada criança.', cta: 'Conhecer a BP Kids', url: 'https://bpkids.com.br', ativo: true },
  { id: 'bprock', nome: 'BP Rock', sigla: 'BR', cor: '#1F1F1F', titulo: 'Camisetas de rock personalizadas', texto: 'Sua banda, seu estilo, sua camiseta.', cta: 'Conhecer a BP Rock', url: 'https://bprock.com.br', ativo: true },
  { id: 'myfacecode', nome: 'MyFaceCode', sigla: 'MF', cor: '#6C3CE1', titulo: 'Descubra as origens no seu rosto', texto: 'Análise fenotípica facial que revela traços da sua ancestralidade.', cta: 'Fazer minha análise', url: 'https://myfacecode.com.br', ativo: true },
  { id: 'valoracheck', nome: 'ValoraCheck', sigla: 'VC', cor: '#0E7C66', titulo: 'Quanto vale o seu imóvel?', texto: 'Avaliação imobiliária com dados de mercado e consultoria de patrimônio.', cta: 'Avaliar meu imóvel', url: 'https://valoracheck.com.br', ativo: true },
  { id: 'filafree', nome: 'Fila Free', sigla: 'FF', cor: '#0059F5', titulo: 'Menos espera na saída da escola', texto: 'Gestão inteligente de filas e da espera.', cta: 'Conhecer o Fila Free', url: 'https://filafree.com.br', ativo: true },
  { id: 'minhalenda', nome: 'Minha Lenda', sigla: 'ML', cor: '#B7791F', titulo: 'Histórias em que seu filho é o herói', texto: 'Livros, e-books e audiobooks infantis personalizados.', cta: 'Conhecer a Minha Lenda', url: 'https://minhalenda.com.br', ativo: false },
];

function ativos() {
  return ANUNCIANTES.filter((a) => a.ativo);
}

/** Escolhe um anunciante. `semente` estável (ex.: id da página) evita troca a cada refresh do mesmo visitante. */
export function escolherAnunciante(semente = '') {
  const lista = ativos();
  if (!lista.length) return null;
  let h = Math.floor(Date.now() / 600000); // gira a cada 10 min
  for (const ch of String(semente)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lista[h % lista.length];
}

/** Card nativo de publicidade. `espaco` = A1..A4 (usado na medição). */
export function renderPublicidade(espaco, semente = '') {
  const a = escolherAnunciante(espaco + semente);
  if (!a) return '';
  const href = `/p/${a.id}?e=${encodeURIComponent(espaco)}`;
  return `
  <a class="vc-pub" href="${href}" target="_blank" rel="sponsored noopener" data-ev="pub_impressao" data-ev-chave="${a.id}:${espaco}">
    <span class="vc-pub-rotulo">Publicidade</span>
    <img class="vc-pub-logo" src="/static/anunciante/${a.id}.png" alt="${escapeHtml(a.nome)}" width="120" height="80" loading="lazy" />
    <span class="vc-pub-texto"><strong>${escapeHtml(a.titulo)}</strong><span>${escapeHtml(a.nome)} · ${escapeHtml(a.texto)}</span></span>
    <span class="vc-pub-cta">${escapeHtml(a.cta)} →</span>
  </a>`;
}

/** Faixa A5 de apoiadores (rodapé global). */
export function renderApoiadores() {
  const lista = ativos();
  if (!lista.length) return '';
  return `<div class="rod-apoio"><small>Publicidade · Apoiadores</small><div class="vc-apoiadores">${lista
    .map((a) => `<a href="/p/${a.id}?e=A5" target="_blank" rel="sponsored noopener" title="${escapeHtml(a.nome)}"><img src="/static/anunciante/${a.id}.png" alt="${escapeHtml(a.nome)}" width="84" height="56" loading="lazy" /></a>`)
    .join('')}</div></div>`;
}

/** Destino do clique (/p/:id) — conta o clique e redireciona com UTM. */
export function urlDestinoAnunciante(id, espaco) {
  const a = ANUNCIANTES.find((x) => x.id === id && x.ativo);
  if (!a) return null;
  const u = new URL(a.url);
  u.searchParams.set('utm_source', 'votocheck');
  u.searchParams.set('utm_medium', 'apoio');
  u.searchParams.set('utm_campaign', `espaco_${(espaco || 'na').toLowerCase()}`);
  return u.toString();
}
