-- 27/10/2026 — Cobrança estruturada: contador de cobranças enviadas pelo VotoCheck.
-- Não guarda texto, e-mail nem IP: só pessoa, tema (fato), canal, UF de origem (Cloudflare) e um
-- hash diário (IP + navegador + data) para contar no máximo 1 por pessoa/tema/dia em cada aparelho.
CREATE TABLE IF NOT EXISTS cobranca (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id INTEGER NOT NULL,
  tema TEXT NOT NULL,
  canal TEXT NOT NULL,
  uf_origem TEXT,
  chave_dia TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cobranca_dia ON cobranca (pessoa_id, tema, chave_dia);

CREATE INDEX IF NOT EXISTS ix_cobranca_pessoa ON cobranca (pessoa_id);
