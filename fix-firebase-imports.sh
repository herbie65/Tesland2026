#!/bin/bash
# Quick fix: Comment out all Firebase import lines

cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

echo "Commenting out Firebase imports..."

# Find all TypeScript files with firebase imports and comment them out
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  if grep -q "@/lib/firebase" "$file" 2>/dev/null; then
    echo "Fixing: $file"
    # Comment out firebase import lines
    sed -i '' 's/^import.*@\/lib\/firebase.*/\/\/ &/' "$file"
    sed -i '' 's/^import.*firebase\/.*/\/\/ &/' "$file"
  fi
done

echo "✅ Done! All Firebase imports commented out"
