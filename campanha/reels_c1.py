"""Reels narrados do lote C1 (27/10/2026). Telas com o mesmo design do lote_c1.py."""
import sys
sys.path.insert(0, '.')
import lote_c1 as L
from reel_narrado import montar

def tela(corpo, cls=''):
    return L.doc(corpo, story=True, cls=cls)

R = L.rod
F_SITE = 'votocheck.com.br · dados do TSE, Câmara e Senado'
print_cep = L.recorte('home_cep.png', 1230, 2750, 'r1')
print_env = L.recorte('cob_passo3.png', 0, 1113, 'r2')

REELS = {
 'reel_lembra': {'musica': 'Big_Leagues', 'falas': [
  {'voz': 'F', 'texto': 'Rápido: em quem você votou para deputado federal? Sem olhar o celular.',
   'html': tela(L.foto('urna') + f'''<div class="tag">Teste rápido</div><div class="mega" style="font-size:150px">Em quem você votou para <em>deputado?</em></div>
     <p class="lead" style="margin-top:40px;font-size:56px;color:#fff">Sem olhar o celular.</p>{R(F_SITE)}''', 'comfoto')},
  {'voz': 'M', 'texto': 'Travou? O mandato dele dura mil quatrocentos e sessenta e um dias. E ninguém vai te avisar do que ele votar.',
   'html': tela(f'''<div class="eyebrow">Travou?</div><div class="mega" style="font-size:300px"><em>1.461</em></div>
     <h2 style="font-size:84px;margin-top:20px">dias de mandato.</h2><p class="lead" style="font-size:54px">E ninguém vai te avisar do que ele votar.</p>{R('Fonte: Constituição, art. 44 · mandato de 1º/2/2027 a 31/1/2031')}''')},
  {'voz': 'F', 'texto': 'No VotoCheck, você digita o CEP e vê quem te representa, com votos, gastos e o contato do gabinete.',
   'html': tela(f'''<div class="eyebrow">Em 10 segundos</div><h2 style="font-size:96px">Digite o CEP. <em>Veja quem te representa.</em></h2>
     <div class="print" style="margin-top:30px"><img src="{print_cep}"></div>{R('Tela real do votocheck.com.br')}''')},
  {'voz': 'M', 'texto': 'E se ele votar algo que você não concorda, dá para cobrar com o fato na mão, em um minuto.',
   'html': tela(f'''<div class="eyebrow">E se não concordar?</div><h2 style="font-size:100px">Cobre com o fato <em>na mão.</em></h2>
     <div class="print" style="margin-top:30px"><img src="{print_env}"></div>{R('Tela real do votocheck.com.br · contato do parlamentar ocultado')}''')},
  {'voz': 'F', 'texto': 'Comenta aqui: você lembrou o nome, ou travou?',
   'html': tela(f'''<div class="mega" style="font-size:170px">Lembrou <em>ou travou?</em></div>
     <p class="lead" style="margin-top:50px;font-size:60px;color:#fff">Comenta aqui.</p><div style="margin-top:60px"><span class="btn" style="font-size:48px">votocheck.com.br</span></div>{R('@votocheck · acompanhe e cobre, com fato e fonte')}''')},
 ]},
 'reel_fundo': {'musica': 'Hypnotized', 'falas': [
  {'voz': 'M', 'texto': 'Quatro bilhões e novecentos milhões de reais. Esse foi o fundo eleitoral de dois mil e vinte e seis.',
   'html': tela(L.foto('dinheiro') + f'''<div class="tag">Fundo eleitoral</div><div class="mega" style="font-size:210px"><em>R$ 4,9 bi</em></div>
     <h2 style="font-size:84px;margin-top:20px">de dinheiro público para as campanhas de 2026.</h2>{R('Fonte: Congresso Nacional, LOA 2026 (CMO, set/2025)')}''', 'comfoto')},
  {'voz': 'F', 'texto': 'A proposta do governo era um bilhão. A comissão de orçamento do Congresso subiu para quase cinco.',
   'html': tela(f'''<div class="eyebrow">Como chegou nesse valor</div><div class="duo2" style="display:grid;gap:26px;margin-top:20px">
     <div class="opc" style="grid-template-columns:1fr auto"><span>Proposta do governo</span><b style="width:auto;padding:0 30px;font-size:70px;background:rgba(255,255,255,.12);color:#fff">R$ 1 bi</b></div>
     <div class="opc" style="grid-template-columns:1fr auto"><span>Aprovado no Congresso</span><b style="width:auto;padding:0 30px;font-size:70px">R$ 4,9 bi</b></div></div>
     {R('Fonte: Comissão Mista de Orçamento do Congresso, set/2025 · LOA 2026')}''')},
  {'voz': 'M', 'texto': 'O fundo das eleições de dois mil e vinte e oito vai ser votado no orçamento, pelos deputados e senadores que você acabou de eleger.',
   'html': tela(f'''<div class="eyebrow">E o próximo?</div><h2 style="font-size:110px">O de 2028 será votado <em>por quem você acabou de eleger.</em></h2>{R('O valor é definido na lei orçamentária, votada pelo Congresso')}''')},
  {'voz': 'F', 'texto': 'Quer saber como o seu vai votar? Pergunta antes. No VotoCheck tem o texto pronto, com a fonte.',
   'html': tela(f'''<div class="mega" style="font-size:150px">Pergunte <em>antes</em> que ele vote.</div>
     <p class="lead" style="margin-top:44px;font-size:56px;color:#fff">Texto pronto, educado e com fonte.</p>
     <div class="print" style="margin-top:36px"><img src="{print_env}"></div>{R('Tela real do votocheck.com.br · contato do parlamentar ocultado')}''')},
  {'voz': 'M', 'texto': 'Salva esse vídeo e manda pra quem reclama do fundão no grupo.',
   'html': tela(f'''<div class="mega" style="font-size:150px">Salve e mande para quem <em>reclama no grupo.</em></div>
     <div style="margin-top:60px"><span class="btn" style="font-size:48px">votocheck.com.br</span></div>{R('@votocheck · fatos com fonte, sem partido')}''')},
 ]},
}
LEGENDAS = {
 'reel_lembra': ('Rápido: em quem você votou para deputado federal? Sem olhar o celular.\n\n'
                 'Se travou, o mandato dele dura 1.461 dias e ninguém vai te avisar do que ele votar.\n\n'
                 'No votocheck.com.br você digita o CEP e vê quem te representa, com votos, gastos e o contato do gabinete. E cobra com o fato na mão, em 1 minuto. Link na bio.\n\n'
                 'Comenta: lembrou ou travou?\n\nNarração e capa geradas por IA. Telas reais do site.\n#eleicoes2026 #deputadofederal #cidadania #votocheck'),
 'reel_fundo': ('R$ 4,9 bilhões de dinheiro público para as campanhas de 2026. A proposta do governo era R$ 1 bilhão; a Comissão Mista de Orçamento do Congresso aprovou R$ 4,9 bi (set/2025).\n\n'
                'O fundo das eleições de 2028 será definido no orçamento, votado pelos deputados e senadores que você acabou de eleger.\n\n'
                'Quer saber como o seu vai votar? Pergunte antes: no votocheck.com.br tem o texto pronto, com a fonte (link na bio).\n\n'
                'Salve e mande para quem reclama do fundão no grupo.\n\nFonte: Congresso Nacional, LOA 2026. Narração e capa geradas por IA.\n#fundoeleitoral #dinheiropublico #eleicoes2026 #votocheck'),
}
if __name__ == '__main__':
    import json, os
    os.chdir('.')
    meta = json.load(open('lote_c1.json', encoding='utf-8'))
    for k in sys.argv[1:] or REELS:
        mp4, capa, total = montar(k, REELS[k]['falas'], REELS[k]['musica'])
        meta[k] = {'video': os.path.abspath(mp4), 'capa': os.path.abspath(capa), 'arquivos': [os.path.abspath(capa)], 'legenda': LEGENDAS[k], 'titulo': REELS[k]['falas'][0]['texto'][:80], 'duracao': round(total, 1)}
    json.dump(meta, open('lote_c1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
