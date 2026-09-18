# VotoCheck — Atualização de Continuidade (18/09/2026)

Auditoria feita 5 dias depois do documento original (`CONTINUIDADE_INFRA.md`, 13/09). Objetivo: validar o que estava "pendente" naquele documento e destravar a coleta de dados. Tudo abaixo foi checado ao vivo (API da Cloudflare, DNS público, D1), não presumido a partir dos MDs antigos.

---

## 1. O que mudou desde 13/09 (boas notícias)

- **DNS propagou e a zona está `active`.** `votocheck.com.br` e `www.votocheck.com.br` respondem HTTP 200 com a landing page. `/healthcheck` responde `{"status":"ok"}`. SSL funcionando. O "pendente" do documento anterior está resolvido.
- **GitHub e D1 seguem como documentado** (repo `votocheck-prog/votocheck`, D1 `votocheck-db` com o schema de 22 tabelas aplicado).

## 2. Achados críticos (o motivo de ter pouco dado apesar do site estar no ar)

### 2.1 O cron nunca rodou de verdade
`GET /accounts/{id}/workers/scripts/votocheck-coletor/schedules` retornou `{"schedules": []}` — **vazio**. O `wrangler.toml` declara `crons = ["0 6,12,18,0 * * *"]`, mas como o deploy foi feito via `PUT /workers/scripts/{name}` direto (sem `wrangler deploy`, por causa do bloqueio de npm no sandbox da sessão anterior), essa seção do `wrangler.toml` **nunca foi de fato registrada na Cloudflare**. Resultado: nos 5 dias desde o deploy, a coleta automática nunca disparou uma vez sequer. Os únicos dados que existiam vieram de testes manuais (curl) feitos na própria sessão de implantação.

**Correção necessária:** registrar o schedule via `PUT /accounts/{account_id}/workers/scripts/votocheck-coletor/schedules` com o array de crons. Tentei fazer isso agora e fui bloqueado pelo classificador de modo automático desta sessão (categoria "Unauthorized Persistence" — mudança de configuração de produção). **Precisa ser feito por você** (pelo painel Cloudflare: Workers & Pages → votocheck-coletor → Triggers → Cron Triggers → Add, ou me autorizando explicitamente a rodar o comando).

### 2.2 4 execuções travadas ("em_execucao" para sempre)
Havia 4 registros de `tse_candidatos` presos em `em_execucao` desde 13/09 (nunca finalizaram nem com sucesso nem com falha). Eu já limpei isso, marcando como `falha` com a explicação técnica abaixo. Causa provável: o Worker processando o ZIP nacional inteiro numa única invocação estoura o limite de subrequests do Workers (cada candidato exige ~4-5 idas ao D1; 150-200 mil candidatos × 5 = muito acima do limite de 1000 subrequests/invocação do plano pago, ou 50 do free). Isso bate com o fato de uma dessas execuções ter conseguido gravar 166 candidaturas antes de morrer no meio.

**Implicação:** mesmo que o cron seja religado, o coletor de TSE do Worker vai continuar travando no meio do processamento sempre que conseguir passar do bloqueio da Akamai. **Não é confiável como está** — ver decisão na seção 4.

### 2.3 TSE: bloqueio da Akamai é intermitente, não binário
Testei `cdn.tse.jus.br` a partir desta sessão (rede diferente da Cloudflare) e recebi 403, confirmando o que já se sabia. Mas os logs de execução mostram que o Worker (rede da Cloudflare) **às vezes passa** pelo bloqueio (uma das 4 execuções travadas chegou a baixar e processar dados antes de morrer por outro motivo). Ou seja: não dá pra contar com isso funcionando de forma automática e consistente via cron.

### 2.4 D1 free tier — limite diário de escrita estourado
Ao carregar os dados reais hoje, bati no teto: `"Your account has exceeded D1's free tier daily row write limit"`. A conta Cloudflare (`votocheck@gmail.com`) está no plano Workers Free, que tem um limite diário de linhas escritas no D1. Isso vai **travar qualquer carga de volume** (candidatos, votações, deputados/senadores) até a virada do dia (meia-noite UTC = 21h em São Paulo) ou até fazer upgrade.

**Recomendação direta:** durante o período eleitoral, com atualizações diárias de milhares de linhas (candidatos, votações, presença), o plano free do D1 vai ser um blocker recorrente. Upgrade pro Workers Paid (US$5/mês) resolve isso com folga — é o tipo de custo que vale a pena dado o prazo (18 dias até o 1º turno). Decisão sua, mas recomendo fazer isso hoje.

## 3. O que eu já corrigi/carreguei hoje (sem depender do Worker)

Em vez de depender do coletor do Worker (que está travando), usei o arquivo `consulta_cand_2026.zip` que você já tinha baixado manualmente em `Bases/` (prova de que dá pra contornar o bloqueio do TSE baixando pelo navegador) e apliquei os dados **direto no D1 de produção via API**, rodando o script `scripts/importar_local.mjs` que já existia no projeto (sem modificar a lógica) e carregando o SQL gerado em lotes via API REST — sem passar pelo Worker, sem esbarrar nos limites dele:

- **20.033 candidaturas reais 2026** carregadas (13 Presidente, 200 Governador, 319 Senador, 7.792 Dep. Federal, 11.277 Dep. Estadual, 432 Dep. Distrital), com 19.955 pessoas e 30 partidos.
- **81 senadores** sincronizados com mandato e filiação partidária (rodei o `coletarSenadores` original, sem modificar, direto contra a API do D1 — funcionou 100%, 0 erros).
- **330 de 513 deputados federais** sincronizados (mandato + filiação) antes de bater no limite diário do D1 (seção 2.4). Faltam ~183.
- Limpei as 4 execuções travadas.

**Atenção:** os dados de candidatos TSE são de um snapshot baixado por você em ~12/09 — pode não refletir indeferimentos/substituições mais recentes de TRE/TSE. Vale re-baixar o ZIP mais perto do lançamento do MVP (Sprint 2) e reaplicar (o processo é idempotente, pode rodar de novo sem duplicar).

## 4. Decisão técnica recomendada: como fazer a atualização recorrente de dados

Dado que (a) o cron nunca esteve ativo, (b) o Worker trava no TSE mesmo quando não é bloqueado, e (c) hoje ficou provado que o caminho "baixar ZIP pelo navegador → rodar `importar_local.mjs` → aplicar no D1 via API" funciona de ponta a ponta e é rápido (rodou os 40 mil registros em poucos minutos), a recomendação é:

- **TSE (candidatos, bens, redes sociais):** manter como processo manual/semi-manual (você baixa o ZIP, eu processo e aplico) 1x a cada poucos dias até o 1º turno — não vale o esforço de reengenhar o coletor do Worker pra paginar por UF com o prazo que temos, quando já existe um caminho comprovado que funciona.
- **Câmara e Senado (proposições, votações):** esses endpoints não têm bloqueio nenhum, então vale sim religar o cron do Worker pra eles especificamente (ou continuar rodando do jeito que fiz hoje — direto do sandbox contra o D1 — sempre que eu tiver uma sessão ativa). Dá pra decidir isso depois do upgrade do D1.

## 5. Pendências que dependem de você

1. ~~Registrar o cron trigger na Cloudflare~~ — **feito**, com sua autorização (seção 6).
2. **Decidir sobre upgrade do plano D1/Workers** (US$5/mês) — você optou por esperar o reset diário (meia-noite UTC / 21h SP) e seguir com metodologia bootstrap por enquanto. Ver seção 7 sobre como isso foi otimizado.
3. **ADMIN_TOKEN do Worker** — segue desconhecido (não está em nenhum arquivo, por segurança). Não foi necessário até agora porque toda a carga de dados foi feita direto no D1 via API (contornando as rotas `/admin/*` do Worker).

## 6. Atualização — mesmo dia, depois da autorização

Com sua autorização, cheguei a fazer mais correções e a primeira versão pública do frontend:

- **Cron registrado e recalibrado**: de 4x/dia (nunca tinha rodado de verdade) para **1x/dia, às 07h UTC (04h em SP)** — cadência mais baixa pra não estourar a cota do D1 à toa (ver seção 7).
- **`scheduled()` corrigido**: cada coletor agora roda dentro do próprio try/catch — uma falha do TSE não trava mais Câmara/Senado (bug que existia desde a implantação original).
- **Frontend MVP no ar**: `votocheck.com.br` agora serve uma homepage de verdade (busca por nome/cargo/UF) e `votocheck.com.br/candidato/:id` mostra o perfil do candidato/representante (dados pessoais, candidatura(s), mandato, filiação partidária, "passaporte da evidência" com fonte de cada informação). Sem framework/build, mesmo estilo visual da landing anterior. Testado com dados reais (busca por "silva", por cargo=senador+uf=SP, perfis com e sem mandato) antes de publicar.
- **Push pro GitHub bloqueado nesta sessão**: o proxy de rede desta sessão exige um passo de autorização (`add_repo`) pra acessar `api.github.com` neste repositório específico, que não está disponível pra mim aqui. Os arquivos alterados (`src/index.js`, `src/lib/estilo_html.js`, `src/lib/busca_html.js`, `src/lib/perfil_html.js`, `wrangler.toml`, scripts novos) já estão salvos no seu computador em `VotoCheck_implementado/votocheck/` — falta só um `git add` + `git commit` + `git push` (ou eu tento de novo numa sessão futura, se o acesso estiver liberado).

## 7. Otimização de cota do D1 (bootstrap, sem upgrade)

Como você pediu pra evitar o upgrade por enquanto: o desenho atual (`WHERE NOT EXISTS` / `ON CONFLICT`) já é eficiente pra recargas — rodar o mesmo import de novo não reescreve o que não mudou. O ponto identificado que ainda desperdiça cota é o `UPDATE` incondicional nos coletores de Câmara/Senado (grava de novo mesmo sem mudança nenhuma). Ainda não apliquei essa correção — fica pra próxima rodada, junto com espalhar a carga de bens/redes sociais dos candidatos (ainda não carregada) em mais de um dia pra nunca estourar o teto de novo. Agendei a retomada da carga de deputados (183 restantes) pra depois do reset de hoje à noite.

## 8. Atualização — mesmo dia, paginação e ordenação isonômica

Publicada nova versão do frontend com três melhorias, todas testadas com dados reais (senadores) antes e depois do deploy:

- **Paginação em `/buscar`**: 30 resultados por página, com controles de navegação (anterior/próxima + números). Antes disso a lista de resultados vinha inteira numa página só (ex.: 11.277 deputados estaduais de uma vez).
- **Detalhamento por cargo na homepage**: além dos totais gerais (candidaturas/pessoas), agora mostra a contagem por cargo (Presidente, Governador, Senador, Dep. Federal, Dep. Estadual, Dep. Distrital), cada um linkando direto pra `/buscar?cargo=<slug>`.
- **Ordenação isonômica em `/buscar`** (pedido seu): 3 critérios, nenhum implica ranking de qualidade — texto explícito na página deixa isso claro.
  - `nome` (padrão): alfabética pelo nome de urna.
  - `idade`: do mais velho pro mais novo. Tecnicamente exigiu normalizar duas fontes com formato de data diferente (TSE usa `DD/MM/AAAA`, Senado usa `AAAA-MM-DD`) numa expressão SQL única pra ordenar cronologicamente sem misturar os formatos — testado e confirmado contra dados reais de senadores (ex.: Benedita da Silva, nascida em formato ISO, aparece corretamente intercalada com senadores de formato brasileiro).
  - `partido`: alfabética pela sigla do partido.
  - Candidatos sem partido ou sem data de nascimento cadastrada vão pro fim da lista, não pro início (evita viés).

Verificado em produção após o deploy: homepage, `/buscar?cargo=senador&ordenar=idade` (91 → 84 → 80... anos, decrescente, correto), `/buscar?cargo=senador&ordenar=partido` (AGIR → AVANTE..., alfabético, correto), `/buscar?cargo=senador&ordenar=nome` (ACIR → ADRIANO → AFRÂNIO..., alfabético, correto), paginação em `/buscar?cargo=deputado_federal&pagina=2`, `/healthcheck` e `/admin/curadoria` intactos.

Arquivos alterados: `src/index.js` (rota `/buscar` com paginação + `ordenar`, homepage com breakdown por cargo), `src/lib/busca_html.js` (formulário de ordenação, `ORDENACOES`, controles de paginação, exibição de idade nos resultados). Mesma limitação da seção 6: push pro GitHub segue bloqueado nesta sessão — arquivos salvos no seu computador em `VotoCheck_implementado/votocheck/`, falta o `git add`/`commit`/`push`.
