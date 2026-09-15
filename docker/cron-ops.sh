#!/bin/sh
# Cron vận hành hằng ngày trên máy prod — gọi vào API qua nginx.
#
# Cài đặt (crontab root trên host):
#   # 5 phút 1 lần: hết hạn đơn PENDING bỏ thanh toán → giải phóng kho
#   */5 * * * * root API_URL=http://localhost/api/v1 OPS_USER_EMAIL=ops@homemart.vn OPS_USER_PASSWORD='...' /opt/homemart/docker/cron-ops.sh expire-pending
#   # 03:00 hằng ngày: đối soát payment vs gateway
#   0 3 * * * root API_URL=http://localhost/api/v1 OPS_USER_EMAIL=ops@homemart.vn OPS_USER_PASSWORD='...' /opt/homemart/docker/cron-ops.sh reconcile
#
# Auth: script tự đăng nhập bằng tài khoản ops (role MANAGER) để lấy access
# token mới mỗi lần chạy — cron KHÔNG thể dùng JWT cố định vì token hết hạn
# sau JWT_ACCESS_TTL. Tạo tài khoản ops 1 lần:
#   (đăng ký user rồi UPDATE role='MANAGER' trong DB, đặt mật khẩu mạnh riêng)
# Hoặc chạy tay với ADMIN_TOKEN có sẵn (token còn hạn):
#   ADMIN_TOKEN=eyJ... /opt/homemart/docker/cron-ops.sh expire-pending
set -eu

API_URL="${API_URL:-http://localhost/api/v1}"
TASK="${1:-expire-pending}"
LOG_TAG="${LOG_TAG:-homemart-${TASK}}"

case "$TASK" in
  expire-pending) ENDPOINT="admin/orders/ops/expire-pending" ;;
  reconcile)      ENDPOINT="admin/orders/ops/reconcile" ;;
  *) echo "Unknown task: $TASK (dùng expire-pending | reconcile)" >&2; exit 1 ;;
esac

# Token: ưu tiên ADMIN_TOKEN truyền tay; nếu không có, login bằng ops account.
if [ -z "${ADMIN_TOKEN:-}" ]; then
  OPS_USER_EMAIL="${OPS_USER_EMAIL:?export OPS_USER_EMAIL (tài khoản ops role MANAGER) hoặc ADMIN_TOKEN}"
  OPS_USER_PASSWORD="${OPS_USER_PASSWORD:?export OPS_USER_PASSWORD hoặc ADMIN_TOKEN}"
  LOGIN_RESP="$(curl -sf -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$OPS_USER_EMAIL\",\"password\":\"$OPS_USER_PASSWORD\"}" || echo '')"
  # accessToken nằm trong envelope {success,data:{accessToken}} (response.interceptor)
  ADMIN_TOKEN="$(printf '%s' "$LOGIN_RESP" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
  if [ -z "$ADMIN_TOKEN" ]; then
    echo "[$(date -Iseconds)] ALERT: $TASK — ops login thất bại, response: $(printf '%s' "$LOGIN_RESP" | head -c 200)" >&2
    exit 1
  fi
fi

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
