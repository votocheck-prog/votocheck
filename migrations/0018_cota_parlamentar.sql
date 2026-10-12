-- 12/10/2026: cota parlamentar (CEAP) da Câmara, agregada por deputado e categoria.
-- Populada por scripts/importar_cota.py (fonte: camara.leg.br/cotas/Ano-<ano>.csv.zip).
CREATE TABLE IF NOT EXISTS cota_resumo (
  id_camara TEXT NOT NULL, ano INTEGER NOT NULL, nome TEXT, partido TEXT, uf TEXT,
  total REAL NOT NULL DEFAULT 0, divulgacao REAL NOT NULL DEFAULT 0, divulgacao_mes TEXT,
  atualizado_em TEXT, PRIMARY KEY (id_camara, ano));
CREATE INDEX IF NOT EXISTS idx_cota_resumo_uf ON cota_resumo (ano, uf);
CREATE TABLE IF NOT EXISTS cota_parlamentar (
  id_camara TEXT NOT NULL, ano INTEGER NOT NULL, categoria TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0, docs INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (id_camara, ano, categoria));
CREATE INDEX IF NOT EXISTS idx_pessoa_id_camara ON pessoa(id_camara);
