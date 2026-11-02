-- 01/11/2026: índices para cortar linhas lidas no D1 (consultas mais caras em 31/10–01/11).
CREATE INDEX IF NOT EXISTS idx_candidatura_pessoa_ano ON candidatura(pessoa_id, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_pessoa_id_senado ON pessoa(id_senado);
CREATE INDEX IF NOT EXISTS idx_candidatura_disputa_partido ON candidatura(ano_eleicao, cargo_id, sg_uf, partido_id);
CREATE INDEX IF NOT EXISTS idx_candidatura_disputa_coligacao ON candidatura(ano_eleicao, cargo_id, sg_uf, sq_coligacao);
CREATE INDEX IF NOT EXISTS idx_candidatura_ano_cargo ON candidatura(ano_eleicao, cargo_id);
