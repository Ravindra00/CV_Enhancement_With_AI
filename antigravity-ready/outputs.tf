# =============================================================================
# ANTIGRAVITY — Terraform Outputs
# These print after `terraform apply` completes
# =============================================================================

# ── Network ───────────────────────────────────────────────────────────────────
output "vcn_id" {
  description = "VCN OCID"
  value       = module.vcn.vcn_id
}

output "vcn_cidr" {
  description = "VCN CIDR block"
  value       = module.vcn.vcn_cidr
}

output "public_subnet_id" {
  description = "Public subnet OCID (frontend)"
  value       = module.subnets.public_subnet_id
}

output "private_subnet_id" {
  description = "Private subnet OCID (backend)"
  value       = module.subnets.private_subnet_id
}

output "db_subnet_id" {
  description = "DB subnet OCID (HeatWave MySQL)"
  value       = module.subnets.db_subnet_id
}

# ── Compute ───────────────────────────────────────────────────────────────────
output "frontend_public_ip" {
  description = "Frontend VM public IP — open this in your browser"
  value       = module.compute.frontend_public_ip
}

output "frontend_private_ip" {
  description = "Frontend VM private IP — used in backend NSG rules"
  value       = module.compute.frontend_private_ip
}

output "backend_private_ip" {
  description = "Backend VM private IP — used in Nginx proxy_pass config"
  value       = module.compute.backend_private_ip
}

# ── SSH Commands ──────────────────────────────────────────────────────────────
output "ssh_frontend" {
  description = "SSH command for frontend VM"
  value       = "ssh ubuntu@${module.compute.frontend_public_ip}"
}

output "ssh_backend_via_frontend" {
  description = "SSH to backend via frontend (ProxyJump — backend has no public IP)"
  value       = "ssh -J ubuntu@${module.compute.frontend_public_ip} ubuntu@${module.compute.backend_private_ip}"
}

# ── Next Steps ────────────────────────────────────────────────────────────────
output "next_steps" {
  description = "What to do after terraform apply"
  value = <<-EOT

  ╔══════════════════════════════════════════════════════════════╗
  ║  Infrastructure created. Next steps:                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  1. Copy IPs into config.env:                               ║
  ║     FRONTEND_PUBLIC_IP  = ${module.compute.frontend_public_ip}
  ║     FRONTEND_PRIVATE_IP = ${module.compute.frontend_private_ip}
  ║     BACKEND_PRIVATE_IP  = ${module.compute.backend_private_ip}
  ║                                                              ║
  ║  2. Create HeatWave MySQL DB in Oracle Console:             ║
  ║     Databases → HeatWave → Create DB System                 ║
  ║     Subnet: db-subnet (${module.subnets.db_subnet_id})
  ║                                                              ║
  ║  3. Run deployment scripts:                                  ║
  ║     ./setup_frontend.sh  (on frontend VM)                   ║
  ║     ./setup_backend.sh   (on backend VM via ProxyJump)      ║
  ║     ./setup_db.sh        (on backend VM)                    ║
  ║                                                              ║
  ║  4. Run diagnose.sh to verify the full stack                ║
  ╚══════════════════════════════════════════════════════════════╝
  EOT
}
