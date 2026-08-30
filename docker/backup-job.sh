#!/bin/sh
# Chạy hằng ngày (crond 02:00) trong service `backup` của docker-compose.prod.yml
set -eu
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/backups/homemart-$STAMP.sql.gz"

pg_dump | gzip > "$FILE"
gzip -t "$FILE"
find /backups -name 'homemart-*.sql.gz' -mtime +"${KEEP_DAYS:-14}" -delete

echo "[$(date -Is)] backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
