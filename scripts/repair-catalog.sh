#!/usr/bin/env bash
# Run catalog repair/cleanup on the server (called from GitHub Actions or manually).
# Usage: ./scripts/repair-catalog.sh [selective|cleanup-ct|dedupe|dedupe-dry-run|dry-run|full]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-selective}"

echo "==> Repair catalog: ROOT=$ROOT MODE=$MODE"

cd "$ROOT"
git fetch origin
git checkout main 2>/dev/null || git checkout -b main origin/main
git reset --hard origin/main

cd "$ROOT/backend"
npm ci --omit=dev
npx prisma generate

run_repair() {
  npm run db:repair-catalog
}

run_dedupe() {
  npm run db:dedupe-catalog
}

run_cleanup_ct() {
  npm run db:cleanup-ct-catalog
}

case "$MODE" in
  dry-run)
    node prisma/repair-site-catalog.js --dry-run
    ;;
  full)
    echo "WARNING: full mode clones ALL JHB makes to CT"
    node prisma/repair-site-catalog.js --full
    run_dedupe
    run_cleanup_ct
    ;;
  dedupe-dry-run)
    node prisma/dedupe-site-catalog.mjs --dry-run
    ;;
  dedupe)
    run_dedupe
    run_cleanup_ct
    ;;
  cleanup-ct)
    run_cleanup_ct
    ;;
  selective)
    run_repair
    run_dedupe
    run_cleanup_ct
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Use: selective | cleanup-ct | dedupe | dedupe-dry-run | dry-run | full" >&2
    exit 1
    ;;
esac

echo "==> Repair finished"
