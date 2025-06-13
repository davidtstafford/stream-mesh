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
- [ ] Create KICK WebSocket service (`src/backend/services/kickWebSocket.ts`)
- [ ] Implement connection management
- [ ] Add automatic reconnection logic
- [ ] Handle WebSocket authentication

### 3.2 Event Processing
- [ ] Implement chat message processing
- [ ] Implement follow event processing
- [ ] Implement subscription event processing
- [ ] Implement donation/tip event processing
- [ ] Implement raid event processing
- [ ] Add event data parsing and normalization

### 3.3 Event Bus Integration
- [ ] Connect KICK WebSocket to event bus
- [ ] Test all KICK events flow to UI
- [ ] Verify database storage of KICK events
- [ ] Test event filtering by platform

### 3.4 UI Event Display
- [ ] Add KICK events to `EventWindow.tsx`
- [ ] Test real-time event display
- [ ] Verify event styling and colors
- [ ] Test event filtering functionality

**Files to Create:**
- `src/backend/services/kickWebSocket.ts`

**Files to Modify:**
- `src/backend/services/platformIntegration.ts`
- `src/ui/components/EventWindow.tsx`

---

## Phase 4: Developer Testing Tools 🧪

### 4.1 KICK Developer Screen
- [ ] Create `src/ui/screens/DeveloperKick.tsx`
- [ ] Add all KICK event simulation buttons
- [ ] Implement custom data input fields
- [ ] Add automated event sequences
- [ ] Style with KICK theme

### 4.2 Event Configuration
- [ ] Add KICK platform to `EventsAdmin.tsx`
- [ ] Configure KICK event colors and display names
- [ ] Test event enabling/disabling for KICK
- [ ] Verify event window presets work with KICK

### 4.3 Developer Tools Integration
- [ ] Add KICK tab to main Developer screen
- [ ] Test all KICK event simulations
- [ ] Verify events appear in Event History
- [ ] Test cross-platform event mixing

**Files to Create:**
- `src/ui/screens/DeveloperKick.tsx`

**Files to Modify:**
- `src/ui/screens/Developer.tsx`
- `src/ui/screens/EventsAdmin.tsx`
- `src/ui/navigation/NavigationBar.tsx`

---

## Phase 5: Command System Integration 💬

### 5.1 Cross-Platform Commands
- [ ] Update `CommandProcessor` to handle KICK platform
- [ ] Test system commands work on KICK (`~voices`, `~setvoice`, etc.)
- [ ] Implement KICK chat message sending
- [ ] Test command permissions with KICK users

### 5.2 Viewer Management
- [ ] Test KICK viewers appear in Viewers screen
- [ ] Verify viewer settings work for KICK users
- [ ] Test TTS voice settings for KICK viewers
- [ ] Test role assignment for KICK users

### 5.3 Permission System
- [ ] Map KICK user roles to Stream Mesh permissions
- [ ] Test moderator commands from KICK
- [ ] Verify permission checking works across platforms
- [ ] Test cross-platform command responses

**Files to Modify:**
- `src/backend/services/commandProcessor.ts`
- `src/ui/screens/Viewers.tsx`
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
- [ ] Phase 3: Real-time Event System
- [ ] Phase 4: Developer Testing Tools
- [ ] Phase 5: Command System Integration
- [ ] Phase 6: TTS Integration
- [ ] Phase 7: UI Polish & Final Integration
- [ ] Phase 8: Testing & Documentation

### Current Status
**Phase**: Phase 2 Complete - Ready for Phase 3  
**Last Updated**: June 13, 2025  
**Next Milestone**: Begin Phase 3 - Implement KICK WebSocket connection for real-time chat and events

**Phase 2.4 Database Integration - COMPLETED ✅**
- ✅ Viewer key generation works correctly for KICK platform (`kick:userId` format)
- ✅ Cross-platform viewer uniqueness verified (Twitch and KICK users with same ID get different keys)
- ✅ Event storage compatibility confirmed for all KICK event types
- ✅ Database integration tests pass successfully

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
