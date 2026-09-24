-- Seção 34 (24/09/2026) — dois campos que o TSE já entrega prontos (ST_REELEICAO e
-- ST_DECLARAR_BENS) e que o parser (src/lib/tse_parser.js) já lê linha a linha, mas que o
-- coletor (src/collectors/tse_candidatos.js) descartava antes de gravar no banco — nunca
-- chegavam a virar coluna. Achado durante a revisão do quiz do Meu VotoCheck: os dois ajudam a
-- responder perguntas do quiz com mais precisão do que as aproximações que estávamos usando:
--   - reeleicao: candidatura já concorrendo à reeleição no próprio cargo (flag oficial do TSE,
--     "S"/"N") — ajuda a responder "já ocupou esse cargo antes" com mais precisão do que só
--     contar linhas de `mandato` (que hoje só guarda o mandato atual, sem histórico).
--   - declarou_bens: se o candidato declarou bens NAQUELA candidatura (flag oficial do TSE,
--     "S"/"N") — mais confiável que inferir pela presença de linhas em `bem_candidato`, que pode
--     faltar por incompletude da nossa própria coleta, não por omissão do candidato.
ALTER TABLE candidatura ADD COLUMN reeleicao TEXT;
ALTER TABLE candidatura ADD COLUMN declarou_bens TEXT;
