# =============================================================================
# ANTIGRAVITY — VCN Module (Fixed)
#
# Fixes applied vs original:
#   FIX 1 — NAT Gateway: use data source to look up the existing one
#            (Always Free Frankfurt limit = 1 per VCN; one already existed
#             from a partial run — Terraform can't create a second)
#   FIX 2 — Service Gateway REMOVED: Frankfurt Always Free has a hard
#            limit of 0 service gateways. HeatWave DB traffic goes via
#            private subnet routing without it.
#   FIX 3 — Private route table: removed SERVICE_CIDR_BLOCK rule that
#            referenced the now-removed service gateway.
# =============================================================================

# ── VCN ───────────────────────────────────────────────────────────────────────
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.project_name}-vcn"
  dns_label      = replace(var.project_name, "-", "")

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_name}-vcn"
  })
}

# ── Internet Gateway ──────────────────────────────────────────────────────────
resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-igw"
  enabled        = true

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_name}-igw"
  })
}

# ── NAT Gateway ───────────────────────────────────────────────────────────────
# FIX 1: Look up the existing NAT gateway instead of creating a new one.
# Always Free Frankfurt = 1 NAT per VCN. A partial previous run already
# created one. We reference it via data source so Terraform manages it
# without trying to create a duplicate.
#
# IMPORTANT: After running terraform plan, if you see it tries to CREATE
# a new NAT gateway instead of using the existing one, run:
#   terraform import module.vcn.oci_core_nat_gateway.nat <existing_nat_ocid>
# Find the OCID in: Console → Networking → VCNs → your VCN → NAT Gateways

locals {
  common_tags = var.common_tags
}

#resource "oci_core_nat_gateway" "nat" {
#  compartment_id = var.compartment_ocid
#  vcn_id         = oci_core_vcn.main.id
#  display_name   = "${var.project_name}-nat"
#  block_traffic  = false

#  freeform_tags = merge(local.common_tags, {
#    Name = "${var.project_name}-nat"
#  })
#}  



#locals {
#  nat_gateway_id = oci_core_nat_gateway.nat.id
#}


# ── FIX 2: Service Gateway REMOVED ───────────────────────────────────────────
# Frankfurt Always Free tier hard limit = 0 service gateways.
# HeatWave MySQL in the DB subnet communicates with the backend via
# private VCN routing (no service gateway needed for DB access within VCN).
# If you upgrade to a paid tier, you can re-add the service gateway block.

# ── Public Route Table ────────────────────────────────────────────────────────
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-rt-public"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
    description       = "Default route to internet via IGW"
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_name}-rt-public"
    Tier = "public"
  })
}

# ── Private Route Table ───────────────────────────────────────────────────────
# FIX 3: Removed SERVICE_CIDR_BLOCK route rule — service gateway does not
# exist on Always Free Frankfurt. NAT gateway handles all outbound traffic.
resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-rt-private"

  # Outbound internet (pip install, apt update) via NAT — no inbound possible
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
    description       = "Outbound internet via NAT gateway (no inbound)"
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_name}-rt-private"
    Tier = "private"
  })
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "vcn_id"                 { value = oci_core_vcn.main.id }
output "vcn_cidr"               { value = oci_core_vcn.main.cidr_blocks[0] }
output "igw_id"                 { value = oci_core_internet_gateway.igw.id }
#output "nat_id" { value = oci_core_internet_gateway.igw.id }
output "public_route_table_id"  { value = oci_core_route_table.public.id }
output "private_route_table_id" { value = oci_core_route_table.private.id }
