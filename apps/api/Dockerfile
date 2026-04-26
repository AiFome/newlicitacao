FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN cd packages/database && npx tsc --outDir dist --module NodeNext --moduleResolution NodeNext --esModuleInterop true --skipLibCheck true --declaration true 2>/dev/null || true
RUN cd packages/shared && npx tsc --outDir dist --module NodeNext --moduleResolution NodeNext --esModuleInterop true --skipLibCheck true --declaration true 2>/dev/null || true
RUN npm run build --workspace=apps/api || true
RUN rm -rf node_modules/@licitabr/database node_modules/@licitabr/shared
RUN mkdir -p node_modules/@licitabr/database node_modules/@licitabr/shared
RUN cp -r packages/database/dist node_modules/@licitabr/database/dist
RUN echo '{"name":"@licitabr/database","type":"module","main":"./dist/index.js","exports":{".":{"import":"./dist/index.js"}}}' > node_modules/@licitabr/database/package.json
RUN cp -r packages/shared/dist node_modules/@licitabr/shared/dist
RUN echo '{"name":"@licitabr/shared","type":"module","main":"./dist/index.js","exports":{".":{"import":"./dist/index.js"}}}' > node_modules/@licitabr/shared/package.json

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
