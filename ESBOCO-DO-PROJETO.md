# Market Now — Esboço do Projeto

> Plataforma de análise de mercado financeiro e gestão de cliente criada para
> profissionais de investimentos (assessores/gestores). MVP completo com
> backend, frontend, banco e infraestrutura de tempo real.

---

## 1. Visão geral

| Camada | Stack | Onde fica |
| ------ | ----- | --------- |
| Backend (API) | Node.js 22, TypeScript, Express 4, Prisma 6, PostgreSQL (Neon) | `backend/` |
| Frontend (App) | Next.js 14, React 18, Tailwind CSS, Socket.IO client | `frontend/` |
| Tempo real | Socket.IO (quotas, notícias, alertas, tarefas) | backend `src/config/socket.ts` |
| Fila/futuro | Redis (Upstash) / BullMQ (previsto, não ativo) | backend `src/config/redis.ts` |
| Deploy | Render (API) + Vercel (app) | `https://mercado-financeiroo.onrender.com` / `.vercel.app` |

Padrões gerais: autenticação JWT (+ refresh + MFA opcional/TOTP), autorização
por papel (USER/ADMIN), `helmet`, rate limiting, logs estruturados (pino),
validação `zod` nos controllers, CORS explícito, eventos de domínio no backend.

---

## 2. Backend — módulos (`backend/src/modules`)

### auth — Autenticação e segurança
- `POST /login`, `/logout`, `/refresh` — sessão JWT com refresh token.
- `POST /forgot-password`, `/reset-password` — recuperação de senha.
- `POST /mfa/setup`, `/mfa/enable`, `/mfa/disable`, `/mfa/verify` — MFA via TOTP.
- `GET /me` — perfil/logado; alimenta a sidebar.
- Gestão de sessões no banco (revogação em logout).

### admin — Administração de usuários
- CRUD de usuários (`GET/POST /users`, `PUT/DELETE /users/:id`).
- Controle de papéis e criação de usuários da equipe.

### audit — Trilha de auditoria
- `GET /` — registro de ações do sistema (quem fez o quê, IP, payload).

### dashboard — Visão geral
- `GET /dashboard` — monta o resumo da home: mercado agora, top gainers/losers,
  setores, últimas notícias, clientes prioritários e tarefas do dia.

### market — Mercado (ações, cripto, forex, ETFs, índices)
- `GET /` — lista ativos com cotações.
- `GET /movers` — maiores altas/baixas.
- `GET /sectors/performance` — desempenho por setor.
- `GET /:ticker` e `GET /:ticker/bars` — ativo individual e histórico (barras).

### screener — Filtro de ativos
- `GET /` — busca/filtro combinado (setor, tipo, faixa de preço, etc.).

### research (frontend) — Análise
- Overview do mercado, desempenho por setor e comparador de ativos
  (renderiza dados de `market` + `ai`).

### macro — Macroeconomia
- `GET /`, `/regions`, `/observations/:code` — indicadores por região.

### news — Notícias
- `GET /latest`, `GET /:id` — feed com sentimento (score por notícia).

### calendar — Calendário econômico
- `GET /`, `/upcoming` — eventos agendados (próximos releases).

### alerts — Alertas de mercado
- CRUD de alertas + marcação de "entregas lidas"; gatilhos via eventos
  (`alert:triggered` no Socket.IO).

### watchlist — Listas de acompanhamento
- CRUD de watchlists e associação de ativos com reordenação.

### clients — CRM de clientes
- CRUD de clientes + `GET /priority` (priorização por score).
- Interesses, notas e contatos por cliente (`/:id/interests`, `/:id/notes`...).

### retention — Prevenção de churn
- `GET /workbench`, `/metrics` e `POST /recalc/:id` — score de retenção e risco
  por cliente, recalculável.

### deposits — Operações/Depósitos
- `GET /`, `/dashboard`, `/clients/:id` e `POST /` — lançamentos por cliente.

### tasks — Tarefas da equipe
- CRUD + `GET /today` — agenda do dia; cria eventos em tempo real.

### reports — KPIs e relatórios
- `GET /kpis` — indicadores consolidados para `frontend/reports`.

### notifications — Notificações
- `GET /`, `POST /read-all`, `POST /:id/read` — central de notificações com
  leitura em lote.

### integrations — Integrações externas
- `GET /`, `POST /`, `PUT /:id`, `GET /health` — cadastro de provedores
  (Ex.: Alpha Vantage / Twain / etc.).

### ai — Inteligência artificial (IA gratuita via Groq)
- `GET /briefing` — resumo/relatório gerado por IA (escopos: plataforma, ativo,
  cliente, setor, notícias). Sem chave de IA, usa templates com dados reais.
- `GET /questions` + `POST /onboarding` — questionário de perfil (8 perguntas)
  que calcula `RiskProfile` (Conservador/Moderado/Arrojado) e `ClientType`.
- `GET /tips` — dicas de investimento (momentum, fundamentos, dividendos,
  setores, eventos, carteira sugerida).
- `GET /clients/:clientId/sketch` — esboço automático do cliente (persistido
  como nota `[IA] Esboco do cliente`).
- `POST /chat` — chat com IA para tirar dúvidas e pedir "palpites" de subida/
  queda. Contexto = snapshot real do mercado (BTC/ETH/gainers/losers).
- `GET /requests` — histórico de solicitações de IA.
- **Provider:** Groq (plano gratuito, `llama-3.3-70b` → hoje `openai/gpt-oss-120b`)
  via `GROQ_API_KEY`; OpenAI continua como opção (`OPENAI_API_KEY`). Sem chave,
  opera em modo template (regras + dados reais da plataforma).

### health — Observabilidade
- `GET /overview` — status de API, banco, cache e dependências (liveness).

---

## 3. Frontend — páginas (`frontend/src/app`)

| Rota | Página | Função |
| ---- | ------ | ------ |
| `/login` | login | Autenticação + MFA. Nova UI 2026: painel de marca, idiomas PT/EN/ES. |
| `/forgot-password` | forgot-password | Recuperação de senha. |
| `/dashboard` | dashboard | Home com resumo em cards. |
| `/market/*` | market | Ações, crypto, forex, ETFs, índices. |
| `/research/*` | research | Overview, setores, comparador. |
| `/news` | news | Feed com sentimento. |
| `/macro` | macro | Indicadores macro por região. |
| `/calendar` | calendar | Calendário econômico. |
| `/clients` | clients | CRM. |
| `/retention` | retention | Workbench anti-churn. |
| `/deposits` | deposits | Operações/Depósitos. |
| `/watchlist` | watchlist | Listas de acompanhamento. |
| `/alerts` | alerts | Alertas de mercado. |
| `/tasks` | tasks | Tarefas. |
| `/reports` | reports | KPIs. |
| `/assistant` | assistant | Assistente IA (briefing). |
| `/notifications` | notifications | Central de notificações. |
| `/integrations` | integrations | Proveedores. |
| `/admin` | admin | Gestão de usuários. |
| `/audit` | audit | Auditoria. |
| `/health` | health | Observabilidade. |

Componentes compartilhados:
- `src/components/layout.tsx` — sidebar + topbar + logout; agora multilíngue.
- `src/components/ui.tsx` — Card, badges, tabela, spinner, formatadores.
- `src/components/LanguageSwitcher.tsx` — seletor PT/EN/ES.

Serviços frontend:
- `src/lib/api.ts` — cliente HTTP com JWT + refresh automático.
- `src/lib/socket.ts` — cliente Socket.IO.
- `src/lib/i18n.tsx` — **novo**: provider de idioma (pt/en/es), persistência em
  `localStorage`.

---

## 4. Banco de dados (Prisma + Neon PostgreSQL)

Modelos principais (`backend/prisma/schema.prisma`):
- **Usuários/sessões**: `User`, `Session`, MFA.
- **Ativos/cotações**: `Asset`, `Quote`, `Fundamental`, `Bar` (histórico).
- **Conteúdo**: `News`, `NewsSentiment`, `MacroObservation`, `EconomicEvent`.
- **CRM**: `Client`, `ClientInterest`, `ClientNote`, `Contact`, `Deposit`,
  `RetentionScore`, `Task`.
- **Operacional**: `Alert`, `Watchlist`, `WatchlistAsset`, `Notification`,
  `Integration`, `AuditLog`, `AIRequest`, valores e papeis.

Seed (`prisma/seed.ts`) cria usuário demo **admin@mercado.com / admin123** e
popula ativos/cotações/setores/notícias/clientes.

---

## 5. Como os dados são atualizados

- **Preços ao vivo (atual):** o backend roda um **scheduler** (`marketData.ts`)
  que atualiza as cotações a cada **10 minutos** (configurável via
  `MARKET_UPDATE_INTERVAL_MS`, mínimo 60 s), emitindo `QUOTE_UPDATED` via
  Socket.IO. Fontes externas sem chave:
  - **Cripto:** CoinGecko (batch) → Yahoo Finance (`BTC-USD`) → Coinbase →
    Binance → simulação ancorada.
  - **Ações/ETF/índice/forex:** Yahoo Finance (com `User-Agent`), com fallback
    de simulação **ancorada no último preço real** (nunca diverge muito).
- **Histórico (barras):** `GET /:ticker/bars` busca velas OHLCV **reais** do
  Yahoo Finance e cacheia no banco (tabela `Bar`) — 1D (5 min), 5D, 1M, 3M, 6M,
  1Y e 5Y.
- **Alertas em tempo real:** motor de alertas (`alerts/alertEngine.ts`) avalia
  condições de preço/variação/volume a cada ciclo e dispara **notificação
  in-app + evento `alert:triggered`/`notification:new`** via Socket.IO.
- **Notificações:** `createNotification()` emite `notification:new` no socket da
  sala do usuário; o frontend exibe toast/contador em tempo real.
- Toda a plataforma trabalha em **dólar (USD)**.
- **Futuro:** Alpha Vantage/Finnhub, fila BullMQ, push/email.

---

## 6. Deploy

- **Backend — Render** (`mercado-financeiroo.onrender.com`)
  - Root `backend/`, build `npm install && npx prisma generate && npm run build`,
    start `node dist/server.js`, health `/health`.
  - Env: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGINS`.
  - Env IA gratuita: `GROQ_API_KEY` (chave do plano gratuito) e, opcional,
    `GROQ_MODEL` (padrão `openai/gpt-oss-120b`). `OPENAI_API_KEY` continua
    suportada como alternativa.
  - Env feed: `MARKET_UPDATE_INTERVAL_MS` (padrão 10 min).
- **Frontend — Vercel** (`mercado-financeiroo.vercel.app`)
  - Importar repositório, Root `frontend/`, Framework Next.js.
  - Env: `NEXT_PUBLIC_API_URL` (API Render), `NEXT_PUBLIC_WS_URL` (WebSocket).
- CORS do backend aceita os domínios oficiais + `localhost:3000`.

---

## 7. Estado atual e próximos passos

| Itens | Status |
| ----- | ------ |
| MVP 13 módulos + 10 módulos adicionais, backend e frontend | ✅ Concluído |
| Autenticação, MFA, auditoria, CORS, vulnerabilidades (0 em produção) | ✅ Concluído |
| Login 2026 (layout + i18n PT/EN/ES) + fix web-vitals (Next 14.2.35) | ✅ Concluído |
| Deploy Render + Vercel | ✅ Concluído |
| Dados reais de mercado (fonte externa + scheduler 10 min) | ✅ Concluído |
| IA gratuita via Groq (chat, dicas, briefings, esboço, onboarding) | ✅ Concluído |
| Histórico real de velas (Yahoo) para gráficos | ✅ Concluído |
| Notificações/alertas em tempo real (Socket.IO) | ✅ Concluído |
| Tradução integral das demais telas do app | ⏳ Expansível |