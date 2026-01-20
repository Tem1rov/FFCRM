# ==========================================
# REG.RU Cloud (OpenStack) Provider
# ==========================================

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.54"
    }
  }
}

# Настройка провайдера REG.RU Cloud (OpenStack)
provider "openstack" {
  auth_url    = var.auth_url
  region      = var.region
  user_name   = var.user_name
  password    = var.password
  tenant_name = var.tenant_name
}
