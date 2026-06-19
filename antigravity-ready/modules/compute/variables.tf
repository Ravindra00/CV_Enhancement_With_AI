variable "compartment_ocid"      { type = string }
variable "availability_domain"   { type = string }
variable "project_name"          { type = string }
variable "public_subnet_id"      { type = string }
variable "private_subnet_id"     { type = string }
variable "frontend_nsg_id"       { type = string }
variable "backend_nsg_id"        { type = string }
variable "ssh_public_key" {
  type      = string
  sensitive = true
}
variable "frontend_shape"        { type = string }
variable "backend_shape"         { type = string }
variable "instance_image_ocid"   { type = string }
variable "common_tags"           { type = map(string) }
