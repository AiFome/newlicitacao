# LicitaBR — Plataforma SaaS de Monitoramento de Licitações

Monorepo completo para agregação, busca e alertas de editais públicos brasileiros.

---

## Estrutura do projeto

```
licitabr/
├── apps/
│   ├── api/          # Backend Fastify + TypeScript
│   ├── web/          # Frontend Next.js 14 + Tailwind
│   └── scraper/      # Workers de coleta (PNCP, BLL, BNC…)
├── packages/
│   ├── database/     # Prisma schema + client singleton
│   └── shared/       # Tipos, constantes e utilitários
├── infra/
│   ├── docker/       # docker-compose.yml
│   └── nginx/        # Proxy reverso + SSL
├── .github/workflows/ # CI/CD (ci.yml, pr-check.yml, backup.yml)
├── vitest.config.ts
├── prettier.config.js
├── .eslintrc.json
└── turbo.json
```

---

## Pré-requisitos

| Ferramenta     | Versão mínima |
|----------------|---------------|
| Node.js        | 20.x          |
| npm            | 10.x          |
| Docker         | 24.x          |
| Docker Compose | 2.x           |

---

## Início rápido

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/licitabr.git
cd licitabr
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Subir infraestrutura local

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis elasticsearch
# Aguarda ~30s e roda migrations
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

| Serviço      | URL                        |
|--------------|----------------------------|
| Frontend     | http://localhost:3000       |
| API          | http://localhost:3001       |
| Swagger Docs | http://localhost:3001/docs  |

---

## Scripts disponíveis

```bash
# Desenvolvimento
npm run dev             # Todos os apps em paralelo (Turbo)
npm run build           # Build de produção

# Qualidade
npm run lint            # ESLint em todos os workspaces
npm run format          # Prettier (escreve)
npm run format:check    # Prettier (verifica, usado no CI)
npm run test            # Vitest (unitários)
npm run test:watch      # Vitest em modo watch
npm run test:cov        # Vitest com cobertura

# Banco de dados
npm run db:generate     # Gera Prisma Client
npm run db:migrate      # Roda migrations pendentes
npm run db:seed         # Popula dados de exemplo
npm run db:studio       # Abre Prisma Studio

# Scraper manual
npx tsx apps/scraper/src/cli.ts --portal=PNCP --dias=1
npx tsx apps/scraper/src/cli.ts --portal=BLL  --paginas=5
npx tsx apps/scraper/src/cli.ts --portal=BNC  --paginas=10
npx tsx apps/scraper/src/cli.ts --reindex              # reindexar no ES
npx tsx apps/scraper/src/cli.ts --reindex --pendentes  # só não indexadas
```

---

## Portais suportados

| Portal                  | Método              | Cron           | Cobertura                  |
|-------------------------|---------------------|----------------|----------------------------|
| PNCP                    | API REST oficial    | */2h           | Federal — todos os órgãos  |
| Comprasnet              | Axios + Cheerio     | 08h + 20h      | Federal — pregões          |
| Licitações-e            | Axios + JSON        | 09h            | Federal — Banco do Brasil  |
| BLL                     | Playwright          | 06h + 14h      | Nacional — privado         |
| BNC                     | Axios + JSON        | 07h            | Nacional — municípios      |
| Negócios Públicos       | Axios + JSON        | 15h            | Nacional — SP/MG/RJ        |
| LicitaNet               | Playwright          | 10h            | Municipal — interior       |
| Portal Compras Públicas | Axios + JSON        | 11h            | Municipal — geral          |
| LicitarDigital          | Axios + JSON        | 12h            | Municipal — Sul/Sudeste    |
| BBMNet                  | Axios + JSON        | 13h            | Municipal — SP/MG/PR       |
| Sol Licitações          | Axios + JSON        | 16h            | Municipal — SC/RS/PR       |
| Equiplano               | Axios + JSON        | 17h            | Municipal — SP interior    |
| Citacon                 | Axios + JSON        | 18h            | Municipal — RS             |
| LicitaCon               | Axios + Cheerio     | 19h            | Câmaras municipais — SP    |


---

## Planos e limites

| Recurso              | Free | Básico | Profissional | Enterprise |
|----------------------|------|--------|--------------|------------|
| Alertas              | 1    | 5      | 30           | Ilimitado  |
| Palavras-chave       | 3    | 10     | 50           | Ilimitado  |
| Portais monitorados  | PNCP | 3      | Todos        | Todos      |
| Downloads/mês        | 5    | 50     | Ilimitado    | Ilimitado  |
| Exportação CSV/Excel | ❌  | ❌     | ✅           | ✅         |
| API de integração    | ❌  | ❌     | ❌           | ✅         |

---

## Arquitetura

```
Fontes externas (PNCP, BLL, BNC…)
        │
        ▼
  Scraper Workers (BullMQ + Redis)
        │ indexa + dispara alertas
   ┌────┴──────┐
   ▼           ▼
PostgreSQL  ElasticSearch
   │           │
   └────┬──────┘
        ▼
   API REST (Fastify) ──▶ WebSocket (alertas tempo real)
        │
   ┌────┴──────────────────┐
   ▼                        ▼
Next.js App            Alert Engine
                            │
                   ┌────────┼────────┐
                   ▼        ▼        ▼
                E-mail  Telegram   Push
```

---

## Variáveis de ambiente obrigatórias

| Variável              | Descrição                         |
|-----------------------|-----------------------------------|
| `DATABASE_URL`        | Connection string PostgreSQL       |
| `REDIS_URL`           | URL do Redis                      |
| `ELASTICSEARCH_URL`   | URL do ElasticSearch              |
| `JWT_SECRET`          | Segredo para tokens JWT           |
| `INTERNAL_API_KEY`    | Chave scraper → API interna       |
| `SENDGRID_API_KEY`    | E-mails via SendGrid              |
| `STRIPE_SECRET_KEY`   | Pagamentos via Stripe             |
| `SENTRY_DSN`          | Monitoramento de erros            |

---

## Deploy em produção

```bash
# Build das imagens Docker
docker build -f apps/api/Dockerfile     -t licitabr-api .
docker build -f apps/web/Dockerfile     -t licitabr-web .
docker build -f apps/scraper/Dockerfile -t licitabr-scraper .

# Subir com Nginx e SSL
docker compose -f infra/docker/docker-compose.yml \
  --profile production up -d

# Migrations de produção (rodar antes de reiniciar a API)
docker run --rm --env-file .env licitabr-api \
  sh -c "npx prisma migrate deploy"
```

O CI/CD automatiza tudo isso via GitHub Actions em `.github/workflows/ci.yml`.

### Após o primeiro deploy

```bash
# 1. Registrar o webhook do Telegram (UMA VEZ)
TELEGRAM_BOT_TOKEN=xxx API_URL=https://api.licitabr.com.br npm run telegram:setup

# 2. Verificar que o webhook foi registrado
npm run telegram:info

# 3. Indexar licitações existentes no ElasticSearch (se o banco já tinha dados)
npx tsx apps/scraper/src/cli.ts --reindex --pendentes
```

---

## Testes

```bash
npm run test        # Todos os testes
npm run test:cov    # Com relatório de cobertura HTML

# Suítes disponíveis:
# - alertaEngine  (match de palavras-chave, filtros)
# - auth          (registro, login, reset de senha)
# - licitacoes    (busca ES/PG, paginação, fallback)
# - pncp          (coletor, paginação, erros parciais)
# - format        (formatMoeda, formatData, labels)
```

---

## Secrets necessários no GitHub Actions

Configure em `Settings → Secrets and variables → Actions`:

```
DOCKERHUB_USERNAME       DOCKERHUB_TOKEN
SERVER_HOST              SERVER_USER          SERVER_SSH_KEY
DB_HOST                  DB_USER              DB_PASSWORD         DB_NAME
S3_ACCESS_KEY_ID         S3_SECRET_ACCESS_KEY S3_ENDPOINT         S3_BUCKET
NEXT_PUBLIC_API_URL      NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

© 2025 LicitaBR — Todos os direitos reservados.
