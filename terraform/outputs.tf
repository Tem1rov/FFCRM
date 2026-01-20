# ==========================================
# Выходные данные
# ==========================================

output "server_id" {
  description = "ID созданного сервера"
  value       = openstack_compute_instance_v2.crm_server.id
}

output "server_name" {
  description = "Имя сервера"
  value       = openstack_compute_instance_v2.crm_server.name
}

output "public_ip" {
  description = "Публичный IP адрес сервера"
  value       = openstack_networking_floatingip_v2.crm_ip.address
}

output "private_ip" {
  description = "Приватный IP адрес сервера"
  value       = openstack_compute_instance_v2.crm_server.access_ip_v4
}

output "ssh_connection" {
  description = "Команда для SSH подключения"
  value       = "ssh root@${openstack_networking_floatingip_v2.crm_ip.address}"
}

output "app_url" {
  description = "URL приложения"
  value       = var.domain != "" ? "https://${var.domain}" : "http://${openstack_networking_floatingip_v2.crm_ip.address}"
}

output "api_url" {
  description = "URL API"
  value       = var.domain != "" ? "https://${var.domain}/api" : "http://${openstack_networking_floatingip_v2.crm_ip.address}:4000/api"
}

output "dns_instructions" {
  description = "Инструкции по настройке DNS"
  value       = var.domain != "" ? "Добавьте A-запись: ${var.domain} -> ${openstack_networking_floatingip_v2.crm_ip.address}" : "Домен не указан"
}
