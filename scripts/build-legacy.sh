#!/bin/bash
set -e  # Exit on any error
echo "🏗️  Building Stream Mesh Legacy..."

# Apply fetch fix for legacy compatibility
echo "� Applying Twitch OAuth fetch fix..."
if [ ! -f "src/main.ts.backup" ]; then
    cp src/main.ts src/main.ts.backup
fi

# Apply the fix using Node.js
node -e "
const fs = require('fs');
const content = fs.readFileSync('src/main.ts', 'utf8');

// Replace the fetch call with https module
const oldPattern = /\/\/ Fetch the username using the Twitch API\s*const userInfoRes = await fetch\('https:\/\/api\.twitch\.tv\/helix\/users', \{[\s\S]*?\}\);\s*const userInfo = await userInfoRes\.json\(\);/;
const newCode = \`// Fetch the username using the Twitch API (using https module for legacy compatibility)
      const userInfo = await new Promise<any>((resolve, reject) => {
        const https = require('https');
        const options = {
          hostname: 'api.twitch.tv',
          path: '/helix/users',
          method: 'GET',
          headers: {
            'Authorization': \\\`Bearer \\\${accessToken}\\\`,
            'Client-Id': credentials.client_id,
          },
        };
        const req = https.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });\`;

const newContent = content.replace(oldPattern, newCode);
if (newContent === content) {
  console.log('⚠️  Warning: Fetch fix pattern not found - manual fix may be needed');
} else {
  console.log('✅ Fetch fix applied successfully');
}
fs.writeFileSync('src/main.ts', newContent, 'utf8');
"

echo "�📝 Compiling TypeScript..."
npx tsc --project tsconfig.json --outDir dist --noEmit false
echo "📦 Building webpack bundle..."
npx webpack --config webpack.config.js --mode production
echo "📁 Copying assets..."
node scripts/copy-obs-assets.js
echo "⚡ Building Electron application..."
echo "DEBUG: Current directory: $(pwd)"
echo "DEBUG: Node version: $(node --version)"
echo "DEBUG: Available disk space: $(df -h .)"

# Set environment variables for better CI compatibility
export CI=true
export USE_HARD_LINKS=false

# Run electron-builder with explicit DMG creation
echo "📦 Creating DMG installer..."
npx electron-builder --config electron-builder-legacy.json --mac --publish=never

# Verify DMG was created
if [ -f "release-legacy/Stream Mesh Catalina-"*.dmg ]; then
    echo "✅ DMG created successfully!"
    ls -la release-legacy/*.dmg
else
    echo "❌ DMG creation failed!"
    exit 1
fi

# Restore original main.ts
if [ -f "src/main.ts.backup" ]; then
    cp src/main.ts.backup src/main.ts
    echo "✅ Restored original main.ts"
fi

echo "✅ Legacy build complete! Check release-legacy/ folder."
