# ==========================================
# FulfillmentFinance CRM - REG.RU Cloud
# ==========================================

# --- SSH Ключ ---
resource "openstack_compute_keypair_v2" "crm_key" {
  name       = var.key_pair_name
  public_key = var.ssh_public_key
}

# --- Группа безопасности ---
resource "openstack_networking_secgroup_v2" "crm_security_group" {
  name        = "${var.server_name}-sg"
  description = "Security group for FulfillmentFinance CRM"
}

# SSH (порт 22)
resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.crm_security_group.id
}

# HTTP (порт 80)
resource "openstack_networking_secgroup_rule_v2" "http" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.crm_security_group.id
}

# HTTPS (порт 443)
resource "openstack_networking_secgroup_rule_v2" "https" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.crm_security_group.id
}

# Egress (исходящий трафик)
resource "openstack_networking_secgroup_rule_v2" "egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.crm_security_group.id
}

# --- Получение образа ОС ---
data "openstack_images_image_v2" "ubuntu" {
  name        = var.image_name
  most_recent = true
}

# --- Получение flavor (типа сервера) ---
data "openstack_compute_flavor_v2" "server_flavor" {
  name = var.flavor_name
}

# --- Получение сети ---
data "openstack_networking_network_v2" "external" {
  name = var.network_name
}

# --- Создание сервера ---
resource "openstack_compute_instance_v2" "crm_server" {
  name            = var.server_name
  image_id        = data.openstack_images_image_v2.ubuntu.id
  flavor_id       = data.openstack_compute_flavor_v2.server_flavor.id
  key_pair        = openstack_compute_keypair_v2.crm_key.name
  security_groups = [openstack_networking_secgroup_v2.crm_security_group.name]

  network {
    name = var.network_name
  }

  # Cloud-init скрипт для начальной настройки
  user_data = templatefile("${path.module}/scripts/cloud-init.yaml", {
    db_password  = var.db_password
    jwt_secret   = var.jwt_secret
    domain       = var.domain
    admin_email  = var.admin_email
    git_repo_url = var.git_repo_url
    git_branch   = var.git_branch
  })

  metadata = {
    application = "fulfillment-crm"
    managed_by  = "terraform"
  }

  tags = ["crm", "production"]
}

# --- Плавающий IP (публичный адрес) ---
resource "openstack_networking_floatingip_v2" "crm_ip" {
  pool = "external"
}

resource "openstack_compute_floatingip_associate_v2" "crm_ip_assoc" {
  floating_ip = openstack_networking_floatingip_v2.crm_ip.address
  instance_id = openstack_compute_instance_v2.crm_server.id
}
