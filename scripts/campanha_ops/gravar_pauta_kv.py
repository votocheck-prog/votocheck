"""Grava no KV (pauta:<data>) um manifesto de pauta já agendado no Buffer por fora da fábrica.

Uso (PowerShell, na raiz do repositório):
    $env:CF_TOKEN = Get-Content ..\\..\\Adm\\API_Token\\Cloudflare_token.txt
    python scripts\\campanha_ops\\gravar_pauta_kv.py scripts\\campanha_ops\\pauta_2026-09-27_agendada.json

27/09/2026: a fábrica não agendou a pauta do dia (BUFFER_API_KEY não chegava ao GitHub Actions);
o Claude agendou pelo Buffer direto e este script sincroniza o KV, para /admin/pauta mostrar as
peças como agendadas e o "Recusar" conseguir apagar os posts no Buffer.
"""
import json, os, sys, urllib.request

ACC = '22688effbd9ab181498d04ccd2cc8d2e'
KV = '58aea9d36a9c4055bbcff72f7c08c3bd'
tok = os.environ['CF_TOKEN'].strip()
pauta = json.load(open(sys.argv[1], encoding='utf-8'))
corpo = [{'key': f"pauta:{pauta['data']}", 'value': json.dumps(pauta, ensure_ascii=False), 'expiration_ttl': 60 * 60 * 24 * 60}]
req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/bulk', method='PUT',
                             data=json.dumps(corpo).encode(), headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
r = json.load(urllib.request.urlopen(req, timeout=60))
print('ok' if r.get('success') else r)
