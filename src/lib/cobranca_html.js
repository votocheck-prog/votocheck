/**
 * VotoCheck — Cobrança estruturada (27/10/2026, plano pós-eleição §8 "Reclame Aqui + LinkedIn da política").
 *
 * /cobrar/:pessoaId  → o cidadão escolhe um FATO registrado (votação nominal, cota parlamentar,
 *                      dinheiro público da campanha) ou as prioridades do mandato, recebe um texto
 *                      pronto, educado e neutro, edita se quiser e envia pelo canal oficial
 *                      (e-mail de gabinete, Instagram declarado ao TSE, telefone).
 * POST /api/cobranca → conta a cobrança (sem login, 1 por pessoa/tema/dia por aparelho).
 *
 * Regras (neutralidade é inegociável): o VotoCheck não diz se o voto ou o gasto foi certo ou errado,
 * não dá nota e não escreve adjetivo. Toda pergunta parte de um fato com fonte. O contador mostra
 * quantas cobranças saíram pelo VotoCheck — é contagem de ação de cidadão, não avaliação.
 */
import { pagina, escapeHtml, SITE_URL } from './estilo_html.js';
import { Icone } from './icones.js';
import { nomeProprio } from './perfil_html.js';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dataBR = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** "Deputada", "Senador"... para a saudação. */
export function tratamento(cargoSlug, genero) {
  const f = genero === 'F';
  return {
    deputado_federal: f ? 'Deputada' : 'Deputado',
    deputado_estadual: f ? 'Deputada' : 'Deputado',
    deputado_distrital: f ? 'Deputada' : 'Deputado',
    senador: f ? 'Senadora' : 'Senador',
    governador: f ? 'Governadora' : 'Governador',
    presidente: 'Presidente',
  }[cargoSlug] || '';
}

const LEGISLATIVO = ['deputado_federal', 'deputado_estadual', 'deputado_distrital', 'senador'];

/** Monta os temas possíveis a partir do que está registrado. Cada tema = { id, rotulo, fato, fonte, url, pergunta }. */
export function temasCobranca({ cargoSlug, uf, votos = [], cota = null, fin = null }) {
  const temas = [];
  const vistos = new Set();
  for (const v of votos) {
    if (temas.length >= 4) break;
    const assunto = v.ex_projeto || v.descricao || 'uma votação do Plenário';
    if (vistos.has(assunto)) continue; // mesmo projeto votado várias vezes no dia (destaques): 1 cartão
    vistos.add(assunto);
    const voto = String(v.voto || '').trim();
    if (!voto) continue;
    temas.push({
      id: `votacao-${v.id}`,
      tipo: 'Votação',
      rotulo: `Votou "${voto}" · ${dataBR(v.data_votacao)}`,
      resumo: `${assunto}${v.ex_resumo ? `: ${String(v.ex_resumo).slice(0, 110)}${String(v.ex_resumo).length > 110 ? '…' : ''}` : ''}`,
      fato: `No dia ${dataBR(v.data_votacao)}, o seu voto registrado no Plenário foi "${voto}" em: ${String(assunto).slice(0, 220)}.`,
      fonte: v.casa === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados',
      url: v.url_origem || '',
      pergunta: `Pode explicar o motivo do seu voto e o que essa decisão muda para quem mora ${uf ? `em ${uf}` : 'no seu estado'}?`,
    });
  }
  if (cota && Number(cota.total) > 0) {
    const div = Number(cota.divulgacao) || 0;
    temas.push({
      id: 'cota',
      tipo: 'Cota parlamentar',
      rotulo: `${brl(cota.total)} de cota em 2026`,
      resumo: div ? `${brl(div)} em divulgação do mandato` : 'Gastos do gabinete pagos com dinheiro público',
      fato: `Segundo os dados abertos da Câmara, o seu gabinete usou ${brl(cota.total)} da cota parlamentar em 2026${div ? `, sendo ${brl(div)} em divulgação da atividade parlamentar` : ''}.`,
      fonte: 'Câmara dos Deputados (dados abertos da cota parlamentar)',
      url: 'https://www.camara.leg.br/transparencia/gastos-parlamentares',
      pergunta: 'Pode explicar como esses gastos ajudaram no seu trabalho de representante e o que pretende manter ou mudar no próximo mandato?',
    });
  }
  const publico = fin ? (Number(fin.fefc) || 0) + (Number(fin.fundo_partidario) || 0) : 0;
  if (publico > 0) {
    temas.push({
      id: 'fundo',
      tipo: 'Dinheiro público',
      rotulo: `${brl(publico)} públicos na campanha`,
      resumo: 'Fundo eleitoral e fundo partidário declarados ao TSE',
      fato: `Segundo a prestação de contas entregue ao TSE, a sua campanha de 2026 recebeu ${brl(publico)} de dinheiro público (fundo eleitoral e fundo partidário).`,
      fonte: 'TSE (prestação de contas de campanha)',
      url: 'https://divulgacandcontas.tse.jus.br',
      pergunta: LEGISLATIVO.includes(cargoSlug)
        ? 'O valor do fundo eleitoral de 2028 será decidido pelo Congresso no orçamento. Como pretende votar e por quê?'
        : 'Como pretende prestar contas à população sobre o uso de recursos públicos ao longo do mandato?',
    });
  }
  temas.push({
    id: 'prioridades',
    tipo: 'Mandato 2027',
    rotulo: 'Quais são as suas prioridades?',
    resumo: 'Vale para quem acabou de ser eleito e ainda não tem histórico',
    fato: cargoSlug === 'presidente' ? 'Você foi eleito para governar o país a partir de 2027.' : `Você foi eleito(a) em 2026 para representar a população ${uf ? `de ${uf}` : 'do seu estado'}.`,
    fonte: 'TSE (resultado oficial de 2026)',
    url: `${SITE_URL}/eleitos`,
    pergunta: 'Quais são as 3 prioridades do seu mandato e como a população pode acompanhar o andamento de cada uma?',
  });
  return temas;
}

function contatoLinks(ct, nome) {
  const ig = ct.instagram ? (/^https?:\/\//i.test(ct.instagram) ? ct.instagram : `https://${String(ct.instagram).replace(/^\/+/, '')}`) : '';
  return {
    email: ct.email || '',
    instagram: ig,
    telefone: ct.telefone || '',
    nome,
  };
}

export function renderCobrar({ pessoa, cand, contatos = {}, temas = [], total = 0, temaInicial = '' }) {
  const nome = nomeProprio(pessoa.nome_urna_atual || pessoa.nome_completo);
  const trat = tratamento(cand?.cargo_slug, pessoa.genero);
  const ct = contatoLinks(contatos, nome);
  const ini = escapeHtml(nome.slice(0, 1));
  const foto = pessoa.foto_url ? `<img src="${escapeHtml(pessoa.foto_url)}" alt="" width="72" height="72">` : ini;
  const sel = temas.find((t) => t.id === temaInicial) ? temaInicial : temas[0]?.id;
  const dados = { id: pessoa.id, nome, trat, uf: cand?.sg_uf || '', temas, ct };
  const canais = [
    ct.email ? `<button type="button" class="cb-canal" data-canal="email">${Icone.email(18)}<span><b>E-mail do gabinete</b><small>${escapeHtml(ct.email)}</small></span></button>` : '',
    ct.instagram ? `<button type="button" class="cb-canal" data-canal="instagram">${Icone.instagram(18)}<span><b>Instagram</b><small>Copia o texto e abre o perfil declarado ao TSE</small></span></button>` : '',
    ct.telefone ? `<a class="cb-canal" data-canal="telefone" href="tel:${escapeHtml(String(ct.telefone).replace(/[^\d+]/g, ''))}">${Icone.megafone(18)}<span><b>Telefone do gabinete</b><small>${escapeHtml(ct.telefone)}</small></span></a>` : '',
    `<button type="button" class="cb-canal" data-canal="copiar">${Icone.copiar(18)}<span><b>Só copiar o texto</b><small>Para mandar onde você preferir</small></span></button>`,
  ].join('');
  const semOficial = !ct.email && !ct.telefone;
  const corpo = `
  <style>${ESTILO_COBRAR}</style>
  <section class="cb-topo">
    <div class="vc-wrap cb-topo-grid">
      <a class="cb-foto" href="/candidato/${pessoa.id}" aria-label="Perfil de ${escapeHtml(nome)}">${foto}</a>
      <div>
        <nav class="cb-migalha" aria-label="Você está em"><a href="/candidato/${pessoa.id}">${escapeHtml(nome)}</a> › Cobrar</nav>
        <h1>Cobre ${escapeHtml(trat ? `${trat.toLowerCase() === 'presidente' ? 'o presidente' : trat.endsWith('a') ? 'a ' + trat.toLowerCase() : 'o ' + trat.toLowerCase()} ` : '')}${escapeHtml(nome)}</h1>
        <p class="cb-lead">Escolha um fato registrado, ajuste o texto se quiser e envie direto ao gabinete. Educado, com fonte e sem xingamento: é assim que a pergunta chega e é respondida.</p>
        <p class="cb-contador" aria-live="polite"><b class="tabnum" data-cb-total>${Number(total).toLocaleString('pt-BR')}</b> ${total === 1 ? 'cobrança enviada' : 'cobranças enviadas'} pelo VotoCheck</p>
      </div>
    </div>
  </section>
  <div class="vc-wrap cb-corpo">
    <ol class="cb-passos">
      <li class="cb-passo">
        <h2><span>1</span> Escolha o fato</h2>
        <div class="cb-temas" role="radiogroup" aria-label="Fato para a cobrança">
          ${temas
            .map(
              (t) => `
          <label class="cb-tema">
            <input type="radio" name="tema" value="${escapeHtml(t.id)}"${t.id === sel ? ' checked' : ''}>
            <span class="cb-tema-box"><small>${escapeHtml(t.tipo)}</small><b>${escapeHtml(t.rotulo)}</b><em>${escapeHtml(t.resumo)}</em></span>
          </label>`
            )
            .join('')}
        </div>
      </li>
      <li class="cb-passo">
        <h2><span>2</span> Confira o texto</h2>
        <label class="cb-label" for="cb-cidade">Sua cidade (opcional, ajuda o gabinete a saber de onde vem a pergunta)</label>
        <input class="cb-input" id="cb-cidade" type="text" maxlength="60" placeholder="Ex.: Campinas" autocomplete="address-level2">
        <label class="cb-label" for="cb-texto">Mensagem (pode editar)</label>
        <textarea class="cb-texto" id="cb-texto" rows="9"></textarea>
        <p class="cb-fonte" id="cb-fonte"></p>
      </li>
      <li class="cb-passo">
        <h2><span>3</span> Envie</h2>
        ${semOficial ? `<p class="cb-aviso">${Icone.alerta(16)} Ainda não há e-mail ou telefone oficial de gabinete para ${escapeHtml(nome)}. Quem assume mandato novo recebe o contato oficial na posse (1º de fevereiro de 2027 para o Congresso). Até lá, use o perfil declarado ao TSE ou copie o texto.</p>` : ''}
        <div class="cb-canais">${canais}</div>
        <div class="cb-ok" id="cb-ok" hidden>
          <b>${Icone.checkCirculo(18)} Cobrança registrada.</b>
          <p>Uma pergunta sozinha some no meio de centenas. Dez perguntas iguais viram pauta no gabinete. Chame mais gente para cobrar o mesmo fato:</p>
          <div class="cb-ok-acoes">
            <a class="vc-btn vc-btn--pri" id="cb-zap" href="#" target="_blank" rel="noopener">${Icone.whatsapp(18)} Chamar no WhatsApp</a>
            <button type="button" class="vc-btn vc-btn--sec" id="cb-link">${Icone.link(18)} Copiar link</button>
          </div>
        </div>
      </li>
    </ol>
    <aside class="cb-regras">
      <h2>Como funciona</h2>
      <ul>
        <li>${Icone.checkCirculo(16)} Toda cobrança parte de um fato com fonte oficial.</li>
        <li>${Icone.checkCirculo(16)} O VotoCheck não diz se o voto ou o gasto foi certo ou errado.</li>
        <li>${Icone.checkCirculo(16)} <span>A mensagem sai do <b>seu</b> e-mail ou perfil. Não guardamos o texto nem o seu contato.</span></li>
        <li>${Icone.checkCirculo(16)} O contador soma quantas cobranças saíram por aqui, no máximo uma por fato por dia em cada aparelho.</li>
      </ul>
      <a class="cb-voltar" href="/candidato/${pessoa.id}">${Icone.usuario(16)} Ver a ficha completa de ${escapeHtml(nome)}</a>
    </aside>
  </div>
  <script type="application/json" id="cb-dados">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>
  <script>
  (function(){
    var D=JSON.parse(document.getElementById('cb-dados').textContent);
    var tx=document.getElementById('cb-texto'), cid=document.getElementById('cb-cidade'), fon=document.getElementById('cb-fonte');
    var editado=false; tx.addEventListener('input',function(){ editado=true; });
    function tema(){ var r=document.querySelector('input[name=tema]:checked'); var id=r?r.value:''; for(var i=0;i<D.temas.length;i++) if(D.temas[i].id===id) return D.temas[i]; return D.temas[0]; }
    function montar(force){
      var t=tema(); if(!t) return;
      if(!editado||force){
        var c=(cid.value||'').trim();
        tx.value='Olá, '+(D.trat?D.trat+' ':'')+D.nome+'.\\n\\n'+t.fato+'\\n\\n'+t.pergunta+'\\n\\nSou eleitor(a) '+(c?'de '+c+(D.uf&&D.uf!=='BR'?' ('+D.uf+')':''):(D.uf&&D.uf!=='BR'?'de '+D.uf:'do Brasil'))+' e acompanho o seu mandato.\\n\\nFonte: '+t.fonte+(t.url?' ('+t.url+')':'')+'\\nEnviado pelo VotoCheck: votocheck.com.br/cobrar/'+D.id;
        editado=false;
      }
      fon.textContent='Fonte do fato: '+t.fonte+'.';
      try{ history.replaceState(null,'','?tema='+encodeURIComponent(t.id)); }catch(e){}
    }
    document.querySelectorAll('input[name=tema]').forEach(function(r){ r.addEventListener('change',function(){ montar(true); }); });
    cid.addEventListener('input',function(){ if(!editado) montar(); });
    montar(true);
    function registrar(canal){
      var t=tema(); var corpo=JSON.stringify({pessoa_id:D.id,tema:t.id,canal:canal});
      fetch('/api/cobranca',{method:'POST',headers:{'Content-Type':'application/json'},body:corpo,keepalive:true}).then(function(r){return r.json();}).then(function(j){ if(j&&j.total!=null){ var el=document.querySelector('[data-cb-total]'); if(el) el.textContent=Number(j.total).toLocaleString('pt-BR'); } }).catch(function(){});
      var ok=document.getElementById('cb-ok'); ok.hidden=false;
      var url=location.origin+'/cobrar/'+D.id+'?tema='+encodeURIComponent(t.id);
      document.getElementById('cb-zap').href='https://wa.me/?text='+encodeURIComponent('Eu cobrei '+D.nome+' sobre um fato registrado. Cobre também, leva 1 minuto: '+url);
      document.getElementById('cb-link').onclick=function(){ copiar(url); this.textContent='Link copiado'; };
      if(window.vcEvento) try{ window.vcEvento('cobranca', canal); }catch(e){}
    }
    function copiar(s){ if(navigator.clipboard) navigator.clipboard.writeText(s).catch(function(){}); else { var a=document.createElement('textarea'); a.value=s; document.body.appendChild(a); a.select(); try{document.execCommand('copy');}catch(e){} a.remove(); } }
    document.querySelectorAll('.cb-canal').forEach(function(b){
      b.addEventListener('click',function(ev){
        var canal=b.dataset.canal, t=tema();
        if(canal==='email'){ ev.preventDefault(); registrar('email'); location.href='mailto:'+D.ct.email+'?subject='+encodeURIComponent('Pergunta de um eleitor: '+t.tipo)+'&body='+encodeURIComponent(tx.value); }
        else if(canal==='instagram'){ ev.preventDefault(); copiar(tx.value); registrar('instagram'); b.querySelector('small').textContent='Texto copiado. Cole na mensagem direta.'; window.open(D.ct.instagram,'_blank','noopener'); }
        else if(canal==='copiar'){ ev.preventDefault(); copiar(tx.value); registrar('copiar'); b.querySelector('small').textContent='Texto copiado.'; }
        else if(canal==='telefone'){ registrar('telefone'); }
      });
    });
  })();
  </script>`;
  return pagina({
    titulo: `Cobrar ${nome}${cand?.cargo_nome ? ` (${cand.cargo_nome} ${cand.sg_uf})` : ''} com fato e fonte — VotoCheck`,
    descricao: `Mande uma pergunta para ${nome} a partir de um fato registrado: votações, cota parlamentar e dinheiro público da campanha. Texto pronto, educado e com fonte, enviado ao gabinete.`,
    caminho: `/cobrar/${pessoa.id}`,
    larga: true,
    corpo,
  });
}

/** Botão + contador para a ficha. */
export function blocoCobrarFicha({ pessoaId, nome, total = 0 }) {
  return `<a class="vc-btn vc-btn--pri" href="/cobrar/${pessoaId}" data-ev="cobrar_ficha">${Icone.megafone(18)} Cobrar ${escapeHtml(nome.split(' ')[0])}</a>${total ? `<span class="fx-cob-n"><b class="tabnum">${Number(total).toLocaleString('pt-BR')}</b> ${total === 1 ? 'cobrança' : 'cobranças'} pelo VotoCheck</span>` : ''}`;
}

export const ESTILO_COBRAR = `
  .cb-topo { background: var(--navy); color: #fff; padding: 36px 0 32px; }
  .cb-topo-grid { display: grid; grid-template-columns: 72px 1fr; gap: 20px; align-items: start; }
  .cb-foto { width: 72px; height: 72px; border-radius: 18px; overflow: hidden; background: rgba(255,255,255,.1); display: grid; place-items: center; color: #fff; font: 800 28px var(--font-display); text-decoration: none; }
  .cb-foto img { width: 100%; height: 100%; object-fit: cover; }
  .cb-migalha { font-size: 13.5px; color: #93A2D8; margin-bottom: 6px; }
  .cb-migalha a { color: #9EC0FF; text-decoration: none; }
  .cb-topo h1 { color: #fff; font-size: clamp(26px, 4vw, 40px); line-height: 1.1; letter-spacing: -.02em; margin: 0 0 10px; }
  .cb-lead { color: #C3CDF0; font-size: 16.5px; line-height: 1.55; margin: 0 0 14px; max-width: 680px; }
  .cb-contador { display: inline-flex; gap: 8px; align-items: baseline; margin: 0; background: rgba(95,227,200,.12); color: #CFF7EE; border-radius: 999px; padding: 7px 14px; font-size: 14.5px; }
  .cb-contador b { color: #5FE3C8; font-family: var(--font-display); font-size: 19px; }
  .cb-corpo { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 32px; padding-top: 28px; padding-bottom: 56px; align-items: start; }
  .cb-passos { list-style: none; margin: 0; padding: 0; display: grid; gap: 28px; }
  .cb-passo h2 { display: flex; align-items: center; gap: 10px; font-size: 20px; margin: 0 0 14px; }
  .cb-passo h2 span { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--navy); color: #fff; font-size: 15px; }
  .cb-temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
  .cb-tema { position: relative; cursor: pointer; }
  .cb-tema input { position: absolute; opacity: 0; inset: 0; }
  .cb-tema-box { display: flex; flex-direction: column; gap: 3px; height: 100%; background: #fff; border: 1.5px solid var(--line); border-radius: 14px; padding: 14px 16px; transition: border-color .15s ease, box-shadow .15s ease; }
  .cb-tema-box small { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--blue); }
  .cb-tema-box b { font-size: 15.5px; color: var(--ink); line-height: 1.3; }
  .cb-tema-box em { font-style: normal; font-size: 13.5px; color: var(--muted); line-height: 1.4; }
  .cb-tema:hover .cb-tema-box { border-color: var(--blue); }
  .cb-tema input:checked + .cb-tema-box { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.14); background: #F5F8FF; }
  .cb-tema input:focus-visible + .cb-tema-box { outline: 3px solid var(--blue); outline-offset: 2px; }
  .cb-label { display: block; font-size: 14px; font-weight: 700; color: var(--ink); margin: 12px 0 6px; }
  .cb-input, .cb-texto { width: 100%; box-sizing: border-box; font: 400 15.5px/1.55 var(--font-body); color: var(--ink); background: #fff; border: 1.5px solid var(--line-2); border-radius: 12px; padding: 11px 14px; }
  .cb-input { max-width: 320px; }
  .cb-texto { resize: vertical; min-height: 220px; }
  .cb-input:focus, .cb-texto:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.14); }
  .cb-fonte { font-size: 13px; color: var(--muted); margin: 8px 0 0; }
  .cb-aviso { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.5; color: #7A4B00; background: #FFF4E5; border: 1px solid #FFD9A8; border-radius: 12px; padding: 12px 14px; margin: 0 0 12px; }
  .cb-aviso svg { flex: none; margin-top: 2px; }
  .cb-canais { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
  .cb-canal { display: flex; gap: 12px; align-items: center; text-align: left; font: inherit; background: #fff; border: 1.5px solid var(--line); border-radius: 14px; padding: 14px 16px; cursor: pointer; text-decoration: none; color: var(--ink); min-height: 64px; transition: border-color .15s ease, transform .15s ease; }
  .cb-canal:hover { border-color: var(--blue); transform: translateY(-1px); }
  .cb-canal:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
  .cb-canal svg { color: var(--blue); flex: none; }
  .cb-canal b { display: block; font-size: 15px; }
  .cb-canal small { display: block; font-size: 12.5px; color: var(--muted); overflow-wrap: anywhere; }
  .cb-ok { margin-top: 16px; background: #EAFBF6; border: 1px solid #A7EBDB; border-radius: 16px; padding: 16px 18px; }
  .cb-ok b { display: flex; gap: 8px; align-items: center; color: #00735F; font-size: 16px; }
  .cb-ok p { margin: 8px 0 12px; color: var(--ink-2); font-size: 14.5px; line-height: 1.5; }
  .cb-ok-acoes { display: flex; gap: 8px; flex-wrap: wrap; }
  .cb-regras { position: sticky; top: 16px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }
  .cb-regras h2 { font-size: 17px; margin: 0 0 10px; }
  .cb-regras ul { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 10px; }
  .cb-regras li { display: grid; grid-template-columns: 18px 1fr; gap: 8px; font-size: 14px; color: var(--ink-2); line-height: 1.45; }
  .cb-regras li svg { color: #00A383; margin-top: 2px; }
  .cb-voltar { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; font-weight: 700; color: var(--blue); text-decoration: none; }
  @media (max-width: 860px) { .cb-corpo { grid-template-columns: 1fr; } .cb-regras { position: static; } }
  @media (max-width: 520px) { .cb-topo-grid { grid-template-columns: 56px 1fr; gap: 14px; } .cb-foto { width: 56px; height: 56px; border-radius: 14px; } }
  @media (prefers-reduced-motion: reduce) { .cb-canal, .cb-tema-box { transition: none; } .cb-canal:hover { transform: none; } }
`;
