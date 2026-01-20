#!/bin/bash
# ==========================================
# FulfillmentFinance CRM - Скрипт установки на VPS
# ==========================================
# Запуск: curl -sSL https://raw.githubusercontent.com/Tem1rov/FFCRM/main/deploy-vps.sh | bash

set -e

echo "=========================================="
echo " FulfillmentFinance CRM - Installation"
echo "=========================================="

# Переменные (измените при необходимости)
DB_PASSWORD="${DB_PASSWORD:-FulfillmentCRM2024!}"
JWT_SECRET="${JWT_SECRET:-super_secret_jwt_key_for_production_2024}"
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-admin@example.com}"

# 1. Обновление системы
echo ">>> Updating system..."
apt update && apt upgrade -y

# 2. Установка Docker
echo ">>> Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
fi

# 3. Установка Docker Compose
echo ">>> Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 4. Установка Git
echo ">>> Installing Git..."
apt install -y git

# 5. Клонирование репозитория
echo ">>> Cloning repository..."
cd /opt
if [ -d "FFCRM" ]; then
    cd FFCRM && git pull
else
    git clone https://github.com/Tem1rov/FFCRM.git
    cd FFCRM
fi

# 6. Создание .env файла
echo ">>> Creating .env file..."
cat > .env << EOF
# Database
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/crm?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=crm

# Backend
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000

# Frontend
VITE_API_URL=http://localhost:4000/api
EOF

# 7. Запуск Docker Compose
echo ">>> Starting Docker containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose up -d --build

# 8. Ожидание запуска
echo ">>> Waiting for services to start..."
sleep 30

# 9. Применение миграций
echo ">>> Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || true
docker-compose exec -T backend npx prisma db seed || true

# 10. Установка Nginx (если указан домен)
if [ -n "$DOMAIN" ]; then
    echo ">>> Installing Nginx..."
    apt install -y nginx certbot python3-certbot-nginx
    
    # Конфигурация Nginx
    cat > /etc/nginx/sites-available/crm << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    
    # SSL сертификат
    if [ -n "$EMAIL" ]; then
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL
    fi
fi

# 11. Показать статус
echo ""
echo "=========================================="
echo " Installation Complete!"
echo "=========================================="
echo ""
docker-compose ps
echo ""

# Получение IP
IP=$(curl -s ifconfig.me)
echo "Your CRM is available at:"
if [ -n "$DOMAIN" ]; then
    echo "  https://$DOMAIN"
else
    echo "  http://$IP:3000 (Frontend)"
    echo "  http://$IP:4000 (Backend API)"
fi
echo ""
echo "Default login:"
echo "  Email: admin@fulfillment.local"
echo "  Password: admin123"
echo ""
echo "=========================================="
