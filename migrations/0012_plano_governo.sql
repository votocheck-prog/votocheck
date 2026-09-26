-- 26/09/2026: resumo das propostas de governo 2026 (presidente e governador) registradas no TSE.
-- Resumo gerado por IA (Gemini) a partir do PDF oficial, revisado por amostragem e rotulado na ficha.
CREATE TABLE IF NOT EXISTS plano_governo (
  candidatura_id INTEGER PRIMARY KEY REFERENCES candidatura(id),
  resumo         TEXT,
  propostas_json TEXT NOT NULL DEFAULT '[]',
  arquivos_json  TEXT NOT NULL DEFAULT '[]',
  concreto       TEXT,
  modelo         TEXT,
  gerado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);
