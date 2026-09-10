#!/bin/sh
# Cron vận hành hằng ngày trên máy prod — gọi vào API qua nginx.
#
# Cài đặt (crontab root trên host):
#   # 5 phút 1 lần: hết hạn đơn PENDING bỏ thanh toán → giải phóng kho
#   */5 * * * * root API_URL=http://localhost/api/v1 ADMIN_TOKEN=... /opt/homemart/docker/cron-ops.sh expire-pending
#   # 03:00 hằng ngày: đối soát payment vs gateway
#   0 3 * * * root API_URL=http://localhost/api/v1 ADMIN_TOKEN=... /opt/homemart/docker/cron-ops.sh reconcile
#
# ADMIN_TOKEN: JWT của MANAGER/ADMIN (rotate theo JWT_ACCESS_TTL).
set -eu

API_URL="${API_URL:-http://localhost/api/v1}"
ADMIN_TOKEN="${ADMIN_TOKEN:?export ADMIN_TOKEN (JWT của MANAGER/ADMIN)}"
TASK="${1:-expire-pending}"
LOG_TAG="${LOG_TAG:-homemart-${TASK}}"

case "$TASK" in
  expire-pending) ENDPOINT="admin/orders/ops/expire-pending" ;;
  reconcile)      ENDPOINT="admin/orders/ops/reconcile" ;;
  *) echo "Unknown task: $TASK (dùng expire-pending | reconcile)" >&2; exit 1 ;;
esac

echo "[$(date -Iseconds)] $TASK → POST $API_URL/$ENDPOINT"
RESP="$(curl -sf -X POST "$API_URL/$ENDPOINT" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' || echo '{"error":"curl failed"}')"

echo "$RESP"
echo "$RESP" >> "/var/log/${LOG_TAG}.log"

# Alert khi có lỗi: expire-pending trả {error}, hoặc reconcile mismatched > 0
case "$RESP" in
  *'"error"'*) echo "ALERT: $TASK failed" >&2 ;;
esac
if [ "$TASK" = "reconcile" ]; then
  echo "$RESP" | grep -q '"mismatched":0' || echo "ALERT: reconcile có mismatch — kiểm tra /var/log/${LOG_TAG}.log" >&2
fi
