#!/bin/bash

# Kleur codes voor mooie output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "  Tesland Display - iPad Setup"
echo "================================================"
echo ""

# Vind lokaal IP adres
IP_WIFI=$(ipconfig getifaddr en0 2>/dev/null)
IP_ETH=$(ipconfig getifaddr en1 2>/dev/null)

if [ -n "$IP_WIFI" ]; then
    IP=$IP_WIFI
    INTERFACE="WiFi (en0)"
elif [ -n "$IP_ETH" ]; then
    IP=$IP_ETH
    INTERFACE="Ethernet (en1)"
else
    echo "❌ Geen netwerk verbinding gevonden!"
    echo ""
    echo "Zorg dat je Mac verbonden is met WiFi of Ethernet."
    exit 1
fi

echo "✅ Netwerk verbinding gevonden"
echo "   Interface: $INTERFACE"
echo "   IP Adres: ${GREEN}$IP${NC}"
echo ""

# Vind hostname
HOSTNAME=$(hostname | sed 's/.local//')
echo "📡 Hostname: ${BLUE}$HOSTNAME.local${NC}"
echo ""

echo "================================================"
echo "  📱 OPEN OP IPAD:"
echo "================================================"
echo ""
echo "   ${GREEN}http://$IP:3000/display${NC}"
echo ""
echo "   of"
echo ""
echo "   ${BLUE}http://$HOSTNAME.local:3000/display${NC}"
echo ""
echo "================================================"
echo ""

echo "💡 Tips:"
echo "   • Zorg dat iPad en Mac op hetzelfde WiFi zitten"
echo "   • Start dev server met: ${YELLOW}npm run dev${NC}"
echo "   • Voeg toe aan iPad beginscherm voor snelle toegang"
echo ""

# Check of dev server draait
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Development server draait op poort 3000"
else
    echo "⚠️  Development server draait NIET"
    echo "   Start met: ${YELLOW}npm run dev${NC}"
fi

echo ""
echo "================================================"
echo "  🖥️  ADMIN INTERFACE:"
echo "================================================"
echo ""
echo "   ${GREEN}http://$IP:3000/admin${NC}"
echo ""
echo "   Login en open een werkorder"
echo "   Klik op '📱 Toon op iPad' knop"
echo ""
echo "================================================"
echo ""

# Optioneel: open in browser
read -p "Wil je de admin interface nu openen? (j/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[JjYy]$ ]]; then
    open "http://$IP:3000/admin"
fi
