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
