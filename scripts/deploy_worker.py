#!/usr/bin/env python3
"""Redeploy do Worker votocheck-coletor via API REST da Cloudflare (multipart),
replicando o método já usado na implantação original (sem wrangler CLI).

Lista de módulos (MODULES) auditada em 21/09/2026 contra a árvore real de imports a partir de
index.js (recursivo) — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 23. Antes disso a
lista estava desatualizada (faltavam vários lib/*_html.js criados nas seções 17-21, e um deles
— icones.js — nem sequer tinha sido commitado no device, então o deploy quebraria de qualquer
forma). Se adicionar um arquivo novo com import próprio no futuro, adicione aqui também — não
tem verificação automática disso.

IMPORTANTE — secrets (ex.: RESEND_API_KEY): a API de upload de Worker tem histórico de
descartar bindings existentes (inclusive secrets) quando a nova versão não os redeclara
explicitamente — isso já foi reportado como bug mesmo usando o campo `keep_bindings` que
deveria evitar isso. Por segurança, este script NÃO confia nisso: se a variável de ambiente
RESEND_API_KEY estiver definida ao rodar este script, ela é redeclarada explicitamente a cada
deploy (garantindo que sobrevive). Se não estiver definida, o script AVISA e não tenta adivinhar
— rode com ela definida, ou confira manualmente depois do deploy se o secret ainda existe
(Settings > Variables and Secrets no dashboard do Worker) e recadastre se precisar (é rápido).
"""
import json
import os
import sys
import requests

CF_TOKEN = os.environ["CF_TOKEN"]
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "22688effbd9ab181498d04ccd2cc8d2e")
DB_ID = os.environ.get("CF_D1_ID", "1de4bbee-3c8c-4043-91f9-fafd527c2f1f")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")  # opcional — ver aviso no docstring acima
SCRIPT_NAME = "votocheck-coletor"
SRC_ROOT = sys.argv[1] if len(sys.argv) > 1 else "src"

# Árvore completa de módulos alcançáveis a partir de index.js (auditada em 21/09/2026).
MODULES = [
    "vendor_unzipit.js",
    "collectors/camara.js",
    "collectors/senado.js",
    "collectors/tse_bens.js",
    "collectors/tse_candidatos.js",
    "lib/tse_parser.js",
    "lib/curadoria.js",
    "lib/curadoria_html.js",
    "lib/estilo_html.js",
    "lib/assets_data.js",
    "lib/icones.js",
    "lib/mapa_brasil.js",
    "lib/banners_html.js",
    "lib/cargos_guia.js",
    "lib/jornada_html.js",
    "lib/busca_html.js",
    "lib/perfil_html.js",
    "lib/sobre_html.js",
    "lib/institucional_html.js",
    "lib/partidos_html.js",
    "lib/judiciario_html.js",
    "lib/acompanhamento.js",
    "lib/acompanhamento_email.js",
    "lib/email.js",
]

if not RESEND_API_KEY:
    print(
        "[deploy_worker] AVISO: RESEND_API_KEY não está definida no ambiente deste terminal.\n"
        "  Isso NÃO impede o deploy, mas significa que este script não vai redeclarar esse\n"
        "  secret — se a Cloudflare descartar bindings não redeclarados (comportamento já visto\n"
        "  em relatos de bug), o e-mail de confirmação para de funcionar até você recadastrar o\n"
        "  secret manualmente (Settings > Variables and Secrets no Worker).\n"
        "  Recomendado: rode de novo com $env:RESEND_API_KEY definido, OU confira depois do\n"
        "  deploy se o secret ainda existe e teste o cadastro em /candidato/<id> pra ver se o\n"
        "  e-mail chega.\n"
    )

bindings = [{"type": "d1", "name": "DB", "id": DB_ID}]
if RESEND_API_KEY:
    bindings.append({"type": "secret_text", "name": "RESEND_API_KEY", "text": RESEND_API_KEY})

metadata = {
    "main_module": "index.js",
    "compatibility_date": "2024-09-23",
    "bindings": bindings,
}

files = {"metadata": (None, json.dumps(metadata), "application/json")}
files["index.js"] = ("index.js", open(os.path.join(SRC_ROOT, "index.js"), "rb").read(), "application/javascript+module")
for mod in MODULES:
    path = os.path.join(SRC_ROOT, mod)
    with open(path, "rb") as f:
        content = f.read()
    files[mod] = (mod, content, "application/javascript+module")

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT_NAME}"
resp = requests.put(url, headers={"Authorization": f"Bearer {CF_TOKEN}"}, files=files)
print("HTTP", resp.status_code)
print(json.dumps(resp.json(), indent=2)[:2000])
