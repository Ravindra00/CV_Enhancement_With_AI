#!/bin/bash
# =============================================================================
# ANTIGRAVITY — bootstrap.sh
# One script to run. Handles everything:
#   1. Checks prerequisites (Terraform, OCI CLI)
#   2. Generates SSH key pair for Oracle VMs
#   3. Detects your current public IP for SSH rules
#   4. Generates a secure DB password
#   5. Writes the final terraform.tfvars
#   6. Runs terraform init + plan + apply
#
# Usage:
#   chmod +x bootstrap.sh
#   ./bootstrap.sh
#
# To destroy everything later:
#   ./bootstrap.sh --destroy
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[1;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
fatal()   { echo -e "${RED}✗${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}$1${NC}"; echo "$(echo "$1" | sed 's/./-/g')"; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="$HOME/.ssh/id_ed25519"
TFVARS="$SCRIPT_DIR/terraform.tfvars"
LOG="$SCRIPT_DIR/bootstrap_$(date +%Y%m%d_%H%M%S).log"

# ── Destroy mode ──────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--destroy" ]]; then
  warn "DESTROY MODE — this will delete all infrastructure"
  read -rp "  Type 'yes' to confirm: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 0; }
  cd "$SCRIPT_DIR"
  terraform destroy -auto-approve
  exit 0
fi

exec > >(tee -a "$LOG") 2>&1

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       ANTIGRAVITY — Infrastructure Bootstrap         ║"
echo "║       Oracle Cloud Always Free · Frankfurt           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# STEP 1 — Check prerequisites
# =============================================================================
header "STEP 1/6 — Checking prerequisites"

# Terraform
if ! command -v terraform &>/dev/null; then
  fatal "Terraform not found. Install it:
  macOS:   brew tap hashicorp/tap && brew install hashicorp/tap/terraform
  Linux:   https://developer.hashicorp.com/terraform/install
  Windows: choco install terraform"
fi
TF_VERSION=$(terraform version -json | python3 -c "import sys,json; print(json.load(sys.stdin)['terraform_version'])" 2>/dev/null || terraform version | head -1 | grep -oP '\d+\.\d+\.\d+')
success "Terraform: $TF_VERSION"

# OCI API key
OCI_KEY="$HOME/.oci/oci_api_key.pem"
if [[ ! -f "$OCI_KEY" ]]; then
  fatal "OCI API private key not found at $OCI_KEY
  
  Generate it with:
    mkdir -p ~/.oci
    openssl genrsa -out ~/.oci/oci_api_key.pem 2048
    chmod 600 ~/.oci/oci_api_key.pem
    openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
  
  Then add the public key in:
    Oracle Console → Profile → User Settings → API Keys → Add API Key"
fi
success "OCI API key: $OCI_KEY"

# Python3 (needed for password generation)
if ! command -v python3 &>/dev/null; then
  fatal "python3 not found — install it for your OS"
fi

# =============================================================================
# STEP 2 — Generate SSH key for Oracle VMs
# =============================================================================
header "STEP 2/6 — SSH key for Oracle VMs"

if [[ ! -f "$SSH_KEY" ]]; then
  fatal "SSH key not found at $SSH_KEY
  
  It should exist — check with: ls ~/.ssh/
  If it's named differently, edit SSH_KEY= at the top of this script."
fi

if [[ ! -f "${SSH_KEY}.pub" ]]; then
  info "Public key file missing — regenerating from private key..."
  ssh-keygen -y -f "$SSH_KEY" > "${SSH_KEY}.pub"
  success "Public key restored: ${SSH_KEY}.pub"
fi

SSH_PUBLIC_KEY=$(cat "${SSH_KEY}.pub")
success "Using existing SSH key: $SSH_KEY"

# =============================================================================
# STEP 3 — Detect your public IP
# =============================================================================
header "STEP 3/6 — Detecting your public IP for SSH rules"

MY_IP=""
for URL in "https://ifconfig.me" "https://api.ipify.org" "https://checkip.amazonaws.com"; do
  MY_IP=$(curl -sf --max-time 5 "$URL" 2>/dev/null | tr -d '[:space:]' || true)
  if [[ -n "$MY_IP" ]] && echo "$MY_IP" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    break
  fi
done

if [[ -z "$MY_IP" ]]; then
  warn "Could not auto-detect IP. Enter your IP manually:"
  read -rp "  Your public IP (run 'curl ifconfig.me' in another terminal): " MY_IP
fi

success "Your IP: $MY_IP (SSH will be locked to this)"
warn "If your IP changes (home broadband), run: ./bootstrap.sh --update-ip"

# =============================================================================
# STEP 4 — Generate secure DB password
# =============================================================================
header "STEP 4/6 — Generating database credentials"

# Check if password already saved from a previous run
PASSWORD_FILE="$SCRIPT_DIR/.db_password"
if [[ -f "$PASSWORD_FILE" ]]; then
  DB_PASSWORD=$(cat "$PASSWORD_FILE")
  warn "Reusing saved DB password from previous run"
else
  # Generate: at least 12 chars, upper, lower, number, special (OCI requirement)
  DB_PASSWORD=$(python3 -c "
import secrets, string
chars = string.ascii_letters + string.digits + '!@#\$%'
while True:
    pwd = ''.join(secrets.choice(chars) for _ in range(16))
    if (any(c.isupper() for c in pwd) and
        any(c.islower() for c in pwd) and
        any(c.isdigit() for c in pwd) and
        any(c in '!@#\$%' for c in pwd)):
        print(pwd)
        break
")
  echo "$DB_PASSWORD" > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
  success "DB password generated and saved to .db_password"
fi

success "DB credentials ready"

# =============================================================================
# STEP 5 — Write terraform.tfvars
# =============================================================================
header "STEP 5/6 — Writing terraform.tfvars"

cat > "$TFVARS" << EOF
# =============================================================================
# ANTIGRAVITY — terraform.tfvars
# Auto-generated by bootstrap.sh on $(date)
# DO NOT COMMIT — contains secrets
# =============================================================================

# ── OCI Auth ──────────────────────────────────────────────────────────────────
tenancy_ocid     = "ocid1.tenancy.oc1..aaaaaaaab2opxx6mrmmikviqgfvfszer32pjqht53ybzlxruxtp2hth45poq"
user_ocid        = "ocid1.user.oc1..aaaaaaaabreadmm45ntreqcs27coj5bz5bmr24b3k3ohhg6xirm625lapqfa"
fingerprint      = "d9:6c:49:52:ed:0a:e7:d8:93:84:15:4f:bd:a2:48:bd"
private_key_path = "~/.oci/oci_api_key.pem"
region           = "eu-frankfurt-1"

# ── Compartment (root tenancy) ────────────────────────────────────────────────
compartment_ocid = "ocid1.tenancy.oc1..aaaaaaaab2opxx6mrmmikviqgfvfszer32pjqht53ybzlxruxtp2hth45poq"

# ── Project ───────────────────────────────────────────────────────────────────
project_name = "antigravity"
environment  = "production"

# ── Networking ────────────────────────────────────────────────────────────────
vcn_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"
db_subnet_cidr      = "10.0.3.0/24"

# ── Auto-generated ────────────────────────────────────────────────────────────
my_ip          = "$MY_IP"
ssh_public_key = "$SSH_PUBLIC_KEY"

# ── Compute shapes (Always Free eligible) ─────────────────────────────────────
frontend_shape      = "VM.Standard.E2.1.Micro"
backend_shape       = "VM.Standard.E2.1.Micro"
instance_image_ocid = ""

# ── HeatWave MySQL ────────────────────────────────────────────────────────────
db_admin_username = "admin"
db_admin_password = "$DB_PASSWORD"
db_name           = "antigravity"
EOF

chmod 600 "$TFVARS"
success "terraform.tfvars written"

# =============================================================================
# STEP 6 — Terraform init → plan → apply
# =============================================================================
header "STEP 6/6 — Terraform"

cd "$SCRIPT_DIR"

# ── Init ──────────────────────────────────────────────────────────────────────
info "Running terraform init..."
terraform init -upgrade 2>&1 | tail -5
success "Init complete"

# ── Validate ──────────────────────────────────────────────────────────────────
info "Validating configuration..."
terraform validate
success "Configuration valid"

# ── IAM policies first (fixes 404 on compute) ─────────────────────────────────
info "Applying IAM policies first (required before compute)..."
terraform apply \
  -target=oci_identity_policy.compute \
  -target=oci_identity_policy.networking \
  -auto-approve 2>&1 | tail -10 || warn "IAM apply had issues — may not have policy permission (see note below)"

info "Waiting 60 seconds for IAM policies to propagate..."
for i in $(seq 60 -10 10); do
  echo -ne "  $i seconds remaining...\r"
  sleep 10
done
echo ""

# ── Plan ──────────────────────────────────────────────────────────────────────
info "Running terraform plan..."
terraform plan -out=tfplan

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Review the plan above.                              ║"
echo "║  Press ENTER to apply, or Ctrl+C to cancel.         ║"
echo "╚══════════════════════════════════════════════════════╝"
read -rp "" _

# ── Apply ─────────────────────────────────────────────────────────────────────
info "Applying infrastructure..."
terraform apply tfplan

# =============================================================================
# DONE — Print summary
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  INFRASTRUCTURE READY                                ║"
echo "╠══════════════════════════════════════════════════════╣"

FRONTEND_IP=$(terraform output -raw frontend_public_ip 2>/dev/null || echo "check console")
BACKEND_IP=$(terraform output -raw backend_private_ip 2>/dev/null || echo "check console")

echo "║                                                      ║"
printf "║  Frontend IP:  %-37s║\n" "$FRONTEND_IP"
printf "║  Backend IP:   %-37s║\n" "$BACKEND_IP"
printf "║  DB Password:  saved to .db_password               ║\n"
printf "║  SSH Key:      ~/.ssh/id_ed25519                     ║\n"
echo "║                                                      ║"
echo "║  SSH commands:                                       ║"
printf "║  ssh -i ~/.ssh/id_ed25519 ubuntu@%-19s║\n" "$FRONTEND_IP"
echo "║                                                      ║"
echo "║  Next: run deployment scripts (setup_frontend.sh    ║"
echo "║  and setup_backend.sh) from the previous phase.     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Save these values in your config.env:"
echo "  FRONTEND_PUBLIC_IP=$FRONTEND_IP"
echo "  BACKEND_PRIVATE_IP=$BACKEND_IP"
echo "  DB_PASSWORD=$(cat "$PASSWORD_FILE")"
echo ""
echo "  Log saved to: $LOG"
