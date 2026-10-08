-- 08/10/2026: boletim semanal por estado (inscrição opcional, confirmação dupla). Ver src/lib/boletim.js.
CREATE TABLE IF NOT EXISTS boletim_inscricao (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  email                     TEXT NOT NULL UNIQUE,
  uf                        TEXT NOT NULL,
  token                     TEXT NOT NULL UNIQUE,
  confirmado                INTEGER NOT NULL DEFAULT 0,
  ativo                     INTEGER NOT NULL DEFAULT 1,
  origem                    TEXT,
  criado_em                 TEXT NOT NULL DEFAULT (datetime('now')),
  confirmado_em             TEXT,
  cancelado_em              TEXT,
  ultimo_envio_confirmacao  TEXT
);

CREATE INDEX IF NOT EXISTS idx_boletim_uf ON boletim_inscricao(uf, confirmado, ativo);
