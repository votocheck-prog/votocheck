#!/usr/bin/env python3
"""VotoCheck — resultados oficiais de 2026 (resultados.tse.jus.br) → D1.

Uso (na raiz do repositório):
  python scripts/importar_resultados_2026.py            # 1º turno
  python scripts/importar_resultados_2026.py --turno 2  # 2º turno (depois de 25/10)
  python scripts/apply_d1.py scripts/output/resultado_2026_t1.sql

Gera:
  - scripts/output/resultado_2026_t<N>.sql  (UPDATE por sq_candidato_tse; 1 statement por bloco)
  - src/lib/resultado_2026.js                (metadados: data da totalização, 2º turno, totais)

Fonte: arquivos "-u.json" da divulgação oficial. Eleição federal (presidente) e estadual
(governador, senador, dep. federal, dep. estadual/distrital). O CDN do TSE devolve 403
intermitente: o script repete com espera crescente. Precisa da migration 0014 aplicada antes.
"""
import datetime, json, os, sys, time, urllib.request

TURNO = 2 if '--turno' in sys.argv and sys.argv[sys.argv.index('--turno') + 1] == '2' else 1
ELE = {1: ('6257', '6259'), 2: ('6258', '6260')}[TURNO]
BASE = 'https://resultados.tse.jus.br/oficial/ele2026'
UFS = 'ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to'.split()
CARGO_SLUG = {'1': 'presidente', '3': 'governador', '5': 'senador', '6': 'deputado_federal', '7': 'deputado_estadual', '8': 'deputado_distrital'}
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(RAIZ, 'scripts', 'input', f'resultados_2026_t{TURNO}')
os.makedirs(CACHE, exist_ok=True)
os.makedirs(os.path.join(RAIZ, 'scripts', 'output'), exist_ok=True)


def baixar(ele, uf, cargo):
    destino = os.path.join(CACHE, f'{uf}-c{cargo}.json')
    if os.path.exists(destino) and os.path.getsize(destino) > 500:
        return json.load(open(destino, encoding='utf-8'))
    url = f'{BASE}/{ele}/dados/{uf}/{uf}-c{cargo}-e00{ele}-u.json'
    for tentativa in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36', 'Accept': 'application/json'})
            bruto = urllib.request.urlopen(req, timeout=60).read()
            dado = json.loads(bruto)
            open(destino, 'wb').write(bruto)
            return dado
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(3 + 4 * tentativa)
        except Exception:
            time.sleep(3 + 4 * tentativa)
    raise SystemExit(f'Falhou: {url}')


def alvos():
    federal, estadual = ELE
    yield federal, 'br', '0001'
    for uf in UFS:
        for c in ('0003', '0005', '0006', '0008' if uf == 'df' else '0007'):
            if TURNO == 2 and c not in ('0003',):
                continue
            yield estadual, uf, c


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def pct(v):
    try:
        return round(float(str(v).replace(',', '.')), 2)
    except (TypeError, ValueError):
        return None


def q(s):
    return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"


linhas, segundo_turno, totais, data_tot = [], [], {}, None
governadores = {}
for ele, uf, cargo in alvos():
    d = baixar(ele, uf, cargo)
    if not d:
        continue
    try:
        quando = datetime.datetime.strptime(f"{d.get('dg')} {d.get('hg')}", '%d/%m/%Y %H:%M:%S')
        data_tot = max(data_tot, quando) if data_tot else quando
    except (TypeError, ValueError):
        pass
    for cg in d.get('carg', []):
        slug = CARGO_SLUG.get(str(cg.get('cd')).lstrip('0'))
        for agr in cg.get('agr', []):
            for par in agr.get('par', []):
                for c in par.get('cand', []):
                    st = c.get('st') or None
                    eleito = 1 if (st or '').startswith('Eleito') else 0
                    if st == '2º turno':
                        segundo_turno.append({'uf': uf.upper(), 'cargo': slug, 'sq': c['sqcand'], 'nome': c.get('nmu'), 'partido': par.get('sg'), 'numero': c.get('n'), 'votos': num(c.get('vap')), 'pct': pct(c.get('pvap'))})
                    if slug == 'governador' and (eleito or st == '2º turno'):
                        governadores.setdefault(uf.upper(), []).append({'sq': c['sqcand'], 'nome': c.get('nmu'), 'partido': par.get('sg'), 'situacao': st, 'pct': pct(c.get('pvap'))})
                    if eleito:
                        chave = f"{uf.upper()}|{slug}"
                        totais[chave] = totais.get(chave, 0) + 1
                    linhas.append(
                        f"UPDATE candidatura SET situacao_totalizacao_turno = {q(st)}, votos_t{TURNO} = {num(c.get('vap')) if num(c.get('vap')) is not None else 'NULL'}, "
                        f"pct_t{TURNO} = {pct(c.get('pvap')) if pct(c.get('pvap')) is not None else 'NULL'}, eleito = {eleito} "
                        f"WHERE ano_eleicao = 2026 AND sq_candidato_tse = {q(c['sqcand'])};"
                    )

saida = os.path.join(RAIZ, 'scripts', 'output', f'resultado_2026_t{TURNO}.sql')
open(saida, 'w', encoding='utf-8').write('\n\n'.join(linhas) + '\n')
print(f'{len(linhas)} candidaturas → {saida}')

if TURNO == 1:
    # 2º turno ordenado pela votação do 1º turno (dado do TSE), dentro de cada disputa.
    segundo_turno.sort(key=lambda x: (x['cargo'] != 'presidente', x['uf'], -(x['votos'] or 0)))
    meta = {
        'fonte': 'TSE — resultados.tse.jus.br (divulgação oficial)',
        'totalizacao_t1': data_tot.strftime('%d/%m/%Y %H:%M') if data_tot else None,
        'segundo_turno': segundo_turno,
        'eleitos_t1': totais,
        'governadores': {k: sorted(v, key=lambda x: -(x['pct'] or 0)) for k, v in sorted(governadores.items())},
        'candidaturas_totalizadas': len(linhas),
    }
    js = (
        '// Gerado por scripts/importar_resultados_2026.py — NÃO editar à mão.\n'
        '// Metadados do resultado oficial de 2026 (1º turno). O detalhe por candidatura está no D1\n'
        '// (candidatura.situacao_totalizacao_turno, votos_t1, pct_t1, eleito — migration 0014).\n'
        f'export const RESULTADO_2026 = {json.dumps(meta, ensure_ascii=False, indent=1)};\n'
    )
    open(os.path.join(RAIZ, 'src', 'lib', 'resultado_2026.js'), 'w', encoding='utf-8').write(js)
    print('src/lib/resultado_2026.js atualizado;', len(segundo_turno), 'no 2º turno;', sum(totais.values()), 'eleitos no 1º turno')
