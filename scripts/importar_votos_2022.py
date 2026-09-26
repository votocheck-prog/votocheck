"""Liga os resultados de 2022 (deputado federal e estadual/distrital, resultados.tse.jus.br) às pessoas
do VotoCheck por nome completo + data de nascimento, e grava em votos_2022 (migração 0011).
Uso: CF_TOKEN=... python3 scripts/importar_votos_2022.py /pasta/com/<uf>.json e <uf>_est.json
"""
import os, sys, json, glob, unicodedata, urllib.request
ACC = '22688effbd9ab181498d04ccd2cc8d2e'; DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'; TOK = os.environ['CF_TOKEN']
def d1(sql):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps({'sql': sql}).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))['result'][0]['results']
def dtbr(x):
    x = (x or '')[:10]
    return f'{x[8:10]}/{x[5:7]}/{x[:4]}' if len(x) == 10 and x[4] == '-' else x
norm = lambda s: ' '.join(unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().upper().split())
pessoas = {}
for r in d1('SELECT id, nome_completo, data_nascimento FROM pessoa WHERE data_nascimento IS NOT NULL'):
    pessoas.setdefault((norm(r['nome_completo']), dtbr(r['data_nascimento'])), r['id'])
linhas, casados, total = [], 0, 0
for f in sorted(glob.glob(os.path.join(sys.argv[1], '*.json'))):
    cargo = 'deputado_estadual' if f.endswith('_est.json') else 'deputado_federal'
    d = json.load(open(f)); uf = d['cdabr'].upper()
    for agr in d['carg'][0]['agr']:
        for par in agr['par']:
            for c in par['cand']:
                total += 1
                pid = pessoas.get((norm(c['nm']), c.get('dt', '')))
                if not pid: continue
                casados += 1
                st = (c.get('st') or '').replace("'", "''")
                linhas.append(f"({pid},'{cargo}','{uf}','{c['sqcand']}',{int(c.get('vap') or 0)},'{st}')")
d1('DELETE FROM votos_2022')
for i in range(0, len(linhas), 400):
    d1('INSERT OR REPLACE INTO votos_2022 (pessoa_id,cargo,sg_uf,sq_2022,votos,situacao) VALUES ' + ','.join(linhas[i:i + 400]))
print(f'candidatos 2022: {total} · ligados a pessoas do VotoCheck: {casados}')

# 2ª passada: quem não casou por nome completo (ex.: nome vindo da Câmara diferente do TSE) casa por
# data de nascimento + UF + primeiro e último nome (no nome completo ou no nome de urna de 2022).
ja = {int(l.split(',')[0][1:]) for l in linhas}
cands26 = d1("SELECT p.id, p.nome_completo, p.nome_urna_atual, p.data_nascimento, c.sg_uf FROM pessoa p JOIN candidatura c ON c.pessoa_id = p.id WHERE c.ano_eleicao = 2026 AND p.data_nascimento IS NOT NULL")
idx = {}
for f in sorted(glob.glob(os.path.join(sys.argv[1], '*.json'))):
    cargo = 'deputado_estadual' if f.endswith('_est.json') else 'deputado_federal'
    d = json.load(open(f)); uf = d['cdabr'].upper()
    for agr in d['carg'][0]['agr']:
        for par in agr['par']:
            for c in par['cand']:
                idx.setdefault((c.get('dt', ''), uf), []).append((cargo, c))
extra = []
for p in cands26:
    if p['id'] in ja: continue
    toks = [set([t[0], t[-1]]) for t in (norm(p['nome_completo']).split(), norm(p['nome_urna_atual']).split()) if t]
    for cargo, c in idx.get((dtbr(p['data_nascimento']), p['sg_uf']), []):
        alvo = [norm(c['nm']).split(), norm(c.get('nmu', '')).split()]
        if any(t and a and (t <= set(a)) for t in toks for a in alvo):
            st = (c.get('st') or '').replace("'", "''")
            extra.append(f"({p['id']},'{cargo}','{p['sg_uf']}','{c['sqcand']}',{int(c.get('vap') or 0)},'{st}')"); ja.add(p['id']); break
for i in range(0, len(extra), 400):
    d1('INSERT OR REPLACE INTO votos_2022 (pessoa_id,cargo,sg_uf,sq_2022,votos,situacao) VALUES ' + ','.join(extra[i:i + 400]))
print('2ª passada, ligados a mais:', len(extra))
