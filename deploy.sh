#!/bin/bash
set -e

ORACLE_HOST="143.47.63.169"
ORACLE_USER="ubuntu"
REMOTE_BACKEND="/home/ubuntu/PROYECTOS/trading"
REMOTE_FRONTEND="/var/www/projects/trading"

echo "==> [1/5] Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

echo "==> [2/5] Uploading frontend..."
ssh "$ORACLE_USER@$ORACLE_HOST" "mkdir -p $REMOTE_FRONTEND"
scp -r frontend/dist/* "$ORACLE_USER@$ORACLE_HOST:$REMOTE_FRONTEND/"

echo "==> [3/5] Uploading backend..."
ssh "$ORACLE_USER@$ORACLE_HOST" "mkdir -p $REMOTE_BACKEND"
scp docker-compose.yml "$ORACLE_USER@$ORACLE_HOST:$REMOTE_BACKEND/"
tar -czf /tmp/trading-backend.tar.gz --exclude='backend/node_modules' --exclude='backend/.env' backend/
scp /tmp/trading-backend.tar.gz "$ORACLE_USER@$ORACLE_HOST:$REMOTE_BACKEND/"
ssh "$ORACLE_USER@$ORACLE_HOST" "cd $REMOTE_BACKEND && tar -xzf trading-backend.tar.gz && rm trading-backend.tar.gz"
rm /tmp/trading-backend.tar.gz

echo "==> [4/5] Uploading .env..."
scp .env "$ORACLE_USER@$ORACLE_HOST:$REMOTE_BACKEND/.env"

echo "==> [5/5] Starting Docker on Oracle..."
ssh "$ORACLE_USER@$ORACLE_HOST" "
  cd $REMOTE_BACKEND
  cp .env backend/.env
  docker compose down --remove-orphans
  docker compose build --no-cache backend
  docker compose up -d
  sleep 5
  docker compose ps
"

echo ""
echo "✓ Deploy completado: http://$ORACLE_HOST/trading/"
