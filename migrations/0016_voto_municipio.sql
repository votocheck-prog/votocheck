-- 08/10/2026: votação dos eleitos por município (TSE, 1º turno) para a busca por CEP e as páginas por cidade.
-- Só os 10 eleitos mais votados por cargo em cada cidade. Ver src/lib/municipio_html.js.
CREATE TABLE IF NOT EXISTS municipio_tse (
  cd_tse  TEXT PRIMARY KEY,
  ibge    TEXT,
  uf      TEXT NOT NULL,
  nome    TEXT NOT NULL,
  slug    TEXT NOT NULL,
  UNIQUE (uf, slug)
);

CREATE INDEX IF NOT EXISTS idx_municipio_ibge ON municipio_tse(ibge);

CREATE TABLE IF NOT EXISTS voto_municipio_2026 (
  cd_tse    TEXT NOT NULL,
  cargo     TEXT NOT NULL,
  sq        TEXT NOT NULL,
  votos     INTEGER NOT NULL,
  pct_mun   REAL,
  pct_cand  REAL,
  PRIMARY KEY (cd_tse, cargo, sq)
);
