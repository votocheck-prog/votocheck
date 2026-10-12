/**
 * VotoCheck — "Meus representantes" (08/10/2026): a nova cola depois da eleição.
 *
 * A pessoa salva no próprio navegador (localStorage, chave vc_meus_v1) até 3 deputados federais,
 * 3 deputados estaduais/distritais e 3 senadores. Nada vai para o servidor: a página
 * /meus-representantes lê a lista do navegador e busca os dados públicos em /api/representantes.
 * Botão: botaoFav({ id, cargo, nome, partido, uf }) + SCRIPT_FAV na página.
 */
import { pagina, escapeHtml } from './estilo_html.js';
import { Icone } from './icones.js';

export const GRUPO_FAV = { deputado_federal: 'federal', deputado_estadual: 'estadual', deputado_distrital: 'estadual', senador: 'senador' };
const ROTULO = { federal: 'Deputados federais', estadual: 'Deputados estaduais e distritais', senador: 'Senadores' };

export function botaoFav({ id, cargo, nome, partido = '', uf = '' }, classe = '') {
  if (!GRUPO_FAV[cargo]) return '';
  return `<button type="button" class="vc-fav ${classe}" data-fav data-id="${escapeHtml(id)}" data-cargo="${escapeHtml(cargo)}" data-nome="${escapeHtml(nome)}" data-partido="${escapeHtml(partido)}" data-uf="${escapeHtml(uf)}" aria-pressed="false">${Icone.coracao(15)}<span>Salvar</span></button>`;
}

export const ESTILO_FAV = `
  .vc-fav { display: inline-flex; align-items: center; gap: 5px; font: 700 12.5px var(--font-body); color: var(--blue); background: var(--blue-50); border: 1.5px solid transparent; border-radius: 999px; padding: 5px 11px; cursor: pointer; min-height: 30px; white-space: nowrap; }
  .vc-fav:hover { border-color: var(--blue); }
  .vc-fav[aria-pressed="true"] { background: var(--blue); color: #fff; }
  .vc-fav[aria-pressed="true"] svg { fill: currentColor; }
  .vc-fav--grande { font-size: 15px; padding: 11px 18px; min-height: 46px; gap: 8px; }
  .vc-fav-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--navy); color: #fff; padding: 12px 18px; border-radius: 12px; font-size: 14px; z-index: 90; box-shadow: 0 12px 30px rgba(0,0,0,.3); max-width: calc(100vw - 32px); }
  .vc-fav-toast a { color: #9EC0FF; font-weight: 700; margin-left: 6px; }
`;

/** Script único: marca os botões já salvos, alterna ao clicar, limite de 3 por grupo, atualiza o contador do menu. */
export const SCRIPT_FAV = `
(function(){
  var K='vc_meus_v1', G=${JSON.stringify(GRUPO_FAV)};
  function ler(){ try { return JSON.parse(localStorage.getItem(K)) || {federal:[],estadual:[],senador:[]}; } catch(e){ return {federal:[],estadual:[],senador:[]}; } }
  function gravar(d){ try { localStorage.setItem(K, JSON.stringify(d)); } catch(e){} }
  function toast(t){ var el=document.querySelector('.vc-fav-toast'); if(!el){ el=document.createElement('div'); el.className='vc-fav-toast'; el.setAttribute('role','status'); document.body.appendChild(el); } el.innerHTML=t; el.hidden=false; clearTimeout(el._t); el._t=setTimeout(function(){ el.hidden=true; }, 4200); }
  function contador(){ var d=ler(), n=(d.federal||[]).length+(d.estadual||[]).length+(d.senador||[]).length; document.querySelectorAll('[data-fav-count]').forEach(function(e){ e.textContent=n?String(n):''; e.hidden=!n; }); }
  function pintar(){ var d=ler(); document.querySelectorAll('[data-fav]').forEach(function(b){ var g=G[b.dataset.cargo]; var on=(d[g]||[]).some(function(x){ return String(x.id)===b.dataset.id; }); b.setAttribute('aria-pressed', on?'true':'false'); var s=b.querySelector('span'); if(s) s.textContent=on?'Salvo':'Salvar'; }); contador(); }
  document.addEventListener('click', function(e){
    var b=e.target.closest && e.target.closest('[data-fav]'); if(!b) return;
    var d=ler(), g=G[b.dataset.cargo]; if(!g) return; d[g]=d[g]||[];
    var i=d[g].findIndex(function(x){ return String(x.id)===b.dataset.id; });
    if(i>=0){ d[g].splice(i,1); gravar(d); pintar(); toast('Removido dos seus representantes.'); return; }
    if(d[g].length>=3){ toast('Você já salvou 3 nesse cargo. Remova um em <a href="/meus-representantes">Meus representantes</a>.'); return; }
    d[g].push({ id:b.dataset.id, cargo:b.dataset.cargo, nome:b.dataset.nome, partido:b.dataset.partido, uf:b.dataset.uf }); gravar(d); pintar();
    toast('Salvo nos seus representantes. <a href="/meus-representantes">Ver lista</a>');
    window.vcEv && vcEv('fav_add', b.dataset.cargo);
  });
  pintar();
})();`;

export function renderMeusRepresentantes() {
  const ig = Icone.instagram(15).replace(/'/g, "\\'");
  const em = Icone.email(15).replace(/'/g, "\\'");
  const us = Icone.usuario(15).replace(/'/g, "\\'");
  const corpo = `
    <style>${ESTILO_FAV}
      .mr-topo { background: var(--navy); color: #fff; padding: 36px 0 30px; }
      .mr-topo h1 { color: #fff; font-size: clamp(26px, 3.4vw, 38px); margin: 0 0 10px; }
      .mr-topo p { color: #C3CDF0; max-width: 720px; margin: 0; font-size: 16px; }
      .mr-acoes { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
      .mr-corpo { padding: 28px 0 56px; }
      .mr-grupo { margin-bottom: 28px; }
      .mr-grupo h2 { font-size: 20px; margin: 0 0 4px; }
      .mr-grupo > p { font-size: 13.5px; color: var(--muted); margin: 0 0 12px; }
      .mr-lista { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
      .mr-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: grid; gap: 10px; align-content: start; }
      .mr-cab { display: grid; grid-template-columns: 56px 1fr; gap: 12px; align-items: center; }
      .mr-foto { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; background: var(--blue-50); display: grid; place-items: center; font: 800 22px var(--font-display); color: var(--blue); text-decoration: none; }
      .mr-foto img { width: 100%; height: 100%; object-fit: cover; }
      .mr-nome { font: 700 16.5px var(--font-display); color: var(--ink); text-decoration: none; display: block; line-height: 1.2; }
      .mr-meta { font-size: 13px; color: var(--muted); }
      .mr-cts { display: flex; gap: 6px; flex-wrap: wrap; }
      .mr-ct { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--ink); text-decoration: none; border: 1px solid var(--line-2); border-radius: 999px; padding: 5px 10px; min-height: 30px; }
      .mr-ct:hover { border-color: var(--blue); color: var(--blue); }
      .mr-ct svg { color: var(--blue); }
      .mr-tel { font-size: 13px; color: var(--ink-2); word-break: break-all; }
      .mr-vazio { grid-column: 1 / -1; background: #fff; border: 1px dashed var(--line-2); border-radius: 14px; padding: 16px; color: var(--muted); font-size: 14px; }
      .mr-remover { justify-self: start; font-size: 12.5px; color: var(--muted); background: none; border: 0; padding: 4px 0; cursor: pointer; text-decoration: underline; }
      @media (max-width: 900px) { .mr-lista { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .mr-lista { grid-template-columns: 1fr; } }
      @media print { header, footer, .vc-faixa, .mr-acoes, .mr-remover, .vc-pub { display: none !important; } .mr-topo { background: #fff; color: #000; padding: 0; } .mr-topo h1, .mr-topo p { color: #000; } }
    </style>
    <section class="mr-topo">
      <div class="vc-wrap">
        <h1>Meus representantes</h1>
        <p>Os eleitos que você salvou: até 3 deputados federais, 3 estaduais e 3 senadores. Fica guardado só neste aparelho, sem cadastro. Use para acompanhar e cobrar: perfil, Instagram, e-mail e telefone oficiais.</p>
        <div class="mr-acoes">
          <a class="vc-btn vc-btn--pri" href="/quiz">${Icone.bussola(18)} Encontrar pelo Meu VotoCheck</a>
          <button type="button" class="vc-btn vc-btn--claro" id="mr-compartilhar">${Icone.whatsapp(18)} Compartilhar minha lista</button>
          <button type="button" class="vc-btn vc-btn--claro" onclick="window.print()">${Icone.impressora(18)} Imprimir</button>
        </div>
      </div>
    </section>
    <div class="mr-corpo"><div class="vc-wrap" id="mr-app">
      ${['federal', 'estadual', 'senador'].map((g) => `<section class="mr-grupo" data-grupo="${g}"><h2>${ROTULO[g]}</h2><p>Até 3.</p><div class="mr-lista"><div class="mr-vazio">Carregando…</div></div></section>`).join('')}
      <p style="font-size:12.5px;color:var(--muted)">Fontes: TSE (resultado e redes declaradas), Câmara dos Deputados e Senado Federal (e-mail e telefone de gabinete). Eleitos novos ganham e-mail oficial depois da posse, em 1º de fevereiro de 2027.</p>
    </div></div>
    <script>
    (function(){
      var K='vc_meus_v1';
      function ler(){ try { return JSON.parse(localStorage.getItem(K)) || {federal:[],estadual:[],senador:[]}; } catch(e){ return {federal:[],estadual:[],senador:[]}; } }
      function gravar(d){ try { localStorage.setItem(K, JSON.stringify(d)); } catch(e){} }
      function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
      var IG='${ig}', EM='${em}', US='${us}';
      function card(x, info){
        info=info||{};
        var nome=info.nome||x.nome, foto=info.foto_url, ig=info.instagram, em=info.email, tel=info.telefone;
        if(ig && !/^https?:/i.test(ig)) ig='https://'+ig.replace(/^\\/+/,'');
        var meta=[info.partido||x.partido, info.uf||x.uf].filter(Boolean).join(' · ')+(info.votos?' · '+Number(info.votos).toLocaleString('pt-BR')+' votos':'');
        return '<article class="mr-card"><div class="mr-cab"><a class="mr-foto" href="/candidato/'+esc(x.id)+'" aria-hidden="true" tabindex="-1">'+(foto?'<img src="'+esc(foto)+'" alt="">':esc(String(nome).charAt(0)))+'</a><div><a class="mr-nome" href="/candidato/'+esc(x.id)+'">'+esc(nome)+'</a><div class="mr-meta">'+esc(meta)+'</div></div></div>'
          +'<div class="mr-cts">'+(ig?'<a class="mr-ct" href="'+esc(ig)+'" target="_blank" rel="noopener">'+IG+'Instagram</a>':'')+(em?'<a class="mr-ct" href="mailto:'+esc(em)+'">'+EM+'E-mail</a>':'')+'<a class="mr-ct" href="/candidato/'+esc(x.id)+'">'+US+'Perfil</a></div>'
          +(em?'<div class="mr-tel">'+esc(em)+'</div>':'')+(tel?'<div class="mr-tel">Gabinete: '+esc(tel)+'</div>':'')
          +'<button type="button" class="mr-remover" data-remover="'+esc(x.id)+'">Remover</button></article>';
      }
      function desenhar(infos){
        var d=ler();
        document.querySelectorAll('.mr-grupo').forEach(function(sec){
          var g=sec.dataset.grupo, l=d[g]||[], alvo=sec.querySelector('.mr-lista');
          sec.querySelector('p').textContent=l.length+' de 3 salvos.';
          alvo.innerHTML=l.length? l.map(function(x){ return card(x, infos[x.id]); }).join('') : '<div class="mr-vazio">Nenhum salvo ainda. Use o <a href="/quiz">Meu VotoCheck</a>, a <a href="/#estados">busca por CEP</a> ou o botão Salvar na ficha de cada eleito.</div>';
        });
      }
      var d=ler(), ids=[].concat(d.federal||[], d.estadual||[], d.senador||[]).map(function(x){ return x.id; });
      desenhar({});
      if(ids.length){ fetch('/api/representantes?ids='+ids.join(',')).then(function(r){ return r.json(); }).then(function(j){ desenhar(j||{}); }).catch(function(){}); }
      document.getElementById('mr-app').addEventListener('click', function(e){
        var b=e.target.closest('[data-remover]'); if(!b) return; var d=ler();
        ['federal','estadual','senador'].forEach(function(g){ d[g]=(d[g]||[]).filter(function(x){ return String(x.id)!==b.dataset.remover; }); });
        gravar(d); location.reload();
      });
      document.getElementById('mr-compartilhar').addEventListener('click', function(){
        var d=ler(), linhas=[];
        ['federal','estadual','senador'].forEach(function(g){ (d[g]||[]).forEach(function(x){ linhas.push('• '+x.nome+' ('+x.partido+') — '+location.origin+'/candidato/'+x.id); }); });
        var t='Meus representantes no VotoCheck, para acompanhar e cobrar:\\n'+(linhas.join('\\n')||'ainda vazio')+'\\n\\nMonte a sua: '+location.origin+'/quiz';
        if(navigator.share){ navigator.share({ text:t }).catch(function(){}); } else { window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank'); }
      });
    })();
    </script>`;
  return pagina({
    titulo: 'Meus representantes — VotoCheck',
    descricao: 'Os eleitos que você escolheu acompanhar: até 3 deputados federais, 3 estaduais e 3 senadores, com perfil e contatos oficiais. Guardado só no seu aparelho.',
    caminho: '/meus-representantes',
    noindex: true,
    larga: true,
    corpo,
  });
}
