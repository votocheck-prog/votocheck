"""VotoCheck — fábrica diária de peças (esteira D21).

Roda todo dia (GitHub Actions, .github/workflows/pauta.yml) e:
 1. escolhe os estados do dia (rodízio, maiores primeiro);
 2. consulta o D1 (dados agregados do TSE: candidatos por vaga, mulheres, idade, patrimônio, reeleição);
 3. gera 1 carrossel (1080x1350) por estado + 1 reel narrado (voz IA rotulada) do 1º estado;
 4. sobe os arquivos para o KV (s:<data>/...) e grava o manifesto pauta:<data>;
 5. manda e-mail ao Rodrigo com o link da página de aprovação.

Regras de conteúdo (doc, seção 5.6): só agregados, nunca candidato nominal; fonte na peça;
partidos nunca em ranking; véspera e dia de eleição = só utilidade (a fábrica não gera nada nesses dias).

Variáveis de ambiente: CF_TOKEN, ADMIN_TOKEN, RESEND_API_KEY, GEMINI_API_KEY (opcional: sem ela, o reel sai sem narração),
DATA (AAAA-MM-DD, opcional), UFS_POR_DIA (padrão 3), EMAIL_PARA (padrão votocheck@gmail.com).
"""
import os, sys, json, base64, time, wave, subprocess, statistics, urllib.request, urllib.parse, urllib.error, datetime, asyncio, shutil, hashlib

ACC = '22688effbd9ab181498d04ccd2cc8d2e'
DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'
KV = os.environ.get('CF_KV_OG', '58aea9d36a9c4055bbcff72f7c08c3bd')
TOK = os.environ['CF_TOKEN']
AQUI = os.path.dirname(os.path.abspath(__file__))
HOJE = os.environ.get('DATA') or (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime('%Y-%m-%d')
DIA_1T = datetime.date(2026, 10, 4)
FALTAM = (DIA_1T - datetime.date.fromisoformat(HOJE)).days
SEM_PECAS = {'2026-10-03', '2026-10-04', '2026-10-24', '2026-10-25'}  # véspera e dia de votação: só utilidade (feito à mão)

UF_NOMES = {'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'}
VAGAS_FED = {'SP': 70, 'MG': 53, 'RJ': 46, 'BA': 39, 'RS': 31, 'PR': 30, 'PE': 25, 'CE': 22, 'MA': 18, 'GO': 17, 'PA': 17, 'SC': 16, 'PB': 12, 'ES': 10, 'PI': 10, 'AL': 9, 'AC': 8, 'AM': 8, 'AP': 8, 'DF': 8, 'MT': 8, 'MS': 8, 'RN': 8, 'RO': 8, 'RR': 8, 'SE': 8, 'TO': 8}
ORDEM = sorted(VAGAS_FED, key=lambda u: (-VAGAS_FED[u], u))
PREP = {'AC': 'no', 'AL': 'em', 'AP': 'no', 'AM': 'no', 'BA': 'na', 'CE': 'no', 'DF': 'no', 'ES': 'no', 'GO': 'em', 'MA': 'no', 'MT': 'em', 'MS': 'em', 'MG': 'em', 'PA': 'no', 'PB': 'na', 'PR': 'no', 'PE': 'em', 'PI': 'no', 'RJ': 'no', 'RN': 'no', 'RS': 'no', 'RO': 'em', 'RR': 'em', 'SC': 'em', 'SP': 'em', 'SE': 'em', 'TO': 'no'}


def d1(sql, params=None):
    body = {'sql': sql}
    if params is not None:
        body['params'] = params
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    return r['result'][0]['results']


def ufs_do_dia():
    n = int(os.environ.get('UFS_POR_DIA', '3'))
    inicio = datetime.date(2026, 9, 27)
    dia = (datetime.date.fromisoformat(HOJE) - inicio).days
    return [ORDEM[(dia * n + i) % len(ORDEM)] for i in range(n)]


def idade(dn):
    try:
        d, m, a = [int(x) for x in dn[:10].split('/')] if '/' in dn else [int(x) for x in reversed(dn[:10].split('-'))]
    except Exception:
        return None
    hoje = datetime.date.fromisoformat(HOJE)
    return hoje.year - a - ((hoje.month, hoje.day) < (m, d))


def dados_uf(uf):
    rows = d1("""SELECT p.genero, p.data_nascimento, c.bens_declarados_total bens,
                 EXISTS(SELECT 1 FROM mandato m WHERE m.pessoa_id=c.pessoa_id AND m.data_fim IS NULL AND m.cargo_id=4) dep_atual
                 FROM candidatura c JOIN pessoa p ON p.id=c.pessoa_id WHERE c.ano_eleicao=2026 AND c.cargo_id=4 AND c.sg_uf=?""", [uf])
    n = len(rows)
    mulheres = sum(1 for r in rows if (r['genero'] or '').startswith('F'))
    idades = [i for i in (idade(r['data_nascimento'] or '') for r in rows) if i]
    bens = sorted((r['bens'] or 0) for r in rows)
    reel = sum(1 for r in rows if r['dep_atual'])
    est = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id IN (5,6)", [uf])[0]['n']
    sen = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id=3", [uf])[0]['n']
    gov = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id=2", [uf])[0]['n']
    f = VAGAS_FED[uf]
    vagas_est = 3 * f if f <= 12 else 36 + (f - 12)
    return {
        'uf': uf, 'nome': UF_NOMES[uf], 'prep': PREP[uf], 'fed': n, 'vagas_fed': f, 'por_vaga': round(n / f, 1) if f else 0,
        'mulheres_pct': round(100 * mulheres / n) if n else 0, 'idade_media': round(statistics.mean(idades)) if idades else None,
        'bens_mediana': statistics.median(bens) if bens else 0, 'reeleicao': reel, 'est': est, 'vagas_est': vagas_est, 'sen': sen, 'gov': gov,
    }


def brl(v):
    if v >= 1e6:
        return f"R$ {v/1e6:.1f} mi".replace('.', ',')
    if v >= 1e3:
        return f"R$ {round(v/1e3):,} mil".replace(',', '.')
    return f"R$ {round(v):,}".replace(',', '.')


def num(n):
    return f"{n:,}".replace(',', '.')


# ---------- peças ----------
def rod(fonte):
    return f'<div class="rod"><div class="fonte">{fonte}</div><img src="logo_h_branco.png"></div>'


def page(body):
    return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"></head><body><div class="s">{body}</div></body></html>'


FONTE = f'Fonte: TSE, candidaturas registradas (dados de {HOJE[8:10]}/{HOJE[5:7]}/{HOJE[:4]})'


def slides_uf(x):
    t = 6
    s = []
    s.append(page(f'''<div class="eyebrow">Faltam {FALTAM} dias · 4 de outubro</div><h1 style="font-size:84px">Quem vai representar <em>{x['nome']}</em> na Câmara pelos próximos 4 anos?</h1>
<p class="lead" style="margin-top:36px">Você decide no dia 4. Antes, veja os números oficiais de quem disputa. Arrasta →</p>{rod('@votocheck · informação oficial, com fonte')}'''))
    s.append(page(f'''<div class="pag">2/{t}</div><div class="eyebrow">Deputado Federal · {x['uf']}</div><div class="big"><em>{num(x['fed'])}</em></div>
<h2 style="margin-top:24px">candidatos para {x['vagas_fed']} vagas</h2><p class="lead">Cerca de {str(x['por_vaga']).replace('.', ',')} por vaga. E ainda tem {num(x['est'])} disputando {x['vagas_est']} vagas de deputado {'distrital' if x['uf']=='DF' else 'estadual'}.</p>{rod(FONTE)}'''))
    s.append(page(f'''<div class="pag">3/{t}</div><div class="eyebrow">Quem são</div><div class="big"><em>{x['mulheres_pct']}%</em></div>
<h2 style="margin-top:24px">das candidaturas a deputado federal são de mulheres</h2><p class="lead">A lei exige que cada partido reserve pelo menos 30% das candidaturas para cada gênero.</p>{rod(FONTE + ' · Lei 9.504/97, art. 10')}'''))
    s.append(page(f'''<div class="pag">4/{t}</div><div class="eyebrow">Perfil</div><div class="big"><em>{x['idade_media']} anos</em></div>
<h2 style="margin-top:24px">é a idade média</h2><p class="lead">E metade dos candidatos declarou ao TSE patrimônio de até <b style="color:#fff">{brl(x['bens_mediana'])}</b>.</p>{rod(FONTE + ' · bens declarados')}'''))
    s.append(page(f'''<div class="pag">5/{t}</div><div class="eyebrow">Quem já está lá</div><div class="big"><em>{x['reeleicao']}</em></div>
<h2 style="margin-top:24px">deputados federais {x['prep']} {x['nome']} tentam a reeleição</h2><p class="lead">No VotoCheck, a ficha de quem já tem mandato mostra como a pessoa votou nas votações do Plenário.</p>{rod('Fonte: Câmara dos Deputados e TSE')}'''))
    s.append(page(f'''<div class="pag">6/{t}</div><div class="eyebrow">E agora?</div><h2>Conhecer antes<br>ou <em>reclamar depois?</em></h2>
<p class="lead">Veja todos os candidatos {x['prep']} {x['nome']}: número, partido, patrimônio, como votou. Monte sua cola.</p>
<div style="margin-top:36px;display:flex;gap:18px;flex-wrap:wrap"><span class="btn">Siga @votocheck</span><span class="btn" style="background:#00B495">Mande pra 3 amigos</span></div>{rod('votocheck.com.br · até o dia 4, um raio-X por dia')}'''))
    return s


def legenda_uf(x):
    return (f"Faltam {FALTAM} dias. No dia 4 você escolhe quem vai fazer as leis pelos próximos 4 anos (e dois senadores, que ficam 8). "
            f"Vai conhecer antes ou reclamar depois?\n\n"
            f"{x['prep'].capitalize()} {x['nome']}: {num(x['fed'])} candidatos a deputado federal para {x['vagas_fed']} vagas, "
            f"{x['mulheres_pct']}% de mulheres, idade média de {x['idade_media']} anos. Números oficiais do TSE.\n\n"
            f"👉 Salva este post\n👉 Manda pra 3 pessoas que ainda não decidiram o voto para deputado\n👉 Segue @votocheck: até o dia 4 tem um raio-X por dia\n\n"
            f"No VotoCheck você vê todos os candidatos do estado, com número, partido, patrimônio declarado e fonte oficial. Link na bio.\n\n"
            f"#eleicoes2026 #{x['nome'].replace(' ', '').lower()} #deputadofederal #voto #votoconsciente")


def dados_dinheiro(uf):
    r = d1("""SELECT ca.slug, COUNT(*) n, SUM(f.fefc + f.fundo_partidario) pub, SUM(f.total) tot,
                 SUM(CASE WHEN f.fefc + f.fundo_partidario > 0 THEN 1 ELSE 0 END) com, MAX(f.data_referencia) ref
              FROM financiamento_campanha f JOIN candidatura c ON c.id = f.candidatura_id JOIN cargo ca ON ca.id = c.cargo_id
              WHERE c.sg_uf = ? GROUP BY ca.slug""", [uf])
    por = {x['slug']: x for x in r}
    pub = sum(x['pub'] or 0 for x in r); tot = sum(x['tot'] or 0 for x in r); com = sum(x['com'] or 0 for x in r)
    fed = por.get('deputado_federal', {})
    ref = max((x['ref'] or '') for x in r) if r else HOJE
    return {'uf': uf, 'nome': UF_NOMES[uf], 'prep': PREP[uf], 'pub': pub, 'pct': round(100 * pub / tot) if tot else 0, 'com': com,
            'fed_pub': fed.get('pub') or 0, 'fed_com': fed.get('com') or 0, 'fed_media': (fed.get('pub') or 0) / (fed.get('com') or 1),
            'ref': f"{ref[8:10]}/{ref[5:7]}"}


def slides_dinheiro(x):
    t = 5; F = f"Fonte: TSE, prestação de contas parcial dos candidatos (dados de {x['ref']})"
    return [
        page(f'''<div class="eyebrow">Faltam {FALTAM} dias · dinheiro público</div><h1 style="font-size:84px">Quanto do <em>seu dinheiro</em> já foi para as campanhas {x['prep']} {x['nome']}?</h1>
<p class="lead" style="margin-top:36px">Fundo eleitoral e fundo partidário são pagos com dinheiro público. Arrasta →</p>{rod('@votocheck · informação oficial, com fonte')}'''),
        page(f'''<div class="pag">2/{t}</div><div class="eyebrow">{x['nome']}</div><div class="big" style="font-size:150px"><em>{brl(x['pub'])}</em></div>
<h2 style="margin-top:24px">de dinheiro público já foram para as campanhas do estado</h2><p class="lead">Somando todos os cargos, até {x['ref']}.</p>{rod(F)}'''),
        page(f'''<div class="pag">3/{t}</div><div class="eyebrow">De onde vem</div><div class="big"><em>{x['pct']}%</em></div>
<h2 style="margin-top:24px">de tudo o que as campanhas arrecadaram é dinheiro público</h2><p class="lead">O resto vem de doações de pessoas e de recursos dos próprios candidatos.</p>{rod(F)}'''),
        page(f'''<div class="pag">4/{t}</div><div class="eyebrow">Deputado federal · {x['uf']}</div><div class="big" style="font-size:150px"><em>{brl(x['fed_media'])}</em></div>
<h2 style="margin-top:24px">é a média recebida por quem ganhou verba pública</h2><p class="lead">{num(x['fed_com'])} candidatos a deputado federal {x['prep']} {x['nome']} receberam. Quem decide quanto vai para cada um é o partido.</p>{rod(F)}'''),
        page(f'''<div class="pag">5/{t}</div><div class="eyebrow">E agora?</div><h2>Veja quanto <em>cada candidato</em> recebeu.</h2>
<p class="lead">Nome por nome, com fonte oficial, em votocheck.com.br/dinheiro-publico</p>
<div style="margin-top:36px;display:flex;gap:18px;flex-wrap:wrap"><span class="btn">Siga @votocheck</span><span class="btn" style="background:#00B495">Mande pra 3 amigos</span></div>{rod('votocheck.com.br · até o dia 4, um raio-X por dia')}'''),
    ]


def legenda_dinheiro(x):
    return (f"{brl(x['pub'])} de dinheiro público já foram para as campanhas {x['prep']} {x['nome']}. É fundo eleitoral e fundo partidário, pago com imposto. "
            f"{x['pct']}% de tudo o que as campanhas do estado arrecadaram vem daí.\n\n"
            f"Quer saber quanto foi para cada candidato? Está tudo no VotoCheck, nome por nome, com fonte do TSE. Link na bio.\n\n"
            f"👉 Manda pra 3 pessoas {x['prep']} {x['nome']}\n👉 Segue @votocheck: até o dia 4 tem conteúdo novo todo dia\n\n"
            f"#eleicoes2026 #{x['nome'].replace(' ', '').lower()} #fundoeleitoral #dinheiropublico #votoconsciente")


# ---------- Ranking de dinheiro público por estado (prioridade, pedido do Rodrigo em 26/09/2026) ----------
# Cita candidatos por nome: só dado oficial do TSE, "recebeu" (não "gastou"), valores parciais com data,
# ordem pelo valor e sem adjetivo. Nunca impulsionar esta peça (Lei 9.504, art. 57-C).
CARGOS_RANK = [(4, 'deputado federal'), (5, 'deputado estadual'), (6, 'deputado distrital')]


def top_dinheiro(uf, cargo_id, n=5):
    return d1("""SELECT p.nome_urna_atual nome, pa.sigla partido, p.foto_url foto, c.numero_urna num, f.fefc + f.fundo_partidario pub
                 FROM financiamento_campanha f JOIN candidatura c ON c.id = f.candidatura_id JOIN pessoa p ON p.id = c.pessoa_id
                 LEFT JOIN partido pa ON pa.id = c.partido_id
                 WHERE c.sg_uf = ? AND c.cargo_id = ? AND f.fefc + f.fundo_partidario > 0
                 ORDER BY pub DESC LIMIT ?""", [uf, cargo_id, n])


def nome_proprio(t):
    menores = {'da', 'de', 'do', 'das', 'dos', 'e'}
    return ' '.join(w if w.lower() in menores else w.capitalize() for w in (t or '').lower().split())


def slide_ranking(x, titulo_cargo, linhas, pag, t, F):
    itens = ''.join(
        f'''<div style="display:grid;grid-template-columns:70px 120px 1fr auto;gap:26px;align-items:center;padding:20px 0;border-bottom:1px solid rgba(255,255,255,.12)">
<b style="font-family:'Plus Jakarta Sans';font-size:48px;color:#5FE3C8">{i}º</b>
<img src="{('https://votocheck.com.br' + r['foto']) if (r['foto'] or '').startswith('/') else (r['foto'] or '')}" style="width:120px;height:120px;border-radius:24px;object-fit:cover;background:#1B2766">
<div><div style="font-family:'Plus Jakarta Sans';font-weight:800;font-size:42px;line-height:1.1">{nome_proprio(r['nome'])}</div><div style="font-size:30px;color:#AEB9E0;margin-top:6px">{r['partido'] or ''} · {r['num']}</div></div>
<b style="font-family:'Plus Jakarta Sans';font-size:48px;color:#FFB067;white-space:nowrap">{brl(r['pub'])}</b></div>'''
        for i, r in enumerate(linhas, 1))
    return page(f'''<div class="pag">{pag}/{t}</div><div class="eyebrow">{titulo_cargo} · {x['uf']}</div><h2 style="font-size:64px;margin-bottom:18px">Quem mais recebeu dinheiro público</h2>
<div>{itens}</div>{rod(F)}''')


def slides_ranking(x, ranks):
    t = 2 + len(ranks) + 1
    F = f"Fonte: TSE, prestação de contas parcial (dados de {x['ref']}). Valores recebidos do fundo eleitoral e partidário."
    s = [page(f'''<div class="eyebrow">Faltam {FALTAM} dias · dinheiro público</div><h1 style="font-size:80px">Quem mais recebeu <em>dinheiro público</em> para fazer campanha {x['prep']} {x['nome']}?</h1>
<p class="lead" style="margin-top:36px">Fundo eleitoral e fundo partidário são pagos com imposto. Nomes e valores oficiais do TSE. Arrasta →</p>{rod('@votocheck · informação oficial, com fonte')}''')]
    for k, (titulo, linhas) in enumerate(ranks, 2):
        s.append(slide_ranking(x, titulo, linhas, k, t, F))
    s.append(page(f'''<div class="pag">{t - 1}/{t}</div><div class="eyebrow">{x['nome']}</div><div class="big" style="font-size:150px"><em>{brl(x['pub'])}</em></div>
<h2 style="margin-top:24px">de dinheiro público para as campanhas do estado</h2><p class="lead">Quem decide quanto vai para cada candidato é o partido. Os valores ainda podem mudar até a prestação de contas final.</p>{rod(F)}'''))
    s.append(page(f'''<div class="pag">{t}/{t}</div><div class="eyebrow">E o seu candidato?</div><h2>Veja quanto <em>cada um</em> recebeu.</h2>
<p class="lead">Todos os candidatos {x['prep']} {x['nome']}, nome por nome, em votocheck.com.br/dinheiro-publico</p>
<div style="margin-top:36px;display:flex;gap:18px;flex-wrap:wrap"><span class="btn">Siga @votocheck</span><span class="btn" style="background:#00B495">Mande pra 3 amigos</span></div>{rod('votocheck.com.br · até o dia 4, conteúdo novo todo dia')}'''))
    return s


def legenda_ranking(x, ranks):
    top = ranks[0][1][0] if ranks and ranks[0][1] else None
    linha_top = f"Em {x['nome']}, quem mais recebeu para a campanha de {ranks[0][0]} foi {nome_proprio(top['nome'])} ({top['partido']}): {brl(top['pub'])}. " if top else ''
    return (f"Quem mais recebeu dinheiro público para fazer campanha {x['prep']} {x['nome']}? {linha_top}"
            f"No total, {brl(x['pub'])} de fundo eleitoral e partidário já foram para as campanhas do estado.\n\n"
            f"Valores oficiais declarados ao TSE até {x['ref']} (parciais). Quem distribui o dinheiro entre os candidatos é o partido.\n\n"
            f"👉 Quer saber quanto o SEU candidato recebeu? Está no VotoCheck, nome por nome. Link na bio.\n👉 Manda pra 3 pessoas {x['prep']} {x['nome']}\n👉 Segue @votocheck: até o dia 4 tem conteúdo novo todo dia\n\n"
            f"#eleicoes2026 #{x['nome'].replace(' ', '').lower()} #fundoeleitoral #dinheiropublico #votoconsciente")


# ---------- Publicação automática via Buffer (26/09/2026) ----------
# A peça nasce "pré-aprovada" e já agendada no Buffer para o horário do item. Se o Rodrigo recusar
# em /admin/pauta antes do horário, o Worker apaga o agendamento. Sem BUFFER_API_KEY, tudo fica
# "pendente" para publicação manual, como antes.
# Facebook: não entra pelo Buffer (plano grátis = 3 canais); sai espelhado do Instagram pela Central
# de Contas da Meta (compartilhamento automático de posts e reels).
BUFFER_KEY = os.environ.get('BUFFER_API_KEY')
MIDIA = 'https://votocheck.com.br/midia'


def buffer_gql(query, variables=None):
    req = urllib.request.Request('https://api.buffer.com', data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                 headers={'Authorization': 'Bearer ' + BUFFER_KEY, 'Content-Type': 'application/json', 'User-Agent': 'VotoCheck-fabrica/1.0'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    if r.get('errors'):
        raise RuntimeError(json.dumps(r['errors'])[:400])
    return r['data']


def buffer_canais():
    orgs = buffer_gql('query { account { organizations { id } } }')['account']['organizations']
    canais = {}
    for o in orgs:
        for c in buffer_gql('query C($o: OrganizationId!) { channels(input: { organizationId: $o }) { id service name } }', {'o': o['id']})['channels']:
            canais.setdefault(c['service'].lower(), c['id'])
    return canais


def horario_utc(hhmm):
    h, m = [int(x) for x in hhmm.split(':')]
    return (datetime.datetime.fromisoformat(HOJE) + datetime.timedelta(hours=h + 3, minutes=m)).strftime('%Y-%m-%dT%H:%M:00.000Z')


def buffer_agendar(item, canais, redes, arquivos, hhmm, titulo_video=None):
    """Agenda o item em cada rede. Imagens viram carrossel; .mp4 vira vídeo (reel/short)."""
    item['publicar_em'] = horario_utc(hhmm)
    item['buffer'] = []
    erros = []
    for rede in redes:
        cid = canais.get(rede)
        if not cid:
            erros.append(f'{rede}: canal não conectado no Buffer'); continue
        video = [a for a in arquivos if a.endswith('.mp4')]
        if video:
            assets = [{'video': {'url': f'{MIDIA}/{HOJE}/{video[0]}'}}]
        else:
            assets = [{'image': {'url': f'{MIDIA}/{HOJE}/{a}'}} for a in arquivos if a.endswith('.png') and not a.endswith('_v.png')][:10]
        entrada = {'text': item['legenda'], 'channelId': cid, 'schedulingType': 'automatic', 'mode': 'customScheduled', 'dueAt': item['publicar_em'], 'assets': assets}
        # Campos conferidos por introspecção do GraphQL do Buffer em 26/09/2026.
        if rede == 'instagram':
            entrada['metadata'] = {'instagram': {'type': 'reel' if video else 'post', 'shouldShareToFeed': True}}
        elif rede == 'youtube':
            entrada['metadata'] = {'youtube': {'title': (titulo_video or item['titulo'])[:95], 'privacy': 'public', 'categoryId': '25', 'madeForKids': False, 'notifySubscribers': True}}
        elif rede == 'tiktok':
            entrada['metadata'] = {'tiktok': {'title': item['titulo'][:90]}}
        try:
            d = buffer_gql('mutation P($i: CreatePostInput!) { createPost(input: $i) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }', {'i': entrada})['createPost']
            if d.get('message'):
                erros.append(f'{rede}: {d["message"]}')
            else:
                item['buffer'].append({'rede': rede, 'id': d['post']['id']})
        except Exception as e:
            erros.append(f'{rede}: {e}')
    item['status'] = 'pre-aprovada' if item['buffer'] else 'pendente'
    if erros:
        item['erro_buffer'] = ' | '.join(erros)
        print('Buffer:', item['id'], item['erro_buffer'])


def roteiro_uf(x):
    return [
        f"Faltam {FALTAM} dias. Quem vai representar {x['nome']} na Câmara pelos próximos quatro anos?",
        f"São {x['fed']} candidatos a deputado federal para {x['vagas_fed']} vagas.",
        f"{x['mulheres_pct']} por cento das candidaturas são de mulheres.",
        f"A idade média é de {x['idade_media']} anos.",
        f"{x['reeleicao']} deputados federais do estado tentam a reeleição.",
        "Conhecer antes ou reclamar depois? Siga o VotoCheck e mande este vídeo para quem ainda não decidiu.",
    ]


async def render(htmls, pasta, prefixo):
    from playwright.async_api import async_playwright
    os.makedirs(pasta, exist_ok=True)
    for f in ('base.css', 'logo_h_branco.png'):
        shutil.copy(os.path.join(AQUI, f), pasta)
    saidas = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, h in enumerate(htmls, 1):
            hp = os.path.join(pasta, f'{prefixo}_{i:02d}.html')
            open(hp, 'w').write(h)
            await pg.goto('file://' + hp)
            await pg.wait_for_load_state('networkidle')
            await pg.wait_for_timeout(250)
            out = os.path.join(pasta, f'{prefixo}_{i:02d}.png')
            await pg.screenshot(path=out)
            saidas.append(out)
        await b.close()
    return saidas


def _kv_get(chave):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/values/{urllib.parse.quote(chave, safe="")}', headers={'Authorization': 'Bearer ' + TOK})
    try:
        return urllib.request.urlopen(req, timeout=60).read()
    except urllib.error.HTTPError:
        return None


def _kv_put(chave, dados, ttl=60 * 60 * 24 * 90):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/values/{urllib.parse.quote(chave, safe="")}?expiration_ttl={ttl}', method='PUT', data=dados, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/octet-stream'})
    try:
        urllib.request.urlopen(req, timeout=60)
    except Exception as e:
        print('cache TTS: falha ao gravar', e)


# Narração (26/09/2026): voz e velocidade configuráveis. O cache guarda o áudio original da voz;
# a aceleração é aplicada depois (ffmpeg atempo, sem mudar o tom), então trocar a velocidade não
# gera custo novo de Gemini.
VOZ = os.environ.get('NARRACAO_VOZ', 'Charon')
TEMPO = float(os.environ.get('NARRACAO_TEMPO', '1.12'))


def _acelerar(saida):
    if abs(TEMPO - 1.0) < 0.01:
        return
    tmp = saida + '.tmp.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', saida, '-filter:a', f'atempo={TEMPO}', tmp], check=True)
    os.replace(tmp, saida)


def tts(texto, saida):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        return False
    # Cache de narração (26/09/2026): a mesma frase com a mesma voz nunca é gerada duas vezes.
    # O fechamento é igual todo dia e as frases de cada estado se repetem no rodízio.
    chave = 'tts:' + hashlib.sha1((f'gemini-3.8-flash-tts|{VOZ}|' + texto).encode()).hexdigest()
    guardado = _kv_get(chave)
    if guardado:
        open(saida, 'wb').write(guardado)
        _acelerar(saida)
        return True
    body = {"contents": [{"parts": [{"text": texto}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}}}}
    for tent in range(6):
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent', data=json.dumps(body).encode(), headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120))
            part = r['candidates'][0]['content']['parts'][0]['inlineData']
            raw = base64.b64decode(part['data'])
            if 'wav' in part.get('mimeType', ''):
                open(saida, 'wb').write(raw)
            else:
                with wave.open(saida, 'wb') as w:
                    w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
            _kv_put(chave, open(saida, 'rb').read())
            _acelerar(saida)
            time.sleep(7)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(65); continue
            print('TTS erro', e.code, e.read()[:200]); return False
    return False


def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).strip())


def montar_reel(pngs, roteiro, pasta, nome):
    from PIL import Image, ImageDraw, ImageFont
    frames = []
    try:
        ft = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
        ftb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
    except Exception:
        ft = ftb = ImageFont.load_default()
    logo = Image.open(os.path.join(AQUI, 'logo_h_branco.png')).convert('RGBA')
    logo = logo.resize((int(logo.width * 80 / logo.height), 80))
    narrado = bool(os.environ.get('GEMINI_API_KEY'))
    for f in pngs:
        c = Image.new('RGB', (1080, 1920), (10, 20, 64))
        c.paste(Image.open(f).convert('RGB'), (0, 285))
        c.paste(logo, ((1080 - logo.width) // 2, 120), logo)
        d = ImageDraw.Draw(c)
        t = 'votocheck.com.br · @votocheck'
        d.text(((1080 - d.textlength(t, font=ftb)) / 2, 1720), t, fill=(158, 192, 255), font=ftb)
        if narrado:
            t2 = 'Narração gerada por IA'
            d.text(((1080 - d.textlength(t2, font=ft)) / 2, 1800), t2, fill=(111, 125, 181), font=ft)
        fr = f.replace('.png', '_v.png'); c.save(fr); frames.append(fr)
    audios = []
    if narrado:
        for i, linha in enumerate(roteiro):
            a = os.path.join(pasta, f'{nome}_a{i:02d}.wav')
            if tts(linha, a):
                audios.append(a)
            else:
                audios = []; break
    X = 0.4
    duracoes = [max(3.0, dur(a) + 0.6) for a in audios] if len(audios) == len(frames) else [3.2] * len(frames)
    inp = []
    for fr, dd in zip(frames, duracoes):
        inp += ['-loop', '1', '-t', f'{dd + X:.2f}', '-i', fr]
    fc, prev, off, starts = [], '[0:v]', 0, [0]
    for i in range(1, len(frames)):
        off += duracoes[i - 1]
        fc.append(f'{prev}[{i}:v]xfade=transition=slideleft:duration={X}:offset={off:.2f}[v{i}]')
        prev = f'[v{i}]'; starts.append(off)
    saida = os.path.join(pasta, f'{nome}_reel.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + inp
    if audios and len(audios) == len(frames):
        for a in audios:
            cmd += ['-i', a]
        n = len(frames); mix = []
        for i in range(n):
            ms = int((starts[i] + 0.25) * 1000)
            fc.append(f'[{n + i}:a]adelay={ms}|{ms},apad[a{i}]'); mix.append(f'[a{i}]')
        fc.append(''.join(mix) + f'amix=inputs={n}:normalize=0,atrim=0:{sum(duracoes) + X:.2f},loudnorm=I=-16:TP=-1.5[aout]')
        cmd += ['-filter_complex', ';'.join(fc), '-map', prev, '-map', '[aout]', '-c:a', 'aac', '-b:a', '160k', '-shortest']
    else:
        cmd += ['-filter_complex', ';'.join(fc), '-map', prev]
    cmd += ['-r', '30', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '21', '-movflags', '+faststart', saida]
    subprocess.run(cmd, check=True)
    return saida


def kv_put_bulk(itens):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/bulk', method='PUT', data=json.dumps(itens).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    assert r.get('success'), r


def email(pauta):
    key = os.environ.get('RESEND_API_KEY'); tok = os.environ.get('ADMIN_TOKEN')
    if not key or not tok:
        print('sem RESEND_API_KEY/ADMIN_TOKEN: e-mail não enviado'); return
    link = f'https://votocheck.com.br/admin/pauta?d={HOJE}&t={tok}'
    def hora(i):
        if not i.get('publicar_em'): return 'publicação manual'
        t = datetime.datetime.strptime(i['publicar_em'][:16], '%Y-%m-%dT%H:%M') - datetime.timedelta(hours=3)
        return f"sai às {t:%H:%M} em {', '.join(b['rede'] for b in i.get('buffer', []))}"
    itens = ''.join(f"<li><b>{i['titulo']}</b> <small>({i['tipo']} · {hora(i)})</small></li>" for i in pauta['itens'])
    auto = any(i.get('buffer') for i in pauta['itens'])
    html = f"""<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="color:#0A1440">Pauta do dia {HOJE[8:10]}/{HOJE[5:7]}: {len(pauta['itens'])} peças {'já agendadas' if auto else 'para publicar'}</h2>
<ul>{itens}</ul>
<p><a href="{link}" style="display:inline-block;background:#0059F5;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Ver e recusar o que não quiser</a></p>
<p style="color:#5B6478;font-size:13px">{'As peças saem sozinhas no horário, pelo Buffer, se você não recusar. Facebook sai espelhado do Instagram.' if auto else 'O Buffer não está configurado: baixe as peças e publique manualmente.'} Nunca impulsione peça que cite candidato.</p></div>"""
    body = {'from': 'VotoCheck <naoresponda@updates.votocheck.com.br>', 'to': [os.environ.get('EMAIL_PARA', 'votocheck@gmail.com')], 'subject': f'VotoCheck · pauta de {HOJE[8:10]}/{HOJE[5:7]} ({len(pauta["itens"])} peças' + (', já agendadas)' if auto else ')'), 'html': html}
    # User-Agent explícito: a Resend (atrás da Cloudflare) recusa com 403 o agente padrão "Python-urllib".
    req = urllib.request.Request('https://api.resend.com/emails', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'VotoCheck-fabrica/1.0 (+https://votocheck.com.br)'})
    print('e-mail:', urllib.request.urlopen(req, timeout=60).status)


def main():
    if HOJE in SEM_PECAS:
        print('Véspera/dia de votação: nenhuma peça automática.'); return
    if FALTAM < 0:
        # Depois do 1º turno o Raio-X de deputados perde o sentido. A pauta do 2º turno depende do
        # resultado oficial (quem foi para o 2º turno) e entra como um bloco novo da fábrica.
        print('1º turno encerrado: Raio-X desligado até a pauta do 2º turno ser ativada.'); return
    pasta = os.path.join(AQUI, 'saida', HOJE)
    os.makedirs(pasta, exist_ok=True)
    pauta = {'data': HOJE, 'gerado_em': datetime.datetime.utcnow().isoformat() + 'Z', 'itens': []}
    uploads = []
    for k, uf in enumerate(ufs_do_dia()):
        x = dados_uf(uf)
        pngs = asyncio.run(render(slides_uf(x), pasta, f'raiox_{uf}'))
        arquivos = [os.path.basename(p) for p in pngs]
        if k == 0:
            reel = montar_reel(pngs, roteiro_uf(x), pasta, f'raiox_{uf}')
            arquivos.append(os.path.basename(reel))
        for a in arquivos:
            uploads.append({'key': f's:{HOJE}/{a}', 'value': base64.b64encode(open(os.path.join(pasta, a), 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 21})
        if k == 0:
            try:
                xd = dados_dinheiro(uf)
                cargos = [c for c in CARGOS_RANK if (c[0] == 6) == (uf == 'DF')]
                ranks = [(nome_c, top_dinheiro(uf, cid)) for cid, nome_c in cargos]
                ranks = [r for r in ranks if r[1]]
                pngs_d = asyncio.run(render(slides_ranking(xd, ranks), pasta, f'ranking_{uf}'))
                arq_d = [os.path.basename(p) for p in pngs_d]
                for a in arq_d:
                    uploads.append({'key': f's:{HOJE}/{a}', 'value': base64.b64encode(open(os.path.join(pasta, a), 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 21})
                # Prioridade: entra no topo da pauta, no melhor horário.
                pauta['itens'].insert(0, {'id': f'ranking_{uf}', 'tipo': 'carrossel · PRIORIDADE', 'titulo': f"Quem mais recebeu dinheiro público {xd['prep']} {xd['nome']}",
                    'redes': ['Instagram', 'TikTok'], 'horario': '12h', 'arquivos': arq_d, 'legenda': legenda_ranking(xd, ranks), 'dados': xd, 'status': 'pendente'})
            except Exception as e:
                print('ranking dinheiro: falhou', e)
        pauta['itens'].append({
            'id': f'raiox_{uf}', 'tipo': 'carrossel' + (' + reel' if k == 0 else ''), 'titulo': f"Raio-X da eleição {x['prep']} {x['nome']}",
            'redes': ['Instagram', 'TikTok'] + (['YouTube Shorts'] if k == 0 else []), 'horario': ['12h', '18h', '20h'][k % 3],
            'arquivos': arquivos, 'legenda': legenda_uf(x), 'dados': x, 'status': 'pendente',
        })
    for i in range(0, len(uploads), 50):
        kv_put_bulk(uploads[i:i + 50])
    # Agendamento no Buffer depois do upload (o Buffer busca a mídia pela URL pública /midia/...).
    if BUFFER_KEY:
        try:
            canais = buffer_canais()
            print('Buffer: canais', sorted(canais))
            for n, item in enumerate(pauta['itens']):
                if item['id'].startswith('ranking_'):
                    buffer_agendar(item, canais, ['instagram', 'tiktok'], item['arquivos'], '12:00')
                elif 'reel' in item['tipo']:
                    reel = [a for a in item['arquivos'] if a.endswith('.mp4')]
                    buffer_agendar(item, canais, ['instagram', 'tiktok', 'youtube'], reel, '18:00', titulo_video=item['titulo'] + ' #shorts')
                else:
                    buffer_agendar(item, canais, ['instagram'], item['arquivos'], ['20:00', '21:30', '21:45'][min(n, 2)])
        except Exception as e:
            print('Buffer indisponível, pauta fica para publicação manual:', e)

    kv_put_bulk([{'key': f'pauta:{HOJE}', 'value': json.dumps(pauta, ensure_ascii=False), 'expiration_ttl': 60 * 60 * 24 * 60}])
    print(json.dumps({'data': HOJE, 'itens': [i['id'] for i in pauta['itens']]}))
    email(pauta)


if __name__ == '__main__':
    try:
        main()
    finally:
        # Monitor de uso da Cloudflare roda junto, todo dia (e-mail só com alerta ou às segundas).
        subprocess.run([sys.executable, os.path.join(AQUI, 'monitor_uso.py')])
