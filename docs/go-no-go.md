# Go / No-Go — Quyết định mở rộng sau soft-launch

**Áp dụng:** `docs/launch-checklist.md#4.4` · Sau 2 tuần soft-launch 20-50 khách (4.3)

## Cách đo

Gọi API (MANAGER):
```bash
curl -H "Authorization: Bearer $MANAGER_TOKEN" \
  "http://localhost/api/v1/admin/reports/soft-launch?from=2026-08-27&to=2026-09-10"
```
Trả về `gates: { checkout, onTime, returns, allPass }` — nguồn tính: `apps/api/src/modules/admin/admin.service.ts:softLaunchMetrics`.

## Tiêu chí

| Gate | Công thức | Đạt khi |
|------|-----------|---------|
| checkout | `(total - cancelled)/total` | `>95%` |
| giao đúng hẹn | `on_time / total_delivered` (`deliveredAt <= createdAt + estimatedDaysMax`) | `>90%` |
| đổi trả | `returnRequested / total` | `<5%` |

**allPass = checkout && onTime && returns**

## Quyết định

- **Go:** `allPass == true` trong 2 tuần liên tiếp → mở rộng marketing, nhập thêm tồn ngách chính (`NEXT_PUBLIC_FEATURED_CATEGORY`).
- **No-Go:** bất kỳ gate nào fail → quay lại tuần tương ứng:
  - checkout fail → xem lại `BR-1` re-price + `BR-2` lock, k6 200 checkout
  - onTime fail → xem GHN webhook `PICKED_UP→DELIVERED` + `shipping.service:createShipment`
  - returns cao → xem `RETURN_REQUESTED` 2 bước + chất lượng sản phẩm/ngách

## Mẫu ghi nhận

```
Ngày: 2026-09-__  Người quyết: PM ______
Period: from=__ to=__
Totals: total=__ cancelled=__ delivered=__ returns=__
Metrics: checkout=__% onTime=__% returns=__%
Gates: checkout=__ onTime=__ returns=__ allPass=__
Nhận định: ...
Quyết định: Go / No-Go (quay lại __)
```

## Liên quan

- ADR kho đơn: `docs/adr/0001-single-warehouse.md`
- Runbook vận hành: `docs/runbook.md`

## Kết quả load test đã ghi nhận

**Ngày 2026-08-30 — k6 200 VU / 200 checkout song song (dev machine, ts-node, không Redis):**

| Chỉ số | Kết quả | Ngưỡng |
|---|---|---|
| Success rate (checkout) | **97.4%** | >95% ✅ |
| Oversell (availableStock < 0) | **0** | 0 ✅ |
| reservedStock âm | **0** | 0 ✅ |
| Trùng Idempotency-Key | **0** | 0 ✅ |
| Checkout fail vì OUT_OF_STOCK | 5/200 | đúng BR (tồn kho hết hợp lệ) ✅ |
| Avg duration / iteration (register→checkout) | ~45s | tham khảo, dev box |

Ghi chú:
- Kết quả lưu tại `loadtest-result.json` (gitignored) — regen bằng `k6 run --vus 200 --iterations 200 apps/api/loadtest/loadtest-checkout.js`.
- Chạy test cần nâng rate limit: `RATE_LIMIT_PER_MIN=5000 AUTH_THROTTLE_MULTIPLIER=500` (throttle auth mặc định 10 login/phút/IP sẽ chặn phần lớn iteration).
- Lịch sử: các lần chạy trước đây báo 0% là do script sai endpoint (`/addresses` thay vì `/users/me/addresses`) — đã sửa.
- Avg duration cao ở 200 VU trên máy dev là do per-line query tuần tự trong checkout transaction — cần Redis + pool tuning khi lên prod (xem docs/deployment.md).

## Kết quả A/B load test flash-sale optimization (2026-09-03)

**Kịch bản chuẩn hóa**: k6, cùng máy dev (12 CPU), compiled `dist` (như prod),
pool `connection_limit=20&pool_timeout=30`, rate-limit nâng cao
(RATE_LIMIT_PER_MIN=5000, AUTH_THROTTLE_MULTIPLIER=500), deal 1 SKU 100 unit,
200 checkout, 30 VU, 3 runs mỗi bên, clean DB + reset kho 100 trước mỗi run
(`docker/loadtest-reset.sh`).

| Chỉ số | BEFORE (9e81dca) | AFTER (code flash-sale) |
|---|---|---|
| Success rate / run (100 đơn hợp lệ tranh 100 kho → trần 50%) | 47.0–48.5% | **49.5–50.0%** (đạt trần) |
| Đơn tạo được / run | 100/100 hợp lệ | 100/100 hợp lệ |
| Oversell / reservedStock âm / trùng idempotency key | 0 / 0 / 0 | 0 / 0 / 0 |
| Avg iteration (register→checkout) | 10.2–10.9s | 10.0–10.2s |
| **100 VU (vượt pool 20)** | dao động 0–50%, P2028 hàng loạt (cả endpoint phụ: address, register) | duy trì 36%+, P2028 chỉ còn ở checkout tx, address P2028 = 0 sau fix |

**Đọc kết quả thẳng thắn:**
1. Ở tải trong tầm pool (30 VU), hiệu quả code không tạo khác biệt measurable
   — DB local SSD + 30 VU chưa đủ để bộc lộ RT đã cắt (37→~20 RT/checkout).
   Không thổi phồng: optimization này có ý nghĩa ở tải CAO hơn và máy yếu hơn.
2. Ở tải vượt pool (100 VU = flash sale thật), BEFORE sụp hoàn toàn
   (P2028 lan cả register/address → khách không vào nổi trang), AFTER chỉ
   nghẽn đúng checkout tx. Đây là khác biệt thực tế lớn nhất của loạt fix.
3. Boot Neck mới của AFTER: pool connection chờ mở checkout tx — cần
   PgBouncer hoặc tăng connection_limit khi scale (đã ghi runbook).

**Fix phát sinh trong quá trình đo (đã commit riêng):**
- `users.createAddress` bỏ $transaction 3-query (top P2028 source) — 64/77
  lỗi pool ở kịch bản 50 VU đến từ endpoint này.
- Kịch bản flash-sale thật thêm vào script: `FLASH_PRODUCT_ID` env pin 1 SKU
  cho mọi VU tranh.
- Lưu ý đo: k6 --summary-export vô hiệu khi script tự define handleSummary —
  lấy số từ text summary + truy vấn DB.
