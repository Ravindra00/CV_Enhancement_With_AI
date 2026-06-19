# =============================================================================
# ANTIGRAVITY — Terraform Variables
# Oracle Cloud Infrastructure (OCI)
# =============================================================================

# ── OCI Authentication ────────────────────────────────────────────────────────
variable "tenancy_ocid" {
  description = "OCID of your OCI tenancy. Found in: Profile → Tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of your OCI user. Found in: Profile → User Settings"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API key added to your OCI user"
  type        = string
}

variable "private_key_path" {
  description = "Local path to your OCI API private key (.pem file)"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI region to deploy into"
  type        = string
  default     = "eu-frankfurt-1"   # change to your region
}

variable "compartment_ocid" {
  description = "OCID of the compartment to deploy resources into"
  type        = string
}

# ── Project ───────────────────────────────────────────────────────────────────
variable "project_name" {
  description = "Project prefix applied to all resource names and tags"
  type        = string
  default     = "antigravity"
}

variable "environment" {
  description = "Deployment environment: production | staging"
  type        = string
  default     = "production"
}

# ── Networking ────────────────────────────────────────────────────────────────
variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"    # 65,536 IPs
}

variable "public_subnet_cidr" {
  description = "CIDR for public subnet (frontend, load balancer)"
  type        = string
  default     = "10.0.1.0/24"    # 256 IPs
}

variable "private_subnet_cidr" {
  description = "CIDR for private subnet (backend API)"
  type        = string
  default     = "10.0.2.0/24"    # 256 IPs
}

variable "db_subnet_cidr" {
  description = "CIDR for database subnet (HeatWave MySQL — isolated)"
  type        = string
  default     = "10.0.3.0/24"    # 256 IPs
}

# ── Compute ───────────────────────────────────────────────────────────────────
variable "ssh_public_key" {
  description = "SSH public key content (paste the full key string)"
  type        = string
  sensitive   = true
}

variable "frontend_shape" {
  description = "Compute shape for frontend VM"
  type        = string
  default     = "VM.Standard.E2.1.Micro"   # Always Free eligible
}

variable "backend_shape" {
  description = "Compute shape for backend VM"
  type        = string
  default     = "VM.Standard.E2.1.Micro"   # Always Free eligible
}

variable "instance_image_ocid" {
  description = "OCID of the Ubuntu 22.04 image in your region"
  type        = string
  # Find with: oci compute image list --operating-system "Canonical Ubuntu"
  # Or use the data source in compute module (auto-lookup is set up there)
  default     = ""   # leave blank to use auto-lookup
}

# ── HeatWave MySQL ────────────────────────────────────────────────────────────
variable "my_ip" {
  description = "Your public IP for SSH access — run: curl ifconfig.me"
  type        = string
}

variable "db_admin_username" {
  description = "Admin username for HeatWave MySQL"
  type        = string
  default     = "admin"
}

variable "db_admin_password" {
  description = "Admin password for HeatWave MySQL (min 8 chars, 1 upper, 1 number, 1 special)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "antigravity"
}
