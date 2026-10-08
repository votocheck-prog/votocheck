-- 08/10/2026: resultado oficial de 2026 por candidatura (resultados.tse.jus.br).
-- situacao_totalizacao_turno já existia (0001) e passa a receber o texto do TSE:
-- 'Eleito', 'Eleito por QP', 'Eleito por média', '2º turno', 'Suplente', 'Não eleito'.
-- Preenchido por scripts/importar_resultados_2026.py + scripts/apply_d1.py.
ALTER TABLE candidatura ADD COLUMN votos_t1 INTEGER;

ALTER TABLE candidatura ADD COLUMN pct_t1 REAL;

ALTER TABLE candidatura ADD COLUMN votos_t2 INTEGER;

ALTER TABLE candidatura ADD COLUMN pct_t2 REAL;

ALTER TABLE candidatura ADD COLUMN eleito INTEGER;

CREATE INDEX IF NOT EXISTS idx_candidatura_resultado ON candidatura(ano_eleicao, sg_uf, eleito);
