// Shim mínimo que imita a interface D1 do Cloudflare Workers (prepare/bind/first/all/run)
// mas fala com o D1 via API REST HTTP — permite rodar os coletores originais (camara.js,
// senado.js) sem modificação, fora do Worker, sem os limites de CPU/subrequest do runtime dele.

// ATUALIZADO 24/09/2026 (seção 33): ACCOUNT_ID e DB_ID agora têm o mesmo default de
// scripts/deploy_worker.py. Sem isso, rodar qualquer script que usa este shim (importar_pgfn.mjs,
// importar_local.mjs, etc.) sem exportar CF_ACCOUNT_ID/CF_D1_ID manualmente resultava em
// "Could not route to /client/v4/accounts/undefined/d1/database/undefined/query" — erro real que
// aconteceu em produção (só CF_TOKEN estava setado). Continuam sobrescrevíveis por env var caso o
// banco/conta mude no futuro.
const CF_TOKEN = process.env.CF_TOKEN;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '22688effbd9ab181498d04ccd2cc8d2e';
const DB_ID = process.env.CF_D1_ID || '1de4bbee-3c8c-4043-91f9-fafd527c2f1f';
const URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

let totalQueries = 0;

async function rawQuery(sql, params, attempt = 1) {
  totalQueries++;
  const resp = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (resp.status === 429 && attempt < 6) {
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return rawQuery(sql, params, attempt + 1);
  }
  const json = await resp.json();
  if (!json.success) {
    const msg = JSON.stringify(json.errors || json);
    if (attempt < 3 && /timeout|network|ECONNRESET/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return rawQuery(sql, params, attempt + 1);
    }
    const err = new Error(`D1 error: ${msg} | sql=${sql.slice(0, 200)}`);
    throw err;
  }
  return json.result[0]; // { results, success, meta }
}

class D1Statement {
  constructor(sql) {
    this.sql = sql;
    this.params = [];
  }
  bind(...args) {
    this.params = args.map((a) => (a === undefined ? null : a));
    return this;
  }
  async run() {
    const r = await rawQuery(this.sql, this.params);
    return { meta: r.meta, results: r.results, success: r.success };
  }
  async first() {
    const r = await rawQuery(this.sql, this.params);
    return (r.results && r.results[0]) || null;
  }
  async all() {
    const r = await rawQuery(this.sql, this.params);
    return { results: r.results || [] };
  }
}

export const DB = {
  prepare(sql) {
    return new D1Statement(sql);
  },
};

export function getTotalQueries() {
  return totalQueries;
}
