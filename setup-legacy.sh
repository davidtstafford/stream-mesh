#!/bin/bash

# Stream Mesh Legacy Setup Script
# This script sets up the legacy-compatible version for macOS 10.15.7 (Catalina)

set -e

echo "🔄 Setting up Stream Mesh Legacy for macOS 10.15.7 (Catalina) compatibility..."

# Function to print colored output
print_status() {
    echo -e "\033[1;32m✅ $1\033[0m"
}

print_warning() {
    echo -e "\033[1;33m⚠️  $1\033[0m"
}

print_error() {
    echo -e "\033[1;31m❌ $1\033[0m"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "This script is designed for macOS. Proceeding anyway..."
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Catalina build works best with Node.js 16-18."
    print_warning "Consider using nvm to switch: nvm use 18"
elif [ "$NODE_VERSION" -gt 18 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Catalina build works best with Node.js 16-18."
    print_warning "Consider using nvm to switch: nvm use 18"
fi

# Backup current configuration
if [ -f "package.json" ]; then
    print_status "Backing up current package.json..."
    cp package.json package.json.modern
fi

if [ -f "tsconfig.json" ]; then
    print_status "Backing up current tsconfig.json..."
    cp tsconfig.json tsconfig.json.modern
fi

# Switch to legacy configuration
print_status "Switching to legacy configuration..."
cp package-legacy.json package.json
cp tsconfig-legacy.json tsconfig.json

# Clean existing dependencies
print_status "Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

# Install legacy dependencies
print_status "Installing legacy-compatible dependencies..."
npm install --legacy-peer-deps

# Rebuild native modules
print_status "Rebuilding native modules for current system..."
npm run postinstall

# Create legacy build scripts
print_status "Setting up legacy build scripts..."

cat > scripts/build-legacy.sh << 'EOF'
#!/bin/bash
echo "🏗️  Building Stream Mesh Legacy..."

# Clean previous builds
rm -rf dist release-legacy

# Build TypeScript
echo "📝 Compiling TypeScript..."
npx tsc --project tsconfig.json --outDir dist --noEmit false

# Build webpack
echo "📦 Building webpack bundle..."
npx webpack --config webpack.config.js --mode production

# Copy assets
echo "📁 Copying assets..."
node scripts/copy-obs-assets.js

# Build Electron app
echo "⚡ Building Electron application..."
npx electron-builder --mac --config electron-builder-legacy.json

echo "✅ Legacy build complete! Check release-legacy/ folder."
EOF

chmod +x scripts/build-legacy.sh

# Create restore script
cat > scripts/restore-modern.sh << 'EOF'
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
EOF

chmod +x scripts/restore-modern.sh

print_status "Legacy setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the application: npm start"
echo "   2. Build legacy version: ./scripts/build-legacy.sh"
echo "   3. Restore modern config: ./scripts/restore-modern.sh"
echo ""
echo "🎯 Catalina Legacy features:"
echo "   • Electron 22.3.27 (optimized for macOS 10.15.7 Catalina)"
echo "   • Node.js 16-18 compatibility"
echo "   • TypeScript 5.0.4 with ES2020 target"
echo "   • All core Stream Mesh functionality preserved"
echo ""
print_warning "Test thoroughly on your target system before deploying!"
