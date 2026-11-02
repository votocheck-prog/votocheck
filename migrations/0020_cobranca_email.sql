-- 01/11/2026 — cobrança enviada pelo VotoCheck por e-mail, com resposta do gabinete rastreada.
CREATE TABLE IF NOT EXISTS cobranca_email (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  pessoa_id INTEGER NOT NULL,
  tema TEXT,
  email_eleitor TEXT NOT NULL,
  cidade TEXT,
  uf TEXT,
  texto TEXT NOT NULL,
  destino_email TEXT NOT NULL,
  quer_mensal INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente',
  origem TEXT,
  respostas INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  enviado_em TEXT,
  respondido_em TEXT
);

CREATE INDEX IF NOT EXISTS ix_cobranca_email_pessoa ON cobranca_email (pessoa_id, status);

CREATE INDEX IF NOT EXISTS ix_cobranca_email_eleitor ON cobranca_email (email_eleitor, criado_em);

-- Posicionamento oficial do eleito por tema (respondido pelo gabinete, autenticado por código no e-mail oficial).
CREATE TABLE IF NOT EXISTS posicionamento (
  pessoa_id INTEGER NOT NULL,
  tema TEXT NOT NULL,
  texto TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  email_autor TEXT NOT NULL,
  PRIMARY KEY (pessoa_id, tema)
);

CREATE TABLE IF NOT EXISTS gabinete_otp (
  email TEXT NOT NULL,
  pessoa_id INTEGER NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_em TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  sessao TEXT,
  sessao_expira TEXT,
  PRIMARY KEY (email, pessoa_id)
);
