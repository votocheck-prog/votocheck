"""VotoCheck — monitor de uso da Cloudflare (roda no GitHub Actions junto com a pauta diária).

Lê o consumo do mês (Workers, D1, KV) pela API de analytics e compara com:
  - o que o plano pago (Workers Paid, US$ 5/mês) já inclui — passar disso gera cobrança extra;
  - os limites do plano gratuito — para saber se dá para voltar ao free depois da eleição.
Manda e-mail quando alguma métrica passa de 60% do incluído (projeção do mês) e, às segundas,
um resumo semanal mesmo sem alerta. Variáveis: CF_TOKEN, RESEND_API_KEY, EMAIL_PARA (opcional).
"""
import os, json, datetime, calendar, urllib.request
ACC = '22688effbd9ab181498d04ccd2cc8d2e'
TOK = os.environ['CF_TOKEN']
hoje = datetime.date.today()
inicio = hoje.replace(day=1)
dias_mes = calendar.monthrange(hoje.year, hoje.month)[1]
dias_passados = max(1, (hoje - inicio).days + 1)
INCLUIDO = {  # plano Workers Paid, por mês
    'Workers · requisições': 10_000_000, 'Workers · CPU (ms)': 30_000_000,
    'D1 · linhas lidas': 25_000_000_000, 'D1 · linhas gravadas': 50_000_000,
    'KV · leituras': 10_000_000, 'KV · gravações': 1_000_000,
}
FREE_DIA = {'Workers · requisições': 100_000, 'D1 · linhas lidas': 5_000_000, 'D1 · linhas gravadas': 100_000, 'KV · leituras': 100_000, 'KV · gravações': 1_000}
q = '''{ viewer { accounts(filter:{accountTag:"%s"}) {
  w: workersInvocationsAdaptive(limit:100, filter:{date_geq:"%s"}) { sum { requests cpuTimeUs errors } quantiles { cpuTimeP99 } dimensions { date } }
  d: d1AnalyticsAdaptiveGroups(limit:100, filter:{date_geq:"%s"}) { sum { rowsRead rowsWritten } dimensions { date } }
  k: kvOperationsAdaptiveGroups(limit:200, filter:{date_geq:"%s"}) { sum { requests } dimensions { date actionType } }
  s: d1StorageAdaptiveGroups(limit:1, filter:{date_geq:"%s"}) { max { databaseSizeBytes } }
} } }''' % (ACC, inicio, inicio, inicio, hoje - datetime.timedelta(days=2))
req = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', data=json.dumps({'query': q}).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json', 'User-Agent': 'VotoCheck-monitor/1.0'})
a = json.load(urllib.request.urlopen(req, timeout=60))['data']['viewer']['accounts'][0]
por_dia = {}
def soma(chave, data, v):
    por_dia.setdefault(chave, {}).setdefault(data, 0); por_dia[chave][data] += v
for r in a['w']:
    soma('Workers · requisições', r['dimensions']['date'], r['sum']['requests'])
    soma('Workers · CPU (ms)', r['dimensions']['date'], r['sum']['cpuTimeUs'] / 1000)
for r in a['d']:
    soma('D1 · linhas lidas', r['dimensions']['date'], r['sum']['rowsRead'])
    soma('D1 · linhas gravadas', r['dimensions']['date'], r['sum']['rowsWritten'])
for r in a['k']:
    t = r['dimensions']['actionType']
    if t in ('read', 'write'):
        soma('KV · leituras' if t == 'read' else 'KV · gravações', r['dimensions']['date'], r['sum']['requests'])
cpu_p99 = max([r['quantiles']['cpuTimeP99'] for r in a['w']] or [0]) / 1000
linhas, alertas = [], []
for nome, inc in INCLUIDO.items():
    usado = sum(por_dia.get(nome, {}).values())
    proj = usado / dias_passados * dias_mes
    pct = 100 * proj / inc
    dias_acima_free = sum(1 for v in por_dia.get(nome, {}).values() if nome in FREE_DIA and v > FREE_DIA[nome])
    linhas.append(f"<tr><td>{nome}</td><td align=right>{usado:,.0f}</td><td align=right>{pct:.1f}%</td><td align=right>{dias_acima_free if nome in FREE_DIA else '—'}</td></tr>".replace(',', '.'))
    if pct >= 60: alertas.append(f'{nome}: projeção de {pct:.0f}% do incluído no mês')
tam = (a['s'][0]['max']['databaseSizeBytes'] / 1e6) if a['s'] else 0
if tam > 4000: alertas.append(f'D1 com {tam:.0f} MB (incluído: 5 GB)')
cabe_free = cpu_p99 <= 10 and all(v <= FREE_DIA[n] for n in FREE_DIA for v in por_dia.get(n, {}).values())
print('\n'.join(alertas) or 'sem alertas', '| CPU p99 máx:', cpu_p99, 'ms | caberia no free:', cabe_free)
if not alertas and hoje.weekday() != 0 and not os.environ.get('FORCAR'):
    raise SystemExit(0)
key = os.environ.get('RESEND_API_KEY')
if not key:
    raise SystemExit(0)
html = f"""<div style="font-family:Arial,sans-serif;max-width:620px;color:#0A1440">
<h2>{'⚠️ Alerta de uso da Cloudflare' if alertas else 'Resumo semanal de uso da Cloudflare'}</h2>
{''.join(f'<p style="color:#B24C1F"><b>{x}</b></p>' for x in alertas)}
<p>Mês até {hoje:%d/%m} ({dias_passados} de {dias_mes} dias). "Projeção" = ritmo atual estendido até o fim do mês, comparado ao que o plano pago já inclui.</p>
<table cellpadding=6 style="border-collapse:collapse;font-size:14px"><tr><th align=left>Métrica</th><th>Usado no mês</th><th>Projeção / incluído</th><th>Dias acima do limite free</th></tr>{''.join(linhas)}</table>
<p>Banco D1: {tam:.0f} MB. Pior CPU por requisição (p99 diário): {cpu_p99:.1f} ms (o plano free corta em 10 ms).</p>
<p><b>Voltaria para o plano free sem quebrar?</b> {'Sim, pelo consumo deste mês.' if cabe_free else 'Ainda não: algum limite diário do free ou o teto de CPU seria ultrapassado.'}</p></div>"""
body = {'from': 'VotoCheck <naoresponda@updates.votocheck.com.br>', 'to': [os.environ.get('EMAIL_PARA', 'votocheck@gmail.com')], 'subject': ('ALERTA ' if alertas else '') + f'VotoCheck · uso Cloudflare {hoje:%d/%m}', 'html': html}
r = urllib.request.Request('https://api.resend.com/emails', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'VotoCheck-monitor/1.0'})
print('e-mail:', urllib.request.urlopen(r, timeout=60).status)
