-- 26/09/2026: receitas de campanha 2026 por candidatura (prestação de contas parcial do TSE).
-- Dinheiro público = Fundo Especial de Financiamento de Campanha (fundo eleitoral) + Fundo Partidário.
CREATE TABLE IF NOT EXISTS financiamento_campanha (
  candidatura_id    INTEGER PRIMARY KEY REFERENCES candidatura(id),
  fefc              REAL NOT NULL DEFAULT 0,
  fundo_partidario  REAL NOT NULL DEFAULT 0,
  pessoas_fisicas   REAL NOT NULL DEFAULT 0,
  recursos_proprios REAL NOT NULL DEFAULT 0,
  outros            REAL NOT NULL DEFAULT 0,
  total             REAL NOT NULL DEFAULT 0,
  data_referencia   TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_publico ON financiamento_campanha (fefc);
