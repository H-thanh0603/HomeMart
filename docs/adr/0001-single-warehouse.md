# ADR 0001 — Một kho duy nhất (single warehouse)

**Ngày:** 2026-08-26 · **Trạng thái:** Accepted · **Liên quan:** `docs/launch-checklist.md#2.2`

## Bối cảnh
`Inventory` hiện có `productId + variantId` làm khóa duy nhất, không có `warehouseId`. Checklist 2.2 yêu cầu quyết định: giữ 1 kho hay mở `warehouseId`.

## Quyết định
**Giữ 1 kho duy nhất.** Không thêm `warehouseId` vào schema trong 30 ngày launch.

## Lý do
- HomeMart bán đồ gia dụng nhẹ, tập trung HN/HCM, 1 kho HN đủ phủ toàn quốc qua GHN (gate 2.1).
- Thêm `warehouseId` kéo theo: split `availableStock` theo kho, chọn kho khi checkout, đồng bộ tồn giữa kho, UI chọn kho — ước tính 2–3 tuần, không giúp bán đơn đầu tiên.
- Schema hiện tại đã có `Shipment` + `ShippingMethod` + carrier webhook, đủ để giao được ngay.

## Hệ quả
- Khoá roadmap đa kho: không nhận yêu cầu "thêm kho HCM/ĐN" cho tới khi gate `giao đúng hẹn >90%` đạt ổn định 2 tuần.
- Khi cần mở rộng, migration: `warehouse` table + `inventory.warehouseId` (nullable → backfill) + `order.warehouseId` + logic chọn kho gần `shippingProvince`.

## Tham chiếu
- `apps/api/prisma/schema.prisma:388` — `Inventory @@unique([productId, variantId])`
- `apps/api/src/modules/shipping/shipping.service.ts` — carrier fee + shipment creation
