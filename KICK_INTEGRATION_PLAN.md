# KICK Integration Plan for Stream Mesh

## Project Overview
Integrate KICK streaming platform support alongside existing Twitch integration, providing unified event handling, authentication, and real-time chat/event processing.

**KICK Application Details:**
- **Client ID**: `01JXMTP4GNFCM5YJG5EDPSBWMB`
- **Redirect URL**: `http://localhost:3301/auth/kick/callback`
- **OAuth Port**: 3301 (different from Twitch's 3300)

**Required KICK Permissions:**
- ✅ Read user information (including email address)
- ✅ Read stream key  
- ✅ Read channel information
- ✅ Write to Chat feed
- ✅ Subscribe to events (read chat feed, follows, subscribes, gifts)

---

## Phase 1: Authentication Foundation 🔐

### 1.1 OAuth Setup
- [x] Create KICK OAuth service (`src/backend/services/kickOAuth.ts`)
- [x] Implement authorization code + PKCE flow
- [x] Add redirect URL handler on port 3301
- [x] Implement token storage (encrypted local storage)
- [x] Add token refresh mechanism

### 1.2 Platform Type Updates
- [x] Update `Platform` type: `'twitch' | 'kick'`
- [x] Create `KickAuth` interface
- [x] Add KICK auth storage functions to `main.ts`

### 1.3 Basic UI Integration
- [x] Add KICK section to `LinkToStreams.tsx`
- [x] Implement connect/disconnect buttons
- [x] Add KICK connection status display
- [x] Style with KICK brand colors (#53fc18)

### 1.4 IPC Handlers
- [x] Add `kick:oauth` handler in `main.ts`
- [x] Add `kick:disconnect` handler
- [x] Add `kick:status` handler
- [x] Test OAuth flow end-to-end

**Files to Create:**
- `src/backend/services/kickOAuth.ts`

**Files to Modify:**
- `src/backend/services/platformIntegration.ts`
- `src/ui/screens/LinkToStreams.tsx`
- `src/main.ts`

---

## Phase 2: Core Platform Integration 🔗

### 2.1 Platform Integration Service
- [x] Add KICK connection methods to `PlatformIntegrationService`
- [x] Implement `connectKickWithOAuth(auth: KickAuth)`
- [x] Implement `disconnectKick()`
- [x] Implement `getKickStatus()`
- [x] Add KICK to connections record

### 2.2 KICK API Service
- [x] Create KICK API service (`src/backend/services/kickApi.ts`)
- [x] Implement user info fetching
- [x] Implement channel info fetching
- [x] Implement chat message sending
- [x] Add proper error handling and rate limiting

### 2.3 Event Bus Updates
- [x] Update `StreamEvent` type with KICK event types:
  - `chat.message.sent` - Chat messages
  - `channel.followed` - New followers  
  - `channel.subscription.new` - New subscriptions
  - `channel.subscription.renewal` - Subscription renewals
  - `channel.subscription.gifts` - Gifted subscriptions
  - `moderation.banned` - User bans
- [x] Test event emission for KICK events

### 2.4 Database Integration
- [x] Update viewer key generation for KICK (`kick:userId`)
- [x] Test viewer storage with KICK platform
- [x] Verify event storage works with KICK events
- [x] Test cross-platform viewer uniqueness

**Files to Create:**
- `src/backend/services/kickApi.ts`

**Files to Modify:**
- `src/backend/services/platformIntegration.ts`
- `src/backend/services/eventBus.ts`
- `src/backend/core/database.ts`

---

## Phase 3: Real-time Event System 🔄

### 3.1 WebSocket Integration
- [x] Create KICK WebSocket service (`src/backend/services/kickWebSocket.ts`)
- [x] Implement connection management
- [x] Add automatic reconnection logic
- [x] Handle WebSocket authentication

### 3.2 Event Processing
- [x] Implement chat message processing
- [x] Implement follow event processing
- [x] Implement subscription event processing
- [x] Implement raid event processing
- [x] Add event data parsing and normalization

### 3.3 Event Bus Integration
- [x] Connect KICK WebSocket to event bus
- [x] Test all KICK events flow to UI
- [x] Verify database storage of KICK events
- [x] Test event filtering by platform

### 3.4 UI Event Display
- [x] Add KICK events to `EventWindow.tsx`
- [x] Add KICK platform group to event display
- [x] Add KICK event configurations and colors
- [x] Test event styling and colors
- [x] Test event filtering functionality

**Files Created:**
- `src/backend/services/kickWebSocket.ts`
- `test-kick-websocket.js` (integration test)

**Files Modified:**
- `src/backend/services/platformIntegration.ts`
- `src/ui/components/EventWindow.tsx`

---

## Phase 4: Developer Testing Tools 🧪

### 4.1 KICK Developer Screen
- [x] Create `src/ui/screens/DeveloperKick.tsx`
- [x] Add all KICK event simulation buttons
- [x] Implement custom data input fields
- [x] Add automated event sequences
- [x] Style with KICK theme

### 4.2 Event Configuration
- [x] Add KICK platform to `EventsAdmin.tsx`
- [x] Configure KICK event colors and display names
- [x] Test event enabling/disabling for KICK
- [x] Verify event window presets work with KICK

### 4.3 Developer Tools Integration
- [x] Add KICK tab to main Developer screen
- [x] Test all KICK event simulations
- [x] Verify events appear in Event History
- [x] Test cross-platform event mixing

**Files to Create:**
- `src/ui/screens/DeveloperKick.tsx`

**Files to Modify:**
- `src/ui/screens/Developer.tsx`
- `src/ui/screens/EventsAdmin.tsx`
- `src/main.ts`

---

## Phase 5: Command System Integration 💬

### 5.1 Cross-Platform Commands
- [x] Update `CommandProcessor` to handle KICK platform
- [x] Test system commands work on KICK (`~voices`, `~setvoice`, etc.)
- [x] Implement KICK chat message sending
- [x] Test command permissions with KICK users

### 5.2 Viewer Management
- [x] Test KICK viewers appear in Viewers screen
- [x] Verify viewer settings work for KICK users
- [x] Test TTS voice settings for KICK viewers
- [x] Test role assignment for KICK users

### 5.3 Permission System
- [x] Map KICK user roles to Stream Mesh permissions
- [x] Test moderator commands from KICK
- [x] Verify permission checking works across platforms
- [x] Test cross-platform command responses

**Files to Modify:**
- `src/backend/services/commandProcessor.ts` ✅
- `src/backend/services/eventBus.ts` ✅
- `src/ui/screens/Viewers.tsx` ✅
- `src/backend/services/kickWebSocket.ts` ✅
- `src/ui/screens/SystemCommands.tsx`

---

## Phase 6: TTS Integration 🔊

### 6.1 Seamless TTS Support
- [ ] Test KICK chat messages trigger TTS
- [ ] Verify voice settings work for KICK users
- [ ] Test TTS filtering rules apply to KICK
- [ ] Ensure KICK messages respect TTS disabled setting

### 6.2 Cross-Platform TTS
- [ ] Test both platforms feeding into same TTS queue
- [ ] Verify proper message filtering (no bot message TTS)
- [ ] Test voice selection per user across platforms
- [ ] Test TTS muting functionality

### 6.3 TTS Commands
- [ ] Test `~setvoice` command from KICK
- [ ] Test `~myvoice` command from KICK  
- [ ] Test `~voices` command provides URL from KICK
- [ ] Verify TTS settings apply to both platforms

**Files to Modify:**
- `src/main.ts` (TTS event handling)
- `src/backend/services/commandProcessor.ts`

---

## Phase 7: UI Polish & Final Integration ✨

### 7.1 UI Consistency
- [ ] Apply KICK branding consistently
- [ ] Update all platform selectors to include KICK
- [ ] Test responsive layouts with KICK elements
- [ ] Verify dark/light theme support

### 7.2 Event Window Enhancements
- [ ] Test KICK events in standalone event windows
- [ ] Verify event window presets include KICK events
- [ ] Test event filtering by platform
- [ ] Ensure proper event sorting and display

### 7.3 Settings & Configuration
- [ ] Test platform-specific settings persistence
- [ ] Verify connection state restoration on app restart
- [ ] Test event configuration saves properly
- [ ] Ensure all settings screens include KICK options

### 7.4 Error Handling
- [ ] Test connection failure scenarios
- [ ] Verify token expiry handling
- [ ] Test rate limiting responses
- [ ] Ensure graceful WebSocket disconnection

**Files to Modify:**
- `src/ui/screens/LinkToStreams.tsx`
- `src/ui/screens/EventsAdmin.tsx`
- `src/ui/components/EventWindow.tsx`
- Various UI screens as needed

---

## Phase 8: Testing & Documentation 📋

### 8.1 Integration Testing
- [ ] Test both platforms connected simultaneously
- [ ] Verify cross-platform viewer management
- [ ] Test event correlation and display
- [ ] Validate database integrity with dual platforms

### 8.2 Edge Case Testing
- [ ] Test rapid connection/disconnection
- [ ] Test with very high message volumes
- [ ] Test network interruption recovery
- [ ] Test token refresh during active session

### 8.3 Performance Testing
- [ ] Monitor memory usage with dual connections
- [ ] Test TTS queue performance with mixed platforms
- [ ] Verify UI responsiveness with high event volume
- [ ] Test database performance with increased load

### 8.4 Documentation Updates
- [ ] Update README.md with KICK support information
- [ ] Document KICK-specific configuration steps
- [ ] Add troubleshooting guide for KICK connection
- [ ] Update build documentation if needed

---

## Technical Implementation Notes

### KICK API Endpoints
```
OAuth: https://kick.com/oauth2/authorize
Token: https://kick.com/oauth2/token
User Info: https://kick.com/api/v2/user
WebSocket: wss://ws-us2.pusher.app/app/...
```

### Platform Constants
```typescript
const KICK_CLIENT_ID = '01JXMTP4GNFCM5YJG5EDPSBWMB';
const KICK_OAUTH_PORT = 3301;
const KICK_REDIRECT_URI = 'http://localhost:3301/auth/kick/callback';
```

### Event Type Mapping
| KICK Event | Stream Mesh Type | Description |
|-----------|------------------|-------------|
| chat.message.sent | chat.message.sent | Chat messages |
| channel.followed | channel.followed | New followers |
| channel.subscription.new | channel.subscription.new | New subscriptions |
| channel.subscription.renewal | channel.subscription.renewal | Subscription renewals |
| channel.subscription.gifts | channel.subscription.gifts | Gifted subscriptions |
| moderation.banned | moderation.banned | User bans |

---

## Progress Tracking

### Completed Phases
- [x] Phase 1: Authentication Foundation
- [x] Phase 2: Core Platform Integration  
- [x] Phase 3: Real-time Event System
- [x] Phase 4: Developer Testing Tools
- [ ] Phase 5: Command System Integration
- [ ] Phase 6: TTS Integration
- [ ] Phase 7: UI Polish & Final Integration
- [ ] Phase 8: Testing & Documentation

### Current Status
**Phase**: Phase 4 Complete - Ready for Phase 5  
**Last Updated**: December 19, 2024  
**Next Milestone**: Begin Phase 5 - Implement command system integration for KICK platform

**Phase 4 Developer Testing Tools - COMPLETED ✅**
- ✅ KICK Developer screen created with full event simulation
- ✅ Custom data input fields for all event parameters
- ✅ Automated event sequences for testing UI responsiveness  
- ✅ KICK-themed UI with proper styling and branding
- ✅ Integration with main Developer screen via tabs
- ✅ IPC handlers for event simulation implemented
- ✅ EventsAdmin.tsx already had KICK platform configuration
- ✅ All KICK events properly configured with colors and display names

---

## Notes & Issues

### Known Limitations
- KICK API rate limits may be different from Twitch
- WebSocket connection stability needs testing
- Some KICK events may not have direct Twitch equivalents

### Future Enhancements
- Multi-account support (multiple KICK accounts)
- KICK-specific features (emotes, badges)
- Advanced cross-platform analytics
- Platform-specific command customization

---

*This document will be updated after each phase completion with progress, issues encountered, and lessons learned.*
