#!/usr/bin/env python3
"""Aplica o SQL gerado por importar_local.mjs no D1 via API REST da Cloudflare,
em lotes, contornando os limites de subrequest/CPU do Worker."""
import json
import sys
import time
import urllib.request
import urllib.error

import os

CF_TOKEN = os.environ["CF_TOKEN"]
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "22688effbd9ab181498d04ccd2cc8d2e")
DB_ID = os.environ.get("CF_D1_ID", "1de4bbee-3c8c-4043-91f9-fafd527c2f1f")
URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

BATCH_SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 400  # statements per call


def load_statements(path):
    content = open(path, encoding="utf-8").read()
    content = content.replace(
        "-- Gerado por scripts/importar_local.mjs — NÃO editar manualmente.\n\n", ""
    )
    content = content.replace("BEGIN TRANSACTION;\n\n", "")
    content = content.replace("\n\nCOMMIT;", "")
    return [s.strip() for s in content.split("\n\n") if s.strip()]


def run_batch(sql_text, attempt=1):
    body = json.dumps({"sql": sql_text}).encode("utf-8")
    req = urllib.request.Request(
        URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {CF_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        if attempt < 3:
            time.sleep(2 * attempt)
            return run_batch(sql_text, attempt + 1)
        return {"success": False, "http_error": e.code, "body": err_body}
    except Exception as e:
        if attempt < 3:
            time.sleep(2 * attempt)
            return run_batch(sql_text, attempt + 1)
        return {"success": False, "exception": str(e)}


def main():
    path = sys.argv[1]
    stmts = load_statements(path)
    total = len(stmts)
    print(f"[apply_d1] {total} statements, lote de {BATCH_SIZE}")

    ok_batches = 0
    fail_batches = 0
    i = 0
    batch_num = 0
    n_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    while i < total:
        chunk = stmts[i : i + BATCH_SIZE]
        sql_text = "\n".join(chunk)
        result = run_batch(sql_text)
        batch_num += 1
        if result.get("success"):
            ok_batches += 1
        else:
            fail_batches += 1
            print(f"  [lote {batch_num}/{n_batches}] FALHA: {json.dumps(result)[:500]}")
        if batch_num % 10 == 0 or batch_num == n_batches:
            print(f"  progresso: lote {batch_num}/{n_batches} (ok={ok_batches} falha={fail_batches})")
        i += BATCH_SIZE

    print(f"\n[apply_d1] concluído. lotes ok={ok_batches} falha={fail_batches} de {n_batches}")


if __name__ == "__main__":
    main()
