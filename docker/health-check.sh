#!/bin/sh
# HomeMart — health alert cron (1 phút)
# Crontab: * * * * * /opt/homemart/docker/health-check.sh
# Yêu cầu: SLACK_WEBHOOK_URL hoặc TELEGRAM_BOT_TOKEN+CHAT_ID trong env
set -eu
API_URL="${API_URL:-http://localhost/api/v1}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
HEALTH_URL="${HEALTH_URL:-$API_URL/health}"

if curl -sf "$HEALTH_URL" | grep -q '"status":"ok"'; then
  exit 0
fi

MSG="[ALERT] HomeMart health != ok at $(date -Iseconds) — $HEALTH_URL"
echo "$MSG" >&2

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -sf -X POST -H 'Content-Type: application/json' -d "{\"text\":\"$MSG\"}" "$SLACK_WEBHOOK_URL" || true
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  curl -sf "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d "chat_id=${TELEGRAM_CHAT_ID}&text=${MSG}" || true
fi

exit 1
