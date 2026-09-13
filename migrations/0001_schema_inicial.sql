-- VotoCheck — Schema inicial D1
-- Modelo lógico: PESSOA → CANDIDATURA → MANDATO → EVENTO → EVIDÊNCIA → FONTE → CONTEXTO → STATUS → HISTÓRICO → CONTESTAÇÃO
-- Referência: 03_VotoCheck_Arquitetura_Tecnica_Seguranca / 05_VotoCheck_Mapa_Mestre_Dados_Fontes_Evidencias
--
-- Convenções:
--   - IDs de texto (TEXT) para chaves que vêm de sistemas externos (SQ_CANDIDATO do TSE, id da Câmara/Senado)
--     evitam colisão de tipos e problemas de precisão em números grandes.
--   - Toda tabela de conteúdo tem status_id (FK para tabela `status`) e fonte_id (FK para `fonte`).
--   - "Evidência ≠ Fonte ≠ Dado": fonte é o site/órgão; evidência é o documento/registro específico;
--     o dado (ex: voto SIM) referencia a evidência que o comprova.
--   - Datas em TEXT no formato ISO-8601 (D1/SQLite não tem tipo DATE nativo; texto ISO ordena corretamente).
--   - created_at/updated_at em toda tabela para auditoria (requisito de Segurança/LGPD do projeto).

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. TABELAS DE APOIO / VOCABULÁRIO CONTROLADO
-- ============================================================

-- Status possíveis de qualquer informação, conforme Mapa Mestre §6
CREATE TABLE status (
  id            INTEGER PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,   -- 'confirmado' | 'em_acompanhamento' | 'contestacao_registrada' |
                                         -- 'informacao_insuficiente' | 'depende_de_terceiros' | 'corrigido' | 'arquivado'
  descricao     TEXT NOT NULL
);

INSERT INTO status (id, codigo, descricao) VALUES
  (1, 'confirmado', 'Confirmado'),
  (2, 'em_acompanhamento', 'Em acompanhamento'),
  (3, 'contestacao_registrada', 'Contestação registrada'),
  (4, 'informacao_insuficiente', 'Informação insuficiente'),
  (5, 'depende_de_terceiros', 'Depende de terceiros'),
  (6, 'corrigido', 'Corrigido'),
  (7, 'arquivado', 'Arquivado');

-- Hierarquia de fontes, conforme Mapa Mestre §3
CREATE TABLE fonte (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                TEXT NOT NULL,               -- ex: "Tribunal Superior Eleitoral", "Câmara dos Deputados"
  tipo                TEXT NOT NULL CHECK (tipo IN (
                          'institucional_oficial',
                          'oficial_candidato',
                          'primaria_independente',
                          'imprensa',
                          'terceiros'
                        )),
  url_base            TEXT,
  descricao           TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cargos eletivos, com código TSE quando aplicável
CREATE TABLE cargo (
  id            INTEGER PRIMARY KEY,
  codigo_tse    INTEGER UNIQUE,          -- CD_CARGO do TSE (1=Presidente, 3=Governador, 5=Senador, 6=Deputado Federal, 7=Deputado Estadual...)
  slug          TEXT NOT NULL UNIQUE,    -- 'presidente' | 'governador' | 'senador' | 'deputado_federal' | 'deputado_estadual' | 'deputado_distrital'
  nome          TEXT NOT NULL,
  abrangencia   TEXT NOT NULL CHECK (abrangencia IN ('federal','estadual','distrital'))
);

INSERT INTO cargo (id, codigo_tse, slug, nome, abrangencia) VALUES
  (1, 1, 'presidente', 'Presidente da República', 'federal'),
  (2, 3, 'governador', 'Governador', 'estadual'),
  (3, 5, 'senador', 'Senador', 'estadual'),
  (4, 6, 'deputado_federal', 'Deputado Federal', 'federal'),
  (5, 7, 'deputado_estadual', 'Deputado Estadual', 'estadual'),
  (6, 8, 'deputado_distrital', 'Deputado Distrital', 'distrital');

-- Partidos / Federações
CREATE TABLE partido (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  numero        INTEGER UNIQUE,          -- NR_PARTIDO do TSE
  sigla         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. NÚCLEO: PESSOA → CANDIDATURA → MANDATO
-- ============================================================

-- PESSOA: identidade política permanente (Mapa Mestre §2), independente de eleição/ano
CREATE TABLE pessoa (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_completo             TEXT NOT NULL,
  nome_social               TEXT,
  nome_urna_atual           TEXT,                 -- último nome de urna conhecido, para busca
  cpf_hash                  TEXT UNIQUE,           -- nunca armazenar CPF em claro (LGPD) — hash para deduplicação
  titulo_eleitoral          TEXT,
  data_nascimento           TEXT,
  genero                    TEXT,
  cor_raca                  TEXT,
  grau_instrucao            TEXT,
  sq_candidato_tse_atual    TEXT,                  -- SQ_CANDIDATO da eleição mais recente, útil como chave de resolução
  id_camara                 TEXT,                  -- id do deputado na API da Câmara, quando aplicável
  id_senado                 TEXT,                  -- código do senador na API do Senado, quando aplicável
  foto_url                  TEXT,
  status_id                 INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pessoa_nome ON pessoa(nome_completo);
CREATE INDEX idx_pessoa_nome_urna ON pessoa(nome_urna_atual);
CREATE INDEX idx_pessoa_sq_candidato ON pessoa(sq_candidato_tse_atual);

-- CANDIDATURA: pessoa em determinada eleição, cargo e UF (Mapa Mestre §2)
CREATE TABLE candidatura (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id                 INTEGER NOT NULL REFERENCES pessoa(id),
  ano_eleicao                INTEGER NOT NULL,      -- ANO_ELEICAO
  turno                      INTEGER NOT NULL DEFAULT 1,
  cargo_id                   INTEGER NOT NULL REFERENCES cargo(id),
  sg_uf                      TEXT NOT NULL,          -- SG_UF (BR para Presidente)
  sq_candidato_tse           TEXT NOT NULL,          -- SQ_CANDIDATO — chave de cruzamento do TSE para esta candidatura específica
  numero_urna                INTEGER,                -- NR_CANDIDATO
  nome_urna                  TEXT,                   -- NM_URNA_CANDIDATO
  partido_id                 INTEGER REFERENCES partido(id),
  sq_coligacao                TEXT,
  nome_coligacao               TEXT,
  composicao_coligacao         TEXT,
  situacao_candidatura         TEXT,                 -- DS_SITUACAO_CANDIDATURA (deferido, indeferido, etc.)
  situacao_totalizacao_turno   TEXT,                 -- DS_SIT_TOT_TURNO (eleito, não eleito, 2º turno, etc.)
  bens_declarados_total       REAL,                  -- soma de bem_candidato, calculado depois
  status_id                   INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  fonte_id                    INTEGER REFERENCES fonte(id),
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ano_eleicao, sq_candidato_tse)
);

CREATE INDEX idx_candidatura_pessoa ON candidatura(pessoa_id);
CREATE INDEX idx_candidatura_cargo_uf ON candidatura(cargo_id, sg_uf, ano_eleicao);
CREATE INDEX idx_candidatura_ano ON candidatura(ano_eleicao);

-- MANDATO: exercício efetivo do cargo (Mapa Mestre §2) — preenchido para quem foi eleito/está em exercício
CREATE TABLE mandato (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id         INTEGER NOT NULL REFERENCES pessoa(id),
  candidatura_id    INTEGER REFERENCES candidatura(id),
  cargo_id          INTEGER NOT NULL REFERENCES cargo(id),
  sg_uf             TEXT NOT NULL,
  legislatura       TEXT,               -- ex: "57" para Câmara
  data_inicio       TEXT,
  data_fim          TEXT,
  situacao          TEXT,               -- em exercício, afastado, suplente convocado, cassado, etc.
  status_id         INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  fonte_id          INTEGER REFERENCES fonte(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mandato_pessoa ON mandato(pessoa_id);

-- Histórico de filiação partidária (útil para linha do tempo e para "Partido/Federação — organização e período de vínculo")
CREATE TABLE filiacao_partidaria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id     INTEGER NOT NULL REFERENCES pessoa(id),
  partido_id    INTEGER NOT NULL REFERENCES partido(id),
  data_inicio   TEXT,
  data_fim      TEXT,
  status_id     INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  fonte_id      INTEGER REFERENCES fonte(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_filiacao_pessoa ON filiacao_partidaria(pessoa_id);

-- ============================================================
-- 3. ATUAÇÃO LEGISLATIVA: PROPOSIÇÃO, VOTAÇÃO, VOTO, PRESENÇA
-- ============================================================

-- Proposição: objeto legislativo (Mapa Mestre §2)
CREATE TABLE proposicao (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  casa              TEXT NOT NULL CHECK (casa IN ('camara','senado')),
  id_externo        TEXT NOT NULL,       -- id da proposição na API de origem
  sigla_tipo        TEXT,                -- PL, PEC, MPV, etc.
  numero            INTEGER,
  ano               INTEGER,
  ementa            TEXT,
  tema              TEXT,
  situacao_atual    TEXT,
  url_origem        TEXT,
  fonte_id          INTEGER REFERENCES fonte(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(casa, id_externo)
);

CREATE INDEX idx_proposicao_tipo_ano ON proposicao(sigla_tipo, ano);

-- Votação: evento decisório sobre uma ou mais proposições (Mapa Mestre §2)
CREATE TABLE votacao (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  casa              TEXT NOT NULL CHECK (casa IN ('camara','senado')),
  id_externo        TEXT NOT NULL,
  proposicao_id     INTEGER REFERENCES proposicao(id),
  data_votacao      TEXT,
  descricao         TEXT,
  resultado         TEXT,               -- aprovado / rejeitado / retirado etc.
  votos_sim         INTEGER,
  votos_nao         INTEGER,
  votos_abstencao   INTEGER,
  url_origem        TEXT,
  fonte_id          INTEGER REFERENCES fonte(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(casa, id_externo)
);

CREATE INDEX idx_votacao_proposicao ON votacao(proposicao_id);
CREATE INDEX idx_votacao_data ON votacao(data_votacao);

-- Voto individual: como cada parlamentar votou em uma votação nominal
-- (evidencia_id referencia a tabela `evidencia`, criada na seção 5 — sem FK declarativa aqui
--  para evitar dependência de ordem de criação; a ligação formal fica em `registro_evidencia`)
CREATE TABLE voto_parlamentar (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  votacao_id    INTEGER NOT NULL REFERENCES votacao(id),
  pessoa_id     INTEGER NOT NULL REFERENCES pessoa(id),
  voto          TEXT NOT NULL,          -- 'Sim' | 'Não' | 'Abstenção' | 'Obstrução' | 'Ausente' | 'Art. 17'
  orientacao_bancada TEXT,              -- útil para "coerência partidária"
  evidencia_id  INTEGER,                -- id lógico em `evidencia`; ligação formal via `registro_evidencia`
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(votacao_id, pessoa_id)
);

CREATE INDEX idx_voto_pessoa ON voto_parlamentar(pessoa_id);
CREATE INDEX idx_voto_votacao ON voto_parlamentar(votacao_id);

-- Presença legislativa (sessões, comissões)
CREATE TABLE presenca (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id         INTEGER NOT NULL REFERENCES pessoa(id),
  periodo_referencia TEXT NOT NULL,      -- ex: '2026-01' (mês) ou '2026-Q1'
  percentual_presenca REAL,
  total_sessoes     INTEGER,
  total_presencas   INTEGER,
  fonte_id          INTEGER REFERENCES fonte(id),
  status_id         INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pessoa_id, periodo_referencia)
);

-- ============================================================
-- 4. DECLARAÇÕES, PROPOSTAS E COMPROMISSOS (cadeia política — Mapa Mestre §7-8)
-- ============================================================

CREATE TABLE declaracao (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa_id         INTEGER NOT NULL REFERENCES pessoa(id),
  candidatura_id    INTEGER REFERENCES candidatura(id),
  tipo              TEXT NOT NULL CHECK (tipo IN (
                        'declaracao','proposta','compromisso','promessa','posicionamento'
                      )),                              -- classificação conforme critérios publicados (Mapa Mestre §8)
  texto             TEXT NOT NULL,
  tema              TEXT,
  data_declaracao   TEXT,
  contexto          TEXT,               -- circunstâncias necessárias (Mapa Mestre §5)
  cadeia_etapa      TEXT CHECK (cadeia_etapa IN (
                        'declarou','propos','atuou','votou','executou','resultado'
                      )),
  status_id         INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  fonte_id          INTEGER REFERENCES fonte(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_declaracao_pessoa ON declaracao(pessoa_id);
CREATE INDEX idx_declaracao_tipo ON declaracao(tipo);

-- ============================================================
-- 5. EVIDÊNCIA, FONTE, CONTEXTO ("Passaporte da evidência" — Mapa Mestre §4)
-- ============================================================

CREATE TABLE evidencia (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo              TEXT NOT NULL,        -- documento, vídeo, registro, csv_oficial, etc.
  fonte_id          INTEGER NOT NULL REFERENCES fonte(id),
  url               TEXT,
  data_fato         TEXT,
  data_publicacao   TEXT,
  data_coleta       TEXT NOT NULL DEFAULT (datetime('now')),
  localizacao       TEXT,                 -- trecho, página, timestamp
  id_externo        TEXT,                 -- ID no sistema de origem (TSE/Câmara/Senado)
  hash_arquivo      TEXT,
  status_id         INTEGER NOT NULL DEFAULT 1 REFERENCES status(id),
  versao            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_evidencia_fonte ON evidencia(fonte_id);
CREATE INDEX idx_evidencia_id_externo ON evidencia(id_externo);

-- Tabela de ligação genérica: qualquer registro (declaração, votação, mandato...) pode ter N evidências
CREATE TABLE registro_evidencia (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tabela_referencia TEXT NOT NULL,        -- 'declaracao' | 'candidatura' | 'mandato' | 'voto_parlamentar' | ...
  registro_id       INTEGER NOT NULL,
  evidencia_id      INTEGER NOT NULL REFERENCES evidencia(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tabela_referencia, registro_id, evidencia_id)
);

CREATE INDEX idx_reg_evid_lookup ON registro_evidencia(tabela_referencia, registro_id);

-- ============================================================
-- 6. HISTÓRICO / VERSIONAMENTO (Arquitetura §3, etapa "Versionamento")
-- ============================================================

CREATE TABLE historico_alteracao (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tabela_referencia TEXT NOT NULL,
  registro_id       INTEGER NOT NULL,
  campo             TEXT NOT NULL,
  valor_anterior    TEXT,
  valor_novo        TEXT,
  motivo            TEXT,
  origem            TEXT NOT NULL DEFAULT 'coletor_automatico' CHECK (origem IN (
                        'coletor_automatico','curadoria_manual','contestacao_aceita'
                      )),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_historico_lookup ON historico_alteracao(tabela_referencia, registro_id);

-- ============================================================
-- 7. CONTESTAÇÃO (Mapa Mestre §2, "direito de resposta e contestação")
-- ============================================================

CREATE TABLE contestacao (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tabela_referencia TEXT NOT NULL,
  registro_id       INTEGER NOT NULL,
  solicitante_nome  TEXT,
  solicitante_email TEXT,
  solicitante_papel TEXT,               -- 'candidato' | 'assessoria' | 'cidadao' | 'terceiro'
  texto_contestacao TEXT NOT NULL,
  evidencia_anexada_id INTEGER REFERENCES evidencia(id),
  status            TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_analise','aceita','rejeitada')),
  resposta_equipe    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at       TEXT
);

CREATE INDEX idx_contestacao_lookup ON contestacao(tabela_referencia, registro_id);
CREATE INDEX idx_contestacao_status ON contestacao(status);

-- ============================================================
-- 8. MEU VOTOCHECK (Mapa Mestre §9) — separado dos dados de candidatos
-- ============================================================

-- Perguntas do quiz (rodada 1: 8-10 perguntas, sem peso de qualidade)
CREATE TABLE quiz_pergunta (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  rodada        INTEGER NOT NULL DEFAULT 1,   -- 1 = obrigatória; 2 = opcional (escala 0-10)
  ordem         INTEGER NOT NULL,
  texto         TEXT NOT NULL,
  atributo_slug TEXT NOT NULL,                -- liga a pergunta a um atributo objetivo documentado do candidato
  ativa         INTEGER NOT NULL DEFAULT 1
);

-- Atributos objetivos e documentados de candidatos, usados para badges e correspondência do quiz
-- (Arquitetura §4: "Badges só existem com regra publicada e evidência")
CREATE TABLE atributo_candidato (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  candidatura_id    INTEGER NOT NULL REFERENCES candidatura(id),
  atributo_slug     TEXT NOT NULL,
  valor             TEXT NOT NULL,
  regra_publicada_url TEXT NOT NULL,          -- link para a metodologia pública que define o badge
  evidencia_id      INTEGER REFERENCES evidencia(id),
  status_id         INTEGER NOT NULL DEFAULT 2 REFERENCES status(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(candidatura_id, atributo_slug)
);

CREATE INDEX idx_atributo_candidatura ON atributo_candidato(candidatura_id);

-- Respostas do usuário (anônimas ou vinculadas a sessão — nunca vinculadas à identidade civil)
CREATE TABLE quiz_resposta_usuario (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sessao_id         TEXT NOT NULL,            -- identificador de sessão anônima (cookie/local storage), não PII
  pergunta_id       INTEGER NOT NULL REFERENCES quiz_pergunta(id),
  valor             TEXT NOT NULL,             -- resposta na rodada 1; peso 0-10 na rodada 2
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_quiz_resposta_sessao ON quiz_resposta_usuario(sessao_id);

-- ============================================================
-- 9. CONTROLE DE COLETA (operacional — não é dado de produto, é telemetria dos coletores)
-- ============================================================

CREATE TABLE execucao_coletor (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  coletor           TEXT NOT NULL,             -- 'tse_candidatos' | 'camara_deputados' | 'senado_senadores' | ...
  iniciado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  finalizado_em     TEXT,
  status            TEXT NOT NULL DEFAULT 'em_execucao' CHECK (status IN ('em_execucao','sucesso','falha_parcial','falha')),
  registros_lidos   INTEGER DEFAULT 0,
  registros_gravados INTEGER DEFAULT 0,
  registros_com_erro INTEGER DEFAULT 0,
  detalhes_erro     TEXT
);

CREATE INDEX idx_execucao_coletor_nome ON execucao_coletor(coletor, iniciado_em);
