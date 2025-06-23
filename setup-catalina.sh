#!/bin/bash

echo "🔄 Setting up Stream Mesh Legacy for macOS 10.15.7 (Catalina) compatibility..."

# Check Node.js version warning
NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -gt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Catalina build works best with Node.js 16-18."
    echo "⚠️  Consider using nvm to switch: nvm use 18"
fi

# Backup current configuration
echo "✅ Backing up current configuration..."
cp package.json package.json.modern
cp tsconfig.json tsconfig.json.modern

# Switch to legacy configuration
echo "✅ Switching to legacy configuration..."
cp package-legacy.json package.json
cp tsconfig-legacy.json tsconfig.json

# Clean and install dependencies
echo "✅ Installing legacy-compatible dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "✅ Legacy setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the application: npm start"
echo "   2. Build legacy version: ./scripts/build-legacy.sh"  
echo "   3. Restore modern config: ./scripts/restore-modern.sh"
echo ""
echo "🎯 Catalina Legacy features:"
echo "   • Electron 22.3.27 (optimized for macOS 10.15.7 Catalina)"
echo "   • Node.js 16-18 compatibility" 
echo "   • All core Stream Mesh functionality preserved"
