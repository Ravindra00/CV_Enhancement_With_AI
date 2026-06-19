variable "compartment_ocid"    { type = string }
variable "vcn_id"              { type = string }
variable "vcn_cidr"            { type = string }
variable "project_name"        { type = string }
variable "public_subnet_cidr"  { type = string }
variable "private_subnet_cidr" { type = string }
variable "common_tags"         { type = map(string) }
variable "my_ip" {
  description = "Your public IP address for SSH access (run: curl ifconfig.me)"
  type        = string
}
