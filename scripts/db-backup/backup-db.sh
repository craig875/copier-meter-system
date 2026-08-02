#!/usr/bin/env bash
# Nightly pg_dump (-Fc) of copier_meter_db → local retention 30 days.
# OneDrive/rclone upload is intentionally stubbed below for a later one-block add.
#
# Deploy (on the app server, not part of the Node app runtime):
#   sudo mkdir -p /var/backups/copier-meter-db /var/log/copier-meter
#   sudo chown "$USER:$USER" /var/backups/copier-meter-db /var/log/copier-meter
#   chmod +x scripts/db-backup/backup-db.sh
# Crontab (02:15 daily):
#   PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
#   15 2 * * * /var/www/copier-meter-system/scripts/db-backup/backup-db.sh >/dev/null 2>&1
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/copier-meter-system}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/backend/.env}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/copier-meter-db}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/copier-meter/db-backup.log}"
LOCK_FILE="${LOCK_FILE:-/var/lock/copier-meter-db-backup.lock}"

# Future OneDrive (leave unset / false until ready):
#   ENABLE_ONEDRIVE_UPLOAD=true
#   RCLONE_REMOTE=onedrive:Backups/copier-meter-db
ENABLE_ONEDRIVE_UPLOAD="${ENABLE_ONEDRIVE_UPLOAD:-false}"
RCLONE_REMOTE="${RCLONE_REMOTE:-onedrive:Backups/copier-meter-db}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "$(ts) $*" | tee -a "$LOG_FILE"; }

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "SKIP already running"
  exit 0
fi

mkdir -p "$LOCAL_DIR" "$(dirname "$LOG_FILE")"

if [[ ! -f "$ENV_FILE" ]]; then
  log "FAIL missing env file: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  log "FAIL DATABASE_URL not set in $ENV_FILE"
  exit 1
fi

STAMP="$(date +%Y-%m-%d_%H%M%S)"
DUMP_NAME="copier_meter_db_${STAMP}.dump"
DUMP_PATH="$LOCAL_DIR/$DUMP_NAME"

log "START dump → $DUMP_PATH"

if ! pg_dump "$DATABASE_URL" -Fc -f "$DUMP_PATH"; then
  log "FAIL pg_dump"
  rm -f "$DUMP_PATH"
  exit 1
fi

SIZE="$(du -h "$DUMP_PATH" | awk '{print $1}')"
log "OK dump size=$SIZE"

# ---------------------------------------------------------------------------
# OPTIONAL REMOTE UPLOAD (OneDrive via rclone) — add later without a rewrite
# ---------------------------------------------------------------------------
# When OneDrive is available:
#   1. Install/configure rclone remote (e.g. "onedrive")
#   2. Export ENABLE_ONEDRIVE_UPLOAD=true (env or crontab)
#   3. Optionally set RCLONE_REMOTE
# The block below will then copy this dump and prune remote files the same
# retention window. Until then it is a no-op.
# ---------------------------------------------------------------------------
upload_to_onedrive_if_enabled() {
  if [[ "${ENABLE_ONEDRIVE_UPLOAD}" != "true" ]]; then
    log "SKIP remote upload (ENABLE_ONEDRIVE_UPLOAD!=true)"
    return 0
  fi

  if ! command -v rclone >/dev/null 2>&1; then
    log "FAIL rclone not installed but ENABLE_ONEDRIVE_UPLOAD=true"
    return 1
  fi

  log "START rclone copy → $RCLONE_REMOTE"
  if ! rclone copy "$DUMP_PATH" "$RCLONE_REMOTE" --checksum --log-file="$LOG_FILE" --log-level INFO; then
    log "FAIL rclone copy"
    return 1
  fi
  log "OK upload $DUMP_NAME"

  log "START remote cleanup older than ${RETAIN_DAYS}d"
  if ! rclone delete "$RCLONE_REMOTE" --min-age "${RETAIN_DAYS}d" --include 'copier_meter_db_*.dump' --log-file="$LOG_FILE" --log-level INFO; then
    log "FAIL rclone remote cleanup"
    return 1
  fi
  rclone rmdirs "$RCLONE_REMOTE" --leave-root 2>/dev/null || true
  log "OK remote cleanup"
  return 0
}

if ! upload_to_onedrive_if_enabled; then
  exit 1
fi

# Local cleanup: delete *.dump older than RETAIN_DAYS
log "START local cleanup older than ${RETAIN_DAYS}d"
while IFS= read -r -d '' f; do
  log "DELETED local $f"
  rm -f "$f"
done < <(find "$LOCAL_DIR" -type f -name 'copier_meter_db_*.dump' -mtime +"$RETAIN_DAYS" -print0)

log "SUCCESS $DUMP_NAME"
exit 0
