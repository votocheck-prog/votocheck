"""Importa bens declarados e redes sociais (TSE 2026) para o D1 via API REST.
Uso: python scripts/importar_bens_redes.py <pasta_bens_csv> <pasta_redes_csv>
Precisa de CF_TOKEN no ambiente. Idempotente (INSERT OR REPLACE)."""
import csv, json, os, sys, re, urllib.request, time
ACC='22688effbd9ab181498d04ccd2cc8d2e'; DB='1de4bbee-3c8c-4043-91f9-fafd527c2f1f'
TOK=os.environ['CF_TOKEN']
def q(sql, params=None):
    body={'sql':sql}
    if params is not None: body['params']=params
    req=urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+TOK,'Content-Type':'application/json'})
    for t in range(4):
        try: return json.load(urllib.request.urlopen(req,timeout=120))
        except urllib.error.HTTPError as e:
            msg=e.read().decode()[:300]; print('erro',e.code,msg); time.sleep(3)
    raise SystemExit('falhou')
def esc(s): return "'"+str(s).replace("'","''")+"'"
mapa={r['sq_candidato_tse']:r['id'] for r in q('SELECT id, sq_candidato_tse FROM candidatura WHERE ano_eleicao=2026')['result'][0]['results']}
def ler(pasta, nome):
    f=os.path.join(pasta, nome)
    with open(f, encoding='latin-1') as fh:
        yield from csv.DictReader(fh, delimiter=';')
# ---- bens
bens=[]; totais={}
for r in ler(sys.argv[1],'bem_candidato_2026_BRASIL.csv'):
    cid=mapa.get(r['SQ_CANDIDATO'])
    if not cid: continue
    try: v=float(r['VR_BEM_CANDIDATO'].replace('.','').replace(',','.'))
    except: v=None
    bens.append((cid,int(r['NR_ORDEM_BEM_CANDIDATO']),r['DS_TIPO_BEM_CANDIDATO'].strip(),r['DS_BEM_CANDIDATO'].strip()[:300],v))
    if v is not None: totais[cid]=totais.get(cid,0)+v
print('bens',len(bens),'candidaturas com bens',len(totais))
def lotes(rows, fmt, tabela, cols, por_stmt=100, por_req=40):
    stmts=[]
    for i in range(0,len(rows),por_stmt):
        vals=','.join(fmt(x) for x in rows[i:i+por_stmt])
        stmts.append(f'INSERT OR REPLACE INTO {tabela} ({cols}) VALUES {vals};')
    for i in range(0,len(stmts),por_req):
        r=q('\n'.join(stmts[i:i+por_req]))
        if not r.get('success'): print(r); raise SystemExit
        print(tabela, min(len(stmts),i+por_req),'/',len(stmts), end='\r')
    print()
nul=lambda v:'NULL' if v is None else repr(round(v,2))
lotes(bens, lambda b:f"({b[0]},{b[1]},{esc(b[2])},{esc(b[3])},{nul(b[4])})",'bem_candidato','candidatura_id, ordem, tipo, descricao, valor')
# totais
tot=list(totais.items())
stmts=[f'UPDATE candidatura SET bens_declarados_total={round(v,2)} WHERE id={cid};' for cid,v in tot]
for i in range(0,len(stmts),400):
    r=q('\n'.join(stmts[i:i+400]))
    if not r.get('success'): print(r); raise SystemExit
print('totais atualizados',len(stmts))
# ---- redes
redes=[]
for r in ler(sys.argv[2],'rede_social_candidato_2026_BRASIL.csv'):
    cid=mapa.get(r['SQ_CANDIDATO'])
    if not cid: continue
    u=r['DS_URL'].strip()
    if not u: continue
    u=u.lower()
    if not u.startswith('http'): u='https://'+u
    redes.append((cid,int(r['NR_ORDEM_REDE_SOCIAL']),u[:300]))
print('redes',len(redes))
lotes(redes, lambda x:f"({x[0]},{x[1]},{esc(x[2])})",'rede_social_candidato','candidatura_id, ordem, url')
print('ok')
