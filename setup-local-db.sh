#!/bin/bash

echo "🗄️  Setting up local PostgreSQL database..."

# Create appuser if not exists
psql -d postgres -c "CREATE USER appuser WITH PASSWORD 'devpassword';" 2>/dev/null || echo "User appuser already exists"

# Create database
psql -d postgres -c "CREATE DATABASE tesland_dev OWNER appuser;" 2>/dev/null || echo "Database tesland_dev already exists"

# Grant privileges
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE tesland_dev TO appuser;"

echo "✅ Database setup complete!"
echo ""
echo "Connection string:"
echo "postgresql://appuser:devpassword@127.0.0.1:5432/tesland_dev?schema=public"
