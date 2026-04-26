#!/bin/bash
# Ejecutar UNA VEZ en Oracle para generar el certificado autofirmado
# ssh ubuntu@143.47.63.169 'bash -s' < setup-ssl.sh
set -e

ORACLE_HOST="143.47.63.169"
SSL_DIR="/etc/nginx/ssl"

echo "==> Generando certificado autofirmado..."
ssh "ubuntu@$ORACLE_HOST" "
  sudo mkdir -p $SSL_DIR
  sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout $SSL_DIR/trading.key \
    -out    $SSL_DIR/trading.crt \
    -subj '/C=ES/ST=Madrid/L=Madrid/O=TradingApp/CN=$ORACLE_HOST'
  sudo chmod 600 $SSL_DIR/trading.key
  echo 'Certificado generado en $SSL_DIR'
"

echo "==> Aplicando configuración nginx con HTTPS..."
scp nginx.conf "ubuntu@$ORACLE_HOST:/tmp/trading-nginx.conf"
ssh "ubuntu@$ORACLE_HOST" "
  # Fusiona el bloque trading con el archivo de proyectos existente
  # ATENCIÓN: edita manualmente /etc/nginx/sites-available/proyectos
  # para reemplazar los bloques /trading/ y /api/trading/ con el nuevo nginx.conf
  sudo nginx -t && sudo systemctl reload nginx
  echo 'Nginx recargado'
"

echo ""
echo "✓ HTTPS configurado: https://$ORACLE_HOST/trading/"
echo "  Nota: el navegador mostrará aviso de certificado autofirmado."
echo "  Para eliminar el aviso, añade un dominio y usa Let's Encrypt:"
echo "  sudo certbot --nginx -d tudominio.com"
