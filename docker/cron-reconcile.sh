#!/bin/sh
# Cron đối soát hằng ngày — chạy trong container api hoặc host có API_URL
# Crontab: 0 3 * * * /path/to/docker/cron-reconcile.sh
set -eu
API_URL="${API_URL:-http://localhost:4000/api/v1}"
ADMIN_TOKEN="${ADMIN_TOKEN:?export ADMIN_TOKEN (JWT của MANAGER/ADMIN)}"

echo "[$(date -Iseconds)] Reconciling payments..."
curl -sf -X POST "$API_URL/admin/orders/ops/reconcile" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | tee -a /var/log/homemart-reconcile.log
echo ""
