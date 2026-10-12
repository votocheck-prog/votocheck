/**
 * GA4 (G-T85G1G61WB) em modo opt-out — decisão do Rodrigo em 12/10/2026.
 *
 * Base legal: legítimo interesse (LGPD art. 7º, IX) para medição de audiência, com transparência
 * (aviso discreto + seção /termos#cookies) e recusa fácil. Sem uso publicitário: Google Signals e
 * personalização de anúncios desligados; ad_storage/ad_user_data/ad_personalization negados.
 *
 * Quem recusa: localStorage vc_ga='0' → gtag nem é carregado e os cookies _ga são apagados.
 * O script só é injetado depois do evento `load`, para não competir com o LCP.
 * A medição própria (D14, sem cookie, em D1) continua valendo como fonte primária.
 */
export const GA_ID = 'G-T85G1G61WB';

export const SCRIPT_GA = `
(function(){
  var ID='${GA_ID}',k='vc_ga',v=null;
  try{v=localStorage.getItem(k)}catch(e){}
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments)}
  window.gtag=gtag;
  function apagaCookies(){document.cookie.split(';').forEach(function(c){var n=c.split('=')[0].trim();if(/^_ga/.test(n)){['','.votocheck.com.br','votocheck.com.br'].forEach(function(d){document.cookie=n+'=;Max-Age=0;path=/'+(d?';domain='+d:'')})}})}
  function carrega(){
    gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
    gtag('js',new Date());
    gtag('config',ID,{allow_google_signals:false,allow_ad_personalization_signals:false});
    var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(s);
  }
  if(v==='0'){window['ga-disable-'+ID]=true}
  else if(document.readyState==='complete'){carrega()}
  else{window.addEventListener('load',carrega)}
  window.vcGa=function(aceita){
    try{localStorage.setItem(k,aceita?'1':'0')}catch(e){}
    if(!aceita){window['ga-disable-'+ID]=true;apagaCookies()}
    var b=document.getElementById('vc-ga');if(b)b.hidden=true;
    document.querySelectorAll('[data-ga-estado]').forEach(function(el){el.textContent=aceita?'ativa':'recusada'});
  };
  if(v===null){document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('vc-ga');if(b)b.hidden=false})}
  document.addEventListener('click',function(e){var t=e.target.closest('[data-ga]');if(t){e.preventDefault();window.vcGa(t.getAttribute('data-ga')==='1')}});
  document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('[data-ga-estado]').forEach(function(el){el.textContent=v==='0'?'recusada':'ativa'})});
})();`;

export const AVISO_GA = `<div id="vc-ga" class="vc-ga" role="region" aria-label="Aviso de medição de audiência" hidden>
<p>Medimos a audiência com Google Analytics, sem anúncios e sem venda de dados. Ao continuar navegando, você concorda com os <a href="/termos#cookies">termos</a>.</p>
<div class="vc-ga-acoes"><button type="button" class="vc-ga-ok" data-ga="1">Entendi</button><button type="button" class="vc-ga-nao" data-ga="0">Recusar</button></div>
</div>`;

export const ESTILO_GA = `.vc-ga{position:fixed;left:16px;bottom:16px;z-index:60;max-width:380px;background:#fff;border:1px solid var(--border,#dfe3ee);border-radius:12px;box-shadow:0 8px 24px rgba(10,20,64,.12);padding:14px 16px;font-size:13.5px;line-height:1.45;color:var(--text,#1a1f36)}
.vc-ga[hidden]{display:none}
.vc-ga p{margin:0 0 10px}
.vc-ga a{color:var(--blue,#1d4ed8)}
.vc-ga-acoes{display:flex;gap:8px}
.vc-ga button{font:inherit;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;min-height:36px}
.vc-ga-ok{background:var(--navy,#0A1440);color:#fff;border:1px solid var(--navy,#0A1440)}
.vc-ga-nao{background:transparent;color:var(--text-muted,#556);border:1px solid var(--border,#dfe3ee)}
.vc-ga button:focus-visible{outline:2px solid var(--blue,#1d4ed8);outline-offset:2px}
@media (max-width:480px){.vc-ga{left:12px;right:12px;bottom:12px;max-width:none}}`;
