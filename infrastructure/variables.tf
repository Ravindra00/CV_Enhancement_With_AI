variable "tenancy_ocid" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "private_key_path" {}
variable "region" {}
variable "compartment_ocid" {}
variable "my_ip" {
  description = "Your public IP for SSH access (e.g. 88.209.32.72)"
}
variable "ssh_public_key" {
  description = "SSH public key content"
}
variable "db_admin_password" {
  description = "Admin password for HeatWave MySQL"
  sensitive   = true
}
# Added to accommodate the copied terraform.tfvars silently ignoring the rest.
variable "db_admin_username" { default = "admin" }
variable "db_name" { default = "antigravity" }
variable "project_name" { default = "antigravity" }
variable "environment" { default = "production" }
variable "vcn_cidr" { default = "10.0.0.0/16" }
variable "public_subnet_cidr" { default = "10.0.1.0/24" }
variable "private_subnet_cidr" { default = "10.0.2.0/24" }
variable "db_subnet_cidr" { default = "10.0.3.0/24" }
variable "frontend_shape" { default = "VM.Standard.E2.1.Micro" }
variable "backend_shape" { default = "VM.Standard.E2.1.Micro" }
variable "instance_image_ocid" { default = "" }
