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
