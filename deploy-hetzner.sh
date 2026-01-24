#!/bin/bash

# TLadmin Hetzner Deployment Script
# ====================================
# Dit script deploy de TLadmin applicatie naar een Hetzner VPS
#
# Gebruik: ./deploy-hetzner.sh

set -e

echo "🚀 TLadmin Hetzner Deployment"
echo "=============================="
echo ""

# Configuratie
read -p "Enter Hetzner VPS IP address: " VPS_IP
read -p "Enter SSH user (default: root): " SSH_USER
SSH_USER=${SSH_USER:-root}

APP_DIR="/opt/tladmin"
BACKUP_DIR="/opt/tladmin-backup-$(date +%Y%m%d-%H%M%S)"

echo ""
echo "📋 Deployment configuratie:"
echo "  VPS IP: $VPS_IP"
echo "  SSH User: $SSH_USER"
echo "  App directory: $APP_DIR"
echo ""
read -p "Doorgaan? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment geannuleerd"
    exit 1
fi

echo ""
echo "1️⃣ Controleer SSH connectie..."
ssh -o ConnectTimeout=5 $SSH_USER@$VPS_IP "echo 'SSH connectie OK'" || {
    echo "❌ Kan geen verbinding maken met VPS"
    exit 1
}

echo ""
echo "2️⃣ Installeer Docker op VPS (indien nodig)..."
ssh $SSH_USER@$VPS_IP << 'ENDSSH'
if ! command -v docker &> /dev/null; then
    echo "Docker niet gevonden, installeren..."
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker geïnstalleerd"
else
    echo "✅ Docker is al geïnstalleerd"
fi
ENDSSH

echo ""
echo "3️⃣ Maak app directory op VPS..."
ssh $SSH_USER@$VPS_IP "mkdir -p $APP_DIR"

echo ""
echo "4️⃣ Upload applicatie bestanden..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '*.csv' \
  --exclude 'import/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.git' \
  ./ $SSH_USER@$VPS_IP:$APP_DIR/

echo ""
echo "5️⃣ .env.production configuratie..."
echo "❗ Let op: Je moet de .env.production bestand handmatig aanmaken op de VPS"
echo "Voorbeeld bestanden staan klaar in $APP_DIR"
ssh $SSH_USER@$VPS_IP << ENDSSH
cd $APP_DIR
if [ ! -f .env.production ]; then
    echo "❌ .env.production niet gevonden!"
    echo "Maak deze aan met de juiste database credentials en secrets"
    echo "Zie .env.production.example voor een voorbeeld"
    exit 1
else
    echo "✅ .env.production gevonden"
fi
ENDSSH

echo ""
echo "6️⃣ Build en start Docker containers..."
ssh $SSH_USER@$VPS_IP << ENDSSH
cd $APP_DIR
docker compose -f docker-compose.prod.yml down || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
ENDSSH

echo ""
echo "7️⃣ Voer database migraties uit..."
ssh $SSH_USER@$VPS_IP << ENDSSH
cd $APP_DIR
docker compose -f docker-compose.prod.yml exec -T tladmin npx prisma db push --skip-generate
ENDSSH

echo ""
echo "✅ Deployment compleet!"
echo ""
echo "📊 Status controleren:"
echo "  ssh $SSH_USER@$VPS_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml ps'"
echo ""
echo "📝 Logs bekijken:"
echo "  ssh $SSH_USER@$VPS_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f'"
echo ""
echo "🌐 Test de applicatie op:"
echo "  http://$VPS_IP"
echo ""
echo "⚙️ Volgende stappen:"
echo "  1. Configureer domein DNS (A record naar $VPS_IP)"
echo "  2. Installeer SSL certificaat (Let's Encrypt)"
echo "  3. Update nginx.conf voor HTTPS"
echo ""
