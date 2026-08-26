# Launch Checklist — HomeMart: từ "chạy được" → "bán được" (30 ngày)

> Mỗi tuần phải có 1 thứ đo được bằng tiền / đơn hàng thật.
> 3 trụ bắt buộc: **thu tiền được, giao được, đổi trả được.**

Ngày bắt đầu: 2026-08-26 · Chủ trì: Tech Lead + Ops

---

## Tuần 1 — Thu tiền được (Day 1-7)

| # | Việc | Owner | Done khi |
|---|------|-------|----------|
| 1.1 | Đăng ký merchant VNPay + MoMo business, lấy `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `MOMO_*` production thay vào `.env.production` | Ops | `.env.production` không còn giá trị `dev-*` (đã có guard chặn boot) |
| 1.2 | Cron đối soát hằng ngày: so `payment.status` trong DB vs báo cáo gateway, alert Telegram nếu lệch | Backend | Script chạy 1 lần/ngày, log vào `audit-log` |
| 1.3 | Nối `orders.service:transition(CANCELLED+paid)` sang API hoàn tiền gateway (hiện mới đổi status DB) | Backend | 1 đơn hủy đã thanh toán hoàn tiền thật về MoMo/VNPay |
| 1.4 | Test tiền thật 10k: 1 COD, 1 VNPay, 1 MoMo production | QA | 3 đơn đều `PENDING → CONFIRMED`, tiền về tài khoản đối soát |

**Gate tuần 1:** 1 đơn VNPay production `CONFIRMED` và tiền về.

---

## Tuần 2 — Giao được (Day 8-14)

| # | Việc | Owner | Done khi |
|---|------|-------|----------|
| 2.1 | Tích hợp 1 carrier (GHN/GHTK): tạo vận đơn, tính phí theo quận/huyện, webhook `PICKED_UP → DELIVERED` | Backend | Thay `shipping.service` tính tay |
| 2.2 | Quyết định kho: nếu 1 kho thì khóa roadmap đa kho; nếu 2 kho thì thêm `warehouseId` vào `Inventory` | PM | Ghi ADR |
| 2.3 | Chuyển `STORAGE_DRIVER=local` → S3/R2 + CDN, job xóa ảnh rác | Infra | Ảnh sản phẩm không còn 404 (hiện rewrite SVG tạm) |
| 2.4 | Load test 200 checkout song song (`k6`) — đã sửa `consumeAtomically` lock-first | Backend | Không oversell, không vượt `usageLimitPerUser` |

**Gate tuần 2:** 1 đơn giao tới tay, track được trên app GHN.

---

## Tuần 3 — Đổi trả & tin cậy (Day 15-21)

| # | Việc | Owner | Done khi |
|---|------|-------|----------|
| 3.1 | Trang Chính sách: đổi trả 7 ngày, bảo hành, VAT (ghi rõ đã/chưa gồm VAT) | Content/Legal | 3 trang public có link ở footer |
| 3.2 | Quy trình đổi trả 2 bước: `RETURN_REQUESTED` cần MANAGER duyệt mới → `RETURNED → REFUNDED` (hiện STAFF hủy được đơn đã thanh toán) | Backend | Không thể tự hủy đơn đã thanh toán ở role STAFF |
| 3.3 | Quan sát: alert khi `GET /api/v1/health` ≠ `ok`, cron `docker/backup-db.sh` + **test restore 1 lần** lên DB rỗng | Infra | Backup 7 ngày còn đủ, restore drill pass |
| 3.4 | Xoay `JWT_*_SECRET` production, bật HSTS sau khi có TLS, verify `trust proxy` rate-limit theo IP thật | Infra | `curl -I` thấy `Strict-Transport-Security` |

**Gate tuần 3:** 1 ca đổi trả giả định đi hết flow, tiền hoàn về.

---

## Tuần 4 — Bán thử (Day 22-30)

| # | Việc | Owner | Done khi |
|---|------|-------|----------|
| 4.1 | Chọn 1 ngách hẹp (VD: combo bếp Xiaomi + lắp đặt HN/HCM), viết lại trang chủ theo ngách | PM/Content | Trang chủ nói 1 câu duy nhất, không dàn 106 sản phẩm |
| 4.2 | SEO/Perf: `sitemap.xml`, `robots.txt`, OG image, Lighthouse >90 | Frontend | Đã đo, đã fix |
| 4.3 | Soft-launch 20-50 khách (người quen / group FB ngách), theo dõi 3 metric | Growth | `checkout thành công >95%`, `giao đúng hẹn >90%`, `đổi trả <5%` |
| 4.4 | Quyết định Go/No-Go sau 2 tuần số liệu | PM | Mở rộng hoặc quay lại tuần 1-2 |

---

## Không làm trong 30 ngày

Đa kho, AI gợi ý, app mobile, đa ngôn ngữ, coupon phức tạp — mỗi thứ tốn 2-4 tuần, không giúp bán đơn đầu tiên.

---

## Vận hành hằng ngày (sau launch)

- `GET /api/v1/health` — alert nếu `status != ok`
- `docker/backup-db.sh` — cron 02:00, giữ 14 ngày, copy ra ngoài máy chủ
- Đối soát gateway — cron 03:00
- Review `audit-log` hằng tuần

---

## Tham chiếu kỹ thuật

- Trust proxy đã sửa: `apps/api/src/main.ts: trust proxy=1`
- Graceful shutdown: `docker-compose.prod.yml: stop_grace_period 30s`
- CI: `.github/workflows/ci.yml` (build + test-integration với Postgres service)
- Security headers: `apps/web/next.config.mjs` + `docker/nginx.conf`
