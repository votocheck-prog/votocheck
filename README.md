# VotoCheck — Schema D1 + Coletor TSE

Entrega do dia 13/09: schema completo do banco (Cloudflare D1) e o coletor de candidatos do TSE (Worker + script de fallback local).

## O que está aqui

```
votocheck/
├── migrations/
│   └── 0001_schema_inicial.sql   ← schema completo D1 (22 tabelas), já validado
├── src/
│   ├── index.js                   ← Worker principal (rotas HTTP admin + cron handler)
│   ├── collectors/
│   │   ├── tse_candidatos.js      ← candidatos TSE (download → parse → upsert D1)
│   │   ├── tse_bens.js            ← bens declarados por candidato (TSE)
│   │   ├── camara.js              ← deputados, proposições, votações e votos nominais
│   │   └── senado.js              ← senadores, votações nominais e cruzamento Senado↔TSE
│   └── lib/
│       ├── tse_parser.js          ← parser de CSV no formato TSE (Latin-1, sentinelas, etc.)
│       ├── curadoria.js           ← listar/resolver pendências de cruzamento Senado↔TSE
│       └── curadoria_html.js      ← página HTML do painel de curadoria (GET /admin/curadoria)
├── scripts/
│   └── importar_local.mjs         ← PLANO B: roda na sua máquina, gera SQL para aplicar no D1
├── wrangler.toml                  ← configuração do Worker (D1 binding + Cron Trigger)
├── package.json
└── README.md                      ← este arquivo
```

## Cobertura por fonte

| Fonte | Coletores | Status de acesso a partir do sandbox |
| --- | --- | --- |
| TSE (`tse.jus.br`) | candidatos, redes sociais, bens | ⚠️ **Bloqueado (HTTP 403 Akamai)** — ver seção de risco abaixo |
| Câmara (`dadosabertos.camara.leg.br`) | deputados, proposições, votações, votos nominais | ✅ Testado e funcionando, sem bloqueio |
| Senado (`legis.senado.leg.br`) | senadores, votações nominais | ✅ Testado e funcionando, sem bloqueio |

Ou seja: **apenas os coletores do TSE têm o risco de bloqueio** descrito abaixo. Os coletores da
Câmara e do Senado foram testados com chamadas reais durante o desenvolvimento e funcionam sem
nenhum ajuste especial — podem ser publicados e testados via Worker imediatamente.

## ⚠️ Risco identificado — leia antes de testar

Ao tentar baixar os dados do TSE a partir do ambiente de desenvolvimento (sandbox), recebi
**HTTP 403 "Access Denied"** em TODOS os domínios do TSE testados:
- `cdn.tse.jus.br` (arquivos ZIP)
- `dadosabertos.tse.jus.br` (API CKAN)

O erro vem de um bloqueio da Akamai (CDN do TSE), referenciando `errors.edgesuite.net`. Isso é
muito provavelmente um bloqueio por **faixa de IP ou geolocalização do datacenter do sandbox**,
não um bloqueio ao "robô" em si — mas **isso ainda não foi confirmado nem para a rede da
Cloudflare (onde o Worker vai rodar) nem para a sua rede doméstica.**

**Antes de confiar no coletor automático, precisamos validar isso, na seguinte ordem:**

1. **Teste você mesmo, agora, pelo navegador:** abra
   [https://dadosabertos.tse.jus.br/dataset/candidatos-2026](https://dadosabertos.tse.jus.br/dataset/candidatos-2026)
   e tente baixar o ZIP de "Candidatos". Se funcionar no navegador, o bloqueio é específico
   para tráfego automatizado/datacenter — o que aumenta a chance de o Worker também ser bloqueado
   (Cloudflare Workers saem de IPs de datacenter, como o sandbox).

2. **Rode o script de fallback local** (`scripts/importar_local.mjs`) na sua máquina — ele faz o
   download real e, se falhar, te diz exatamente onde baixar manualmente. Este caminho garante a
   carga inicial independentemente do que acontecer com o Worker.

3. **Depois de published o Worker**, chame manualmente a rota
   `POST /admin/coletar/tse-candidatos` uma vez e veja se ele também recebe 403. Se sim, o
   coletor automático (cron) precisará de uma destas alternativas:
   - Usar um mirror de terceiros (ex: [brasil.io](https://brasil.io/dataset/eleicoes-brasil/candidatos/) —
     dataset público, mas a API deles agora exige uma chave de acesso gratuita, cadastro em
     [brasil.io/auth/tokens-api](https://brasil.io/auth/tokens-api/));
   - Rodar a atualização periódica também localmente (script) e fazer upload do SQL gerado,
     em vez de depender do cron do Worker;
   - Testar se adicionar headers de navegador real (User-Agent, Referer) contorna o bloqueio —
     já incluído no coletor, mas não testado contra o bloqueio real ainda.

**Não presumi que o Worker vai funcionar — o código já tem um `FALLBACK_BASE_URL` configurável em
`wrangler.toml` para apontar a um mirror sem precisar mudar código, exatamente por causa desse risco.**

## Passo a passo para colocar no ar

### 1. Criar o banco D1

```bash
npm install
npm run d1:create
```

Isso vai imprimir algo como:
```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copie esse `database_id` e cole em `wrangler.toml`, no campo `database_id` (linha com
`COLE_AQUI_O_DATABASE_ID_RETORNADO_PELO_WRANGLER`).

### 2. Aplicar o schema

```bash
# testar local primeiro (não afeta produção)
npm run d1:migrate:local

# depois aplicar no banco remoto real
npm run d1:migrate:remote
```

### 3. Testar o download manualmente (ver seção de risco acima)

```bash
# Roda na SUA máquina, fora do sandbox — é o teste mais confiável agora
node scripts/importar_local.mjs --ano=2026
```

Se funcionar, ele vai gerar `scripts/output/candidatos_2026.sql`. Aplique no banco:

```bash
wrangler d1 execute votocheck-db --remote --file=scripts/output/candidatos_2026.sql
```

### 4. Publicar o Worker

```bash
# defina um token de admin antes de publicar (protege as rotas /admin/*)
wrangler secret put ADMIN_TOKEN

npm run deploy
```

### 5. Testar a coleta automática via Worker

Comece pelos coletores da Câmara e do Senado — já confirmados sem bloqueio:

```bash
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/camara-deputados" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"

curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/senado-senadores" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

Depois de sincronizar deputados/senadores, colete proposições e votações (rodar
`camara-deputados`/`senado-senadores` primeiro é necessário para resolver o voto individual
de cada pessoa):

```bash
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/camara-proposicoes?ano=2026" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"

curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/camara-votacoes?dataInicio=2026-08-01&dataFim=2026-09-13" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"

curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/senado-votacoes" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

Só então teste o coletor do TSE (o único com risco de bloqueio):

```bash
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/tse-candidatos?ano=2026" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

Se retornar `{"ok": true, ...}`, o cron (já configurado em `wrangler.toml` para rodar
4x/dia) vai manter os dados atualizados sozinho. Se retornar erro 403 (bloqueio do TSE),
volte à seção de risco acima — os coletores de bens e redes sociais do TSE dependem de
candidatos já carregados, então rode `tse-candidatos` (ou o script local) antes deles.

Depois de confirmar tudo, dispare em sequência (ou deixe o cron cuidar disso):

```bash
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/tse-redes-sociais?ano=2026" -H "Authorization: Bearer SEU_ADMIN_TOKEN"
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/tse-bens?ano=2026" -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

Com candidatos do TSE e senadores já sincronizados, rode o cruzamento de identidade Senado↔TSE
(idempotente — pode repetir depois de cada nova sincronização de candidatos/senadores):

```bash
curl -X POST "https://SEU-WORKER.workers.dev/admin/coletar/senado-cruzamento-tse" \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

O retorno inclui `matchesAutomaticos` (fusões aplicadas) e `pendenciasAmbiguas` (registradas em
`historico_alteracao` para revisão manual, sem fusão automática).

Se houver `pendenciasAmbiguas`, abra o painel de curadoria no navegador para resolver cada uma
(ver detalhes na seção "Interface de curadoria manual" abaixo):

```
https://SEU-WORKER.workers.dev/admin/curadoria
```

A página vai pedir o `ADMIN_TOKEN` antes de mostrar as pendências.

Para acompanhar o que rodou (sucesso/falha, quantos registros por execução):

```bash
curl "https://SEU-WORKER.workers.dev/admin/execucoes" -H "Authorization: Bearer SEU_ADMIN_TOKEN"
```

## Decisões de design do schema

- **`SQ_CANDIDATO` é a chave de cruzamento**, não `NR_CANDIDATO` (que é só o número de urna,
  reutilizável entre eleições/candidatos). Isso está refletido na coluna
  `candidatura.sq_candidato_tse` com índice único `(ano_eleicao, sq_candidato_tse)`.
- **CPF nunca é gravado em claro** — vira `cpf_hash` (SHA-256) em `pessoa`, usado apenas para
  deduplicar a mesma pessoa entre candidaturas de anos diferentes (requisito de LGPD do projeto).
- **Toda tabela de conteúdo tem `status_id` e `fonte_id`** — reflete o modelo de governança do
  projeto (Mapa Mestre): nenhuma informação existe sem fonte rastreável e sem um status do enum
  (Confirmado, Em acompanhamento, Contestação registrada, Informação insuficiente, Depende de
  terceiros, Corrigido, Arquivado).
- **`evidencia` + `registro_evidencia`** implementam o "Passaporte da Evidência" do Mapa Mestre —
  qualquer registro (declaração, voto, mandato...) pode linkar N evidências sem precisar de uma
  coluna de evidência dedicada em cada tabela.
- **Cargos do MVP**: Presidente, Governador, Senador, Deputado Federal, Deputado Estadual,
  Deputado Distrital (todos os majoritários e proporcionais, conforme decidido) — tabela `cargo`
  já populada com os códigos oficiais do TSE (`CD_CARGO`).
- **`execucao_coletor`** é telemetria operacional (não é dado de produto) — permite monitorar se
  o cron está rodando, quantos registros ele leu/gravou/errou em cada execução.

## Decisões de design dos coletores de Câmara/Senado

- **Cruzamento pessoa única entre TSE e Câmara**: como a Câmara expõe CPF no detalhe do deputado,
  o cruzamento com o TSE usa `cpf_hash` diretamente — chave forte, sem ambiguidade.
- **Cruzamento pessoa única entre TSE e Senado** (`cruzarSenadoresComTse`, em `senado.js`): como o
  Senado não expõe CPF em nenhum endpoint público testado, este cruzamento é heurístico — nome +
  UF do mandato + data de nascimento (obtida via `/senador/{codigo}`, que ainda traz
  `DataNascimento` mesmo com os endpoints legados de autorias/votações desativados). Comparação
  de nome aceita correspondência exata ou mesmo conjunto de tokens (cobre nomes do meio
  reordenados/abreviados), e datas em formato TSE (`DD/MM/AAAA`) e Senado (`AAAA-MM-DD`) são
  normalizadas antes de comparar. **Só funde as duas pessoas quando os três critérios coincidem
  para exatamente UMA candidatura do TSE** — qualquer ambiguidade (nenhuma ou múltiplas
  candidaturas compatíveis) fica registrada em `historico_alteracao` como pendência de curadoria
  manual, sem fundir automaticamente. Quando há match, a pessoa do TSE (que já acumula
  candidaturas/bens/declarações) é preservada e recebe `id_senado`; a pessoa "solta" do Senado é
  removida após reapontar mandato, filiação partidária e votos para o registro unificado — cada
  alteração de campo fica auditada em `historico_alteracao`.
- **`camara.js`** usa `idOrgao=180` para filtrar votações de Plenário (onde a maior parte das
  votações nominais relevantes ocorre); votações em comissões ficam de fora por ora.
- **`senado.js`** usa os endpoints novos (`/processo`, `/votacao`) em vez dos legados
  (`/senador/{codigo}/autorias`, `/senador/{codigo}/votacoes`), que a própria API do Senado marca
  como descontinuados. Cada chamada a `/votacao?senador=X` já retorna o voto de TODOS os
  senadores presentes na sessão (não só do senador consultado) — o coletor deduplica por
  `codigoSessaoVotacao` para não gravar a mesma votação repetidamente.
- **Ordem de dependência importa**: rode sempre `camara-deputados`/`senado-senadores` antes de
  `camara-votacoes`/`senado-votacoes` — os votos individuais só são gravados se a pessoa já
  existir na tabela `pessoa` (resolvida por `id_camara`/`id_senado`).

## Interface de curadoria manual (pendências Senado↔TSE)

Quando `cruzarSenadoresComTse` encontra mais de uma candidatura do TSE compatível com um
senador (mesmo nome + UF + data de nascimento), ele grava a pendência em `historico_alteracao`
(`campo='id_senado_cruzamento'`) com os dados do senador em `valor_anterior` e a lista de
candidatos em `valor_novo` (ambos JSON) — e **não duplica a mesma pendência em execuções
repetidas do cron**, pois checa se já existe uma pendência aberta para aquele senador antes de
inserir de novo.

- **Painel web**: `GET /admin/curadoria` — página HTML autocontida (sem build, sem framework),
  servida diretamente pelo Worker. Pede o `ADMIN_TOKEN` uma vez (não é salvo no navegador) e
  lista cada pendência com o senador de um lado e os candidatos do TSE do outro (nome,
  candidaturas, ano, UF), com um botão "Este é o senador" por candidato e um botão "Nenhuma
  corresponde — rejeitar pendência".
- **API JSON usada pelo painel** (ambas exigem `Authorization: Bearer <ADMIN_TOKEN>`):
  - `GET /admin/curadoria/pendencias` — lista pendências abertas, já enriquecidas com os dados
    atuais de candidatura de cada pessoa candidata.
  - `POST /admin/curadoria/pendencias/:id/resolver` — corpo `{ "decisao": "aceitar"|"rejeitar",
    "pessoaDestinoId": <id ou null>, "curador": "<texto livre>" }`. Em `aceitar`, reaproveita a
    mesma função `mesclarPessoas` usada pelo cruzamento automático (repontar mandato/filiação/
    votos, preservar a pessoa do TSE, remover a pessoa "solta" do Senado). Em `rejeitar`, nenhuma
    fusão é feita — o senador permanece como pessoa separada. Em ambos os casos, grava uma nova
    linha em `historico_alteracao` (`campo='id_senado_cruzamento_resolvida'`,
    `origem='curadoria_manual'`) que faz a pendência não reaparecer na listagem — mantendo assim
    o histórico completo de quem decidiu o quê.
- **Riscos e limitações conhecidos**:
  - A rota `GET /admin/curadoria` em si não exige `ADMIN_TOKEN` (só serve HTML estático sem
    dados); o token só é checado nas chamadas JSON feitas pelo próprio painel. Isso significa que
    qualquer pessoa com a URL do Worker pode abrir a página, mas não pode ver nem alterar dados
    sem o token correto.
  - Não há múltiplos curadores com identidade verificada — o campo "curador" é texto livre
    enviado pelo painel (hoje fixo como `"painel-web"`); não há login, então a auditoria em
    `historico_alteracao.motivo` não garante *quem* de fato tomou a decisão, só que foi via este
    painel.
  - Segue o princípio de segurança já estabelecido no cruzamento automático: **nunca funde
    automaticamente** — mesmo o painel exige uma escolha humana explícita por pendência.

## Próximos passos (não incluídos nesta entrega)

- Coletor de proposta de governo (`proposta_governo_AAAA.zip`, dataset do TSE) e de coligações
  detalhadas — ainda não mapeados.
- Coletor de presença legislativa (`presenca` já existe no schema, mas os endpoints de
  frequência da Câmara/Senado ainda não foram testados nem implementados).
- Autenticação por curador individual (hoje é só um token compartilhado `ADMIN_TOKEN` para toda
  a equipe de curadoria) e uma tela de histórico dedicada (hoje a auditoria de decisões só é
  consultável via `SELECT * FROM historico_alteracao WHERE origem='curadoria_manual'`).
- Testar volumetria real: com todos os cargos majoritários e proporcionais em todas as 27 UFs,
  espera-se algo entre 150 mil e 200 mil candidaturas em 2026 — vale confirmar se o D1 (limite de
  10 GB por banco, sem limite de linhas documentado, mas com limite de tempo de execução por
  request em Workers) aguenta a carga inicial em uma única invocação ou se precisa
  paginar/dividir por UF. Os coletores da Câmara/Senado têm volume bem menor (513 deputados +
  81 senadores) e não devem ter esse problema; o gargalo de CPU time é mais provável na
  coleta de votações (um fetch por votação + um fetch de votos por votação).
