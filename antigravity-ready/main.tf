# =============================================================================
# ANTIGRAVITY — Root Main
# Wires VCN → Security → Subnets → Compute in the correct dependency order
# =============================================================================

# ── Module: VCN ───────────────────────────────────────────────────────────────
module "vcn" {
  source = "./modules/vcn"

  compartment_ocid = var.compartment_ocid
  project_name     = var.project_name
  environment      = var.environment
  vcn_cidr         = var.vcn_cidr
  common_tags      = local.common_tags
}

# ── Module: Security ──────────────────────────────────────────────────────────
# Depends on VCN (needs vcn_id)
module "security" {
  source = "./modules/security"

  compartment_ocid    = var.compartment_ocid
  vcn_id              = module.vcn.vcn_id
  vcn_cidr            = var.vcn_cidr
  project_name        = var.project_name
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
  my_ip               = var.my_ip
  common_tags         = local.common_tags
}

# ── Module: Subnets ───────────────────────────────────────────────────────────
# Depends on VCN + Security (needs route tables + security lists)
module "subnets" {
  source = "./modules/subnets"

  compartment_ocid         = var.compartment_ocid
  vcn_id                   = module.vcn.vcn_id
  project_name             = var.project_name
  public_subnet_cidr       = var.public_subnet_cidr
  private_subnet_cidr      = var.private_subnet_cidr
  db_subnet_cidr           = var.db_subnet_cidr
  public_route_table_id    = module.vcn.public_route_table_id
  private_route_table_id   = module.vcn.private_route_table_id
  public_security_list_id  = module.security.public_security_list_id
  private_security_list_id = module.security.private_security_list_id
  db_security_list_id      = module.security.db_security_list_id
  common_tags              = local.common_tags
}

# ── Module: Compute ───────────────────────────────────────────────────────────
# Depends on Subnets + Security NSGs
module "compute" {
  source = "./modules/compute"

  compartment_ocid    = var.compartment_ocid
  availability_domain = local.availability_domain
  project_name        = var.project_name
  public_subnet_id    = module.subnets.public_subnet_id
  private_subnet_id   = module.subnets.private_subnet_id
  frontend_nsg_id     = module.security.frontend_nsg_id
  backend_nsg_id      = module.security.backend_nsg_id
  ssh_public_key      = var.ssh_public_key
  frontend_shape      = var.frontend_shape
  backend_shape       = var.backend_shape
  instance_image_ocid = var.instance_image_ocid
  common_tags         = local.common_tags
}
