#!/usr/bin/env bash
# Hetzner VPS Initial Setup Helper
# Run this on your LOCAL machine (Mac)

set -e

echo "🚀 TLadmin Hetzner Setup Helper"
echo "================================"
echo ""

# Collect info
read -p "Enter VPS IP address: " VPS_IP
read -p "Enter domain (e.g., admin.tesland.com): " DOMAIN
read -p "Enter database password: " -s DB_PASSWORD
echo ""
read -p "Enter JWT secret (or press Enter to generate): " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 32)
  echo "Generated JWT_SECRET: $JWT_SECRET"
fi

echo ""
echo "📝 Configuration Summary:"
echo "  VPS IP: $VPS_IP"
echo "  Domain: $DOMAIN"
echo "  Database: postgresql://appuser:****@localhost:5432/tesland"
echo "  JWT Secret: ${JWT_SECRET:0:10}..."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Generate SSH key if not exists
if [ ! -f ~/.ssh/tladmin_deploy ]; then
  echo "🔑 Generating SSH deploy key..."
  ssh-keygen -t ed25519 -C "github-actions-tladmin" -f ~/.ssh/tladmin_deploy -N ""
fi

echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  Copy this SSH public key to VPS:"
echo "    $(cat ~/.ssh/tladmin_deploy.pub)"
echo ""
echo "2️⃣  On VPS, run:"
echo "    sudo adduser deploy"
echo "    sudo usermod -aG docker deploy"
echo "    sudo mkdir -p /home/deploy/.ssh"
echo "    echo '$(cat ~/.ssh/tladmin_deploy.pub)' | sudo tee /home/deploy/.ssh/authorized_keys"
echo "    sudo chown -R deploy:deploy /home/deploy/.ssh"
echo "    sudo chmod 700 /home/deploy/.ssh"
echo "    sudo chmod 600 /home/deploy/.ssh/authorized_keys"
echo ""
echo "3️⃣  Test SSH connection:"
echo "    ssh -i ~/.ssh/tladmin_deploy deploy@$VPS_IP"
echo ""
echo "4️⃣  Create .env.production on VPS:"
echo "    sudo -iu deploy"
echo "    cd /opt/tladmin/TLadmin"
echo "    nano .env.production"
echo ""
echo "    Paste this:"
echo "    ---"
echo "    NODE_ENV=production"
echo "    APP_URL=https://$DOMAIN"
echo "    DATABASE_URL=postgresql://appuser:$DB_PASSWORD@localhost:5432/tesland?schema=public"
echo "    JWT_SECRET=$JWT_SECRET"
echo "    ---"
echo ""
echo "5️⃣  Add GitHub Secrets (repo settings):"
echo "    HETZNER_HOST = $VPS_IP"
echo "    HETZNER_USER = deploy"
echo "    HETZNER_SSH_KEY = (paste private key below)"
echo ""
echo "    Private key:"
cat ~/.ssh/tladmin_deploy
echo ""
echo ""
echo "6️⃣  Update nginx config:"
echo "    Replace 'admin.tesland.com' with '$DOMAIN' in nginx-site.conf"
echo ""
echo "✅ Setup info generated! Follow the steps above."
