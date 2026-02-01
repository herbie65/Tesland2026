#!/bin/bash

# Kleur codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "================================================"
echo "  Database Migratie via Prisma"
echo "================================================"
echo ""

# Check .env.local
if [ ! -f .env.local ]; then
    echo "❌ .env.local niet gevonden!"
    echo "Maak eerst een .env.local bestand aan."
    exit 1
fi

echo "${GREEN}Stap 1: Prisma client regenereren${NC}"
npx prisma generate

echo ""
echo "${GREEN}Stap 2: Migratie aanmaken en uitvoeren${NC}"
npx prisma migrate dev --name add_customer_signature

if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ Migratie succesvol!${NC}"
    echo ""
    echo "De volgende velden zijn toegevoegd aan work_orders:"
    echo "  ✓ customer_signature"
    echo "  ✓ customer_signed_at"
    echo "  ✓ customer_signed_by"
    echo "  ✓ signature_ip_address"
    echo ""
    echo "Herstart je development server:"
    echo "  ${YELLOW}npm run dev${NC}"
    echo ""
else
    echo ""
    echo "❌ Migratie gefaald!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check je DATABASE_URL in .env.local"
    echo "  2. Zorg dat PostgreSQL draait"
    echo "  3. Probeer: ${YELLOW}npx prisma migrate status${NC}"
    echo ""
fi
