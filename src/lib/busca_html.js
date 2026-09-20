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
function calcularIdade(dataNascimento) {
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

function linhaResultado(c) {
  const situacao = c.situacao_totalizacao_turno || c.situacao_candidatura;
  const idade = calcularIdade(c.data_nascimento);
  return `
    <a href="/candidato/${c.pessoa_id}" style="display:flex; gap:14px; align-items:center; padding:14px 16px; border:1px solid var(--border); border-radius:10px; background:var(--surface); text-decoration:none; color:inherit; margin-bottom:10px;">
      <div style="width:44px; height:44px; border-radius:50%; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--primary); flex-shrink:0; overflow:hidden;">
        ${c.foto_url ? `<img src="${escapeHtml(c.foto_url)}" alt="" style="width:100%; height:100%; object-fit:cover;">` : escapeHtml((c.nome_urna_atual || c.nome_completo || '?').slice(0, 1))}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600;">${escapeHtml(c.nome_urna_atual || c.nome_completo)}</div>
        <div style="font-size:13px; color:var(--text-muted);">
          ${escapeHtml(c.cargo_nome)} · ${escapeHtml(c.sg_uf)}${c.numero_urna ? ` · nº ${escapeHtml(c.numero_urna)}` : ''}${c.partido_sigla ? ` · ${escapeHtml(c.partido_sigla)}` : ''}${idade ? ` · ${idade} anos` : ''}
        </div>
      </div>
      ${situacao ? `<span class="status-pill">${escapeHtml(situacao)}</span>` : ''}
    </a>`;
}

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
  const lista = resultados.length
    ? resultados.map(linhaResultado).join('')
    : `<p style="color:var(--text-muted); text-align:center; padding:32px 0;">
         Nenhum resultado para essa busca ainda. A cobertura está em expansão — tente o nome completo
         ou volte em breve.
       </p>`;

  const corpo = `
    <h2 style="margin-top:0;">Resultados da busca</h2>
    ${formularioBusca({ q, cargo, uf, ordenar })}
    <p style="color:var(--text-muted); font-size:13px; margin:24px 0 8px;">
      ${total.toLocaleString('pt-BR')} candidatura(s) encontrada(s), ${DESCRICAO_ORDENACAO[ordenar] || DESCRICAO_ORDENACAO.nome} —
      é só um critério de organização, nunca uma recomendação ou ranking de qualidade.
    </p>
    <div style="margin-top:8px;">${lista}</div>
    ${controlesPaginacao({ q, cargo, uf, ordenar, paginaAtual, totalPaginas })}
  `;
  return pagina({
    titulo: `Busca: ${q || 'candidatos'} — VotoCheck`,
    descricao: 'Resultados de busca de candidatos no VotoCheck.',
    caminho,
    // busca por texto livre e páginas além da 1ª têm pouco valor pra indexação (conteúdo
    // fino/duplicado) — mas navegação por cargo/UF na página 1 continua indexável.
    noindex: Boolean(q) || paginaAtual > 1,
    corpo,
  });
}
