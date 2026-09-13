# VotoCheck — Continuidade da Infraestrutura (Cloudflare + GitHub)

Documento de continuidade gerado em **13/09/2026, 15:44 (America/Sao_Paulo)**.
Objetivo: registrar em detalhe tudo o que já foi configurado em produção e o que falta para concluir a publicação de votocheck.com.br, para que qualquer pessoa (ou uma sessão futura) possa continuar o trabalho sem precisar refazer investigação.

---

## 1. Status resumido

| Componente | Status |
|---|---|
| Domínio comprado (Registro.br) | ✅ Concluído |
| Zona DNS criada na Cloudflare | ✅ Concluído |
| Nameservers trocados no Registro.br | 🟡 Feito pelo usuário às ~15:44 (13/09/2026) — prazo informado pelo Registro.br: até 2h para propagar |
| Zona ativa na Cloudflare (`status: active`) | ⏳ Pendente — depende da propagação acima |
| Banco de dados D1 criado + schema aplicado | ✅ Concluído |
| Worker publicado (código + bindings + cron) | ✅ Concluído |
| Rotas do domínio → Worker | ✅ Concluído (aguardando zona ativar para funcionar de fato) |
| Registros DNS (A/CNAME proxied) | ✅ Concluído |
| Landing page provisória | ✅ Concluído (servida pelo próprio Worker) |
| Segredo `ADMIN_TOKEN` configurado | ✅ Concluído |
| Código no GitHub | ✅ Concluído — https://github.com/votocheck-prog/votocheck |
| Deploy automático (CI/CD) via GitHub Actions | ❌ Não configurado (opcional, ver seção 6) |
| Subdomínio `*.workers.dev` habilitado para teste | 🟡 Criado mas não habilitado (ver seção 5, limitação de API) |

**O que falta para o site funcionar em produção:** apenas a propagação DNS (nameservers) completar. Todo o resto já está pronto do lado da Cloudflare e do GitHub.

---

## 2. Contas e credenciais envolvidas

Este projeto foi **intencionalmente separado** de outro projeto do usuário ("Fila Free"), tanto no GitHub quanto na Cloudflare, por pedido explícito do usuário ("são projetos independentes").

### Cloudflare
- **Conta ativa para VotoCheck:** `votocheck@gmail.com`
- **Account ID:** `22688effbd9ab181498d04ccd2cc8d2e`
- Autenticação via **API Token** (não API Key legada), salvo como credencial customizada no ambiente com host `api.cloudflare.com`.
- **Importante:** existem múltiplas credenciais Cloudflare salvas nesta sessão (uma pertence ao outro projeto "Fila Free", conta `filafreebr@gmail.com`, Account ID `3a300fec01ad34812e5b622e409c3fd3` — **não tocar/revogar**). Como todas compartilham o mesmo "handle" de credencial por host, **a credencial usada em qualquer chamada é sempre a mais recentemente adicionada**. Se for adicionar uma nova credencial Cloudflare no futuro (para qualquer um dos dois projetos), **sempre reverificar a identidade ativa** antes de qualquer operação, com:
  ```bash
  curl -s https://api.cloudflare.com/client/v4/user | python3 -m json.tool
  ```
  (rodar via bash com `api_credentials=["custom-cred:api.cloudflare.com"]`)

- **Permissões do token atual** (editado pelo usuário ao longo da sessão): inclui, entre outras, as permissões de Conta necessárias para D1, Workers Scripts, Workers KV, DNS, SSL, além da permissão de **Zona → "Workers Routes" → Editar** (crítica — é uma permissão de Zona, não de Conta, e ficou faltando em duas iterações anteriores do token) e **Zona → "Zona" → Editar** (para criar zonas).

### GitHub
- **Organização/conta:** `votocheck-prog`
- **Repositório:** `votocheck-prog/votocheck` — criado manualmente pelo usuário
- Autenticação via **Personal Access Token (PAT)** salvo como credencial customizada com host `api.github.com`.
- O conector integrado de GitHub da plataforma (`github_mcp_direct`) **não foi usado** para este projeto — ele é vinculado a uma conta técnica/proxy compartilhada (`filafree-png`) sem opção de troca de conta, e o usuário optou por manter os dois projetos (Fila Free e VotoCheck) em contas GitHub totalmente separadas. Use sempre o PAT customizado (`custom-cred:api.github.com`) para operações neste repositório.

---

## 3. Detalhes técnicos do que foi criado

### 3.1 Zona DNS
- **Domínio:** `votocheck.com.br`
- **Zone ID:** `6fbd3f43be5fe58b94ff56de62437cd4`
- **Nameservers da Cloudflare** (que devem estar configurados no Registro.br):
  - `adi.ns.cloudflare.com`
  - `moura.ns.cloudflare.com`
- **Nameservers originais (Registro.br), antes da troca:**
  - `a.auto.dns.br`
  - `b.auto.dns.br`
- Criada via `POST /zones` (Cloudflare API v4), plano "Free Website".

### 3.2 Banco de dados D1
- **Nome:** `votocheck-db`
- **UUID:** `1de4bbee-3c8c-4043-91f9-fafd527c2f1f`
- **Schema aplicado:** `migrations/0001_schema_inicial.sql` (22 tabelas de domínio + `sqlite_sequence`), aplicado via `POST /accounts/{account_id}/d1/database/{uuid}/query` (múltiplos statements SQL em uma única chamada).
- **Tabelas confirmadas após aplicação:** `atributo_candidato`, `candidatura`, `cargo`, `contestacao`, `declaracao`, `evidencia`, `execucao_coletor`, `filiacao_partidaria`, `fonte`, `historico_alteracao`, `mandato`, `partido`, `pessoa`, `presenca`, `proposicao`, `quiz_pergunta`, `quiz_resposta_usuario`, `registro_evidencia`, `status`, `votacao`, `voto_parlamentar` (mais `_cf_KV` e `sqlite_sequence`, internas do D1/SQLite).

### 3.3 Worker
- **Nome do script:** `votocheck-coletor`
- **Entry point:** `index.js` (ES module)
- **Handlers detectados:** `fetch`, `scheduled`
- **Binding D1:** `DB` → `votocheck-db` (uuid acima)
- **Secret configurado:** `ADMIN_TOKEN` (gerado aleatoriamente, 32 bytes urlsafe, guardado apenas como secret do Worker — **não está em nenhum arquivo de texto do repositório**; se precisar recriar/rotacionar, gerar um novo valor e usar `PUT /accounts/{account_id}/workers/scripts/{script}/secrets`).
- **Cron trigger:** `["0 6,12,18,0 * * *"]` (UTC) — 4x ao dia, alinhado à frequência de atualização de dados do TSE em período eleitoral.
- **Publicado via API REST diretamente** (`PUT /accounts/{account_id}/workers/scripts/{script_name}`, multipart com `metadata` + módulos JS), **não via `wrangler` CLI** — o registro npm (`registry.npmjs.org`) está bloqueado no ambiente sandbox usado nesta sessão, então não foi possível instalar/rodar `wrangler` localmente.

  Módulos enviados: `index.js`, `vendor_unzipit.js`, `collectors/camara.js`, `collectors/senado.js`, `collectors/tse_bens.js`, `collectors/tse_candidatos.js`, `lib/curadoria.js`, `lib/curadoria_html.js`, `lib/landing_html.js`, `lib/tse_parser.js`.

- **Dependência vendorizada — `unzipit`:** o projeto usa a biblioteca `unzipit` (npm, MIT license) para descompactar os arquivos ZIP do TSE. Como o `npm install` não funcionou neste ambiente (registro bloqueado), o build já compilado da versão `1.4.3` foi baixado de um CDN público (`https://cdn.jsdelivr.net/npm/unzipit@1.4.3/dist/unzipit.module.js`, que espelha o pacote oficial do npm) e salvo localmente como `src/vendor_unzipit.js`. **O usuário aprovou explicitamente essa ação** durante a sessão (baixar/vendorizar código de terceiros fora do fluxo padrão de package manager).
  - Import ajustado em `src/collectors/tse_candidatos.js` e `src/collectors/tse_bens.js`: `import { unzip } from '../vendor_unzipit.js';` (antes: `from 'unzipit'`).
  - **Se em algum momento for possível rodar `npm install` / `wrangler` normalmente** (fora deste sandbox, ou quando o bloqueio de rede for removido), o ideal é reverter para a dependência oficial via `package.json` (`unzipit": "^1.4.3"` já está declarado ali) e trocar os imports de volta para `from 'unzipit'`, deixando o bundler (`wrangler`/`esbuild`) resolver normalmente. Isso não é urgente — o vendor funciona igual — mas é a forma "correta"/de longo prazo.

- **Subdomínio `workers.dev`:** foi criado (`votocheck.workers.dev`) via `PUT /accounts/{account_id}/workers/subdomain`, mas a habilitação do Worker nesse subdomínio (`PUT /accounts/{account_id}/workers/scripts/{script}/subdomain`) **falhou com erro "Method not allowed for this authentication scheme"** — esse endpoint específico da Cloudflare parece exigir a API Key legada em vez de API Token moderno. Não é bloqueante (o domínio próprio é o caminho de produção), mas significa que **não há uma URL de teste tipo `*.workers.dev` funcional agora**. Se quiser esse atalho de teste, será preciso fazer essa habilitação manualmente no painel Cloudflare (Workers & Pages → votocheck-coletor → Settings → Domains & Routes → Enable workers.dev route) ou usando a API Key legada.

### 3.4 Rotas e DNS
- **Rotas de Worker criadas** (zona `6fbd3f43be5fe58b94ff56de62437cd4`):
  - `votocheck.com.br/*` → `votocheck-coletor`
  - `www.votocheck.com.br/*` → `votocheck-coletor`
- **Registros DNS criados** (proxied, ou seja, "orange cloud" ativo — necessário para as rotas de Worker funcionarem):
  - `A votocheck.com.br → 192.0.2.1` (IP "documentação"/placeholder — não importa o IP real porque o tráfego é interceptado pela rota do Worker antes de chegar a qualquer origem; é só preciso ter *um* registro proxied para o Cloudflare "ligar" o proxy nesse hostname)
  - `CNAME www.votocheck.com.br → votocheck.com.br` (proxied)

### 3.5 Landing page
- HTML estático simples, sem dependências externas, com o texto "Em construção" e um resumo do projeto (fontes: TSE, Câmara, Senado).
- Vive em `src/lib/landing_html.js`, servido pelo `fetch()` handler do Worker na rota `GET /`.
- O antigo healthcheck JSON (que antes vivia em `GET /`) foi movido para `GET /healthcheck`.

### 3.6 Repositório GitHub
- Todo o código-fonte do diretório `votocheck/` foi publicado em https://github.com/votocheck-prog/votocheck, branch `main`.
- **Método de publicação:** como o protocolo `git` via HTTPS (`github.com`) não é alcançável pelo proxy de credenciais deste ambiente (só `api.github.com` está liberado), o push foi feito via **GitHub Git Data API** (criação de blobs → tree → commit → atualização de ref), script auxiliar em `/tmp/patch/github_push.py` (não faz parte do repositório, é só uma ferramenta de sessão).
- Estrutura publicada: `.gitignore`, `README.md`, `migrations/`, `package.json`, `scripts/`, `src/` (incluindo `vendor_unzipit.js`), `wrangler.toml` (já com o `database_id` real preenchido).

---

## 4. Decisões e justificativas importantes (não repetir essas perguntas)

1. **Por que Cloudflare e GitHub em contas separadas do outro projeto?** Pedido explícito do usuário — VotoCheck e "Fila Free" são aplicações independentes e não devem compartilhar infraestrutura nem colaboradores.
2. **Por que não usar o conector GitHub integrado da plataforma?** Ele está vinculado a uma conta técnica/proxy (`filafree-png`) sem seletor de conta real — tentativas de reconexão (incluindo janela anônima) sempre retornaram a mesma conta. É uma limitação estrutural da plataforma, não um erro de configuração.
3. **Por que Cloudflare via credencial customizada em vez do conector integrado?** O conector integrado (`cloudflare_api_key__pipedream`) estava retornando erro de formato de header de autenticação inválido (parecia ter uma API Key legada mal configurada). Em vez de depurar esse conector, o usuário optou por usar tokens modernos via credenciais customizadas.
4. **Por que vendorizar `unzipit` em vez de instalar via npm?** O registro `registry.npmjs.org` está bloqueado no ambiente sandbox desta sessão (erro 403), impedindo `npm install` e o uso do `wrangler` CLI. A alternativa (baixar o build já compilado via CDN jsdelivr) foi aprovada explicitamente pelo usuário após uma confirmação de segurança.
5. **Por que criar rotas de Worker manualmente com registros DNS "placeholder"?** É o padrão documentado da própria Cloudflare para expor um Worker em um domínio sem servidor de origem real — não há "site" tradicional atrás, o próprio Worker responde a tudo.

---

## 5. Limitações/pendências conhecidas do ambiente atual

- **`npm`/`wrangler` CLI indisponíveis** neste sandbox (registro bloqueado). Toda publicação do Worker foi feita via chamadas diretas à API REST da Cloudflare. Isso funciona bem para deploys pontuais, mas não substitui um pipeline de CI/CD real (ver seção 6).
- **Habilitação de `*.workers.dev` falhou** por incompatibilidade de esquema de autenticação nesse endpoint específico (exige API Key legada). Não bloqueia produção.
- **Múltiplas credenciais Cloudflare compartilhando o mesmo "handle"** — sempre reverificar a identidade ativa (`GET /user`) antes de qualquer operação sensível, especialmente se outra sessão/pessoa adicionar uma nova credencial Cloudflare no meio do caminho.

---

## 6. Próximos passos (em ordem, até a conclusão)

### Passo 1 — Confirmar propagação DNS (bloqueante, depende só do tempo)
O usuário trocou os nameservers no Registro.br em 13/09/2026 às ~15:44 (horário de Brasília); o próprio Registro.br informou um prazo de até 2 horas para propagação. **Verificar a partir de ~17:45 (13/09/2026):**

```bash
# Confirma nameservers publicados (esperado: adi.ns.cloudflare.com / moura.ns.cloudflare.com)
curl -s "https://cloudflare-dns.com/dns-query?name=votocheck.com.br&type=NS" -H "accept: application/dns-json"

# Confirma status da zona na Cloudflare (esperado: "active")
curl -s "https://api.cloudflare.com/client/v4/zones/6fbd3f43be5fe58b94ff56de62437cd4" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['status'])"
```
(rodar a segunda via bash com `api_credentials=["custom-cred:api.cloudflare.com"]`)

Se depois de 2-4h o RDAP do Registro.br (`https://rdap.registro.br/domain/votocheck.com.br`) ainda mostrar `a.auto.dns.br`/`b.auto.dns.br`, o usuário deve reabrir o painel do Registro.br e confirmar que a alteração foi de fato salva (às vezes exige confirmação por e-mail ou 2FA adicional).

### Passo 2 — Testar o site em produção
Depois que a zona estiver `active`:
```bash
curl -sI https://votocheck.com.br/
curl -sI https://www.votocheck.com.br/
```
Esperado: HTTP 200 com a landing page HTML. Testar também `https://votocheck.com.br/healthcheck` (deve retornar `{"status":"ok","service":"votocheck-worker"}`).

### Passo 3 — Validar SSL/HTTPS
A Cloudflare emite certificado universal automaticamente para zonas ativas — verificar se `https://` funciona sem aviso de certificado (pode levar até ~15 minutos extras após a zona ativar).

### Passo 4 — Rodar a primeira coleta de dados manualmente
Os coletores são protegidos por `ADMIN_TOKEN` (guardado como secret do Worker, não documentado em texto por segurança — se precisário recriar, gerar novo valor e atualizar via API). Exemplo de chamada (necessário ter o token em mãos):
```bash
curl -X POST "https://votocheck.com.br/admin/coletar/tse-candidatos?ano=2026" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
Repetir para os demais endpoints listados no cabeçalho de `src/index.js` (candidatos, redes sociais, bens, deputados, proposições, votações do Senado, cruzamento Senado-TSE).

**Atenção:** os coletores de TSE dependem de `cdn.tse.jus.br`, que em testes anteriores desta sessão retornou erro 403 (Akamai) quando acessado a partir da rede do sandbox. Vale testar se esse mesmo bloqueio ocorre a partir da rede da Cloudflare (é uma rede totalmente diferente, pode não ter o mesmo bloqueio) — só saberemos rodando a primeira coleta real.

### Passo 5 — Confirmar execução do cron automático
Depois de passar pelo menos um horário de cron (6h, 12h, 18h ou 0h UTC), verificar execuções registradas:
```bash
curl -s "https://votocheck.com.br/admin/execucoes" -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Passo 6 (opcional) — Configurar CI/CD via GitHub Actions
Ainda não configurado. Se quiser deploy automático a cada push no repositório `votocheck-prog/votocheck`, os passos seriam:
1. Criar um novo Cloudflare API Token dedicado a CI (permissões mínimas: `Account.Workers Scripts:Edit`, `Zone.Workers Routes:Edit`, `Account.D1:Edit`).
2. Salvar como secret do repositório GitHub (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
3. Criar `.github/workflows/deploy.yml` usando a action oficial `cloudflare/wrangler-action@v3` (essa roda em runners do GitHub, que têm acesso normal ao npm — não sofre o bloqueio deste sandbox).
4. Isso substituiria o processo manual via API REST direta usado até agora, permitindo voltar a usar `wrangler` e a dependência oficial do `unzipit` via npm (em vez do vendor atual).

### Passo 7 (opcional) — Habilitar `*.workers.dev` para testes
Se quiser uma URL de teste alternativa (sem depender do domínio custom), habilitar manualmente pelo painel Cloudflare (Workers & Pages → votocheck-coletor → Settings → Domains & Routes) ou investigar uso de API Key legada para esse endpoint específico.

### Passo 8 (opcional) — Revisar e eventualmente reverter o vendor do `unzipit`
Se em algum momento o ambiente de deploy passar a ter acesso ao npm (ex: via GitHub Actions do passo 6), reverter `src/vendor_unzipit.js` para a dependência oficial do pacote, restaurando os imports originais (`from 'unzipit'`) em `tse_candidatos.js` e `tse_bens.js`, e deixar de publicar via API REST direta em favor de `wrangler deploy`.

---

## 7. Referências rápidas (IDs e URLs)

- Zona Cloudflare: `votocheck.com.br` — Zone ID `6fbd3f43be5fe58b94ff56de62437cd4`
- Conta Cloudflare: `votocheck@gmail.com` — Account ID `22688effbd9ab181498d04ccd2cc8d2e`
- D1: `votocheck-db` — UUID `1de4bbee-3c8c-4043-91f9-fafd527c2f1f`
- Worker: `votocheck-coletor`
- Repositório: https://github.com/votocheck-prog/votocheck
- Nameservers Cloudflare (configurar no Registro.br): `adi.ns.cloudflare.com`, `moura.ns.cloudflare.com`
