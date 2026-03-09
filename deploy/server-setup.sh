#!/usr/bin/env bash
# Run this ON THE SERVER after uploading (e.g. in /var/www/escort.website).
# Creates /var/www, installs Docker + Docker Compose + Nginx, links config, starts stack.
# Usage: cd /var/www/escort.website && chmod +x deploy/server-setup.sh && ./deploy/server-setup.sh

set -e
cd "$(dirname "$0")/.."
WWW_ROOT="/var/www"
SITE_DIR="$(pwd)"
NGINX_AVAILABLE="/etc/nginx/sites-available/escort"
NGINX_ENABLED="/etc/nginx/sites-enabled/escort"

echo "Creating $WWW_ROOT..."
mkdir -p "$WWW_ROOT"

echo "Installing Docker if missing..."
if ! command -v docker &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "Installing Nginx if missing..."
if ! command -v nginx &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq nginx
fi

echo "Creating .env from .env.example if .env missing..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Edit .env to set JWT_SECRET and optional DB_PASS."
fi

echo "Linking Nginx config..."
cp -f deploy/nginx-escort.conf "$NGINX_AVAILABLE"
# Replace placeholder if domain set
if [ -n "$DOMAIN" ]; then
  sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$NGINX_AVAILABLE"
fi
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx || true

echo "Starting Docker stack..."
docker compose up -d --build

echo "Done. Backend: http://127.0.0.1:3000 Frontend: http://127.0.0.1:8080 Nginx proxies port 80."
