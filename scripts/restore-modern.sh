#!/bin/bash
echo "🔄 Restoring modern configuration..."

if [ -f "package.json.modern" ]; then
    cp package.json.modern package.json
    echo "✅ Restored modern package.json"
else
    echo "❌ No modern package.json backup found"
fi

if [ -f "tsconfig.json.modern" ]; then
    cp tsconfig.json.modern tsconfig.json
    echo "✅ Restored modern tsconfig.json"
else
    echo "❌ No modern tsconfig.json backup found"
fi

rm -rf node_modules package-lock.json
npm install

echo "✅ Modern configuration restored!"
