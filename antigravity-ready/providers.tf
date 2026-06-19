# =============================================================================
# ANTIGRAVITY — Terraform Provider & Backend
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }

  # ── Remote state (optional — comment out to use local state) ──────────────
  # Uncomment and configure after initial setup to store state in OCI bucket:
  #
  # backend "s3" {
  #   bucket                      = "antigravity-terraform-state"
  #   key                         = "production/terraform.tfstate"
  #   region                      = "eu-frankfurt-1"
  #   endpoint                    = "https://<namespace>.compat.objectstorage.<region>.oraclecloud.com"
  #   shared_credentials_file     = "~/.aws/credentials"
  #   skip_region_validation      = true
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   force_path_style            = true
  # }
}

# ── OCI Provider ──────────────────────────────────────────────────────────────
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# ── Availability Domains ──────────────────────────────────────────────────────
# Fetch available ADs in the region
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

locals {
  # Use first availability domain by default
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CreatedAt   = timestamp()
  }
}
