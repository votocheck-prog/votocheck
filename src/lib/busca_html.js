/**
 * VotoCheck — Homepage com busca de candidato + listagem de resultados.
 *
 * Sem framework, sem build, sem JS obrigatório (formulário GET simples) — mesma filosofia do
 * painel de curadoria (curadoria_html.js): server-rendered, funciona em qualquer navegador,
 * rápido de servir direto do Worker.
 *
 * Regra de marca: resultados SEMPRE em ordem alfabética (nome de urna) — nunca por "relevância"
 * ou qualquer critério que pareça ranking/pontuação de candidato.
 */
import { pagina, escapeHtml, statusPill } from './estilo_html.js';
import { renderMapaBrasil } from './mapa_brasil.js';
import { renderResumoCargos } from './cargos_guia.js';
import { renderBanners } from './banners_html.js';
import { renderJornada, renderObtencaoDados, renderMonitoramentoCobranca, renderCtaApoio, faseEleitoral } from './jornada_html.js';
import { Icone } from './icones.js';
import { renderPublicidade } from './publicidade.js';
import { UF_NOMES } from './home_html.js';
import { nomeProprio } from './perfil_html.js';

// Frase-síntese da hero — resume em 1 frase o que o VotoCheck faz (o "porquê" mais longo vem
// logo abaixo, no parágrafo de contexto).
const HERO_HEADLINE = 'Verificação independente de quem te representa — sem ranking, sempre com a fonte.';

// Parágrafo de contexto — condensado do Elevator Speech / Manifesto (Especificações). Mantém o
// essencial: por que o VotoCheck existe, o que ele faz e o que NUNCA faz (ranking).
const INTRO_HOMEPAGE = `Escolher um representante não deveria ser um ato de fé — e cobrar quem foi eleito
  não deveria deixar o cidadão de mãos atadas. O VotoCheck reúne histórico, propostas, votações
  e atuação de candidatos e representantes, sempre com a fonte de cada informação à vista.
  Sem ranking, sem nota, sem escolher por você: <strong>você decide o que importa, nós
  organizamos os fatos para você conferir.</strong>`;

// As "bandeiras" do Brand Blueprint — Informação e Educação fundidas num só pilar (as duas são,
// na prática, a mesma promessa: dar contexto verificável) — ficam 3 cartões visuais em vez de 4.
const PILARES = [
  {
    titulo: 'Informação e Educação',
    texto: 'Dados relevantes, verificáveis e contextualizados — e explicados: competências, orçamento, processo e limites de cada cargo.',
    icone: Icone.lampada,
  },
  {
    titulo: 'Prioridade',
    texto: 'Você escolhe os temas e critérios que pesam pra você. O VotoCheck organiza o contexto em torno disso, sem decidir por você.',
    icone: Icone.bussola,
  },
  {
    titulo: 'Melhores práticas',
    texto: 'Mostramos o que já funcionou em mandatos anteriores — o quê, como e com quais resultados — pra comparar promessa com entrega.',
    icone: Icone.escudoCheck,
  },
];

function renderPilares() {
  return `
    <div class="pilares">
      ${PILARES.map(
        (p) => `
        <div class="pilar">
          <div class="pilar-icone">${p.icone(22)}</div>
          <strong>${escapeHtml(p.titulo)}</strong>
          <span>${escapeHtml(p.texto)}</span>
        </div>`
      ).join('')}
    </div>`;
}

const CARGOS_FILTRO = [
  { slug: '', label: 'Todos os cargos' },
  { slug: 'presidente', label: 'Presidente' },
  { slug: 'governador', label: 'Governador' },
  { slug: 'senador', label: 'Senador' },
  { slug: 'deputado_federal', label: 'Deputado Federal' },
  { slug: 'deputado_estadual', label: 'Deputado Estadual' },
  { slug: 'deputado_distrital', label: 'Deputado Distrital' },
];

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO','BR',
];

// Critérios de ordenação disponíveis — todos isonômicos (nenhum é "melhor/pior" candidato,
// só um critério objetivo de organização). O padrão é sempre alfabético por nome de urna.
// Nunca ofereça aqui um critério que soe a ranking, nota ou recomendação.
export const ORDENACOES = [
  { valor: 'nome', label: 'Nome (A–Z)' },
  { valor: 'idade', label: 'Idade (mais velho primeiro)' },
  { valor: 'partido', label: 'Partido (A–Z)' },
];

function formularioBusca({ q = '', cargo = '', uf = '', ordenar = 'nome' }) {
  return `
  <form class="busca-form" method="GET" action="/buscar" role="search">
    <input
      type="text"
      name="q"
      value="${escapeHtml(q)}"
      placeholder="Nome do candidato ou nome de urna"
      autofocus
      style="width:100%; padding:14px 16px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px;"
    />
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <select name="cargo" style="flex:1; min-width:180px; padding:12px; border:1px solid var(--border); border-radius:8px;">
        ${CARGOS_FILTRO.map((c) => `<option value="${c.slug}" ${cargo === c.slug ? 'selected' : ''}>${c.label}</option>`).join('')}
      </select>
      <select name="uf" style="width:120px; padding:12px; border:1px solid var(--border); border-radius:8px;">
        <option value="">UF (todas)</option>
        ${UFS.map((u) => `<option value="${u}" ${uf === u ? 'selected' : ''}>${u}</option>`).join('')}
      </select>
      <select name="ordenar" title="Critério de ordenação — nenhum deles é um ranking de qualidade" style="width:220px; padding:12px; border:1px solid var(--border); border-radius:8px;">
        ${ORDENACOES.map((o) => `<option value="${o.valor}" ${ordenar === o.valor ? 'selected' : ''}>Ordenar: ${o.label}</option>`).join('')}
      </select>
      <button type="submit" style="padding:12px 28px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
        Buscar
      </button>
    </div>
  </form>`;
}

export function renderHomepage({ totalCandidaturas, totalPessoas, atualizadoEm, porCargo }) {
  // Bloco 1 — Definição: o que é, pra que serve, o processo completo (lema + Monitore/Cobre) e
  // o guia rápido de cargos.
  const blocoDefinicao = `
    <div style="text-align:center; padding:24px 0 8px;">
      <h1 style="font-size:clamp(28px,5vw,42px); margin:0 0 16px; letter-spacing:-0.01em;">${HERO_HEADLINE}</h1>
      <p class="hero-intro">${INTRO_HOMEPAGE}</p>
    </div>
    ${renderPilares()}
    ${renderJornada()}
    ${renderResumoCargos()}
  `;

  // Bloco 2 — Obtenção de dados: de onde vêm os dados + as ferramentas de busca (banners logo
  // acima, como pedido — a publicidade nunca fica entre o usuário e a ferramenta de busca em si).
  const blocoObtencaoDados = renderObtencaoDados({
    totalCandidaturas,
    totalPessoas,
    atualizadoEm: escapeHtml(atualizadoEm || 'em coleta'),
    porCargo,
    buscaHtml: `${renderBanners()}${formularioBusca({})}`,
    mapaHtml: `<details class="mapa-brasil-toggle">
      <summary>Ou clique num estado no mapa</summary>
      ${renderMapaBrasil()}
    </details>`,
  });

  // Bloco 3 — Monitoramento e Cobrança: pré-eleição fica depois da obtenção de dados; a partir
  // do 1º turno, sobe pra logo abaixo da Definição (ver jornada_html.js:faseEleitoral).
  const fase = faseEleitoral();
  const blocoMonitoramento = renderMonitoramentoCobranca(fase);

  // Bloco 4 — CTA de apoio (doação + publicidade), sempre por último.
  const blocoCta = renderCtaApoio();

  const corpo =
    fase === 'pos'
      ? `${blocoDefinicao}${blocoMonitoramento}${blocoObtencaoDados}${blocoCta}`
      : `${blocoDefinicao}${blocoObtencaoDados}${blocoMonitoramento}${blocoCta}`;

  return pagina({
    titulo: 'VotoCheck — Verificação eleitoral independente',
    descricao: 'Busque candidatos e representantes com histórico, propostas e votações verificadas, sempre com a fonte oficial de cada dado.',
    corpo,
  });
}

// mesma lógica de cálculo de idade usada em perfil_html.js — duplicada aqui de propósito
// (arquivo server-rendered isolado, sem módulo compartilhado de "utils" ainda) para não
// criar acoplamento prematuro entre as duas páginas.
export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  let d;
  const iso = String(dataNascimento).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = String(dataNascimento).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (br) d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  else return null;
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

export const SLOT_COLA = { deputado_federal: 1, deputado_estadual: 2, deputado_distrital: 2, senador: 3, governador: 5, presidente: 6 };

function linhaResultado(c) {
  const idade = calcularIdade(c.data_nascimento);
  const nome = nomeProprio(c.nome_urna_atual || c.nome_completo);
  // 08/10/2026: depois do 1º turno, "+ cola" só para quem ainda disputa o 2º turno; resultado aparece no card.
  const st = c.situacao_totalizacao_turno || '';
  const decidido = Boolean(st) && st !== '2º turno' && !/^#|nulo/i.test(st);
  const slot = decidido ? 0 : SLOT_COLA[c.cargo_slug];
  const tag = /^eleit/i.test(st) ? '<span class="bx-res bx-res--ok">eleito</span>' : st === '2º turno' ? '<span class="bx-res">2º turno</span>' : '';
  return `
    <div class="bx-card">
      <a class="bx-foto" href="/candidato/${c.pessoa_id}" tabindex="-1" aria-hidden="true"${c.foto_url ? '' : ' title="Foto oficial ainda não carregada"'}>${c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" loading="lazy">` : escapeHtml(nome.slice(0, 1))}</a>
      <div class="bx-info">
        <a class="bx-nome" href="/candidato/${c.pessoa_id}">${escapeHtml(nome)}</a>${tag}
        <div class="bx-meta">${escapeHtml(c.cargo_nome)} · ${escapeHtml(c.sg_uf)}${c.partido_sigla ? ` · ${escapeHtml(c.partido_sigla)}` : ''}${idade ? ` · ${idade} anos` : ''}</div>
      </div>
      <div class="bx-dir">
        ${c.numero_urna ? `<span class="bx-num">${escapeHtml(c.numero_urna)}</span>` : ''}
        ${slot && c.numero_urna ? `<button type="button" class="bx-cola" data-cola-add data-slot="${slot}" data-cargo="${escapeHtml(c.cargo_slug)}" data-nome="${escapeHtml(nome)}" data-numero="${escapeHtml(c.numero_urna)}" data-partido="${escapeHtml(c.partido_sigla || '')}" data-pessoa="${escapeHtml(c.pessoa_id)}" data-foto="${escapeHtml(c.foto_url || '')}" aria-label="Adicionar ${escapeHtml(nome)} à cola">+ cola</button>` : ''}
      </div>
    </div>`;
}

export const ESTILO_BUSCA = `
  .bx-topo { background: var(--navy); color: #fff; padding: 36px 0 28px; }
  .bx-topo h1 { color: #fff; font-size: clamp(24px, 3.2vw, 34px); margin: 0 0 16px; }
  .bx-filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .bx-filtros a { font-size: 13.5px; font-weight: 600; text-decoration: none; color: #C8D2F5; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 7px 13px; }
  .bx-filtros a:hover { border-color: #fff; color: #fff; }
  .bx-filtros a.ativo { background: #fff; color: var(--navy); border-color: #fff; }
  .bx-corpo { padding: 28px 0 56px; }
  .bx-info-linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 14px; color: var(--muted); margin-bottom: 14px; }
  .bx-info-linha select { padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line-2); font-size: 14px; }
  .bx-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
  .bx-grid > .vc-pub { grid-column: 1 / -1; margin: 10px 0; }
  @media (max-width: 760px) { .bx-grid { grid-template-columns: 1fr; } }
  .bx-card { display: grid; grid-template-columns: 52px 1fr auto; gap: 14px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; transition: border-color .15s ease, box-shadow .15s ease; }
  .bx-card:hover { border-color: var(--line-2); box-shadow: var(--shadow-sm); }
  .bx-foto { width: 52px; height: 52px; border-radius: 12px; background: var(--blue-50); display: grid; place-items: center; font-family: var(--font-display); font-weight: 800; font-size: 20px; color: var(--blue); overflow: hidden; text-decoration: none; }
  .bx-foto img { width: 100%; height: 100%; object-fit: cover; }
  .bx-info { min-width: 0; }
  .bx-nome { font-weight: 700; color: var(--ink); text-decoration: none; font-size: 16px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bx-nome:hover { color: var(--blue); }
  .bx-res { display: inline-block; margin-top: 2px; font-size: 11px; font-weight: 700; color: var(--blue); background: var(--blue-50); border-radius: 999px; padding: 1px 8px; }
  .bx-res--ok { color: #00735F; background: var(--teal-50); }
  .bx-meta { font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bx-dir { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .bx-num { font-family: var(--font-display); font-weight: 800; font-size: 19px; letter-spacing: .06em; font-variant-numeric: tabular-nums; }
  .bx-cola { font-size: 12px; font-weight: 700; color: var(--blue); background: var(--blue-50); border: 0; border-radius: 999px; padding: 4px 10px; cursor: pointer; }
  .bx-cola:hover { background: var(--blue); color: #fff; }
  .bx-cola.ok { background: var(--teal-50); color: #00735F; }
  .bx-vazio { text-align: center; padding: 40px 16px; background: #fff; border: 1px dashed var(--line-2); border-radius: 14px; color: var(--muted); }
`;

const CARGOS_CHIPS = [
  { slug: '', label: 'Todos' },
  { slug: 'deputado_federal', label: 'Dep. Federal' },
  { slug: 'deputado_estadual', label: 'Dep. Estadual' },
  { slug: 'senador', label: 'Senador' },
  { slug: 'governador', label: 'Governador' },
  { slug: 'presidente', label: 'Presidente' },
  { slug: 'deputado_distrital', label: 'Dep. Distrital' },
];
const NOMES_CARGO_PLURAL = { deputado_federal: 'Deputado Federal', deputado_estadual: 'Deputado Estadual', deputado_distrital: 'Deputado Distrital', senador: 'Senador', governador: 'Governador', presidente: 'Presidente' };

function linkPagina({ q, cargo, uf, ordenar, pagina: p, label, ativo, desabilitado }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (cargo) params.set('cargo', cargo);
  if (uf) params.set('uf', uf);
  if (ordenar && ordenar !== 'nome') params.set('ordenar', ordenar);
  if (p > 1) params.set('pagina', String(p));
  const estilo = ativo
    ? 'background:var(--primary); color:#fff; border-color:var(--primary);'
    : desabilitado
    ? 'color:var(--text-muted); border-color:var(--border); pointer-events:none; opacity:0.5;'
    : 'color:var(--text); border-color:var(--border);';
  return `<a href="/buscar?${params.toString()}" style="display:inline-block; padding:8px 14px; border:1px solid; border-radius:8px; text-decoration:none; font-size:14px; ${estilo}">${escapeHtml(label)}</a>`;
}

function controlesPaginacao({ q, cargo, uf, ordenar, paginaAtual, totalPaginas }) {
  if (totalPaginas <= 1) return '';
  const partes = [];
  partes.push(linkPagina({ q, cargo, uf, ordenar, pagina: paginaAtual - 1, label: '‹ Anterior', desabilitado: paginaAtual <= 1 }));
  partes.push(`<span style="padding:8px 6px; color:var(--text-muted); font-size:14px;">Página ${paginaAtual} de ${totalPaginas}</span>`);
  partes.push(linkPagina({ q, cargo, uf, ordenar, pagina: paginaAtual + 1, label: 'Próxima ›', desabilitado: paginaAtual >= totalPaginas }));
  return `<div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:24px; flex-wrap:wrap;">${partes.join('')}</div>`;
}

const DESCRICAO_ORDENACAO = {
  nome: 'em ordem alfabética',
  idade: 'do mais velho para o mais novo',
  partido: 'por partido, em ordem alfabética',
};

export function renderResultados({ q, cargo, uf, ordenar = 'nome', resultados, totalResultados, paginaAtual = 1, porPagina = 30, caminho = '/buscar' }) {
  const total = totalResultados ?? resultados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const ehNumero = /^\d{2,5}$/.test(q || '');
  const ufNome = uf && UF_NOMES[uf] ? UF_NOMES[uf] : '';
  const titulo = q
    ? ehNumero
      ? `Candidatos com o número ${q}${ufNome ? ` em ${ufNome}` : ''}`
      : `Resultados para “${q}”`
    : cargo
    ? `Candidatos a ${NOMES_CARGO_PLURAL[cargo] || 'cargo'}${ufNome ? ` em ${ufNome}` : cargo === 'presidente' ? '' : ' no Brasil'}`
    : ufNome
    ? `Candidatos em ${ufNome}`
    : 'Todos os candidatos de 2026';

  const cards = resultados.map(linhaResultado);
  if (cards.length > 8) cards.splice(8, 0, renderPublicidade('A2', `${cargo}${uf}${paginaAtual}`));
  const lista = resultados.length
    ? `<div class="bx-grid">${cards.join('')}</div>`
    : `<div class="bx-vazio"><strong style="color:var(--ink)">Nenhum candidato encontrado.</strong><br>${ehNumero ? 'Confira se o estado está certo: o mesmo número pode existir em estados diferentes.' : 'Tente só o sobrenome ou o nome de urna, sem acentos.'}</div>`;

  const hrefChip = (slug) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (slug) p.set('cargo', slug);
    if (uf && slug !== 'presidente') p.set('uf', uf);
    return `/buscar?${p.toString()}`;
  };

  const corpo = `
    <style>${ESTILO_BUSCA}</style>
    <section class="bx-topo">
      <div class="vc-wrap">
        <h1>${escapeHtml(titulo)}</h1>
        <form class="vc-busca" method="GET" action="/buscar" role="search" style="max-width:760px">
          <span class="vc-busca-ico">${Icone.busca(20)}</span>
          <label class="sr-only" for="q-busca">Nome ou número</label>
          <input id="q-busca" type="search" name="q" value="${escapeHtml(q || '')}" placeholder="Nome ou número do candidato" />
          <select name="uf" aria-label="Estado"><option value="">Todos os estados</option>${Object.keys(UF_NOMES).sort().map((u) => `<option value="${u}" ${u === uf ? 'selected' : ''}>${u}</option>`).join('')}</select>
          ${cargo ? `<input type="hidden" name="cargo" value="${escapeHtml(cargo)}" />` : ''}
          <button class="vc-btn vc-btn--pri" type="submit">Buscar</button>
        </form>
        <nav class="bx-filtros" aria-label="Filtrar por cargo">${CARGOS_CHIPS.map((c) => `<a href="${hrefChip(c.slug)}" class="${(cargo || '') === c.slug ? 'ativo' : ''}">${c.label}</a>`).join('')}</nav>
      </div>
    </section>
    <section class="bx-corpo">
      <div class="vc-wrap">
        <div class="bx-info-linha">
          <span><strong style="color:var(--ink)">${total.toLocaleString('pt-BR')}</strong> candidatura(s), ${DESCRICAO_ORDENACAO[ordenar] || DESCRICAO_ORDENACAO.nome}. É só uma forma de organizar, não um ranking.</span>
          <form method="GET" action="/buscar">
            ${q ? `<input type="hidden" name="q" value="${escapeHtml(q)}" />` : ''}${cargo ? `<input type="hidden" name="cargo" value="${escapeHtml(cargo)}" />` : ''}${uf ? `<input type="hidden" name="uf" value="${escapeHtml(uf)}" />` : ''}
            <label class="sr-only" for="ord">Ordenar</label>
            <select id="ord" name="ordenar" onchange="this.form.submit()">${ORDENACOES.map((o) => `<option value="${o.valor}" ${ordenar === o.valor ? 'selected' : ''}>Ordenar: ${o.label}</option>`).join('')}</select>
          </form>
        </div>
        ${lista}
        ${controlesPaginacao({ q, cargo, uf, ordenar, paginaAtual, totalPaginas })}
      </div>
    </section>
    <div class="fx-toast" id="toast-cola" role="status" style="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--navy);color:#fff;padding:12px 18px;border-radius:999px;font-weight:600;display:none;z-index:90">Adicionado à sua cola ✓ <a href="/cola" style="color:#9EC0FF;margin-left:8px">Ver cola</a></div>
  `;
  return pagina({
    titulo: `${titulo} — Eleições 2026 | VotoCheck`,
    descricao: `${titulo}: nome, número, partido e dados oficiais do TSE, com a fonte de cada informação. Sem ranking.`,
    caminho,
    larga: true,
    // busca por texto livre e páginas além da 1ª têm pouco valor pra indexação (conteúdo
    // fino/duplicado) — mas navegação por cargo/UF na página 1 continua indexável.
    noindex: Boolean(q) || paginaAtual > 1,
    corpo,
  });
}
