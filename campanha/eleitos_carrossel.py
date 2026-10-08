"""VotoCheck — série "Eleitos 2026 · [UF]" (08/10/2026). Carrossel 1080x1350, 6 slides, dado do TSE.
Uso: python eleitos_carrossel.py sp mg rj   (lê ../r26/<uf>-c000N.json; fotos de votocheck.com.br/foto/<sq>.jpg)
Regras: só dado oficial com fonte; sem adjetivo; ninguém que disputa o 2º turno aparece (governador em 2T vira nota)."""
import asyncio, base64, collections, json, os, sys, urllib.request
from playwright.async_api import async_playwright

R26 = os.environ.get('R26') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts', 'input', 'resultados_2026_t1')  # baixados por scripts/importar_resultados_2026.py
UF_NOMES = {'AC':'Acre','AL':'Alagoas','AP':'Amapá','AM':'Amazonas','BA':'Bahia','CE':'Ceará','DF':'Distrito Federal','ES':'Espírito Santo','GO':'Goiás','MA':'Maranhão','MT':'Mato Grosso','MS':'Mato Grosso do Sul','MG':'Minas Gerais','PA':'Pará','PB':'Paraíba','PR':'Paraná','PE':'Pernambuco','PI':'Piauí','RJ':'Rio de Janeiro','RN':'Rio Grande do Norte','RS':'Rio Grande do Sul','RO':'Rondônia','RR':'Roraima','SC':'Santa Catarina','SP':'São Paulo','SE':'Sergipe','TO':'Tocantins'}
FONTE = 'Fonte: TSE, resultado oficial do 1º turno (07/10/2026)'
MINUS = {'de','da','do','das','dos','e'}
# artigo/preposição de cada UF: "o Rio de Janeiro", "a Bahia", "São Paulo"
ART = {'AC':'o','AL':'','AP':'o','AM':'o','BA':'a','CE':'o','DF':'o','ES':'o','GO':'','MA':'o','MT':'o','MS':'o','MG':'','PA':'o','PB':'a','PR':'o','PE':'','PI':'o','RJ':'o','RN':'o','RS':'o','RO':'','RR':'','SC':'','SP':'','SE':'','TO':'o'}
def de(U): return {'o': 'do ', 'a': 'da ', '': 'de '}[ART[U]] + UF_NOMES[U]
def suj(U): return (ART[U].upper() + ' ' if ART[U] else '') + UF_NOMES[U]

def nome(t):
    out = []
    for i, w in enumerate((t or '').lower().split()):
        out.append(w if (i and w in MINUS) else '-'.join(x[:1].upper() + x[1:] for x in w.split('-')))
    return ' '.join(out)

def num(n): return f'{n:,}'.replace(',', '.')

def cands(uf, c):
    p = os.path.join(R26, f'{uf}-c{c}.json')
    if not os.path.exists(p): return []
    d = json.load(open(p)); out = []
    for cg in d['carg']:
        for a in cg.get('agr', []):
            for par in a['par']:
                for k in par['cand']:
                    out.append(dict(nome=k['nmu'], partido=par['sg'], sq=k['sqcand'], votos=int(k['vap'] or 0), st=k.get('st') or ''))
    return out

FOTOS = {}
def foto(sq):
    if sq in FOTOS: return FOTOS[sq]
    try:
        b = urllib.request.urlopen(urllib.request.Request(f'https://votocheck.com.br/foto/{sq}.jpg', headers={'User-Agent': 'VotoCheck-social/1.0'}), timeout=20).read()
        FOTOS[sq] = 'data:image/jpeg;base64,' + base64.b64encode(b).decode()
    except Exception:
        FOTOS[sq] = None
    return FOTOS[sq]

def avatar(c, tam=120):
    f = foto(c['sq'])
    ini = nome(c['nome'])[:1]
    inner = f'<img src="{f}" style="width:100%;height:100%;object-fit:cover">' if f else ini
    return f'<div style="width:{tam}px;height:{tam}px;border-radius:{tam//4}px;overflow:hidden;background:rgba(255,255,255,.1);display:grid;place-items:center;font:800 {tam//2.4:.0f}px \'Plus Jakarta Sans\';color:#BFD2FF;flex:none">{inner}</div>'

def rod(fonte): return f'<div class="rod"><div class="fonte">{fonte}</div><img src="logo_h_branco.png"></div>'
def page(body): return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{EXTRA}</style></head><body><div class="s">{body}</div></body></html>'
EXTRA = '''
.pessoa{display:flex;gap:30px;align-items:center;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.1);border-radius:28px;padding:22px 26px;margin-bottom:16px}
.pessoa b{font-family:"Plus Jakarta Sans";font-size:44px;display:block;line-height:1.1}
.pessoa small{font-size:28px;color:#9AA7D6}
.pessoa .v{margin-left:auto;text-align:right;font-family:"Plus Jakarta Sans";font-weight:800;font-size:40px;color:#fff;white-space:nowrap}
.pessoa .v span{display:block;font:600 22px Inter;color:#7FB0FF}
.barra{display:grid;grid-template-columns:230px 1fr 60px;gap:20px;align-items:center;margin-bottom:12px;font-size:28px}
.barra .t{height:26px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
.barra .t i{display:block;height:100%;border-radius:99px;background:#7FB0FF}
.barra b{font-family:"Plus Jakarta Sans";font-size:32px;text-align:right}
.duelo{display:grid;gap:18px;margin:10px 0 34px}
'''

def slides(uf):
    U = uf.upper(); N = UF_NOMES[U]
    fed = cands(uf, '0006'); sen = cands(uf, '0005'); gov = cands(uf, '0003')
    el = sorted([x for x in fed if x['st'].startswith('Eleito')], key=lambda x: -x['votos'])
    ne = [x for x in fed if not x['st'].startswith('Eleito')]
    T = 6; s = []
    s.append(page(f'''<div class="eyebrow">Eleições 2026 · {N}</div>
<h1 style="font-size:{104 if len(suj(U)) < 12 else 88}px">{suj(U)} elegeu<br><em>{len(el)} deputados<br>federais.</em></h1>
<p class="lead" style="margin-top:40px">Você sabe quem são? São eles que vão votar as leis pelos próximos 4 anos. Arrasta →</p>{rod('@votocheck · informação oficial, com fonte')}'''))
    sen_el = sorted([x for x in sen if x['st'].startswith('Eleito')], key=lambda x: -x['votos'])
    gov_el = [x for x in gov if x['st'].startswith('Eleito')]
    gov_2t = any(x['st'] == '2º turno' for x in gov)
    linhas = ''
    for g in gov_el: linhas += f'<div class="eyebrow" style="margin:0 0 14px">Governador</div><div class="pessoa">{avatar(g)}<div><b>{nome(g["nome"])}</b><small>{g["partido"]}</small></div><div class="v">{num(g["votos"])}<span>votos</span></div></div>'
    linhas += f'<div class="eyebrow" style="margin:{30 if gov_el else 0}px 0 14px">Senado · mandato até 2035</div>' if gov_el else '<p class="lead" style="font-size:32px;margin:-8px 0 24px">Mandato de 8 anos, até 2035.</p>'
    for x in sen_el: linhas += f'<div class="pessoa">{avatar(x)}<div><b>{nome(x["nome"])}</b><small>{x["partido"]}</small></div><div class="v">{num(x["votos"])}<span>votos</span></div></div>'
    if gov_2t: linhas += '<p class="lead" style="font-size:34px;margin-top:26px">O governador será decidido no 2º turno, em 25 de outubro.</p>'
    s.append(page(f'''<div class="pag">2/{T}</div><h2 style="font-size:70px">{"Governador e Senado" if gov_el else "Senado"}</h2>{linhas}{rod(FONTE)}'''))
    cont = collections.Counter(x['partido'] for x in el)
    mx = max(cont.values())
    barras = ''.join(f'<div class="barra"><span>{p}</span><span class="t"><i style="width:{100*n/mx:.0f}%"></i></span><b>{n}</b></div>' for p, n in sorted(cont.items()))
    tam = 28 if len(cont) <= 12 else 24
    s.append(page(f'''<div class="pag">3/{T}</div><h2 style="font-size:66px">A bancada {de(U)}<br>na Câmara, por partido</h2>
<div style="font-size:{tam}px">{barras}</div>{rod(FONTE + ' · partidos em ordem alfabética')}'''.replace('font-size:28px', f'font-size:{tam}px')))
    top = el[:5]
    lt = ''.join(f'<div class="pessoa" style="padding:16px 22px">{avatar(x, 96)}<div><b style="font-size:38px">{nome(x["nome"])}</b><small>{x["partido"]}</small></div><div class="v" style="font-size:36px">{num(x["votos"])}<span>votos</span></div></div>' for x in top)
    s.append(page(f'''<div class="pag">4/{T}</div><h2 style="font-size:66px">Os 5 deputados federais<br>com mais votos</h2>{lt}{rod(FONTE)}'''))
    mn = min(el, key=lambda x: x['votos']); mxn = max(ne, key=lambda x: x['votos'])
    sob = sum(1 for x in el if 'média' in x['st'])
    s.append(page(f'''<div class="pag">5/{T}</div><div class="eyebrow">A regra que pouca gente conhece</div><h2 style="font-size:70px">Mais votos nem sempre<br><em>garantem a vaga.</em></h2>
<div class="duelo"><div class="pessoa">{avatar(mxn, 96)}<div><b style="font-size:38px">{nome(mxn["nome"])}</b><small>{mxn["partido"]} · ficou sem vaga</small></div><div class="v" style="font-size:36px">{num(mxn["votos"])}<span>votos</span></div></div>
<div class="pessoa">{avatar(mn, 96)}<div><b style="font-size:38px">{nome(mn["nome"])}</b><small>{mn["partido"]} · ficou com a vaga</small></div><div class="v" style="font-size:36px">{num(mn["votos"])}<span>votos</span></div></div></div>
<p class="lead" style="font-size:36px">Para deputado, o voto conta primeiro para o partido ou federação. As vagas vão para a lista, e só depois para os mais votados dela. {"No" if ART[U]=="o" else "Na" if ART[U]=="a" else "Em"} {N}, {sob} das {len(el)} vagas saíram pelas sobras.</p>{rod(FONTE + ' · Código Eleitoral, arts. 106 a 109')}'''))
    s.append(page(f'''<div class="pag">6/{T}</div><div class="eyebrow">VotoCheck</div><h2>Agora começa<br><em>a cobrança.</em></h2>
<p class="lead">Veja os {len(el)} {de(U)} com votos, patrimônio e quanto cada um recebeu de dinheiro público na campanha. Tudo com a fonte.</p>
<div style="margin-top:44px"><span class="btn">votocheck.com.br/eleitos/{uf}</span></div>
<p class="lead" style="margin-top:40px;font-size:34px">Siga @votocheck para acompanhar o que eles fazem. Salve e mande pra quem votou em deputado.</p>{rod('@votocheck no Instagram e TikTok')}'''))
    leg = (f'{suj(U)} elegeu {len(el)} deputados federais em 2026. Você sabe quem são?\n\n'
           f'Os {len(el)} vão votar as leis pelos próximos 4 anos. No carrossel: governador e senadores eleitos, a bancada por partido, os mais votados e a regra que faz alguém com {num(mxn["votos"])} votos ficar de fora enquanto outra pessoa entra com {num(mn["votos"])}.\n\n'
           f'A lista completa, com votos, patrimônio e dinheiro público de campanha de cada um: votocheck.com.br/eleitos/{uf} (link na bio).\n\n'
           f'Salve, mande pra quem votou em deputado e siga @votocheck para acompanhar o mandato.\n\n'
           f'{FONTE}.\n#eleicoes2026 #{N.replace(" ", "").lower()} #deputadofederal #votocheck')
    return s, leg

async def render(uf, htmls):
    os.makedirs('png', exist_ok=True); arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME'))
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, h in enumerate(htmls, 1):
            n = f'eleitos_{uf}_{i:02d}'
            open(f'{n}.html', 'w').write(h)
            await pg.goto('file://' + os.path.abspath(f'{n}.html')); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'png/{n}.png'); arqs.append(f'png/{n}.png')
        await b.close()
    return arqs

if __name__ == '__main__':
    saida = {}
    for uf in sys.argv[1:]:
        hs, leg = slides(uf.lower())
        saida[uf.lower()] = {'arquivos': asyncio.run(render(uf.lower(), hs)), 'legenda': leg}
    json.dump(saida, open('serie_eleitos.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: len(v['arquivos']) for k, v in saida.items()}))
