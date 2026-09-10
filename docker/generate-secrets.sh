#!/bin/sh
# Sinh secrets production (JWT x2 + DB password) và ghi vào .env.production.
# Dùng thay cho việc copy secrets thật vào file nằm trong thư mục dự án.
#
# Usage:
#   ./docker/generate-secrets.sh                 # sửa trực tiếp .env.production
#   ./docker/generate-secrets.sh --print         # chỉ in ra stdout để copy tay
#
# VÌ SAO CẦN FILE NÀY: đồ án hay bị zip/share nguyên thư mục (Drive, GitHub
# release...) — secrets nằm trong .env.production trên disk là rò rỉ thật,
# kể cả khi git không track. Secrets đúng nghĩa phải nằm trong secret manager
# (SOPS/Vault/GitHub Secrets) hoặc tối thiểu ngoài thư mục dự án.
set -eu

gen() { openssl rand -base64 64 | tr -d '\n/+=' | cut -c1-48; }

JWT_ACCESS="$(gen)"
JWT_REFRESH="$(gen)"
DB_PASS="$(gen)"

if [ "${1:-}" = "--print" ]; then
  cat << EOF
# Copy vào .env.production (hoặc secret manager của bạn):
JWT_ACCESS_SECRET=$JWT_ACCESS
JWT_REFRESH_SECRET=$JWT_REFRESH
POSTGRES_PASSWORD=$DB_PASS
EOF
  exit 0
fi

FILE="${FILE:-.env.production}"
if [ ! -f "$FILE" ]; then
  echo "⚠ $FILE không tồn tại — copy từ .env.production.example trước:" >&2
  echo "  cp .env.production.example .env.production" >&2
  exit 1
fi

replace() {
  KEY="$1" VALUE="$2" python3 - << 'PYEOF'
import os, re
key, value = os.environ['KEY'], os.environ['VALUE']
path = os.environ.get('FILE', '.env.production')
src = open(path).read()
if re.search(rf'^{key}=.*$', src, re.M):
    src = re.sub(rf'^{key}=.*$', f'{key}={value}', src, flags=re.M)
else:
    src += f'\n{key}={value}\n'
open(path, 'w').write(src)
PYEOF
}

export FILE
replace JWT_ACCESS_SECRET "$JWT_ACCESS"
replace JWT_REFRESH_SECRET "$JWT_REFRESH"
replace POSTGRES_PASSWORD "$DB_PASS"
chmod 600 "$FILE"

cat << EOF
✓ Đã ghi secrets mới vào $FILE (chmod 600):
  JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / POSTGRES_PASSWORD

Ghi chú:
- Secrets cũ coi như ĐÃ LỘ nếu từng zip/share thư mục này — thay đổi ở
  mọi nơi đang dùng (DB password cần cả ALTER USER trong postgres).
- KHÔNG commit file này. Nếu cần đưa lên server: scp riêng, không qua git.
EOF
