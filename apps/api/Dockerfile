# apps/api/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# ── Dependências ──────────────────────────────────────
FROM base AS deps
COPY package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# ── Runtime ───────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/server.js"]
