/**
 * VotoCheck — Cola eleitoral (/cola). F7 + ajuste D11 (26/09/2026).
 *
 *  - A cola é feita para o PAPEL: o celular não pode entrar na cabine (Lei 9.504/97, art. 91-A).
 *    O botão principal é "Imprimir / salvar em PDF"; a versão na tela serve para conferir na fila.
 *  - Tudo fica no aparelho (localStorage). Nada é enviado ao servidor — o VotoCheck não sabe em
 *    quem ninguém vai votar.
 *  - Compartilhar envia só o convite "Monte a sua cola", nunca os nomes escolhidos.
 *  - Ordem oficial dos 6 votos em 2026 (TSE): Dep. Federal, Dep. Estadual/Distrital, Senador (2
 *    vagas), Governador, Presidente.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';
import { UF_NOMES, seisVotos } from './home_html.js';
import { linkWhatsApp } from './apoio_html.js';
import { ICONE_B64 } from './marca_assets.js';

const ESTILO_COLA = `
  .cola-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 28px; align-items: start; }
  @media (max-width: 900px) { .cola-grid { grid-template-columns: 1fr; } }
  .cola-slot { display: grid; grid-template-columns: 34px 1fr auto; gap: 14px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; }
  .cola-slot-n { width: 34px; height: 34px; border-radius: 10px; background: var(--blue-50); color: var(--blue); display: grid; place-items: center; font-weight: 700; }
  .cola-slot-cargo { font-size: 12.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
  .cola-slot-nome { font-family: var(--font-display); font-weight: 700; font-size: 17px; }
  .cola-slot-nome small { font-family: var(--font-body); font-weight: 500; font-size: 13px; color: var(--muted); margin-left: 6px; }
  .cola-num { display: flex; align-items: center; gap: 8px; }
  .cola-num input { width: 92px; text-align: center; font-size: 20px; font-weight: 700; letter-spacing: .12em; padding: 8px 6px; border: 1.5px solid var(--line-2); border-radius: 10px; font-variant-numeric: tabular-nums; }
  .cola-num input:focus { border-color: var(--blue); outline: none; }
  .cola-acoes-slot { display: flex; gap: 10px; font-size: 13.5px; margin-top: 4px; }
  .cola-acoes-slot a { font-weight: 600; text-decoration: none; }
  .cola-cartao { background: #fff; border: 2px dashed var(--line-2); border-radius: 16px; padding: 20px; }
  .cola-cartao h3 { font-size: 15px; margin: 0 0 10px; display: flex; justify-content: space-between; }
  .cola-cartao table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
  .cola-cartao td { padding: 8px 4px; border-bottom: 1px solid var(--line); }
  .cola-cartao td:last-child { text-align: right; font-weight: 800; font-size: 19px; letter-spacing: .1em; font-variant-numeric: tabular-nums; }
  .cola-cartao .vazio { color: #B9C0CE; font-weight: 600; letter-spacing: .3em; }
  .cola-cartao-rodape { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
  .cola-cartao-rodape img { border-radius: 4px; flex: none; }
  .cola-cartao-rodape p { font-size: 11.5px; color: var(--muted); margin: 0; }
  @page { margin: 1.4cm; }
  @media print {
    body { background: #fff !important; }
    header.topo, footer.rodape, .vc-faixa, .nao-imprimir { display: none !important; }
    main.container { padding: 0 !important; max-width: none !important; }
    .cola-grid { display: block; }
    .cola-cartao { width: 9cm; border: 1.5px solid #000; border-radius: 8px; padding: 12px 14px; margin: 0 auto; }
    .cola-cartao td { padding: 4px 2px; font-size: 11pt; border-color: #999; }
    .cola-cartao td:last-child { font-size: 14pt; }
    .cola-cartao-rodape { margin-top: 8px; }
    .cola-cartao-rodape img { width: 16px; height: 16px; }
    .cola-cartao-rodape p { font-size: 9.5pt; color: #666; }
  }
`;

export function renderCola({ uf = '' } = {}) {
  const votos = seisVotos(uf);
  const slots = votos
    .map(
      (v) => `
    <div class="cola-slot" data-slot="${v.ordem}" data-cargo="${v.slug}" data-dig="${v.dig}">
      <span class="cola-slot-n">${v.ordem}</span>
      <div>
        <div class="cola-slot-cargo">${escapeHtml(v.nome)}</div>
        <div class="cola-slot-nome" data-nome>—</div>
        <div class="cola-acoes-slot nao-imprimir">
          <a href="/buscar?cargo=${v.slug}${v.slug !== 'presidente' && uf ? `&uf=${uf}` : ''}" data-buscar>Escolher na lista</a>
          <a href="#" data-limpar hidden>Limpar</a>
        </div>
      </div>
      <label class="cola-num"><span class="sr-only">Número para ${escapeHtml(v.nome)}</span>
        <input inputmode="numeric" pattern="[0-9]*" maxlength="${v.dig}" placeholder="${'0'.repeat(v.dig)}" data-numero />
      </label>
    </div>`
    )
    .join('');

  const linhasCartao = votos
    .map((v) => `<tr data-linha="${v.ordem}"><td>${v.ordem}. ${escapeHtml(v.nome)}</td><td class="vazio">${'_'.repeat(v.dig)}</td></tr>`)
    .join('');

  const convite = 'Montei minha cola para as eleições no VotoCheck. São 6 votos na urna: monte a sua em 2 minutos.';

  const corpo = `
  <style>${ESTILO_COLA}</style>
  <div class="nao-imprimir">
    <span class="vc-eyebrow">${Icone.impressora(16)} Cola eleitoral · 1º turno</span>
    <h1 style="font-size:clamp(28px,4vw,40px);margin:0 0 10px">Monte sua cola e leve impressa</h1>
    <p class="vc-lead" style="margin-bottom:18px">Seis votos, na ordem da urna. Escolha pela lista de candidatos ou digite o número que você já sabe. Fica só no seu aparelho: o VotoCheck não vê nem guarda suas escolhas.</p>
    <div class="vc-aviso" style="margin-bottom:22px">${Icone.alerta(16)} <strong>O celular não pode entrar na cabine de votação.</strong> Imprima a cola ou copie os números num papel. Levar cola em papel é permitido e recomendado pela Justiça Eleitoral.</div>
    <form method="GET" action="/cola" style="display:flex;gap:8px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
      <label for="uf-cola" style="font-weight:600">Seu estado:</label>
      <select id="uf-cola" name="uf" onchange="this.form.submit()" style="padding:9px 12px;border-radius:10px;border:1px solid var(--line-2)">
        <option value="">Escolha</option>
        ${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${escapeHtml(UF_NOMES[u])}</option>`).join('')}
      </select>
      <noscript><button class="vc-btn vc-btn--sec vc-btn--sm">Trocar</button></noscript>
    </form>
  </div>
  <div class="cola-grid">
    <div class="nao-imprimir">${slots}</div>
    <div>
      <div class="cola-cartao" id="cartao">
        <h3><span>Minha cola · 4/out</span><span style="color:var(--muted);font-weight:600">${uf ? escapeHtml(uf) : ''}</span></h3>
        <table>${linhasCartao}</table>
        <div class="cola-cartao-rodape">
          <img src="data:image/png;base64,${ICONE_B64}" alt="" width="18" height="18" />
          <p>votocheck.com.br · confira antes de decidir</p>
        </div>
      </div>
      <div class="nao-imprimir" style="display:grid;gap:10px;margin-top:14px">
        <button class="vc-btn vc-btn--pri" type="button" onclick="window.vcEv&&vcEv('cola_imprimir');window.print()">${Icone.impressora(18)} Imprimir ou salvar em PDF</button>
        <a class="vc-btn vc-btn--sec" href="${linkWhatsApp(convite, 'https://votocheck.com.br/cola')}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(convite)}" data-share-url="https://votocheck.com.br/cola" data-ev="cola_compartilhar">${Icone.whatsapp(18)} Convidar alguém a montar a cola</a>
        <p style="font-size:13px;color:var(--muted);margin:0">O convite não mostra suas escolhas, só o link para a pessoa montar a dela.</p>
        <button class="vc-btn vc-btn--sec" type="button" id="btn-card-cola">${Icone.qrcode(18)} Gerar card com minha cola pra compartilhar</button>
        <p style="font-size:13px;color:var(--muted);margin:0">Esse, sim, mostra quem você escolheu — uma imagem pronta pra postar ou mandar direto. Gerada no seu aparelho; o VotoCheck não vê nem guarda isso.</p>
        <p id="card-cola-status" style="font-size:13px;color:var(--muted);margin:0" hidden></p>
      </div>
    </div>
  </div>
  <script>
  (function(){
    var K='vc_cola_2026';
    function ler(){try{return JSON.parse(localStorage.getItem(K)||'{}')}catch(e){return {}}}
    function gravar(d){try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}}
    var dados=ler();
    function pintar(){
      document.querySelectorAll('.cola-slot').forEach(function(el){
        var s=el.dataset.slot, d=dados[s]||{}, inp=el.querySelector('[data-numero]');
        if(document.activeElement!==inp) inp.value=d.numero||'';
        el.querySelector('[data-nome]').innerHTML=d.nome?(d.nome.replace(/</g,'&lt;')+(d.partido?'<small>'+d.partido.replace(/</g,'&lt;')+'</small>':'')):(d.numero?'<span style="color:var(--muted);font-weight:500">Número digitado</span>':'—');
        el.querySelector('[data-limpar]').hidden=!(d.numero||d.nome);
        var tr=document.querySelector('[data-linha="'+s+'"] td:last-child');
        var dig=+el.dataset.dig;
        if(d.numero){tr.textContent=d.numero;tr.classList.remove('vazio')}else{tr.textContent=new Array(dig+1).join('_');tr.classList.add('vazio')}
      });
    }
    document.querySelectorAll('.cola-slot').forEach(function(el){
      var s=el.dataset.slot, inp=el.querySelector('[data-numero]');
      inp.addEventListener('input',function(){inp.value=inp.value.replace(/\\D/g,'').slice(0,+el.dataset.dig);var d=dados[s]||{};if(d.numero!==inp.value){d={numero:inp.value}}dados[s]=d;if(!inp.value)delete dados[s];gravar(dados);pintar();});
      el.querySelector('[data-limpar]').addEventListener('click',function(e){e.preventDefault();delete dados[s];gravar(dados);pintar();});
    });
    pintar();

    // ===== Card de compartilhamento (27/09/2026) =====
    // Gera uma imagem PNG no próprio aparelho, com foto+número+partido de quem foi escolhido, pra
    // compartilhar em status/redes. Nunca toca o servidor — mesma regra de privacidade da cola.
    var VOTOS_META = ${JSON.stringify(votos.map((v) => ({ slot: v.ordem, nome: v.nome })))};
    function carregarImagem(src){
      return new Promise(function(resolve){
        if(!src){ resolve(null); return; }
        var img=new Image();
        img.crossOrigin='anonymous';
        img.onload=function(){ resolve(img); };
        img.onerror=function(){ resolve(null); };
        img.src=src;
      });
    }
    function quebrarLinhas(ctx,texto,maxLargura){
      var palavras=texto.split(' '), linhas=[], atual='';
      for(var i=0;i<palavras.length;i++){
        var teste=atual?atual+' '+palavras[i]:palavras[i];
        if(ctx.measureText(teste).width>maxLargura && atual){ linhas.push(atual); atual=palavras[i]; }
        else { atual=teste; }
      }
      if(atual) linhas.push(atual);
      return linhas;
    }
    async function gerarCardCola(){
      var itens=[];
      for(var i=0;i<VOTOS_META.length;i++){
        var m=VOTOS_META[i], d=dados[m.slot];
        if(d && (d.numero||d.nome)) itens.push({ cargo:m.nome, nome:d.nome||'', numero:d.numero||'', partido:d.partido||'', foto:d.foto||'' });
      }
      var status=document.getElementById('card-cola-status');
      if(!itens.length){
        if(status){ status.hidden=false; status.style.color='#A12C7B'; status.textContent='Escolha pelo menos um candidato na cola antes de gerar o card.'; }
        return;
      }
      if(status){ status.hidden=false; status.style.color=''; status.textContent='Gerando imagem…'; }

      var W=1080,H=1350;
      var canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
      var ctx=canvas.getContext('2d');
      var NAVY='#0A1440', BLUE='#0059F5', TEAL='#00B495', MUTED='#6F7DB5';

      // fundo
      ctx.fillStyle='#F5F6FA'; ctx.fillRect(0,0,W,H);

      // topo navy
      var topoH=190;
      ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,topoH);
      var icone=await carregarImagem('data:image/png;base64,${ICONE_B64}');
      if(icone) ctx.drawImage(icone,56,52,86,86);
      ctx.fillStyle='#fff'; ctx.font='700 40px system-ui,Arial,sans-serif';
      ctx.fillText('Minha cola',icone?162:56,100);
      ctx.fillStyle='#B9C4EA'; ctx.font='500 26px system-ui,Arial,sans-serif';
      ctx.fillText('Eleições 2026 · 1º turno',icone?162:56,142);

      // linhas dos candidatos
      var n=itens.length;
      var areaTopo=topoH+30, areaBaixo=220;
      var alturaLinha=Math.floor((H-areaTopo-areaBaixo)/n);
      var fotoR=Math.min(64,Math.floor(alturaLinha*0.36));
      for(var j=0;j<n;j++){
        var it=itens[j], y=areaTopo+j*alturaLinha, cy=y+alturaLinha/2;
        ctx.strokeStyle='#E2E5F0'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(56,y+alturaLinha); ctx.lineTo(W-56,y+alturaLinha); ctx.stroke();
        var cx=56+fotoR;
        var imgFoto=it.foto?await carregarImagem(it.foto):null;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx,cy,fotoR,0,Math.PI*2); ctx.closePath(); ctx.clip();
        if(imgFoto){ ctx.drawImage(imgFoto,cx-fotoR,cy-fotoR,fotoR*2,fotoR*2); }
        else { ctx.fillStyle=BLUE+'22'; ctx.fillRect(cx-fotoR,cy-fotoR,fotoR*2,fotoR*2); ctx.fillStyle=BLUE; ctx.font='700 '+Math.floor(fotoR*0.9)+'px system-ui,Arial,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText((it.nome||'?').charAt(0).toUpperCase(),cx,cy+2); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; }
        ctx.restore();
        ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,fotoR,0,Math.PI*2); ctx.stroke();

        var textoX=cx+fotoR+28;
        ctx.fillStyle=NAVY; ctx.font='700 30px system-ui,Arial,sans-serif';
        ctx.fillText((it.nome||'Número digitado').slice(0,34), textoX, cy-8);
        ctx.fillStyle=MUTED; ctx.font='500 22px system-ui,Arial,sans-serif';
        ctx.fillText(it.cargo+(it.partido?' · '+it.partido:''), textoX, cy+26);

        ctx.fillStyle=BLUE; ctx.font='800 34px system-ui,Arial,sans-serif'; ctx.textAlign='right';
        ctx.fillText('Nº '+it.numero, W-56, cy+10);
        ctx.textAlign='left';
      }

      // rodapé navy com CTA
      var rodY=H-areaBaixo;
      ctx.fillStyle=NAVY; ctx.fillRect(0,rodY,W,areaBaixo);
      ctx.fillStyle='#fff'; ctx.font='700 28px system-ui,Arial,sans-serif';
      var linhasCta=quebrarLinhas(ctx,'Eu verifiquei as informações no votocheck.com.br. Faça o mesmo: vote informado e consciente, e ajude a escolher melhor os Representantes Públicos.',W-112);
      var cy2=rodY+56;
      for(var k=0;k<linhasCta.length;k++){ ctx.fillText(linhasCta[k],56,cy2); cy2+=38; }
      ctx.fillStyle=TEAL; ctx.font='800 32px system-ui,Arial,sans-serif';
      ctx.fillText('votocheck.com.br',56,rodY+areaBaixo-34);

      canvas.toBlob(function(blob){
        if(!blob){ if(status){ status.style.color='#A12C7B'; status.textContent='Não deu pra gerar a imagem agora — tente de novo.'; } return; }
        var arquivo=new File([blob],'minha-cola-votocheck.png',{type:'image/png'});
        if(navigator.canShare && navigator.canShare({ files:[arquivo] })){
          navigator.share({ files:[arquivo], title:'Minha cola VotoCheck', text:'Montei minha cola pras eleições 2026 no VotoCheck.' })
            .then(function(){ if(window.vcEv) vcEv('cola_card_compartilhar','share'); })
            .catch(function(){});
          if(status) status.hidden=true;
        } else {
          var url=URL.createObjectURL(blob);
          var a=document.createElement('a'); a.href=url; a.download='minha-cola-votocheck.png';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function(){ URL.revokeObjectURL(url); },4000);
          if(status){ status.style.color=''; status.textContent='Imagem baixada — é só anexar numa conversa ou nos stories.'; }
        }
        if(window.vcEv) vcEv('cola_card_gerado','');
      },'image/png',0.95);
    }
    var btnCard=document.getElementById('btn-card-cola');
    if(btnCard) btnCard.addEventListener('click',function(){ gerarCardCola().catch(function(){ var s=document.getElementById('card-cola-status'); if(s){ s.hidden=false; s.style.color='#A12C7B'; s.textContent='Não deu pra gerar a imagem agora — tente de novo.'; } }); });
  })();
  </script>`;

  return pagina({
    titulo: 'Monte sua cola eleitoral 2026 — os 6 votos na ordem da urna | VotoCheck',
    descricao: 'Monte sua cola para o 1º turno: deputado federal, estadual, 2 senadores, governador e presidente, na ordem oficial da urna. Imprima e leve. Nada fica salvo no servidor.',
    caminho: '/cola',
    ogImagem: 'https://votocheck.com.br/og/pagina/cola.jpg',
    corpo,
  });
}
