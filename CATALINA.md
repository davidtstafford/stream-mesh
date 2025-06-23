# Stream Mesh Catalina Compatibility

This implementation provides backward compatibility for **macOS 10.15.7 (Catalina)** on older Intel Macs.

## Quick Setup

### For Catalina Legacy Build

```bash
# Switch to legacy environment
./setup-catalina.sh

# Build Catalina-compatible DMG
./scripts/build-legacy.sh

# Restore modern environment
./scripts/restore-modern.sh
```

## What's Included

- `package-legacy.json` - Electron 22.3.27, React 18.2.0, TypeScript 5.0.4
- `tsconfig-legacy.json` - Compatible TypeScript configuration
- `electron-builder-legacy.json` - Catalina build configuration
- Updated GitHub Actions for automatic legacy builds

## Build Outputs

- **Modern**: `Stream Mesh-X.X.X.dmg` (macOS 11+, Intel + ARM)
- **Legacy**: `Stream Mesh Catalina-X.X.X-legacy.dmg` (macOS 10.15+, Intel only)
- **Windows**: `Stream Mesh Setup X.X.X.exe`

## Technical Details

### Key Changes for Catalina
- **Electron**: 36.x → 22.3.27 (supports macOS 10.15.0+)
- **Node.js**: 22+ → 16.15.0 (embedded in Electron 22.3.27)
- **Fetch Fix**: Twitch OAuth uses `https` module instead of `fetch` API
- **React**: 19.x → 18.2.0 for broader compatibility

### Critical Fix Applied
The build process automatically replaces the modern `fetch` API calls with Node.js `https` module for Twitch OAuth compatibility in older Node.js versions.

## Deployment

Both modern and legacy builds are created automatically via GitHub Actions when pushing to `main`. The legacy build targets Intel Macs running macOS 10.15.7 (Catalina) and maintains full Stream Mesh functionality.
