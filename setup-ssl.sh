#!/bin/bash
# Ejecutar UNA VEZ en Oracle para activar HTTPS en todos los proyectos
# bash setup-ssl.sh
set -e

ORACLE_HOST="143.47.63.169"
ORACLE_USER="ubuntu"
SSL_DIR="/etc/nginx/ssl"

echo "==> [1/3] Generando certificado autofirmado (10 años)..."
ssh "$ORACLE_USER@$ORACLE_HOST" "
  sudo mkdir -p $SSL_DIR
  sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout $SSL_DIR/trading.key \
    -out    $SSL_DIR/trading.crt \
    -subj '/C=ES/ST=Madrid/L=Madrid/O=Proyectos/CN=$ORACLE_HOST' 2>/dev/null
  sudo chmod 600 $SSL_DIR/trading.key
  echo 'Certificado OK'
"

echo "==> [2/3] Aplicando configuración nginx con HTTPS..."
ssh "$ORACLE_USER@$ORACLE_HOST" "sudo tee /etc/nginx/sites-available/proyectos > /dev/null << 'NGINXEOF'
# Redirige todo HTTP → HTTPS
server {
    listen 80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

# HTTPS — todos los proyectos
server {
    listen 443 ssl default_server;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/trading.crt;
    ssl_certificate_key /etc/nginx/ssl/trading.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security \"max-age=31536000\" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;

    # ERP3 - Frontend
    location /erp3/ {
        root /var/www/projects;
        try_files \$uri \$uri/ /erp3/index.html;
    }
    location /erp3/api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Formacion - Frontend
    location /formacion/ {
        root /var/www/projects;
        try_files \$uri \$uri/ /formacion/index.html;
    }
    location /formacion/api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
    }
    location /formacion/uploads/ {
        alias /home/ubuntu/back/uploads/;
    }

    # VoiceLab - Frontend
    location /voicelab/ {
        root /var/www/projects;
        try_files \$uri \$uri/ /voicelab/index.html;
    }
    location /voicelab/api/ {
        proxy_pass http://127.0.0.1:3006/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 50M;
        proxy_read_timeout 120s;
    }

    # SignBridge
    location /signbridge {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }

    # EcoLedger
    location /ecoledger {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }

    # Trading - Frontend
    location /trading/ {
        root /var/www/projects;
        try_files \$uri \$uri/ /trading/index.html;
    }
    location /api/trading/ {
        proxy_pass http://127.0.0.1:3007/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Cookie \$http_cookie;
    }

    # TSLA Trading Agent - Frontend
    location /tsla/ {
        root /var/www/projects;
        try_files \$uri \$uri/ /tsla/index.html;
    }
    location /tsla/api/ {
        proxy_pass http://127.0.0.1:3008/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
    location /tsla/ws/ {
        proxy_pass http://127.0.0.1:3008/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }
}
NGINXEOF
"

echo "==> [3/3] Validando y recargando nginx..."
ssh "$ORACLE_USER@$ORACLE_HOST" "
  sudo cp /etc/nginx/sites-available/proyectos /etc/nginx/sites-enabled/proyectos
  sudo nginx -t && sudo systemctl reload nginx
  echo 'Nginx recargado OK'
"

echo ""
echo "✓ HTTPS activo en todos los proyectos: https://$ORACLE_HOST/"
echo "  El navegador mostrará aviso de certificado autofirmado — es normal."
echo "  Para eliminarlo en el futuro: añade un dominio + certbot --nginx"
