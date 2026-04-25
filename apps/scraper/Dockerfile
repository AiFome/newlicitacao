# apps/scraper/Dockerfile
# Imagem com Chromium pré-instalado para o Playwright
FROM mcr.microsoft.com/playwright:v1.43.0-jammy AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json turbo.json ./
COPY apps/scraper/package.json ./apps/scraper/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=deps /app/node_modules ./node_modules
COPY apps/scraper/src ./apps/scraper/src
COPY packages ./packages

CMD ["node", "--loader=tsx", "apps/scraper/src/main.ts"]
