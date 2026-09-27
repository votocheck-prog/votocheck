-- 27/09/2026 — "trajetória profissional" saiu de pergunta pontuada do quiz e virou filtro na tela
-- de resultado (pedido do Rodrigo, ver documento de continuidade e src/lib/quiz_html.js). Falta a
-- ocupação declarada ao TSE (DS_OCUPACAO) — campo padrão do arquivo consulta_cand, que o parser
-- nunca capturava (mesmo achado de migrations/0004_reeleicao_declarou_bens.sql: campo existe no
-- CSV, mas nunca virou coluna). scripts/importar_local.mjs já foi atualizado para gravar aqui —
-- IMPORTANTE: aplicar esta migration ANTES de rodar esse import de novo e ANTES do próximo deploy
-- do Worker (src/index.js agora seleciona c.ocupacao em /quiz/resultado; sem esta coluna a rota
-- quebra com "no such column").
ALTER TABLE candidatura ADD COLUMN ocupacao TEXT;
