# Stream Mesh - Build Instructions

## Prerequisites

### For All Platforms
- Node.js 18+ and npm
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

### Cross-Platform Building
- Building for Windows from macOS requires Wine: `brew install wine`
- Building for macOS from Windows is not supported

### Icon Issues
- macOS icons should be 512x512 PNG or ICNS format
- Windows icons should be 256x256 PNG or ICO format
- Place icons in `src/` directory and update `package.json` paths

## macOS Catalina Support

### ⚠️ Important: Clean Installation Required

**Before installing any new version**, especially on Catalina, users should follow the [CLEAN-INSTALL-GUIDE.md](CLEAN-INSTALL-GUIDE.md) to remove all previous app data and prevent memory leak issues.

### Catalina Legacy Build
For macOS Catalina (10.15.x) users, use the legacy build:
```bash
./scripts/build-legacy.sh
```

This creates `Stream Mesh Catalina-2.1.0.dmg` in the `release-legacy/` directory with:
- Backward compatible Electron version (22.3.27)
- Legacy Node.js compatibility fixes (Twitch OAuth)
- Memory leak fixes and automatic temp file cleanup
- TTS timeout protection for older macOS
- Optimized memory management for older macOS

### Known Catalina Issues

#### TTS Stops Working After 5+ Hours
- **Cause**: Memory leaks and network timeouts on older Node.js
- **Solution**: Restart the app every 3-4 hours during long streams
- **Prevention**: Use the legacy build and follow the troubleshooting guide

#### Diagnostic Tool
Run the diagnostic script to check for issues:
```bash
./scripts/diagnose-catalina.sh
```

For detailed troubleshooting, see [CATALINA-TROUBLESHOOTING.md](CATALINA-TROUBLESHOOTING.md).

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
