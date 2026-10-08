"""VotoCheck — composição do Congresso a partir de 2027 (08/10/2026). Gera src/lib/bancada_2027.js.
Câmara 2027 = 513 eleitos em 2026 (TSE, resultado do 1º turno, número do partido).
Senado 2027 = 54 eleitos em 2026 + 27 senadores com mandato até 2031 (Senado, lista atual, SegundaLegislatura 58).
Hoje = em exercício na data de geração (Câmara /deputados e Senado /lista/atual).
Uso: python scripts/gerar_bancada_2027.py <pasta r26> (arquivos <uf>-c0005.json / -c0006.json / -c0007|8.json)"""
import collections, datetime, glob, json, os, sys, unicodedata, urllib.request
R26 = sys.argv[1] if len(sys.argv) > 1 else 'scripts/input/resultados_2026_t1'
PINFO = [["PT",13],["PL",22],["MDB",15],["PSDB",45],["PP",11],["União Brasil",44],["PSD",55],["Republicanos",10],["PDT",12],["PSB",40],["PSOL",50],["PCdoB",65],["Podemos",20],["Novo",30],["Cidadania",23],["Solidariedade",77],["Rede",18],["PV",43],["Avante",70],["MISSÃO",14],["PSTU",16],["PCB",21],["PRD",25],["DC",27],["PRTB",28],["PCO",29],["Mobiliza",33],["Democrata",35],["Agir",36],["UP",80]]
def norm(s): return unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().upper().strip()
ALIAS = {'UNIAO': 'UNIAO BRASIL', 'PODE': 'PODEMOS'}
NUM = {norm(s): n for s, n in PINFO}
def num_sigla(s):
    n = norm(s); n = ALIAS.get(n, n)
    return NUM.get(n)
def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'VotoCheck/1.0'}), timeout=60))
def eleitos(cargos):
    c = collections.Counter()
    for f in glob.glob(os.path.join(R26, '*.json')):
        if not any(f.endswith(f'-c{x}.json') for x in cargos): continue
        for cg in json.load(open(f, encoding='utf-8'))['carg']:
            for ag in cg.get('agr', []):
                for p in ag['par']:
                    for k in p['cand']:
                        if (k.get('st') or '').startswith('Eleito'): c[int(p['n'])] += 1
    return c
cam27 = eleitos(['0006']); est27 = eleitos(['0007', '0008']); sen_el = eleitos(['0005'])
deps = get('https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1000')['dados']
cam_hoje = collections.Counter(num_sigla(d['siglaPartido']) for d in deps)
sens = get('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json')['ListaParlamentarEmExercicio']['Parlamentares']['Parlamentar']
sen_hoje = collections.Counter(); sen_cont = collections.Counter(); cont = []
for s in sens:
    i = s['IdentificacaoParlamentar']; n = num_sigla(i['SiglaPartidoParlamentar'])
    sen_hoje[n] += 1
    if ((s.get('Mandato') or {}).get('SegundaLegislaturaDoMandato') or {}).get('NumeroLegislatura') == '58':
        sen_cont[n] += 1; cont.append(i['NomeParlamentar'])
sen27 = sen_el + sen_cont
partidos = {}
for sigla, n in PINFO:
    partidos[n] = {'sigla': sigla, 'camara_hoje': cam_hoje.get(n, 0), 'camara_2027': cam27.get(n, 0), 'senado_hoje': sen_hoje.get(n, 0), 'senado_2027': sen27.get(n, 0), 'senado_eleitos_2026': sen_el.get(n, 0), 'estaduais_2027': est27.get(n, 0)}
meta = {'gerado_em': datetime.date.today().isoformat(), 'camara_total_2027': sum(cam27.values()), 'senado_total_2027': sum(sen27.values()), 'camara_hoje_total': len(deps), 'senado_hoje_total': len(sens),
        'sem_partido_hoje': {'camara': cam_hoje.get(None, 0), 'senado': sen_hoje.get(None, 0)}, 'senado_continuam': len(cont), 'estaduais_total_2027': sum(est27.values())}
js = ('// Gerado por scripts/gerar_bancada_2027.py — NÃO editar à mão.\n'
      f'export const BANCADA_2027 = {json.dumps({"meta": meta, "partidos": partidos}, ensure_ascii=False, indent=1)};\n')
open('src/lib/bancada_2027.js', 'w', encoding='utf-8').write(js)
print(json.dumps(meta, ensure_ascii=False))
print(sorted(((v['camara_2027'] - v['camara_hoje'], v['sigla']) for v in partidos.values())))
