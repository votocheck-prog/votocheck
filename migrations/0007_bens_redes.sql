-- 0007 — patrimônio declarado (bens) e redes sociais oficiais dos candidatos, TSE 2026.
-- Aplicado em 26/09/2026 via API a partir de Bases/bem_candidato_2026.zip e rede_social_candidato_2026.zip
-- (importação feita por scripts/importar_bens_redes.py).
CREATE TABLE IF NOT EXISTS bem_candidato (
  candidatura_id INTEGER NOT NULL, ordem INTEGER NOT NULL, tipo TEXT, descricao TEXT, valor REAL,
  PRIMARY KEY (candidatura_id, ordem)
);
CREATE TABLE IF NOT EXISTS rede_social_candidato (
  candidatura_id INTEGER NOT NULL, ordem INTEGER NOT NULL, url TEXT NOT NULL,
  PRIMARY KEY (candidatura_id, ordem)
);
