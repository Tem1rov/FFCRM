# ==========================================
# Переменные для REG.RU Cloud
# ==========================================

# --- Аутентификация REG.RU Cloud ---
variable "auth_url" {
  description = "URL для аутентификации OpenStack (REG.RU Cloud)"
  type        = string
  default     = "https://api.cloudvps.reg.ru/v3"
}

variable "region" {
  description = "Регион REG.RU Cloud"
  type        = string
  default     = "ru-msk"
}

variable "user_name" {
  description = "Имя пользователя REG.RU Cloud"
  type        = string
  sensitive   = true
}

variable "password" {
  description = "Пароль REG.RU Cloud"
  type        = string
  sensitive   = true
}

variable "tenant_name" {
  description = "Имя проекта (tenant) в REG.RU Cloud"
  type        = string
}

# --- Параметры сервера ---
variable "server_name" {
  description = "Имя сервера"
  type        = string
  default     = "fulfillment-crm"
}

variable "flavor_name" {
  description = "Тип сервера (flavor)"
  type        = string
  default     = "Standard-2-4-50"  # 2 vCPU, 4 GB RAM, 50 GB SSD
}

variable "image_name" {
  description = "Образ ОС"
  type        = string
  default     = "Ubuntu 22.04 LTS"
}

variable "network_name" {
  description = "Имя сети"
  type        = string
  default     = "external-network"
}

variable "key_pair_name" {
  description = "Имя SSH ключа"
  type        = string
  default     = "crm-key"
}

variable "ssh_public_key" {
  description = "Публичный SSH ключ"
  type        = string
}

# --- Параметры приложения ---
variable "domain" {
  description = "Доменное имя для приложения"
  type        = string
  default     = ""
}

variable "db_password" {
  description = "Пароль базы данных PostgreSQL"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Секретный ключ для JWT токенов (минимум 32 символа)"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Email для Let's Encrypt сертификата"
  type        = string
  default     = ""
}

# --- Репозиторий ---
variable "git_repo_url" {
  description = "URL Git репозитория с приложением"
  type        = string
  default     = ""
}

variable "git_branch" {
  description = "Ветка Git для деплоя"
  type        = string
  default     = "main"
}
