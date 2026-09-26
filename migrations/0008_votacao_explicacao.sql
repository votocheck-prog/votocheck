-- 26/09/2026: explicação em linguagem simples de cada votação nominal ("Saiba o que é").
-- Gerada por IA (Gemini) a partir da ementa oficial e da descrição da votação, revisada e marcada
-- como tal na interface. Uma linha por votação; o resumo do projeto é o mesmo para todas as
-- votações do mesmo projeto.
CREATE TABLE IF NOT EXISTS votacao_explicacao (
  votacao_id   INTEGER PRIMARY KEY REFERENCES votacao(id),
  projeto      TEXT,
  resumo       TEXT,
  esta_votacao TEXT,
  confianca    TEXT,
  modelo       TEXT,
  gerado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);
