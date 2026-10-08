# VotoCheck 08/10/2026: baixa resultado do 1º turno por município (dep. federal e estadual) de resultados.tse.jus.br.
# Rodar dentro de scripts/municipios: baixe antes config/mun-e006259-cm.json como cm.json. Saída: out/*.json (só eleitos).
import json, os, time, random, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
B='https://resultados.tse.jus.br/oficial/ele2026/6259/dados'
d=json.load(open('cm.json'))
jobs=[]
for a in d['abr']:
    uf=a['cd']
    if uf in ('br','zz'): continue
    for m in a['mu']:
        for c in (('0006','0008') if uf=='df' else ('0006','0007')):
            jobs.append((uf,m['cd'],m.get('cdi'),m['nm'],c))
os.makedirs('out',exist_ok=True)
def get(job):
    uf,cd,cdi,nm,c=job
    out=f'out/{uf}{cd}-c{c}.json'
    if os.path.exists(out): return 'skip'
    url=f'{B}/{uf}/{uf}{cd}-c{c}-e006259-u.json'
    for t in range(10):
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128','Accept':'application/json'}),timeout=60).read()
            j=json.loads(r)
            cands=[(k['sqcand'],int(k.get('vap') or 0)) for cg in j['carg'] for ag in cg.get('agr',[]) for p in ag['par'] for k in p['cand']]
            tot=sum(v for _,v in cands)
            el=[(s,v) for (s,v),k in zip(cands,[k for cg in j['carg'] for ag in cg.get('agr',[]) for p in ag['par'] for k in p['cand']]) if (k.get('st') or '').startswith('Eleito')]
            json.dump({'uf':uf,'cd':cd,'ibge':cdi,'nm':nm,'c':c,'tot':tot,'el':el},open(out,'w'))
            return 'ok'
        except urllib.error.HTTPError as e:
            if e.code==404: return '404'
            time.sleep(2+3*t+random.random())
        except Exception:
            time.sleep(2+3*t+random.random())
    return 'fail'
from collections import Counter
cnt=Counter()
with ThreadPoolExecutor(14) as ex:
    for i,r in enumerate(ex.map(get,jobs)):
        cnt[r]+=1
        if i%500==0: print(i,len(jobs),dict(cnt),flush=True)
print('fim',dict(cnt),flush=True)
