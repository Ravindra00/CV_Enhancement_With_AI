# =============================================================================
# ANTIGRAVITY — Security Module
#
# Security Lists (subnet-level, stateful):
#   • public_sl   — frontend VM: HTTP/HTTPS from internet, SSH from your IP
#   • private_sl  — backend VM: API port from public subnet only, SSH from bastion
#   • db_sl       — DB subnet: MySQL from private subnet only, no SSH
#
# Network Security Groups (resource-level, more granular):
#   • frontend_nsg  — attached to frontend compute instance
#   • backend_nsg   — attached to backend compute instance
#
# Rule design:
#   Inbound  = explicitly allow only what is needed
#   Outbound = allow all (OCI stateful rules handle return traffic)
# =============================================================================

# ── LOCAL: YOUR IP ────────────────────────────────────────────────────────────
# SSH is locked to your IP only — change this to your actual IP
# Find your IP: curl ifconfig.me
locals {
  my_ip_cidr = "${var.my_ip}/32"
}

# =============================================================================
# SECURITY LIST: PUBLIC SUBNET (Frontend)
# =============================================================================
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.project_name}-sl-public"

  # ── INBOUND RULES ──────────────────────────────────────────────────────────

  # HTTP — allow all internet traffic (Nginx serves React app)
  ingress_security_rules {
    protocol    = "6"           # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "HTTP from internet"
    tcp_options {
      min = 80
      max = 80
    }
  }

  # HTTPS — allow all internet traffic (after SSL cert is added)
  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "HTTPS from internet"
    tcp_options {
      min = 443
      max = 443
    }
  }

  # SSH — LOCKED TO YOUR IP ONLY (never 0.0.0.0/0 in production)
  ingress_security_rules {
    protocol    = "6"
    source      = local.my_ip_cidr
    source_type = "CIDR_BLOCK"
    description = "SSH — your IP only"
    tcp_options {
      min = 22
      max = 22
    }
  }

  # ICMP — allow ping from anywhere (useful for diagnostics)
  ingress_security_rules {
    protocol    = "1"           # ICMP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "ICMP ping"
    icmp_options {
      type = 3
      code = 4
    }
  }

  # ── OUTBOUND RULES ─────────────────────────────────────────────────────────

  # Allow all outbound (return traffic, API calls to backend, apt/npm updates)
  egress_security_rules {
    protocol         = "all"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    description      = "All outbound traffic"
  }

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-sl-public"
    Tier = "public"
  })
}

# =============================================================================
# SECURITY LIST: PRIVATE SUBNET (Backend)
# =============================================================================
resource "oci_core_security_list" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.project_name}-sl-private"

  # ── INBOUND RULES ──────────────────────────────────────────────────────────

  # FastAPI port — ONLY from public subnet (Nginx proxy)
  ingress_security_rules {
    protocol    = "6"
    source      = var.public_subnet_cidr
    source_type = "CIDR_BLOCK"
    description = "FastAPI :8000 from public subnet (Nginx) only"
    tcp_options {
      min = 8000
      max = 8000
    }
  }

  # SSH — from your IP only
  ingress_security_rules {
    protocol    = "6"
    source      = local.my_ip_cidr
    source_type = "CIDR_BLOCK"
    description = "SSH — your IP only"
    tcp_options {
      min = 22
      max = 22
    }
  }

  # Internal VCN traffic (health checks, inter-service)
  ingress_security_rules {
    protocol    = "6"
    source      = var.vcn_cidr
    source_type = "CIDR_BLOCK"
    description = "Internal VCN traffic"
    tcp_options {
      min = 1
      max = 65535
    }
  }

  # ICMP within VCN
  ingress_security_rules {
    protocol    = "1"
    source      = var.vcn_cidr
    source_type = "CIDR_BLOCK"
    description = "ICMP within VCN"
    icmp_options {
      type = 3
      code = 4
    }
  }

  # ── OUTBOUND RULES ─────────────────────────────────────────────────────────

  # All outbound (NAT gateway handles internet; DB traffic stays in VCN)
  egress_security_rules {
    protocol         = "all"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    description      = "Outbound via NAT gateway"
  }

  # NOTE: SERVICE_CIDR_BLOCK rule removed — Frankfurt Always Free has
  # a service gateway limit of 0. All outbound via CIDR_BLOCK + NAT gateway.

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-sl-private"
    Tier = "private"
  })
}

# =============================================================================
# SECURITY LIST: DB SUBNET (HeatWave MySQL)
# =============================================================================
resource "oci_core_security_list" "db" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.project_name}-sl-db"

  # ── INBOUND RULES ──────────────────────────────────────────────────────────

  # MySQL port 3306 — ONLY from private subnet (backend VM)
  ingress_security_rules {
    protocol    = "6"
    source      = var.private_subnet_cidr
    source_type = "CIDR_BLOCK"
    description = "MySQL :3306 from backend (private subnet) only"
    tcp_options {
      min = 3306
      max = 3306
    }
  }

  # HeatWave port 33060 — MySQL X Protocol (for HeatWave cluster)
  ingress_security_rules {
    protocol    = "6"
    source      = var.private_subnet_cidr
    source_type = "CIDR_BLOCK"
    description = "MySQL X Protocol :33060 from backend only"
    tcp_options {
      min = 33060
      max = 33060
    }
  }

  # NO SSH to DB subnet — no compute instances here, managed service only
  # NO internet inbound — DB subnet is fully isolated

  # ── OUTBOUND RULES ─────────────────────────────────────────────────────────

  # Allow responses back to private subnet
  egress_security_rules {
    protocol         = "6"
    destination      = var.private_subnet_cidr
    destination_type = "CIDR_BLOCK"
    description      = "MySQL responses to backend"
    tcp_options {
      min = 1
      max = 65535
    }
  }

  # NOTE: SERVICE_CIDR_BLOCK rule removed — no service gateway on Always Free Frankfurt.
  # HeatWave managed DB backup/monitoring uses Oracle internal routing.

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-sl-db"
    Tier = "database"
  })
}

# =============================================================================
# NETWORK SECURITY GROUP: Frontend
# Attached directly to frontend compute instance (more granular than SL)
# =============================================================================
resource "oci_core_network_security_group" "frontend" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.project_name}-nsg-frontend"

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-nsg-frontend"
  })
}

# NSG Rule: HTTP inbound
resource "oci_core_network_security_group_security_rule" "frontend_http_in" {
  network_security_group_id = oci_core_network_security_group.frontend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  description               = "HTTP from internet"
  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

# NSG Rule: HTTPS inbound
resource "oci_core_network_security_group_security_rule" "frontend_https_in" {
  network_security_group_id = oci_core_network_security_group.frontend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  description               = "HTTPS from internet"
  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

# NSG Rule: SSH inbound (your IP only)
resource "oci_core_network_security_group_security_rule" "frontend_ssh_in" {
  network_security_group_id = oci_core_network_security_group.frontend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = local.my_ip_cidr
  source_type               = "CIDR_BLOCK"
  description               = "SSH — your IP only"
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# NSG Rule: All outbound
resource "oci_core_network_security_group_security_rule" "frontend_all_out" {
  network_security_group_id = oci_core_network_security_group.frontend.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  description               = "All outbound"
}

# =============================================================================
# NETWORK SECURITY GROUP: Backend
# =============================================================================
resource "oci_core_network_security_group" "backend" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.project_name}-nsg-backend"

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-nsg-backend"
  })
}

# NSG Rule: FastAPI from frontend NSG only (not from subnet CIDR — tighter)
resource "oci_core_network_security_group_security_rule" "backend_api_in" {
  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.frontend.id
  source_type               = "NETWORK_SECURITY_GROUP"
  description               = "FastAPI :8000 from frontend NSG only"
  tcp_options {
    destination_port_range {
      min = 8000
      max = 8000
    }
  }
}

# NSG Rule: SSH inbound (your IP only)
resource "oci_core_network_security_group_security_rule" "backend_ssh_in" {
  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = local.my_ip_cidr
  source_type               = "CIDR_BLOCK"
  description               = "SSH — your IP only"
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# NSG Rule: All outbound (pip, apt via NAT)
resource "oci_core_network_security_group_security_rule" "backend_all_out" {
  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  description               = "All outbound via NAT"
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "public_security_list_id"  { value = oci_core_security_list.public.id }
output "private_security_list_id" { value = oci_core_security_list.private.id }
output "db_security_list_id"      { value = oci_core_security_list.db.id }
output "frontend_nsg_id"          { value = oci_core_network_security_group.frontend.id }
output "backend_nsg_id"           { value = oci_core_network_security_group.backend.id }
