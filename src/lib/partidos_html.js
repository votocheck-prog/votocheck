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
 */
import { pagina, escapeHtml } from './estilo_html.js';

export const PARTIDOS_INFO = [
  { sigla: 'PT', numero: 13, nome: 'Partido dos Trabalhadores', familiaIdeologica: 'Centro-esquerda / esquerda', historico: 'Fundado em 1980, a partir do movimento sindical e de setores da esquerda e da Igreja Católica progressista.' },
  { sigla: 'PL', numero: 22, nome: 'Partido Liberal', familiaIdeologica: 'Direita', historico: 'Sigla histórica reorganizada ao longo do tempo por sucessivas fusões com outras legendas de centro-direita e direita.' },
  { sigla: 'MDB', numero: 15, nome: 'Movimento Democrático Brasileiro', familiaIdeologica: 'Centro', historico: 'Origem no MDB fundado em 1966, durante o bipartidarismo do regime militar; um dos partidos mais antigos em atividade contínua.' },
  { sigla: 'PSDB', numero: 45, nome: 'Partido da Social Democracia Brasileira', familiaIdeologica: 'Centro / centro-direita', historico: 'Fundado em 1988 por um grupo de dissidentes do então MDB/PMDB.' },
  { sigla: 'PP', numero: 11, nome: 'Progressistas', familiaIdeologica: 'Centro-direita / direita', historico: 'Resultado de fusões sucessivas de legendas com raiz na antiga Arena, do regime militar.' },
  { sigla: 'União Brasil', numero: 44, nome: 'União Brasil', familiaIdeologica: 'Centro-direita / direita', historico: 'Criado em 2021–2022 pela fusão do DEM (herdeiro histórico da Arena/PFL) com o PSL.' },
  { sigla: 'PSD', numero: 55, nome: 'Partido Social Democrático', familiaIdeologica: 'Centro / centro-direita', historico: 'Fundado em 2011 por Gilberto Kassab, reunindo dissidentes de vários outros partidos.' },
  { sigla: 'Republicanos', numero: 10, nome: 'Republicanos', familiaIdeologica: 'Direita', historico: 'Sigla renomeada em 2019 — antes chamava-se PRB.' },
  { sigla: 'PDT', numero: 12, nome: 'Partido Democrático Trabalhista', familiaIdeologica: 'Centro-esquerda', historico: 'Fundado por Leonel Brizola em torno de 1979–1980, como herdeiro do trabalhismo histórico de Getúlio Vargas.' },
  { sigla: 'PSB', numero: 40, nome: 'Partido Socialista Brasileiro', familiaIdeologica: 'Centro-esquerda', historico: 'Refundado em 1985, remetendo a uma sigla socialista anterior ao regime militar.' },
  { sigla: 'PSOL', numero: 50, nome: 'Partido Socialismo e Liberdade', familiaIdeologica: 'Esquerda', historico: 'Fundado em 2004 por um grupo de dissidentes do PT.' },
  { sigla: 'PCdoB', numero: 65, nome: 'Partido Comunista do Brasil', familiaIdeologica: 'Esquerda', historico: 'Fundado em 1962, a partir de uma cisão do antigo Partido Comunista Brasileiro (PCB).' },
  { sigla: 'Podemos', numero: 19, nome: 'Podemos', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2017 — antes chamava-se PTN.' },
  { sigla: 'Novo', numero: 30, nome: 'Partido Novo', familiaIdeologica: 'Direita liberal', historico: 'Fundado em 2015, com plataforma declaradamente liberal na economia.' },
  { sigla: 'Cidadania', numero: 23, nome: 'Cidadania', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2019 — antes chamava-se PPS, ela mesma sucessora do antigo PCB refundado em 1992.' },
  { sigla: 'Solidariedade', numero: 77, nome: 'Solidariedade', familiaIdeologica: 'Centro', historico: 'Fundado em 2013 por um grupo ligado ao movimento sindical, dissidente do PCdoB.' },
  { sigla: 'Rede', numero: 18, nome: 'Rede Sustentabilidade', familiaIdeologica: 'Centro-esquerda / ambientalista', historico: 'Fundado em 2015 por Marina Silva, com pauta socioambiental como eixo central.' },
  { sigla: 'PV', numero: 43, nome: 'Partido Verde', familiaIdeologica: 'Centro-esquerda / ambientalista', historico: 'Fundado em 1986, um dos primeiros partidos verdes da América Latina.' },
  { sigla: 'Avante', numero: 70, nome: 'Avante', familiaIdeologica: 'Centro', historico: 'Sigla renomeada em 2017 — antes chamava-se PTdoB.' },
];

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

    return `
      <div class="partido-card">
        <div class="partido-cabecalho">
          <span class="partido-sigla">${escapeHtml(p.sigla)}</span>
          <span class="partido-numero">nº ${p.numero}</span>
          <span class="partido-familia">${escapeHtml(p.familiaIdeologica)}</span>
        </div>
        <p class="partido-nome">${escapeHtml(p.nome)}</p>
        <p class="partido-historico">${escapeHtml(p.historico)}</p>
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
      <p class="cargo-sem-cobertura" style="display:block; margin-bottom:28px;">
        Esta é uma primeira versão: a classificação de família ideológica segue leituras correntes
        de ciência política e imprensa especializada (não é opinião do VotoCheck), e as notas
        históricas são resumos simplificados — ainda não é a árvore completa de fusões e cisões
        de cada partido. Antes de tratar qualquer dado aqui como definitivo, ele deve ser
        conferido contra fontes oficiais (TSE) e bibliografia especializada.
      </p>
      <div class="partido-lista">${cards}</div>
    </div>
  `;
  return pagina({
    titulo: 'Partidos Políticos — VotoCheck',
    descricao: 'Guia de partidos políticos brasileiros: família ideológica, histórico resumido e candidaturas de 2026 cadastradas no VotoCheck, sempre com a fonte de cada dado.',
    caminho: '/partidos',
    corpo,
  });
}
