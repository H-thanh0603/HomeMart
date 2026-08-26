# HomeMart — Architecture

## 1. Tổng quan

HomeMart là hệ thống e-commerce bán đồ gia dụng, gồm 2 ứng dụng chính trong monorepo:

```
apps/
├── api/    → NestJS REST API (port 4000)
└── web/    → Next.js 14 App Router (port 3000)
packages/
├── types/  → Shared TypeScript types & Zod schemas
└── utils/  → Shared utilities
infra: PostgreSQL 16 + Redis 7 (Docker Compose)
```

## 2. Tech stack (chốt)

| Layer | Công nghệ | Lý do |
|---|---|---|
| API | NestJS 10 + TypeScript | Module architecture, DI, Guards, Interceptors — khớp yêu cầu Controller/Service/Repository |
| ORM | Prisma 5 | Type-safe, migration, row locking qua `SELECT ... FOR UPDATE` |
| DB | PostgreSQL 16 | Transaction, row lock chống overselling |
| Cache | Redis 7 | Rate limiting, cache, idempotency keys |
| Auth | JWT (access 15m + refresh rotation 7d), bcrypt(12) | |
| Frontend | Next.js 14 + TailwindCSS + shadcn/ui + TanStack Query + Zustand + React Hook Form + Zod | |
| Docs API | Swagger/OpenAPI tự sinh (`@nestjs/swagger`) tại `/api/docs` | |
| Test | Jest (unit + integration), Supertest | |
| Deploy | Docker Compose, Nginx-ready, health check `/api/v1/health` | |

## 3. Kiến trúc module backend

```
apps/api/src/
├── main.ts                 # bootstrap, helmet, cors, versioning, swagger
├── app.module.ts
├── common/                  # filters, interceptors, guards, decorators, dto, exceptions
├── config/                  # env validation (zod)
├── infra/                   # prisma.service, redis.service, storage abstraction
│
└── modules/
    ├── auth/                # register/login/refresh-rotation/forgot/reset/change/verify-email
    ├── users/               # profile, addresses
    ├── catalog/             # categories (tree), brands, products (+variants, images, attributes)
    ├── search/              # autocomplete, filter, sort (pg_trgm ILIKE; sẵn sàng thay bằng Meilisearch)
    ├── inventory/           # available/reserved/sold stock, transactions ledger
    ├── cart/                # guest cart token, merge on login
    ├── wishlist/
    ├── orders/              # state machine, snapshot items, status history, timeline
    ├── payments/            # PaymentProvider interface + COD/VNPay/MoMo/Stripe/BankTransfer
    ├── shipping/            # methods/zones/fee rules, carrier provider abstraction
    ├── promotions/          # vouchers, flash sale, atomic usage counters
    ├── reviews/             # verified-purchase only, moderation
    ├── notifications/       # in-app + email (event-driven listeners)
    └── admin/               # dashboard stats, bulk ops, CSV import/export, audit logs
```

**Layer rule:** `Controller` (HTTP, validation) → `Service` (business logic, transaction) → `Prisma` (data). Không logic nghiệp vụ trong controller.

## 4. Các flow trọng yếu

### Authentication flow
1. Login → issue Access Token (15m) + Refresh Token (7d, lưu hash trong DB).
2. Refresh → **rotation**: refresh cũ bị revoke, phát hành cặp mới. Refresh đã dùng lại → revoke toàn bộ session (phát hiện reuse attack).
3. RBAC: `@Roles(Role.ADMIN)` + `RolesGuard`; permissions gắn với role trong DB.

### Checkout flow (backend tính tiền, không tin frontend)
1. Client POST `/orders/checkout` chỉ gửi: addressId, shippingMethodId, voucherCode?, paymentMethod.
2. Backend **mở transaction**: re-price từng item từ DB → reserve inventory (`FOR UPDATE`) → validate voucher (atomic increment usage counter) → tính subtotal/discount/shipping/tax/total → tạo Order + OrderItem snapshot + Payment(PENDING).
3. Timeout 30 phút: job release reserved stock nếu chưa thanh toán.

### Inventory flow
```
available_stock = physical - reserved - sold
Reserve:   available -= qty, reserved += qty   (row lock, transaction)
Commit:    reserved -= qty, sold += qty        (payment success)
Release:   reserved -= qty                     (cancel/timeout/fail)
Mọi thay đổi ghi InventoryTransaction (ledger, audit được).
Overselling không thể xảy ra: reserve kiểm tra available >= qty trong cùng transaction có lock.
```

### Payment flow (idempotent)
1. POST `/payments/:orderId/create` → provider.createPayment() → redirect URL / QR.
2. Webhook/callback → verify signature → **idempotency**: unique constraint `(provider, txnRef)` + trạng thái payment đã SUCCESS → bỏ qua trùng lặp.
3. SUCCESS → event `PaymentSucceededEvent` → commit inventory → CONFIRMED order → notifications.

### Order state machine
```
PENDING → CONFIRMED → PROCESSING → PACKING → SHIPPED → DELIVERED → COMPLETED
PENDING/CONFIRMED/PROCESSING/PACKING → CANCELLED (user hoặc admin)
SHIPPED/DELIVERED → RETURN_REQUESTED → RETURNED → REFUNDED
Chuyển trái hoặc nhảy bước → BusinessRuleError. Mọi chuyển đổi ghi OrderStatusHistory.
```

## 5. Event-driven notifications

NestJS `EventEmitter2`: `order.created`, `payment.succeeded`, `order.shipped`, `order.delivered`, `order.cancelled`, `refund.succeeded`, `inventory.low-stock`, `promotion.created`. Listeners ghi Notification in-app + gửi email (nodemailer, SMTP configurable).

## 6. Assumptions (requirement chưa rõ)

| # | Assumption |
|---|---|
| A1 | Tax VAT 8% cố định, cấu hình qua env `TAX_RATE`, áp cuối sau discount |
| A2 | Đơn < 500k phí ship theo zone; đơn ≥ 500k free ship STANDARD (có thể override bằng voucher freeship) |
| A3 | Guest checkout cho phép nhưng bắt buộc đăng ký khi đặt hàng (đơn gắn user) — đơn giản hoá tracking/review |
| A4 | Giá lưu VND integer (không decimal) |
| A5 | Upload file: StorageService abstraction, mặc định local disk, sẵn sàng S3/Cloudinary |
| A6 | Search dùng Postgres ILIKE + pg_trgm; kiến trúc SearchService để swap Meilisearch/Elasticsearch sau |
| A7 | Email thật cần SMTP; dev dùng MailHog container |

## 7. Deployment topology (production)

```
Internet → Nginx (TLS, gzip, static cache)
         ├→ web (Next.js standalone :3000)
         └→ api (NestJS :4000, scale ngang)
                  ├→ PostgreSQL (primary + replica đọc)
                  ├→ Redis (cache/ratelimit/idempotency)
                  └→ Object storage (S3/Cloudinary)
Monitoring hooks: Sentry DSN, Prometheus /metrics endpoint, health checks.
Backup: pg_dump nightly + WAL archiving (docs/deployment.md).
```
