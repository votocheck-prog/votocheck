/**
 * VotoCheck — Página de apoio "Partidos Políticos".
 *
 * Escopo desta 1ª versão (combinado com o Rodrigo em 20/09/2026 — ver pendência na seção 19 do
 * documento de continuidade): classificação de família ideológica + uma nota histórica bem
 * resumida por partido, mais os representantes REAIS de cada partido puxados do banco (nunca
 * inventados). NÃO inclui ainda a árvore genealógica completa de fusões/cisões nem uma leitura
 * de "posições em pautas" por partido — isso fica pra uma 2ª fase, que exige checagem fato a
 * fato partido por partido (ver aviso no topo da página em si).
 *
 * `familiaIdeologica`: classificação corrente na ciência política/imprensa especializada, não
 * uma opinião do VotoCheck — igual ao restante do produto, nunca é usada pra ranquear partido
 * como "melhor" ou "pior".
 *
 * `representantes`: NÃO é uma lista de "principais" no sentido de mérito — é um recorte de até
 * 10 candidaturas de 2026 do partido, em ordem alfabética (critério neutro, igual ao resto do
 * produto). Alimentado por consulta ao D1 (ver `carregarRepresentantesPorPartido` em
 * `src/index.js`), nunca por texto fixo — link de cada nome vai pro perfil real na plataforma.
 *
 * ATUALIZAÇÃO 23/09/2026 — diagrama de espectro + interatividade (pedido do Rodrigo: as páginas
 * de apoio estavam "um monte de texto despejado, sem interatividade nenhuma").
 *
 * Decisão de design deliberada: o diagrama de espectro (Esquerda → Direita) usa UMA cor só
 * (var(--primary), a mesma do resto do site) pra todos os partidos, nunca uma escala
 * esquerda=vermelho/direita=azul (ou o inverso). Political science aside, no imaginário
 * brasileiro essas cores já carregam associação partidária forte (PT/vermelho, oposição/azul em
 * ciclos recentes) — colorir por posição no espectro seria o produto tomando partido visualmente,
 * o que fere o mesmo princípio que já impede "posição em pautas" por partido (ver nota acima e
 * decisão do Rodrigo em 20/09/2026). Posição = só posição no eixo horizontal, nunca cor.
 *
 * `faixaEspectro()` é DERIVADA automaticamente do texto de `familiaIdeologica` já existente e já
 * aprovado — não é um novo campo hardcoded por partido. Isso evita ter duas fontes de verdade
 * (texto + posição) que podem divergir com o tempo; qualquer ajuste futuro na classificação de
 * um partido já se reflete no diagrama sem precisar editar em dois lugares. Partidos cuja família
 * é composta (ex.: "Centro-esquerda / esquerda") ocupam uma faixa entre duas zonas — a posição
 * exibida é o centro dessa faixa, arredondado; a classificação completa aparece no atributo
 * `title` do chip (tooltip nativo do navegador, sem JS) e continua no card abaixo, inalterada.
 *
 * `presidenteNacional` (adicionado 23/09/2026, a pedido do Rodrigo — decisão explícita dele
 * depois de eu recomendar manter a página só com dado automático, dado o risco de defasagem):
 * cada entrada foi checada uma a uma no site oficial do partido (ou, quando o partido não tinha
 * página oficial clara, em pelo menos duas matérias de veículos diferentes) NESTA sessão
 * (verificadoEm = 23/09/2026) — nunca por memória de treinamento, que pode estar desatualizada.
 * `fonteUrl` é sempre a fonte usada pra confirmar. `nota`, quando presente, sinaliza um caso
 * especial encontrado na pesquisa (disputa judicial em curso, sucessão recente, ou estrutura sem
 * presidente único) — ela é IMPORTANTE, não decorativa: mostra por que aquele nome específico tem
 * mais chance de já estar desatualizado quando alguém ler isso depois.
 *
 * DELIBERADAMENTE NÃO incluído nesta rodada: "líder de bancada" (pedido original do Rodrigo, ao
 * lado do presidente). Motivo: liderança de bancada na Câmara/Senado muda por sessão legislativa
 * (às vezes mais de uma vez por ano) — MUITO mais volátil que presidência partidária, que já se
 * mostrou instável o bastante nesta pesquisa (ver Cidadania e Solidariedade abaixo). Fixar um nome
 * aqui ficaria desatualizado rápido demais pra manter à mão. Alternativa mais segura: linkar
 * direto pra página oficial de lideranças da Câmara (fonte sempre atual, sem curadoria manual) —
 * ver `LINK_LIDERANCAS_CAMARA` e o aviso na própria página. Rodrigo topou essa troca quando
 * apresentei o achado (ver conversa desta sessão).
 */
import { pagina, escapeHtml } from './estilo_html.js';

export const LINK_LIDERANCAS_CAMARA = 'https://www.camara.leg.br/deputados/liderancas-e-bancadas/liderancas';
export const LIDERANCA_VERIFICADA_EM = '23/09/2026';

export const PARTIDOS_INFO = [
  { sigla: 'PT', numero: 13, nome: 'Partido dos Trabalhadores', familiaIdeologica: 'Centro-esquerda / esquerda', historico: 'Fundado em 1980, a partir do movimento sindical e de setores da esquerda e da Igreja Católica progressista.',
    presidenteNacional: { nome: 'Edinho Silva', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PL', numero: 22, nome: 'Partido Liberal', familiaIdeologica: 'Direita', historico: 'Sigla histórica reorganizada ao longo do tempo por sucessivas fusões com outras legendas de centro-direita e direita.',
    presidenteNacional: { nome: 'Valdemar Costa Neto', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'MDB', numero: 15, nome: 'Movimento Democrático Brasileiro', familiaIdeologica: 'Centro', historico: 'Origem no MDB fundado em 1966, durante o bipartidarismo do regime militar; um dos partidos mais antigos em atividade contínua.',
    presidenteNacional: { nome: 'Baleia Rossi', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSDB', numero: 45, nome: 'Partido da Social Democracia Brasileira', familiaIdeologica: 'Centro / centro-direita', historico: 'Fundado em 1988 por um grupo de dissidentes do então MDB/PMDB.',
    presidenteNacional: { nome: 'Marconi Perillo', fonteUrl: 'https://www.psdb.org.br/quem-e-quem/marconi-perillo/' } },
  { sigla: 'PP', numero: 11, nome: 'Progressistas', familiaIdeologica: 'Centro-direita / direita', historico: 'Resultado de fusões sucessivas de legendas com raiz na antiga Arena, do regime militar.',
    presidenteNacional: { nome: 'Ciro Nogueira', fonteUrl: 'https://progressistas.org.br/o-presidente/' } },
  { sigla: 'União Brasil', numero: 44, nome: 'União Brasil', familiaIdeologica: 'Centro-direita / direita', historico: 'Criado em 2021–2022 pela fusão do DEM (herdeiro histórico da Arena/PFL) com o PSL.',
    presidenteNacional: { nome: 'Antonio Rueda', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSD', numero: 55, nome: 'Partido Social Democrático', familiaIdeologica: 'Centro / centro-direita', historico: 'Fundado em 2011 por Gilberto Kassab, reunindo dissidentes de vários outros partidos.',
    presidenteNacional: { nome: 'Gilberto Kassab', fonteUrl: 'https://psd.org.br/executiva-nacional/' } },
  { sigla: 'Republicanos', numero: 10, nome: 'Republicanos', familiaIdeologica: 'Direita', historico: 'Sigla renomeada em 2019 — antes chamava-se PRB.',
    presidenteNacional: { nome: 'Marcos Pereira', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PDT', numero: 12, nome: 'Partido Democrático Trabalhista', familiaIdeologica: 'Centro-esquerda', historico: 'Fundado por Leonel Brizola em torno de 1979–1980, como herdeiro do trabalhismo histórico de Getúlio Vargas.',
    presidenteNacional: { nome: 'Carlos Lupi', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'PSB', numero: 40, nome: 'Partido Socialista Brasileiro', familiaIdeologica: 'Centro-esquerda', historico: 'Refundado em 1985, remetendo a uma sigla socialista anterior ao regime militar.',
    presidenteNacional: { nome: 'João Campos', fonteUrl: 'https://psb40.org.br/quem-somos/presidente/', nota: 'Assumiu em 1º/06/2025, sucedendo Carlos Siqueira — presidência recente.', risco: true } },
  { sigla: 'PSOL', numero: 50, nome: 'Partido Socialismo e Liberdade', familiaIdeologica: 'Esquerda', historico: 'Fundado em 2004 por um grupo de dissidentes do PT.',
    presidenteNacional: { nome: 'Paula Coradi', fonteUrl: 'https://psol50.org.br/presidencia/', nota: 'O PSOL criou o cargo único de presidência recentemente — antes o partido era dirigido por coordenação coletiva.', risco: true } },
  { sigla: 'PCdoB', numero: 65, nome: 'Partido Comunista do Brasil', familiaIdeologica: 'Esquerda', historico: 'Fundado em 1962, a partir de uma cisão do antigo Partido Comunista Brasileiro (PCB).',
    presidenteNacional: { nome: 'Luciana Santos', fonteUrl: 'https://pcdob.org.br/congressos/pcdob-elege-nova-direcao-e-reconduz-luciana-santos-a-presidencia/' } },
  { sigla: 'Podemos', numero: 19, nome: 'Podemos', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2017 — antes chamava-se PTN.',
    presidenteNacional: { nome: 'Renata Abreu', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
  { sigla: 'Novo', numero: 30, nome: 'Partido Novo', familiaIdeologica: 'Direita liberal', historico: 'Fundado em 2015, com plataforma declaradamente liberal na economia.',
    presidenteNacional: { nome: 'Eduardo Ribeiro', fonteUrl: 'https://novo.org.br/diretorio-nacional/' } },
  { sigla: 'Cidadania', numero: 23, nome: 'Cidadania', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2019 — antes chamava-se PPS, ela mesma sucessora do antigo PCB refundado em 1992.',
    presidenteNacional: { nome: 'Alex Manente', fonteUrl: 'https://www.correiobraziliense.com.br/politica/2026/07/7457292-tse-garante-comando-de-alex-manente-no-cidadania-ate-as-eleicoes-de-2026.html', nota: 'Presidência disputada judicialmente ao longo de 2026 (idas e vindas entre Manente e Roberto Freire); o TSE confirmou Manente "até as eleições de 2026" em julho — pode mudar de novo depois do pleito. É o card com maior chance de estar desatualizado quando alguém ler isso.', risco: true } },
  { sigla: 'Solidariedade', numero: 77, nome: 'Solidariedade', familiaIdeologica: 'Centro', historico: 'Fundado em 2013 por um grupo ligado ao movimento sindical, dissidente do PCdoB.',
    presidenteNacional: { nome: 'Paulinho da Força', fonteUrl: 'https://solidariedade.org.br/perfil/paulinho-da-forca/', nota: 'Reassumiu a presidência depois da prisão do sucessor indicado, Eurípedes Camargo — sucessão recente.', risco: true } },
  { sigla: 'Rede', numero: 18, nome: 'Rede Sustentabilidade', familiaIdeologica: 'Centro-esquerda / ambientalista', historico: 'Fundado em 2015 por Marina Silva, com pauta socioambiental como eixo central.',
    presidenteNacional: { semPresidenteUnico: true, nota: 'O estatuto da Rede não prevê presidente único: dois porta-vozes revezam a função a cada ano. Marina Silva, fundadora, deixou de ser filiada. Divulgar um único nome aqui seria impreciso sobre a própria estrutura do partido — por isso não cravamos um nome.' } },
  { sigla: 'PV', numero: 43, nome: 'Partido Verde', familiaIdeologica: 'Centro-esquerda / ambientalista', historico: 'Fundado em 1986, um dos primeiros partidos verdes da América Latina.',
    presidenteNacional: { nome: 'José Luiz Penna', fonteUrl: 'https://pv.org.br/jose-luiz-penna-presidente/', nota: 'No cargo continuamente há cerca de 25 anos — o mais estável desta lista.' } },
  { sigla: 'Avante', numero: 70, nome: 'Avante', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2017 — antes chamava-se PTdoB.',
    presidenteNacional: { nome: 'Luís Tibé', fonteUrl: 'https://www.metropoles.com/brasil/eleicoes-2026-presidentes-de-17-dos-30-partidos-do-brasil-tentam-se-eleger' } },
];

const ZONAS_ESPECTRO = ['Esquerda', 'Centro-esquerda', 'Centro', 'Centro-direita', 'Direita'];

/** Deriva a faixa [zonaMin, zonaMax] (1–5) direto do texto de `familiaIdeologica`. Ver nota no topo do arquivo. */
function faixaEspectro(familia) {
  const tokens = familia.toLowerCase().split('/').map((t) => t.trim());
  const zonas = [];
  for (const t of tokens) {
    if (t.includes('centro-esquerda')) zonas.push(2);
    else if (t.includes('centro-direita')) zonas.push(4);
    else if (t.includes('esquerda')) zonas.push(1);
    else if (t.includes('direita')) zonas.push(5);
    else if (t.includes('centro')) zonas.push(3);
  }
  if (!zonas.length) zonas.push(3);
  return [Math.min(...zonas), Math.max(...zonas)];
}

function zonaPrincipal(familia) {
  const [min, max] = faixaEspectro(familia);
  return Math.round((min + max) / 2);
}

/** Slug estável pro anchor do card (usado tanto pelos chips do diagrama quanto pelo card em si). */
function siglaSlug(sigla) {
  return sigla
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Diagrama de espectro: 5 zonas, cada uma com os chips dos partidos cujo centro da faixa cai ali. Sem JS: cada chip é um link `<a href="#partido-...">` comum. */
function renderDiagramaEspectro() {
  const porZona = ZONAS_ESPECTRO.map(() => []);
  for (const p of PARTIDOS_INFO) {
    porZona[zonaPrincipal(p.familiaIdeologica) - 1].push(p);
  }
  const colunas = porZona
    .map((partidos, i) => {
      const chips = partidos
        .map(
          (p) =>
            `<a class="espectro-chip" href="#partido-${siglaSlug(p.sigla)}" title="${escapeHtml(p.familiaIdeologica)}">${escapeHtml(p.sigla)}</a>`
        )
        .join('');
      return `
        <div class="espectro-coluna">
          <span class="espectro-zona-nome">${ZONAS_ESPECTRO[i]}</span>
          <div class="espectro-chips">${chips || '<span class="espectro-vazia">—</span>'}</div>
        </div>`;
    })
    .join('');

  return `
    <section class="espectro-wrap" aria-labelledby="espectro-titulo">
      <h2 id="espectro-titulo" class="secao-titulo" style="text-align:left;">Espectro político</h2>
      <p class="secao-subtitulo" style="text-align:left; max-width:none; margin-bottom:16px;">
        Posição derivada da mesma classificação de família ideológica de cada card abaixo (ciência
        política/imprensa especializada — não é opinião do VotoCheck). Partidos com classificação
        composta (ex.: "Centro-esquerda / esquerda") aparecem na zona central dessa faixa — passe
        o mouse ou toque no chip pra ver a classificação completa. Clique num partido pra ir
        direto ao card dele.
      </p>
      <div class="espectro-eixo">
        <div class="espectro-linha"></div>
        ${colunas}
      </div>
    </section>`;
}

/** Monta o corpo da página a partir de PARTIDOS_INFO + os representantes carregados do D1. */
export function renderPartidos({ representantesPorSigla = {} } = {}) {
  const cards = PARTIDOS_INFO.map((p) => {
    const reps = representantesPorSigla[p.sigla] || [];
    const repsHtml = reps.length
      ? `<div class="partido-representantes">
          ${reps
            .map(
              (r) =>
                `<a class="partido-representante" href="/candidato/${r.pessoa_id}">${escapeHtml(r.nome_urna_atual)} (${escapeHtml(r.cargo_nome)}-${escapeHtml(r.sg_uf)})</a>`
            )
            .join('')}
        </div>`
      : `<p class="partido-sem-representante">Ainda sem candidaturas de 2026 cadastradas para este partido na nossa base.</p>`;

    const pres = p.presidenteNacional;
    const presidenciaHtml = pres
      ? pres.semPresidenteUnico
        ? `<p class="partido-presidencia partido-presidencia--nota">Sem presidente único: ${escapeHtml(pres.nota)}</p>`
        : `<p class="partido-presidencia">
             Presidência nacional: <strong title="${escapeHtml(pres.nota || '')}">${escapeHtml(pres.nome)}</strong>
             <a class="partido-presidencia-fonte" href="${escapeHtml(pres.fonteUrl)}" target="_blank" rel="noopener noreferrer">fonte ↗</a>
             ${pres.risco ? `<span class="partido-presidencia-alerta" title="${escapeHtml(pres.nota)}">⚠ pode estar desatualizado</span>` : ''}
           </p>`
      : '';

    return `
      <div class="partido-card" id="partido-${siglaSlug(p.sigla)}" data-busca="${escapeHtml(`${p.sigla} ${p.nome}`.toLowerCase())}">
        <div class="partido-cabecalho">
          <span class="partido-sigla">${escapeHtml(p.sigla)}</span>
          <span class="partido-numero">nº ${p.numero}</span>
          <span class="partido-familia">${escapeHtml(p.familiaIdeologica)}</span>
        </div>
        <p class="partido-nome">${escapeHtml(p.nome)}</p>
        <p class="partido-historico">${escapeHtml(p.historico)}</p>
        ${presidenciaHtml}
        ${repsHtml}
      </div>`;
  }).join('');

  const corpo = `
    <div style="max-width:760px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">Partidos Políticos</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:12px;">
        Entender o partido e as alianças de um Representante Público é parte de "Entender" antes
        de decidir — ver <a href="/#jornada-titulo">a jornada CONHEÇA → COBRE</a>.
      </p>
      <p class="cargo-sem-cobertura" style="display:block; margin-bottom:12px;">
        Esta é uma primeira versão: a classificação de família ideológica segue leituras correntes
        de ciência política e imprensa especializada (não é opinião do VotoCheck), e as notas
        históricas são resumos simplificados — ainda não é a árvore completa de fusões e cisões
        de cada partido. Antes de tratar qualquer dado aqui como definitivo, ele deve ser
        conferido contra fontes oficiais (TSE) e bibliografia especializada.
      </p>
      <p class="cargo-sem-cobertura" style="display:block; margin-bottom:28px;">
        Presidência nacional verificada em cada fonte oficial listada em ${escapeHtml(LIDERANCA_VERIFICADA_EM)} —
        cargo político sujeito a mudar (alguns partidos, sinalizados com ⚠, tiveram disputa ou
        sucessão recente). Não mostramos líder de bancada aqui: esse cargo muda a cada sessão
        legislativa, rápido demais pra manter atualizado com curadoria manual — consulte a
        <a href="${escapeHtml(LINK_LIDERANCAS_CAMARA)}" target="_blank" rel="noopener noreferrer">página oficial de lideranças da Câmara dos Deputados</a>,
        sempre corrente.
      </p>

      ${renderDiagramaEspectro()}

      <div class="partido-filtro-wrap">
        <label for="partido-filtro" class="partido-filtro-label">Filtrar por sigla ou nome</label>
        <input type="text" id="partido-filtro" class="partido-filtro" placeholder="Ex.: PT, União Brasil..." autocomplete="off" />
        <p id="partido-filtro-vazio" class="partido-filtro-vazio" hidden>Nenhum partido encontrado com esse termo.</p>
      </div>

      <div class="partido-lista" id="partido-lista">${cards}</div>
    </div>
    <script>
      (function () {
        var input = document.getElementById('partido-filtro');
        if (!input) return;
        var cards = Array.prototype.slice.call(document.querySelectorAll('.partido-card'));
        var vazio = document.getElementById('partido-filtro-vazio');
        input.addEventListener('input', function () {
          var termo = input.value.trim().toLowerCase();
          var visiveis = 0;
          cards.forEach(function (card) {
            var bate = !termo || card.getAttribute('data-busca').indexOf(termo) !== -1;
            card.hidden = !bate;
            if (bate) visiveis++;
          });
          vazio.hidden = visiveis !== 0;
        });
      })();
    </script>
  `;
  return pagina({
    titulo: 'Partidos Políticos — VotoCheck',
    descricao: 'Guia de partidos políticos brasileiros: espectro político, família ideológica, histórico resumido e candidaturas de 2026 cadastradas no VotoCheck, sempre com a fonte de cada dado.',
    caminho: '/partidos',
    corpo,
  });
}
