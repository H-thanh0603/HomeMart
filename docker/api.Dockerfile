# ─── deps: cài chỉ workspace API ──────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w @homemart/api

# ─── build: generate prisma client + compile nest + compile seed ─────────────
FROM deps AS build
WORKDIR /app
COPY apps/api/prisma apps/api/prisma
RUN npm run generate -w apps/api
COPY apps/api/tsconfig.json apps/api/nest-cli.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build:api \
  && npx tsc apps/api/prisma/seed.ts \
  --outDir apps/api/dist-seed \
  --module commonjs --target es2022 --moduleResolution node \
  --esModuleInterop --skipLibCheck --resolveJsonModule \
  && npm prune --omit=dev

# ─── runner: image chạy production ───────────────────────────────────────────
FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl \
  && addgroup -S homemart && adduser -S homemart -G homemart \
  && mkdir -p /app/uploads && chown -R homemart:homemart /app/uploads
WORKDIR /app/apps/api
COPY --from=build --chown=homemart:homemart /app/package.json /app/package.json
COPY --from=build --chown=homemart:homemart /app/node_modules /app/node_modules
COPY --from=build --chown=homemart:homemart /app/apps/api/dist ./dist
COPY --from=build --chown=homemart:homemart /app/apps/api/dist-seed ./dist-seed
COPY --from=build --chown=homemart:homemart /app/apps/api/prisma ./prisma
COPY --from=build --chown=homemart:homemart /app/apps/api/package.json ./package.json
USER homemart
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${API_PORT:-4000}/api/v1/health >/dev/null || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
