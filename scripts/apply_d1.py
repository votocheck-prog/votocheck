#!/usr/bin/env python3
"""Aplica o SQL gerado por importar_local.mjs no D1 via API REST da Cloudflare,
em lotes, contornando os limites de subrequest/CPU do Worker.

ATUALIZADO 25/09/2026: dois ajustes depois de bater na cota diária de leitura do D1 (free tier,
erro 7500) no meio de uma carga real — cada INSERT no SQL gerado faz um `WHERE NOT EXISTS
(SELECT ...)` pra evitar duplicata, ou seja, é 1 leitura por statement, não só as escritas; um
arquivo com centenas de milhares de statements pode estourar a cota bem antes de terminar,
principalmente se já havia leitura consumida no dia por outra coisa (site em produção, coleta
agendada, etc.):
  1. Parada automática assim que um lote falha com o erro 7500 (cota estourada) — antes disso o
     script continuava tentando todos os lotes restantes, e cada tentativa é uma chamada HTTP a
     mais sem chance nenhuma de dar certo. Agora ele para na hora e avisa exatamente em qual lote
     retomar.
  2. Parâmetro opcional de lote inicial (`start_batch`) — pra retomar de onde parou sem re-enviar
     (e re-consumir cota com) os lotes que já tinham sido aplicados com sucesso antes da cota
     estourar."""
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
START_BATCH = int(sys.argv[3]) if len(sys.argv) > 3 else 1  # retomar a partir deste lote (1-based)


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


def is_cota_estourada(result):
    """Detecta especificamente o erro 7500 (cota diária de leitura do D1 esgotada) no corpo da
    resposta de falha — esse erro nunca vai passar a funcionar tentando de novo no mesmo dia."""
    body = result.get("body") or ""
    return '"code":7500' in body or "daily row read limit" in body


def main():
    path = sys.argv[1]
    stmts = load_statements(path)
    total = len(stmts)
    n_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"[apply_d1] {total} statements, lote de {BATCH_SIZE}, {n_batches} lotes no total")
    if START_BATCH > 1:
        print(f"[apply_d1] retomando a partir do lote {START_BATCH} (pulando os anteriores, sem chamada de API)")

    ok_batches = 0
    fail_batches = 0
    skipped_batches = 0
    i = 0
    batch_num = 0
    parou_por_cota = False
    while i < total:
        batch_num += 1
        chunk = stmts[i : i + BATCH_SIZE]
        if batch_num < START_BATCH:
            skipped_batches += 1
            i += BATCH_SIZE
            continue

        sql_text = "\n".join(chunk)
        result = run_batch(sql_text)
        if result.get("success"):
            ok_batches += 1
        else:
            fail_batches += 1
            print(f"  [lote {batch_num}/{n_batches}] FALHA: {json.dumps(result)[:500]}")
            if is_cota_estourada(result):
                print(
                    f"\n[apply_d1] cota diária de leitura do D1 esgotada — parando aqui, os lotes "
                    f"restantes ({batch_num}/{n_batches} em diante) vão falhar do mesmo jeito hoje.\n"
                    f"Retome depois de meia-noite UTC com:\n"
                    f"  python scripts/apply_d1.py {path} {BATCH_SIZE} {batch_num}\n"
                    f"(retoma a partir do lote {batch_num} — os {ok_batches} anteriores já foram aplicados e não precisam repetir)"
                )
                parou_por_cota = True
                break
        if batch_num % 10 == 0 or batch_num == n_batches:
            print(f"  progresso: lote {batch_num}/{n_batches} (ok={ok_batches} falha={fail_batches} pulados={skipped_batches})")
        i += BATCH_SIZE

    status = "interrompido por cota esgotada" if parou_por_cota else "concluído"
    print(f"\n[apply_d1] {status}. lotes ok={ok_batches} falha={fail_batches} pulados={skipped_batches} de {n_batches}")


if __name__ == "__main__":
    main()
