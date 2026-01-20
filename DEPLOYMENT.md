# 🚀 Инструкция по установке FulfillmentFinance CRM на хостинг

## Содержание
1. [Требования](#требования)
2. [Вариант 1: VPS с Docker (рекомендуется)](#вариант-1-vps-с-docker-рекомендуется)
3. [Вариант 2: VPS без Docker](#вариант-2-vps-без-docker)
4. [Вариант 3: Shared хостинг](#вариант-3-shared-хостинг)
5. [Настройка домена и SSL](#настройка-домена-и-ssl)
6. [Резервное копирование](#резервное-копирование)
7. [Мониторинг и логи](#мониторинг-и-логи)
8. [Часто задаваемые вопросы](#faq)

---

## Требования

### Минимальные требования к серверу
| Ресурс | Минимум | Рекомендуется |
|--------|---------|---------------|
| CPU | 1 ядро | 2+ ядра |
| RAM | 1 GB | 2+ GB |
| Диск | 10 GB SSD | 20+ GB SSD |
| ОС | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |

### Необходимое ПО
- Docker 20.10+ и Docker Compose 2.0+
- ИЛИ Node.js 18+ и PostgreSQL 14+
- Nginx (для reverse proxy)
- Git

---

## Вариант 1: VPS с Docker (рекомендуется)

### Шаг 1: Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите необходимые пакеты
apt install -y curl git nginx certbot python3-certbot-nginx
```

### Шаг 2: Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Добавьте пользователя в группу docker
usermod -aG docker $USER

# Установка Docker Compose
apt install -y docker-compose-plugin

# Проверка установки
docker --version
docker compose version
```

### Шаг 3: Клонирование проекта

```bash
# Создайте директорию для приложений
mkdir -p /var/www
cd /var/www

# Клонируйте репозиторий
git clone https://your-repository-url.git crm
cd crm
```

### Шаг 4: Настройка переменных окружения

```bash
# Скопируйте пример конфигурации
cp env.example .env

# Отредактируйте .env файл
nano .env
```

**Обязательно измените следующие значения:**

```env
# ========================================
# PRODUCTION CONFIGURATION
# ========================================

# Database (используйте надежный пароль!)
DB_USER=fulfillment
DB_PASSWORD=ВашНадёжныйПароль123!
DB_NAME=fulfillment_crm
POSTGRES_USER=fulfillment
POSTGRES_PASSWORD=ВашНадёжныйПароль123!
POSTGRES_DB=fulfillment_crm

# Prisma
DATABASE_URL=postgresql://fulfillment:ВашНадёжныйПароль123!@postgres:5432/fulfillment_crm?schema=public

# Backend
NODE_ENV=production
PORT=4000
JWT_SECRET=ваш_супер_секретный_ключ_минимум_32_символа_!@#$%
JWT_EXPIRES_IN=7d

# Frontend - укажите ваш домен
VITE_API_URL=https://your-domain.com/api
```

### Шаг 5: Запуск приложения

```bash
# Соберите и запустите контейнеры
docker compose up -d --build

# Проверьте статус
docker compose ps

# Просмотр логов
docker compose logs -f
```

### Шаг 6: Настройка Nginx

```bash
# Создайте конфигурацию Nginx
nano /etc/nginx/sites-available/crm
```

Вставьте следующую конфигурацию:

```nginx
# Редирект HTTP на HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL сертификаты (после получения от Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Безопасность
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API Backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы (кэширование)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Активируйте конфигурацию
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию
rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx
```

### Шаг 7: Получение SSL сертификата

```bash
# Получите сертификат Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com

# Настройте автообновление
certbot renew --dry-run
```

### Шаг 8: Настройка автозапуска

```bash
# Docker уже настроен на автозапуск
# Убедитесь, что контейнеры перезапускаются
docker compose down
docker compose up -d
```

### Шаг 9: Проверка работы

```bash
# Проверьте доступность
curl -I https://your-domain.com

# Проверьте API
curl https://your-domain.com/api/health
```

---

## Вариант 2: VPS без Docker

### Шаг 1: Установка Node.js

```bash
# Установка Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка
node --version
npm --version
```

### Шаг 2: Установка PostgreSQL

```bash
# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Запуск и автозапуск
systemctl start postgresql
systemctl enable postgresql

# Создание базы данных
sudo -u postgres psql << EOF
CREATE USER fulfillment WITH PASSWORD 'ВашПароль123!';
CREATE DATABASE fulfillment_crm OWNER fulfillment;
GRANT ALL PRIVILEGES ON DATABASE fulfillment_crm TO fulfillment;
EOF
```

### Шаг 3: Установка PM2 (менеджер процессов)

```bash
npm install -g pm2
```

### Шаг 4: Настройка Backend

```bash
cd /var/www/crm/backend

# Установка зависимостей
npm install

# Создание .env
cat > .env << EOF
DATABASE_URL=postgresql://fulfillment:ВашПароль123!@localhost:5432/fulfillment_crm?schema=public
NODE_ENV=production
PORT=4000
JWT_SECRET=ваш_секретный_ключ_минимум_32_символа
JWT_EXPIRES_IN=7d
EOF

# Миграция базы данных
npx prisma migrate deploy

# Заполнение начальными данными
npx prisma db seed

# Сборка проекта
npm run build
```

### Шаг 5: Настройка Frontend

```bash
cd /var/www/crm/frontend

# Установка зависимостей
npm install

# Создание .env
cat > .env << EOF
VITE_API_URL=https://your-domain.com/api
EOF

# Сборка проекта
npm run build
```

### Шаг 6: Запуск через PM2

```bash
# Создайте ecosystem файл
cat > /var/www/crm/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'crm-backend',
      cwd: '/var/www/crm/backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
EOF

# Запустите приложения
pm2 start ecosystem.config.js

# Настройте автозапуск
pm2 startup
pm2 save
```

### Шаг 7: Настройка Nginx для статики Frontend

```bash
nano /etc/nginx/sites-available/crm
```

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend - статические файлы
    root /var/www/crm/frontend/dist;
    index index.html;

    # API Backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Вариант 3: Shared хостинг

⚠️ **Важно:** Shared хостинг имеет ограничения и не рекомендуется для production.

Требования к хостингу:
- Node.js 18+
- PostgreSQL или MySQL
- SSH доступ
- Возможность запуска фоновых процессов

### Альтернатива: Облачные платформы

Рекомендуемые платформы:

| Платформа | Backend | Frontend | База данных |
|-----------|---------|----------|-------------|
| **Railway** | ✅ | ✅ | PostgreSQL |
| **Render** | ✅ | ✅ | PostgreSQL |
| **Vercel** | Edge Functions | ✅ | Внешняя |
| **DigitalOcean App Platform** | ✅ | ✅ | PostgreSQL |

### Пример: Развертывание на Railway

1. Создайте аккаунт на [railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Railway автоматически определит тип проекта
4. Добавьте PostgreSQL из маркетплейса
5. Настройте переменные окружения
6. Деплой произойдет автоматически

---

## Настройка домена и SSL

### Покупка и настройка домена

1. **Купите домен** у регистратора (Namecheap, GoDaddy, REG.RU и т.д.)

2. **Настройте DNS записи:**

```
Тип     Имя    Значение           TTL
A       @      IP_вашего_сервера  3600
A       www    IP_вашего_сервера  3600
```

3. **Дождитесь распространения DNS** (до 48 часов, обычно 15-30 минут)

4. **Проверьте DNS:**
```bash
nslookup your-domain.com
dig your-domain.com
```

### Получение SSL сертификата

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d your-domain.com -d www.your-domain.com

# Автообновление (добавляется автоматически, но проверьте)
systemctl status certbot.timer
```

---

## Резервное копирование

### Автоматическое резервное копирование базы данных

```bash
# Создайте скрипт бэкапа
cat > /var/www/crm/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Бэкап PostgreSQL (для Docker)
docker compose exec -T postgres pg_dump -U fulfillment fulfillment_crm > $BACKUP_DIR/db_$DATE.sql

# ИЛИ для локального PostgreSQL
# pg_dump -U fulfillment fulfillment_crm > $BACKUP_DIR/db_$DATE.sql

# Сжатие
gzip $BACKUP_DIR/db_$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: db_$DATE.sql.gz"
EOF

chmod +x /var/www/crm/backup.sh
```

```bash
# Добавьте в cron (ежедневно в 3:00)
crontab -e
```

```cron
0 3 * * * /var/www/crm/backup.sh >> /var/log/crm-backup.log 2>&1
```

### Восстановление из бэкапа

```bash
# Распакуйте бэкап
gunzip /var/backups/crm/db_20240120_030000.sql.gz

# Восстановите базу (Docker)
docker compose exec -T postgres psql -U fulfillment fulfillment_crm < /var/backups/crm/db_20240120_030000.sql

# ИЛИ для локального PostgreSQL
psql -U fulfillment fulfillment_crm < /var/backups/crm/db_20240120_030000.sql
```

---

## Мониторинг и логи

### Просмотр логов Docker

```bash
# Все логи
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только PostgreSQL
docker compose logs -f postgres

# Последние 100 строк
docker compose logs --tail=100
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

### Настройка мониторинга (опционально)

Рекомендуемые инструменты:
- **Uptime Kuma** — мониторинг доступности
- **Grafana + Prometheus** — метрики и дашборды
- **Sentry** — отслеживание ошибок

---

## FAQ

### Как обновить приложение?

```bash
cd /var/www/crm

# Получите последние изменения
git pull origin main

# Пересоберите контейнеры
docker compose down
docker compose up -d --build

# Примените миграции (если есть)
docker compose exec backend npx prisma migrate deploy
```

### Как изменить пароль администратора?

```bash
# Подключитесь к базе данных
docker compose exec postgres psql -U fulfillment fulfillment_crm

# Обновите пароль (замените 'новый_хэш' на bcrypt хэш)
UPDATE users SET password = 'новый_хэш' WHERE email = 'admin@fulfillment.local';
```

### Как очистить базу данных?

```bash
# Остановите приложение
docker compose down

# Удалите volume с данными
docker volume rm crm_postgres_data

# Запустите заново (создастся новая БД)
docker compose up -d
```

### Проблемы с памятью?

```bash
# Добавьте swap файл
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Как посмотреть ошибки?

```bash
# Логи Docker
docker compose logs -f --tail=200

# Логи Nginx
tail -f /var/log/nginx/error.log

# Логи системы
journalctl -u nginx -f
```

---

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker compose logs -f`
2. Убедитесь, что все переменные окружения настроены
3. Проверьте доступность портов: `netstat -tlpn`
4. Проверьте DNS: `nslookup your-domain.com`

---

**FulfillmentFinance CRM** — Успешного развертывания! 🚀
