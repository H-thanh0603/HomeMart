# Deployment

## Local dev
```bash
cp .env.example .env
docker compose up -d postgres redis mailhog
cd apps/api && npx prisma migrate dev --name init && npm run seed
npm run dev   # api :4000, web :3000 (2 terminal)
```

## Docker full stack
```bash
docker compose up --build
```

## Production checklist
1. Env: `NODE_ENV=production`, JWT secrets ≥ 32 ký tự random, đổi mọi default.
2. Migration: `npx prisma migrate deploy` (không dùng `migrate dev` ở prod).
3. Build: `apps/api` (node dist), `apps/web` (`next build` standalone).
4. Nginx: TLS termination, proxy `/api → api:4000`, gzip, cache static assets 30d, security headers.
5. Health checks: `GET /api/v1/health` (api + db + redis status).
6. Backup DB: nightly `pg_dump -Fc` + WAL archiving; giữ 30 ngày. Restore drill hàng quý.
7. Logs: stdout JSON (Docker driver), Sentry DSN optional; Prometheus scrape `api/metrics` (nếu bật interop).
8. Scale: api stateless → scale ngang sau Nginx; Redis dùng cho rate-limit/idempotency shared.
