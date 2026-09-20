-- VotoCheck — Monitoramento e Cobrança (Fase 1: captura de acompanhamento, sem envio de e-mail ainda)
--
-- Contexto: a home já anuncia a etapa "Monitore"/"Cobre" do lema (ver src/lib/jornada_html.js).
-- Fase 1 é só a captura — usuário escolhe acompanhar até 3 Representantes Públicos por e-mail.
-- O envio periódico de resumos (Fase 2) depende de escolher um provedor de e-mail, ainda não
-- decidido — ver CONTINUIDADE_INFRA_UPDATE_2026-09-18.md.
--
-- Princípios de LGPD já usados no resto do schema (ver 0001, comentário de cpf_hash): minimizar
-- dado coletado, ter um jeito de cancelar sem depender de suporte humano, e nunca usar o dado
-- pra nada além do que foi declarado ao usuário no momento da coleta.
--
-- Aplicar esta migration: mesmo caminho manual usado pra 0001 (API REST do D1 — sem wrangler).
-- NÃO foi aplicada nesta sessão (sem credenciais de D1 carregadas neste ambiente) — ver
-- pendência no documento de continuidade antes de aplicar em produção.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS acompanhamento (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  email               TEXT NOT NULL,
  pessoa_id           INTEGER NOT NULL REFERENCES pessoa(id),
  token_cancelamento  TEXT NOT NULL UNIQUE,   -- link de cancelamento imediato, mostrado na hora da inscrição
                                               -- (a página não envia e-mail ainda, então este é o único jeito
                                               -- de cancelar por enquanto — ver perfil_html.js)
  ativo               INTEGER NOT NULL DEFAULT 1,
  criado_em           TEXT NOT NULL DEFAULT (datetime('now')),
  cancelado_em        TEXT,
  UNIQUE(email, pessoa_id)                    -- não deixa duplicar o mesmo acompanhamento
);

CREATE INDEX IF NOT EXISTS idx_acompanhamento_email ON acompanhamento(email);
CREATE INDEX IF NOT EXISTS idx_acompanhamento_token ON acompanhamento(token_cancelamento);
CREATE INDEX IF NOT EXISTS idx_acompanhamento_pessoa ON acompanhamento(pessoa_id);
