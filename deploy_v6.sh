#!/bin/bash
set -e

FRONTEND_IP="89.168.85.18"
FRONTEND_KEY="infrastructure/web-instance.key"

BACKEND_IP="79.76.126.235"
BACKEND_KEY="infrastructure/app-instance.key"

DB_IP="10.0.1.62"
DB_PASS="80lSDz%FaZlFpSQQ"

echo "=================================================="
echo "🚀 Building Frontend (React)"
echo "=================================================="
cd frontend
export REACT_APP_API_URL="http://$BACKEND_IP:8000/api"
npm run build
cd ..

echo "=================================================="
echo "🚀 Deploying Frontend ($FRONTEND_IP)"
echo "=================================================="
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY" frontend/build/ opc@$FRONTEND_IP:/tmp/frontend_build/

ssh -o StrictHostKeyChecking=no -i $FRONTEND_KEY opc@$FRONTEND_IP << 'EOF'
    sudo rm -rf /opt/frontend
    sudo mv /tmp/frontend_build /opt/frontend
    sudo chown -R opc:opc /opt/frontend

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

    sudo firewall-cmd --add-port=80/tcp --permanent || true
    sudo firewall-cmd --reload || true

    sudo systemctl daemon-reload
    sudo systemctl enable --now frontend.service
    sudo systemctl restart frontend.service
EOF

echo "=================================================="
echo "🚀 Deploying Backend ($BACKEND_IP)"
echo "=================================================="
# Copy entire backend
rsync -avz --exclude 'venv' -e "ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY" backend/ opc@$BACKEND_IP:/tmp/backend/

ssh -o StrictHostKeyChecking=no -i $BACKEND_KEY opc@$BACKEND_IP << EOF
    # --- 1. INSTALL PIP WITHOUT DNF! ---
    python3 -m ensurepip --upgrade || sudo python3 -m ensurepip --upgrade

    # --- 2. BACKEND SETUP ---
    sudo rm -rf /opt/backend
    sudo mv /tmp/backend /opt/backend
    sudo chown -R opc:opc /opt/backend
    cd /opt/backend

    # Use python3 -m pip
    python3 -m pip install --user -r requirements.txt

    cat << 'ENVFILE' > .env
DB_HOST=$DB_IP
DB_USER=admin
DB_PASSWORD=$DB_PASS
DB_NAME=antigravity
OPENAI_API_KEY=
GROQ_API_KEY=
ENVFILE

    cat << 'SERVICE' | sudo tee /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI Backend
After=network.target

[Service]
User=opc
WorkingDirectory=/opt/backend
Environment="PATH=/home/opc/.local/bin:/home/opc/.local/lib/python3.9/site-packages/bin:/usr/local/bin:/usr/bin"
ExecStart=/usr/bin/python3 run.py --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

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
