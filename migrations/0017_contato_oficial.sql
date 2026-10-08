-- 08/10/2026: contatos oficiais de gabinete (Câmara e Senado) para a cobrança estruturada e as páginas de cidade.
-- Coletado por scripts/coletar_contatos.py (fonte e data em cada linha). Ver plano-pos-eleicao §11.
CREATE TABLE IF NOT EXISTS contato_oficial (
  pessoa_id    INTEGER NOT NULL REFERENCES pessoa(id),
  tipo         TEXT NOT NULL,
  valor        TEXT NOT NULL,
  fonte        TEXT NOT NULL,
  url_fonte    TEXT,
  coletado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  invalido     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pessoa_id, tipo, valor)
);

CREATE INDEX IF NOT EXISTS idx_contato_pessoa ON contato_oficial(pessoa_id);
