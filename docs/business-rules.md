# Business Rules (bắt buộc implement đúng)

## BR-1 Giá & tiền
- Backend **luôn** tính giá từ DB tại thời điểm checkout. Client chỉ gửi productId/variantId/quantity.
- `lineTotal = unitPrice(snapshot) × quantity`; `subtotal = Σ lineTotal`.
- `discount` từ voucher; không vượt subtotal. `tax = round((subtotal - discount) × TAX_RATE)`.
- `total = subtotal - discount + shippingFee + tax`, luôn ≥ 0.

## BR-2 Tồn kho — chống overselling
1. Checkout: trong 1 transaction, `SELECT ... FOR UPDATE` từng inventory row → nếu `available < qty` → rollback toàn đơn, báo sản phẩm hết hàng.
2. Reserve: `available -= q, reserved += q`. Commit khi payment success: `reserved -= q, sold += q, product.soldCount += q`. Release khi: hủy / hết 30 phút timeout / payment failed.
3. Mọi biến đổi ghi `InventoryTransaction`.

## BR-3 Voucher concurrency
- Validate: status ACTIVE, trong thời hạn, `minOrderAmount ≤ subtotal`, scope khớp giỏ hàng.
- Atomic increment `usedCount` với guard `usedCount < usageLimit` trong UPDATE (`UPDATE vouchers SET used_count = used_count+1 WHERE id=$1 AND used_count < usage_limit`) → 0 rows = hết lượt.
- Per-user: đếm VoucherUsage theo userId trước khi cho dùng.
- Ghi usage **trong cùng transaction tạo Order**.

## BR-4 Payment idempotency
- Webhook trùng (`providerTxnId + eventType` đã tồn tại) → trả 200 OK nhưng KHÔNG xử lý lại.
- Chỉ chuyển PENDING→SUCCESS; SUCCESS→SUCCESS bị bỏ qua.
- Verify signature trước mọi xử lý (VNPay HMAC-SHA512, MoMo HMAC-SHA256, Stripe signature header).

## BR-5 Trạng thái đơn hàng
State machine hợp lệ (khác → BusinessRuleError):

| From | Allowed to |
|---|---|
| PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | PROCESSING, CANCELLED |
| PROCESSING | PACKING, CANCELLED |
| PACKING | SHIPPED, CANCELLED |
| SHIPPED | DELIVERED, RETURN_REQUESTED |
| DELIVERED | COMPLETED, RETURN_REQUESTED |
| RETURN_REQUESTED | RETURNED, COMPLETED |
| RETURNED | REFUNDED |
| CANCELLED / REFUNDED / COMPLETED | (terminal) |

- CUSTOMER chỉ được CANCEL khi ở PENDING..PACKING và chưa SHIPPED.
- Cancel/timeout → release reserved stock + refund nếu đã thanh toán.

## BR-6 Ownership & RBAC
- User chỉ xem/cancel order của chính mình (`order.userId === req.user.id` hoặc role ≥ STAFF).
- Review chỉ được tạo khi có `OrderItem` thuộc order DELIVERED/COMPLETED của user đó; mỗi orderItem review 1 lần.
- Admin endpoints yêu cầu role phù hợp; action quan trọng ghi AuditLog.

## BR-7 Cart
- Không thêm vượt tồn kho; merge guest cart vào user cart sau login (dedupe theo productId+variantId, cộng số lượng).
- Checkout re-validate tồn kho + giá — cart có thể stale.

## BR-8 Dữ liệu
- Không xóa cứng dữ liệu có lịch sử giao dịch (soft delete/archive).
- Không log password, token, full card data.

## BR-9 Vận chuyển
- Fee = baseFee + feePerKg × ceil(totalWeightKg); free ship STANDARD khi subtotal ≥ ngưỡng method.
- Voucher FREE_SHIPPING giảm trừ shippingFee về 0.
