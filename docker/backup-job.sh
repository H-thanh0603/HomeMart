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

# ─── Offsite copy (S3/R2-compatible) ───
# BACKUP_S3_BUCKET trống = bỏ qua (dev). Production: điền endpoint + key để
# mỗi bản dump rời khỏi máy chủ ngay sau khi tạo — backup cùng ổ đĩa với DB
# không phải là backup. Dùng AWS Signature V4 thủ công (alpine không có awscli).
if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ -n "${BACKUP_S3_ACCESS_KEY:-}" ]; then
  for ARTIFACT in "$FILE" "$UPLOADS_FILE"; do
    [ -f "$ARTIFACT" ] || continue
    if s3_put "$ARTIFACT"; then
      echo "[$(date -Is)] offsite ok: $(basename "$ARTIFACT") → s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX:-homemart}/$(basename "$ARTIFACT")"
    else
      echo "[$(date -Is)] ERROR: offsite FAILED for $(basename "$ARTIFACT") — local copy vẫn còn, kiểm tra credentials/endpoint" >&2
    fi
  done
fi

# PUT 1 file lên S3/R2 bằng SigV4 (busybox sh + openssl có sẵn trong alpine).
s3_put() {
  _file="$1"
  _name="$(basename "$_file")"
  _endpoint="${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT chưa set}"
  _bucket="${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET chưa set}"
  _key="${BACKUP_S3_PREFIX:-homemart}/${_name}"
  _region="${BACKUP_S3_REGION:-auto}"
  _host="$(echo "$_endpoint" | sed -e 's#^https\\?://##' -e 's#/.*\$##')"
  _url="${_endpoint%/}/${_bucket}/${_key}"
  _amzdate="$(date -u +%Y%m%dT%H%M%SZ)"
  _datestamp="$(date -u +%Y%m%d)"
  _payload_hash="$(sha256sum "$_file" | cut -d' ' -f1)"
  _signed_headers="host;x-amz-content-sha256;x-amz-date"
  _canonical="PUT
/${_bucket}/${_key}

host:${_host}
x-amz-content-sha256:${_payload_hash}
x-amz-date:${_amzdate}

${_signed_headers}
${_payload_hash}"
  _scope="${_datestamp}/${_region}/s3/aws4_request"
  _string_to_sign="AWS4-HMAC-SHA256
${_amzdate}
${_scope}
$(printf '%s' "$_canonical" | sha256sum | cut -d' ' -f1)"
  _k_date="$(printf '%s' "$_datestamp" | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$(printf '%s' "AWS4${BACKUP_S3_SECRET_KEY}" | xxd -p | tr -d '\n')" 2>/dev/null | cut -d' ' -f2)"
  # fallback: openssl không hỗ trợ hexkey trên busybox → dùng -hmac (key ascii)
  if [ -z "$_k_date" ]; then
    _k_date="$(printf '%s' "$_datestamp" | openssl dgst -sha256 -hmac "AWS4${BACKUP_S3_SECRET_KEY}" | cut -d' ' -f2)"
    _k_region="$(printf '%s' "$_region" | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$_k_date" 2>/dev/null | cut -d' ' -f2 || printf '%s' "$_region" | openssl dgst -sha256 -hmac "$_k_date" | cut -d' ' -f2)"
  else
    _k_region="$(printf '%s' "$_region" | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$_k_date" | cut -d' ' -f2)"
  fi
  _k_service="$(printf 's3' | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$_k_region" | cut -d' ' -f2)"
  _k_signing="$(printf 'aws4_request' | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$_k_service" | cut -d' ' -f2)"
  _signature="$(printf '%s' "$_string_to_sign" | openssl dgst -sha256 -mac HMAC -macopt hexkey:"$_k_signing" | cut -d' ' -f2)"
  curl -sf -X PUT --data-binary "@$_file" \
    -H "Host: $_host" -H "x-amz-date: $_amzdate" \
    -H "x-amz-content-sha256: $_payload_hash" \
    -H "Authorization: AWS4-HMAC-SHA256 Credential=${BACKUP_S3_ACCESS_KEY}/${_scope}, SignedHeaders=${_signed_headers}, Signature=${_signature}" \
    "$_url" >/dev/null
}
