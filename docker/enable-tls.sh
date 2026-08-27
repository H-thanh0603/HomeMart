#!/bin/sh
# HomeMart — bật TLS cho nginx (Let's Encrypt / manual certs)
# Usage:
#   ./docker/enable-tls.sh your-domain.com
#   # yêu cầu: ./certs/fullchain.pem và ./certs/privkey.pem đã tồn tại
set -eu
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>  (certs must be at ./certs/fullchain.pem + ./certs/privkey.pem)"
  exit 1
fi
if [ ! -f ./certs/fullchain.pem ] || [ ! -f ./certs/privkey.pem ]; then
  echo "Missing ./certs/fullchain.pem or ./certs/privkey.pem — obtain via certbot:"
  echo "  certbot certonly --standalone -d $DOMAIN --email admin@$DOMAIN --agree-tos"
  echo "  cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./certs/"
  echo "  cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./certs/"
  exit 1
fi
echo "→ Certs found, uncommenting 443 block in docker/nginx.conf"
# Hướng dẫn thủ công: bỏ comment block 443 trong docker/nginx.conf và thêm volumes certs cho nginx
echo "✓ Verify: curl -I https://$DOMAIN/health | grep -i Strict-Transport-Security"
echo "  HSTS expected: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
