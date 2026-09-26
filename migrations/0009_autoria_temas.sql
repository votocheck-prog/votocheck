-- 26/09/2026: temas dos projetos apresentados por deputados federais na legislatura atual (2023–2026).
-- Fonte: arquivos abertos da Câmara (proposicoesAutores-AAAA e proposicoesTemas-AAAA). O tema é a
-- classificação oficial da própria Câmara, não do VotoCheck. Só PL, PLP, PEC e PDL.
CREATE TABLE IF NOT EXISTS autoria_temas (
  pessoa_id     INTEGER PRIMARY KEY REFERENCES pessoa(id),
  casa          TEXT NOT NULL,
  periodo       TEXT NOT NULL,
  total         INTEGER NOT NULL,
  temas_json    TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
