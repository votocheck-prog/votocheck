import json, urllib.request, urllib.error, time, os, sys
# Gera explicacoes.json a partir de votacoes_det.json (saída de coletar.py). Depois, carregar na tabela
# votacao_explicacao (migrations/0008). Revisar o texto antes de subir.
K=os.environ['GEMINI_API_KEY']
MODELO='gemini-3.8-flash'
vs=json.load(open('votacoes_det.json'))
PRINC=('PEC','PLP','PL','PDL','MPV','PLV','PDC')
def principal(v):
    api=v.get('api') or {}
    for lst in (api.get('proposicoesAfetadas') or [], api.get('objetosPossiveis') or []):
        for p in lst:
            if p['siglaTipo'] in PRINC and p.get('ementa'): return p
    pv=v.get('prop_votada')
    if pv and pv['siglaTipo'] in PRINC: return pv
    if v.get('sigla_tipo'): return {'siglaTipo':v['sigla_tipo'],'numero':v['numero'],'ano':v['ano'],'ementa':v['ementa']}
    return pv
INSTR='''Você explica votações do Congresso Nacional para leigos, com neutralidade absoluta.
Responda SÓ um JSON com as chaves:
"projeto": sigla e número no formato "PLP 74/2026";
"resumo": 1 frase, no máximo 30 palavras, em linguagem simples, dizendo o que o projeto faz segundo a ementa oficial. Não use adjetivos de valor, não diga se é bom ou ruim, não cite partidos nem pessoas, não invente nada que não esteja na ementa;
"esta_votacao": 1 frase, no máximo 25 palavras, dizendo o que foi decidido NESTA votação específica (ex.: aprovar o texto principal; pedido de urgência para acelerar a tramitação; destaque para retirar ou manter um trecho; requerimento de procedimento, como adiar ou retirar de pauta). Baseie-se só na descrição da votação. Se não der para saber com segurança, escreva "Votação de uma etapa do processo deste projeto.";
"confianca": "alta" ou "baixa".'''
out={}
if os.path.exists('explicacoes.json'): out=json.load(open('explicacoes.json'))
for v in vs:
    if str(v['id']) in out: continue
    p=principal(v)
    entrada={'casa':v['casa'],'descricao_da_votacao':v['descricao'],'detalhe':(v.get('api') or {}).get('descUltimaAberturaVotacao'),'proposicao_votada_diretamente':v.get('prop_votada'),'projeto_principal':p}
    body={'contents':[{'role':'user','parts':[{'text':INSTR+'\n\nDADOS:\n'+json.dumps(entrada,ensure_ascii=False)}]}],'generationConfig':{'responseMimeType':'application/json','temperature':0.2}}
    for t in range(4):
        try:
            r=json.load(urllib.request.urlopen(urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent',data=json.dumps(body).encode(),headers={'x-goog-api-key':K,'Content-Type':'application/json'}),timeout=90))
            txt=r['candidates'][0]['content']['parts'][0]['text']; j=json.loads(txt); break
        except urllib.error.HTTPError as e:
            print('http',e.code); time.sleep(65 if e.code==429 else 5)
        except Exception as e:
            print('err',e); time.sleep(5)
    else: continue
    j['ementa']=(p or {}).get('ementa'); out[str(v['id'])]=j
    json.dump(out,open('explicacoes.json','w'),ensure_ascii=False,indent=1)
    time.sleep(1)
print(len(out))
