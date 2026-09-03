# Runbook: Flash Sale

Kịch bản: 1–2 deal lớn, 200–500 khách đổ vào cùng lúc add-to-cart + checkout.
Kiến trúc hiện tại (1 host, docker compose) chịu được phạm vi này — với điều kiện
chạy qua checklist dưới đây. Vượt trên ~500 concurrent thì đọc mục "Trần & scale".

## 1. Trước khi mở sale (T-1 ngày)

- [ ] **Tồn kho deal đã nhập đúng** — checkout re-check tồn kho dưới lock,
      hết hàng sẽ trả `OUT_OF_STOCK` (không oversell, đã load test 200 VU).
- [ ] **Phí ship các tuyến nóng đã warm cache** — cache miss sẽ trả phí công
      thức ngay (không chờ GHN), nhưng warm sẵn thì phí sát thực tế hơn:
  ```bash
  # với mỗi tuyến (province/district/ward) ước lượng đông khách:
  curl -s -X POST localhost:4000/api/v1/orders/preview \
    -H 'Content-Type: application/json' -H "Authorization: Bearer <token>" \
    -d '{"items":[{"productId":"<deal-id>","quantity":1}],"shippingMethodId":"<id>"}'
  # (lặp cho ~10 tuyến lớn nhất; chạy 1 lần mỗi tuyến, cache TLL 1h)
  ```
- [ ] **Bump cache catalog + tự đọc 1 lần** để trang danh mục/chi tiết deal
      đã nằm trong Redis trước giờ G (cache stampede lock đã có, nhưng
      pre-warm thì request đầu tiên cũng nhanh):
  ```bash
  curl -s "localhost:4000/api/v1/products?limit=20&categorySlug=<slug-deal>" >/dev/null
  curl -s "localhost:4000/api/v1/products/<slug-deal>" >/dev/null
  ```
- [ ] **Backup manual trước giờ G**: `./docker/backup-db.sh ./backups`
- [ ] **Theo dõi đã bật**: Sentry DSN đã set, `docker/health-check.sh` cron
      đang chạy, `docker logs -f api` mở sẵn 1 terminal.

## 2. Giờ mở sale (G-0)

- [ ] **Nâng rate limit qua env rồi restart api** (không sửa code):
  ```bash
  # .env.production
  RATE_LIMIT_PER_MIN=600        # global (mặc định 120)
  AUTH_THROTTLE_MULTIPLIER=10  # login/register (mặc định 1)
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
  ```
- [ ] **Bỏ forgotten seed**: `docker compose exec postgres pg_isready`.

## 3. Trong sale — theo dõi

| Triệu chứng | Lệnh kiểm tra | Hành động |
|---|---|---|
| Checkout chậm dần | `docker logs api \| grep -c CHECKOUT_FAILED` | Nếu tăng: xem pool DB (mục 4) |
| API lag mọi endpoint | `docker stats --no-stream` (api/pg/redis) | CPU pg ~100% → mục 4 |
| Lỗi 429 nhiều | logs api `grep 429` | Bình thường ở thời điểm G; hạ nếu khách thật bị chặn |
| Redis full | `docker compose exec redis redis-cli info memory \| grep maxmemory` | 256mb đầy → tăng `--maxmemory` lên 512mb |

## 4. Trần & scale (khi ~500+ concurrent)

Trình tự lever, dùng dần theo tải:

1. **Nâng pool + container resources** (nhanh nhất):
   - `DATABASE_URL` thêm `connection_limit=30` (mặc định đang 20 trong compose)
   - compose: `deploy.resources.limits` cho api + postgres (hiện chưa set)
2. **Scale api ngang**: `docker compose up -d --scale api=2 --scale nginx=1`
   - Lưu ý: upload local volume chia sẻ được (cùng host), rate-limit đã
     Redis-backed nên hoạt động cross-replica.
3. **PgBouncer** khi tổng connections của các replica > ~50: thêm service
   pgbouncer:6, trỏ DATABASE_URL qua nó, pool per-connection về 10.
4. **Queue checkout** (BullMQ) nếu cần >1000 concurrent — chưa dựng, phải
   code thêm (admission control + job worker), tính ~3-5 ngày công.

Giới hạn kiến trúc hiện tại cần biết: DB 1 instance (không replica đọc),
upload local disk (không CDN) — 2 mục này là bước scale tiếp theo nếu
deal quốc dân, không phải lỗi.

## 5. Sau sale

- [ ] Trả `RATE_LIMIT_PER_MIN=120`, `AUTH_THROTTLE_MULTIPLIER=1`, restart api
- [ ] Đối soát đơn sale: `POST /api/v1/admin/orders/ops/reconcile`
- [ ] Ghi kết quả vào `docs/go-no-go.md` theo template (traffic cao nhất,
      success rate, incidents) — dữ kiện cho lần sale sau.

## Lịch sử vận hành

| Ngày | Sự kiện | Kết quả |
|---|---|---|
| 2026-08-30 | Load test 200 VU dev machine (ts-node, không Redis) | 97.4% success, 0 oversell — chi tiết docs/go-no-go.md |
