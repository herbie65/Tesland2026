#!/bin/bash

# Kleur codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "  Database Migratie - Handtekening Velden"
echo "================================================"
echo ""

# Check of .env.local bestaat
if [ ! -f .env.local ]; then
    echo "${RED}❌ .env.local niet gevonden!${NC}"
    echo ""
    echo "Maak eerst een .env.local bestand aan met DATABASE_URL"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo "${RED}❌ DATABASE_URL niet gevonden in .env.local!${NC}"
    exit 1
fi

echo "${GREEN}✅ Database connectie gevonden${NC}"
echo ""

# Vraag bevestiging
echo "${YELLOW}Deze migratie voegt de volgende kolommen toe aan work_orders:${NC}"
echo "  • customer_signature (TEXT)"
echo "  • customer_signed_at (TIMESTAMP)"
echo "  • customer_signed_by (VARCHAR)"
echo "  • signature_ip_address (VARCHAR)"
echo ""

read -p "Wil je doorgaan? (ja/nee) " -r
echo ""

if [[ ! $REPLY =~ ^[Jj][Aa]?$ ]]; then
    echo "Migratie geannuleerd."
    exit 0
fi

# Optie 1: Via psql (als geïnstalleerd)
if command -v psql &> /dev/null; then
    echo "${GREEN}psql gevonden, migratie uitvoeren...${NC}"
    echo ""
    
    psql "$DATABASE_URL" -f prisma/migrations/add_signature_fields.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "${GREEN}✅ Migratie succesvol!${NC}"
        echo ""
        echo "Herstart nu je development server:"
        echo "  ${YELLOW}npm run dev${NC}"
        echo ""
    else
        echo ""
        echo "${RED}❌ Migratie gefaald!${NC}"
        echo ""
        echo "Probeer de migratie handmatig uit te voeren:"
        echo "  1. Open je PostgreSQL client"
        echo "  2. Voer de SQL uit van: prisma/migrations/add_signature_fields.sql"
        exit 1
    fi
else
    echo "${YELLOW}⚠️  psql niet gevonden${NC}"
    echo ""
    echo "Optie A: Installeer psql en draai dit script opnieuw"
    echo "  brew install postgresql"
    echo ""
    echo "Optie B: Gebruik Prisma Migrate (aanbevolen)"
    echo "  ${YELLOW}npx prisma migrate dev --name add_customer_signature${NC}"
    echo ""
    echo "Optie C: Voer handmatig uit in je PostgreSQL client:"
    echo "  Open: prisma/migrations/add_signature_fields.sql"
    echo ""
fi
