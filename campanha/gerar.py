import os, asyncio
from playwright.async_api import async_playwright
D='/home/claude/social'
FONTE_TSE='Fonte: TSE, candidaturas registradas (dados de 26/09/2026)'
def rod(fonte, claro=False):
    logo='logo_h.png' if claro else 'logo_h_branco.png'
    return f'<div class="rod"><div class="fonte">{fonte}</div><img src="{logo}"></div>'
def dig(n): return '<div class="dig">'+'<span></span>'*n+'</div>'
def page(body, cls='', story=False):
    return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"></head><body class="{"story" if story else ""}"><div class="s {cls}">{body}</div></body></html>'

# ===== Carrossel 1: 6 votos (27/09) =====
c1=[]
c1.append(page(f'''<div class="eyebrow">Eleições 2026 · 1º turno 4/out</div>
<h1>São 6 votos<br>na urna.<br><em>Você sabe<br>os 6?</em></h1>
<p class="lead" style="margin-top:40px">Quase todo mundo sabe em quem vota pra presidente. E pra deputado? Arrasta →</p>
{rod('@votocheck · informação oficial, com fonte')}'''))
votos=[(1,'Deputado Federal','4 dígitos',4),(2,'Deputado Estadual','5 dígitos (Distrital no DF)',5),(3,'Senador · 1ª vaga','3 dígitos',3),(4,'Senador · 2ª vaga','3 dígitos',3),(5,'Governador','2 dígitos',2),(6,'Presidente','2 dígitos',2)]
lista=''.join(f'<div class="voto"><div class="n">{n}</div><div><b>{c}</b><small>{s}</small></div>{dig(d)}</div>' for n,c,s,d in votos)
c1.append(page(f'''<div class="pag">2/8</div><div class="eyebrow">A ordem na urna</div><h2 style="font-size:66px;margin-bottom:34px">Nesta ordem, sem pular:</h2>{lista}{rod('Fonte: TSE, ordem oficial de votação 2026')}'''))
def slide_num(pag, eyebrow, big, titulo, texto):
    return page(f'''<div class="pag">{pag}/8</div><div class="eyebrow">{eyebrow}</div>
<div class="big"><em>{big}</em></div><h2 style="margin-top:24px">{titulo}</h2><p class="lead">{texto}</p>{rod(FONTE_TSE)}''')
c1.append(slide_num(3,'Voto 1 · Deputado Federal','7.802','candidatos para 513 vagas','Cerca de 15 por vaga. E seu voto conta primeiro para o partido ou federação, antes do candidato.'))
c1.append(slide_num(4,'Voto 2 · Deputado Estadual','11.726','candidatos para 1.059 vagas','Deputados estaduais e distritais fazem as leis do seu estado e fiscalizam o governador.'))
c1.append(slide_num(5,'Votos 3 e 4 · Senado','2 votos','para senador em 2026','São 54 vagas no país, 2 por estado, e 319 candidatos. Você escolhe dois nomes diferentes.'))
c1.append(slide_num(6,'Votos 5 e 6','201 + 14','candidatos a governador e a presidente','Os mais falados da eleição. Mas lembra: são só 2 dos seus 6 votos.'))
c1.append(page(f'''<div class="pag">7/8</div><div class="eyebrow">Dica que evita fila</div><h2>Leve a cola<br><em>em papel.</em></h2>
<div class="aviso"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FFD66B" stroke-width="1.8"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/></svg><div>O celular <b>não pode</b> entrar na cabine de votação. Anotar os números num papel é permitido e ajuda.</div></div>
<p class="lead" style="margin-top:40px">Monte a sua com os 6 votos na ordem certa e imprima.</p>{rod('Lei 9.504/97, art. 91-A')}'''))
c1.append(page(f'''<div class="pag">8/8</div><div class="eyebrow">VotoCheck</div><h2>Confira quem é<br>quem <em>antes de<br>decidir.</em></h2>
<p class="lead">Candidatos do seu estado, número, partido, como votou quem já tem mandato. Tudo com a fonte oficial. Sem ranking, sem torcida.</p>
<div style="margin-top:48px"><span class="btn">votocheck.com.br</span></div>
<p class="lead" style="margin-top:40px;font-size:34px">Salve e mande pro grupo da família.</p>{rod('@votocheck no Instagram e TikTok')}'''))

# ===== Carrossel 2: quociente (28/09) =====
c2=[]
c2.append(page(f'''<div class="eyebrow">Voto para deputado</div><h1 style="font-size:104px">Seu voto<br>pode eleger<br><em>outra pessoa.</em></h1>
<p class="lead" style="margin-top:40px">Parece pegadinha, mas é a regra. Entenda em 1 minuto →</p>{rod('@votocheck · informação oficial, com fonte')}'''))
passos=[('Você vota no candidato','ou só no número do partido (voto de legenda).'),('O voto soma para o partido','todos os votos da lista (partido ou federação) entram num total.'),('O partido ganha cadeiras','pelo quociente eleitoral: mais votos na lista, mais vagas.'),('As vagas vão para os mais votados da lista','que também precisam de votos próprios mínimos.')]
pl=''.join(f'<div class="passo"><div class="n">{i+1}</div><div><b>{t}</b><span>{d}</span></div></div>' for i,(t,d) in enumerate(passos))
c2.append(page(f'''<div class="pag">2/6</div><div class="eyebrow">Como funciona</div><h2 style="font-size:64px;margin-bottom:44px">Para deputado, o voto é<br>primeiro do partido.</h2>{pl}{rod('Fonte: Código Eleitoral, arts. 106 a 109')}'''))
c2.append(page(f'''<div class="pag">3/6</div><div class="eyebrow">Exemplo real</div><div class="big"><em>2002</em></div>
<h2 style="margin-top:24px;font-size:64px">Os votos de um só deputado levaram mais 5 colegas à Câmara.</h2>
<p class="lead">Em São Paulo, Enéas Carneiro (Prona) teve votos de sobra, que foram para a lista do partido. Um dos eleitos teve menos de 300 votos.</p>{rod('Fonte: TSE, resultados das eleições 2002')}'''))
c2.append(page(f'''<div class="pag">4/6</div><div class="eyebrow">O que mudou</div><h2>Hoje existe<br><em>um piso.</em></h2>
<p class="lead">Desde a reforma de 2015, para ficar com a vaga o candidato precisa ter sozinho pelo menos <b style="color:#fff">10% do quociente eleitoral</b>. O efeito diminuiu, mas continua: seu voto ajuda a lista inteira.</p>{rod('Fonte: Lei 13.165/2015')}'''))
c2.append(page(f'''<div class="pag">5/6</div><div class="eyebrow">O que fazer</div><h2>Antes de votar,<br>olhe <em>a lista<br>inteira.</em></h2>
<p class="lead">Quem mais está no mesmo partido ou federação do seu candidato? No VotoCheck, a ficha de cada candidato a deputado mostra essa lista.</p>{rod('votocheck.com.br · ficha do candidato')}'''))
c2.append(page(f'''<div class="pag">6/6</div><div class="eyebrow">VotoCheck</div><h2>Confira antes<br><em>de decidir.</em></h2>
<p class="lead">Busque pelo nome ou pelo número do santinho e veja com quem o voto vai somar.</p>
<div style="margin-top:48px"><span class="btn">votocheck.com.br</span></div>
<p class="lead" style="margin-top:40px;font-size:34px">Manda pra quem ainda não decidiu o deputado.</p>{rod('@votocheck no Instagram e TikTok')}'''))

# ===== Story: ordem da urna =====
story=page(f'''<div style="padding-top:120px"><div class="eyebrow">1º turno · 4 de outubro</div><h1 style="font-size:104px;margin-bottom:56px">A ordem<br>dos <em>6 votos</em></h1>{lista}
<p class="lead" style="margin-top:36px">Monte sua cola em <b style="color:#fff">votocheck.com.br/cola</b></p></div>{rod('Fonte: TSE, ordem oficial 2026')}''', story=True)

os.makedirs(f'{D}/html',exist_ok=True); os.makedirs(f'{D}/png',exist_ok=True)
jobs=[]
for i,h in enumerate(c1,1):
    n=f'2709_6votos_{i:02d}'; open(f'{D}/{n}.html','w').write(h); jobs.append((n,1350))
for i,h in enumerate(c2,1):
    n=f'2809_quociente_{i:02d}'; open(f'{D}/{n}.html','w').write(h); jobs.append((n,1350))
open(f'{D}/2709_story_ordem.html','w').write(story); jobs.append(('2709_story_ordem',1920))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1080,'height':1350})
        for n,h in jobs:
            await pg.set_viewport_size({'width':1080,'height':h})
            await pg.goto(f'file://{D}/{n}.html'); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{D}/png/{n}.png')
        await b.close()
asyncio.run(main()); print('ok',len(jobs))
