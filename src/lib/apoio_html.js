/**
 * VotoCheck — bloco "Siga · Compartilhe · Apoie" (doc seção 3.6), usado na home, ficha e quiz.
 * D18 (26/09/2026): sem Canal do WhatsApp — o CTA principal de "seguir" é o Instagram @votocheck.
 * O compartilhamento por WhatsApp continua (link wa.me + botão nativo do celular).
 * O QR do Pix é servido em /static/pix-qr.png (antes ia em base64 dentro de cada página).
 */
import { Icone } from './icones.js';
import { REDES } from './publicidade.js';

export const PIX_CHAVE = 'pix@votocheck.com.br';

const TEXTOS = {
  home: 'Dia 4 a gente escolhe quem faz as leis pelos próximos 4 anos. Eu vou conferir antes de votar, com dado oficial e fonte. Confere também:',
  perfil: 'Olha o que encontrei no VotoCheck sobre esse candidato, com dado oficial e fonte:',
  quiz: 'Fiz o Meu VotoCheck: em 2 minutos você diz o que importa pra você e vê quem tem essas características.',
  cola: 'Montei minha cola para as eleições no VotoCheck. Monte a sua (são 6 votos!):',
};

export function linkWhatsApp(texto, url) {
  return `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`;
}

const DIA_1T = Date.UTC(2026, 9, 4, 15); // 4/out, 12h em Brasília

/** Chamada principal do bloco. Até o 1º turno: apelo emocional e urgência (pedido do Rodrigo,
 *  26/09/2026). Depois: tom de acompanhamento. Só fatos: deputados têm 4 anos, senadores 8. */
function chamada(agora = Date.now()) {
  const dias = Math.ceil((DIA_1T - agora) / 86400000);
  if (dias > 0) {
    return {
      eyebrow: `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} · 4 de outubro`,
      titulo: 'Conhecer antes ou reclamar depois?',
      lead: 'Dia 4 você escolhe quem faz as leis pelos próximos 4 anos, e dois senadores que ficam 8. Traga mais gente para essa conversa: cada pessoa que confere antes de votar muda o resultado.',
    };
  }
  return {
    eyebrow: 'Independente e sem financiamento público',
    titulo: 'Quem foi eleito precisa ser acompanhado',
    lead: 'O VotoCheck não recebe dinheiro de partido, candidato ou governo. Cresce com quem acompanha, compartilha e apoia.',
  };
}

export function renderCtaTriplo({ contexto = 'home', url = 'https://votocheck.com.br' } = {}) {
  const texto = TEXTOS[contexto] || TEXTOS.home;
  const c = chamada();
  return `
  <section class="vc-sec vc-sec--branca vc-cta3" aria-labelledby="cta3-titulo">
    <div class="vc-wrap">
      <div class="vc-center">
        <span class="vc-eyebrow">${Icone.coracao(16)} ${c.eyebrow}</span>
        <h2 class="vc-h2" id="cta3-titulo">${c.titulo}</h2>
        <p class="vc-lead">${c.lead}</p>
      </div>
      <div class="vc-grid vc-grid-3">
        <div class="vc-card">
          <div class="vc-ico">${Icone.instagram(22)}</div>
          <h3>Siga @votocheck</h3>
          <p>Até o dia 4, um raio-X da eleição por dia, explicado em 30 segundos. Sem torcida.</p>
          <div class="vc-acoes">
            <a class="vc-btn vc-btn--pri vc-btn--sm" href="${REDES.instagram}" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="instagram:${contexto}">Instagram</a>
            <a class="vc-btn vc-btn--sec vc-btn--sm" href="${REDES.tiktok}" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="tiktok:${contexto}">TikTok</a>
          </div>
        </div>
        <div class="vc-card">
          <div class="vc-ico vc-ico--teal">${Icone.compartilhar(22)}</div>
          <h3>Mande para 3 pessoas</h3>
          <p>Aquele grupo da família ou do trabalho em que ninguém sabe em quem votar para deputado. Um clique.</p>
          <div class="vc-acoes">
            <a class="vc-btn vc-btn--pri vc-btn--sm" href="${linkWhatsApp(texto, url)}" target="_blank" rel="noopener" data-share data-share-texto="${texto.replace(/"/g, '&quot;')}" data-share-url="${url}">${Icone.whatsapp(18)} Enviar no WhatsApp</a>
            <a class="vc-btn vc-btn--sec vc-btn--sm" href="#" data-copiar="${url}" data-ev-chave="link:${contexto}">${Icone.link(16)} Copiar link</a>
          </div>
        </div>
        <div class="vc-card">
          <div class="vc-ico">${Icone.handshake(22)}</div>
          <h3>Apoie</h3>
          <p>Qualquer valor ajuda a manter os dados atualizados e ampliar a cobertura.</p>
          <div class="vc-pix">
            <img src="/static/pix-qr.png" alt="QR Code Pix para apoiar o VotoCheck" width="96" height="96" loading="lazy" />
            <div><div style="font-size:13px;color:var(--muted)">Chave Pix</div><code>${PIX_CHAVE}</code>
              <div style="font-size:10.5px;color:#9AA3B5;margin-top:4px">Recebedor: Rodrigo G Baggini · idealizador VotoCheck</div>
              <div style="margin-top:6px"><a href="#" data-copiar="${PIX_CHAVE}" data-ev-chave="pix" style="font-size:13.5px;font-weight:600">Copiar chave</a></div></div>
          </div>
          <div class="vc-acoes"><a class="vc-btn vc-btn--sec vc-btn--sm" href="/anuncie" data-ev="apoio_empresa" data-ev-chave="${contexto}">Anunciar ou apoiar como empresa</a></div>
        </div>
      </div>
    </div>
  </section>`;
}
