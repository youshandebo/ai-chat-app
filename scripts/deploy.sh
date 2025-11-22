#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
FRONT_DIR="$ROOT_DIR/frontend"
BACK_DIR="$ROOT_DIR/backend"

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm i -g pm2
fi

BACK_PORT="${BACK_PORT:-}"
FRONT_PORT="${FRONT_PORT:-}"
FRONT_DOMAIN="${FRONT_DOMAIN:-}"

is_free() {
  local PORT="$1"
  if command -v ss >/dev/null 2>&1; then
    ! ss -ltn | grep -q ":$PORT "
  elif command -v netstat >/dev/null 2>&1; then
    ! netstat -tln | grep -q ":$PORT "
  else
    return 0
  fi
}

if [ -z "$BACK_PORT" ] || [ -z "$FRONT_PORT" ]; then
  p=6555
  while true; do
    fp=$((p+1))
    if is_free "$p" && is_free "$fp"; then
      BACK_PORT="${BACK_PORT:-$p}"
      FRONT_PORT="${FRONT_PORT:-$fp}"
      break
    fi
    p=$((p+2))
  done
fi

if [ -z "$FRONT_DOMAIN" ]; then
  FRONT_DOMAIN=$(hostname -I 2>/dev/null | awk '{print $1}')
  [ -z "$FRONT_DOMAIN" ] && FRONT_DOMAIN="localhost"
fi

cd "$FRONT_DIR"
npm ci || npm install
npm run build

cd "$BACK_DIR"
npm ci || npm install
npm run build

if [ -f "$BACK_DIR/.env" ]; then
  set -a
  source "$BACK_DIR/.env"
  set +a
fi

FRONT_ORIGIN="http://$FRONT_DOMAIN:$FRONT_PORT"

BACK_NAME="ai-chat-backend-$BACK_PORT"
FRONT_NAME="ai-chat-frontend-$FRONT_PORT"

PORT="$BACK_PORT" CORS_ORIGIN="$FRONT_ORIGIN" pm2 start "$BACK_DIR/dist/server.js" --name "$BACK_NAME" --update-env || pm2 restart "$BACK_NAME" --update-env
pm2 serve "$FRONT_DIR/dist" "$FRONT_PORT" --spa --name "$FRONT_NAME" || pm2 restart "$FRONT_NAME"
pm2 save

echo "BACK_URL=http://$FRONT_DOMAIN:$BACK_PORT"
echo "FRONT_URL=http://$FRONT_DOMAIN:$FRONT_PORT"
echo "PM2_BACK=$BACK_NAME"
echo "PM2_FRONT=$FRONT_NAME"