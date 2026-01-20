# 🚀 Terraform для REG.RU Cloud

Автоматическое развёртывание FulfillmentFinance CRM на REG.RU Cloud.

## 📋 Требования

1. **Аккаунт REG.RU Cloud** — https://cloud.reg.ru/
2. **Terraform** >= 1.0 — https://www.terraform.io/downloads
3. **SSH ключ** для доступа к серверу

## 🔧 Подготовка

### 1. Установите Terraform

**Windows (Chocolatey):**
```powershell
choco install terraform
```

**Windows (вручную):**
1. Скачайте: https://www.terraform.io/downloads
2. Распакуйте в `C:\terraform\`
3. Добавьте в PATH

**Linux/macOS:**
```bash
# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# macOS
brew install terraform
```

### 2. Получите данные REG.RU Cloud

1. Войдите в [REG.RU Cloud](https://cloud.reg.ru/)
2. Перейдите в **Настройки проекта**
3. Скопируйте:
   - `user_name` — ваш email
   - `tenant_name` — ID проекта (tenant)
   - `password` — пароль от аккаунта

### 3. Сгенерируйте SSH ключ

```bash
ssh-keygen -t ed25519 -C "crm-server" -f ~/.ssh/crm_key
```

Скопируйте публичный ключ:
```bash
cat ~/.ssh/crm_key.pub
```

### 4. Настройте переменные

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Отредактируйте `terraform.tfvars`:

```hcl
# Аутентификация
user_name   = "your-email@example.com"
password    = "your-password"
tenant_name = "your-tenant-id"

# SSH ключ
ssh_public_key = "ssh-ed25519 AAAA..."

# Приложение
domain      = "crm.yourdomain.com"  # или оставьте пустым
db_password = "SecurePassword123!"
jwt_secret  = "your-32-char-minimum-secret-key!"

# Git репозиторий
git_repo_url = "https://github.com/your/repo.git"
```

## 🚀 Развёртывание

### Шаг 1: Инициализация

```bash
terraform init
```

### Шаг 2: Проверка плана

```bash
terraform plan
```

### Шаг 3: Применение

```bash
terraform apply
```

Введите `yes` для подтверждения.

### Шаг 4: Получение данных

После завершения вы увидите:

```
Outputs:

public_ip = "123.45.67.89"
ssh_connection = "ssh root@123.45.67.89"
app_url = "https://crm.yourdomain.com"
dns_instructions = "Добавьте A-запись: crm.yourdomain.com -> 123.45.67.89"
```

## 🔐 Настройка DNS

Если вы указали домен, добавьте DNS записи:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | crm | 123.45.67.89 |
| A | www.crm | 123.45.67.89 |

## 📝 Полезные команды

```bash
# Просмотр текущего состояния
terraform show

# Просмотр выходных данных
terraform output

# Обновление инфраструктуры
terraform apply

# Уничтожение инфраструктуры
terraform destroy
```

## 🔄 Обновление приложения

SSH на сервер:
```bash
ssh root@$(terraform output -raw public_ip)
```

На сервере:
```bash
cd /var/www/crm
git pull
docker compose down
docker compose up -d --build
```

## ⚠️ Устранение проблем

### Проверка логов установки
```bash
ssh root@IP
cat /var/log/crm-setup.log
```

### Проверка Docker
```bash
ssh root@IP
cd /var/www/crm
docker compose logs -f
```

### Перезапуск приложения
```bash
ssh root@IP
cd /var/www/crm
docker compose restart
```

## 💾 Резервное копирование

### Бэкап базы данных
```bash
ssh root@IP
cd /var/www/crm
docker compose exec postgres pg_dump -U fulfillment fulfillment_crm > backup.sql
```

### Восстановление
```bash
docker compose exec -T postgres psql -U fulfillment fulfillment_crm < backup.sql
```

## 🗑️ Удаление

Для полного удаления инфраструктуры:

```bash
terraform destroy
```

⚠️ **Внимание:** Это удалит сервер и все данные!

## 📁 Структура файлов

```
terraform/
├── main.tf                    # Основные ресурсы
├── variables.tf               # Переменные
├── outputs.tf                 # Выходные данные
├── provider.tf                # Настройка провайдера
├── terraform.tfvars.example   # Пример переменных
├── scripts/
│   └── cloud-init.yaml        # Скрипт инициализации
└── README.md                  # Эта документация
```

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи: `/var/log/crm-setup.log`
2. Проверьте статус Docker: `docker compose ps`
3. Проверьте переменные окружения: `cat /var/www/crm/.env`
