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
export REACT_APP_API_URL="http://$BACKEND_IP:8000/api"
npm run build
cd ..

echo "=================================================="
echo "🚀 Deploying Frontend Server ($FRONTEND_IP)"
echo "=================================================="
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY" frontend/build/ opc@$FRONTEND_IP:/tmp/frontend_build/

ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY opc@$FRONTEND_IP << 'EOF'
    sudo rm -rf /opt/frontend
    sudo mv /tmp/frontend_build /opt/frontend
    sudo chown -R opc:opc /opt/frontend

    # Python SPA Server Script
    cat << 'PYTHON_SCRIPT' | sudo tee /opt/frontend/server.py
import http.server
import socketserver
import os

PORT = 80
DIRECTORY = "/opt/frontend"

class SPADirectoryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not os.path.isfile(path):
            self.path = '/index.html'
        return super().do_GET()

with socketserver.TCPServer(("", PORT), SPADirectoryHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
PYTHON_SCRIPT

    # Setup Systemd Service for Frontend
    cat << 'SERVICE' | sudo tee /etc/systemd/system/frontend.service
[Unit]
Description=React Frontend Server
After=network.target

[Service]
User=root
WorkingDirectory=/opt/frontend
ExecStart=/usr/bin/python3 /opt/frontend/server.py
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

    # Open Firewall Port 80
    sudo firewall-cmd --add-port=80/tcp --permanent || true
    sudo firewall-cmd --reload || true

    sudo systemctl daemon-reload
    sudo systemctl enable --now frontend.service
    sudo systemctl restart frontend.service
EOF

echo "=================================================="
echo "🚀 Deploying Backend Server ($BACKEND_IP)"
echo "=================================================="
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY" backend/ opc@$BACKEND_IP:/tmp/backend/

ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY opc@$BACKEND_IP << EOF
    # Create 2GB Swap file for Python pip
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi

    # Install pip
    sudo dnf install -y python3-pip

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

    # Open Firewall Port 8000
    sudo firewall-cmd --add-port=8000/tcp --permanent || true
    sudo firewall-cmd --reload || true

    sudo systemctl daemon-reload
    sudo systemctl enable --now fastapi.service
    sudo systemctl restart fastapi.service
EOF

echo "=================================================="
echo "✅ Deployment Complete!"
echo "Frontend is live at: http://$FRONTEND_IP/"
echo "Backend API is live at: http://$BACKEND_IP:8000/api/"
echo "=================================================="
