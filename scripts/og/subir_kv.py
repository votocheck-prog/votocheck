"""Sobe as imagens de preview (og) para o KV 'votocheck-og'. Uso: python subir_kv.py <pasta_out> [pag_*.jpg...]
Chaves: c:<pessoa_id> para fichas, p:<nome> para páginas. Precisa de CF_TOKEN."""
import os, sys, json, base64, glob, urllib.request, time
ACC='22688effbd9ab181498d04ccd2cc8d2e'; NS=os.environ.get('CF_KV_OG','58aea9d36a9c4055bbcff72f7c08c3bd'); TOK=os.environ['CF_TOKEN']
def put(itens):
    req=urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{NS}/bulk',method='PUT',data=json.dumps(itens).encode(),headers={'Authorization':'Bearer '+TOK,'Content-Type':'application/json'})
    for t in range(4):
        try:
            r=json.load(urllib.request.urlopen(req,timeout=300))
            if r.get('success'): return
            print(r)
        except urllib.error.HTTPError as e: print('erro',e.code,e.read()[:300])
        time.sleep(5)
    raise SystemExit('falhou')
itens=[]
for f in glob.glob(os.path.join(sys.argv[1],'*.jpg')):
    itens.append({'key':'c:'+os.path.basename(f)[:-4],'value':base64.b64encode(open(f,'rb').read()).decode(),'base64':True})
for f in sys.argv[2:]:
    itens.append({'key':'p:'+os.path.basename(f)[4:-4],'value':base64.b64encode(open(f,'rb').read()).decode(),'base64':True})
print('itens',len(itens))
for i in range(0,len(itens),400):
    put(itens[i:i+400]); print(min(i+400,len(itens)),'/',len(itens),end='\r')
print('\nok')
