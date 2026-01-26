#!/bin/bash

# Fix all API routes with dynamic params for Next.js 15

echo "🔧 Fixing API routes for Next.js 15..."

# Array of files to fix
files=(
  "src/app/api/customers/[id]/route.ts"
  "src/app/api/settings/[group]/route.ts"
  "src/app/api/products/[id]/route.ts"
  "src/app/api/purchase-orders/[id]/route.ts"
  "src/app/api/invoices/[id]/route.ts"
  "src/app/api/parts-lines/[id]/route.ts"
  "src/app/api/rmas/[id]/route.ts"
  "src/app/api/admin/email-templates/[id]/route.ts"
  "src/app/api/admin/pages/[id]/route.ts"
  "src/app/api/planning/[id]/route.ts"
  "src/app/api/roles/[id]/route.ts"
  "src/app/api/inventory-locations/[id]/route.ts"
  "src/app/api/users/[id]/route.ts"
  "src/app/api/vehicles/[id]/rdw/route.ts"
  "src/app/api/vehicles/[id]/route.ts"
  "src/app/api/orders/[id]/route.ts"
  "src/app/api/workorders/[id]/status/route.ts"
  "src/app/api/workorders/[id]/route.ts"
  "src/app/api/workorders/[id]/parts/[partId]/route.ts"
  "src/app/api/workorders/[id]/parts/route.ts"
  "src/app/api/workorders/[id]/warehouse/route.ts"
  "src/app/api/workorders/[id]/photos/[photoId]/route.ts"
  "src/app/api/workorders/[id]/photos/route.ts"
  "src/app/api/workorders/[id]/labor/[laborId]/route.ts"
  "src/app/api/workorders/[id]/labor/route.ts"
  "src/app/api/planning-types/[id]/route.ts"
  "src/app/api/credit-invoices/[id]/route.ts"
)

cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

count=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Fix params type and await - handle both [id] and [slug] patterns
    sed -i '' -E 's/\{ params \}: \{ params: \{ (id|slug|group|partId|photoId|laborId): string \} \}/{ params }: { params: Promise<{ \1: string }> }/g' "$file"
    sed -i '' -E 's/const \{ (id|slug|group|partId|photoId|laborId) \} = params;/const { \1 } = await params;/g' "$file"
    
    ((count++))
  fi
done

echo "✅ Fixed $count API route files"
