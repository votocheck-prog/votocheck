"""Roteiros do lote 1 de Reels narrados (12/10/2026). Dados do D1; só fato com fonte, sem partido."""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from d1 import q

NOMES = {'AP': 'Amapá', 'SP': 'São Paulo', 'AC': 'Acre', 'RR': 'Roraima'}
def br(v, d=2): return f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')

CSS = '''
body{height:1920px}.s{padding:260px 90px 300px}
.mega{font-family:"Plus Jakarta Sans";font-weight:800;letter-spacing:-.05em;line-height:.95}
.duo2{display:grid;gap:26px;margin-top:40px}.duo2 div{display:flex;justify-content:space-between;align-items:baseline;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);border-radius:30px;padding:34px 40px}
.duo2 span{font-size:46px;color:#C3CDF0}.duo2 b{font:800 92px "Plus Jakarta Sans";letter-spacing:-.03em}
.seta{font:800 160px "Plus Jakarta Sans";color:#3FE0C0;line-height:1}
.meses{display:grid;grid-template-columns:repeat(10,1fr);gap:14px;align-items:end;height:560px;margin-top:40px}
.mes{display:grid;grid-template-rows:auto 1fr auto;height:100%;text-align:center;gap:10px}
.mes b{font:700 30px Inter;color:#C3CDF0}.mes i{align-self:end;display:block;background:#FFB067;border-radius:12px 12px 4px 4px}
.mes.v i{background:rgba(255,255,255,.18)}.mes.pico i{background:#3FE0C0}.mes span{font-size:30px;color:#9AA7D6}
.tag{display:inline-block;align-self:flex-start;font:800 30px Inter;letter-spacing:.06em;text-transform:uppercase;color:#0A1440;background:#3FE0C0;border-radius:999px;padding:12px 26px;margin-bottom:40px}
'''
def rod(f): return f'<div class="rod"><div class="fonte">{f}</div><img src="logo_h_branco.png"></div>'
def tela(b): return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{CSS}</style></head><body><div class="s">{b}</div></body></html>'

# ---- dados ----
r = q("""SELECT c.sg_uf uf, SUM(f.fefc+f.fundo_partidario) pub, SUM(c.votos_t1) votos FROM financiamento_campanha f JOIN candidatura c ON c.id=f.candidatura_id
         JOIN cargo ca ON ca.id=c.cargo_id WHERE ca.slug='deputado_federal' AND c.ano_eleicao=2026 AND c.eleito=1 GROUP BY c.sg_uf""")
cpv = sorted([dict(uf=x['uf'], v=x['pub'] / x['votos']) for x in r if x['votos']], key=lambda y: -y['v'])
A, Z = cpv[0], cpv[-1]
assert A['uf'] == 'AP' and Z['uf'] == 'SP', (A, Z)  # o roteiro falado cita os dois pelo nome
F_FUNDO = 'Fonte: TSE · prestação de contas parcial (até 26/09/2026) e 1º turno · deputados federais eleitos'

cota = q("SELECT SUM(divulgacao) div, MAX(atualizado_em) at FROM cota_resumo WHERE ano=2026")[0]
meses = [0.0] * 12
for x in q("SELECT divulgacao_mes m FROM cota_resumo WHERE ano=2026"):
    for i, v in enumerate(json.loads(x['m'] or '[]')): meses[i] += v
MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out']
pico = max(range(10), key=lambda i: meses[i])
mx = max(meses)
barras = ''.join(f'<div class="mes{" pico" if i == pico else (" v" if 5 <= i <= 8 else "")}"><b>{br(meses[i]/1e6,1) if meses[i] >= 1e5 else "0"}</b><i style="height:{max(0.6,100*meses[i]/mx):.1f}%"></i><span>{MES[i]}</span></div>' for i in range(10))
F_COTA = f'Fonte: Câmara dos Deputados · cota parlamentar (CEAP) 2026, dados de {cota["at"][8:10]}/{cota["at"][5:7]}/2026 · Ato da Mesa 43/2009'
assert 51e6 < cota['div'] < 52e6 and 12e6 < meses[pico] < 12.5e6 and pico == 4, (cota, meses[pico], pico)  # números falados

REELS = {
    'custo_voto': {
        'musica': 'Big_Leagues',
        'falas': [
            {'voz': 'F', 'texto': 'No Amapá, cada voto de deputado eleito custou noventa e cinco reais de dinheiro público.',
             'html': tela(f'<div class="eyebrow">Seu voto para deputado federal</div><div class="mega" style="font-size:150px">Seu voto<br>custou</div><div class="mega" style="font-size:300px;margin-top:20px"><em>R$ {round(A["v"])}</em></div><p class="lead" style="margin-top:40px">de dinheiro público. No Amapá.</p>{rod(F_FUNDO)}')},
            {'voz': 'M', 'texto': 'Em São Paulo, foram nove reais. Dez vezes menos!',
             'html': tela(f'<div class="eyebrow">Dinheiro público por voto · deputado eleito</div><h2 style="font-size:96px">Cada estado,<br>um preço.</h2><div class="duo2"><div><span>Amapá</span><b>R$ {br(A["v"])}</b></div><div><span>São Paulo</span><b>R$ {br(Z["v"])}</b></div></div>{rod(F_FUNDO)}')},
            {'voz': 'F', 'texto': 'Cada eleito recebeu quase o mesmo. O que muda é quantos votos a vaga precisa.',
             'html': tela(f'<div class="eyebrow">Por que a diferença</div><h2 style="font-size:104px">Cada eleito<br>recebeu quase<br>o mesmo.<br><em>O que muda<br>é o voto.</em></h2>{rod(F_FUNDO + " · Constituição, art. 45")}')},
            {'voz': 'M', 'texto': 'E no seu estado? Comenta a sigla que a gente responde com o número!',
             'html': tela(f'<div class="mega" style="font-size:150px">E no<br><em>seu estado?</em></div><p class="lead" style="margin-top:50px;font-size:58px">Comente a sigla.<br>A gente responde com o número.</p><div class="seta" style="margin-top:60px">↓</div>{rod("@votocheck · fatos com fonte, sem partido")}')},
        ],
    },
    'cota': {
        'musica': 'Hypnotized',
        'falas': [
            {'voz': 'M', 'texto': 'Aquele post patrocinado de deputado no seu feed? Pode ter sido pago com o seu dinheiro.',
             'html': tela(f'<div class="tag">Cota parlamentar</div><div class="mega" style="font-size:150px">Você pagou<br><em>esse post?</em></div>{rod(F_COTA)}')},
            {'voz': 'F', 'texto': 'A Câmara reembolsa a divulgação do mandato com a cota parlamentar. Dinheiro público.',
             'html': tela(f'<div class="eyebrow">Como funciona</div><h2 style="font-size:96px">A Câmara reembolsa<br>a <em>divulgação<br>do mandato.</em></h2><p class="lead" style="font-size:50px">Posts patrocinados, vídeos, gráfica e anúncios. Com a cota parlamentar: dinheiro público.</p>{rod(F_COTA)}')},
            {'voz': 'M', 'texto': 'Em dois mil e vinte e seis, foram mais de cinquenta e um milhões de reais.',
             'html': tela(f'<div class="eyebrow">Deputados federais · 2026</div><div class="mega" style="font-size:200px"><em>R$ {br(cota["div"]/1e6,1)}<br>milhões</em></div><p class="lead" style="margin-top:40px;font-size:52px">em divulgação do mandato.</p>{rod(F_COTA)}')},
            {'voz': 'F', 'texto': 'O recorde foi maio: mais de doze milhões. Em junho, a regra proibiu para quem era candidato.',
             'html': tela(f'<div class="eyebrow">Divulgação por mês · R$ milhões</div><h2 style="font-size:84px">Recorde em <em>maio.</em><br>Em junho, vedado<br>para candidatos.</h2><div class="meses">{barras}</div>{rod(F_COTA)}')},
            {'voz': 'M', 'texto': 'É permitido. Mas é dinheiro público, e dá para ver quanto cada deputado gastou.',
             'html': tela(f'<h2 style="font-size:110px">É permitido.<br>É público.<br><em>Dá para<br>conferir.</em></h2><p class="lead" style="font-size:48px">Cada despesa tem nota fiscal aberta.</p>{rod(F_COTA)}')},
            {'voz': 'F', 'texto': 'Quer saber o do seu deputado? Comenta o nome dele, ou acessa votocheck ponto com ponto bê erre.',
             'html': tela(f'<div class="mega" style="font-size:140px">E o do<br><em>seu deputado?</em></div><p class="lead" style="margin-top:44px;font-size:56px">Comente o nome dele.</p><div style="margin-top:50px"><span class="btn" style="font-size:46px">votocheck.com.br</span></div><div class="seta" style="margin-top:50px">↓</div>{rod("@votocheck · fatos com fonte, sem partido")}')},
        ],
    },
}

LEGENDAS = {
    'custo_voto': (f'No Amapá, cada voto de deputado federal eleito custou R$ {br(A["v"])} de dinheiro público. Em São Paulo, R$ {br(Z["v"])}.\n\n'
                   'E no seu estado? Comente a sigla (SP, BA, RS...) que a gente responde com o número.\n\n'
                   'É o fundo eleitoral e partidário que os deputados eleitos declararam ao TSE, dividido pelos votos que tiveram. Todos os estados: votocheck.com.br/dinheiro-publico (link na bio).\n\n'
                   'Dados: TSE, prestação de contas parcial (até 26/09/2026) e 1º turno. Narração gerada por IA.\n#fundoeleitoral #eleicoes2026 #dinheiropublico #votocheck'),
    'cota': (f'R$ {br(cota["div"]/1e6,1)} milhões da cota parlamentar pagaram a divulgação do mandato de deputados federais em 2026: posts patrocinados, vídeos, gráfica e anúncios.\n\n'
             f'É permitido. Mas a regra da Câmara proíbe para quem é candidato nos 120 dias antes da eleição: maio teve o recorde (R$ {br(meses[pico]/1e6,1)} mi) e junho caiu para R$ {br(meses[5]/1e6,1)} mi.\n\n'
             'Comente o nome do seu deputado que a gente responde quanto ele gastou. Ou veja em votocheck.com.br/dinheiro-publico/cota (link na bio).\n\n'
             'Dados: Câmara dos Deputados, cota parlamentar 2026. Narração gerada por IA.\n#cotaparlamentar #dinheiropublico #deputadofederal #votocheck'),
}
