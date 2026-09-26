"""Importa as receitas de campanha 2026 (TSE, prestação de contas de candidatos) para financiamento_campanha.

Uso: CF_TOKEN=... python3 scripts/importar_financiamento.py prestacao_de_contas_eleitorais_candidatos_2026.zip
Lê receitas_candidatos_2026_BRASIL.csv e soma, por SQ_CANDIDATO: fundo eleitoral (FEFC), fundo partidário,
pessoas físicas, recursos próprios e o resto. Inclui recursos estimáveis (serviços/materiais doados),
como o TSE. Valores recebidos de outros candidatos contam para quem recebeu.
"""
import os, sys, csv, io, json, zipfile, collections, urllib.request
ACC = '22688effbd9ab181498d04ccd2cc8d2e'; DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'; TOK = os.environ['CF_TOKEN']
def d1(sql):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps({'sql': sql}).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))['result'][0]['results']
z = zipfile.ZipFile(sys.argv[1])
soma = collections.defaultdict(lambda: collections.Counter()); data_ref = ''
with z.open('receitas_candidatos_2026_BRASIL.csv') as f:
    for r in csv.DictReader(io.TextIOWrapper(f, encoding='latin-1'), delimiter=';'):
        v = float(r['VR_RECEITA'].replace('.', '').replace(',', '.')) if r['VR_RECEITA'].count(',') else float(r['VR_RECEITA'])
        fonte, origem = r['DS_FONTE_RECEITA'], r['DS_ORIGEM_RECEITA']
        k = 'fefc' if fonte == 'FUNDO ESPECIAL' else 'fundo_partidario' if fonte == 'FUNDO PARTIDARIO' else 'pessoas_fisicas' if origem == 'Recursos de pessoas físicas' else 'recursos_proprios' if origem == 'Recursos próprios' else 'outros'
        soma[r['SQ_CANDIDATO']][k] += v
        data_ref = max(data_ref, r['DT_GERACAO'][6:] + '-' + r['DT_GERACAO'][3:5] + '-' + r['DT_GERACAO'][:2])
cands = {r['sq_candidato_tse']: r['id'] for r in d1('SELECT id, sq_candidato_tse FROM candidatura WHERE ano_eleicao = 2026')}
linhas = []
for sq, c in soma.items():
    if sq not in cands: continue
    tot = sum(c.values())
    linhas.append(f"({cands[sq]},{c['fefc']:.2f},{c['fundo_partidario']:.2f},{c['pessoas_fisicas']:.2f},{c['recursos_proprios']:.2f},{c['outros']:.2f},{tot:.2f},'{data_ref}')")
d1('DELETE FROM financiamento_campanha')
for i in range(0, len(linhas), 300):
    d1('INSERT INTO financiamento_campanha (candidatura_id,fefc,fundo_partidario,pessoas_fisicas,recursos_proprios,outros,total,data_referencia) VALUES ' + ','.join(linhas[i:i + 300]))
print('candidaturas com receitas:', len(linhas), 'de', len(soma), '| dados de', data_ref)
