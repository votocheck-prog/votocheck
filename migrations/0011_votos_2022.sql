-- 26/09/2026: votação de 2022 (deputado federal/estadual/distrital) ligada à pessoa, por nome completo +
-- data de nascimento. Usada para ordenar "Seu voto também conta para esta lista" e na página de 2022.
CREATE TABLE IF NOT EXISTS votos_2022 (
  pessoa_id  INTEGER NOT NULL REFERENCES pessoa(id),
  cargo      TEXT NOT NULL,
  sg_uf      TEXT NOT NULL,
  sq_2022    TEXT NOT NULL,
  votos      INTEGER NOT NULL,
  situacao   TEXT,
  PRIMARY KEY (pessoa_id, cargo)
);
