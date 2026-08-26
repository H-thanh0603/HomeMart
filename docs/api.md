# API Design (v1)

Base: `/api/v1` · Swagger: `/api/docs` · Health: `/api/v1/health`

Response format thống nhất:
```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page":1, "limit":20, "total":100, "totalPages":5 } }
```
Error:
```json
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

## Auth
```
POST /auth/register            {email,password,fullName}
POST /auth/login               → {accessToken, refreshToken, user}
POST /auth/refresh             {refreshToken}  (rotation)
POST /auth/logout              {refreshToken}
POST /auth/forgot-password     {email}
POST /auth/reset-password      {token,newPassword}
POST /auth/change-password     auth {currentPassword,newPassword}
GET  /auth/verify-email?token=
GET  /auth/me                  auth
```

## Users & Addresses
```
PATCH /users/me                       GET/PATCH /users/me
GET|POST /users/me/addresses          PATCH|DELETE /users/me/addresses/:id
PUT  /users/me/addresses/:id/default
```

## Catalog (public)
```
GET /categories (tree)         GET /categories/:slug
GET /brands
GET /products?page&sort&minPrice&maxPrice&category&brand&rating&inStock&q&tags
GET /products/:slug
GET /products/:slug/related    GET /search/suggest?q=
```

## Cart & Wishlist
```
GET  /cart                          POST /cart/items {productId,variantId?,quantity}
PATCH /cart/items/:id {quantity}    DELETE /cart/items/:id
POST /cart/items/:id/save           POST /cart/items/:id/move-to-wishlist
POST /cart/merge {guestToken}       (gọi sau login)
GET|POST|DELETE /wishlist ...       POST /wishlist/:productId/move-to-cart
```

## Checkout / Orders / Reviews
```
POST /orders/checkout  {addressId, shippingMethodId, voucherCode?, paymentMethod, note?}
   → backend tính toàn bộ tiền; tạo Order PENDING + reserve stock
GET  /orders (mine)          GET /orders/:id (ownership)
POST /orders/:id/cancel      POST /orders/:id/return
GET  /orders/:id/timeline

POST /payments/orders/:orderId/create → {redirectUrl|qrCode|instructions}
POST /payments/webhook/vnpay | /momo | /stripe   (signature verified)
GET  /payments/orders/:orderId/status

POST /reviews  {orderItemId,rating,comment,imageUrls?}   (verified purchase)
GET  /products/:slug/reviews
```

## Admin (role-guarded)
```
GET    /admin/dashboard/stats        (revenue today/month, orders, low-stock, top products)
CRUD   /admin/categories|brands|products|vouchers|promotions|shipping-methods
POST   /admin/products/bulk          {action:publish|archive|delete, ids[]}
POST   /admin/products/import.csv    GET /admin/products/export.csv
GET    /admin/products/:id/inventory POST /admin/inventory/:id/adjust
GET    /admin/orders?q&status&page   PATCH /admin/orders/:id/status {status,note?}
POST   /admin/orders/:id/shipments   PATCH /admin/shipments/:id/tracking
PATCH  /admin/reviews/:id/moderate   {status:APPROVED|HIDDEN}
GET    /admin/reports/revenue?from&to&groupBy=day|month
GET    /admin/audit-logs
```

## Pagination contract
Query: `page` (default 1), `limit` (max 100, default 20), `sort`. Meta trả về trong envelope.
