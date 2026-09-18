/**
 * VotoCheck — Página de perfil de candidato/representante.
 *
 * "Passaporte da evidência" (Mapa Mestre §4): cada bloco de informação mostra explicitamente
 * de onde veio (fonte oficial) — nunca uma afirmação solta sem origem rastreável.
 */
import { pagina, escapeHtml, statusPill } from './estilo_html.js';

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  // aceita YYYY-MM-DD (Senado) ou DD/MM/YYYY (TSE)
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

function blocoCandidatura(c) {
  const idade = calcularIdade(c.data_nascimento);
  return `
  <div class="card" style="margin-bottom:16px;">
    <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:8px;">
      <div>
        <strong>${escapeHtml(c.cargo_nome)} · ${escapeHtml(c.sg_uf)} · ${escapeHtml(c.ano_eleicao)}</strong>
        ${c.numero_urna ? `<div style="color:var(--text-muted); font-size:14px;">Número de urna: ${escapeHtml(c.numero_urna)}</div>` : ''}
        ${c.partido_sigla ? `<div style="color:var(--text-muted); font-size:14px;">${escapeHtml(c.partido_sigla)}${c.partido_nome ? ` — ${escapeHtml(c.partido_nome)}` : ''}</div>` : ''}
        ${c.nome_coligacao ? `<div style="color:var(--text-muted); font-size:14px;">Coligação: ${escapeHtml(c.nome_coligacao)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        ${statusPill(c.status_codigo, c.status_descricao)}
        ${c.situacao_candidatura ? `<div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Candidatura: ${escapeHtml(c.situacao_candidatura)}</div>` : ''}
        ${c.situacao_totalizacao_turno ? `<div style="font-size:13px; color:var(--text-muted);">Resultado: ${escapeHtml(c.situacao_totalizacao_turno)}</div>` : ''}
      </div>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
      Fonte: ${escapeHtml(c.fonte_nome || 'não informada')}${c.fonte_url ? ` — <a href="${escapeHtml(c.fonte_url)}" target="_blank" rel="noopener">consultar dados oficiais</a>` : ''}
    </div>
  </div>`;
}

function blocoMandato(m) {
  return `
  <div class="card" style="margin-bottom:12px;">
    <strong>${escapeHtml(m.cargo_nome)}${m.sg_uf ? ` · ${escapeHtml(m.sg_uf)}` : ''}</strong>
    ${m.legislatura ? `<div style="font-size:13px; color:var(--text-muted);">Legislatura ${escapeHtml(m.legislatura)}</div>` : ''}
    ${m.situacao ? `<div style="font-size:13px; color:var(--text-muted);">Situação: ${escapeHtml(m.situacao)}</div>` : ''}
    ${m.data_inicio ? `<div style="font-size:13px; color:var(--text-muted);">Início: ${escapeHtml(m.data_inicio)}${m.data_fim ? ` · Fim: ${escapeHtml(m.data_fim)}` : ''}</div>` : ''}
    <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
      Fonte: ${escapeHtml(m.fonte_nome || 'não informada')}
    </div>
  </div>`;
}

export function renderPerfil({ pessoa, candidaturas, mandatos, filiacoes }) {
  const nomeExibicao = pessoa.nome_urna_atual || pessoa.nome_completo;
  const idade = calcularIdade(pessoa.data_nascimento);
  const principal = candidaturas[0];

  const corpo = `
    <div style="display:flex; gap:20px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
      <div style="width:88px; height:88px; border-radius:50%; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:32px; color:var(--primary); overflow:hidden; flex-shrink:0;">
        ${pessoa.foto_url ? `<img src="${escapeHtml(pessoa.foto_url)}" alt="" style="width:100%; height:100%; object-fit:cover;">` : escapeHtml(nomeExibicao.slice(0, 1))}
      </div>
      <div>
        <h1 style="margin:0 0 4px; font-size:28px;">${escapeHtml(nomeExibicao)}</h1>
        ${pessoa.nome_completo && pessoa.nome_completo !== nomeExibicao ? `<div style="color:var(--text-muted);">${escapeHtml(pessoa.nome_completo)}</div>` : ''}
        ${principal ? `<div style="color:var(--text-muted); font-size:14px; margin-top:4px;">${escapeHtml(principal.cargo_nome)} · ${escapeHtml(principal.sg_uf)}${principal.partido_sigla ? ` · ${escapeHtml(principal.partido_sigla)}` : ''}</div>` : ''}
      </div>
    </div>

    <div style="display:flex; gap:16px; flex-wrap:wrap; color:var(--text-muted); font-size:14px; margin-bottom:28px;">
      ${idade ? `<span>${idade} anos</span>` : ''}
      ${pessoa.genero ? `<span>${escapeHtml(pessoa.genero)}</span>` : ''}
      ${pessoa.grau_instrucao ? `<span>${escapeHtml(pessoa.grau_instrucao)}</span>` : ''}
      ${pessoa.cor_raca ? `<span>${escapeHtml(pessoa.cor_raca)}</span>` : ''}
    </div>

    <h2 style="font-size:18px; margin-bottom:12px;">Candidatura${candidaturas.length > 1 ? 's' : ''} 2026</h2>
    ${candidaturas.map(blocoCandidatura).join('') || '<p style="color:var(--text-muted);">Nenhuma candidatura registrada.</p>'}

    ${mandatos.length ? `
      <h2 style="font-size:18px; margin:28px 0 12px;">Mandato${mandatos.length > 1 ? 's' : ''} em exercício</h2>
      ${mandatos.map(blocoMandato).join('')}
    ` : ''}

    ${filiacoes.length ? `
      <h2 style="font-size:18px; margin:28px 0 12px;">Histórico partidário</h2>
      <ul style="padding-left:20px; color:var(--text-muted); font-size:14px;">
        ${filiacoes.map((f) => `<li>${escapeHtml(f.sigla)}${f.nome ? ` — ${escapeHtml(f.nome)}` : ''}${f.data_inicio ? ` (desde ${escapeHtml(f.data_inicio)})` : ''}</li>`).join('')}
      </ul>
    ` : ''}

    <div class="card" style="margin-top:32px; background:var(--primary-soft); border-color:var(--primary);">
      <strong style="font-size:14px;">Sobre estes dados</strong>
      <p style="font-size:13px; color:var(--text); margin:8px 0 0;">
        As informações desta página vêm de fontes públicas oficiais e são atualizadas periodicamente.
        Encontrou algo desatualizado ou incorreto? Em breve o VotoCheck terá um canal de contestação
        aberto ao próprio candidato e a qualquer cidadão.
      </p>
    </div>
  `;

  return pagina({
    titulo: `${nomeExibicao} — VotoCheck`,
    descricao: `Histórico, candidatura e fontes oficiais sobre ${nomeExibicao} no VotoCheck.`,
    corpo,
  });
}

export function renderNaoEncontrado() {
  return pagina({
    titulo: 'Candidato não encontrado — VotoCheck',
    descricao: 'Página não encontrada.',
    corpo: `<div style="text-align:center; padding:60px 0;">
      <h1>Não encontramos essa pessoa</h1>
      <p style="color:var(--text-muted);">O registro pode ter sido removido ou o link está incorreto.</p>
      <p><a href="/">Voltar para a busca</a></p>
    </div>`,
  });
}
