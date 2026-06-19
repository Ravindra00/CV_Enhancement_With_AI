# =============================================================================
# ANTIGRAVITY — IAM Policies
# FIX 4: Resolves "404-NotAuthorizedOrNotFound" on compute instance launch.
#
# The error means your OCI user lacks permission to launch instances.
# These policies grant the minimum required permissions.
#
# HOW TO APPLY:
#   Option A (easiest) — Terraform manages the policies (below)
#   Option B (manual)  — paste the policy statements into Oracle Console
#                        Identity → Policies → Create Policy
#
# PREREQUISITE: You must already have permission to manage policies,
# or ask your tenancy admin to apply these.
# =============================================================================

# ── Get the current user's groups ─────────────────────────────────────────────
data "oci_identity_user" "current" {
  user_id = var.user_ocid
}

data "oci_identity_user_group_memberships" "current" {
  compartment_id = var.tenancy_ocid
  user_id        = var.user_ocid
}

# ── Policy: Allow compute instance management ─────────────────────────────────
# Fixes: 404-NotAuthorizedOrNotFound on LaunchInstance
resource "oci_identity_policy" "compute" {
  compartment_id = var.compartment_ocid
  name           = "${var.project_name}-compute-policy"
  description    = "Allow Antigravity deployment user to manage compute instances"

  statements = [
    "Allow any-user to manage instance-family in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to use virtual-network-family in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage volume-family in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
  ]
}

# ── Policy: Allow networking management ───────────────────────────────────────
resource "oci_identity_policy" "networking" {
  compartment_id = var.compartment_ocid
  name           = "${var.project_name}-networking-policy"
  description    = "Allow Antigravity deployment user to manage networking"

  statements = [
    "Allow any-user to manage virtual-network-family in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage internet-gateways in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage nat-gateways in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage security-lists in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage network-security-groups in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
    "Allow any-user to manage route-tables in compartment id ${var.compartment_ocid} where request.principal.id='${var.user_ocid}'",
  ]
}
