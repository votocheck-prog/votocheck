/**
 * VotoCheck — ícones SVG inline (nunca emoji).
 *
 * Estilo "line icon" consistente: stroke 1.75, sem preenchimento, cantos arredondados,
 * herdam a cor do texto ao redor via `currentColor` (para trocar de cor, envolva o ícone
 * num elemento com `color: ...`). Tamanho padrão 24x24, ajustável via parâmetro `tamanho`.
 *
 * Pequeno conjunto deliberadamente contido — adicione um novo ícone aqui só quando um
 * conceito novo precisar de um, para não pulverizar estilos.
 */
function svg(tamanho, conteudo) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${conteudo}</svg>`;
}

export const Icone = {
  busca: (t = 24) => svg(t, `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`),
  bussola: (t = 24) => svg(t, `<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5l-2 5-5 2 2-5 5-2z"/>`),
  documento: (t = 24) => svg(t, `<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6M9 9h2"/>`),
  lampada: (t = 24) => svg(t, `<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z"/>`),
  balanca: (t = 24) => svg(t, `<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h6M13 7h6"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0z"/>`),
  sino: (t = 24) => svg(t, `<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>`),
  megafone: (t = 24) => svg(t, `<path d="M3 11v2a2 2 0 0 0 2 2h1l3 4v-4h1l7 3V6l-7 3H9V8H6a2 2 0 0 0-2 2z"/><path d="M17 9a3 3 0 0 1 0 6"/>`),
  escudoCheck: (t = 24) => svg(t, `<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>`),
  mapa: (t = 24) => svg(t, `<path d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/>`),
  predio: (t = 24) => svg(t, `<path d="M4 21V7l8-4 8 4v14"/><path d="M4 21h16"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M15 14h.01"/>`),
  coracao: (t = 24) => svg(t, `<path d="M12 20s-7-4.4-9.5-9C1 8 2.2 4.5 5.5 4a4.8 4.8 0 0 1 6.5 2 4.8 4.8 0 0 1 6.5-2c3.3.5 4.5 4 3 7-2.5 4.6-9.5 9-9.5 9z"/>`),
  handshake: (t = 24) => svg(t, `<path d="M2 12l4-4 4 3 3-3 2 2 3-3 4 4-4 4-2-1-3 3-4-3-1 1"/>`),
  raioDados: (t = 24) => svg(t, `<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/><path d="M5 11v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>`),
  seta: (t = 24) => svg(t, `<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>`),
  fechar: (t = 24) => svg(t, `<path d="M6 6l12 12M18 6L6 18"/>`),
  qrcode: (t = 24) => svg(t, `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/>`),
  check: (t = 24) => svg(t, `<path d="M20 6L9 17l-5-5"/>`),
  checkCirculo: (t = 24) => svg(t, `<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>`),
  semNota: (t = 24) => svg(t, `<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>`),
  instagram: (t = 24) => svg(t, `<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>`),
  tiktok: (t = 24) => svg(t, `<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2.2 4.4 5 4.6"/>`),
  whatsapp: (t = 24) => svg(t, `<path d="M4 20l1.3-3.9A8 8 0 1 1 8.2 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.4-1.8-1.2-2.3-2.3l.8-1-1-2z"/>`),
  compartilhar: (t = 24) => svg(t, `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>`),
  copiar: (t = 24) => svg(t, `<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>`),
  impressora: (t = 24) => svg(t, `<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>`),
  urna: (t = 24) => svg(t, `<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M8 8V4h8v4"/><path d="M8 13h8"/><path d="M10 4l2-1 2 1"/>`),
  usuario: (t = 24) => svg(t, `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`),
  menu: (t = 24) => svg(t, `<path d="M4 6h16M4 12h16M4 18h16"/>`),
  cifrao: (t = 24) => svg(t, `<path d="M12 2v20"/><path d="M17 6.5c-1-1.5-2.8-2.5-5-2.5-2.8 0-5 1.5-5 4s2.2 3.3 5 4 5 1.5 5 4-2.2 4-5 4c-2.2 0-4-1-5-2.5"/>`),
  grafico: (t = 24) => svg(t, `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`),
  calendario: (t = 24) => svg(t, `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`),
  alerta: (t = 24) => svg(t, `<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>`),
  link: (t = 24) => svg(t, `<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`),
  pessoas: (t = 24) => svg(t, `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>`),
  votoCaixa: (t = 24) => svg(t, `<path d="M4 12h16v8H4z"/><path d="M7 12l3-8h7l-3 8"/><path d="M9.5 8.5l2 1.5 3-3"/>`),
};
