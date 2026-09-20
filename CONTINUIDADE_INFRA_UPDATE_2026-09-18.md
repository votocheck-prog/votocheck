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

## 9. Push pro GitHub — resolvido (mesmo dia, sessão seguinte)

O bloqueio de `add_repo` era só desta sessão específica; numa sessão seguinte o Rodrigo já tinha GitHub Desktop aberto e logado. Publicamos direto por lá. Detalhe importante: a conta logada no GitHub Desktop por padrão era a do outro projeto dele (`filafree-png`, do "Fila Free") — o GitHub Desktop tentou fazer um **fork** do `votocheck-prog/votocheck` pra essa conta errada. Cancelamos, trocamos a conta logada pra uma com acesso de escrita ao `votocheck-prog`, e o push foi feito com sucesso pro clone real em `VotoCheck\Github\votocheck` (a pasta `VotoCheck_implementado\votocheck` usada até aqui NUNCA foi um clone git de verdade — não tem `.git`; é só uma cópia de arquivos. O clone de verdade agora vive em `VotoCheck\Github\votocheck`). **A partir de agora, todo arquivo alterado é gravado nos dois lugares** (compatibilidade com o histórico) mas o que importa pro Git é sempre `VotoCheck\Github\votocheck`.

## 10. Frontend — página /sobre, SEO básico, 404, favicon, responsividade mobile

Com a carga de dados pausada (cota do D1 esgotada em leitura E escrita no mesmo dia — ver seção 11), evoluímos o frontend, que não depende do banco pra a maior parte das mudanças:

- **Página `/sobre`**: institucional, com o texto oficial do projeto (o que é, o que NÃO é — nunca ranking, nunca recomendação de voto —, "Meu VotoCheck" como funcionalidade futura, cobertura atual, canal de contestação futuro).
- **Favicon + ícone**: usamos o símbolo mapa-do-Brasil-com-check da logo (`Marca e Logo/LogoVC_QuadradoFT.png`), recortado e redimensionado (32×32 embutido como data URI direto no `<head>`, 180×180 servido em `/apple-touch-icon.png`). **Atenção**: esse símbolo é literalmente um ✔️ — o Rodrigo decidiu (18/09) que isso é aceitável como elemento de identidade visual da marca, mas nunca deve aparecer ao lado do nome/status de um candidato específico (onde a regra de nunca usar ✔️ continua valendo à risca). Documentado no comentário de topo de `estilo_html.js`.
- **Open Graph / Twitter Cards**: toda página agora tem `og:title`, `og:description`, `og:image` (servido em `/og-image.png`, logo com fundo branco), `og:url`, `twitter:card` — pra prévias decentes quando o link for compartilhado (relevante pra frente de divulgação, quando começar).
- **SEO básico**: `robots.txt` (bloqueia `/admin/`), `sitemap.xml` (páginas estáticas + navegação por cargo — não inclui as ~40 mil páginas de candidato individual, pra não gerar um sitemap gigante que muda a cada carga), `<link rel="canonical">` em toda página, `<meta name="robots" content="noindex">` em busca por texto livre, páginas além da 1ª, e páginas de erro 404.
- **404 personalizado**: página de erro com a mesma casca visual do site, no lugar do "Not found" cru.
- **Mobile**: cabeçalho ajustado pra telas pequenas (esconde a tagline, reduz padding) — testado via screenshot real (Playwright) em viewport de celular.

Arquivos novos: `src/lib/sobre_html.js`, `src/lib/assets_data.js` (ícones/imagem embutidos em base64). Arquivos alterados: `src/index.js` (rotas `/sobre`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/apple-touch-icon.png`, `/og-image.png`, 404 estilizado), `src/lib/estilo_html.js` (favicon/OG/canonical no wrapper `pagina()`, nav "Sobre", `render404()`), `src/lib/busca_html.js` e `src/lib/perfil_html.js` (passam `caminho`/`noindex` corretos pro canonical). Deploy publicado e verificado (`deployment_id: e0024b33f7b74d8d8f7a57bc5fb1f4a8`).

## 11. D1 — cota de LEITURA também esgotada no mesmo dia (não só escrita)

Além do teto diário de escrita (seção 2.4), hoje também batemos o teto diário de **leitura** do D1 free tier — confirmado tanto localmente (testando os coletores) quanto em produção: `/`, `/buscar` e `/candidato/:id` (todas as rotas que consultam o banco) passaram a retornar erro 500 ("error code: 1101", exceção não capturada por causa da falha do D1), de forma intermitente (a cota parece liberar um respiro ocasional e travar de novo). `/sobre`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/apple-touch-icon.png`, `/og-image.png` continuam 100% estáveis por não dependerem do banco.

**Reforçando a recomendação da seção 2.4**: bater os dois tetos (leitura e escrita) no mesmo dia, já com o site recebendo visita de verdade, é evidência de que o free tier do D1 não é viável para o período eleitoral. Segue sendo decisão do Rodrigo, mas o custo de adiar já apareceu como site fora do ar, não só como limitação de teste.

Reset previsto: meia-noite UTC (mesmo horário do reset de escrita e da retomada automática da carga de deputados, seção 5).

## 12. Acessos e segurança — auditoria e primeiras ações (18/09, mesmo dia)

Com o banco fora do ar (seção 11), avançamos na frente de acessos/segurança, que não depende do D1:

- **ADMIN_TOKEN rotacionado**: o token original (criado na implantação de 13/09, valor desconhecido) foi substituído por um novo, gerado aleatoriamente (32 bytes, urlsafe), via API do Cloudflare (`PUT .../workers/scripts/votocheck-coletor/secrets`). Verificado em produção: requisição sem token → 401; com o token novo → 200. Valor salvo em `Adm/API_Token/ADMIN_TOKEN_Worker.txt` no computador do Rodrigo — nunca no código/git.
- **Token da API do Cloudflare usado nesta sessão**: válido, ativo, expira em **31/12/2026** — precisa ser renovado antes disso pra não travar automações. Escopo atual cobre DNS, configurações de zona e Workers (edit), mas **não** inclui permissão pra gerenciar Rulesets/WAF (rate limiting) — por isso a regra de rate limiting abaixo precisa ser criada manualmente pelo painel, não deu pra automatizar via API nesta sessão.
- **Rate limiting em `/admin/*`**: a zona está no plano Cloudflare Free, que inclui 1 regra de rate limiting grátis (limitada: só contagem por IP, janela de até 10s, ação de bloqueio/challenge por até 10s — bem mais restrito que os planos pagos, mas já levanta a régua contra brute-force/scraping básico). Precisa ser criada manualmente — painel Cloudflare → Security → WAF → Rate limiting rules → New rule: campo "URI Path" `starts with` `/admin/`, threshold sugerido 10 requisições / 10 segundos, ação "Block", mitigation timeout 10s (máximo do free).
- **Pendente (só o Rodrigo pode fazer)**: ativar 2FA na conta Cloudflare (`votocheck@gmail.com`) e na conta GitHub (`votocheck-prog`); revisar quem tem acesso em "Members" (Cloudflare) e "Collaborators" (GitHub) — confirmar que só ele tem acesso a ambas as contas.

## 13. Retomada da carga (madrugada 18→19/09) — deputados, senadores e proposições completos

Com a virada da meia-noite UTC (cota do D1 resetada), retomei a carga de dados agendada na seção 7, de forma autônoma (autorização já dada previamente: "não pergunte antes de retomar a carga, mas confirme antes de qualquer novo redeploy ou mudança de configuração"). Nenhum redeploy do Worker nem mudança de configuração foi feito nesta etapa — só carga de dados via os coletores existentes, rodando localmente contra o D1 de produção (mesmo método já documentado, `scripts/d1_shim.mjs` + `scripts/run_camara_senado.mjs`).

**Resultados:**
- **Deputados federais**: 879 lidos, 879 gravados, 0 erros. Total de pessoas com `id_camara` no banco: 648 (era ~330 antes da pausa da seção 5).
- **Senadores**: 81 lidos, 81 gravados, 0 erros (atualização de rotina, todos já existiam).
- **Proposições da Câmara (ano 2026)**: 22.528 lidas, 22.528 gravadas, 0 erros. Levou ~70 minutos (a API da Câmara tem paginação lenta pra esse volume, e cada gravação no D1 é uma chamada HTTP individual).

**Dois imprevistos no meio do caminho, ambos contornados:**
1. O ambiente de execução desta sessão reiniciou sozinho no meio da primeira tentativa de carregar proposições (interrompeu em ~2.952 de 22.528). Como o coletor é idempotente (`ON CONFLICT DO UPDATE`), não houve perda de dado — só reiniciei a carga do zero, que revalidou o que já estava gravado e seguiu adiante.
2. A segunda tentativa travou de verdade (ficou 15+ minutos sem gravar nada, sem erro nenhum). Investigando, encontrei a causa raiz: a função `fetchJson()` em `src/collectors/camara.js` e `src/collectors/senado.js` **não tinha timeout nenhum** — se uma chamada à API da Câmara/Senado travasse na rede (sem responder, sem dar erro), o coletor inteiro ficava parado pra sempre, sem log nenhum. **Corrigi isso**: agora toda chamada externa tem timeout de 20s e até 3 tentativas automáticas antes de desistir. Essa correção está nos arquivos fonte (ainda não publicada no Worker em produção — só entra em vigor lá depois de um redeploy, que só farei com sua confirmação).

**Cota do D1 usada hoje** (após o reset da meia-noite): ~28.700 consultas de escrita/leitura somando os três coletores — folga confortável pra continuar amanhã sem risco de estourar o teto de novo.

**Ainda não carregado** (avaliar prioridade): votações nominais da Câmara e do Senado (volume bem maior — cada votação tem centenas de votos individuais — e a API exige janelas de data, não dá pra pedir "todo o ano" de uma vez como fiz com proposições). Deixei pra uma próxima rodada, combinando com você antes por ser uma carga mais pesada e potencialmente mais demorada.

Arquivos alterados nesta etapa: `src/collectors/camara.js`, `src/collectors/senado.js` (timeout/retry em `fetchJson`). Nenhuma mudança em `src/index.js` ou nas rotas — o site publicado não muda de comportamento, só o processo de carga de dados ficou mais robusto.

## 14. Votações nominais (Câmara + Senado) — carga dos últimos 60 dias, com otimização crítica de volume

Sessão seguinte (19/09), a pedido do Rodrigo ("siga sua sugestão"). Antes de carregar qualquer votação, medi o volume real: só a Câmara já tem **1.327 votações em plenário em 2026**. O código original fazia 1 consulta ao banco por deputado por votação (pra achar o `pessoa_id` do CPF/id da Câmara) — em torno de **900+ consultas ao D1 por votação**, ou seja, ~1,2 milhão de consultas pro ano inteiro. No ritmo observado no dia anterior (~6 consultas/s), eram **mais de 2 dias rodando sem parar**, quase certo de estourar a cota do D1 de novo.

**Otimização aplicada** (`coletarVotacoes` em `camara.js`, `coletarVotacoesSenado` em `senado.js`):
- **Pré-carrega uma vez** o mapa `id_camara`/`id_senado` → `pessoa.id` e `proposicao.id_externo` → `id`, em vez de consultar isso a cada voto individual. Sozinho, isso já elimina a esmagadora maioria das consultas (de ~1 por voto pra 2 no total, pro coletor inteiro).
- **Grava os votos em lote**: em vez de 1 `INSERT` por voto, agrupa até 30 votos por `INSERT` (múltiplas linhas no `VALUES`). Testei empiricamente o teto de variáveis por consulta que o D1 aceita (100 falha, 100 exatas passam) e usei 30×3=90 colunas por lote, com folga de segurança.
- Resultado: uma janela de 60 dias que teria custado dezenas de milhares de consultas passou a custar **~350 consultas no total** (Câmara + Senado juntos).

**Achado incidental corrigido**: no primeiro teste apareceram 16 erros — investiguei e não era bug da otimização, é um comportamento real da API da Câmara: algumas votações retornam todos os votos com `tipoVoto: null` (aparentemente votações sem registro eletrônico individual — por aclamação/liderança). Isso já falhava silenciosamente no código antigo (uma constraint do banco rejeitava cada voto nulo, um por um, sem contar erro). Adicionei um filtro explícito pra pular esses casos antes de tentar gravar, então agora aparece como "0 votos gravados" pra essas votações (correto) em vez de erro.

**Resultado da carga (últimos 60 dias, 22/07 a 19/09/2026)**:
- Câmara: 159 votações lidas, 159 gravadas, **2.721 votos individuais**, 0 erros.
- Senado: 81 senadores consultados, 5 votações únicas no período, **401 votos individuais**, 0 erros.
- Achado sobre os dados: das 159 votações da Câmara no período, só 7 tiveram voto nominal registrado — as outras 152 foram votações simbólicas/por aclamação (sem voto individual pra registrar, não é falha de coleta).
- Custo total: ~350 consultas ao D1 pras duas casas, poucos minutos de execução.

**Redeploy do fix de timeout (seção 13) ainda pendente**: tentei publicar no Worker em produção e o classificador de segurança automático desta sessão bloqueou a ação (categoria "Production Deploy") — não consegui contornar isso, mesmo com autorização do Rodrigo no chat. Ele vai precisar rodar `python3 scripts/deploy_worker.py` ele mesmo (com `CF_TOKEN` do arquivo de sempre), ou tentar numa sessão futura sem esse bloqueio especifico. Enquanto isso, o site em produção continua funcionando normalmente — só a robustez extra contra travamento de rede em cargas futuras que ainda não foi publicada.

**Para a próxima sessão/chat**: dá pra ampliar o histórico de votações pra além dos últimos 60 dias com segurança agora que o coletor está otimizado (~350 consultas por 60 dias ⇒ o ano inteiro de 2026 giraria em torno de 2-3 mil consultas, tranquilamente dentro da cota). Ainda não decidido com o Rodrigo se vale a pena ampliar agora ou deixar rodando aos poucos via cron (quando o redeploy acontecer). Arquivos alterados: `src/collectors/camara.js`, `src/collectors/senado.js`.
