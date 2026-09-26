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
  @media print {
    body { background: #fff !important; }
    header.topo, footer.rodape, .vc-faixa, .nao-imprimir { display: none !important; }
    main.container { padding: 0 !important; max-width: none !important; }
    .cola-grid { display: block; }
    .cola-cartao { width: 9cm; border: 1.5px solid #000; border-radius: 8px; padding: 10px 12px; margin: 0; }
    .cola-cartao td { padding: 4px 2px; font-size: 11pt; border-color: #999; }
    .cola-cartao td:last-child { font-size: 14pt; }
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
        <p style="font-size:11.5px;color:var(--muted);margin:10px 0 0">votocheck.com.br · confira antes de decidir</p>
      </div>
      <div class="nao-imprimir" style="display:grid;gap:10px;margin-top:14px">
        <button class="vc-btn vc-btn--pri" type="button" onclick="window.vcEv&&vcEv('cola_imprimir');window.print()">${Icone.impressora(18)} Imprimir ou salvar em PDF</button>
        <a class="vc-btn vc-btn--sec" href="${linkWhatsApp(convite, 'https://votocheck.com.br/cola')}" target="_blank" rel="noopener" data-share data-share-texto="${escapeHtml(convite)}" data-share-url="https://votocheck.com.br/cola" data-ev="cola_compartilhar">${Icone.whatsapp(18)} Convidar alguém a montar a cola</a>
        <p style="font-size:13px;color:var(--muted);margin:0">O convite não mostra suas escolhas, só o link para a pessoa montar a dela.</p>
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
