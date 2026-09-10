#!/bin/sh
# Chạy hằng ngày (crond 02:00) trong service `backup` của docker-compose.prod.yml
# Backup 2 thứ: (1) PostgreSQL pg_dump, (2) uploads volume (ảnh sản phẩm —
# mất là mất ảnh toàn catalog, KHÔNG thể tái tạo từ seed).
set -eu
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/backups/homemart-$STAMP.sql.gz"

pg_dump | gzip > "$FILE"
gzip -t "$FILE"
find /backups -name 'homemart-*.sql.gz' -mtime +"${KEEP_DAYS:-14}" -delete

# ─── Uploads volume (ảnh sản phẩm) ───
# Chạy bên trong service backup — cần mount uploads volume read-only.
# docker-compose.prod.yml đã mount: uploads_backup:/backups
# và uploads:/uploads:ro cho service này.
UPLOADS_FILE="/backups/uploads-$STAMP.tar.gz"
if [ -d /uploads ]; then
  # tar từ mounted volume name bên trong backup container
  if tar -czf "$UPLOADS_FILE" -C /uploads . 2>/dev/null; then
    gzip -t "$UPLOADS_FILE"
    find /backups -name 'uploads-*.tar.gz' -mtime +"${KEEP_DAYS:-14}" -delete
  else
    echo "[$(date -Is)] WARN: uploads backup failed (volume not mounted?) — DB backup vẫn ok" >&2
  fi
else
  echo "[$(date -Is)] WARN: /uploads not mounted — uploads KHÔNG được backup" >&2
fi

# Manifest: backup nào chứa gì (restore giờ cần 2 file: sql.gz + tar.gz)
ls -lh /backups/homemart-"$STAMP".sql.gz >/dev/null 2>&1 && \
  echo "[$(date -Is)] backup ok: $FILE ($(du -h "$FILE" | cut -f1)) + ${UPLOADS_FILE:-uploads SKIPPED} ($(du -h "$UPLOADS_FILE" 2>/dev/null | cut -f1 || echo -))"
