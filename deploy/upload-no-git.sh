#!/usr/bin/env bash
# Upload project to server. Replaces all files (like git), keeps uploads.
# Called by push.sh (reuses its SSH connection) or standalone.

set -e
TARGET="${DEPLOY_TARGET:-root@151.243.109.48}"
WWW_DIR="/var/www/escort.website"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_SOCK="${DEPLOY_SSH_SOCK:-}"

SSH_OPTS=""
[ -n "$SSH_SOCK" ] && SSH_OPTS="-S $SSH_SOCK"

run_ssh() { ssh $SSH_OPTS "$@"; }

echo "Project root: $PROJECT_ROOT"
echo "Target: $TARGET:$WWW_DIR"
echo "Syncing (git-style: delete stale files, keep uploads)..."

run_ssh "$TARGET" "mkdir -p $WWW_DIR"

RSH="ssh"
[ -n "$SSH_SOCK" ] && RSH="ssh -S $SSH_SOCK"

rsync -avz --delete -e "$RSH" \
  --filter='protect escort-backend/uploads/' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='escort-backend/uploads/_tmp' \
  --exclude='escort-backend/uploads/dm' \
  --exclude='scrapper' \
  "$PROJECT_ROOT/" "$TARGET:$WWW_DIR/"

echo "Removing any .git on server..."
run_ssh "$TARGET" "find $WWW_DIR -name .git -type d -exec rm -rf {} + 2>/dev/null || true; find $WWW_DIR -name .git -type f -delete 2>/dev/null || true"

echo "Upload done."
