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

function linha(c) {
  const nome = nomeProprio(c.nome_urna_atual || c.nome_completo);
  const foto = c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : escapeHtml(nome.slice(0, 1));
  return `
    <div class="bx-card mu-card">
      <a class="bx-foto" href="/candidato/${c.pessoa_id}" tabindex="-1" aria-hidden="true">${foto}</a>
      <div class="bx-info">
        <a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>
        <div class="bx-meta">${escapeHtml(c.partido_sigla || '')} · <span class="tabnum">${fmt(c.votos)}</span> votos aqui</div>
        ${Number(c.pct_cand) >= 15 ? '<span class="mu-base">base eleitoral aqui</span>' : ''}
      </div>
      <div class="mu-dir"><b class="tabnum">${pct(c.pct_cand)}</b><small>dos votos ${c.genero === 'F' ? 'dela' : 'dele'}</small></div>
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
      <div class="el-sec-topo"><h2 id="t-${id}">${titulo}</h2><span class="el-conta">mais votados aqui</span></div>
      ${lista.length ? `<div class="bx-grid">${lista.map(linha).join('')}</div>` : '<div class="bx-vazio">Ainda sem dados para esta cidade.</div>'}
    </section>`;
  const corpo = `
    <style>${ESTILO_BUSCA}${ESTILO_ELEITOS}${ESTILO_MUNICIPIO}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <nav class="fx-migalha el-migalha" aria-label="Você está em"><a href="/eleitos">Eleitos 2026</a> › <a href="/eleitos/${uf.toLowerCase()}">${escapeHtml(nomeUf)}</a> › ${escapeHtml(nomeCid)}</nav>
        <h1>Os deputados eleitos mais votados em ${escapeHtml(nomeCid)} (${uf})</h1>
        <p class="el-lead">Deputado representa o estado inteiro, não a cidade. Mas a votação mostra quem tem mais ligação com ${escapeHtml(nomeCid)}: quem teve mais votos aqui e quanto do total de cada um veio daqui.</p>
      </div>
    </section>
    <div class="bx-corpo">
      <div class="vc-wrap">
        <p class="el-nota">Só aparecem eleitos em 2026, os 10 com mais votos nesta cidade em cada cargo. "% dos votos dele" é a parte da votação total do eleito que veio de ${escapeHtml(nomeCid)}. A etiqueta <b>base eleitoral aqui</b> marca quem tirou pelo menos 15% da própria votação desta cidade. Senadores e governador são eleitos pelo estado todo: veja em <a href="/eleitos/${uf.toLowerCase()}">eleitos ${escapeHtml(deUf(uf))}</a>.</p>
        ${bloco('Deputados federais', 'federais', fed)}
        ${renderPublicidade('A2', `mun${mun.cd_tse}`)}
        ${bloco(tituloEst, 'estaduais', est)}
        <div class="mu-outra">${Icone.mapa(18)} <span>Outra cidade?</span>${formCep({ id: 'cep-mun' })}</div>
        <p class="el-fonte">Fonte: TSE, resultado oficial do 1º turno por município (votos nominais). Erro? <a href="mailto:contato@votocheck.com.br">contato@votocheck.com.br</a>.</p>
      </div>
    </div>
    ${renderBlocoBoletim({ uf, origem: `cidade_${uf.toLowerCase()}` })}`;
  const top = fed[0] ? nomeProprio(fed[0].nome_urna_atual || fed[0].nome_completo) : '';
  return pagina({
    titulo: `Deputados mais votados em ${nomeCid} (${uf}) em 2026 — VotoCheck`,
    descricao: `Quem são os deputados federais e estaduais eleitos em 2026 com mais votos em ${nomeCid} (${uf})${top ? `, como ${top}` : ''}, e quanto da votação de cada um veio da cidade. Fonte: TSE.`,
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
  .mu-card { grid-template-columns: 52px 1fr auto; }
  .mu-dir { text-align: right; }
  .mu-base { display: inline-block; margin-top: 4px; font-size: 11.5px; font-weight: 700; color: #00735F; background: var(--teal-50); border-radius: 999px; padding: 2px 8px; }
  .mu-dir b { display: block; font-family: var(--font-display); font-size: 19px; color: var(--blue); line-height: 1.1; }
  .mu-dir small { font-size: 11.5px; color: var(--muted); }
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
