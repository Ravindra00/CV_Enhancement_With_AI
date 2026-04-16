# CV Enhancer: Oracle Cloud Always Free Tier Deployment Guide

## 📋 Overview

This guide walks through deploying CV Enhancer to Oracle Cloud's Always Free Tier, which includes:
- 2 x AMD-based Compute instances (1 OCPU, 1 GB RAM each)
- 1 x PostgreSQL Database (1 OCPU, 1 GB RAM)
- Amphora Virtual Cloud Network (VCN)
- Unlimited bandwidth between services

**Target Architecture:**
- **Frontend:** React app on Compute Instance 1 (nginx)
- **Backend:** FastAPI on Compute Instance 2 (1 worker, limited memory)
- **Database:** Managed PostgreSQL Database
- **Storage:** Object Storage for CV uploads

---

## 🔧 Prerequisites

- Oracle Cloud Account (Always Free Tier)
- SSH key pair generated
- Docker & docker-compose installed locally (for building images)
- Git installed

---

## Step 1: Set Up Oracle Cloud Infrastructure

### 1.1 Create VCN and Subnets

```bash
# Navigate to Oracle Cloud Console
# 1. Go to Networking > Virtual Cloud Networks
# 2. Create VCN: "cv-enhancer-vcn"
#    - CIDR Block: 10.0.0.0/16
# 3. Create Public Subnet: "cv-enhancer-subnet"
#    - CIDR Block: 10.0.1.0/24
#    - Enable auto-assign public IP
```

### 1.2 Create Security Groups / Network Security Groups (NSGs)

**Frontend NSG (Port 80, 443, SSH):**
```bash
# Ingress Rules:
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- SSH (22): <YOUR_IP>/32 (or 0.0.0.0/0 if testing)

# Egress Rules:
- All traffic: 0.0.0.0/0
```

**Backend NSG (Port 8000, SSH):**
```bash
# Ingress Rules:
- Port 8000 (FastAPI): 10.0.1.0/24 (from Frontend only)
- SSH (22): <YOUR_IP>/32

# Egress Rules:
- All traffic: 0.0.0.0/0
```

### 1.3 Create PostgreSQL Database

```bash
# 1. Go to Databases > MySQL Database Service
# 2. Create DB System:
#    - Name: cv-enhancer-db
#    - Shape: E4 (Always Free eligible - 1 OCPU, 1 GB RAM)
#    - Storage: 20 GB (minimum)
#    - Username: postgres
#    - Password: <SECURE_PASSWORD>
#    - VCN: cv-enhancer-vcn
#    - Backup: Enable (minimum 1 day retention)
# 3. Add DB Port to Subnet Routes (if needed)
```

---

## Step 2: Create Compute Instances

### 2.1 Instance 1 - Frontend

```bash
# Oracle Cloud Console: Compute > Instances
# 1. Create Instance:
#    - Name: cv-enhancer-frontend
#    - Image: Ubuntu 22.04 LTS (Always Free eligible)
#    - Shape: Ampere (Always Free eligible - 1 OCPU, 1 GB ARM RAM)
#    - VCN: cv-enhancer-vcn
#    - Subnet: cv-enhancer-subnet
#    - Public IP: Enabled
#    - SSH Key: Upload your public key
#    - NSG: Frontend NSG
```

### 2.2 Instance 2 - Backend

```bash
# Same as Instance 1, but:
#    - Name: cv-enhancer-backend
#    - NSG: Backend NSG
```

---

## Step 3: Configure Frontend Instance

### 3.1 Connect to Frontend Instance

```bash
ssh ubuntu@<FRONTEND_PUBLIC_IP>
```

### 3.2 Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install nginx, curl, git
sudo apt-get install -y nginx curl git

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.3 Clone Repository

```bash
cd /opt
sudo git clone https://github.com/Ravindra00/CV_Enhancer_With_AI.git cv-enhancer
cd cv-enhancer/frontend
```

### 3.4 Build React App

```bash
# Install Node.js 18+ (via nvm or apt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Create .env file
cat > .env << 'EOF'
REACT_APP_API_URL=http://<BACKEND_PRIVATE_IP>:8000/api
REACT_APP_API_TIMEOUT=30000
EOF

# Build
npm install
npm run build
```

### 3.5 Configure Nginx

```bash
# Backup original nginx config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# Create sites-available config
sudo tee /etc/nginx/sites-available/cv-enhancer > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Limit connections for Always Free Tier
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    limit_conn addr 10;
    limit_req_zone $binary_remote_addr zone=req:10m rate=5r/s;
    limit_req zone=req burst=10;

    # Gzip compression (reduces bandwidth)
    gzip on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /opt/cv-enhancer/frontend/build;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # React app
    location / {
        root /opt/cv-enhancer/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend proxy (API requests)
    location /api/ {
        proxy_pass http://<BACKEND_PRIVATE_IP>:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check
    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/cv-enhancer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## Step 4: Configure Backend Instance

### 4.1 Connect to Backend Instance

```bash
ssh ubuntu@<BACKEND_PUBLIC_IP>
```

### 4.2 Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Python 3.10+, pip, git, postgresql-client
sudo apt-get install -y python3.10 python3-pip python3-venv git postgresql-client

# Clone repository
cd /opt
sudo git clone https://github.com/Ravindra00/CV_Enhancer_With_AI.git cv-enhancer
cd cv-enhancer/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate
```

### 4.3 Configure Backend

```bash
# Install dependencies (limited memory considerations)
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@<DB_HOSTNAME>:5432/cv_enhancer

# Security
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEBUG=False
ALLOWED_HOSTS=<BACKEND_PUBLIC_IP>,<FRONTEND_PUBLIC_IP>,localhost

# AI (Groq)
GROQ_API_KEY=<YOUR_GROQ_API_KEY>

# Environment
ENVIRONMENT=production

# CORS
CORS_ORIGINS=http://<FRONTEND_PUBLIC_IP>,https://<FRONTEND_PUBLIC_IP>,http://localhost:3000

# File uploads (max 20MB for Always Free storage)
MAX_UPLOAD_SIZE_MB=20

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD_MINUTES=1
EOF

chmod 600 .env
```

### 4.4 Run Database Migrations

```bash
# Activate venv if not already
source venv/bin/activate

# Run migrations (if using Alembic)
alembic upgrade head
# OR for first-time setup:
python3 run.py  # creates tables on startup
```

### 4.5 Set Up Systemd Service

```bash
# Create systemd service
sudo tee /etc/systemd/system/cv-enhancer-backend.service > /dev/null << 'EOF'
[Unit]
Description=CV Enhancer FastAPI Backend
After=network.target

[Service]
Type=notify
User=ubuntu
WorkingDirectory=/opt/cv-enhancer/backend
Environment="PATH=/opt/cv-enhancer/backend/venv/bin"
ExecStart=/opt/cv-enhancer/backend/venv/bin/python run.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource limits for Always Free Tier (1GB RAM)
MemoryLimit=800M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cv-enhancer-backend
sudo systemctl start cv-enhancer-backend

# Check status
sudo systemctl status cv-enhancer-backend
sudo journalctl -u cv-enhancer-backend -f  # Follow logs
```

---

## Step 5: SSL/TLS Certificate (Optional but Recommended)

### 5.1 Attach Public IP to Domain

If you have a domain, update DNS records to point to your frontend instance's public IP.

### 5.2 Install Let's Encrypt

```bash
# On Frontend instance
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate (replace example.com)
sudo certbot certonly --nginx -d example.com -d www.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 5.3 Update Nginx Config

```bash
# Update /etc/nginx/sites-available/cv-enhancer to include SSL
sudo nano /etc/nginx/sites-available/cv-enhancer

# Add:
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    return 301 https://$server_name$request_uri;
}

sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 6: Monitoring & Optimization for Always Free Tier

### 6.1 Memory Management

```bash
# On Backend instance, limit Python workers
# Edit run.py to use 1 worker (already minimal)
# In production, use gunicorn with 1 worker:
pip install gunicorn

# Create /opt/cv-enhancer/backend/gunicorn_config.py
cat > gunicorn_config.py << 'EOF'
import multiprocessing

bind = "0.0.0.0:8000"
workers = 1  # Single worker for 1 OCPU
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 10  # Limit connections
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
EOF

# Update systemd service:
ExecStart=/opt/cv-enhancer/backend/venv/bin/gunicorn --config gunicorn_config.py main:app
```

### 6.2 Database Connection Pooling

```bash
# Update backend requirements.txt to include:
# sqlalchemy[asyncio] with psycopg2-binary
# Or use asyncpg for better performance

# Update DATABASE_URL in .env:
DATABASE_URL=postgresql://postgres:<PASSWORD>@<DB>:5432/cv_enhancer?connect_timeout=10
```

### 6.3 Enable Swap (Optional)

```bash
# On both instances, add swap for additional memory buffer
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

### 6.4 Monitor Resource Usage

```bash
# Check CPU and memory on Backend
free -h
top
ps aux | grep python

# Check database connections
# In psql:
# SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;
```

---

## Step 7: Backup & Recovery

### 7.1 Database Backups

```bash
# Create daily backup script
cat > /opt/cv-enhancer/backup.sh << 'EOF'
#!/bin/bash
DB_HOST=<DB_HOSTNAME>
DB_USER=postgres
DB_NAME=cv_enhancer
BACKUP_DIR=/opt/cv-enhancer/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/cv_enhancer_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "cv_enhancer_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/cv-enhancer/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/cv-enhancer/backup.sh
```

### 7.2 Upload Backups to Object Storage

```bash
# Install OCI CLI
curl -L -O https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh
bash install.sh

# Configure OCI CLI
oci setup config

# Add to backup script:
# oci os object put --bucket-name cv-enhancer-backups --file $BACKUP_DIR/cv_enhancer_$DATE.sql.gz
```

---

## Step 8: Performance Tuning

### 8.1 Connection Pooling for Always Free Tier

```python
# In backend app/database.py
from sqlalchemy.pool import QueuePool

# Use smaller pool size
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=2,  # Reduced from default 5
    max_overflow=5,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10}
)
```

### 8.2 API Rate Limiting

```python
# In backend app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Apply to routes:
@app.get("/api/cvs")
@limiter.limit("10/minute")
async def get_cvs(request: Request, ...):
    ...
```

### 8.3 Frontend Optimization

```bash
# In frontend/.env
REACT_APP_API_URL=http://<BACKEND_PRIVATE_IP>:8000/api
# Keep timeout reasonable for slow connections
REACT_APP_API_TIMEOUT=60000
```

---

## Step 9: Monitoring & Logging

### 9.1 Backend Logs

```bash
# View logs in real-time
sudo journalctl -u cv-enhancer-backend -f

# Export to file
sudo journalctl -u cv-enhancer-backend > /opt/cv-enhancer/backend.log
```

### 9.2 Health Checks

```bash
# Frontend health
curl http://<FRONTEND_IP>/health

# Backend health
curl http://localhost:8000/api/health

# Add cron job to monitor
cat > /opt/cv-enhancer/health_check.sh << 'EOF'
#!/bin/bash
FRONTEND_URL="http://<FRONTEND_IP>/health"
BACKEND_URL="http://localhost:8000/api/health"

if ! curl -sf $FRONTEND_URL > /dev/null; then
    echo "Frontend is down!" | mail -s "CV Enhancer Alert" admin@example.com
fi

if ! curl -sf $BACKEND_URL > /dev/null; then
    sudo systemctl restart cv-enhancer-backend
    echo "Backend restarted" | mail -s "CV Enhancer Alert" admin@example.com
fi
EOF

chmod +x /opt/cv-enhancer/health_check.sh
# Add to crontab: */5 * * * * /opt/cv-enhancer/health_check.sh
```

---

## Step 10: Final Verification

```bash
# 1. Check Frontend
curl -I http://<FRONTEND_PUBLIC_IP>

# 2. Check Backend (from Frontend instance)
curl -I http://<BACKEND_PRIVATE_IP>:8000/api/health

# 3. Test Database Connection
psql -h <DB_HOST> -U postgres -c "SELECT version();"

# 4. Test Full Flow
# Open http://<FRONTEND_PUBLIC_IP> in browser
# Try to login, create/edit CV, use AI features
```

---

## Cost Summary (Always Free)

| Service | Cost | Notes |
|---------|------|-------|
| 2x Compute (Always Free) | $0 | 1 OCPU, 1GB RAM each |
| PostgreSQL Database | $0 | 1 OCPU, 1GB RAM (Always Free) |
| Object Storage | $0 | First 20GB free |
| Data Transfer | $0 | Egress to internet is free tier |
| **Total** | **$0** | Always within free limits |

---

## Troubleshooting

### Backend not responding
```bash
# Check if service is running
sudo systemctl status cv-enhancer-backend

# Restart
sudo systemctl restart cv-enhancer-backend

# Check memory
free -h
ps aux | grep python

# Check database connection
pg_isready -h <DB_HOST> -U postgres
```

### Nginx 502 Bad Gateway
```bash
# Check backend is accessible
curl http://<BACKEND_PRIVATE_IP>:8000/api/health

# Check nginx error log
sudo tail -50 /var/log/nginx/error.log

# Ensure backend NSG allows port 8000
```

### Database connection timeout
```bash
# Check DB status in Oracle Cloud Console
# Verify DB subnet is accessible from backend instance
# Test connection: psql -h <DB_HOST> -U postgres
```

---

## Next Steps

1. **Enable SSL Certificate** for production
2. **Set up automated backups** to Object Storage
3. **Configure monitoring** with OCI Monitoring or CloudWatch
4. **Implement CI/CD** with GitHub Actions or OCI DevOps
5. **Add Custom Domain** via DNS management

---

## Support & Resources

- [Oracle Cloud Documentation](https://docs.cloud.oracle.com/iaas/Content/home.htm)
- [Always Free Resources](https://www.oracle.com/cloud/free/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/concepts/)
- [React Production Build Guide](https://react.dev/learn/start-a-new-react-project)

