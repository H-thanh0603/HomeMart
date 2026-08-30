#!/bin/sh
# HomeMart — bật TLS thật sự:
#   1. Sinh self-signed cert vào docker/certs/ (nếu chưa có)
#   2. Đổi NGINX_CONF trong .env.production sang docker/nginx-tls.conf
#   3. docker compose -f docker-compose.prod.yml up -d nginx
#
# Khi có domain thật: thay self-signed cert bằng Let's Encrypt (xem nginx-tls.conf).
set -eu
cd "$(dirname "$0")/.."

CERT_DIR="docker/certs"
FULLCHAIN="$CERT_DIR/fullchain.pem"
PRIVKEY="$CERT_DIR/privkey.pem"
ENV_FILE=".env.production"

mkdir -p "$CERT_DIR"

if [ ! -f "$FULLCHAIN" ] || [ ! -f "$PRIVKEY" ]; then
  echo "→ Không thấy cert — sinh self-signed certificate (3650 ngày)..."
  DOMAIN="${1:-localhost}"
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$PRIVKEY" -out "$FULLCHAIN" \
    -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1" 2>/dev/null
  chmod 600 "$PRIVKEY"
  echo "✓ Đã sinh $FULLCHAIN + $PRIVKEY"
else
  echo "✓ Cert đã tồn tại trong $CERT_DIR — dùng lại"
fi

# Chuyển nginx sang conf TLS
if [ -f "$ENV_FILE" ] && grep -q "^NGINX_CONF=" "$ENV_FILE"; then
  sed -i 's|^NGINX_CONF=.*|NGINX_CONF=./docker/nginx-tls.conf|' "$ENV_FILE"
else
  echo "NGINX_CONF=./docker/nginx-tls.conf" >> "$ENV_FILE"
fi
echo "✓ $ENV_FILE: NGINX_CONF=./docker/nginx-tls.conf"

echo
echo "→ Restart nginx:  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate nginx"
echo "→ Kiểm tra:       curl -kI https://localhost/health"
echo "  HSTS expected:  Strict-Transport-Security: max-age=31536000; includeSubDomains"
echo
echo "LƯU Ý: self-signed cert sẽ bị trình duyệt cảnh báo — chỉ dùng cho staging."
echo "Khi đi live với domain: dùng certbot (hướng dẫn trong docker/nginx-tls.conf)."
