#!/usr/bin/env python3
"""Redeploy do Worker votocheck-coletor via API REST da Cloudflare (multipart),
replicando o método já usado na implantação original (sem wrangler CLI)."""
import json
import os
import sys
import requests

CF_TOKEN = os.environ["CF_TOKEN"]
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "22688effbd9ab181498d04ccd2cc8d2e")
DB_ID = os.environ.get("CF_D1_ID", "1de4bbee-3c8c-4043-91f9-fafd527c2f1f")
SCRIPT_NAME = "votocheck-coletor"
SRC_ROOT = sys.argv[1] if len(sys.argv) > 1 else "src"

MODULES = [
    "index.js",
    "vendor_unzipit.js",
    "collectors/camara.js",
    "collectors/senado.js",
    "collectors/tse_bens.js",
    "collectors/tse_candidatos.js",
    "lib/curadoria.js",
    "lib/curadoria_html.js",
    "lib/landing_html.js",
    "lib/tse_parser.js",
    "lib/estilo_html.js",
    "lib/busca_html.js",
    "lib/perfil_html.js",
    "lib/sobre_html.js",
    "lib/assets_data.js",
]

metadata = {
    "main_module": "index.js",
    "compatibility_date": "2024-09-23",
    "bindings": [
        {"type": "d1", "name": "DB", "id": DB_ID},
    ],
}

files = {"metadata": (None, json.dumps(metadata), "application/json")}
for mod in MODULES:
    path = os.path.join(SRC_ROOT, mod)
    with open(path, "rb") as f:
        content = f.read()
    files[mod] = (mod, content, "application/javascript+module")

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT_NAME}"
resp = requests.put(url, headers={"Authorization": f"Bearer {CF_TOKEN}"}, files=files)
print("HTTP", resp.status_code)
print(json.dumps(resp.json(), indent=2)[:2000])
