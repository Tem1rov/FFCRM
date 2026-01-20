# FulfillmentFinance CRM

Полнофункциональная CRM-система для учета фулфилмент-услуг с финансовым контролем, управлением поставщиками, аналитикой и отчетностью.

![FulfillmentFinance](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Функциональность

### Основные модули
- **Дашборд** — Ключевые показатели (KPI), графики выручки и прибыли, структура расходов
- **Поставщики** — CRUD управление поставщиками и их услугами, история изменения цен
- **Клиенты** — База клиентов с аналитикой по заказам
- **Заказы** — Создание заказов с автоматическим расчетом себестоимости, детализация P&L
- **Финансы** — Бухгалтерский учет с двойной записью, проводки
- **Отчеты** — Экспорт в Excel/CSV

### Ключевые возможности
- ✅ Автоматический расчет себестоимости заказа на основе услуг поставщиков
- ✅ P&L детализация для каждого заказа
- ✅ Юнит-экономика (прибыль на единицу товара)
- ✅ Двойная бухгалтерская запись
- ✅ Ролевой доступ (Админ, Менеджер, Аналитик)
- ✅ Импорт прайс-листов из Excel/CSV
- ✅ Экспорт отчетов

## 🛠 Технологии

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Chart.js
- Zustand (state management)

### Инфраструктура
- Docker & Docker Compose
- Nginx (reverse proxy)

## 🚀 Быстрый старт

### Требования
- Docker & Docker Compose
- Git

### Развертывание

1. **Клонирование репозитория**
```bash
git clone <repository-url>
cd CRM
```

2. **Настройка переменных окружения**
```bash
cp env.example .env
# Отредактируйте .env файл
```

3. **Запуск через Docker Compose**
```bash
docker-compose up -d
```

4. **Приложение доступно**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Тестовые учетные записи

| Email | Пароль | Роль |
|-------|--------|------|
| admin@fulfillment.local | admin123 | Администратор |
| manager@fulfillment.local | manager123 | Менеджер |
| analyst@fulfillment.local | analyst123 | Аналитик |

## 📁 Структура проекта

```
CRM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Схема БД
│   │   └── seed.ts          # Начальные данные
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, error handling
│   │   └── index.ts         # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI компоненты
│   │   ├── pages/           # Страницы
│   │   ├── lib/             # API клиент
│   │   └── store/           # Zustand store
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔧 Разработка

### Вариант 1: Локальный запуск с SQLite (без Docker)

Идеально для быстрой разработки без установки PostgreSQL.

**1. Переключите схему на SQLite:**
```bash
cd backend
copy prisma\schema.sqlite.prisma prisma\schema.prisma
```

**2. Установите зависимости и запустите:**
```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev

# Frontend (в новом терминале)
cd frontend
npm install
npm run dev
```

**3. Откройте:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Вариант 2: Локальный запуск с PostgreSQL (Docker для БД)

**1. Запустите только PostgreSQL:**
```bash
docker compose up -d postgres
```

**2. Настройте DATABASE_URL для localhost:**
```bash
# В .env измените postgres на localhost:
DATABASE_URL=postgresql://fulfillment:fulfillment_secret_change_me@localhost:5432/fulfillment_crm?schema=public
```

**3. Запустите миграции и приложение:**
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev

cd frontend
npm install
npm run dev
```

### Вариант 3: Полный запуск через Docker Compose

```bash
docker compose up -d
```

Все сервисы будут запущены автоматически.

### API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/auth/login | Авторизация |
| GET | /api/auth/me | Текущий пользователь |
| GET/POST | /api/vendors | Поставщики |
| GET/POST | /api/vendor-services | Услуги |
| GET/POST | /api/clients | Клиенты |
| GET/POST | /api/orders | Заказы |
| GET | /api/dashboard/kpi | KPI метрики |
| GET | /api/reports/orders | Отчет по заказам |

## 📊 Схема базы данных

### Основные сущности
- **Users** — Пользователи с ролями
- **Vendors** — Поставщики услуг
- **VendorServices** — Услуги с ценами
- **Clients** — Клиенты
- **Orders** — Заказы
- **OrderItems** — Товары в заказе
- **CostOperations** — Расходные операции
- **IncomeOperations** — Приходные операции
- **Accounts** — Бухгалтерские счета
- **FinTransactions** — Проводки

## 🔐 Роли и права

| Функция | Админ | Менеджер | Аналитик |
|---------|-------|----------|----------|
| Дашборд | ✅ | ✅ | ✅ |
| Управление заказами | ✅ | ✅ | 👁 |
| Управление клиентами | ✅ | ✅ | 👁 |
| Управление поставщиками | ✅ | ✅ | 👁 |
| Финансы | ✅ | — | ✅ |
| Отчеты | ✅ | ✅ | ✅ |
| Пользователи | ✅ | — | — |

## 🌐 Деплой на VPS

1. Установите Docker и Docker Compose на сервере
2. Скопируйте проект на сервер
3. Настройте `.env` файл с продакшн значениями
4. Запустите `docker-compose up -d`
5. Настройте Nginx/Apache как reverse proxy (опционально)
6. Настройте SSL сертификат (Let's Encrypt)

### Пример Nginx конфигурации

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| DB_USER | Пользователь БД | fulfillment |
| DB_PASSWORD | Пароль БД | fulfillment_secret |
| DB_NAME | Имя БД | fulfillment_crm |
| JWT_SECRET | Секрет для JWT токенов | — |
| JWT_EXPIRES_IN | Срок жизни токена | 7d |
| VITE_API_URL | URL API для frontend | /api |

## 🤝 Лицензия

MIT License

---

**FulfillmentFinance CRM** — Разработано для эффективного управления фулфилмент-операциями.
