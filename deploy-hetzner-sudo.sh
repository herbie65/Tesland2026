#!/bin/bash

# TLadmin Hetzner Deployment Script (met sudo support)
# ====================================
# Dit script deploy de TLadmin applicatie naar een Hetzner VPS
#
# Gebruik: ./deploy-hetzner-sudo.sh

set -e

echo "🚀 TLadmin Hetzner Deployment (sudo mode)"
echo "==========================================="
echo ""

# Configuratie
read -p "Enter Hetzner VPS IP address: " VPS_IP
read -p "Enter SSH user: " SSH_USER

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
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    # Voeg huidige user toe aan docker groep
    sudo usermod -aG docker $USER
    echo "✅ Docker geïnstalleerd"
    echo "⚠️  Je moet uitloggen en opnieuw inloggen voor docker groep rechten"
else
    echo "✅ Docker is al geïnstalleerd"
fi
ENDSSH

echo ""
echo "3️⃣ Maak app directory op VPS..."
ssh $SSH_USER@$VPS_IP "sudo mkdir -p $APP_DIR && sudo chown -R $USER:$USER $APP_DIR"

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
ssh $SSH_USER@$VPS_IP << ENDSSH
cd $APP_DIR
if [ ! -f .env.production ]; then
    echo "❌ .env.production niet gevonden!"
    echo "Maak deze aan met:"
    echo "  cd $APP_DIR"
    echo "  nano .env.production"
    echo ""
    echo "Vul in:"
    echo "  DATABASE_URL=postgresql://appuser:STRONG_PASSWORD@postgres:5432/tesland?schema=public"
    echo "  JWT_SECRET=\$(openssl rand -base64 32)"
    echo "  POSTGRES_PASSWORD=STRONG_PASSWORD"
    echo "  NODE_ENV=production"
    echo "  NEXT_TELEMETRY_DISABLED=1"
    echo ""
    echo "Druk op ENTER om .env.production nu aan te maken..."
    read
    nano .env.production
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
