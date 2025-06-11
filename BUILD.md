# Stream Mesh - Build Instructions

## Prerequisites

### For All Platforms
- Node.js 22+ and npm (Node.js 18+ also supported but 22+ recommended for CI)
- Git

### For macOS Builds
- macOS 10.15+ (for building)
- Xcode Command Line Tools: `xcode-select --install`

### For Windows Builds
- Windows 10+ or macOS/Linux with Wine (for cross-compilation)
- For native Windows builds: Windows SDK and Visual Studio Build Tools

## Building the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Development
```bash
npm start
```

### 3. Build for Production

#### Build All Platforms (from macOS)
```bash
npm run dist:all
```

#### Build for macOS Only
```bash
npm run dist:mac
```

#### Build for macOS (specific architecture)
```bash
# Intel Mac (x64)
npm run dist:mac -- --x64

# Apple Silicon Mac (arm64)
npm run dist:mac -- --arm64
```

#### Build for Windows Only
```bash
npm run dist:win
```

#### Build for Current Platform
```bash
npm run dist
```

## Output

Built applications will be placed in the `release/` directory:

- **macOS**: `Stream Mesh-1.0.0.dmg` and `Stream Mesh-1.0.0-arm64.dmg`
- **Windows**: `Stream Mesh Setup 1.0.0.exe`

## Build Configuration

The build configuration is defined in `package.json` under the `"build"` section:

- **App ID**: `com.streammesh.app`
- **Product Name**: `Stream Mesh`
- **macOS**: Creates universal DMG for Intel and Apple Silicon
- **Windows**: Creates NSIS installer for x64

## Code Signing (Optional)

### macOS Code Signing
To sign your macOS app for distribution:

1. Get an Apple Developer account
2. Create certificates in Xcode or Apple Developer portal
3. Add to your build config:
```json
"mac": {
  "identity": "Developer ID Application: Your Name",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist"
}
```

### Windows Code Signing
For Windows code signing:

1. Get a code signing certificate
2. Add to your build config:
```json
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "password"
}
```

## Troubleshooting

### Native Dependencies
If you encounter issues with native dependencies (like sqlite3):
```bash
npm run electron-rebuild
```

### Architecture Mismatch Issues
If you get `incompatible architecture` errors (e.g., `have 'arm64', need 'x86_64'`):

**For Intel Macs:**
```bash
# Force rebuild for x64 architecture
npx electron-rebuild --arch=x64
npm run dist:mac -- --x64
```

**For Apple Silicon Macs:**
```bash
# Force rebuild for arm64 architecture  
npx electron-rebuild --arch=arm64
npm run dist:mac -- --arm64
```

**Note:** GitHub Actions automatically builds both architectures using dedicated Intel and ARM64 runners.

### Cross-Platform Building
- Building for Windows from macOS requires Wine: `brew install wine`
- Building for macOS from Windows is not supported

### Icon Issues
- macOS icons should be 512x512 PNG or ICNS format
- Windows icons should be 256x256 PNG or ICO format
- Place icons in `src/` directory and update `package.json` paths

## Distribution

### macOS
- DMG files can be distributed directly
- For Mac App Store: use `mas` target instead of `dmg`
- For broader distribution: consider notarization

### Windows
- EXE installer can be distributed directly
- For Microsoft Store: use `appx` target instead of `nsis`

## Auto-Updates (Optional)

To enable auto-updates:

1. Install electron-updater:
```bash
npm install electron-updater
```

2. Add update server configuration to build config
3. Implement update checking in your main process

## Performance Tips

- Use `electron-builder --publish=never` to skip publishing
- Use `--x64` or `--arm64` to build for specific architectures only
- Use `--dir` for faster builds without packaging (development)
