import json, urllib.request, time, sys
# Coleta, na API de dados abertos da Câmara, o projeto e a etapa de cada votação com votos registrados.
import os
def q(sql):
    req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/22688effbd9ab181498d04ccd2cc8d2e/d1/database/1de4bbee-3c8c-4043-91f9-fafd527c2f1f/query',data=json.dumps({'sql':sql}).encode(),headers={'Authorization':'Bearer '+os.environ['CF_TOKEN'],'Content-Type':'application/json'})
    return [r['results'] for r in json.load(urllib.request.urlopen(req,timeout=120))['result']]
vs=q("SELECT vt.id, vt.casa, vt.id_externo, vt.descricao, vt.data_votacao, p.sigla_tipo, p.numero, p.ano, p.ementa, p.id_externo prop_ext FROM votacao vt LEFT JOIN proposicao p ON p.id=vt.proposicao_id WHERE vt.id IN (SELECT DISTINCT votacao_id FROM voto_parlamentar)")[0]
def get(u):
    for t in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'Accept':'application/json'}),timeout=40))['dados']
        except Exception as e: time.sleep(2)
    return None
props={}
for v in vs:
    if v['casa']!='camara': continue
    d=get('https://dadosabertos.camara.leg.br/api/v2/votacoes/'+v['id_externo'])
    v['api']={'descUltimaAberturaVotacao':d.get('descUltimaAberturaVotacao'),'proposicoesAfetadas':[{'id':p['id'],'siglaTipo':p['siglaTipo'],'numero':p['numero'],'ano':p['ano'],'ementa':p.get('ementa')} for p in (d.get('proposicoesAfetadas') or [])],'objetosPossiveis':[{'id':p['id'],'siglaTipo':p['siglaTipo'],'numero':p['numero'],'ano':p['ano'],'ementa':p.get('ementa')} for p in (d.get('objetosPossiveis') or [])]} if d else None
    pid=v['id_externo'].split('-')[0]
    if pid not in props:
        pd=get('https://dadosabertos.camara.leg.br/api/v2/proposicoes/'+pid)
        props[pid]={'siglaTipo':pd['siglaTipo'],'numero':pd['numero'],'ano':pd['ano'],'ementa':pd['ementa'],'apelido':(pd.get('statusProposicao') or {}).get('apreciacao')} if pd else None
    v['prop_votada']=props[pid]
    time.sleep(0.2)
json.dump(vs,open('votacoes_det.json','w'),ensure_ascii=False,indent=1)
print(len(vs))
