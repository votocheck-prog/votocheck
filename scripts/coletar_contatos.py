"""VotoCheck — contatos oficiais de gabinete (08/10/2026).
Câmara: /api/v2/deputados (em exercício) → e-mail; /deputados/{id} → telefone do gabinete.
Senado: /dadosabertos/senador/lista/atual.json → e-mail e telefone.
Liga por pessoa.id_camara / pessoa.id_senado e grava em contato_oficial (migration 0017).
Uso: CF_TOKEN=... python scripts/coletar_contatos.py"""
import json, os, time, urllib.request
ACC, DB = '22688effbd9ab181498d04ccd2cc8d2e', '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'
TOK = os.environ['CF_TOKEN'].strip()
def d1(sql, params=None):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps({'sql': sql, 'params': params or []}).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))['result'][0]['results']
def get(url):
    for t in range(5):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'VotoCheck/1.0 (votocheck.com.br)'}), timeout=60))
        except Exception:
            time.sleep(2 + 3 * t)
    return None
def q(s): return "'" + str(s).replace("'", "''") + "'"
pid_cam = {str(r['id_camara']): r['id'] for r in d1('SELECT id, id_camara FROM pessoa WHERE id_camara IS NOT NULL')}
pid_sen = {str(r['id_senado']): r['id'] for r in d1('SELECT id, id_senado FROM pessoa WHERE id_senado IS NOT NULL')}
linhas = []
deps = get('https://dadosabertos.camara.leg.br/api/v2/deputados?itens=600&ordem=ASC&ordenarPor=nome')['dados']
for d in deps:
    pid = pid_cam.get(str(d['id']))
    if not pid: continue
    url = f"https://www.camara.leg.br/deputados/{d['id']}"
    if d.get('email'): linhas.append((pid, 'email', d['email'].lower(), 'Câmara dos Deputados', url))
    det = get(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d['id']}")
    g = ((det or {}).get('dados') or {}).get('ultimoStatus', {}).get('gabinete') or {}
    if g.get('telefone'): linhas.append((pid, 'telefone', f"(61) {g['telefone']}", 'Câmara dos Deputados', url))
sen = get('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json')['ListaParlamentarEmExercicio']['Parlamentares']['Parlamentar']
for s in sen:
    i = s['IdentificacaoParlamentar']; pid = pid_sen.get(str(i['CodigoParlamentar']))
    if not pid: continue
    url = i.get('UrlPaginaParlamentar', '').replace('http://', 'https://')
    if i.get('EmailParlamentar'): linhas.append((pid, 'email', i['EmailParlamentar'].lower(), 'Senado Federal', url))
    tel = ((i.get('Telefones') or {}).get('Telefone') or [{}])
    tel = tel if isinstance(tel, list) else [tel]
    if tel and tel[0].get('NumeroTelefone'): linhas.append((pid, 'telefone', f"(61) {tel[0]['NumeroTelefone']}", 'Senado Federal', url))
print('deputados', len(deps), 'senadores', len(sen), 'linhas', len(linhas))
for i in range(0, len(linhas), 80):
    d1('INSERT OR REPLACE INTO contato_oficial (pessoa_id, tipo, valor, fonte, url_fonte, coletado_em) VALUES ' + ','.join(f"({a},{q(b)},{q(c)},{q(e)},{q(f)},datetime('now'))" for a, b, c, e, f in linhas[i:i + 80]))
print('ok')
