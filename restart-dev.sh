#!/bin/bash

echo "🛑 Stopping all Next.js processes..."
pkill -9 -f "next dev" 2>/dev/null
lsof -ti:3000 -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null

echo "🧹 Clearing cache..."
rm -rf .next

echo "🚀 Starting fresh dev server..."
npm run dev

# Server will start on http://localhost:3000
