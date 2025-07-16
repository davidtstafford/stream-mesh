# Stream Mesh - Catalina Troubleshooting Guide

## Common Issues on macOS Catalina (10.15.7)

### 🔇 TTS Stops Working After 5+ Hours

**Symptoms:**
- TTS works fine initially
- After 5+ hours, chat events still show but TTS stops speaking
- Queue shows items but nothing plays
- May eventually lead to app crashes

**Root Causes:**
1. **Memory leaks from temp TTS files** accumulating over time
2. **AWS Polly connection timeouts** on older Node.js versions  
3. **Event listener memory buildup** in the TTS queue system
4. **File handle exhaustion** from uncleaned temp files

**Solutions:**

#### Immediate Fix:
```bash
# Force quit and restart the app
pkill -f "Stream Mesh"
# Wait 30 seconds, then relaunch
```

#### Permanent Fix:
1. **Use the new version** with memory leak fixes
2. **Follow the [CLEAN-INSTALL-GUIDE.md](CLEAN-INSTALL-GUIDE.md)** completely
3. **Use the Catalina legacy build** specifically designed for your macOS version

#### Prevention:
- **Restart the app every 3-4 hours** during long streams
- **Monitor temp files**: Run diagnostic script every few hours
- **Use the timeout protection** built into the new version

### 💥 App Crashes After Extended Use

**Symptoms:**
- App worked fine for days/weeks initially
- Now crashes on startup or during use
- Error logs mention memory issues or file access problems

**Root Causes:**
1. **Corrupted database** from improper shutdowns
2. **Excessive temp file accumulation** over weeks of use
3. **Memory pressure** from unreleased resources
4. **Catalina-specific Electron compatibility issues**

**Solutions:**

#### Complete Reset (Recommended):
```bash
# 1. Completely remove all app data
rm -rf ~/Library/Application\ Support/streammesh*
rm -rf ~/Library/Caches/streammesh*
rm -rf ~/Library/Caches/com.streammesh*

# 2. Remove the old app
rm -rf /Applications/Stream\ Mesh*.app

# 3. Restart your Mac
sudo shutdown -r now
```

#### Database Recovery:
If you need to save chat history:
```bash
# Backup database before cleanup
cp ~/Library/Application\ Support/streammesh/StreamMesh.sqlite ~/Desktop/streammesh-backup.sqlite

# After clean install, you can try to restore (advanced users only)
```

### 🐌 Slow Performance & High Memory Usage

**Symptoms:**
- App becomes sluggish over time
- High memory usage in Activity Monitor
- Fans spinning up frequently

**Root Causes:**
1. **Temp TTS files** not being cleaned up (100s of MB over time)
2. **Database bloat** from extensive chat history
3. **Memory leaks** in event listeners and TTS queue

**Solutions:**

#### Check Current Usage:
```bash
# Run the diagnostic script
./scripts/diagnose-catalina.sh
```

#### Clean Database:
1. Open Stream Mesh
2. Go to **Event History** → **Delete All Events**
3. Go to **Viewers** → **Delete All Viewers** (if you don't need the data)
4. Restart the app

#### Monitor Resources:
```bash
# Check app memory usage
ps aux | grep -i "stream mesh"

# Check temp files
ls -la ~/Library/Application\ Support/streammesh/streammesh_tts_*
```

### 🌐 Network/Connection Issues

**Symptoms:**
- Twitch/Kick connections dropping frequently
- OAuth authentication failing
- TTS synthesis failing with network errors

**Root Causes:**
1. **Legacy Node.js fetch** implementation issues on Catalina
2. **SSL/TLS compatibility** problems
3. **Session data corruption** over time

**Solutions:**

#### Use Legacy Build:
The Catalina legacy build includes:
- ✅ **Fixed Twitch OAuth** using `https` module instead of `fetch`
- ✅ **Better error handling** for network timeouts
- ✅ **Connection retry logic** for AWS Polly

#### Clear Session Data:
```bash
# Clear all cached session data
rm -rf ~/Library/Application\ Support/streammesh*/
# Restart and re-authenticate
```

### 🔊 Audio Playback Issues

**Symptoms:**
- TTS files generate but don't play
- Inconsistent audio output
- Audio cutting out mid-sentence

**Root Causes:**
1. **macOS audio permission** issues
2. **Audio device conflicts** with OBS/streaming software
3. **File handle timing** issues on Catalina

**Solutions:**

#### Check Permissions:
1. **System Preferences** → **Security & Privacy** → **Privacy**
2. Check **Microphone** and **Accessibility** permissions for Stream Mesh

#### Audio Device Test:
```bash
# Test audio playback manually
afplay ~/Library/Application\ Support/streammesh/streammesh_tts_*.mp3
```

#### Use External Audio Tool:
If built-in playback fails, try:
1. Route TTS to **OBS only** (mute native playback)
2. Use **Audio Hijack** or similar for audio routing

## 🛠️ Diagnostic Commands

### Quick Health Check:
```bash
# Check if app is running
pgrep -f "Stream Mesh"

# Check memory usage
ps -o pid,rss,command -p $(pgrep -f "Stream Mesh")

# Count temp files
ls ~/Library/Application\ Support/streammesh/streammesh_tts_* 2>/dev/null | wc -l
```

### Full Diagnostic:
```bash
# Run the comprehensive diagnostic
./scripts/diagnose-catalina.sh
```

### Manual Cleanup:
```bash
# Clean temp TTS files manually
rm ~/Library/Application\ Support/streammesh/streammesh_tts_*

# Check database size
du -h ~/Library/Application\ Support/streammesh/StreamMesh.sqlite
```

## 🚨 When to Contact Support

Contact support if:
1. **Clean installation doesn't resolve crashes**
2. **TTS stops working immediately** (not after hours)
3. **Diagnostic script shows unusual errors**
4. **Multiple symptom categories** occur simultaneously

### Include This Information:
1. **Exact macOS version**: `sw_vers`
2. **Diagnostic script output**: `./scripts/diagnose-catalina.sh`
3. **Console logs**: Help → Developer Tools → Console
4. **Steps that reproduce the issue**

## 🎯 Prevention Best Practices

### For Long Streams (8+ hours):
1. **Restart Stream Mesh every 4 hours**
2. **Run diagnostic check every 2 hours**
3. **Monitor memory usage** in Activity Monitor
4. **Clear old events** weekly in Event History

### General Maintenance:
1. **Update to latest legacy build** when available
2. **Follow clean installation guide** for major updates
3. **Don't accumulate months of chat history**
4. **Restart your Mac weekly** to clear system cache

---

**The new version with memory leak fixes should resolve most of these issues, but following these practices ensures optimal performance on Catalina.**

The latest version includes these Catalina-specific fixes:

#### **Memory Management**
- Automatic cleanup of temporary TTS files every 5 minutes
- Queue size limits to prevent memory buildup
- Better error handling to prevent crashes

#### **Network Reliability**
- Connection timeouts for AWS Polly requests
- Retry logic for failed TTS synthesis
- Circuit breaker pattern to handle repeated failures

#### **Stability Features**
- Periodic cleanup of resources
- Better event listener management
- Graceful error recovery

### **⚠️ Prevention Tips**

1. **Monitor Memory Usage**:
   - Watch Activity Monitor for Stream Mesh memory usage
   - If it exceeds 500MB, consider restarting

2. **Network Stability**:
   - Use wired internet connection if possible
   - Avoid VPNs that might cause connection issues

3. **System Maintenance**:
   - Keep plenty of free disk space (>5GB)
   - Close unnecessary applications during streaming

### **🆘 If Issues Persist**

#### **Collect Debug Information**
1. Run the diagnostic script: `./scripts/diagnose-catalina.sh`
2. Check Console app for "Stream Mesh" error messages
3. Look for crash reports in `~/Library/Logs/DiagnosticReports/`

#### **Emergency Workarounds**
1. **Disable TTS Temporarily**: Uncheck "Enable TTS" in settings
2. **Use External TTS**: Consider using OBS browser source with online TTS
3. **Switch to Newer macOS**: If possible, upgrade to macOS Big Sur or later

### **📋 Catalina Compatibility Checklist**

- [ ] Using the legacy build (`Stream Mesh Catalina-2.1.0.dmg`)
- [ ] AWS Polly credentials are configured correctly
- [ ] Internet connection is stable
- [ ] Sufficient free disk space (>5GB)
- [ ] App memory usage is reasonable (<500MB)
- [ ] Restarting app every 3-4 hours during long sessions

---

**Note**: These issues are specific to macOS Catalina's older Node.js and system libraries. Upgrading to macOS Big Sur (11.x) or later will resolve most compatibility issues.
