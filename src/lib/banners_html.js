/**
 * VotoCheck — placeholders de banner publicitário.
 *
 * Decisão do Rodrigo (19-20/09): ainda não decidiu se vai exibir publicidade. Este módulo só
 * deixa os DOIS espaços reservados (um "fino", tipo faixa, e um "largo", um pouco mais alto)
 * prontos para habilitar quando/se decidir — sem depender de nenhuma rede de anúncios
 * específica (nenhuma foi escolhida ainda). Enquanto `ATIVO` for `false`, nada é renderizado:
 * nenhum espaço em branco, nenhum elemento vazio na página.
 *
 * Pra habilitar:
 *   1) Troque ATIVO para `true`.
 *   2) Preencha imagemUrl/linkUrl/alt de FINO e/ou LARGO (pode habilitar só um dos dois).
 *   3) Se decidir usar uma rede de anúncios (Google Ad Manager, etc.) em vez de imagem+link
 *      direto, troque o conteúdo de bannerSlot() abaixo pelo snippet daquela rede — a posição
 *      na homepage (ver busca_html.js) não muda.
 */
const ATIVO = false;

const FINO = {
  imagemUrl: '',
  linkUrl: '',
  alt: '',
};

const LARGO = {
  imagemUrl: '',
  linkUrl: '',
  alt: '',
};

function bannerSlot({ tamanho, imagemUrl, linkUrl, alt }) {
  if (!imagemUrl || !linkUrl) return '';
  return `
    <a class="banner-slot banner-slot--${tamanho}" href="${linkUrl}" target="_blank" rel="noopener sponsored" aria-label="${alt || 'Publicidade'}">
      <img src="${imagemUrl}" alt="${alt || ''}" loading="lazy" />
    </a>`;
}

export function renderBanners() {
  if (!ATIVO) return '';
  const fino = bannerSlot({ tamanho: 'fino', ...FINO });
  const largo = bannerSlot({ tamanho: 'largo', ...LARGO });
  if (!fino && !largo) return '';
  return `<div class="banners-wrap">${fino}${largo}</div>`;
}
