"""Reposição no Instagram (12/10/2026): peças que falharam quando o Buffer perdeu a autorização do IG.
Só Instagram (o TikTok já publicou). 1 por dia, 09h de Brasília, a partir de 13/10."""
import base64, datetime, json, os, urllib.request
ACC, KV = '22688effbd9ab181498d04ccd2cc8d2e', '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN'].strip()
def kv(method, path, data=None, ctype='application/json'):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/{path}', data=data, method=method, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': ctype})
    return urllib.request.urlopen(req, timeout=300).read()
ORDEM = ['fundo', 'sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'fundo_estados']
serie = json.load(open('serie_catchup.json', encoding='utf-8'))
fila = json.loads(kv('GET', 'values/fila_social')); ids = {i['id'] for i in fila}
for k, chave in enumerate(ORDEM):
    dia = datetime.date(2026, 10, 13) + datetime.timedelta(days=k)
    due = (datetime.datetime.combine(dia, datetime.time(9, 0)) + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:00.000Z')
    pc = serie[chave]; iid = f'ig_{chave}'
    if iid in ids: continue
    kv('PUT', 'bulk', json.dumps([{'key': f's:ig{dia}/{os.path.basename(a)}', 'value': base64.b64encode(open(a, 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 30} for a in pc['arquivos']]).encode())
    fila.append({'id': iid, 'dueAt': due, 'titulo': pc.get('titulo') or chave, 'legenda': pc['legenda'], 'imagens': [f'https://votocheck.com.br/midia/ig{dia}/{os.path.basename(a)}' for a in pc['arquivos']], 'redes': ['instagram'], 'status': 'aguardando'})
    print(iid, due)
kv('PUT', 'values/fila_social', json.dumps(fila, ensure_ascii=False).encode('utf-8'), 'text/plain; charset=utf-8')
print('fila', len(fila))
