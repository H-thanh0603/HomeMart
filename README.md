# HomeMart

E-commerce production-ready bán đồ gia dụng — Next.js + NestJS + PostgreSQL + Redis.

## Tech stack
- **API:** NestJS 10, Prisma 5, JWT (access + refresh rotation), RBAC, Swagger tại `/api/docs`
- **Web:** Next.js 14, TailwindCSS, TanStack Query, Zustand, React Hook Form + Zod
- **Infra:** PostgreSQL 16, Redis 7, Docker Compose

## Quick start

```bash
# 1. Cài deps
npm install

# 2. Env + infra
cp .env.example .env
docker compose up -d postgres redis mailhog

# 3. Database: migrate + seed (20+ categories, 100+ products, users, vouchers)
npm run db:migrate
npm run db:seed

# 4. Chạy dev
npm run dev:api   # http://localhost:4000/api/docs
npm run dev:web   # http://localhost:3000
```

### Tài khoản seed
| Role | Email | Password |
|---|---|---|
| ADMIN | admin@homemart.vn | Admin@123 |
| MANAGER | manager@homemart.vn | Manager@123 |
| STAFF | staff@homemart.vn | Staff@123 |
| CUSTOMER | customer@homemart.vn | Customer@123 |

## Scripts
```bash
npm run build:api / build:web   # build
npm run test:api                # unit tests (business rules)
npm run test:e2e                # e2e tests (cần postgres + redis đang chạy)
npm run lint && npm run typecheck
```

## Tài liệu
- [Kiến trúc](docs/architecture.md) · [Database/ERD](docs/database.md) · [API](docs/api.md) · [Business rules](docs/business-rules.md) · [Deployment](docs/deployment.md)
- Swagger runtime: `http://localhost:4000/api/docs`

## Production (Docker full stack)
```bash
cp .env.production.example .env.production   # điền secrets thật
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# → http://localhost  (nginx → web + api), health: /api/v1/health
```
Chi tiết: [docs/deployment.md](docs/deployment.md)

## Luồng nghiệp vụ đã implement
Auth (refresh rotation) → Catalog (category tree, variants) → Inventory (reserve/release chống overselling) → Cart (guest merge) → Checkout (backend re-price) → Order state machine → Payment abstraction (COD/VNPay/MoMo/Stripe, webhook idempotent) → Voucher (atomic concurrency) → Shipping fee engine → Review (verified purchase) → Notifications (event-driven) → Admin dashboard & audit logs.
