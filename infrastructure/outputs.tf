output "frontend_public_ip" {
  description = "Public IP of the Frontend Server"
  value       = oci_core_instance.web_server.public_ip
}

output "frontend_private_ip" {
  description = "Private IP of the Frontend Server"
  value       = oci_core_instance.web_server.private_ip
}

output "backend_public_ip" {
  description = "Public IP of the Backend Server"
  value       = oci_core_instance.app_server.public_ip
}

output "backend_private_ip" {
  description = "Private IP of the Backend Server"
  value       = oci_core_instance.app_server.private_ip
}


