#!/bin/bash
set -e

FRONTEND_IP="130.61.90.23"
BACKEND_IP="193.122.10.166"
DB_IP="10.0.1.62"

FRONTEND_KEY="infrastructure/ssh-key-2026-06-18.key"
BACKEND_KEY="infrastructure/ssh-key-2026-06-18-backend.key"
DB_PASS="80lSDz%FaZlFpSQQ"

echo "=================================================="
echo "🚀 Building Frontend (React)"
echo "=================================================="
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

echo "=================================================="
echo "🚀 Deploying Frontend Server ($FRONTEND_IP)"
echo "=================================================="
# Sync static files
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY" frontend/build/ opc@$FRONTEND_IP:/tmp/frontend_build/

# Configure Nginx
ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY opc@$FRONTEND_IP << EOF
    # Create 2GB Swap file to prevent Out of Memory crashes during DNF install
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi

    sudo dnf install -y nginx
    sudo rm -rf /usr/share/nginx/html/*
    sudo cp -r /tmp/frontend_build/* /usr/share/nginx/html/
    
    # Configure Nginx proxy
    cat << 'NGINX' | sudo tee /etc/nginx/conf.d/cv_enhancer.conf
server {
    listen 80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://$BACKEND_IP:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

    # Remove default server block from default nginx.conf if it conflicts
    sudo sed -i 's/listen       80 default_server;/listen       80;/g' /etc/nginx/nginx.conf || true

    sudo systemctl enable --now nginx
    sudo systemctl restart nginx
EOF

echo "=================================================="
echo "🚀 Deploying Backend Server ($BACKEND_IP)"
echo "=================================================="
# Sync backend source code
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY" backend/ opc@$BACKEND_IP:/tmp/backend/

# Configure Python, requirements, and systemd service
ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY opc@$BACKEND_IP << EOF
    # Create 2GB Swap file to prevent Out of Memory crashes
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi

    # Install Python 3
    sudo dnf install -y python3 python3-pip

    # Move code
    sudo rm -rf /opt/backend
    sudo mv /tmp/backend /opt/backend
    sudo chown -R opc:opc /opt/backend
    cd /opt/backend

    # Install Python dependencies
    pip3 install --user -r requirements.txt

    # Setup Environment Variables
    cat << 'ENVFILE' > .env
DB_HOST=$DB_IP
DB_USER=admin
DB_PASSWORD=$DB_PASS
DB_NAME=antigravity
OPENAI_API_KEY=
GROQ_API_KEY=
ENVFILE

    # Setup Systemd Service
    cat << 'SERVICE' | sudo tee /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI Backend
After=network.target

[Service]
User=opc
WorkingDirectory=/opt/backend
Environment="PATH=/home/opc/.local/bin:/usr/local/bin:/usr/bin"
ExecStart=/usr/bin/python3 run.py --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

    sudo systemctl daemon-reload
    sudo systemctl enable --now fastapi.service
    sudo systemctl restart fastapi.service
EOF

echo "=================================================="
echo "✅ Deployment Complete!"
echo "Frontend is live at: http://$FRONTEND_IP/"
echo "Backend API is live at: http://$FRONTEND_IP/api/"
echo "=================================================="
