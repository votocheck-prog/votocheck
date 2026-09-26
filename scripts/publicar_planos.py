"""Publica os resumos dos planos de governo (saída de resumir_planos.py) no D1 e sobe os PDFs oficiais ao KV.

Uso: CF_TOKEN=... python3 scripts/publicar_planos.py planos_resumos_2026.json /pasta/propostas
- plano_governo (migração 0012): uma linha por candidatura.
- KV "OG": plano:<arquivo>.pdf (servido em /plano/<arquivo>.pdf).
"""
import os, sys, re, json, base64, zipfile, urllib.request
ACC = '22688effbd9ab181498d04ccd2cc8d2e'; DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'; KV = '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN']
def cf(metodo, caminho, corpo):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/{caminho}', method=metodo, data=json.dumps(corpo).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=300))
def d1(sql):
    return cf('POST', f'd1/database/{DB}/query', {'sql': sql})['result'][0]['results']
planos = json.load(open(sys.argv[1])); pasta = sys.argv[2]
cands = {r['sq_candidato_tse']: r['id'] for r in d1("SELECT id, sq_candidato_tse FROM candidatura WHERE ano_eleicao = 2026 AND cargo_id IN (1, 2)")}
esc = lambda x: "'" + str(x).replace("'", "''") + "'" if x is not None else 'NULL'
linhas = []
for sq, p in planos.items():
    if sq not in cands: print('sem candidatura:', sq); continue
    linhas.append(f"({cands[sq]},{esc(p.get('resumo'))},{esc(json.dumps(p.get('propostas', []), ensure_ascii=False))},{esc(json.dumps(p.get('arquivos', [])))},{esc(p.get('concreto'))},'gemini-3.8-flash')")
for i in range(0, len(linhas), 40):
    d1('INSERT OR REPLACE INTO plano_governo (candidatura_id,resumo,propostas_json,arquivos_json,concreto,modelo) VALUES ' + ','.join(linhas[i:i + 40]))
print('planos no D1:', len(linhas))
lote, tam, n = [], 0, 0
def enviar():
    global lote, tam
    if lote: assert cf('PUT', f'storage/kv/namespaces/{KV}/bulk', lote)['success']
    lote, tam = [], 0
for nome in sorted(os.listdir(pasta)):
    if not nome.endswith('.zip'): continue
    z = zipfile.ZipFile(os.path.join(pasta, nome))
    for arq in z.namelist():
        if not re.search(r'\.pdf$', arq, re.I): continue
        dados = z.read(arq)
        if tam + len(dados) > 60_000_000: enviar()
        lote.append({'key': 'plano:' + arq.split('/')[-1], 'value': base64.b64encode(dados).decode(), 'base64': True}); tam += len(dados); n += 1
enviar()
print('PDFs no KV:', n)
