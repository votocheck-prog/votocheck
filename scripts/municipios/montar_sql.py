# VotoCheck 08/10/2026: monta voto_municipio_2026.sql (top 10 eleitos por cargo e cidade + municipio_tse). Precisa de out/ (baixar_votos_municipio.py) e ../r26 (resultados por UF de importar_resultados_2026.py). Aplicar com scripts/apply_d1.py <arquivo> 10.
import json, glob, os, re, unicodedata, collections
def slug(n):
    n=unicodedata.normalize('NFD',n); n=''.join(c for c in n if unicodedata.category(c)!='Mn').lower()
    return re.sub(r'[^a-z0-9]+','-',n).strip('-')
def q(s): return "'"+str(s).replace("'","''")+"'"
cm=json.load(open('cm.json'))
mun=[]; seen=set()
for a in cm['abr']:
    uf=a['cd'].upper()
    if uf in ('BR','ZZ'): continue
    for m in a['mu']:
        sl=slug(m['nm']); k=(uf,sl)
        if k in seen: sl=f"{sl}-{m['cd']}"
        seen.add((uf,sl)); mun.append((m['cd'],m.get('cdi') or '',uf,m['nm'],sl))
# votos totais por candidato (estado)
tot_cand={}
for f in glob.glob('../r26/*-c000[678].json'):
    d=json.load(open(f))
    for cg in d['carg']:
        for ag in cg.get('agr',[]):
            for p in ag['par']:
                for k in p['cand']: tot_cand[k['sqcand']]=int(k.get('vap') or 0)
linhas=[]; faltam=0
for f in glob.glob('out/*.json'):
    d=json.load(open(f)); cargo='deputado_federal' if d['c']=='0006' else ('deputado_distrital' if d['c']=='0008' else 'deputado_estadual')
    el=sorted(d['el'],key=lambda x:-x[1])[:10]
    for sq,v in el:
        if v<=0: continue
        tc=tot_cand.get(sq)
        linhas.append((d['cd'],cargo,sq,v, round(100*v/d['tot'],3) if d['tot'] else None, round(100*v/tc,3) if tc else None))
out=[]
for i in range(0,len(mun),200):
    out.append('INSERT OR REPLACE INTO municipio_tse (cd_tse, ibge, uf, nome, slug) VALUES '+','.join(f'({q(a)},{q(b)},{q(c)},{q(d)},{q(e)})' for a,b,c,d,e in mun[i:i+200])+';')
for i in range(0,len(linhas),300):
    out.append('INSERT OR REPLACE INTO voto_municipio_2026 (cd_tse, cargo, sq, votos, pct_mun, pct_cand) VALUES '+','.join(f"({q(a)},{q(b)},{q(c)},{d},{'NULL' if e is None else e},{'NULL' if f is None else f})" for a,b,c,d,e,f in linhas[i:i+300])+';')
open('voto_municipio_2026.sql','w').write('\n\n'.join(out)+'\n')
print('municipios',len(mun),'linhas',len(linhas),'stmts',len(out),'arquivos',len(glob.glob('out/*.json')), 'MB', round(os.path.getsize('voto_municipio_2026.sql')/1e6,1))
