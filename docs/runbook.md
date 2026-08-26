# Runbook — Vận hành HomeMart

## 1. Health & Alert

`GET /api/v1/health` trả:
```json
{"status":"ok","services":{"api":"up","db":"up","redis":"up"},"timestamp":"..."}
```
`status` là `degraded` khi `db` ≠ `up` (redis `down` vẫn chạy degraded).

**Alert khuyến nghị (cron 1 phút):**
```bash
# /etc/cron.d/homemart-health
* * * * * root curl -sf http://localhost/api/v1/health | grep -q '"status":"ok"' || \
  curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"[ALERT] HomeMart health != ok"}' "$SLACK_WEBHOOK_URL"
```

Hoặc dùng UptimeRobot / BetterStack trỏ vào `/api/v1/health`.

## 2. Đối soát hằng ngày

```bash
# 03:00 hằng ngày — cần ADMIN_TOKEN của MANAGER/ADMIN
0 3 * * * root API_URL=http://localhost/api/v1 ADMIN_TOKEN=$(cat /run/secrets/homemart-admin-token) /opt/homemart/docker/cron-reconcile.sh
```
Kết quả ghi vào `/var/log/homemart-reconcile.log`. Nếu `mismatched > 0`, kiểm tra `audit-log` và báo cáo gateway (VNPay/MoMo CSV).

Thủ công:
```bash
curl -X POST http://localhost/api/v1/admin/orders/ops/reconcile -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 3. Backup & Restore drill

**Backup (đã có `docker/backup-db.sh`):**
```bash
# 02:00 hằng ngày, giữ 14 ngày
0 2 * * * root /opt/homemart/docker/backup-db.sh /opt/homemart/backups
```
**Restore drill (hàng quý):**
```bash
# Tạo DB rỗng và restore
docker compose -f docker-compose.prod.yml exec -T postgres psql -U homemart -c "CREATE DATABASE homemart_restore;"
gunzip -c backups/homemart-20260826-020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U homemart homemart_restore
# So sánh row count
docker compose exec postgres psql -U homemart -c "SELECT count(*) FROM orders;" homemart
docker compose exec postgres psql -U homemart -c "SELECT count(*) FROM orders;" homemart_restore
docker compose exec postgres psql -U homemart -c "DROP DATABASE homemart_restore;"
```

## 4. Hoàn tiền

- STAFF **không** được duyệt `RETURNED/REFUNDED` hay hủy đơn đã thanh toán — chỉ MANAGER/ADMIN (đã enforce trong `admin-orders.controller` + `orders.service`).
- Hoàn tiền gateway: `POST /api/v1/admin/orders/:id/refund-gateway` (MANAGER) — hiện log stub, cần thay bằng gọi API VNPay/MoMo/Stripe khi có merchant credentials.

## 5. Xoay secrets

`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` nếu lộ: đổi trong `.env.production`, `docker compose up -d api` (không downtime, token cũ hết hạn sau `JWT_ACCESS_TTL`).
