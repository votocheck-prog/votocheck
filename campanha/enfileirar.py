"""Sobe as imagens da série para o KV e grava a fila (fila_social) — o cron diário do Worker agenda no Buffer."""
import base64, datetime, json, os, sys, urllib.request
ACC, KV = '22688effbd9ab181498d04ccd2cc8d2e', '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN'].strip()
def kv(method, path, data=None, ctype='application/json'):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/{path}', data=data, method=method, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': ctype})
    return urllib.request.urlopen(req, timeout=300).read()
serie = json.load(open(sys.argv[1], encoding='utf-8'))
ordem = sys.argv[2].split(',')
inicio = datetime.date.fromisoformat(sys.argv[3])
horarios = ['12:00', '19:00']
try:
    fila = json.loads(kv('GET', 'values/fila_social'))
except Exception:
    fila = []
ids = {i['id'] for i in fila}
NOMES = {'ac':'Acre','al':'Alagoas','ap':'Amapá','am':'Amazonas','ba':'Bahia','ce':'Ceará','df':'Distrito Federal','es':'Espírito Santo','go':'Goiás','ma':'Maranhão','mt':'Mato Grosso','ms':'Mato Grosso do Sul','mg':'Minas Gerais','pa':'Pará','pb':'Paraíba','pr':'Paraná','pe':'Pernambuco','pi':'Piauí','rj':'Rio de Janeiro','rn':'Rio Grande do Norte','rs':'Rio Grande do Sul','ro':'Rondônia','rr':'Roraima','sc':'Santa Catarina','sp':'São Paulo','se':'Sergipe','to':'Tocantins'}
for k, uf in enumerate(ordem):
    dia = inicio + datetime.timedelta(days=k // 2); hh = horarios[k % 2]
    due = (datetime.datetime.fromisoformat(f'{dia}T{hh}') + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:00.000Z')
    arqs = serie[uf]['arquivos']
    itens = [{'key': f's:{dia}/{os.path.basename(a)}', 'value': base64.b64encode(open(a, 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 30} for a in arqs]
    kv('PUT', 'bulk', json.dumps(itens).encode())
    iid = f'eleitos_{uf}'
    if iid in ids: continue
    fila.append({'id': iid, 'dueAt': due, 'titulo': f'Eleitos 2026 · {NOMES[uf]}', 'legenda': serie[uf]['legenda'], 'imagens': [f'https://votocheck.com.br/midia/{dia}/{os.path.basename(a)}' for a in arqs], 'redes': ['instagram', 'tiktok'], 'status': 'aguardando'})
    print(uf, due)
kv('PUT', 'values/fila_social', json.dumps(fila, ensure_ascii=False).encode('utf-8'), 'text/plain; charset=utf-8')
print('fila', len(fila))
