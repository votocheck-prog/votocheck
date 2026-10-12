"""
VotoCheck — importa a cota parlamentar (CEAP) da Câmara para o D1 (12/10/2026).

Fonte: https://www.camara.leg.br/cotas/Ano-<ano>.csv.zip (arquivo oficial, atualizado diariamente).
Agrega por deputado (ideCadastro = id da API da Câmara = pessoa.id_camara) e por categoria.
Gera as tabelas `cota_resumo` e `cota_parlamentar` (migration 0018) e grava via API do D1.

Uso:  CF_TOKEN=... python scripts/importar_cota.py [--ano 2026] [--csv caminho.csv]
Rodar de novo substitui os dados do ano (DELETE + INSERT). Pendência: automatizar no cron semanal.
"""
import argparse, csv, collections, io, json, os, sys, urllib.request, zipfile, datetime

ACC = os.environ.get("CF_ACCOUNT_ID", "22688effbd9ab181498d04ccd2cc8d2e")
DB = os.environ.get("CF_D1_ID", "1de4bbee-3c8c-4043-91f9-fafd527c2f1f")
TOKEN = os.environ["CF_TOKEN"]


def d1(sql, params=None):
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query",
        data=json.dumps({"sql": sql, "params": params or []}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
    )
    r = json.load(urllib.request.urlopen(req, timeout=120))
    if not r.get("success"):
        raise SystemExit(r)
    return r["result"][0]["results"]


def num(v):
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return 0.0


ap = argparse.ArgumentParser()
ap.add_argument("--ano", type=int, default=2026)
ap.add_argument("--csv")
a = ap.parse_args()

if a.csv:
    texto = open(a.csv, encoding="utf-8-sig").read()
else:
    url = f"https://www.camara.leg.br/cotas/Ano-{a.ano}.csv.zip"
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url, timeout=300).read()))
    texto = z.read(z.namelist()[0]).decode("utf-8-sig")

dep = {}
cat = collections.defaultdict(lambda: [0.0, 0])
for x in csv.DictReader(io.StringIO(texto), delimiter=";"):
    i = x["ideCadastro"]
    if not i:
        continue  # lideranças/órgãos, não deputado
    v = num(x["vlrLiquido"])
    d = dep.setdefault(i, {"nome": x["txNomeParlamentar"], "partido": x["sgPartido"], "uf": x["sgUF"], "total": 0.0, "div": 0.0, "mes": [0.0] * 12})
    d["partido"], d["uf"] = x["sgPartido"] or d["partido"], x["sgUF"] or d["uf"]
    d["total"] += v
    if "DIVULGA" in x["txtDescricao"].upper():
        d["div"] += v
        m = int(x["numMes"] or 0)
        if 1 <= m <= 12:
            d["mes"][m - 1] += v
    c = cat[(i, x["txtDescricao"].strip().rstrip("."))]
    c[0] += v
    c[1] += 1

hoje = datetime.date.today().isoformat()
d1("""CREATE TABLE IF NOT EXISTS cota_resumo (
  id_camara TEXT NOT NULL, ano INTEGER NOT NULL, nome TEXT, partido TEXT, uf TEXT,
  total REAL NOT NULL DEFAULT 0, divulgacao REAL NOT NULL DEFAULT 0, divulgacao_mes TEXT,
  atualizado_em TEXT, PRIMARY KEY (id_camara, ano))""")
d1("CREATE INDEX IF NOT EXISTS idx_cota_resumo_uf ON cota_resumo (ano, uf)")
d1("""CREATE TABLE IF NOT EXISTS cota_parlamentar (
  id_camara TEXT NOT NULL, ano INTEGER NOT NULL, categoria TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0, docs INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (id_camara, ano, categoria))""")
d1("DELETE FROM cota_resumo WHERE ano = ?", [a.ano])
d1("DELETE FROM cota_parlamentar WHERE ano = ?", [a.ano])

linhas = [(i, a.ano, d["nome"], d["partido"], d["uf"], round(d["total"], 2), round(d["div"], 2), json.dumps([round(m, 2) for m in d["mes"]]), hoje) for i, d in dep.items()]
for k in range(0, len(linhas), 10):
    lote = linhas[k : k + 10]
    d1("INSERT INTO cota_resumo VALUES " + ",".join(["(?,?,?,?,?,?,?,?,?)"] * len(lote)), [v for l in lote for v in l])
cats = [(i, a.ano, c, round(v[0], 2), v[1]) for (i, c), v in cat.items()]
for k in range(0, len(cats), 20):
    lote = cats[k : k + 20]
    d1("INSERT INTO cota_parlamentar VALUES " + ",".join(["(?,?,?,?,?)"] * len(lote)), [v for l in lote for v in l])

tot = sum(d["total"] for d in dep.values())
div = sum(d["div"] for d in dep.values())
print(f"{len(dep)} deputados, {len(cats)} linhas de categoria; total R$ {tot/1e6:.1f} mi, divulgação R$ {div/1e6:.1f} mi")
