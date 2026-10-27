"""Sobe o lote C1 (lote_c1.json) para o KV e coloca na fila_social. 19h de Brasília, 1 peça por dia."""
import base64, datetime, json, os, urllib.request
ACC, KV = '22688effbd9ab181498d04ccd2cc8d2e', '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN'].strip()
def kv(method, path, data=None, ctype='application/json'):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/{path}', data=data, method=method, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': ctype})
    return urllib.request.urlopen(req, timeout=300).read()
AGENDA = [('reel_lembra', '2026-10-28'), ('car_cobrar', '2026-10-29'), ('est_enquete', '2026-10-30'), ('car_posse', '2026-10-31'), ('reel_fundo', '2026-11-01'), ('car_seis', '2026-11-02')]
serie = json.load(open('lote_c1.json', encoding='utf-8'))
fila = json.loads(kv('GET', 'values/fila_social'))
ids = {i['id'] for i in fila}
for chave, dia in AGENDA:
    pc = serie[chave]
    iid = f'c1_{chave}'
    if iid in ids:
        print('já na fila', iid); continue
    y, m, d = map(int, dia.split('-'))
    due = (datetime.datetime(y, m, d, 19, 0) + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:00.000Z')
    arqs = list(pc['arquivos']) + ([pc['video']] if pc.get('video') else [])
    for a in arqs:  # 1 por chamada: vídeos são grandes
        kv('PUT', 'bulk', json.dumps([{'key': f's:{dia}/c1_{os.path.basename(a)}', 'value': base64.b64encode(open(a, 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 30}]).encode())
    item = {'id': iid, 'dueAt': due, 'titulo': pc['titulo'], 'legenda': pc['legenda'], 'redes': ['instagram', 'tiktok'], 'status': 'aguardando'}
    if pc.get('video'):
        item['video'] = {'url': f'https://votocheck.com.br/midia/{dia}/c1_{os.path.basename(pc["video"])}'}
        item['imagens'] = []
    else:
        item['imagens'] = [f'https://votocheck.com.br/midia/{dia}/c1_{os.path.basename(a)}' for a in pc['arquivos']]
    fila.append(item); print(iid, due, len(arqs))
kv('PUT', 'values/fila_social', json.dumps(fila, ensure_ascii=False).encode('utf-8'), 'text/plain; charset=utf-8')
print('fila', len(fila))
