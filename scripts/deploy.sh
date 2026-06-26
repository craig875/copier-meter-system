#!/usr/bin/env bash
# Run on the server from the repo root, e.g. /var/www/copier-meter-system
# Usage: ./scripts/deploy.sh
set -euo pipefail

trap 'echo "ERROR: deploy.sh failed near line $LINENO (see output above)." >&2' ERR

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/deploy.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/deploy.env"
  set +a
fi

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "ERROR: Set VITE_API_URL in $ROOT/deploy.env (copy from deploy.env.example)" >&2
  exit 1
fi

BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Fetch and reset to origin/${BRANCH}"
git fetch origin
git reset --hard "origin/${BRANCH}"

echo "==> Backend (install + migrate)"
(
  cd "$ROOT/backend"
  npm ci --omit=dev
  npx prisma generate
  # Clear failed migration record if a previous deploy attempt rolled back (P3009)
  npx prisma migrate resolve --rolled-back 20260626210000_rollback_make_branch 2>/dev/null || true
  npx prisma migrate deploy
)

echo "==> Frontend (build)"
(
  cd "$ROOT/frontend"
  npm ci
  export VITE_API_URL
  npm run build
)

echo "==> PM2"
cd "$ROOT"
if pm2 describe copier-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Deploy finished. Check: pm2 logs copier-api --lines 20"
