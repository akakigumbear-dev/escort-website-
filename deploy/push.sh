#!/usr/bin/env bash
# Push project to server and rebuild. Usage: ./deploy/push.sh
# Uses SSH multiplexing: enter password ONCE, all commands reuse it.
#
# Options:
#   --reset-db    Drop and recreate DB schema (only when enums/entities changed)
#   --import      Run data import after deploy

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="root@151.243.109.48"
WWW_DIR="/var/www/escort.website"
SSH_SOCK="/tmp/deploy-escort-ssh-$$"

RESET_DB=false
RUN_IMPORT=false
for arg in "$@"; do
  case "$arg" in
    --reset-db) RESET_DB=true ;;
    --import)   RUN_IMPORT=true ;;
  esac
done

cleanup() { ssh -S "$SSH_SOCK" -O exit "$TARGET" 2>/dev/null || true; }
trap cleanup EXIT

echo "Connecting to server (enter password once)..."
ssh -M -f -N -o ControlPersist=300 -S "$SSH_SOCK" "$TARGET"
echo "Connected."

export DEPLOY_SSH_SOCK="$SSH_SOCK"
export DEPLOY_TARGET="$TARGET"

# 1. Upload files
"$SCRIPT_DIR/upload-no-git.sh"

# 2. Push production .env
echo "Pushing production env..."
scp -o "ControlPath=$SSH_SOCK" "$PROJECT_ROOT/.env" "$TARGET:$WWW_DIR/.env"

# 3. Ensure upload dirs exist
echo "Ensuring uploads directories exist..."
ssh -S "$SSH_SOCK" "$TARGET" "mkdir -p $WWW_DIR/escort-backend/uploads/images $WWW_DIR/escort-backend/uploads/_tmp $WWW_DIR/escort-backend/uploads/dm"

# 4. Update nginx configs (includes SSL blocks, won't break certbot)
echo "Updating nginx config..."
ssh -S "$SSH_SOCK" "$TARGET" "
  cp $WWW_DIR/deploy/nginx-api-escort.conf /etc/nginx/sites-available/api-escort
  cp $WWW_DIR/deploy/nginx-escort.conf /etc/nginx/sites-available/escort
  ln -sf /etc/nginx/sites-available/api-escort /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/escort /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
" || echo "WARNING: nginx update failed"

# 5. Ensure SSL certs exist (first deploy only — skips if already present)
echo "Checking SSL certificate..."
ssh -S "$SSH_SOCK" "$TARGET" "
  certbot certificates 2>/dev/null | grep -q 'api.elitescort.fun' || \
  certbot certonly --nginx -d elitescort.fun -d www.elitescort.fun -d api.elitescort.fun \
    --non-interactive --agree-tos --expand 2>/dev/null || \
  echo 'SSL: certs already exist or run certbot manually'
"

# 6. Optional: reset DB schema (only when enums/entities changed)
if [ "$RESET_DB" = true ]; then
  echo "Resetting DB schema..."
  ssh -S "$SSH_SOCK" "$TARGET" "cd $WWW_DIR && docker compose exec -T postgres psql -U nestuser -d nestdb -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'" || echo "WARNING: DB reset failed"
fi

# 7. Rebuild and start all containers
echo "Rebuilding on server..."
ssh -S "$SSH_SOCK" "$TARGET" "cd $WWW_DIR && docker compose up -d --build"

# 8. Wait for services to be ready
echo "Waiting for services to start..."
sleep 15

# 9. Optional: run data import (re-add when import script exists)
# if [ "$RUN_IMPORT" = true ]; then
#   echo "Running data import..."
#   ssh -S "$SSH_SOCK" "$TARGET" "cd $WWW_DIR && docker compose exec -T backend npx ts-node ..." || echo "WARNING: Import failed"
# fi

echo ""
echo "Deploy complete. Check: https://elitescort.fun https://api.elitescort.fun"
