# Legacy Compatibility Guide for Stream Mesh

## macOS 10.15.7 (Catalina) Compatibility

This guide provides steps to make Stream Mesh compatible with macOS 10.15.7 Catalina systems.

## Key Compatibility Changes

### 1. Electron Version Optimization
- **Current**: Electron 36.3.1 (requires macOS 10.15+, but newer features may not work optimally)
- **Legacy**: Electron 22.3.27 (last version with optimal Catalina support)
- **Node.js**: Use Node 18 (compatible with Electron 22)

### 2. Dependencies Compatibility Matrix

| Component | Current Version | Legacy Version | Reason |
|-----------|----------------|----------------|--------|
| electron | 36.3.1 | 22.3.27 | Optimal Catalina performance |
| electron-builder | 26.0.12 | 23.6.0 | Compatible with Electron 22 |
| @electron/rebuild | 4.0.1 | 3.2.10 | Node 18 compatibility |
| typescript | 5.8.3 | 5.0.4 | Modern features with stability |
| webpack | 5.99.9 | 5.88.0 | Stable version for Catalina |
| react | 19.1.0 | 18.2.0 | Better compatibility |
| sqlite3 | 5.1.7 | 5.1.6 | Latest stable for Catalina |

### 3. Build Configuration Changes

#### Electron Builder Target
- Remove modern macOS-only features
- Use universal builds for better compatibility
- Adjust minimum macOS version

#### TypeScript Configuration
- Downgrade target to ES2020
- Adjust module resolution for older Node

## Implementation Steps

### Step 1: Backup Current Configuration
```bash
cp package.json package.json.modern
cp tsconfig.json tsconfig.json.modern
```

### Step 2: Apply Legacy Package.json
The legacy package.json will be created with compatible versions.

### Step 3: Clear Dependencies and Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Update TypeScript Configuration
Adjust TypeScript settings for legacy compatibility.

### Step 5: Test Build Process
```bash
npm run build
npm run dist:mac
```

## Potential Limitations

### Features That May Need Adjustment
1. **Modern JavaScript Features**: Some ES2022+ features may need polyfills
2. **Native Modules**: May require different compilation flags
3. **Security Features**: Some modern Electron security features unavailable
4. **Performance**: Older Electron may be slower

### Testing Checklist
- [ ] Application starts successfully
- [ ] Database operations work
- [ ] Twitch integration functions
- [ ] UI renders correctly
- [ ] WebSocket connections stable
- [ ] File operations work
- [ ] Build process completes

## Fallback Options

If legacy Electron still has issues:

### Option A: Web Application Mode
- Run backend as standalone Node.js server
- Access via browser instead of Electron
- Maintains all functionality except desktop integration

### Option B: Docker Container
- Package entire application in Docker
- Run on any system with Docker support
- Consistent environment regardless of host OS

### Option C: Remote Access
- Run Stream Mesh on a newer system
- Access remotely via web interface
- Cloud or local server deployment

## Maintenance Notes

This legacy version should be:
- **Maintained separately** from the modern version
- **Tagged** in git for easy access
- **Documented** for future reference
- **Tested** on target hardware before deployment
