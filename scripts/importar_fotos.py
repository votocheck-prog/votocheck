"""Importa as fotos oficiais dos candidatos 2026 (TSE) para o KV e aponta pessoa.foto_url para /foto/<sq>.jpg.

Entrada: pasta com os zips do TSE "foto_cand2026_<UF>_div.zip" (Portal de Dados Abertos do TSE →
Candidatos 2026 → Fotos). Cada foto se chama F<UF><SQ_CANDIDATO>_div.jpg (ou .jpeg).
Uso:  CF_TOKEN=... python3 scripts/importar_fotos.py /caminho/dos/zips [UF ...]
Reduz para 240 px de largura (JPEG q80, ~10 KB), sobe em lotes para o KV "OG" e, para as candidaturas
de 2026 encontradas, grava pessoa.foto_url = '/foto/<sq>.jpg' (a foto do TSE passa a valer para
todos, inclusive quem tinha foto da Câmara/Senado — mesma fonte para todo mundo).
"""
import os, sys, io, re, json, zipfile, base64, urllib.request
from PIL import Image
ACC = '22688effbd9ab181498d04ccd2cc8d2e'; DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'; KV = '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN']
def cf(metodo, caminho, corpo):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/{caminho}', method=metodo, data=json.dumps(corpo).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))
def d1(sql, params=None):
    return cf('POST', f'd1/database/{DB}/query', {'sql': sql, **({'params': params} if params else {})})['result'][0]['results']
pasta = sys.argv[1]; ufs = set(u.upper() for u in sys.argv[2:])
sq_validos = {r['sq_candidato_tse']: r['pessoa_id'] for r in d1('SELECT sq_candidato_tse, pessoa_id FROM candidatura WHERE ano_eleicao=2026')}
lote, feitos = [], []
def enviar():
    global lote
    if lote: cf('PUT', f'storage/kv/namespaces/{KV}/bulk', lote); lote = []
for nome in sorted(os.listdir(pasta)):
    m = re.match(r'foto_cand2026_([A-Z]{2})_div\.zip$', nome, re.I)
    if not m or (ufs and m.group(1).upper() not in ufs): continue
    with zipfile.ZipFile(os.path.join(pasta, nome)) as z:
        for arq in z.namelist():
            mm = re.search(r'F[A-Z]{2}(\d+)_div\.jpe?g$', arq, re.I)
            if not mm or mm.group(1) not in sq_validos: continue
            try:
                im = Image.open(io.BytesIO(z.read(arq))).convert('RGB')
                im.thumbnail((240, 320)); b = io.BytesIO(); im.save(b, 'JPEG', quality=80, optimize=True)
            except Exception as e:
                print('falhou', arq, e); continue
            lote.append({'key': f'foto:{mm.group(1)}', 'value': base64.b64encode(b.getvalue()).decode(), 'base64': True})
            feitos.append(mm.group(1))
            if len(lote) >= 400: enviar()
    enviar(); print(nome, len(feitos))
for i in range(0, len(feitos), 80):
    parte = feitos[i:i + 80]
    d1('UPDATE pessoa SET foto_url = CASE ' + ' '.join(f"WHEN id = {sq_validos[s]} THEN '/foto/{s}.jpg'" for s in parte) + f" ELSE foto_url END WHERE id IN ({','.join(str(sq_validos[s]) for s in parte)})")
print('fotos importadas:', len(feitos))
