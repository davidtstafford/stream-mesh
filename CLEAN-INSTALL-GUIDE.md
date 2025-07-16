# Stream Mesh - Clean Installation Guide

## ⚠️ Important: Clean Up Before Installing New Version

**Especially important for macOS Catalina users experiencing TTS stops or crashes.**

Before installing the new version of Stream Mesh, please follow these cleanup steps to prevent issues with memory leaks, corrupted data, and temp file buildup.

## 🧹 Step 1: Complete Uninstall

### Remove the Application
1. **Quit Stream Mesh** completely (Cmd+Q or right-click dock icon → Quit)
2. **Wait 30 seconds** to ensure all processes have stopped
3. **Delete the app**:
   - Move `Stream Mesh.app` from `/Applications` to Trash
   - Or move `Stream Mesh Catalina.app` to Trash (if using legacy version)
4. **Empty Trash**

### Clear Application Data
Stream Mesh stores data in your user directory. **You need to delete this folder**:

```bash
# Open Terminal and run:
rm -rf ~/Library/Application\ Support/streammesh*
```

Or manually:
1. Open **Finder**
2. Press **Cmd+Shift+G** (Go to Folder)
3. Type: `~/Library/Application Support/`
4. Delete any folders starting with `streammesh`

## 🗂️ Step 2: Clean System Cache

### Clear Electron Cache
```bash
# In Terminal:
rm -rf ~/Library/Caches/streammesh*
rm -rf ~/Library/Caches/com.streammesh*
```

### Clear Session Data
```bash
# Remove any stored session data:
rm -rf ~/Library/Application\ Support/Electron
```

## 🔐 Step 3: Reset Credentials (Optional but Recommended)

If you want to start completely fresh:

### Twitch
- Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
- Delete your old Stream Mesh app registration
- You'll create a new one when you set up the new version

### AWS Polly
- Your AWS credentials are fine to keep
- But you'll need to re-enter them in the new app

### Kick.com
- No action needed - OAuth will re-authenticate

## 📱 Step 4: Clear OBS Browser Sources (If Using)

If you have OBS browser sources pointing to Stream Mesh:

1. **Delete old browser sources** in OBS
2. **Clear OBS browser cache**:
   - OBS → Tools → Browser Source Cache → Clear Cache
3. You'll set up new browser sources after installing the new version

## 🆕 Step 5: Install New Version

### For macOS Catalina (10.15.7) Users:
1. Download `Stream Mesh Catalina-X.X.X.dmg`
2. Install normally
3. The new version includes:
   - Memory leak fixes
   - Better temp file cleanup
   - Improved error handling
   - TTS timeout protection

### For Modern macOS Users:
1. Download `Stream Mesh-X.X.X.dmg`
2. Install normally

## ✅ Step 6: Verify Clean Installation

After installing and launching:

1. **Check data directory is clean**:
   ```bash
   ls -la ~/Library/Application\ Support/streammesh/
   ```
   Should only show: `database.db` and config files (no temp files)

2. **Test TTS immediately** - it should work without any setup

3. **Monitor for the first hour** - no temp file buildup should occur

## 🔧 Why This Cleanup is Important

### Previous Version Issues:
- **Memory Leaks**: Temp TTS files accumulating over time
- **Corrupted Settings**: Old config files causing crashes
- **Session Data**: Cached OAuth tokens causing authentication issues
- **Database Bloat**: Event history taking up excessive space

### New Version Fixes:
- ✅ **Automatic cleanup** of temp files every 5 minutes
- ✅ **Timeout protection** for TTS synthesis and playback
- ✅ **Better error handling** prevents cascading failures
- ✅ **Memory management** improvements for Catalina
- ✅ **Queue size limits** prevent memory buildup

## 🚨 Troubleshooting After Clean Install

### If TTS Still Doesn't Work:
1. Check AWS Polly configuration is correct
2. Test with a simple message: `!tts hello world`
3. Check the **Console** (Help → Developer Tools) for errors

### If App Still Crashes:
1. Verify you deleted **all** Stream Mesh data folders
2. Restart your Mac completely
3. Try the diagnostic script: `./scripts/diagnose-catalina.sh`

### If You Lost Important Data:
The cleanup removes:
- ❌ Chat history and events
- ❌ Viewer settings and roles
- ❌ Custom command configurations
- ❌ AWS Polly voice preferences
- ✅ Your Twitch/Kick OAuth still works (will re-authenticate)

## 📞 Support

If you continue to experience issues after following this guide:
1. Run the diagnostic script: `./scripts/diagnose-catalina.sh`
2. Check `CATALINA-TROUBLESHOOTING.md` for known issues
3. Report issues with diagnostic output

---

**This cleanup ensures you get the full benefit of the memory leak fixes and stability improvements in the new version.**
