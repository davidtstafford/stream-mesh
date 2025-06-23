# Stream Mesh Legacy - macOS 10.15.7 (Catalina) Compatibility

This is a legacy-compatible version of Stream Mesh designed to run on macOS Catalina systems, specifically optimized for macOS 10.15.7.

## 🎯 **Compatibility Target**
- **Primary**: 2012 MacBook Pro with macOS 10.15.7 (Catalina)
- **Supported**: macOS 10.15.0+ 
- **Architecture**: Intel x64

## 🔧 **Quick Setup**

### Prerequisites
```bash
# Install Node.js 16-18 (recommended: 18.x)
# If using nvm:
nvm install 18
nvm use 18

# Verify versions
node --version  # Should be 16.x - 18.x
npm --version   # Should be 7.x - 9.x
```

### Installation
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd stream-mesh

# Run legacy setup script
./setup-legacy.sh

# Test the application
npm start
```

## 📦 **What Changed for Legacy Compatibility**

### Core Dependencies
| Component | Modern | Legacy | Change Reason |
|-----------|--------|--------|---------------|
| **Electron** | 36.3.1 | 22.3.27 | Catalina optimization |
| **Node.js Target** | 20+ | 16-18 | Electron 22 requirement |
| **TypeScript** | 5.8.3 | 5.0.4 | Modern with stability |
| **React** | 19.1.0 | 18.2.0 | Proven compatibility |
| **Webpack** | 5.99.9 | 5.88.0 | Stable for Catalina |

### Build Configuration
- **Target ES Version**: ES2020 (optimized for Catalina)
- **Minimum macOS**: 10.15.0 (Catalina and later)
- **Architecture**: x64 Intel
- **Security**: Reduced for older system compatibility

## 🚀 **Usage**

### Development
```bash
# Start development server
npm start

# The app will open with:
# - React dev server on http://localhost:3000
# - Electron window with hot reload
```

### Building for Distribution
```bash
# Build legacy version
./scripts/build-legacy.sh

# Output will be in:
# - release-legacy/Stream Mesh Catalina-*.dmg
```

### Switching Back to Modern
```bash
# Restore modern configuration
./scripts/restore-modern.sh
```

## ⚠️ **Known Limitations**

### 1. **Performance**
- Electron 13 is slower than modern versions
- Some rendering optimizations unavailable
- Memory usage may be higher

### 2. **Security**
- Older Electron security model
- Some modern protections disabled
- Manual security review recommended

### 3. **Features**
- No Apple Silicon support
- Limited modern JavaScript features
- Some newer Node.js APIs unavailable

### 4. **Development**
- Hot reload may be slower
- Some dev tools features limited
- Build times may increase

## 🔍 **Testing Checklist**

Before deploying on target hardware:

### Basic Functionality
- [ ] Application launches successfully
- [ ] Main window renders correctly
- [ ] Navigation between screens works
- [ ] Database operations function

### Core Features
- [ ] Twitch integration connects
- [ ] Chat messages display
- [ ] Event system works
- [ ] TTS functionality
- [ ] OBS integration
- [ ] Event windows open/close

### System Integration
- [ ] File operations work
- [ ] Network requests succeed
- [ ] SQLite database accessible
- [ ] Audio/video features function

### Build Process
- [ ] Development build works
- [ ] Production build completes
- [ ] DMG installer creates successfully
- [ ] App runs from installed location

## 🛠️ **Troubleshooting**

### Common Issues

#### "Cannot find module" errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### Native module compilation fails
```bash
# Ensure Xcode command line tools
xcode-select --install

# Rebuild native modules
npm run postinstall
```

#### Electron doesn't start
```bash
# Check Node.js version
node --version  # Should be 14-16

# Try with legacy flags
npm start --legacy-peer-deps
```

#### SQLite3 compilation issues
```bash
# Force SQLite3 rebuild
npm rebuild sqlite3
```

### Performance Issues
- Close unnecessary applications
- Ensure adequate free disk space (>2GB)
- Monitor Activity Monitor during operation

## 📁 **File Structure Changes**

```
stream-mesh/
├── package-legacy.json         # Legacy dependencies
├── tsconfig-legacy.json        # Legacy TypeScript config
├── electron-builder-legacy.json # Legacy build config
├── setup-legacy.sh            # Setup script
├── LEGACY_COMPATIBILITY.md    # This guide
├── scripts/
│   ├── build-legacy.sh        # Legacy build script
│   └── restore-modern.sh      # Restore script
└── release-legacy/            # Legacy build output
```

## 🔄 **Version Management**

### Git Workflow
```bash
# Create legacy branch
git checkout -b legacy-macos-10.12

# Commit legacy changes
git add .
git commit -m "Add legacy compatibility for macOS 10.12+"

# Switch between versions
git checkout main          # Modern version
git checkout legacy-macos-10.12  # Legacy version
```

### Deployment Strategy
- **Modern builds**: Use main branch for macOS 10.15+
- **Legacy builds**: Use legacy branch for macOS 10.12+
- **Dual distribution**: Provide both versions on releases

## 📞 **Support**

### If Issues Persist
1. **Check system requirements** - Ensure macOS 10.12.7+
2. **Verify Node.js version** - Must be 14.x-16.x
3. **Test on target hardware** - Development vs production differences
4. **Consider alternatives** - Web version or remote access

### Alternative Solutions
- **Web Application**: Run backend only, access via browser
- **Docker**: Containerized deployment
- **Remote Access**: Run on newer system, access remotely

## 📝 **Maintenance Notes**

This legacy version:
- Should be maintained separately from modern version
- Requires testing on actual target hardware
- May need security updates independently
- Should be deprecated when hardware is upgraded

---

**Last Updated**: June 2025  
**Electron Version**: 13.6.9  
**Target System**: macOS 10.12.7 Sierra (2012 MacBook Pro)
