#!/usr/bin/env python3
"""Redeploy do Worker votocheck-coletor via API REST da Cloudflare (multipart),
replicando o método já usado na implantação original (sem wrangler CLI).

Lista de módulos (MODULES) auditada em 21/09/2026 contra a árvore real de imports a partir de
index.js (recursivo) — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md, seção 23. Antes disso a
lista estava desatualizada (faltavam vários lib/*_html.js criados nas seções 17-21, e um deles
— icones.js — nem sequer tinha sido commitado no device, então o deploy quebraria de qualquer
forma). Se adicionar um arquivo novo com import próprio no futuro, adicione aqui também — não
tem verificação automática disso.

ATUALIZADO 23/09/2026 (seção 27): faltava `lib/partidos_logos.js`, novo módulo importado por
`partidos_html.js` pra logos dos partidos — causa raiz confirmada de por que o deploy dessa
sessão não atualizou /partidos em produção (upload rejeitado/incompleto pela API, Cloudflare
manteve servindo a versão anterior em vez de quebrar visivelmente, o que mascarou o problema).
Reforçando o aviso acima: esta lista é manual e SEM checagem automática — todo arquivo novo
com import próprio (`lib/*_html.js`, `lib/*_logos.js`, etc.) tem que ser adicionado aqui à mão
antes do deploy, ou o deploy fica silenciosamente desatualizado.

ATUALIZADO 23/09/2026 (seção 31): adicionados `lib/divida_ativa.js` e `lib/divida_ativa_html.js`
(painel de curadoria da Dívida Ativa PGFN, importados por index.js) — mesmo motivo do aviso acima.

IMPORTANTE — secrets (ADMIN_TOKEN, RESEND_API_KEY): a API de upload de Worker tem histórico de
descartar bindings existentes (inclusive secrets) quando a nova versão não os redeclara
explicitamente — isso já foi reportado como bug mesmo usando o campo `keep_bindings` que
deveria evitar isso. Por segurança, este script NÃO confia nisso: se as variáveis de ambiente
ADMIN_TOKEN e/ou RESEND_API_KEY estiverem definidas ao rodar este script, elas são redeclaradas
explicitamente a cada deploy (garantindo que sobrevivem). Se não estiverem definidas, o script
AVISA e não tenta adivinhar.

ATUALIZADO 24/09/2026 (seção 31, correção): até esta data o script só tratava RESEND_API_KEY
dessa forma — ADMIN_TOKEN (usado por /admin/curadoria e /admin/divida-ativa) NUNCA era
redeclarado, ou seja, todo deploy rodava o risco de silenciosamente abrir os dois painéis admin
pro público (sem ADMIN_TOKEN configurado, `requireAdminToken` libera geral — ver src/index.js).
Corrigido pra tratar os dois secrets do mesmo jeito, e o script agora CONFERE depois do deploy
(via GET .../workers/scripts/{name}/secrets, que lista nomes sem expor valores) se os dois ainda
existem, e avisa alto se algum sumiu.

ATUALIZADO 24/09/2026 (seção 33): adicionado `lib/clipping_mensal.js` (dados do resumo mensal de
atuação enviado a quem acompanha um Representante Público, chamado a partir de scheduled() em
index.js) — mesmo motivo dos avisos acima.
"""
import json
import os
import sys
import requests

CF_TOKEN = os.environ["CF_TOKEN"]
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "22688effbd9ab181498d04ccd2cc8d2e")
DB_ID = os.environ.get("CF_D1_ID", "1de4bbee-3c8c-4043-91f9-fafd527c2f1f")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")  # opcional — ver aviso no docstring acima
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")  # opcional — ver aviso no docstring acima
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
    "lib/divida_ativa.js",
    "lib/divida_ativa_html.js",
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
    "lib/partidos_logos.js",
    "lib/judiciario_html.js",
    "lib/acompanhamento.js",
    "lib/clipping_mensal.js",
    "lib/acompanhamento_email.js",
    "lib/email.js",
]

for nome, valor in (("RESEND_API_KEY", RESEND_API_KEY), ("ADMIN_TOKEN", ADMIN_TOKEN)):
    if not valor:
        print(
            f"[deploy_worker] AVISO: {nome} não está definida no ambiente deste terminal.\n"
            f"  Isso NÃO impede o deploy, mas significa que este script não vai redeclarar esse\n"
            f"  secret — se a Cloudflare descartar bindings não redeclarados (comportamento já\n"
            f"  visto em relatos de bug), o secret some até você recadastrar manualmente\n"
            f"  (Settings > Variables and Secrets no Worker). Este script confere isso sozinho\n"
            f"  logo depois do deploy e avisa se sumiu.\n"
        )

bindings = [{"type": "d1", "name": "DB", "id": DB_ID}]
if RESEND_API_KEY:
    bindings.append({"type": "secret_text", "name": "RESEND_API_KEY", "text": RESEND_API_KEY})
if ADMIN_TOKEN:
    bindings.append({"type": "secret_text", "name": "ADMIN_TOKEN", "text": ADMIN_TOKEN})

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

# Confere se os secrets sobreviveram ao deploy (lista só nomes, nunca valores — não precisa
# saber o valor pra confirmar que o binding continua existindo).
if resp.ok:
    sec_resp = requests.get(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT_NAME}/secrets",
        headers={"Authorization": f"Bearer {CF_TOKEN}"},
    )
    nomes_atuais = {s["name"] for s in sec_resp.json().get("result", [])} if sec_resp.ok else set()
    for nome in ("ADMIN_TOKEN", "RESEND_API_KEY"):
        if nome not in nomes_atuais:
            print(
                f"\n[deploy_worker] *** ALERTA *** o secret {nome} NÃO existe mais no Worker "
                f"depois deste deploy — provavelmente foi descartado pela API (ver aviso no "
                f"cabeçalho do script). "
                + ("Recadastre em Settings > Variables and Secrets no dashboard do Worker."
                   if nome == "RESEND_API_KEY" else
                   "Isso significa que /admin/curadoria e /admin/divida-ativa estão SEM proteção "
                   "agora (abertos pro público) até você recadastrar o secret.")
            )
    if "ADMIN_TOKEN" in nomes_atuais and "RESEND_API_KEY" in nomes_atuais:
        print("[deploy_worker] OK: ADMIN_TOKEN e RESEND_API_KEY confirmados presentes após o deploy.")
