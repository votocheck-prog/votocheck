"""Temas dos projetos apresentados por deputados federais (legislatura 57, 2023–2026).

Baixa os arquivos abertos da Câmara (autores + temas por ano), conta, para cada deputado, os PL/PLP/PEC/PDL
separando autoria principal (1º signatário) de coautoria, e agrupa pelos temas oficiais da Câmara.
Grava em autoria_temas (migração 0009): total/temas_json = autor principal; total_coautor/temas_coautor_json = coautor.
Uso: CF_TOKEN=... python3 scripts/importar_autoria_temas.py [pasta_cache]
"""
import os, sys, csv, json, collections, urllib.request
ACC = '22688effbd9ab181498d04ccd2cc8d2e'; DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'
TOK = os.environ['CF_TOKEN']; PASTA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/camara'
ANOS = [2023, 2024, 2025, 2026]; TIPOS = {'PL', 'PLP', 'PEC', 'PDL'}
def d1(sql):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps({'sql': sql}).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))['result'][0]['results']
os.makedirs(PASTA, exist_ok=True)
def arquivo(t, a):
    f = os.path.join(PASTA, f'{t}-{a}.csv')
    if not os.path.exists(f):
        urllib.request.urlretrieve(f'https://dadosabertos.camara.leg.br/arquivos/{t}/csv/{t}-{a}.csv', f)
    return f
temas = {}
for a in ANOS:
    for r in csv.DictReader(open(arquivo('proposicoesTemas', a), encoding='utf-8-sig'), delimiter=';'):
        if r['siglaTipo'] in TIPOS:
            temas.setdefault(r['uriProposicao'].rsplit('/', 1)[1], set()).add(r['tema'])
autoria = collections.defaultdict(set); coautoria = collections.defaultdict(set)
for a in ANOS:
    for r in csv.DictReader(open(arquivo('proposicoesAutores', a), encoding='utf-8-sig'), delimiter=';'):
        if r['idDeputadoAutor'] and r['idProposicao'] in temas:
            (autoria if r['ordemAssinatura'] == '1' else coautoria)[r['idDeputadoAutor']].add(r['idProposicao'])
pessoas = {str(r['id_camara']): r['id'] for r in d1("SELECT id, id_camara FROM pessoa WHERE id_camara IS NOT NULL AND id_camara <> ''")}
linhas = []
def top(props):
    c = collections.Counter(t for p in props for t in temas[p])
    return json.dumps([{'tema': t, 'n': n} for t, n in c.most_common(8)], ensure_ascii=False).replace("'", "''")
for dep in set(autoria) | set(coautoria):
    if dep not in pessoas: continue
    a, co = autoria.get(dep, set()), coautoria.get(dep, set()) - autoria.get(dep, set())
    linhas.append(f"INSERT OR REPLACE INTO autoria_temas (pessoa_id, casa, periodo, total, temas_json, total_coautor, temas_coautor_json) VALUES ({pessoas[dep]}, 'camara', '2023–2026', {len(a)}, '{top(a)}', {len(co)}, '{top(co)}')")
for i in range(0, len(linhas), 40):
    d1(';'.join(linhas[i:i + 40]))
print('deputados com temas:', len(linhas))
