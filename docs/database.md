# Database Design

Xem schema đầy đủ: `apps/api/prisma/schema.prisma` (nguồn chân truth).

## ERD (tóm tắt quan hệ)

```
User 1─n Address, RefreshToken, Order, Review, Notification, VoucherUsage
User 1─1 Wishlist 1─n WishlistItem n─1 Product
Category (self-ref tree: parentId) 1─n Product
Brand 1─n Product
Product 1─n ProductVariant / ProductImage / ProductAttribute / Review
Product/Variant 1─1 Inventory 1─n InventoryTransaction (ledger)
Cart 1─n CartItem (userId null → guest cart theo guestToken)
Order 1─n OrderItem (SNAPSHOT: name/image/sku/price), OrderStatusHistory, Payment
Payment 1─n PaymentTransaction (unique(providerTxnId,eventType) = idempotency)
ShippingMethod 1─n Shipment 1─1 Order
Promotion 1─n Voucher 1─n VoucherUsage (unique voucher+user+order)
Review n─1 OrderItem (unique orderItemId = verified purchase)
AuditLog: standalone, actorId nullable
```

## Quy ước

| Quy ước | Chi tiết |
|---|---|
| PK | UUID v4 (`uuid()`) — an toàn khi expose, tránh enumerate |
| Money | `Int` VND (không decimal — VND không có đơn vị nhỏ) |
| Soft delete | `deletedAt` trên User, Category, Brand, Product, ProductVariant, Address, Voucher, Review. **Order/Payment không bao giờ xóa cứng** |
| Snapshot | OrderItem lưu name/sku/image/variantAttributes/unitPrice tại thời điểm mua |
| Optimistic lock | `Order.version` tăng mỗi lần update trạng thái |
| Idempotency | `PaymentTransaction @@unique([providerTxnId, eventType])`; `VoucherUsage.orderId @unique` |
| Chống overselling | Reserve inventory trong transaction với row lock Prisma (`SELECT FOR UPDATE` qua `$queryRaw`) |

## Indexes chính

- `products(categoryId, status)` — listing theo danh mục
- `products(status, createdAt DESC)` — "mới nhất"
- `products(soldCount DESC)`, `products(price)` — sorting/filter
- `inventory(availableStock)` — low-stock alert
- `orders(userId, createdAt DESC)`, `orders(status)`
- `order_status_history(orderId, createdAt)` — timeline
- `payment_transactions(providerTxnId, eventType)` UNIQUE — webhook dedupe
- `voucher_usages(voucherId, userId)` — limit per user check nhanh
- `reviews(productId, status)` — rating aggregate
