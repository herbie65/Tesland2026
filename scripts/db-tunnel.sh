#!/bin/bash
# Database SSH Tunnel Script
# 
# Dit script maakt een SSH tunnel naar de PostgreSQL database op de Hetzner server.
# De tunnel blijft actief zolang dit script draait.
#
# Usage: ./scripts/db-tunnel.sh

SERVER="herbert@46.62.229.245"
LOCAL_PORT=5433
REMOTE_PORT=5432

echo "🔐 Starting SSH tunnel to PostgreSQL database..."
echo ""
echo "📡 Tunnel configuration:"
echo "   Local:  localhost:${LOCAL_PORT}"
echo "   Remote: ${SERVER} → localhost:${REMOTE_PORT}"
echo ""
echo "⚠️  BELANGRIJK: Houd dit terminal venster OPEN!"
echo "   De database connectie werkt alleen zolang dit script draait."
echo ""
echo "💡 Stop de tunnel met: Ctrl+C"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "⚠️  Warning: No SSH key found. You may need to enter your password."
    echo ""
fi

# Start the tunnel
ssh -N -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} ${SERVER}

# This will only execute if the tunnel is closed
echo ""
echo "🛑 SSH tunnel closed."
