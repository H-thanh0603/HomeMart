#!/bin/bash
# Chuẩn bị môi trường đo load test: xóa dữ liệu loadtest + reset tồn kho.
# Usage: ./docker/loadtest-reset.sh [deal_product_id] [stock]
set -eu
DEAL="${1:-4ebdb421-d5e8-4e15-9db0-f2703c005855}"
STOCK="${2:-100}"

PGPASSWORD=homemart_secret /usr/lib/postgresql/18/bin/psql -h localhost -p 54329 -U homemart -d homemart -tAc "
DO \$\$ DECLARE u RECORD; BEGIN
  FOR u IN SELECT id FROM users WHERE email LIKE 'loadtest_%' LOOP
    DELETE FROM idempotency_records WHERE \"userId\"=u.id;
    DELETE FROM order_status_history WHERE \"orderId\" IN (SELECT id FROM orders WHERE \"userId\"=u.id);
    DELETE FROM payment_transactions WHERE \"paymentId\" IN (SELECT p.id FROM payments p JOIN orders o ON o.id=p.\"orderId\" WHERE o.\"userId\"=u.id);
    DELETE FROM payments WHERE \"orderId\" IN (SELECT id FROM orders WHERE \"userId\"=u.id);
    DELETE FROM order_items WHERE \"orderId\" IN (SELECT id FROM orders WHERE \"userId\"=u.id);
    DELETE FROM shipments WHERE \"orderId\" IN (SELECT id FROM orders WHERE \"userId\"=u.id);
    DELETE FROM voucher_usages WHERE \"userId\"=u.id;
    DELETE FROM orders WHERE \"userId\"=u.id;
    DELETE FROM cart_items WHERE \"cartId\" IN (SELECT id FROM carts WHERE \"userId\"=u.id);
    DELETE FROM carts WHERE \"userId\"=u.id;
    DELETE FROM addresses WHERE \"userId\"=u.id;
    DELETE FROM refresh_tokens WHERE \"userId\"=u.id;
    DELETE FROM users WHERE id=u.id;
  END LOOP; END \$\$;
UPDATE inventories SET \"availableStock\"=$STOCK, \"reservedStock\"=0 WHERE \"productId\"='$DEAL' AND \"variantId\" IS NULL;
SELECT 'reset: deal stock='||$STOCK;
"
