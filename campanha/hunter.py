"""VotoCheck — lote hunter 1 (12/10/2026): peças com gancho + fato + CTA de ação, pelo playbook.
Gera em png/ e video/: (1) Reels 7 s "quanto custou seu voto"; (2) carrossel "quem depende da sua cidade"
(exemplo real: Recife); (3) carrossel "5 jeitos de cobrar seu deputado"; (4) estático da cota parlamentar.
Saída: serie_hunter.json (arquivos + legenda + 1º comentário) e respostas_custo_voto.txt (respostas prontas).
Dados: D1 (TSE: financiamento × 1º turno; voto por município; cota parlamentar da Câmara). Neutro: só fato, todos os partidos."""
import asyncio, base64, json, os, subprocess, sys, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from d1 import q
from playwright.async_api import async_playwright

NOMES = {'AC':'Acre','AL':'Alagoas','AP':'Amapá','AM':'Amazonas','BA':'Bahia','CE':'Ceará','DF':'Distrito Federal','ES':'Espírito Santo','GO':'Goiás','MA':'Maranhão','MT':'Mato Grosso','MS':'Mato Grosso do Sul','MG':'Minas Gerais','PA':'Pará','PB':'Paraíba','PR':'Paraná','PE':'Pernambuco','PI':'Piauí','RJ':'Rio de Janeiro','RN':'Rio Grande do Norte','RS':'Rio Grande do Sul','RO':'Rondônia','RR':'Roraima','SC':'Santa Catarina','SP':'São Paulo','SE':'Sergipe','TO':'Tocantins'}
EM = {'AC':'No','AL':'Em','AP':'No','AM':'No','BA':'Na','CE':'No','DF':'No','ES':'No','GO':'Em','MA':'No','MT':'No','MS':'No','MG':'Em','PA':'No','PB':'Na','PR':'No','PE':'Em','PI':'No','RJ':'No','RN':'No','RS':'No','RO':'Em','RR':'Em','SC':'Em','SP':'Em','SE':'Em','TO':'No'}
MINUS = {'de', 'da', 'do', 'das', 'dos', 'e'}
def nome(t): return ' '.join(w if (i and w in MINUS) else w[:1].upper() + w[1:] for i, w in enumerate((t or '').lower().split()))
def br(v, d=2): return f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
def num(n): return f'{int(n):,}'.replace(',', '.')

EXTRA = '''
body.reel{height:1920px}.reel .s{padding:220px 84px 260px}
.mega{font-family:"Plus Jakarta Sans";font-weight:800;letter-spacing:-.05em;line-height:.95}
.duo2{display:grid;gap:26px;margin-top:40px}.duo2 div{display:flex;justify-content:space-between;align-items:baseline;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);border-radius:30px;padding:34px 40px}
.duo2 span{font-size:46px;color:#C3CDF0}.duo2 b{font:800 92px "Plus Jakarta Sans";letter-spacing:-.03em}
.seta{font:800 160px "Plus Jakarta Sans";color:#3FE0C0;line-height:1}
.pessoa{display:flex;gap:28px;align-items:center;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.1);border-radius:28px;padding:22px 26px;margin-bottom:16px}
.pessoa b{font-family:"Plus Jakarta Sans";font-size:42px;display:block;line-height:1.1}.pessoa small{font-size:27px;color:#9AA7D6}
.pessoa .v{margin-left:auto;text-align:right;font:800 58px "Plus Jakarta Sans";color:#3FE0C0;white-space:nowrap}.pessoa .v span{display:block;font:600 22px Inter;color:#9AA7D6}
.dica{display:grid;grid-template-columns:110px 1fr;gap:30px;align-items:start}.dica .n{font:800 120px "Plus Jakarta Sans";color:#3FE0C0;line-height:.9}
.dica p{font-size:60px;line-height:1.2;font-family:"Plus Jakarta Sans";font-weight:700}
'''
def rod(f): return f'<div class="rod"><div class="fonte">{f}</div><img src="logo_h_branco.png"></div>'
def page(b, reel=False): return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{EXTRA}</style></head><body class="{"reel" if reel else ""}"><div class="s">{b}</div></body></html>'

FOTOS = {}
def foto(url):
    if not url: return None
    if url not in FOTOS:
        try:
            u = url if url.startswith('http') else 'https://votocheck.com.br' + url
            FOTOS[url] = 'data:image/jpeg;base64,' + base64.b64encode(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'VotoCheck-social/1.0'}), timeout=20).read()).decode()
        except Exception:
            FOTOS[url] = None
    return FOTOS[url]
def avatar(url, ini, tam=120):
    f = foto(url)
    inner = f'<img src="{f}" style="width:100%;height:100%;object-fit:cover">' if f else ini
    return f'<div style="flex:none;width:{tam}px;height:{tam}px;border-radius:{tam//4}px;overflow:hidden;background:rgba(255,255,255,.1);display:grid;place-items:center;font:800 48px \'Plus Jakarta Sans\';color:#BFD2FF">{inner}</div>'

# ---------- dados ----------
r = q("""SELECT c.sg_uf uf, SUM(f.fefc+f.fundo_partidario) pub, SUM(c.votos_t1) votos FROM financiamento_campanha f JOIN candidatura c ON c.id=f.candidatura_id
         JOIN cargo ca ON ca.id=c.cargo_id WHERE ca.slug='deputado_federal' AND c.ano_eleicao=2026 AND c.eleito=1 GROUP BY c.sg_uf""")
cpv = sorted([dict(uf=x['uf'], v=x['pub'] / x['votos']) for x in r if x['votos']], key=lambda y: -y['v'])
alto, baixo = cpv[0], cpv[-1]
F_FUNDO = 'Fonte: TSE · prestação de contas parcial (receitas até 26/09/2026) e resultado do 1º turno · deputados federais eleitos'

mun = q("SELECT cd_tse FROM municipio_tse WHERE uf='PE' AND nome='RECIFE'")[0]['cd_tse']
rec = q("""SELECT p.nome_urna_atual n, pa.sigla s, v.votos, v.pct_cand pc, p.foto_url f FROM voto_municipio_2026 v
           JOIN candidatura c ON c.ano_eleicao=2026 AND c.sq_candidato_tse=v.sq JOIN pessoa p ON p.id=c.pessoa_id LEFT JOIN partido pa ON pa.id=c.partido_id
           WHERE v.cd_tse=? AND v.cargo='deputado_federal' AND c.eleito=1 ORDER BY v.pct_cand DESC LIMIT 3""", [mun])
F_MUN = 'Fonte: TSE · votos por município, 1º turno de 2026 · deputados federais eleitos'

cota = q("SELECT SUM(divulgacao) div, SUM(total) tot, MAX(atualizado_em) at FROM cota_resumo WHERE ano=2026")[0]
meses = [0.0] * 12
for x in q("SELECT divulgacao_mes m FROM cota_resumo WHERE ano=2026"):
    for i, v in enumerate(json.loads(x['m'] or '[]')): meses[i] += v
F_COTA = f'Fonte: Câmara dos Deputados · cota parlamentar (CEAP) 2026, dados de {cota["at"][8:10]}/{cota["at"][5:7]}/{cota["at"][:4]} · Ato da Mesa 43/2009'

pecas = {}
# (1) Reels 7 s — 3 quadros 1080x1920
reel = [
    page(f'''<div class="eyebrow">Seu voto para deputado federal</div><div class="mega" style="font-size:150px">Seu voto<br>custou</div>
<div class="mega" style="font-size:300px;margin-top:20px"><em>R$ {round(alto["v"])}</em></div><p class="lead" style="margin-top:40px">de dinheiro público. {EM[alto["uf"]]} {NOMES[alto["uf"]]}.</p>{rod(F_FUNDO)}''', True),
    page(f'''<div class="eyebrow">Dinheiro público por voto · deputado eleito</div><h2 style="font-size:96px">Cada estado,<br>um preço.</h2>
<div class="duo2"><div><span>{NOMES[alto["uf"]]}</span><b>R$ {br(alto["v"])}</b></div><div><span>{NOMES[baixo["uf"]]}</span><b>R$ {br(baixo["v"])}</b></div></div>{rod(F_FUNDO)}''', True),
    page(f'''<div class="mega" style="font-size:150px">E no<br><em>seu estado?</em></div><p class="lead" style="margin-top:50px;font-size:58px">Comente a sigla.<br>Eu respondo com o número.</p>
<div class="seta" style="margin-top:60px">↓</div>{rod('@votocheck · fatos com fonte, sem partido')}''', True),
]
pecas['custo_voto'] = dict(html=reel, reel=True,
    legenda=(f'{EM[alto["uf"]]} {NOMES[alto["uf"]]}, cada voto de deputado federal eleito custou R$ {br(alto["v"])} de dinheiro público. {EM[baixo["uf"]]} {NOMES[baixo["uf"]]}, R$ {br(baixo["v"])}.\n\n'
             'E no seu estado? Comente a sigla (SP, BA, RS...) que eu respondo com o número.\n\n'
             'É o fundo eleitoral e partidário que os deputados eleitos declararam ao TSE, dividido pelos votos que tiveram.\n'
             'Dados: TSE, prestação de contas parcial (até 26/09/2026) e 1º turno.\n#fundoeleitoral #eleicoes2026 #dinheiropublico #votocheck'),
    comentario='Os 27 estados estão em votocheck.com.br/dinheiro-publico (link na bio). Comente a sigla do seu que eu respondo aqui.',
    titulo='Quanto custou seu voto?')

# (2) carrossel: quem depende da sua cidade (Recife)
pes = ''.join(f'<div class="pessoa">{avatar(x["f"], nome(x["n"])[:1])}<div><b>{nome(x["n"])}</b><small>{x["s"]} · {num(x["votos"])} votos em Recife</small></div><div class="v">{br(x["pc"],0)}%<span>da própria votação</span></div></div>' for x in rec)
pecas['cidade'] = dict(html=[
    page(f'''<div class="eyebrow">Deputados federais eleitos em 2026</div><h1 style="font-size:92px">Quais deputados<br><em>dependem dos<br>votos da sua<br>cidade?</em></h1>
<p class="lead" style="margin-top:40px">Dá para saber pelo CEP. Arrasta →</p>{rod('@votocheck · fatos com fonte, sem partido')}'''),
    page(f'''<div class="pag">2/5</div><div class="eyebrow">Duas formas de olhar</div><h2 style="font-size:72px">Quem teve mais votos<br>na sua cidade, e <em>quem<br>tirou dela a maior parte<br>dos próprios votos.</em></h2>
<p class="lead" style="font-size:38px">No segundo grupo está quem tem na sua cidade a maior parte da própria base eleitoral.</p>{rod(F_MUN)}'''),
    page(f'''<div class="pag">3/5</div><div class="eyebrow">Exemplo real · Recife</div><h2 style="font-size:66px">Eleitos que tiraram<br>de Recife a maior parte<br>dos próprios votos</h2>{pes}{rod(F_MUN)}'''),
    page(f'''<div class="pag">4/5</div><div class="eyebrow">Por que isso importa</div><h2 style="font-size:76px">Quem depende<br>da sua cidade tem<br><em>mais motivo para<br>te responder.</em></h2>
<p class="lead" style="font-size:38px">Salve os seus no site e tenha e-mail e telefone do gabinete à mão.</p>{rod('@votocheck')}'''),
    page(f'''<div class="pag">5/5</div><h2 style="font-size:80px">Descubra os<br>da <em>sua cidade.</em></h2><p class="lead">Digite o CEP. Leva 10 segundos.</p>
<div style="margin-top:44px"><span class="btn">votocheck.com.br</span></div><p class="lead" style="margin-top:40px;font-size:36px">Salve e mande no grupo da sua cidade.</p>{rod('@votocheck · fatos com fonte, sem partido')}'''),
], legenda=('Quais deputados dependem dos votos da sua cidade?\n\nEm Recife, ' + ', '.join(f'{nome(x["n"])} ({x["s"]}) tirou da cidade {br(x["pc"],0)}% dos próprios votos' for x in rec) + '.\n\n'
            'Digite seu CEP em votocheck.com.br (link na bio) e veja os da sua cidade, com perfil e contatos.\n\n'
            'Salve e mande no grupo da sua cidade.\nDados: TSE, votos por município, 1º turno de 2026.\n#eleitos2026 #deputadofederal #votocheck'),
    comentario='Comente "CEP" que eu mando o link direto para a sua cidade.', titulo='Quem depende da sua cidade?')

# (3) carrossel: 5 jeitos de cobrar
dicas = [('E-mail de deputado federal segue o padrão <em>dep.nome@camara.leg.br</em>.', 'Fonte: Câmara dos Deputados, dados abertos'),
         ('Cite o número do projeto. Pedido específico é <em>mais difícil de ignorar.</em>', 'O número fica na página de cada projeto, no site da Câmara'),
         ('Toda votação nominal mostra <em>como cada deputado votou.</em> É público.', 'Fonte: Câmara dos Deputados, votações nominais'),
         ('Cada gasto da cota tem <em>nota fiscal aberta</em>, com o fornecedor.', 'Fonte: Câmara dos Deputados, cota parlamentar (CEAP)'),
         ('Pela Lei de Acesso à Informação, o órgão tem <em>20 dias</em> para responder.', 'Fonte: Lei 12.527/2011, art. 11 (prorrogável por mais 10)')]
cob = [page(f'''<div class="eyebrow">Guia rápido · salve</div><h1 style="font-size:104px">5 jeitos de<br><em>cobrar seu<br>deputado</em><br>que quase<br>ninguém usa.</h1>{rod('@votocheck · fatos com fonte, sem partido')}''')]
for i, (t, f) in enumerate(dicas, 1):
    cob.append(page(f'''<div class="pag">{i+1}/7</div><div class="dica"><div class="n">{i}</div><p>{t}</p></div>{rod(f)}'''))
cob.append(page(f'''<div class="pag">7/7</div><h2 style="font-size:80px">Seus deputados,<br><em>com e-mail e<br>telefone.</em></h2><p class="lead">Salve até 3 de cada cargo em Meus representantes.</p>
<div style="margin-top:44px"><span class="btn">votocheck.com.br</span></div><p class="lead" style="margin-top:40px;font-size:36px">Salve este post para usar quando precisar.</p>{rod('@votocheck')}'''))
pecas['cobrar'] = dict(html=cob, legenda=('5 jeitos de cobrar seu deputado que quase ninguém usa. Salve para quando precisar.\n\n'
    '1. E-mail oficial: dep.nome@camara.leg.br\n2. Cite o número do projeto\n3. Veja como ele votou: toda votação nominal é pública\n4. Confira os gastos: cada nota fiscal da cota é aberta\n5. Lei de Acesso à Informação: 20 dias para responder\n\n'
    'Seus deputados com e-mail e telefone: votocheck.com.br/meus-representantes (link na bio).\n#cidadania #deputadofederal #transparencia #votocheck'),
    comentario='Qual desses você já usou? Conta aqui.', titulo='5 jeitos de cobrar seu deputado')

# (4) estático: cota
pecas['cota'] = dict(html=[page(f'''<div class="eyebrow">Cota parlamentar · Câmara dos Deputados</div><div class="mega" style="font-size:170px"><em>R$ {br(cota["div"]/1e6,1)}<br>milhões.</em></div>
<p class="lead" style="margin-top:40px;font-size:50px;color:#fff">Foi quanto a Câmara reembolsou a deputados federais para divulgar o próprio mandato em 2026.</p>
<p class="lead" style="margin-top:28px;font-size:36px">Maio foi o recorde: R$ {br(max(meses)/1e6,1)} milhões. Em junho, a regra proibiu para quem era candidato.</p>{rod(F_COTA)}''')],
    legenda=(f'R$ {br(cota["div"]/1e6,1)} milhões da cota parlamentar pagaram a divulgação do mandato de deputados federais em 2026: posts patrocinados, vídeos, gráfica e anúncios.\n\n'
             f'É permitido. Mas a regra da Câmara proíbe para quem é candidato nos 120 dias antes da eleição. Resultado: maio teve o recorde do ano (R$ {br(max(meses)/1e6,1)} mi) e junho caiu para R$ {br(meses[5]/1e6,1)} mi.\n\n'
             'Quanto o deputado do seu estado gastou: votocheck.com.br/dinheiro-publico/cota (link na bio).\n\n'
             'Manda para quem reclama de post de político no feed.\nDados: Câmara dos Deputados, cota parlamentar 2026.\n#cotaparlamentar #dinheiropublico #deputadofederal #votocheck'),
    comentario='Escreve o nome do seu deputado que eu respondo quanto ele gastou com divulgação.', titulo='R$ 51 milhões em divulgação')

# ---------- render ----------
async def render():
    os.makedirs('png', exist_ok=True); os.makedirs('video', exist_ok=True)
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME'))
        for chave, pc in pecas.items():
            alt = 1920 if pc.get('reel') else 1350
            pg = await b.new_page(viewport={'width': 1080, 'height': alt})
            arqs = []
            for i, h in enumerate(pc['html'], 1):
                n = f'hunter_{chave}_{i:02d}'; open(f'{n}.html', 'w', encoding='utf-8').write(h)
                await pg.goto('file://' + os.path.abspath(f'{n}.html')); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'png/{n}.png'); arqs.append(f'png/{n}.png')
            await pg.close()
            item = {k: v for k, v in pc.items() if k not in ('html',)}
            if pc.get('reel'):
                durs = [2.3, 2.6, 2.1]
                lista = 'video/lista.txt'
                with open(lista, 'w') as f:
                    for a, d in zip(arqs, durs): f.write(f"file '../{a}'\nduration {d}\n")
                    f.write(f"file '../{arqs[-1]}'\n")
                mp4 = f'video/hunter_{chave}.mp4'
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                                '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-shortest', '-t', '7', '-movflags', '+faststart', mp4], check=True)
                item['video'] = mp4; item['capa'] = arqs[0]
            item['arquivos'] = arqs
            out[chave] = item
        await b.close()
    return out

serie = asyncio.run(render())
json.dump(serie, open('serie_hunter.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open('respostas_custo_voto.txt', 'w', encoding='utf-8') as f:
    f.write('Respostas prontas para os comentários do Reels "Quanto custou seu voto" (copie e cole):\n\n')
    for x in sorted(cpv, key=lambda y: NOMES[y['uf']]):
        f.write(f'{x["uf"]}: {EM[x["uf"]]} {NOMES[x["uf"]]}, cada voto de deputado federal eleito custou R$ {br(x["v"])} de dinheiro público (TSE, até 26/09). Todos os estados: votocheck.com.br/dinheiro-publico\n')
print('ok', {k: len(v['arquivos']) for k, v in serie.items()}, alto, baixo, [x['n'] for x in rec], round(cota['div']))
