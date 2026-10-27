"""VotoCheck — mídia pós-eleição, lote C1 (27/10/2026): acompanhamento e cobrança.

Peças (1 por dia, 19h de Brasília, Instagram + TikTok):
  28/10 reel_lembra    Reels narrado  "Em quem você votou para deputado? Sem olhar."
  29/10 car_cobrar     Carrossel 7    "Reclamar no grupo da família não chega no gabinete."
  30/10 est_enquete    Estático       "Qual destes a gente investiga primeiro?"  (comentário com número)
  31/10 car_posse      Carrossel 6    "Ganhou, mas ainda não manda." (calendário até a posse)
  01/11 reel_fundo     Reels narrado  "R$ 4,9 bilhões. Quem decide o próximo? Eles."
  02/11 car_seis       Carrossel 7    "Você elegeu 6 pessoas. Sabe o que cada uma faz?"
Imagens de capa: Workers AI (flux-1-schnell), só metáfora, com o selo "Imagem ilustrativa gerada por IA".
Telas do site: capturas reais (nome, foto e contato do parlamentar borrados/omitidos).
Uso: python3 lote_c1.py   → png/<peça>/NN.png
"""
import asyncio, base64, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

RAIZ = Path(__file__).resolve().parent
IA, SH = RAIZ / 'ia', RAIZ / 'shots'

def uri(p):
    return 'data:image/%s;base64,%s' % ('png' if str(p).endswith('png') else 'jpeg', base64.b64encode(Path(p).read_bytes()).decode())

CSS = (RAIZ / 'base.css').read_text(encoding='utf-8') + '''
body.story{height:1920px}
.foto{position:absolute;left:0;right:0;top:0;height:62%;background-size:cover;background-position:center;z-index:0}
.foto::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,64,.15) 0%,rgba(10,20,64,.35) 45%,#0A1440 100%)}
.s.comfoto{justify-content:flex-end}
.ia{position:absolute;top:30px;left:84px;font-size:20px;font-weight:600;color:rgba(255,255,255,.75);background:rgba(10,20,64,.55);padding:8px 16px;border-radius:999px;z-index:3}
.mega{font-family:"Plus Jakarta Sans";font-weight:800;letter-spacing:-.045em;line-height:.98}
.tag{display:inline-block;align-self:flex-start;font:800 28px Inter;letter-spacing:.06em;text-transform:uppercase;color:#0A1440;background:#3FE0C0;border-radius:999px;padding:12px 26px;margin-bottom:34px}
.print{border-radius:36px;overflow:hidden;border:10px solid #1B2A6B;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);background:#fff}
.print img{display:block;width:100%}
.passo-n{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:24px;background:#0059F5;font:800 44px "Plus Jakarta Sans";margin-right:22px;vertical-align:middle}
.arraste{position:absolute;right:84px;bottom:150px;font:700 30px Inter;color:#3FE0C0;z-index:2}
.opc{display:grid;grid-template-columns:96px 1fr;gap:26px;align-items:center;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.14);border-radius:28px;padding:26px 30px;margin-bottom:18px}
.opc b{display:grid;place-items:center;width:96px;height:96px;border-radius:24px;background:#3FE0C0;color:#0A1440;font:800 54px "Plus Jakarta Sans"}
.opc span{font:700 42px "Plus Jakarta Sans";line-height:1.15}
.opc small{display:block;font:500 28px Inter;color:#9AA7D6;margin-top:6px}
.data{display:grid;grid-template-columns:300px 1fr;gap:30px;align-items:center;border-top:2px solid rgba(255,255,255,.12);padding:30px 0}
.data b{font:800 92px "Plus Jakarta Sans";letter-spacing:-.04em;color:#3FE0C0;line-height:1}
.data b small{display:block;font:700 30px Inter;letter-spacing:.04em;color:#7FB0FF;text-transform:uppercase;margin-top:6px}
.data span{font:700 44px "Plus Jakarta Sans";line-height:1.15}
.data span i{display:block;font:500 30px Inter;font-style:normal;color:#9AA7D6;margin-top:8px}
.cargo{display:grid;grid-template-columns:110px 1fr;gap:28px;align-items:start;margin-bottom:28px}
.cargo b{display:grid;place-items:center;width:110px;height:110px;border-radius:30px;background:#0059F5;font:800 54px "Plus Jakarta Sans"}
.cargo strong{display:block;font:800 50px "Plus Jakarta Sans";line-height:1.1;margin-bottom:8px}
.cargo span{font-size:34px;line-height:1.4;color:#C3CDF0}
.lista3 div{font:700 52px "Plus Jakarta Sans";line-height:1.2;padding:26px 0;border-top:2px solid rgba(255,255,255,.12)}
.lista3 div em{display:inline}
.enq{padding-top:110px;padding-bottom:150px}.enq .foto{height:46%}.enq .opc{padding:16px 24px;margin-bottom:12px;grid-template-columns:76px 1fr}.enq .opc b{width:76px;height:76px;font-size:42px;border-radius:20px}.enq .opc span{font-size:36px}.enq .opc small{font-size:25px}.enq .tag{margin-bottom:22px}
'''
LOGO = uri(RAIZ / 'logo_h_branco.png')

def rod(fonte):
    return f'<div class="rod"><div class="fonte">{fonte}</div><img src="{LOGO}"></div>'

def doc(corpo, story=False, cls=''):
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{"story" if story else ""}"><div class="s {cls}">{corpo}</div></body></html>'

def foto(nome):
    return f'<div class="foto" style="background-image:url({uri(IA / (nome + ".jpg"))})"></div><div class="ia">Imagem ilustrativa gerada por IA</div>'

def pag(i, n):
    return f'<div class="pag">{i}/{n}</div>'

def recorte(arq, y0, y1, nome):
    from PIL import Image
    im = Image.open(SH / arq)
    out = RAIZ / 'shots' / f'_{nome}.png'
    im.crop((0, y0, im.size[0], min(y1, im.size[1]))).save(out)
    return uri(out)

FONTE_SITE = 'votocheck.com.br · dados do TSE, Câmara e Senado'

# ---------------- peças ----------------
def car_cobrar():
    n = 7
    s = []
    s.append(doc(foto('celular') + f'''<div class="tag">Guia rápido · salve</div>
      <h1 style="font-size:104px">Reclamar no grupo da família <em>não chega no gabinete.</em></h1>
      <p class="lead" style="margin-top:30px">Como cobrar seu deputado em 1 minuto, com fato e fonte.</p>
      {pag(1, n)}<div class="arraste">Arraste →</div>{rod(FONTE_SITE)}''', cls='comfoto'))
    passos = [
        ('1', 'Ache quem te representa', 'Digite o CEP em votocheck.com.br: presidente, governador, senadores e deputados do seu estado.', recorte('home_cep.png', 1230, 2750, 'p1')),
        ('2', 'Escolha um fato registrado', 'Como votou, quanto usou da cota, quanto dinheiro público recebeu. Tudo com fonte oficial.', recorte('cob_passo1.png', 0, 1400, 'p2')),
        ('3', 'Confira o texto pronto', 'Educado e sem xingamento: o fato primeiro, a pergunta depois. Pode editar.', recorte('cob_passo2.png', 0, 1380, 'p3')),
        ('4', 'Envie direto ao gabinete', 'E-mail oficial, Instagram ou telefone. A mensagem sai do seu e-mail, não do nosso.', recorte('cob_passo3.png', 0, 1113, 'p4')),
    ]
    for k, (num, tit, txt, img) in enumerate(passos, start=2):
        s.append(doc(f'''<div style="display:flex;align-items:center;margin-bottom:24px"><span class="passo-n">{num}</span><h2 style="font-size:66px;margin:0">{tit}</h2></div>
          <p class="lead" style="font-size:36px;margin-bottom:36px">{txt}</p>
          <div class="print" style="max-height:640px"><img src="{img}"></div>
          {pag(k, n)}{rod('Telas reais do votocheck.com.br · nome e contato do parlamentar ocultados')}'''))
    s.append(doc(f'''<div class="eyebrow">Por que assim</div><h2 style="font-size:90px">Cobrança que <em>chega</em> tem 3 coisas:</h2>
      <div class="lista3" style="margin-top:20px"><div>1. Um fato com fonte.</div><div>2. Uma pergunta educada.</div><div>3. Mais gente perguntando <em>a mesma coisa.</em></div></div>
      {pag(6, n)}{rod('VotoCheck: sem partido, sem nota, sem ranking')}'''))
    s.append(doc(f'''<div class="mega" style="font-size:118px">Salve para usar quando ele votar algo <em>que te incomoda.</em></div>
      <p class="lead" style="margin-top:40px">E mande para quem só reclama no grupo.</p>
      <div style="margin-top:46px"><span class="btn">votocheck.com.br</span></div>
      {pag(7, n)}{rod('@votocheck · acompanhe e cobre, com fato e fonte')}'''))
    legenda = ('Reclamar no grupo da família não chega no gabinete. Cobrar com fato, chega.\n\n'
               'Como cobrar seu deputado em 1 minuto:\n1. Digite seu CEP em votocheck.com.br e veja quem te representa.\n'
               '2. Escolha um fato registrado: votação, cota parlamentar ou dinheiro público de campanha.\n'
               '3. Confira o texto pronto, educado e com a fonte.\n4. Envie para o e-mail, Instagram ou telefone oficial do gabinete.\n\n'
               'Salve para usar quando ele votar algo que te incomoda. E manda para aquele amigo que só reclama no grupo.\n\n'
               'Link na bio. Dados: TSE, Câmara dos Deputados e Senado Federal. Capa: imagem ilustrativa gerada por IA.\n'
               '#cidadania #deputadofederal #fiscalizacao #votocheck')
    return s, legenda, 'Como cobrar seu deputado em 1 minuto'

def est_enquete():
    s = [doc(foto('lupa') + f'''<div class="tag">Você escolhe a pauta</div>
      <h1 style="font-size:76px;margin-bottom:28px">Qual destes a gente <em>investiga primeiro</em> no seu estado?</h1>
      <div class="opc"><b>1</b><span>Gastos da cota parlamentar<small>quanto cada deputado usou e em quê</small></span></div>
      <div class="opc"><b>2</b><span>Dinheiro público de campanha<small>quanto cada eleito recebeu</small></span></div>
      <div class="opc"><b>3</b><span>Como votaram no Plenário<small>as votações que mais mexem no seu bolso</small></span></div>
      <div class="opc"><b>4</b><span>Patrimônio declarado<small>o que cada eleito declarou ter ao TSE</small></span></div>
      <p class="lead" style="font-size:38px;margin-top:20px;color:#fff"><b>Comente o número + a sigla do estado.</b> Ex.:&nbsp;3&nbsp;BA</p>
      {rod('As respostas mais comentadas viram as próximas peças')}''', cls='comfoto enq')]
    legenda = ('Você escolhe a próxima pauta do VotoCheck.\n\n1. Gastos da cota parlamentar\n2. Dinheiro público de campanha\n3. Como votaram no Plenário\n4. Patrimônio declarado\n\n'
               'Comente o número + a sigla do seu estado (ex.: 3 BA). As mais pedidas viram as próximas peças, com dado oficial e fonte.\n\n'
               'Enquanto isso, veja quem te representa pelo CEP: votocheck.com.br (link na bio). Imagem ilustrativa gerada por IA.\n#cidadania #politica #eleicoes2026 #votocheck')
    return s, legenda, 'Qual destes a gente investiga primeiro?'

def car_posse():
    n = 6
    F = 'Fonte: TSE (calendário eleitoral 2026) · Constituição, EC 111/2021'
    s = [doc(f'''<div class="tag">Calendário · salve</div><div class="mega" style="font-size:150px">Ganhou.<br>Mas ainda <em>não manda.</em></div>
      <p class="lead" style="margin-top:40px">Quando cada eleito de 2026 assume, de verdade.</p>{pag(1, n)}<div class="arraste">Arraste →</div>{rod(F)}''')]
    datas = [
        ('18/12', '2026', 'Diplomação', 'Prazo final para a Justiça Eleitoral entregar o diploma aos eleitos.'),
        ('05/01', '2027', 'Presidente da República', 'Posse no Congresso Nacional.'),
        ('06/01', '2027', 'Governadores', 'Posse nas Assembleias Legislativas.'),
        ('01/02', '2027', 'Senadores e deputados federais', 'Posse no Congresso. Deputados estaduais, em geral, no mesmo dia.'),
    ]
    s.append(doc(f'<div class="eyebrow">Linha do tempo</div><h2 style="font-size:76px">Do resultado à posse</h2>' + ''.join(
        f'<div class="data"><b>{d}<small>{a}</small></b><span>{t}<i>{x}</i></span></div>' for d, a, t, x in datas) + f'{pag(2, n)}{rod(F)}'))
    s.append(doc(f'''<div class="eyebrow">Até lá</div><h2 style="font-size:96px">Quem vota hoje é <em>quem já está no cargo.</em></h2>
      <p class="lead">Muitos foram reeleitos. Outros saem em fevereiro, mas ainda votam até lá: orçamento de 2027, projetos e vetos.</p>{pag(3, n)}{rod('Fonte: Constituição, art. 44 e 57 · Câmara dos Deputados')}'''))
    s.append(doc(f'''<div class="eyebrow">Na prática</div><h2 style="font-size:88px">Novato ainda não tem <em>e-mail de gabinete.</em></h2>
      <p class="lead">O contato oficial sai na posse. Até lá, dá para falar pelas redes que ele declarou ao TSE.</p>{pag(4, n)}{rod('Fonte: Câmara dos Deputados · TSE (redes declaradas na candidatura)')}'''))
    s.append(doc(f'''<div class="eyebrow">Mandato</div><div class="mega" style="font-size:260px"><em>1.461</em></div>
      <h2 style="font-size:70px;margin-top:20px">dias de mandato de deputado. De 1º/2/2027 a 31/1/2031.</h2>{pag(5, n)}{rod('Fonte: Constituição, art. 44 (legislatura de quatro anos)')}'''))
    s.append(doc(f'''<div class="mega" style="font-size:120px">Salve e marque quem acha que <em>já acabou.</em></div>
      <p class="lead" style="margin-top:40px">Quem te representa hoje e em 2027, pelo CEP:</p>
      <div style="margin-top:36px"><span class="btn">votocheck.com.br</span></div>{pag(6, n)}{rod('@votocheck · acompanhe o mandato, com fonte')}'''))
    legenda = ('Ganhou, mas ainda não manda. O calendário até a posse:\n\n'
               '• até 18/12/2026: diplomação dos eleitos (prazo do TSE)\n• 05/01/2027: posse do presidente\n• 06/01/2027: posse dos governadores\n'
               '• 01/02/2027: posse de senadores e deputados federais (e, em geral, dos estaduais)\n\n'
               'Até lá, quem vota é quem já está no cargo: orçamento de 2027, projetos e vetos.\n\n'
               'Salve e marque quem acha que a eleição já acabou. Quem te representa hoje e em 2027: votocheck.com.br (link na bio).\n\n'
               'Fontes: TSE, calendário eleitoral 2026; Constituição (EC 111/2021).\n#eleicoes2026 #posse #cidadania #votocheck')
    return s, legenda, 'Ganhou, mas ainda não manda: o calendário até a posse'

def car_seis():
    n = 7
    F = 'Fonte: Constituição Federal (arts. 27, 44 a 52, 76, 84 e constituições estaduais)'
    s = [doc(foto('megafone') + f'''<div class="tag">Salve</div><h1 style="font-size:108px">Você elegeu 6 pessoas. <em>Sabe o que cada uma faz?</em></h1>
      <p class="lead" style="margin-top:30px">Em uma frase cada. Sem juridiquês.</p>{pag(1, n)}<div class="arraste">Arraste →</div>{rod(F)}''', cls='comfoto')]
    cargos = [
        ('1', 'Deputado federal', 'Faz e vota leis nacionais, aprova o orçamento da União e fiscaliza o governo federal.'),
        ('2', 'Deputado estadual', 'Faz as leis do estado, aprova o orçamento estadual e fiscaliza o governador.'),
        ('3·4', 'Dois senadores', 'Também fazem e votam leis nacionais. Aprovam ministros do STF e embaixadores. Mandato de 8 anos.'),
        ('5', 'Governador', 'Administra o estado: polícias, escolas estaduais, hospitais da rede estadual e estradas estaduais.'),
        ('6', 'Presidente', 'Governa o país, sanciona ou veta leis, indica ministros e comanda a política externa.'),
    ]
    for k, (num, tit, txt) in enumerate(cargos, start=2):
        s.append(doc(f'''<div class="eyebrow">O voto número {num}</div>
          <div class="cargo"><b>{num}</b><div><strong style="font-size:84px;line-height:1.02">{tit}</strong></div></div>
          <p class="lead" style="font-size:52px;line-height:1.35;color:#fff">{txt}</p>{pag(k, n)}{rod(F)}'''))
    s.append(doc(f'''<div class="mega" style="font-size:112px">Agora você sabe <em>o que cobrar de cada um.</em></div>
      <p class="lead" style="margin-top:40px">Digite o CEP e veja quem são os seus 6, com votos, gastos e contato oficial.</p>
      <div style="margin-top:40px"><span class="btn">votocheck.com.br</span></div>{pag(7, n)}{rod('@votocheck · acompanhe e cobre, com fato e fonte')}'''))
    legenda = ('Você elegeu 6 pessoas em 2026. O que cada uma faz, em uma frase:\n\n'
               '1. Deputado federal: leis nacionais, orçamento da União, fiscaliza o governo federal.\n'
               '2. Deputado estadual: leis do estado, orçamento estadual, fiscaliza o governador.\n'
               '3 e 4. Senadores: leis nacionais, aprovam ministros do STF e embaixadores. Mandato de 8 anos.\n'
               '5. Governador: administra o estado (polícias, escolas e hospitais da rede estadual).\n'
               '6. Presidente: governa o país, sanciona ou veta leis.\n\n'
               'Salve para lembrar o que cobrar de cada um. Seus 6, pelo CEP: votocheck.com.br (link na bio).\n'
               'Fonte: Constituição Federal. Capa: imagem ilustrativa gerada por IA.\n#cidadania #eleicoes2026 #politica #votocheck')
    return s, legenda, 'Você elegeu 6 pessoas. Sabe o que cada uma faz?'

PECAS = {'car_cobrar': car_cobrar, 'est_enquete': est_enquete, 'car_posse': car_posse, 'car_seis': car_seis}

async def render(nome, htmls, story=False):
    out = RAIZ / 'png' / nome
    out.mkdir(parents=True, exist_ok=True)
    arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920 if story else 1350})
        for i, h in enumerate(htmls, 1):
            f = out / f'{nome}_{i:02d}.html'
            f.write_text(h, encoding='utf-8')
            await pg.goto(f.as_uri()); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(250)
            png = out / f'{nome}_{i:02d}.png'
            await pg.screenshot(path=str(png)); arqs.append(str(png))
            f.unlink()
        await b.close()
    return arqs

if __name__ == '__main__':
    import json
    meta = {}
    for nome in (sys.argv[1:] or PECAS):
        htmls, legenda, titulo = PECAS[nome]()
        arqs = asyncio.run(render(nome, htmls))
        meta[nome] = {'arquivos': arqs, 'legenda': legenda, 'titulo': titulo}
        print(nome, len(arqs))
    old = json.loads((RAIZ / 'lote_c1.json').read_text(encoding='utf-8')) if (RAIZ / 'lote_c1.json').exists() else {}
    old.update(meta)
    (RAIZ / 'lote_c1.json').write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')
