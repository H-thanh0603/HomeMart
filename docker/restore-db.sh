#!/bin/sh
# HomeMart — PHỤC HỒI database từ file backup.
# CẢNH BÁO: ghi đè toàn bộ dữ liệu hiện tại. Backup trước khi restore!
# Usage:
#   ./docker/restore-db.sh backups/homemart-20260830-020000.sql.gz
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <path-to-homemart-*.sql.gz>"
  exit 1
fi

echo "SẮP PHỤC HỒI '$FILE' — toàn bộ dữ liệu hiện tại của database sẽ bị GHI ĐÈ."
printf "Gõ 'RESTORE' để tiếp tục: "
read -r CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Huỷ."; exit 1; }

# Backup an toàn trước khi ghi đè
./docker/backup-db.sh ./backups/pre-restore || echo "!! Backup pre-restore thất bại — dừng lại nếu không chắc"
echo "→ Restoring..."
gunzip -c "$FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:?export POSTGRES_USER}" "${POSTGRES_DB:-homemart}"
echo "✓ Restore xong. Kiểm tra: /health và trang admin."
