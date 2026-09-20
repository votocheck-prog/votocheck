/**
 * VotoCheck — Página de apoio "O Judiciário".
 *
 * O Judiciário não tem eleição direta (nenhum ministro, desembargador ou juiz é eleito pelo
 * voto popular), mas tem papel central no ecossistema que o VotoCheck cobre: é quem organiza as
 * eleições (Justiça Eleitoral), julga contas de campanha, pode cassar mandato, e tem a palavra
 * final sobre a constitucionalidade de leis aprovadas pelos cargos eletivos que o VotoCheck
 * acompanha. Conteúdo institucional/constitucional — mesmo princípio de `cargos_guia.js`: não é
 * opinião do VotoCheck sobre nenhuma decisão específica de nenhum tribunal.
 */
import { pagina } from './estilo_html.js';

const ORGAOS = [
  {
    nome: 'STF — Supremo Tribunal Federal',
    texto: '11 ministros, indicados pelo Presidente da República e aprovados pelo Senado (sabatina pública). Guarda a Constituição: julga ações de inconstitucionalidade de leis, conflitos entre Poderes e processa autoridades com foro privilegiado (como o próprio Presidente).',
  },
  {
    nome: 'STJ — Superior Tribunal de Justiça',
    texto: 'Uniformiza a interpretação da lei federal em todo o país (fora de matéria constitucional, que é papel do STF) e julga recursos especiais contra decisões de tribunais estaduais e federais.',
  },
  {
    nome: 'CNJ — Conselho Nacional de Justiça',
    texto: 'Fiscaliza a atuação administrativa, financeira e disciplinar do Judiciário e o cumprimento dos deveres funcionais de juízes — não julga processos judiciais comuns, controla o funcionamento da máquina da Justiça.',
  },
  {
    nome: 'Justiça Eleitoral — TSE e TREs',
    texto: 'Organiza as eleições, registra e valida candidaturas, julga ações eleitorais e contas de campanha, e pode cassar mandatos por abuso de poder ou irregularidade eleitoral. É a principal fonte oficial de dados do VotoCheck sobre candidaturas.',
  },
  {
    nome: 'Justiça Estadual — Tribunais de Justiça (TJs)',
    texto: 'Julga a maior parte dos processos cíveis e criminais do dia a dia que não são de competência federal — é o ramo do Judiciário com mais volume de casos no Brasil.',
  },
  {
    nome: 'Justiça Federal — TRFs',
    texto: 'Julga causas que envolvem a União, autarquias e empresas públicas federais, e crimes de competência federal.',
  },
  {
    nome: 'Justiça do Trabalho — TST e TRTs',
    texto: 'Julga conflitos entre empregados e empregadores e outras relações de trabalho.',
  },
];

const COMO_INGRESSAM = [
  'Juízes de primeira instância entram por concurso público de provas e títulos.',
  'Uma fração das vagas em tribunais (o "quinto constitucional") é reservada a advogados e membros do Ministério Público indicados pelo Executivo a partir de listas elaboradas pela própria categoria.',
  'Ministros do STF, STJ, TST e demais tribunais superiores são indicados pelo Presidente da República e precisam de aprovação do Senado Federal (sabatina) antes de tomar posse.',
];

export function renderJudiciario() {
  const orgaosHtml = ORGAOS.map(
    (o) => `<div class="orgao-card"><strong>${o.nome}</strong><p>${o.texto}</p></div>`
  ).join('');
  const ingressoHtml = COMO_INGRESSAM.map((i) => `<li>${i}</li>`).join('');

  const corpo = `
    <div style="max-width:720px; margin:0 auto;">
      <h1 style="font-size:clamp(26px,4vw,34px); margin-bottom:8px;">O Judiciário</h1>
      <p style="color:var(--text-muted); font-size:15px; margin-bottom:28px;">
        Diferente dos cargos que o VotoCheck acompanha, ninguém no Judiciário é eleito pelo voto
        popular — mas o papel dele é decisivo pra todo o resto do sistema, inclusive nas próprias
        eleições.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Por que não tem eleição direta</h2>
      <p>
        O desenho constitucional brasileiro separa os Poderes e busca blindar decisões judiciais
        de pressão eleitoral direta. Isso não significa ausência de controle: concursos públicos,
        decisões colegiadas (vários juízes decidindo juntos), possibilidade de recurso a uma
        instância superior, fiscalização do CNJ e — no caso dos ministros do STF — a possibilidade
        de impeachment, de competência exclusiva do Senado Federal, são os principais freios.
      </p>

      <h2 style="font-size:19px; margin-top:32px;">Como se ingressa na carreira</h2>
      <ul>${ingressoHtml}</ul>

      <h2 style="font-size:19px; margin-top:40px;">Os principais órgãos</h2>
      <div class="orgaos-grid">${orgaosHtml}</div>

      <h2 style="font-size:19px; margin-top:40px;">Onde isso cruza com o que o VotoCheck cobre</h2>
      <p>
        A Justiça Eleitoral (TSE e TREs) é a principal fonte oficial de dados do VotoCheck sobre
        candidaturas — veja o <a href="/#obtencao-titulo">bloco "Obtenção de dados"</a> na home. O
        STF, por sua vez, tem a palavra final sobre a constitucionalidade de leis aprovadas pelos
        cargos eletivos que acompanhamos (Congresso Nacional, assembleias estaduais), e o Senado
        Federal participa diretamente da aprovação dos ministros dos tribunais superiores — ver o
        <a href="/cargo/senador">guia do cargo de Senador</a>.
      </p>
    </div>
  `;
  return pagina({
    titulo: 'O Judiciário — VotoCheck',
    descricao: 'Como funciona o Judiciário brasileiro, por que não tem eleição direta, e como ele se relaciona com os cargos eletivos e com as eleições que o VotoCheck acompanha.',
    caminho: '/judiciario',
    corpo,
  });
}
