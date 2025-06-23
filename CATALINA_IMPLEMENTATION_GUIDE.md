# Stream Mesh Catalina Backward Compatibility Implementation Guide

## Overview
This guide details how to implement backward compatibility for macOS 10.15.7 (Catalina) on older Intel Macs (2012-2017 era). The implementation creates a separate legacy build configuration alongside the modern build system.

## Table of Contents
1. [Core Issue: Electron & Node.js Compatibility](#core-issue)
2. [Required Configuration Files](#required-configuration-files)
3. [Twitch OAuth Fetch Fix](#twitch-oauth-fetch-fix)
4. [Build Scripts](#build-scripts)
5. [GitHub Actions Integration](#github-actions-integration)
6. [Testing & Validation](#testing-validation)

---

## Core Issue: Electron & Node.js Compatibility

**Problem**: Modern Electron versions (32+) require macOS 11+ and Node.js 18+, making them incompatible with Catalina (10.15.7) and older Intel Macs.

**Solution**: Create a parallel legacy build configuration using:
- **Electron 22.3.27** (supports macOS 10.15.0+)
- **Node.js 16.15.0** (embedded in Electron 22.3.27)
- **TypeScript 5.0.4** (compatible with older Node.js)
- **React 18.2.0** (broader compatibility than React 19)

**Critical Issue**: The Twitch OAuth fails because `fetch` is not defined in the Node.js environment used by Electron 22.3.27 (which includes Node.js 16.15.0). The `fetch` API was only added to Node.js natively in version 17.5.0.

---

## Required Configuration Files

### 1. Legacy Package Configuration: `package-legacy.json`
```json
{
  "name": "streammesh-legacy",
  "version": "2.0.0-legacy",
  "description": "Stream Mesh - Legacy build for macOS 10.15.7 (Catalina)",
  "main": "dist/backend/main.js",
  "engines": {
    "node": ">=16.0.0 <19.0.0",
    "npm": ">=7.0.0"
  },
  "scripts": {
    "start": "concurrently \"npm:serve\" \"npm:electron\"",
    "serve": "webpack serve --config webpack.config.js --mode development",
    "electron": "wait-on http://localhost:3000 && cross-env NODE_ENV=development electron .",
    "build": "tsc && webpack --config webpack.config.js --mode production && node scripts/copy-obs-assets.js",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "postinstall": "electron-rebuild"
  },
  "devDependencies": {
    "electron": "22.3.27",
    "electron-builder": "23.6.0",
    "electron-rebuild": "3.2.9",
    "typescript": "5.0.4",
    "@types/node": "16.18.104",
    "@types/react": "18.2.79",
    "@types/react-dom": "18.2.24",
    "concurrently": "7.6.0",
    "cross-env": "7.0.3",
    "wait-on": "7.2.0",
    "webpack": "5.91.0",
    "webpack-cli": "5.1.4",
    "webpack-dev-server": "4.15.2",
    "ts-loader": "9.5.1",
    "css-loader": "6.11.0",
    "style-loader": "3.3.4"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "sqlite3": "5.1.6",
    "ws": "8.17.1",
    "tmi.js": "1.8.5",
    "express": "4.19.2",
    "electron-store": "8.2.0"
  }
}
```

### 2. Legacy TypeScript Configuration: `tsconfig-legacy.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist/backend",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node", "electron"]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "release",
    "release-legacy",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### 3. Legacy Electron Builder Configuration: `electron-builder-legacy.json`
```json
{
  "appId": "com.streammesh.app.catalina",
  "productName": "Stream Mesh Catalina",
  "copyright": "Copyright © 2024 Stream Mesh",
  "directories": {
    "output": "release-legacy"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraFiles": [
    {
      "from": "src/ui/assets",
      "to": "Resources/assets"
    }
  ],
  "npmRebuild": false,
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64"]
      }
    ],
    "minimumSystemVersion": "10.15.0"
  },
  "dmg": {
    "title": "Stream Mesh Catalina Installer",
    "background": null,
    "window": {
      "width": 600,
      "height": 400
    },
    "contents": [
      {
        "x": 150,
        "y": 200,
        "type": "file"
      },
      {
        "x": 450,
        "y": 200,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "win": {
    "target": "nsis",
    "icon": "src/icon.png"
  },
  "linux": {
    "target": "AppImage",
    "category": "Utility"
  }
}
```

---

## Twitch OAuth Fetch Fix

**Critical Issue**: The Twitch OAuth authentication fails because `fetch` is not available in Node.js 16.15.0.

### Location: `src/main.ts` (approximately line 563)

### Before (Problematic Code):
```typescript
// Fetch the username using the Twitch API
const userInfoRes = await fetch('https://api.twitch.tv/helix/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Client-Id': credentials.client_id,
  },
});
const userInfo = await userInfoRes.json();
```

### After (Fixed Code):
```typescript
// Fetch the username using the Twitch API (using https module for legacy compatibility)
const userInfo = await new Promise<any>((resolve, reject) => {
  const https = require('https');
  const options = {
    hostname: 'api.twitch.tv',
    path: '/helix/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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
});
```

**Why This Fix Works**:
- Uses Node.js built-in `https` module (available since Node.js 0.10)
- No additional dependencies required
- Maintains identical API behavior
- Preserves error handling and TypeScript support

---

## Build Scripts

### 1. Legacy Setup Script: `setup-legacy.sh`
```bash
#!/bin/bash

echo "🔄 Setting up Stream Mesh Legacy for macOS 10.15.7 (Catalina) compatibility..."

# Check Node.js version warning
NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -gt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Catalina build works best with Node.js 16-18."
    echo "⚠️  Consider using nvm to switch: nvm use 18"
fi

# Backup current configuration
echo "✅ Backing up current package.json..."
cp package.json package.json.modern

echo "✅ Backing up current tsconfig.json..."
cp tsconfig.json tsconfig.json.modern

# Switch to legacy configuration
echo "✅ Switching to legacy configuration..."
cp package-legacy.json package.json
cp tsconfig-legacy.json tsconfig.json

# Clean and install dependencies
echo "✅ Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

echo "✅ Installing legacy-compatible dependencies..."
npm install

echo "✅ Rebuilding native modules for current system..."
npm run postinstall

# Create build scripts directory if it doesn't exist
mkdir -p scripts

# Create build script
cat > scripts/build-legacy.sh << 'EOF'
#!/bin/bash
echo "🏗️  Building Stream Mesh Legacy..."
echo "📝 Compiling TypeScript..."
npx tsc --project tsconfig.json
echo "📦 Building webpack bundle..."
npx webpack --config webpack.config.js --mode production
echo "📁 Copying assets..."
node scripts/copy-obs-assets.js
echo "⚡ Building Electron application..."
npx electron-builder --config electron-builder-legacy.json --mac
echo "✅ Legacy build complete! Check release-legacy/ folder."
EOF

# Create restore script
cat > scripts/restore-modern.sh << 'EOF'
#!/bin/bash
echo "🔄 Restoring modern Stream Mesh configuration..."
if [ -f "package.json.modern" ]; then
    cp package.json.modern package.json
    echo "✅ Restored modern package.json"
else
    echo "❌ No backup found for package.json"
fi
if [ -f "tsconfig.json.modern" ]; then
    cp tsconfig.json.modern tsconfig.json
    echo "✅ Restored modern tsconfig.json"
else
    echo "❌ No backup found for tsconfig.json"
fi
rm -rf node_modules package-lock.json
npm install
echo "✅ Modern configuration restored!"
EOF

chmod +x scripts/build-legacy.sh
chmod +x scripts/restore-modern.sh

echo "✅ Setting up legacy build scripts..."

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
echo "   • TypeScript 5.0.4 with ES2020 target"
echo "   • All core Stream Mesh functionality preserved"
echo ""
echo "⚠️  Test thoroughly on your target system before deploying!"
```

### 2. Build Script: `scripts/build-legacy.sh`
```bash
#!/bin/bash
echo "🏗️  Building Stream Mesh Legacy..."
echo "📝 Compiling TypeScript..."
npx tsc --project tsconfig.json
echo "📦 Building webpack bundle..."
npx webpack --config webpack.config.js --mode production
echo "📁 Copying assets..."
node scripts/copy-obs-assets.js
echo "⚡ Building Electron application..."
npx electron-builder --config electron-builder-legacy.json --mac
echo "✅ Legacy build complete! Check release-legacy/ folder."
```

---

## GitHub Actions Integration

### 1. Updated Build Check: `.github/workflows/build-check.yml`

Add this job to the existing workflow:

```yaml
  build-catalina:
    needs: security-check
    runs-on: macos-13  # Intel Mac for Catalina compatibility
    if: needs.security-check.outputs.safe-to-build == 'true'
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'  # Use Node.js 18 for legacy build
    - name: Setup legacy environment
      run: |
        cp package-legacy.json package.json
        cp tsconfig-legacy.json tsconfig.json
    - name: Install legacy dependencies
      run: npm ci
    - name: Apply Twitch OAuth fetch fix
      run: |
        # Apply the fetch fix to main.ts
        sed -i '' 's/const userInfoRes = await fetch/\/\/ Fetch fix applied automatically/' src/main.ts
        # Insert the https module fix
        python3 -c "
import re
with open('src/main.ts', 'r') as f:
    content = f.read()
# Replace the fetch call with https module
old_pattern = r'const userInfoRes = await fetch\(\'https://api\.twitch\.tv/helix/users\', \{[^}]*\}\);\s*const userInfo = await userInfoRes\.json\(\);'
new_code = '''const userInfo = await new Promise<any>((resolve, reject) => {
  const https = require('https');
  const options = {
    hostname: 'api.twitch.tv',
    path: '/helix/users',
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
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
});'''
content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)
with open('src/main.ts', 'w') as f:
    f.write(content)
"
    - name: Build legacy application
      run: |
        npm run build
        npx electron-builder --config electron-builder-legacy.json --mac
    - name: Verify Catalina DMG
      run: |
        ls -la release-legacy/
        echo "Checking for Catalina DMG..."
        if find release-legacy/ -name "*Catalina*.dmg" | grep -q .; then 
          echo "✅ Catalina DMG found"
        else 
          echo "❌ Catalina DMG missing"
          exit 1
        fi
```

### 2. Updated Release Workflow: `.github/workflows/release.yml`

Add this job to the existing workflow:

```yaml
  build-catalina:
    runs-on: macos-13  # Intel Mac for Catalina compatibility
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'  # Use Node.js 18 for legacy build
    - name: Setup legacy environment
      run: |
        cp package-legacy.json package.json
        cp tsconfig-legacy.json tsconfig.json
    - run: npm ci
    - name: Apply Twitch OAuth fetch fix
      run: |
        # Apply the same fetch fix as in build-check
        python3 -c "
import re
with open('src/main.ts', 'r') as f:
    content = f.read()
old_pattern = r'const userInfoRes = await fetch\(\'https://api\.twitch\.tv/helix/users\', \{[^}]*\}\);\s*const userInfo = await userInfoRes\.json\(\);'
new_code = '''const userInfo = await new Promise<any>((resolve, reject) => {
  const https = require('https');
  const options = {
    hostname: 'api.twitch.tv',
    path: '/helix/users',
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
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
});'''
content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)
with open('src/main.ts', 'w') as f:
    f.write(content)
"
    - run: npm run build
    - run: npx electron-builder --config electron-builder-legacy.json --mac
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - uses: actions/upload-artifact@v4
      with:
        name: catalina-dmg
        path: release-legacy/*.dmg
```

Update the release job to include the Catalina DMG:

```yaml
  release:
    needs: [build-intel, build-arm, build-windows, build-catalina]  # Add build-catalina
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: write
    steps:
    - uses: actions/checkout@v4
    - id: version
      run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT
    - uses: actions/download-artifact@v4
      with:
        name: intel-dmg
        path: ./release/
    - uses: actions/download-artifact@v4
      with:
        name: arm-dmg
        path: ./release/
    - uses: actions/download-artifact@v4
      with:
        name: windows-exe
        path: ./release/
    - uses: actions/download-artifact@v4  # Add Catalina DMG download
      with:
        name: catalina-dmg
        path: ./release/
    - run: ls -la ./release/
    - env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        gh release create "v${{ steps.version.outputs.version }}" \
          --title "Stream Mesh v${{ steps.version.outputs.version }}" \
          --notes "Automated release - includes Catalina compatibility" \
          ./release/*
```

---

## Testing & Validation

### 1. Local Testing Steps
```bash
# 1. Setup legacy environment
./setup-legacy.sh

# 2. Test application startup
npm start

# 3. Build legacy distribution
./scripts/build-legacy.sh

# 4. Verify build outputs
ls -la release-legacy/
file release-legacy/*.dmg

# 5. Test on target hardware (macOS 10.15.7)
# - Install and launch application
# - Test Twitch OAuth authentication
# - Verify all core functionality

# 6. Restore modern environment
./scripts/restore-modern.sh
```

### 2. Compatibility Matrix

| Component | Modern Version | Legacy Version | Catalina Support |
|-----------|---------------|----------------|------------------|
| Electron | 36.x | 22.3.27 | ✅ Yes |
| Node.js | 20+ | 16.15.0 | ✅ Yes |
| TypeScript | 5.8.x | 5.0.4 | ✅ Yes |
| React | 19.x | 18.2.0 | ✅ Yes |
| macOS Target | 11.0+ | 10.15.0+ | ✅ Yes |
| fetch API | ✅ Native | ❌ Fixed with https | ✅ Yes |

### 3. Build Outputs

After successful implementation, you should have:

- **Modern Build**: `Stream Mesh-X.X.X.dmg` (Intel + ARM)
- **Legacy Build**: `Stream Mesh Catalina-X.X.X-legacy.dmg` (Intel only)
- **Windows Build**: `Stream Mesh Setup X.X.X.exe`

### 4. Deployment Checklist

- [ ] All configuration files created
- [ ] Twitch OAuth fetch fix applied
- [ ] Build scripts executable
- [ ] GitHub Actions updated
- [ ] Local testing completed
- [ ] Target hardware testing completed
- [ ] Documentation updated

---

## Implementation Summary

This implementation creates a complete backward compatibility system for macOS Catalina while maintaining the modern build system. The key points are:

1. **Separate Configuration**: Legacy configs don't interfere with modern development
2. **Electron Downgrade**: Version 22.3.27 supports Catalina (10.15.0+)
3. **Critical Fix**: Twitch OAuth fetch replaced with Node.js https module
4. **Automated Builds**: GitHub Actions builds both modern and legacy versions
5. **Easy Switching**: Scripts to switch between configurations
6. **Full Compatibility**: All Stream Mesh features preserved

The system allows you to:
- Develop normally with modern tooling
- Build legacy versions for older Macs
- Deploy both versions simultaneously
- Maintain a single codebase

**Note**: Test thoroughly on actual Catalina hardware before deploying to ensure full compatibility.
