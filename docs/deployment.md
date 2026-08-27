# Deployment

## Local dev
```bash
cp .env.example .env
docker compose up -d postgres redis mailhog
cd apps/api && npx prisma migrate dev --name init && npm run seed
npm run dev   # api :4000, web :3000 (2 terminal)
```

## Production stack (Docker)

Toàn bộ production stack được đóng gói sẵn:

| File | Vai trò |
|---|---|
| `docker/api.Dockerfile` | NestJS API — multi-stage, non-root, tự `prisma migrate deploy` khi start, kèm seed compiled (`dist-seed/`) |
| `docker/web.Dockerfile` | Next.js standalone output, inject `NEXT_PUBLIC_API_URL` lúc build |
| `docker/nginx.conf` | Reverse proxy `/api → api:4000`, còn lại → web:3000; gzip, cache `/_next/static` 30d, security headers |
| `docker-compose.prod.yml` | postgres + redis + api + web + nginx; healthchecks, restart policy, volumes |
| `.env.production.example` | Template env production |

### Triển khai

```bash
# 1. Tạo env production (KHÔNG commit file này)
cp .env.production.example .env.production
#    - openssl rand -base64 48  → JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
#    - Đổi POSTGRES_PASSWORD, điền credential VNPay/MoMo/Stripe + SMTP thật
#    - WEB_URL = URL public của site (dùng cho CORS)
#    - HTTP_PORT = cổng public (mặc định 80)

# 2. Build + chạy toàn bộ stack
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 3. (Tuỳ chọn) Seed data mẫu — chỉ dùng cho demo/staging
docker compose -f docker-compose.prod.yml --env-file .env.production -p homemart-prod exec api node dist-seed/seed.js

# 4. Kiểm tra sức khoẻ
curl http://localhost/api/v1/health   # {"status":"ok","services":{"api":"up","db":"up","redis":"up"}}
```

Migration tự động chạy mỗi lần API start (`prisma migrate deploy` — an toàn, không bao giờ reset data).

### Kiến trúc network

```text
Client ──▶ nginx :80
            ├── /api/*        ──▶ api:4000   (NestJS)
            └── /*            ──▶ web:3000   (Next.js standalone)

postgres ◀── api   (internal, không expose port)
redis     ◀── api   (rate-limit / idempotency, không expose port)
uploads   ◀── api   (named volume /app/uploads)
```

Browser gọi API cùng origin qua `NEXT_PUBLIC_API_URL=/api/v1` (relative) → không vướng CORS, dễ đổi domain.

### TLS/HTTPS

Nginx hiện terminate ở port 80. Để bật HTTPS:
1. Mount certificate vào nginx (volume thêm `./certs:/etc/nginx/certs:ro`)
2. Thêm server block `listen 443 ssl` + redirect 80 → 443 trong `docker/nginx.conf`
3. Hoặc đặt Cloudflare/Traefik/Caddy trước stack

### Backup & restore

```bash
# Backup nightly (cron)
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U homemart -Fc homemart > backup_$(date +%F).dump

# Restore
cat backup_2026-08-26.dump | docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U homemart -d homemart --clean
```

Giữ tối thiểu 30 ngày backup; restore drill hàng quý.

### Checklist go-live

1. Env: secrets random ≥ 32 ký tự, đổi mọi default trong `.env.production`.
2. Payment return URLs trỏ về domain thật (`VNPAY_RETURN_URL`, `MOMO_RETURN_URL`).
3. SMTP production (SendGrid/Mailgun/SES) — MailHog không có trong stack prod.
4. Health check: `GET /api/v1/health` — dùng làm probe cho load balancer.
5. Logs: stdout JSON (Docker logging driver); Sentry DSN optional.
6. Scale: api + web stateless → scale ngang sau nginx/ALB; postgres vertical first.
7. Image registry: `docker tag homemart-api registry/x/homemart-api:$GIT_SHA && docker push`.
