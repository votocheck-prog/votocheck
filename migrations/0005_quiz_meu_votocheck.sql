-- Seção 35 (25/09/2026) — implementação real do quiz "Meu VotoCheck" (rota /quiz).
--
-- As linhas abaixo são SÓ documentação/registro administrativo: a UI do quiz (rota /quiz e
-- /quiz/resultado, em src/lib/quiz_html.js) e a lógica de correspondência (src/lib/quiz_config.js)
-- NÃO leem desta tabela — elas usam as constantes PERGUNTAS/ESPECTRO diretamente do código, de
-- propósito: o quiz é totalmente stateless (sem escrita no D1 a cada resposta, só querystring),
-- decisão tomada pra não repetir os problemas de cota do D1 já documentados na continuidade.
-- `quiz_resposta_usuario` continua deliberadamente sem uso.
--
-- Se o texto de uma pergunta mudar no código, atualize aqui também pra manter o registro
-- coerente — mas um desalinhamento aqui nunca quebra o quiz em produção, só a documentação.
--
-- A pergunta de espectro (ordem 7) tem opcaoA/opcaoB como RASCUNHO ainda pendente de confirmação
-- do Rodrigo (ver comentário no topo de src/lib/quiz_config.js) — texto registrado aqui é o
-- mesmo rascunho, a atualizar junto quando ele confirmar/substituir.

INSERT INTO quiz_pergunta (rodada, ordem, texto, atributo_slug, ativa) VALUES
  (1, 1, 'Ter pendência confirmada na Dívida Ativa da União pesa contra, pra você?', 'divida_ativa_uniao_confirmada', 1),
  (1, 2, 'Você prefere quem já ocupou esse cargo antes, ou dar chance a quem nunca ocupou?', 'ja_ocupou_cargo', 1),
  (1, 3, 'Você valoriza mais um representante que vota alinhado com o próprio partido, ou que vota independente disso?', 'alinhamento_bancada', 1),
  (1, 4, 'Trocar de partido durante o mandato pesa negativamente pra você?', 'trocou_de_partido', 1),
  (1, 5, 'Importa pra você que o candidato tenha declarado bens em todos os ciclos em que concorreu?', 'declarou_bens', 1),
  (1, 6, 'Ter uma formação com ensino superior (ou maior) é relevante no preparo do candidato pra assumir a posição?', 'formacao_superior', 1),
  (1, 7, 'Sobre o papel do Estado em setores estratégicos (energia, água, infraestrutura) — cursor de espectro (opções A/B ainda em rascunho, ver nota acima).', 'espectro_estado_mercado', 1);
