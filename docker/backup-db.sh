#!/bin/sh
# HomeMart — Postgres backup
# Usage (host có docker):
#   ./docker/backup-db.sh                     # backup vào ./backups
#   ./docker/backup-db.sh /path/to/dir        # hoặc thư mục tùy chọn
#
# Khuyến nghị: chạy qua cron hằng ngày, giữ 7-30 bản, và ĐỒNG THỜI copy
# ra ngoài máy chủ (object storage / máy khác) — backup cùng ổ đĩa với
# database không phải là backup.
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/homemart-$STAMP.sql.gz"

echo "→ Dumping postgres to $FILE"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:?export POSTGRES_USER trước khi chạy}" "${POSTGRES_DB:-homemart}" \
  | gzip > "$FILE"

echo "→ Verifying archive"
gzip -t "$FILE"

# Dọn bản cũ
find "$BACKUP_DIR" -name 'homemart-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "✓ Done: $FILE ($(du -h "$FILE" | cut -f1))"
echo "  Phục hồi: gunzip -c $FILE | docker compose -f $COMPOSE_FILE exec -T postgres psql -U \$POSTGRES_USER \$POSTGRES_DB"
