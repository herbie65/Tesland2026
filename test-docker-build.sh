#!/bin/bash

# Quick Test: Lokale Docker Build
# Test of de Docker build werkt voordat je deploy naar Hetzner

echo "🧪 Test TLadmin Docker Build Lokaal"
echo "===================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is niet actief. Start Docker Desktop eerst."
    exit 1
fi

echo "✅ Docker is actief"
echo ""
echo "📦 Building Docker image..."
echo ""

# Build the image
docker build -t tladmin-test . || {
    echo "❌ Docker build mislukt!"
    exit 1
}

echo ""
echo "✅ Docker build succesvol!"
echo ""
echo "🚀 Om de container te testen (optioneel):"
echo ""
echo "1. Maak een test .env bestand:"
echo "   cp .env.local .env.test"
echo ""
echo "2. Start de container:"
echo "   docker run -p 3000:3000 --env-file .env.test tladmin-test"
echo ""
echo "3. Open http://localhost:3000"
echo ""
echo "Als alles werkt, ben je klaar voor deployment naar Hetzner!"
echo "Voer dan uit: ./deploy-hetzner.sh"
echo ""
