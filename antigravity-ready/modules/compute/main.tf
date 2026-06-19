# =============================================================================
# ANTIGRAVITY — Compute Module
# Creates Always Free eligible compute instances
#   • Frontend VM — public subnet, public IP, Nginx
#   • Backend VM  — private subnet, no public IP, FastAPI
# =============================================================================

# ── Auto-lookup Ubuntu 22.04 image ───────────────────────────────────────────
data "oci_core_images" "ubuntu_22" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.frontend_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  # Use provided OCID or fall back to latest Ubuntu 22.04 in region
  image_id = var.instance_image_ocid != "" ? var.instance_image_ocid : data.oci_core_images.ubuntu_22.images[0].id
}

# ── Frontend Instance (Public Subnet) ────────────────────────────────────────
resource "oci_core_instance" "frontend" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  display_name        = "${var.project_name}-frontend"
  shape               = var.frontend_shape

  # Always Free shape config (E2.1.Micro = 1 OCPU, 1 GB RAM — fixed, no flex)
  # If using Ampere (ARM) Always Free shape, uncomment shape_config:
  # shape_config {
  #   ocpus         = 1
  #   memory_in_gbs = 6   # Ampere allows up to 24GB on free tier
  # }

  source_details {
    source_type             = "image"
    source_id               = local.image_id
    boot_volume_size_in_gbs = 50   # Always Free: up to 200GB total
  }

  create_vnic_details {
    subnet_id              = var.public_subnet_id
    assign_public_ip       = true        # Frontend needs public IP
    display_name           = "${var.project_name}-frontend-vnic"
    hostname_label         = "${var.project_name}-frontend"
    nsg_ids                = [var.frontend_nsg_id]
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key

    # Cloud-init: runs on first boot — installs base packages, creates swap
    user_data = base64encode(<<-CLOUDINIT
      #!/bin/bash
      # --- Antigravity Frontend: Cloud-init Bootstrap ---
      set -e

      # System update
      apt-get update -y
      apt-get upgrade -y
      apt-get install -y nginx curl git unzip build-essential \
        netfilter-persistent iptables-persistent

      # Swap (prevents OOM on 1GB VM)
      fallocate -l 2G /swapfile
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab

      # Firewall
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22  -j ACCEPT
      netfilter-persistent save

      # App directory
      mkdir -p /opt/app
      chown ubuntu:ubuntu /opt/app

      # Enable and start Nginx
      systemctl enable nginx
      systemctl start nginx

      # Signal completion
      echo "ANTIGRAVITY_FRONTEND_BOOTSTRAP_COMPLETE" > /tmp/bootstrap_done
      CLOUDINIT
    )
  }

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-frontend"
    Role = "frontend"
  })

  # Prevent accidental replacement
  lifecycle {
    ignore_changes = [metadata, source_details[0].source_id]
  }
}

# ── Backend Instance (Private Subnet) ────────────────────────────────────────
resource "oci_core_instance" "backend" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  display_name        = "${var.project_name}-backend"
  shape               = var.backend_shape

  source_details {
    source_type             = "image"
    source_id               = local.image_id
    boot_volume_size_in_gbs = 50
  }

  create_vnic_details {
    subnet_id        = var.public_subnet_id
    assign_public_ip = true      # Private subnet — no public IP
    display_name     = "${var.project_name}-backend-vnic"
    hostname_label   = "${var.project_name}-backend"
    nsg_ids          = [var.backend_nsg_id]
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key

    user_data = base64encode(<<-CLOUDINIT
      #!/bin/bash
      # --- Antigravity Backend: Cloud-init Bootstrap ---
      set -e

      # System update
      apt-get update -y
      apt-get upgrade -y
      apt-get install -y \
        python3.10 python3.10-venv python3-pip \
        git curl wget build-essential \
        libpq-dev python3-dev \
        mysql-client \
        netfilter-persistent iptables-persistent

      # Swap
      fallocate -l 2G /swapfile
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab

      # Firewall — port 8000 open to VCN only
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 \
        -s 10.0.0.0/16 -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22 -j ACCEPT
      netfilter-persistent save

      # Log directory for Gunicorn
      mkdir -p /var/log/antigravity
      chown ubuntu:ubuntu /var/log/antigravity

      # App directory
      mkdir -p /opt/app
      chown ubuntu:ubuntu /opt/app

      echo "ANTIGRAVITY_BACKEND_BOOTSTRAP_COMPLETE" > /tmp/bootstrap_done
      CLOUDINIT
    )
  }

  freeform_tags = merge(var.common_tags, {
    Name = "${var.project_name}-backend"
    Role = "backend"
  })

  lifecycle {
    ignore_changes = [metadata, source_details[0].source_id]
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "frontend_public_ip"   { value = oci_core_instance.frontend.public_ip }
output "frontend_private_ip"  { value = oci_core_instance.frontend.private_ip }
output "frontend_instance_id" { value = oci_core_instance.frontend.id }

output "backend_private_ip"   { value = oci_core_instance.backend.private_ip }
output "backend_instance_id"  { value = oci_core_instance.backend.id }

output "image_id_used" {
  value       = local.image_id
  description = "Ubuntu image OCID used for instances"
}
