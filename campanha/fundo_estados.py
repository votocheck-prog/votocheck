"""VotoCheck — fundo eleitoral por estado (08/10/2026): custo em dinheiro público por voto dos deputados federais eleitos.
Dados: D1 (financiamento_campanha × resultado 1º turno, TSE). Saída: png/fundo_02_XX.png + serie_fundo2.json"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from d1 import q
from playwright.async_api import async_playwright
NOMES = {'AC':'Acre','AL':'Alagoas','AP':'Amapá','AM':'Amazonas','BA':'Bahia','CE':'Ceará','DF':'Distrito Federal','ES':'Espírito Santo','GO':'Goiás','MA':'Maranhão','MT':'Mato Grosso','MS':'Mato Grosso do Sul','MG':'Minas Gerais','PA':'Pará','PB':'Paraíba','PR':'Paraná','PE':'Pernambuco','PI':'Piauí','RJ':'Rio de Janeiro','RN':'Rio Grande do Norte','RS':'Rio Grande do Sul','RO':'Rondônia','RR':'Roraima','SC':'Santa Catarina','SP':'São Paulo','SE':'Sergipe','TO':'Tocantins'}
ART = {'AC':'No','AL':'Em','AP':'No','AM':'No','BA':'Na','CE':'No','DF':'No','ES':'No','GO':'Em','MA':'No','MT':'No','MS':'No','MG':'Em','PA':'No','PB':'Na','PR':'No','PE':'Em','PI':'No','RJ':'No','RN':'No','RS':'No','RO':'Em','RR':'Em','SC':'Em','SP':'Em','SE':'Em','TO':'No'}
r = q("""SELECT c.sg_uf uf, COUNT(*) n, SUM(f.fefc+f.fundo_partidario) pub, SUM(c.votos_t1) votos FROM financiamento_campanha f JOIN candidatura c ON c.id=f.candidatura_id JOIN cargo ca ON ca.id=c.cargo_id WHERE c.ano_eleicao=2026 AND c.eleito=1 AND ca.slug='deputado_federal' GROUP BY 1""")
rows = sorted([dict(uf=x['uf'], n=x['n'], media=x['pub']/x['n'], cpv=x['pub']/x['votos']) for x in r], key=lambda y: -y['cpv'])
def br(v, d=2): return f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
F = 'Fonte: TSE, prestação de contas parcial (receitas até 26/09/2026) e resultado do 1º turno · deputados federais eleitos'
CSS = '''.row{display:grid;grid-template-columns:330px 1fr 150px;gap:18px;align-items:center;font-size:29px;margin-bottom:9px}.row b{font:800 31px "Plus Jakarta Sans";text-align:right}
.row .t{height:20px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.row .t i{display:block;height:100%;border-radius:99px;background:#FFB067}
.chip-pos{display:inline-block;font:800 24px Inter;letter-spacing:.08em;text-transform:uppercase;color:#0A1440;background:#FFB067;border-radius:999px;padding:10px 22px;margin-bottom:34px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0 36px}.duo div{background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.1);border-radius:28px;padding:30px}
.duo small{display:block;font-size:30px;color:#9AA7D6;margin-bottom:10px}.duo b{font:800 76px "Plus Jakarta Sans";letter-spacing:-.03em;white-space:nowrap}.duo span{display:block;font-size:26px;color:#9AA7D6;margin-top:6px}'''
def rod(f): return f'<div class="rod"><div class="fonte">{f}</div><img src="logo_h_branco.png"></div>'
def page(b): return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{CSS}</style></head><body><div class="s">{b}</div></body></html>'
a, z = rows[0], rows[-1]; mx = a['cpv']; T = 5
def tabela(itens, pag):
    linhas = ''.join(f'<div class="row"><span>{NOMES[x["uf"]]}</span><span class="t"><i style="width:{100*x["cpv"]/mx:.1f}%"></i></span><b>R$ {br(x["cpv"])}</b></div>' for x in itens)
    return page(f'<div class="pag">{pag}/{T}</div><h2 style="font-size:58px;margin-bottom:26px">Dinheiro público por voto<br>de deputado federal eleito</h2>{linhas}{rod(F)}')
s = [page(f'''<div><span class="chip-pos">Posição do VotoCheck</span></div><div class="eyebrow">Fundo eleitoral · por estado</div>
<h1 style="font-size:84px">{ART[a["uf"]]} {NOMES[a["uf"]]}, cada voto de deputado eleito custou <em>R$ {br(a["cpv"])}</em> de dinheiro público.</h1>
<p class="lead" style="margin-top:30px">{ART[z["uf"]]} {NOMES[z["uf"]]}, R$ {br(z["cpv"])}. Veja o seu estado. Arrasta →</p>{rod(F)}'''),
     tabela(rows[:14], 2), tabela(rows[14:], 3),
     page(f'''<div class="pag">4/{T}</div><div class="eyebrow">Por que a diferença</div><h2 style="font-size:66px">Cada eleito recebeu<br>quase o mesmo.<br><em>O que muda é o voto.</em></h2>
<div class="duo"><div><small>Média por eleito em {NOMES[a["uf"]]}</small><b>R$ {br(a["media"]/1e6,1)} mi</b><span>{a["n"]} deputados</span></div><div><small>Média por eleito em {NOMES[z["uf"]]}</small><b>R$ {br(z["media"]/1e6,1)} mi</b><span>{z["n"]} deputados</span></div></div>
<p class="lead" style="font-size:33px">Todo estado tem no mínimo 8 deputados, mesmo com poucos eleitores. Com valores de campanha parecidos e menos votos por vaga, o custo de cada voto sobe.</p>{rod(F + ' · Constituição, art. 45')}'''),
     page(f'''<div class="pag">5/{T}</div><div><span class="chip-pos">Posição do VotoCheck</span></div><h2>O valor do fundo<br><em>precisa ser revisto.</em></h2>
<p class="lead">Veja quanto o deputado do seu estado recebeu de dinheiro público e cobre quem vai votar o próximo fundo, em 2027.</p>
<div style="margin-top:40px"><span class="btn">votocheck.com.br/dinheiro-publico</span></div>
<p class="lead" style="margin-top:36px;font-size:32px">Salve e mande para quem é do seu estado.</p>{rod('Os dados do VotoCheck valem para todos, sem partido. A posição sobre o fundo está em votocheck.com.br/sobre')}''')]
leg = (f'{ART[a["uf"]]} {NOMES[a["uf"]]}, cada voto de deputado federal eleito custou R$ {br(a["cpv"])} de dinheiro público. {ART[z["uf"]]} {NOMES[z["uf"]]}, R$ {br(z["cpv"])}.\n\n'
       'No carrossel, os 27 estados: quanto do fundo eleitoral e partidário os deputados federais eleitos receberam, dividido pelos votos que tiveram. Cada eleito recebeu valores parecidos; o que muda é quantos votos cada vaga precisa.\n\n'
       'Posição do VotoCheck: o valor do fundo precisa ser revisto. Veja quanto o deputado do seu estado recebeu: votocheck.com.br/dinheiro-publico (link na bio).\n\n'
       'Dados: TSE, prestação de contas parcial (receitas até 26/09/2026) e resultado do 1º turno.\n#fundoeleitoral #eleicoes2026 #dinheiropublico #votocheck')
async def render():
    arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME')); pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, h in enumerate(s, 1):
            n = f'fundo_02_{i:02d}'; open(f'{n}.html', 'w', encoding='utf-8').write(h)
            await pg.goto('file://' + os.path.abspath(f'{n}.html')); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'png/{n}.png'); arqs.append(f'png/{n}.png')
        await b.close()
    return arqs
json.dump({'fundo_estados': {'arquivos': asyncio.run(render()), 'legenda': leg, 'link': '/dinheiro-publico', 'titulo': 'Quanto custou cada voto, por estado'}}, open('serie_fundo2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(a, z)
