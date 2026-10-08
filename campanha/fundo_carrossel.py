"""VotoCheck — "Posição do VotoCheck" · fundo eleitoral, carrossel 1 (08/10/2026).
Números: D1 (financiamento_campanha × resultado 1º turno, TSE) + LOA 2026 (imprensa: Poder360/CNN; SBPC para CNPq).
Uso: python fundo_carrossel.py  (precisa do d1.py no diretório pai e CHROME)"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from d1 import q
from playwright.async_api import async_playwright

def bi(v): return f'{v/1e9:.2f}'.replace('.', ',')
def mi(v): return f'{v/1e6:.0f}'
def num(n): return f'{n:,}'.replace(',', '.')
def reais(v): return f'{v:.2f}'.replace('.', ',')

r = q("""SELECT CASE WHEN c.eleito=1 THEN 'eleito' WHEN c.situacao_totalizacao_turno='2º turno' THEN '2t' WHEN c.votos_t1 IS NULL THEN 'sem' ELSE 'nao' END g, ca.slug cargo,
 SUM(f.fefc+f.fundo_partidario) pub, SUM(c.votos_t1) votos, COUNT(*) n FROM financiamento_campanha f JOIN candidatura c ON c.id=f.candidatura_id JOIN cargo ca ON ca.id=c.cargo_id WHERE c.ano_eleicao=2026 GROUP BY 1,2""")
tot = sum(x['pub'] for x in r); g = {}
for x in r: g[x['g']] = g.get(x['g'], 0) + x['pub']
d = {(x['g'], x['cargo']): x for x in r}
fe, fn = d[('eleito', 'deputado_federal')], d[('nao', 'deputado_federal')]
cpv_e, cpv_n = fe['pub'] / fe['votos'], fn['pub'] / fn['votos']
poucos = q("""SELECT COUNT(*) n, SUM(f.fefc+f.fundo_partidario) pub FROM financiamento_campanha f JOIN candidatura c ON c.id=f.candidatura_id WHERE c.ano_eleicao=2026 AND c.eleito=0 AND c.votos_t1 < 1000 AND (f.fefc+f.fundo_partidario) >= 100000""")[0]
pct_nao = round(100 * g['nao'] / tot)
D = dict(tot=tot, eleito=g['eleito'], nao=g['nao'], t2=g['2t'], pct_nao=pct_nao, cpv_e=cpv_e, cpv_n=cpv_n, poucos=poucos)
json.dump({k: (v if not isinstance(v, float) else round(v, 2)) for k, v in D.items()}, open('fundo_numeros.json', 'w'), indent=1, default=str)

F_TSE = 'Fonte: TSE, prestação de contas parcial (receitas até 26/09/2026) e resultado do 1º turno'
CSS = '''.chip-pos{display:inline-block;font:800 24px Inter;letter-spacing:.08em;text-transform:uppercase;color:#0A1440;background:#FFB067;border-radius:999px;padding:10px 22px;margin-bottom:34px}
.bar{margin-bottom:30px}.bar .l{display:flex;justify-content:space-between;font-size:34px;margin-bottom:12px}.bar .l b{font-family:"Plus Jakarta Sans";font-size:44px}
.bar .t{height:34px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.bar .t i{display:block;height:100%;border-radius:99px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0 36px}.duo div{background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.1);border-radius:28px;padding:30px}
.duo small{display:block;font-size:28px;color:#9AA7D6;margin-bottom:10px}.duo b{font:800 84px "Plus Jakarta Sans";letter-spacing:-.03em}.duo span{display:block;font-size:26px;color:#9AA7D6;margin-top:6px}'''
def rod(f): return f'<div class="rod"><div class="fonte">{f}</div><img src="logo_h_branco.png"></div>'
def page(b): return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{CSS}</style></head><body><div class="s">{b}</div></body></html>'
T = 6
s = []
s.append(page(f'''<div><span class="chip-pos">Posição do VotoCheck</span></div><div class="eyebrow">Dinheiro público nas campanhas de 2026</div>
<h1 style="font-size:98px">R$ {f'{tot/1e9:.1f}'.replace('.', ',')} bilhões.<br><em>{pct_nao}% foram para<br>quem não se elegeu.</em></h1>
<p class="lead" style="margin-top:36px">Fundo eleitoral + fundo partidário, pelo que os próprios candidatos declararam ao TSE. Arrasta →</p>{rod(F_TSE)}'''))
mx = max(g['nao'], g['eleito'])
barras = ''.join(f'<div class="bar"><div class="l"><span>{t}</span><b>R$ {bi(v)} bi · {round(100*v/tot)}%</b></div><div class="t"><i style="width:{100*v/mx:.1f}%;background:{c}"></i></div></div>' for t, v, c in [('Não se elegeram', g['nao'], '#FFB067'), ('Eleitos no 1º turno', g['eleito'], '#7FB0FF'), ('Ainda no 2º turno', g['2t'], 'rgba(255,255,255,.35)')])
s.append(page(f'''<div class="pag">2/{T}</div><h2 style="font-size:72px">Para onde foi<br>o dinheiro público</h2><div style="margin-top:20px">{barras}</div>
<p class="lead" style="font-size:32px">Total de R$ {bi(tot)} bilhões recebidos por candidatos a todos os cargos.</p>{rod(F_TSE)}'''))
s.append(page(f'''<div class="pag">3/{T}</div><div class="eyebrow">Deputado federal</div><h2 style="font-size:70px">Quanto custou<br>cada voto</h2>
<div class="duo"><div><small>Quem se elegeu</small><b>R$ {reais(cpv_e)}</b><span>por voto recebido</span></div><div><small>Quem não se elegeu</small><b style="color:#FFB067">R$ {reais(cpv_n)}</b><span>por voto recebido</span></div></div>
<p class="lead" style="font-size:34px">Os {num(fn['n'])} candidatos a deputado federal que perderam receberam R$ {bi(fn['pub'])} bi de dinheiro público. Os {num(fe['n'])} eleitos, R$ {bi(fe['pub'])} bi.</p>{rod(F_TSE)}'''))
s.append(page(f'''<div class="pag">4/{T}</div><div class="eyebrow">Um dado que pouca gente vê</div><div class="big" style="font-size:200px"><em>{num(poucos['n'])}</em></div>
<h2 style="margin-top:20px;font-size:62px">candidatos receberam pelo menos R$ 100 mil de dinheiro público e tiveram menos de 1.000 votos.</h2>
<p class="lead" style="font-size:36px">Somados: R$ {mi(poucos['pub'])} milhões. Nenhum deles se elegeu.</p>{rod(F_TSE)}'''))
s.append(page(f'''<div class="pag">5/{T}</div><div class="eyebrow">Quem decidiu o valor</div><h2 style="font-size:72px">O governo propôs<br>R$ 1 bilhão.<br><em>O Congresso aprovou<br>R$ 4,9 bilhões.</em></h2>
<p class="lead" style="font-size:36px">Só o fundo eleitoral de 2026 é quase 3 vezes o orçamento do CNPq no ano (R$ 1,64 bi), que paga as bolsas de pesquisa do país.</p>{rod('Fontes: LOA 2026 (Comissão Mista de Orçamento, set/2025; Poder360) · CNPq: LOA 2026, nota da SBPC (27/02/2026)')}'''))
s.append(page(f'''<div class="pag">6/{T}</div><div><span class="chip-pos">Posição do VotoCheck</span></div><h2>O valor do fundo<br><em>precisa ser revisto.</em></h2>
<p class="lead">Quem define é o Congresso, todo ano, no Orçamento. Em 2027, os eleitos de 2026 votam o fundo das eleições municipais de 2028. Veja quanto o seu deputado recebeu e cobre.</p>
<div style="margin-top:40px"><span class="btn">votocheck.com.br/dinheiro-publico</span></div>
<p class="lead" style="margin-top:36px;font-size:32px">Salve, mande para 3 pessoas e siga @votocheck.</p>{rod('Os dados do VotoCheck valem para todos, sem partido. A posição sobre o fundo está em votocheck.com.br/sobre')}'''))
leg = (f'R$ {f"{tot/1e9:.1f}".replace(".", ",")} bilhões de dinheiro público chegaram às campanhas de 2026. {pct_nao}% foram para quem não se elegeu.\n\n'
       f'No carrossel: para onde foi o fundo eleitoral e partidário, quanto custou cada voto de deputado federal (R$ {reais(cpv_e)} para quem se elegeu, R$ {reais(cpv_n)} para quem perdeu) '
       f'e os {num(poucos["n"])} candidatos que receberam pelo menos R$ 100 mil e tiveram menos de mil votos.\n\n'
       'Posição do VotoCheck: o valor do fundo precisa ser revisto. O governo propôs R$ 1 bilhão para 2026; o Congresso aprovou R$ 4,9 bilhões. Em 2027, os eleitos de 2026 votam o fundo de 2028.\n\n'
       'Quanto o seu deputado recebeu: votocheck.com.br/dinheiro-publico (link na bio).\n\n'
       'Dados: TSE, prestação de contas parcial (receitas até 26/09/2026) e resultado do 1º turno. Valores finais saem depois da prestação de contas final.\n'
       '#fundoeleitoral #eleicoes2026 #dinheiropublico #votocheck')
async def render():
    os.makedirs('png', exist_ok=True); arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME'))
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, h in enumerate(s, 1):
            n = f'fundo_01_{i:02d}'; open(f'{n}.html', 'w', encoding='utf-8').write(h)
            await pg.goto('file://' + os.path.abspath(f'{n}.html')); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'png/{n}.png'); arqs.append(f'png/{n}.png')
        await b.close()
    return arqs
json.dump({'fundo': {'arquivos': asyncio.run(render()), 'legenda': leg, 'link': '/dinheiro-publico', 'titulo': 'Para onde foi o dinheiro público de 2026'}}, open('serie_fundo.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({k: str(v)[:60] for k, v in D.items()}))
