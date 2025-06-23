# KICK Integration Troubleshooting Guide

This guide helps resolve common issues with KICK platform integration in Stream Mesh.

## Connection Issues

### "Failed to Connect to KICK"
**Symptoms:** Connection fails during OAuth process
**Solutions:**
1. **Check Internet Connection** - Ensure stable internet access
2. **Browser Issues** - Try a different browser or clear browser cache
3. **Firewall/Antivirus** - Temporarily disable to test connection
4. **OAuth Timeout** - The process times out after 5 minutes, try again
5. **KICK Service Status** - Check [KICK.com](https://kick.com) is accessible

### "Token Expired" Errors
**Symptoms:** Previously connected account shows as disconnected
**Solutions:**
1. **Automatic Refresh** - Tokens refresh automatically, wait 30 seconds
2. **Manual Reconnection** - Click "Connect to KICK" again
3. **Clear Stored Auth** - Disconnect and reconnect completely
4. **Check System Time** - Ensure system clock is accurate

### OAuth Redirect Issues
**Symptoms:** Browser opens but doesn't redirect back to app
**Solutions:**
1. **Port Conflicts** - Ensure port 3301 is available
2. **Manual Copy** - Copy the callback URL from browser to app if needed
3. **Admin Privileges** - Run app as admin (Windows) if needed
4. **Local Network** - Check localhost access isn't blocked

## Event Processing Issues  

### "No KICK Events Showing"
**Symptoms:** Connected but no events appear in Event History
**Solutions:**
1. **Enable KICK Events** - Go to Admin > Events and enable KICK event types
2. **Platform Filter** - Check Events screen platform filter includes KICK
3. **WebSocket Status** - KICK WebSocket is currently in development
4. **Developer Mode** - Use Developer > KICK tab to simulate events

### Chat Messages Not Appearing
**Symptoms:** KICK chat messages don't show in chat feed
**Solutions:**
1. **Event Configuration** - Enable "chat.message.sent" in Events admin
2. **Platform Integration** - Verify KICK connection status is green
3. **Simulation Testing** - Use Developer tools to test event processing
4. **Database Check** - Restart app to refresh database connections

## TTS (Text-to-Speech) Issues

### KICK Messages Not Speaking
**Symptoms:** Twitch TTS works but KICK messages are silent
**Solutions:**
1. **Platform Settings** - TTS should work for both platforms automatically
2. **Voice Settings** - Check viewer-specific voice settings in Admin > Viewers
3. **TTS Queue** - Monitor TTS queue in Admin > TTS screen
4. **Bot Detection** - Ensure messages aren't flagged as bot messages

### Cross-Platform Voice Settings
**Symptoms:** Different voices for same user across platforms
**Solutions:**
1. **Viewer Keys** - Each platform generates unique viewer identifiers
2. **Manual Assignment** - Set voices manually in Admin > Viewers
3. **Platform Consistency** - Use same voice settings for cross-platform users
4. **Voice Commands** - Users can set their own voice with `~setvoice` command

## Command System Issues

### Commands Not Working on KICK
**Symptoms:** System commands work on Twitch but not KICK
**Solutions:**
1. **Platform Support** - All system commands support both platforms
2. **Permissions** - Check user has required permissions (mod, subscriber, etc.)
3. **Command Format** - Ensure commands start with `~` (tilde)
4. **Simulation Test** - Test commands using Developer > KICK simulation

### Cross-Platform Command Responses
**Symptoms:** Commands respond on wrong platform
**Solutions:**
1. **Platform Context** - Commands respond on the platform they were used
2. **Dual Response** - Some commands may respond on both platforms
3. **Moderation** - Moderator commands work per-platform permissions
4. **Bot Account** - Ensure bot has permission to respond on KICK

## Performance Issues

### High Memory Usage
**Symptoms:** App uses excessive memory with both platforms connected
**Solutions:**
1. **Expected Increase** - Dual platform connection increases memory usage
2. **Restart App** - Restart if memory usage exceeds 500MB
3. **Event Cleanup** - Old events are cleaned automatically
4. **Database Maintenance** - Database is optimized automatically

### Slow UI Response
**Symptoms:** Interface becomes sluggish with high event volume
**Solutions:**
1. **Event Filtering** - Disable unnecessary event types in Admin > Events
2. **Platform Selective** - Connect only needed platforms
3. **Event Window** - Close standalone event windows when not needed
4. **Hardware Limits** - Consider hardware upgrade for high-volume streams

## Advanced Troubleshooting

### Debug Information
To gather debug information for support:

1. **Connection Status**
   - Go to Admin > Link to Streams
   - Note the status of both platform connections
   - Check connection timestamps

2. **Event Logs**
   - Open Developer Tools (if available)
   - Check console for error messages
   - Note any red error messages

3. **Database Status**
   - Go to Admin > Viewers 
   - Check if viewers from both platforms appear
   - Verify event history shows mixed platform events

### Log Files
Stream Mesh logs are stored in:
- **Windows:** `%APPDATA%\StreamMesh\logs`
- **macOS:** `~/Library/Application Support/StreamMesh/logs`

Key log files:
- `main.log` - Main application events
- `platform-integration.log` - Platform connection events
- `events.log` - Event processing logs

### Known Limitations

1. **KICK WebSocket** - Real-time WebSocket connections are in development
2. **API Rate Limits** - KICK API has usage limitations  
3. **Event Types** - Some KICK events may not have Twitch equivalents
4. **OAuth Scopes** - Limited by KICK's available OAuth permissions

### Getting Help

If you continue experiencing issues:

1. **Check GitHub Issues** - Search existing issues for similar problems
2. **Create New Issue** - Include debug information and steps to reproduce
3. **Community Support** - Ask in community channels or forums
4. **Documentation** - Review the main README.md for setup instructions

## Frequently Asked Questions

### Is KICK integration stable?
KICK integration is currently in development. OAuth authentication and event simulation are stable, but real-time WebSocket connections are coming soon.

### Can I use both platforms simultaneously?
Yes! Stream Mesh is designed for dual-platform streaming with unified event handling, TTS, and viewer management.

### Do KICK features cost extra?
No, KICK integration uses the same TTS system and doesn't add additional costs beyond your existing AWS Polly usage.

### Will KICK support improve?
Yes, as KICK's API becomes more mature, we'll add more features including real-time chat, enhanced events, and platform-specific features.

---

*Last updated: June 2025 - For latest updates, check the GitHub repository*
