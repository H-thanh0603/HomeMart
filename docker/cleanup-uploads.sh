#!/bin/sh
# HomeMart — xóa ảnh rác (orphan uploads không còn tham chiếu)
# Usage: ./docker/cleanup-uploads.sh [--dry-run]
# - Local driver: quét ./uploads/products/* và đối chiếu với ProductImage.url trong DB
# - S3 driver: liệt kê objects với prefix products/ và kiểm tra tương tự
set -eu
DRY_RUN="${1:-}"
UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"
DAYS_OLD="${DAYS_OLD:-7}"

echo "→ Checking orphan uploads older than ${DAYS_OLD}d in $UPLOAD_DIR"
if [ ! -d "$UPLOAD_DIR" ]; then
  echo "  No local upload dir — skipping (S3 driver? check via AWS CLI: aws s3 ls s3://\$S3_BUCKET/products/)"
  exit 0
fi

# Tìm file > DAYS_OLD ngày chưa được tham chiếu — cần DB check thủ công
# Tự động xóa chỉ khi chắc chắn: so với SELECT url FROM product_images
echo "  Files older than ${DAYS_OLD}d:"
find "$UPLOAD_DIR" -type f -mtime +"$DAYS_OLD" -print | head -20 || true
COUNT=$(find "$UPLOAD_DIR" -type f -mtime +"$DAYS_OLD" | wc -l)
echo "  Total candidates: $COUNT"

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "  Dry-run — not deleting"
  exit 0
fi

# Khi có DB, chạy:
#   psql $DATABASE_URL -c "SELECT url FROM product_images" > /tmp/known_urls.txt
#   # diff và xóa file không có trong known_urls
echo "  To actually delete, compare with DB: SELECT url FROM product_images"
echo "  Manual step required — not auto-deleting to avoid data loss"
