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
  home: 'Antes de votar, eu confiro quem é quem no VotoCheck: candidatos do seu estado, com dado oficial e a fonte de cada informação.',
  perfil: 'Olha o que encontrei no VotoCheck sobre esse candidato, com dado oficial e fonte:',
  quiz: 'Fiz o Meu VotoCheck: em 2 minutos você diz o que importa pra você e vê quem tem essas características.',
  cola: 'Montei minha cola para as eleições no VotoCheck. Monte a sua (são 6 votos!):',
};

export function linkWhatsApp(texto, url) {
  return `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`;
}

export function renderCtaTriplo({ contexto = 'home', url = 'https://votocheck.com.br' } = {}) {
  const texto = TEXTOS[contexto] || TEXTOS.home;
  return `
  <section class="vc-sec vc-sec--branca vc-cta3" aria-labelledby="cta3-titulo">
    <div class="vc-wrap">
      <div class="vc-center">
        <span class="vc-eyebrow">${Icone.coracao(16)} Independente e sem financiamento público</span>
        <h2 class="vc-h2" id="cta3-titulo">Ajude mais gente a votar informada</h2>
        <p class="vc-lead">O VotoCheck não recebe dinheiro de partido, candidato ou governo. Cresce com quem acompanha, compartilha e apoia.</p>
      </div>
      <div class="vc-grid vc-grid-3">
        <div class="vc-card">
          <div class="vc-ico">${Icone.instagram(22)}</div>
          <h3>Siga</h3>
          <p>Um dado oficial por dia, explicado em 30 segundos. Sem torcida.</p>
          <div class="vc-acoes">
            <a class="vc-btn vc-btn--pri vc-btn--sm" href="${REDES.instagram}" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="instagram:${contexto}">Instagram</a>
            <a class="vc-btn vc-btn--sec vc-btn--sm" href="${REDES.tiktok}" target="_blank" rel="noopener" data-ev="seguir" data-ev-chave="tiktok:${contexto}">TikTok</a>
          </div>
        </div>
        <div class="vc-card">
          <div class="vc-ico vc-ico--teal">${Icone.compartilhar(22)}</div>
          <h3>Compartilhe</h3>
          <p>Mande para o grupo da família ou do trabalho. Quanto mais gente confere, melhor a escolha de todos.</p>
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
              <div style="font-size:11.5px;color:var(--muted);margin-top:4px">Recebedor: Rodrigo Gavioli Baggini, idealizador do projeto</div>
              <div style="margin-top:6px"><a href="#" data-copiar="${PIX_CHAVE}" data-ev-chave="pix" style="font-size:13.5px;font-weight:600">Copiar chave</a></div></div>
          </div>
          <div class="vc-acoes"><a class="vc-btn vc-btn--sec vc-btn--sm" href="mailto:contato@votocheck.com.br?subject=Quero%20apoiar%20o%20VotoCheck" data-ev="apoio_empresa" data-ev-chave="${contexto}">Anunciar ou apoiar como empresa</a></div>
        </div>
      </div>
    </div>
  </section>`;
}
