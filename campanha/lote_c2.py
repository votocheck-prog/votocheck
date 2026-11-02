"""VotoCheck — lote C2 (01/11/2026): pautas de dor + chamada para cobrar, narração Azure, 1º quadro com movimento.

Aprendizado do C1 (TikTok Studio, reel_lembra): tempo médio 2,38 s de 22 s, 1,8% assistiu inteiro,
"a maioria parou em 0:01". O 1º quadro (card escuro estático) matou o vídeo. Regras do C2:
  1. 1º quadro = foto de cena real (dor) em tela cheia, movimento desde o frame 0 (zoom rápido), 3 a 6 palavras.
  2. A fala começa no frame 0 com a dor, nunca com a marca.
  3. Lema: "Ele precisou do seu voto. Agora você precisa dele."
  4. Toda peça termina em ação concreta no site (CEP, posicionamento, cobrança).
Uso: python3 lote_c2.py [peça...]
"""
import asyncio, json, os, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lote_c1 as L
from tts_azure import falar, duracao, mixar

RAIZ = Path(__file__).resolve().parent
SONS = '/tmp/claude-0/sons'
CSS2 = '''
.full{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}
.full::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,64,.15) 0%,rgba(10,20,64,.62) 28%,rgba(10,20,64,.78) 50%,rgba(10,20,64,.55) 75%,rgba(10,20,64,.35) 100%)}
/* Zona segura Reels/TikTok: topo 0-210 (abas), base 1440-1920 (legenda, @, música), direita 930-1080 (botões) */
body.story .s{padding:250px 180px 580px 84px}
body.story .rod{bottom:500px;right:180px}
.s.cena{justify-content:center}
.gancho{font-family:"Plus Jakarta Sans";font-weight:800;font-size:116px;line-height:1;letter-spacing:-.045em;text-shadow:0 6px 30px rgba(0,0,0,.45)}
.lema{font:800 92px "Plus Jakarta Sans";line-height:1.1;letter-spacing:-.02em}
.selo{display:inline-block;font:800 30px Inter;letter-spacing:.05em;text-transform:uppercase;color:#0A1440;background:#3FE0C0;border-radius:999px;padding:12px 26px;margin-bottom:34px;align-self:flex-start}
.print2{border-radius:34px;overflow:hidden;border:8px solid #1B2A6B;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);background:#fff;margin-top:36px}
.print2 img{display:block;width:100%}
.big2{font:800 260px "Plus Jakarta Sans";letter-spacing:-.05em;line-height:.9}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:30px}
.vs div{background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.14);border-radius:28px;padding:30px}
.vs b{display:block;font:800 100px "Plus Jakarta Sans";letter-spacing:-.04em;line-height:1}
.vs span{display:block;font:600 38px Inter;color:#C3CDF0;margin-top:8px}
.ranking div{display:flex;justify-content:space-between;align-items:baseline;font:700 46px "Plus Jakarta Sans";padding:20px 0;border-top:2px solid rgba(255,255,255,.12)}
.ranking div b{font-size:60px;color:#FFB067}
.ranking div.top b{color:#3FE0C0}
'''
L.CSS = L.CSS + CSS2

def full(img):
    return f'<div class="full" style="background-image:url({L.uri(RAIZ / "ia" / (img + ".jpg"))})"></div>'

def tela(corpo, cls=''):
    return L.doc(corpo, story=True, cls=cls)

def shot(arq, y0=0, y1=99999, nome='x'):
    return L.recorte(arq, y0, y1, nome)

R = L.rod
F_SITE = 'votocheck.com.br'
LEMA = '<div class="lema">Ele precisou do seu voto.<br><em>Agora você precisa dele.</em></div>'

REELS = {
 'reel_sus': {'voz': 'yara', 'musica': 'Hypnotized', 'zoom1': 0.08, 'falas': [
  ('Quantas horas você esperou da última vez que precisou do posto de saúde?',
   tela(full('sus') + '<div class="gancho">Quantas horas<br>você <em>esperou?</em></div>' + R(''), 'cena')),
  ('Seu deputado precisou do seu voto. Agora quem precisa é você.',
   tela(full('sus') + LEMA + R(''), 'cena')),
  ('O dinheiro da saúde passa todo ano pelo orçamento, votado por quem você elegeu.',
   tela('<div class="selo">Orçamento</div><h2 style="font-size:90px">O dinheiro da saúde é <em>votado</em> por quem você elegeu.</h2>' + R('Lei orçamentária anual: Congresso Nacional e Assembleias Legislativas'))),
  ('No VotoCheck, você pede o posicionamento dele sobre as filas do SUS.',
   tela('<h2 style="font-size:84px">Peça o posicionamento <em>dele.</em></h2>' + f'<div class="print2"><img src="{shot("pos_saude.png", 0, 594, "c2a")}"></div>' + R('Tela real do votocheck.com.br'))),
  ('Se ele responder, fica público. Se não responder, também fica.',
   tela('<div class="mega" style="font-size:124px">Respondeu?<br><em>Fica público.</em></div><p class="lead" style="font-size:56px;margin-top:30px;color:#fff">Não respondeu? Também.</p>' + R(''))),
  ('Digite seu CEP no VotoCheck e cobre. O link está na bio.',
   tela('<div class="mega" style="font-size:124px">Digite seu CEP.<br><em>Cobre.</em></div><div style="margin-top:56px"><span class="btn" style="font-size:50px">votocheck.com.br</span></div>' + R('@votocheck · fatos com fonte, sem partido'))),
 ], 'legenda': ('Quantas horas você esperou da última vez que precisou do posto de saúde?\n\n'
   'Seu deputado precisou do seu voto. Agora quem precisa é você. O dinheiro da saúde passa todo ano pelo orçamento, votado por quem você elegeu.\n\n'
   'No votocheck.com.br você pede o posicionamento dele sobre as filas do SUS. Se ele responder, fica público na ficha. Se não responder, também fica.\n\n'
   'Digite seu CEP e cobre: link na bio. Comente quantas horas você já esperou.\n#sus #saude #deputadofederal #cobrança #votocheck'),
  'titulo': 'Quantas horas você esperou no posto de saúde?'},

 'reel_maioridade': {'voz': 'ava', 'musica': 'Big_Leagues', 'zoom1': 0.07, 'falas': [
  ('Reduzir a maioridade penal para dezesseis anos. Seu deputado é a favor ou contra?',
   tela(full('tribunal') + '<div class="gancho">Maioridade penal:<br>ele é <em>a favor</em><br>ou <em>contra?</em></div>' + R(''), 'cena')),
  ('Em dois mil e quinze, a Câmara aprovou a redução. No Senado, a proposta foi arquivada sem votação.',
   tela('<div class="selo">O que já aconteceu</div><div class="data"><b>2015<small>Câmara</small></b><span>Aprovou a PEC 171/1993<i>redução para 16 anos em crimes graves</i></span></div><div class="data"><b>Senado<small>CCJ</small></b><span>Arquivada sem votação<i>e o tema voltou em novas propostas</i></span></div>' + R('Fontes: Câmara dos Deputados · Senado Federal (CCJ)'))),
  ('Uns dizem que reduz a violência. Outros, que só lota os presídios. Você decide o que pensa.',
   tela('<div class="vs"><div><b style="font-size:84px">Reduz a violência</b><span>argumento de quem é a favor</span></div><div><b style="font-size:84px">Lota os presídios</b><span>argumento de quem é contra</span></div></div><p class="lead" style="margin-top:40px;font-size:54px;color:#fff">O VotoCheck não escolhe lado.</p>' + R(''))),
  ('A pergunta é outra: o que o seu deputado pensa? A maioria nunca disse.',
   tela('<h2 style="font-size:88px">O que o <em>seu</em> deputado pensa?</h2>' + f'<div class="print2"><img src="{shot("pos_seguranca.png", 0, 723, "c2b")}"></div>' + R('Tela real do votocheck.com.br'))),
  ('Peça o posicionamento dele no VotoCheck. A resposta fica na ficha, ao lado de todos os outros.',
   tela('<div class="mega" style="font-size:100px">Peça o posicionamento <em>dele.</em></div><div style="margin-top:56px"><span class="btn" style="font-size:50px">votocheck.com.br</span></div>' + R('@votocheck · fatos com fonte, sem partido'))),
 ], 'legenda': ('Reduzir a maioridade penal para 16 anos: seu deputado é a favor ou contra?\n\n'
   'Em 2015 a Câmara aprovou a PEC 171/1993. No Senado, ela foi arquivada sem votação. Uns dizem que reduz a violência; outros, que só lota os presídios. O VotoCheck não escolhe lado.\n\n'
   'A pergunta é outra: o que o SEU deputado pensa? No votocheck.com.br você pede o posicionamento dele. A resposta fica pública na ficha, ao lado de todos os outros (link na bio).\n\n'
   'E você, é a favor ou contra? Comente.\n#maioridadepenal #segurancapublica #deputadofederal #votocheck'),
  'titulo': 'Maioridade penal: seu deputado é a favor ou contra?'},
}

CARROSSEIS = {}

def car_alfabetiza():
    n = 6
    F = 'Fonte: MEC/Inep · Indicador Criança Alfabetizada 2025 (divulgado em mar/2026)'
    s = [L.doc(f'''<div class="tag">Educação · salve</div><div class="mega" style="font-size:118px">No Ceará, <em>84 de cada 100</em> crianças leem na idade certa.</div>
      <p class="lead" style="margin-top:34px;font-size:52px;color:#fff">No Rio Grande do Norte, 48.</p>{L.pag(1, n)}<div class="arraste">Arraste →</div>{L.rod(F)}''')]
    s.append(L.doc(f'''<div class="eyebrow">Crianças alfabetizadas na idade certa · rede pública · 2025</div>
      <div class="vs"><div><b>84%</b><span>Ceará, o maior do país</span></div><div><b>66%</b><span>média do Brasil</span></div></div>
      <p class="lead" style="margin-top:30px">A meta nacional para 2025 era 64%.</p>{L.pag(2, n)}{L.rod(F)}'''))
    s.append(L.doc(f'''<div class="eyebrow">Os 5 menores índices de 2025</div><h2 style="font-size:76px">Onde mais crianças <em>ficam para trás</em></h2>
      <div class="ranking"><div><span>Rio Grande do Norte</span><b>48%</b></div><div><span>Sergipe</span><b>50%</b></div><div><span>Rio Grande do Sul</span><b>52%</b></div><div><span>Bahia</span><b>55%</b></div><div><span>Roraima</span><b>57%</b></div></div>{L.pag(3, n)}{L.rod(F)}'''))
    s.append(L.doc(f'''<div class="eyebrow">O que o Ceará fez</div><h2 style="font-size:84px">Não foi sorte. <em>Foi política pública.</em></h2>
      <div class="lista3"><div>Alfabetização como prioridade de Estado desde 2007 (PAIC).</div><div>Cidade que alfabetiza mais recebe mais ICMS.</div><div>Avaliação própria todo ano (Spaece).</div></div>{L.pag(4, n)}{L.rod('Fontes: Governo do Ceará (PAIC, Lei estadual 14.023/2007) · Seduc-CE (Spaece)')}'''))
    s.append(L.doc(f'''<div class="eyebrow">Quem decide no seu estado</div><h2 style="font-size:96px">Governador e <em>deputados estaduais.</em></h2>
      <p class="lead">Eles aprovam o orçamento da educação do estado. Se funciona no Ceará, a pergunta é simples: por que não aqui?</p>{L.pag(5, n)}{L.rod('Constituição Federal, arts. 27 e 211')}'''))
    s.append(L.doc(f'''{LEMA}<p class="lead" style="margin-top:40px">Pergunte ao seu deputado estadual o que ele propõe para a escola pública. Texto pronto, com a fonte:</p>
      <div style="margin-top:36px"><span class="btn">votocheck.com.br</span></div>
      <p class="lead" style="margin-top:30px;font-size:34px">Salve e mande para alguém do RN, SE, RS, BA ou RR.</p>{L.pag(6, n)}{L.rod('@votocheck · acompanhe e cobre, com fato e fonte')}'''))
    leg = ('No Ceará, 84 de cada 100 crianças da rede pública leem e escrevem na idade certa. No Rio Grande do Norte, 48. A média do Brasil é 66%.\n\n'
           'Não foi sorte: o Ceará faz da alfabetização prioridade de Estado desde 2007, e a cidade que alfabetiza mais recebe mais ICMS.\n\n'
           'No seu estado, quem decide é o governador e a Assembleia. Se funciona no Ceará, por que não aqui? Pergunte ao seu deputado estadual: votocheck.com.br (link na bio).\n\n'
           'Salve e mande para alguém do RN, SE, RS, BA ou RR.\nFonte: MEC/Inep, Indicador Criança Alfabetizada 2025.\n#educacao #alfabetizacao #ceara #votocheck')
    return s, leg, 'Ceará alfabetiza 84%; RN, 48%. Por que não no seu estado?'

def est_cep():
    img = shot('cidade_lista.png', 0, 1250, 'c2c')
    s = [L.doc(f'''<div class="tag">Sua cidade</div><h1 style="font-size:84px">Eles precisaram dos votos da sua cidade. <em>Agora a sua cidade precisa deles.</em></h1>
      <div class="print" style="margin-top:26px;max-height:660px;width:600px;align-self:center"><img src="{img}"></div>
      <p class="lead" style="margin-top:26px;font-size:36px;color:#fff"><b>Digite seu CEP</b> e veja quem tem base eleitoral onde você mora.</p>{L.rod('Tela real do votocheck.com.br (exemplo: Salvador)')}''')]
    leg = ('Eles precisaram dos votos da sua cidade. Agora a sua cidade precisa deles.\n\n'
           'Digite seu CEP em votocheck.com.br e veja os deputados mais votados onde você mora, e quanto da votação de cada um veio daí. Com Instagram, e-mail oficial e o botão para cobrar.\n\n'
           'Link na bio. Comente o nome da sua cidade.\n#eleicoes2026 #deputadofederal #cidadania #votocheck')
    return s, leg, 'Eles precisaram dos votos da sua cidade'

CARROSSEIS = {'car_alfabetiza': car_alfabetiza, 'est_cep': est_cep}


async def render_telas(nome, htmls, story):
    out = RAIZ / 'png' / nome
    out.mkdir(parents=True, exist_ok=True)
    from playwright.async_api import async_playwright
    arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920 if story else 1350})
        for i, h in enumerate(htmls, 1):
            f = out / f'{nome}_{i:02d}.html'
            f.write_text(h, encoding='utf-8')
            await pg.goto(f.as_uri()); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(250)
            png = out / f'{nome}_{i:02d}.png'
            if story:
                fora = await pg.evaluate('''() => { const r = []; for (const e of document.querySelectorAll('.s *')) { if (e.closest('.full') || !e.getClientRects().length) continue; const temTexto = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || e.tagName === 'IMG'; if (!temTexto) continue; let b = e.getBoundingClientRect(); if (e.tagName !== 'IMG') { const rg = document.createRange(); rg.selectNodeContents(e); b = rg.getBoundingClientRect(); } if (b.right > 932 || b.bottom > 1430 || b.top < 215 || b.left < 40) r.push(`${e.tagName}.${e.className} "${(e.innerText||'img').slice(0,30)}" ${Math.round(b.left)},${Math.round(b.top)}-${Math.round(b.right)},${Math.round(b.bottom)}`); } return r; }''')
                for f_ in fora: print(f'  ZONA {nome}_{i:02d}: {f_}')
            await pg.screenshot(path=str(png)); arqs.append(str(png)); f.unlink()
        await b.close()
    return arqs


def montar_reel(nome, r):
    telas = asyncio.run(render_telas(nome, [h for _, h in r['falas']], True))
    falas = [falar(t, r['voz']) for t, _ in r['falas']]
    durs = [duracao(f) + 0.35 for f in falas]
    durs[-1] += 1.4
    total = sum(durs)
    tmp = RAIZ / 'video' / f'_tmp_{nome}'
    tmp.mkdir(parents=True, exist_ok=True)
    clipes = []
    for i, (t, d) in enumerate(zip(telas, durs)):
        fr = int(round(d * 30))
        z = r.get('zoom1', 0.07) if i == 0 else 0.03
        # 1º quadro: zoom rápido nos primeiros 1,2 s (movimento desde o frame 0), depois lento.
        expr = f"if(lt(on,36),1+{z}*on/36*0.7,1+{z}*0.7+{z}*0.3*(on-36)/{max(fr - 36, 1)})" if i == 0 else f"1+{z}*on/{fr}"
        c = tmp / f'c{i:02d}.mp4'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', t, '-vf',
                        f"scale=2160:-1,zoompan=z='{expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps=30,format=yuv420p",
                        '-frames:v', str(fr), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', str(c)], check=True)
        clipes.append(c)
    (tmp / 'lista.txt').write_text(''.join(f"file '{c.name}'\n" for c in clipes))
    mudo = tmp / 'mudo.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(tmp / 'lista.txt'), '-c', 'copy', str(mudo)], check=True)
    inicios = [sum(durs[:i]) for i in range(len(durs))]
    inicios[0] = -0.15  # a 1ª fala começa no frame 0 (mixar soma 0,15 s)
    saida = RAIZ / 'video' / f'{nome}.mp4'
    mixar(str(mudo), falas, inicios, f'{SONS}/{r["musica"]}.wav', str(saida), total)
    print(nome, f'{total:.1f}s', saida)
    return str(saida), telas[0], total


if __name__ == '__main__':
    meta_p = RAIZ / 'lote_c2.json'
    meta = json.loads(meta_p.read_text(encoding='utf-8')) if meta_p.exists() else {}
    alvo = sys.argv[1:] or list(REELS) + list(CARROSSEIS)
    for k in alvo:
        if k in REELS:
            mp4, capa, total = montar_reel(k, REELS[k])
            meta[k] = {'video': mp4, 'capa': capa, 'arquivos': [capa], 'legenda': REELS[k]['legenda'], 'titulo': REELS[k]['titulo'], 'duracao': round(total, 1)}
        else:
            htmls, leg, tit = CARROSSEIS[k]()
            arqs = asyncio.run(render_telas(k, htmls, False))
            meta[k] = {'arquivos': arqs, 'legenda': leg, 'titulo': tit}
            print(k, len(arqs))
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
