"""Sobe o lote hunter (serie_hunter.json) para o KV e coloca na fila_social. Horário: 21h de Brasília."""
import base64, json, os, urllib.request
ACC, KV = '22688effbd9ab181498d04ccd2cc8d2e', '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN'].strip()
def kv(method, path, data=None, ctype='application/json'):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/{path}', data=data, method=method, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': ctype})
    return urllib.request.urlopen(req, timeout=300).read()
AGENDA = {'custo_voto': '2026-10-13', 'cidade': '2026-10-15', 'cobrar': '2026-10-17', 'cota': '2026-10-20'}
serie = json.load(open('serie_hunter.json', encoding='utf-8'))
fila = json.loads(kv('GET', 'values/fila_social'))
ids = {i['id'] for i in fila}
for chave, dia in AGENDA.items():
    pc = serie[chave]
    y, m, d = map(int, dia.split('-'))
    import datetime
    due = (datetime.datetime(y, m, d, 21, 0) + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:00.000Z')
    arqs = list(pc['arquivos']) + ([pc['video']] if pc.get('video') else [])
    kv('PUT', 'bulk', json.dumps([{'key': f's:{dia}/{os.path.basename(a)}', 'value': base64.b64encode(open(a, 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 30} for a in arqs]).encode())
    iid = f'hunter_{chave}'
    if iid in ids:
        print('já na fila', iid); continue
    item = {'id': iid, 'dueAt': due, 'titulo': pc['titulo'], 'legenda': pc['legenda'], 'comentario': pc.get('comentario'), 'redes': ['instagram', 'tiktok'], 'status': 'aguardando'}
    if pc.get('video'):
        item['video'] = {'url': f'https://votocheck.com.br/midia/{dia}/{os.path.basename(pc["video"])}', 'capa': f'https://votocheck.com.br/midia/{dia}/{os.path.basename(pc["capa"])}'}
        item['imagens'] = []
    else:
        item['imagens'] = [f'https://votocheck.com.br/midia/{dia}/{os.path.basename(a)}' for a in pc['arquivos']]
    fila.append(item); print(iid, due)
kv('PUT', 'values/fila_social', json.dumps(fila, ensure_ascii=False).encode('utf-8'), 'text/plain; charset=utf-8')
print('fila', len(fila))
