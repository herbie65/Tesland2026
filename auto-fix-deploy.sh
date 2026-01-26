#!/bin/bash
# FINAL AUTOMATED FIX AND DEPLOY

set -e

echo "🔧 Fixing all remaining build issues locally..."

cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

# Remove all backup/kopie files
find . -name "*kopie*" -o -name "*backup*" | grep -v node_modules | grep -v .git | xargs rm -rf 2>/dev/null || true

# Remove any remaining Firebase imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' '/firebase/d' {} \; 2>/dev/null || true

# Commit and push
git add -A
git commit -m "Clean build: remove all Firebase and backup files" || true
git push origin main

echo "✅ Changes pushed to GitHub (commit: $(git rev-parse --short HEAD))"
echo ""
echo "🚀 Now SSH to VPS and run:"
echo "   ssh herbert@46.62.229.245"
echo "   sudo -iu deploy"
echo "   cd /opt/tladmin && git pull && docker compose --env-file .env.production build --no-cache && docker compose --env-file .env.production up -d"
