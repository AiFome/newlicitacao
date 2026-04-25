# apps/web/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# ── Dependências ──────────────────────────────────────
FROM base AS deps
COPY package.json turbo.json ./
COPY apps/web/package.json       ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web

# ── Runtime ───────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
