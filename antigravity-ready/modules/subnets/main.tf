# =============================================================================
# ANTIGRAVITY — Subnets Module
#
# Creates three subnets with different access levels:
#
#   PUBLIC SUBNET  (10.0.1.0/24)
#     • Frontend compute instance (Nginx + React)
#     • Has public IP addresses
#     • Route: → Internet Gateway
#     • Accessible from internet on ports 80, 443
#
#   PRIVATE SUBNET  (10.0.2.0/24)
#     • Backend compute instance (FastAPI)
#     • No public IP — only reachable from within VCN
#     • Route: → NAT Gateway (outbound only) + Service Gateway
#     • Accessible on port 8000 from public subnet only
#
#   DB SUBNET  (10.0.3.0/24)
#     • HeatWave MySQL managed service endpoint
#     • Fully isolated — no internet access at all
#     • Route: → Service Gateway only
#     • Accessible on port 3306 from private subnet only
# =============================================================================

# ── Public Subnet ─────────────────────────────────────────────────────────────
resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = var.vcn_id
  cidr_block                 = var.public_subnet_cidr
  display_name               = "${var.project_name}-subnet-public"
  dns_label                  = "public"

  # Public subnet: instances CAN have public IPs
  prohibit_public_ip_on_vnic = false

  # Attach route table and security list
  route_table_id    = var.public_route_table_id
  security_list_ids = [var.public_security_list_id]

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-subnet-public"
    Tier = "public"
    Use  = "frontend, load-balancer"
  })
}

# ── Private Subnet ────────────────────────────────────────────────────────────
resource "oci_core_subnet" "private" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = var.vcn_id
  cidr_block                 = var.private_subnet_cidr
  display_name               = "${var.project_name}-subnet-private"
  dns_label                  = "private"

  # Private subnet: instances must NOT have public IPs
  prohibit_public_ip_on_vnic = true

  route_table_id    = var.private_route_table_id
  security_list_ids = [var.private_security_list_id]

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-subnet-private"
    Tier = "private"
    Use  = "backend-api"
  })
}

# ── DB Subnet ─────────────────────────────────────────────────────────────────
resource "oci_core_subnet" "db" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = var.vcn_id
  cidr_block                 = var.db_subnet_cidr
  display_name               = "${var.project_name}-subnet-db"
  dns_label                  = "db"

  # DB subnet: fully isolated, no public IPs ever
  prohibit_public_ip_on_vnic = true

  # DB uses private route table but only Service Gateway matters
  route_table_id    = var.private_route_table_id
  security_list_ids = [var.db_security_list_id]

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-subnet-db"
    Tier = "database"
    Use  = "heatwave-mysql"
  })
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "public_subnet_id"  { value = oci_core_subnet.public.id }
output "private_subnet_id" { value = oci_core_subnet.private.id }
output "db_subnet_id"      { value = oci_core_subnet.db.id }

output "public_subnet_cidr"  { value = oci_core_subnet.public.cidr_block }
output "private_subnet_cidr" { value = oci_core_subnet.private.cidr_block }
output "db_subnet_cidr"      { value = oci_core_subnet.db.cidr_block }
