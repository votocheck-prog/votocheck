/**
 * VotoCheck — "Anuncie ou apoie como empresa" (/anuncie).
 *
 * Criada em 27/09/2026 pra substituir o botão que abria um mailto: direto (perdia contexto,
 * abria cliente de e-mail errado em muito celular, e não dava nenhuma informação antes de
 * escrever). Agora é uma página própria, visual, no mesmo padrão do resto do site, com um
 * formulário simples que envia por e-mail pra contato@votocheck.com.br via Resend
 * (ver POST /anuncie em src/index.js e enviarEmail() em lib/email.js).
 *
 * Conteúdo combinado com o Rodrigo em 26/09/2026: por que o apoio importa, as duas formas
 * (doação voluntária ou cota de publicidade — espaços A1–A5, ver lib/publicidade.js), a garantia
 * de que nenhum anunciante influencia dado ou levantamento, e a restrição de que empresa de
 * candidato ou político eleito não pode anunciar. O formulário só coleta contato — a negociação
 * em si acontece por e-mail depois.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { PIX_CHAVE } from './apoio_html.js';

const ESTILO_ANUNCIE = `
  .an-hero { background: var(--navy); color: #fff; padding: 56px 0 44px; position: relative; overflow: hidden; }
  .an-hero h1 { color: #fff; font-size: clamp(30px, 4.4vw, 46px); margin: 0 0 14px; }
  .an-hero p { color: #C3CDF0; font-size: 17px; max-width: 640px; margin: 0; line-height: 1.6; }
  .an-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }
  @media (max-width: 800px) { .an-grid { grid-template-columns: 1fr; } }
  .an-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; }
  .an-card .an-ico { width: 46px; height: 46px; border-radius: 12px; background: var(--blue-50); color: var(--blue); display: grid; place-items: center; margin-bottom: 14px; }
  .an-card h3 { font-size: 18px; margin: 0 0 8px; }
  .an-card p { margin: 0; color: var(--muted); font-size: 14.5px; line-height: 1.6; }
  .an-garantias { display: grid; gap: 10px; margin-top: 28px; }
  .an-garantia { display: flex; gap: 12px; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .an-garantia svg { flex: none; margin-top: 2px; color: var(--teal); }
  .an-garantia b { display: block; font-size: 15px; }
  .an-garantia span { font-size: 13.5px; color: var(--muted); }
  .an-restricao { background: #FFF8EB; border: 1px solid #F1DDB4; border-radius: 12px; padding: 14px 16px; margin-top: 10px; display: flex; gap: 12px; align-items: flex-start; }
  .an-restricao svg { flex: none; margin-top: 2px; color: #A16207; }
  .an-restricao span { font-size: 14px; color: #6B4A0E; }
  .an-form-wrap { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 28px; margin-top: 36px; box-shadow: var(--shadow-sm); }
  .an-form-wrap h2 { font-size: 22px; margin: 0 0 6px; }
  .an-form-wrap > p { color: var(--muted); font-size: 14.5px; margin: 0 0 22px; }
  .an-form { display: grid; gap: 14px; }
  .an-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 600px) { .an-form-row { grid-template-columns: 1fr; } }
  .an-form label { font-size: 13.5px; font-weight: 600; display: block; margin-bottom: 6px; }
  .an-form input, .an-form textarea { width: 100%; padding: 12px 14px; border: 1px solid var(--line-2); border-radius: 10px; font-size: 15px; font-family: inherit; box-sizing: border-box; }
  .an-form textarea { resize: vertical; min-height: 96px; }
  .an-form input:focus, .an-form textarea:focus { outline: none; border-color: var(--blue); }
  .an-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .an-pix-nota { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 14px; color: var(--muted); }
  .an-pix-nota code { background: var(--paper); padding: 2px 8px; border-radius: 6px; }
  .an-sucesso { background: #EFFBF6; border: 1px solid #B8E6D3; color: #00614E; border-radius: 12px; padding: 16px 18px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 24px; }
  .an-erro { background: #FDEEEE; border: 1px solid #F3C6C6; color: #8A1F1F; border-radius: 12px; padding: 16px 18px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 24px; }
`;

export function renderAnuncie({ status = '' } = {}) {
  const aviso =
    status === 'ok'
      ? `<div class="an-sucesso">${Icone.check(20)}<div><b>Mensagem enviada.</b> Recebemos seu contato em contato@votocheck.com.br e respondemos em até 2 dias úteis.</div></div>`
      : status === 'erro'
        ? `<div class="an-erro">${Icone.alerta(20)}<div><b>Não conseguimos enviar agora.</b> Tente de novo em instantes ou escreva direto para <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.</div></div>`
        : '';

  const corpo = `
    <style>${ESTILO_ANUNCIE}</style>
    <section class="an-hero">
      <div class="vc-wrap">
        <span class="vc-eyebrow" style="color:#7FB0FF">${Icone.handshake(16)} Apoie o VotoCheck</span>
        <h1>Manter o VotoCheck no ar depende de quem acredita nele</h1>
        <p>O VotoCheck não recebe dinheiro de partido, candidato ou governo. Cresce com doações de
        pessoas e com uma cota publicitária limitada de empresas apoiadoras — sempre sem
        contrapartida editorial. Sua mensagem ajuda a manter os dados atualizados e a cobertura
        crescendo até 2028 e 2030.</p>
      </div>
    </section>
    <div class="vc-wrap" style="padding-bottom:56px">
      <div class="an-grid">
        <div class="an-card">
          <div class="an-ico">${Icone.coracao(22)}</div>
          <h3>Doação voluntária</h3>
          <p>Qualquer valor ajuda, de pessoa física ou empresa. É simples: uma transferência via
          Pix, sem burocracia, sem contrato. Dado ao pé da página, ou peça mais detalhes pelo
          formulário abaixo.</p>
        </div>
        <div class="an-card">
          <div class="an-ico" style="background:var(--teal-50);color:#00735F">${Icone.predio(22)}</div>
          <h3>Cota de publicidade</h3>
          <p>Espaços limitados e sinalizados como "Publicidade" nas páginas do site, para empresas
          que querem apoiar de forma recorrente. Conte um pouco sobre sua empresa no formulário que
          respondemos com valores e disponibilidade.</p>
        </div>
      </div>

      <div class="an-garantias">
        <div class="an-garantia">${Icone.escudoCheck(20)}<div><b>Nenhum anunciante influencia o conteúdo</b><span>Doação ou publicidade não compram — nem evitam — nenhuma informação, dado ou levantamento no VotoCheck. O critério é sempre o mesmo pra todo mundo, pago ou não.</span></div></div>
        <div class="an-restricao">${Icone.alerta(20)}<span><b>Restrição importante:</b> empresas de propriedade de candidatos ou de políticos eleitos não podem anunciar no VotoCheck, em nenhuma hipótese.</span></div>
      </div>

      <div class="an-form-wrap">
        ${aviso}
        <h2>Fale com a gente</h2>
        <p>Conte quem você é e como quer apoiar. Respondemos por e-mail com mais detalhes — nenhum
        compromisso neste formulário.</p>
        <form class="an-form" method="POST" action="/anuncie">
          <input class="an-hp" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <div class="an-form-row">
            <div><label for="an-nome">Nome</label><input id="an-nome" name="nome" required maxlength="120" /></div>
            <div><label for="an-empresa">Empresa (se houver)</label><input id="an-empresa" name="empresa" maxlength="120" /></div>
          </div>
          <div class="an-form-row">
            <div><label for="an-email">E-mail</label><input id="an-email" name="email" type="email" required maxlength="160" /></div>
            <div><label for="an-whats">WhatsApp (opcional)</label><input id="an-whats" name="whatsapp" maxlength="30" /></div>
          </div>
          <div>
            <label for="an-msg">Mensagem</label>
            <textarea id="an-msg" name="mensagem" required maxlength="2000" placeholder="Quero apoiar com doação / quero saber mais sobre a cota de publicidade / outra dúvida..."></textarea>
          </div>
          <button class="vc-btn vc-btn--pri" type="submit" style="justify-self:start">Enviar mensagem</button>
        </form>
        <div class="an-pix-nota">Prefere já apoiar agora? Chave Pix: <code>${escapeHtml(PIX_CHAVE)}</code> — qualquer valor ajuda.</div>
      </div>
    </div>
  `;

  return pagina({
    titulo: 'Anuncie ou apoie o VotoCheck',
    descricao: 'Como apoiar o VotoCheck: doação voluntária ou cota de publicidade para empresas, sem influência editorial. Empresas de candidatos ou políticos eleitos não podem anunciar.',
    caminho: '/anuncie',
    corpo,
  });
}
