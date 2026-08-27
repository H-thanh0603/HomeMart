#!/bin/sh
# HomeMart — chạy k6 load test 200 checkout song song
# Usage:
#   ./apps/api/loadtest/run-loadtest.sh                      # mặc định 200 VU, 200 iter, API http://localhost:4000/api/v1
#   API_URL=http://localhost/api/v1 ./apps/api/loadtest/run-loadtest.sh
#   VUS=50 ITERATIONS=50 ./apps/api/loadtest/run-loadtest.sh
set -eu
API_URL="${API_URL:-http://localhost:4000/api/v1}"
VUS="${VUS:-200}"
ITERATIONS="${ITERATIONS:-200}"

echo "→ Health check $API_URL/health"
if ! curl -sf "$API_URL/health" | grep -q '"status"'; then
  echo "⚠ Health check failed at $API_URL/health — is API running? (docker compose up -d postgres redis && npm run dev:api)"
  echo "  Continuing anyway; k6 will report 0% if API down."
else
  echo "✓ API health OK"
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 not found. Install: brew install k6 | snap install k6 | docker run --rm -i grafana/k6 run - < loadtest-checkout.js"
  exit 1
fi

# Chờ seed nếu products rỗng — hint
PROD_COUNT=$(curl -sf "$API_URL/products?limit=1" | grep -o '"total":[0-9]*' | head -1 || true)
echo "→ Products total hint: ${PROD_COUNT:-unknown} (run npm run db:seed if 0)"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
k6 run --env API_URL="$API_URL" --env VUS="$VUS" --env ITERATIONS="$ITERATIONS" "$SCRIPT_DIR/loadtest-checkout.js"
