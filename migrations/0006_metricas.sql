-- 0006 — medição própria sem cookie (ver src/lib/metricas.js). Aplicado em 26/09/2026 via API.
CREATE TABLE IF NOT EXISTS metrica_diaria (
  dia TEXT NOT NULL, evento TEXT NOT NULL, chave TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, evento, chave)
);
CREATE TABLE IF NOT EXISTS visitante_dia (
  dia TEXT NOT NULL, h TEXT NOT NULL, PRIMARY KEY (dia, h)
);
