/**
 * VotoCheck — Eleitos mais votados por cidade + busca por CEP (08/10/2026).
 *
 * Deputado representa o estado inteiro, não a cidade. O sinal público e oficial de vínculo
 * com uma cidade é a votação: quem teve mais votos ali e quanto do total do eleito veio dali.
 * Fonte: TSE, resultado do 1º turno por município (resultados.tse.jus.br), tabela
 * voto_municipio_2026 (migration 0016) — só eleitos, os 10 mais votados por cargo e cidade.
 * CEP → código IBGE da cidade: ViaCEP (viacep.com.br), cache de 30 dias.
 *
 * Rotas: /eleitos/:uf/:cidade · /cep?cep= · /cidade?uf=&nome= · /sitemap-cidades.xml
 */
import { pagina, escapeHtml, SITE_URL } from './estilo_html.js';
import { ESTILO_BUSCA } from './busca_html.js';
import { ESTILO_ELEITOS, deUf } from './eleitos_html.js';
import { nomeProprio } from './perfil_html.js';
import { renderBlocoBoletim } from './boletim.js';
import { renderPublicidade } from './publicidade.js';
import { UF_NOMES } from './home_html.js';
import { Icone } from './icones.js';

export function slugCidade(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const pct = (n) => (n == null ? '' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: n < 10 ? 1 : 0 })}%`);

/** Formulário de CEP reutilizável. `tema`: 'navy' (fundo escuro) ou 'claro'. */
export function formCep({ tema = 'claro', id = 'cep' } = {}) {
  return `
  <form class="cep-form cep-form--${tema}" method="GET" action="/cep" role="search">
    <label class="cep-label" for="${id}">Seu CEP</label>
    <div class="cep-linha">
      <input class="cep-input" id="${id}" name="cep" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}-?[0-9]{3}" maxlength="9" placeholder="00000-000" required />
      <button class="vc-btn vc-btn--pri cep-btn" type="submit">Ver minha cidade</button>
    </div>
  </form>`;
}

function contatos(c, nome) {
  const itens = [];
  const ig = c.instagram ? (/^https?:\/\//i.test(c.instagram) ? c.instagram : `https://${c.instagram.replace(/^\/+/, '')}`) : '';
  if (ig) itens.push(`<a class="mu-ct" href="${escapeHtml(ig)}" target="_blank" rel="noopener" aria-label="Instagram de ${escapeHtml(nome)}">${Icone.instagram(15)}<span>Instagram</span></a>`);
  if (c.email) itens.push(`<a class="mu-ct" href="mailto:${escapeHtml(c.email)}" aria-label="E-mail oficial de ${escapeHtml(nome)}: ${escapeHtml(c.email)}">${Icone.email(15)}<span>E-mail</span></a>`);
  itens.push(`<a class="mu-ct" href="/candidato/${c.pessoa_id}">${Icone.usuario(15)}<span>Perfil</span></a>`);
  return `<div class="mu-cts">${itens.join('')}</div>`;
}

/** modo 'abs': destaque nos votos na cidade; modo 'rel': destaque no % da votação do eleito que veio dela. */
function linha(c, modo) {
  const nome = nomeProprio(c.nome_urna_atual || c.nome_completo);
  const foto = c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : escapeHtml(nome.slice(0, 1));
  const ele = c.genero === 'F' ? 'dela' : 'dele';
  const destaque = modo === 'abs'
    ? `<b class="tabnum">${fmt(c.votos)}</b><small>votos aqui · ${pct(c.pct_cand)} dos votos ${ele}</small>`
    : `<b class="tabnum">${pct(c.pct_cand)}</b><small>dos votos ${ele} · ${fmt(c.votos)} aqui</small>`;
  return `
    <li class="mu-card">
      <a class="bx-foto" href="/candidato/${c.pessoa_id}" aria-label="Perfil de ${escapeHtml(nome)}">${foto}</a>
      <div class="mu-info">
        <a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>
        <div class="bx-meta">${escapeHtml(c.partido_sigla || '')}</div>
      </div>
      <div class="mu-dir">${destaque}</div>
      ${contatos(c, nome)}
    </li>`;
}

function colunas(lista, cidade) {
  const abs = [...lista].sort((a, b) => b.votos - a.votos).slice(0, 10);
  const rel = [...lista].sort((a, b) => (b.pct_cand || 0) - (a.pct_cand || 0)).slice(0, 10);
  if (!lista.length) return '<div class="bx-vazio">Ainda sem dados para esta cidade.</div>';
  return `
    <div class="mu-cols">
      <div class="mu-col">
        <h3>Mais votados em ${escapeHtml(cidade)}</h3>
        <p>Quem recebeu mais votos aqui, em números absolutos.</p>
        <ol class="mu-lista">${abs.map((c) => linha(c, 'abs')).join('')}</ol>
      </div>
      <div class="mu-col">
        <h3>Mais ligados a ${escapeHtml(cidade)}</h3>
        <p>Quem tirou daqui a maior parte da própria votação.</p>
        <ol class="mu-lista">${rel.map((c) => linha(c, 'rel')).join('')}</ol>
      </div>
    </div>`;
}

export function renderMunicipio({ mun, linhas = [] }) {
  const uf = mun.uf;
  const nomeUf = UF_NOMES[uf] || uf;
  const nomeCid = nomeProprio(mun.municipio);
  const fed = linhas.filter((l) => l.cargo === 'deputado_federal');
  const est = linhas.filter((l) => l.cargo !== 'deputado_federal');
  const tituloEst = uf === 'DF' ? 'Deputados distritais' : 'Deputados estaduais';
  const bloco = (titulo, id, lista) => `
    <section class="el-sec" id="${id}" aria-labelledby="t-${id}">
      <div class="el-sec-topo"><h2 id="t-${id}">${titulo}</h2></div>
      ${colunas(lista, nomeCid)}
    </section>`;
  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}${ESTILO_MUNICIPIO}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <nav class="fx-migalha el-migalha" aria-label="Você está em"><a href="/eleitos">Eleitos 2026</a> › <a href="/eleitos/${uf.toLowerCase()}">${escapeHtml(nomeUf)}</a> › ${escapeHtml(nomeCid)}</nav>
        <h1>Os deputados eleitos com mais ligação com ${escapeHtml(nomeCid)} (${uf})</h1>
        <p class="el-lead">Deputado representa o estado inteiro, não a cidade. A votação mostra o vínculo de dois jeitos: quem teve mais votos aqui e quem depende mais daqui. Toque no nome para ver o perfil, ou fale direto pelo Instagram e pelo e-mail oficial.</p>
        <nav class="el-indice" aria-label="Ir para"><a href="#federais">Deputados federais</a><a href="#estaduais">${tituloEst}</a></nav>
      </div>
    </section>
    <div class="bx-corpo">
      <div class="vc-wrap">
        <p class="el-nota">Só entram eleitos em 2026. "% dos votos dele" é a parte da votação total do eleito que veio de ${escapeHtml(nomeCid)}. O e-mail aparece para quem já tem mandato hoje (fonte: Câmara e Senado); os eleitos novos ganham e-mail oficial depois da posse, em 1º de fevereiro. Instagram: o perfil informado ao TSE. Senadores e governador são eleitos pelo estado todo: veja em <a href="/eleitos/${uf.toLowerCase()}">eleitos ${escapeHtml(deUf(uf))}</a>.</p>
        ${bloco('Deputados federais', 'federais', fed)}
        ${renderPublicidade('A2', `mun${mun.cd_tse}`)}
        ${bloco(tituloEst, 'estaduais', est)}
        <div class="mu-outra">${Icone.mapa(18)} <span>Outra cidade?</span>${formCep({ id: 'cep-mun' })}</div>
        <p class="el-fonte">Fontes: TSE, resultado oficial do 1º turno por município (votos nominais); Câmara dos Deputados e Senado Federal (e-mail de gabinete). Erro? <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.</p>
      </div>
    </div>
    ${renderBlocoBoletim({ uf, origem: `cidade_${uf.toLowerCase()}` })}`;
  const top = fed.length ? nomeProprio([...fed].sort((a, b) => b.votos - a.votos)[0].nome_urna_atual || '') : '';
  return pagina({
    titulo: `Deputados mais votados em ${nomeCid} (${uf}) em 2026 — VotoCheck`,
    descricao: `Quem são os deputados federais e estaduais eleitos em 2026 com mais votos em ${nomeCid} (${uf})${top ? `, como ${top}` : ''}, quem mais depende da cidade, e como falar com cada um. Fonte: TSE.`,
    caminho: `/eleitos/${uf.toLowerCase()}/${mun.slug}`,
    larga: true,
    corpo,
  });
}

export function renderCepErro({ cep = '', motivo = '' } = {}) {
  const corpo = `
    <style>${ESTILO_MUNICIPIO}</style>
    <div style="max-width:620px;margin:48px auto 64px;padding:0 16px">
      <h1 style="font-size:28px;margin-bottom:10px">${motivo === 'servico' ? 'Não conseguimos consultar o CEP agora' : 'Não encontramos esse CEP'}</h1>
      <p style="color:var(--text-muted);font-size:16.5px;line-height:1.55">${motivo === 'servico' ? 'O serviço de CEP não respondeu. Tente de novo em alguns segundos ou escolha seu estado.' : `Confira os 8 números${cep ? ` (você digitou ${escapeHtml(cep)})` : ''} e tente de novo, ou escolha seu estado.`}</p>
      ${formCep({ id: 'cep-erro' })}
      <p style="margin-top:20px"><a href="/eleitos">Escolher pelo estado →</a></p>
    </div>`;
  return pagina({ titulo: 'Buscar por CEP — VotoCheck', descricao: 'Encontre os deputados eleitos mais votados na sua cidade pelo CEP.', caminho: '/cep', noindex: true, corpo });
}

export const ESTILO_MUNICIPIO = `
  .mu-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
  .mu-col h3 { font-size: 17px; margin: 6px 0 2px; }
  .mu-col > p { font-size: 13.5px; color: var(--muted); margin: 0 0 10px; }
  .mu-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .mu-card { display: grid; grid-template-columns: 52px 1fr auto; column-gap: 12px; row-gap: 8px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
  .mu-info { min-width: 0; }
  .mu-info .bx-nome { white-space: normal; line-height: 1.25; }
  .mu-dir { text-align: right; max-width: 132px; }
  .mu-dir b { display: block; font-family: var(--font-display); font-size: 18px; color: var(--blue); line-height: 1.1; }
  .mu-dir small { font-size: 11.5px; color: var(--muted); line-height: 1.3; display: block; }
  .mu-cts { grid-column: 2 / -1; display: flex; gap: 6px; flex-wrap: wrap; margin-top: -2px; }
  .mu-card .bx-foto { grid-row: span 2; align-self: start; }
  .mu-ct { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--ink); text-decoration: none; border: 1px solid var(--line-2); border-radius: 999px; padding: 4px 9px; min-height: 28px; }
  .mu-ct:hover { border-color: var(--blue); color: var(--blue); }
  .mu-ct svg { color: var(--blue); }
  @media (max-width: 860px) { .mu-cols { grid-template-columns: 1fr; gap: 24px; } }
  @media (max-width: 420px) { .mu-cts { grid-column: 1 / -1; } .mu-card .bx-foto { grid-row: auto; } }
  .mu-outra { display: grid; gap: 8px; margin: 36px 0 8px; padding: 20px; background: #fff; border: 1px solid var(--line); border-radius: 16px; }
  .mu-outra > span { font-weight: 700; color: var(--ink); }
  .mu-outra > svg { color: var(--blue); }
  .cep-form { margin: 14px 0 0; }
  .cep-label { display: block; font-size: 14px; font-weight: 700; margin: 0 0 6px; color: var(--ink); }
  .cep-form--navy .cep-label { color: #DCE3FF; }
  .cep-linha { display: flex; gap: 8px; flex-wrap: wrap; }
  .cep-input { flex: 0 1 180px; min-width: 0; font: 600 17px var(--font-body); letter-spacing: .04em; color: var(--ink); background: #fff; border: 1.5px solid var(--line-2); border-radius: 999px; padding: 12px 18px; }
  .cep-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,89,245,.2); }
  .cep-btn { flex: 0 1 auto; }
  @media (max-width: 520px) { .cep-input { flex: 1 1 100%; } .cep-btn { width: 100%; } }
`;
