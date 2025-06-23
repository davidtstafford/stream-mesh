#!/bin/bash
echo "🔄 Restoring modern Stream Mesh configuration..."

# Use git to restore original files (more reliable than backups)
git checkout HEAD -- package.json tsconfig.json
echo "✅ Restored modern configuration from git"

# Reinstall modern dependencies
echo "✅ Installing modern dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "✅ Modern configuration restored!"
