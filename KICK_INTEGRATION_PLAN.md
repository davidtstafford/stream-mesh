# KIK Integration Plan for Stream Mesh

## Project Overview
Integrate KIK streaming platform support alongside existing Twitch integration, providing unified event handling, authentication, and real-time chat/event processing.

**KIK Application Details:**
- **Client ID**: `01JXMTP4GNFCM5YJG5EDPSBWMB`
- **Redirect URL**: `http://localhost:3301/auth/kick/callback`
- **OAuth Port**: 3301 (different from Twitch's 3300)

**Required KIK Permissions:**
- ✅ Read user information (including email address)
- ✅ Read stream key  
- ✅ Read channel information
- ✅ Write to Chat feed
- ✅ Subscribe to events (read chat feed, follows, subscribes, gifts)

---

## Phase 1: Authentication Foundation 🔐

### 1.1 OAuth Setup
- [ ] Create KIK OAuth service (`src/backend/services/kickOAuth.ts`)
- [ ] Implement authorization code + PKCE flow
- [ ] Add redirect URL handler on port 3301
- [ ] Implement token storage (encrypted local storage)
- [ ] Add token refresh mechanism

### 1.2 Platform Type Updates
- [ ] Update `Platform` type: `'twitch' | 'kick'`
- [ ] Create `KickAuth` interface
- [ ] Add KIK auth storage functions to `main.ts`

### 1.3 Basic UI Integration
- [ ] Add KIK section to `LinkToStreams.tsx`
- [ ] Implement connect/disconnect buttons
- [ ] Add KIK connection status display
- [ ] Style with KIK brand colors (#53fc18)

### 1.4 IPC Handlers
- [ ] Add `kick:oauth` handler in `main.ts`
- [ ] Add `kick:disconnect` handler
- [ ] Add `kick:status` handler
- [ ] Test OAuth flow end-to-end

**Files to Create:**
- `src/backend/services/kickOAuth.ts`

**Files to Modify:**
- `src/backend/services/platformIntegration.ts`
- `src/ui/screens/LinkToStreams.tsx`
- `src/main.ts`

---

## Phase 2: Core Platform Integration 🔗

### 2.1 Platform Integration Service
- [ ] Add KIK connection methods to `PlatformIntegrationService`
- [ ] Implement `connectKickWithOAuth(auth: KickAuth)`
- [ ] Implement `disconnectKick()`
- [ ] Implement `getKickStatus()`
- [ ] Add KIK to connections record

### 2.2 KIK API Service
- [ ] Create KIK API service (`src/backend/services/kickApi.ts`)
- [ ] Implement user info fetching
- [ ] Implement channel info fetching
- [ ] Implement chat message sending
- [ ] Add proper error handling and rate limiting

### 2.3 Event Bus Updates
- [ ] Update `StreamEvent` type with KIK event types:
  - `kick-chat`
  - `kick-follow`
  - `kick-subscription`
  - `kick-subgift`
  - `kick-donation`
  - `kick-raid`
  - `kick-host`
- [ ] Test event emission for KIK events

### 2.4 Database Integration
- [ ] Update viewer key generation for KIK (`kick:userId`)
- [ ] Test viewer storage with KIK platform
- [ ] Verify event storage works with KIK events
- [ ] Test cross-platform viewer uniqueness

**Files to Create:**
- `src/backend/services/kickApi.ts`

**Files to Modify:**
- `src/backend/services/platformIntegration.ts`
- `src/backend/services/eventBus.ts`
- `src/backend/core/database.ts`

---

## Phase 3: Real-time Event System 🔄

### 3.1 WebSocket Integration
- [ ] Create KIK WebSocket service (`src/backend/services/kickWebSocket.ts`)
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
- [ ] Connect KIK WebSocket to event bus
- [ ] Test all KIK events flow to UI
- [ ] Verify database storage of KIK events
- [ ] Test event filtering by platform

### 3.4 UI Event Display
- [ ] Add KIK events to `EventWindow.tsx`
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

### 4.1 KIK Developer Screen
- [ ] Create `src/ui/screens/DeveloperKick.tsx`
- [ ] Add all KIK event simulation buttons
- [ ] Implement custom data input fields
- [ ] Add automated event sequences
- [ ] Style with KIK theme

### 4.2 Event Configuration
- [ ] Add KIK platform to `EventsAdmin.tsx`
- [ ] Configure KIK event colors and display names
- [ ] Test event enabling/disabling for KIK
- [ ] Verify event window presets work with KIK

### 4.3 Developer Tools Integration
- [ ] Add KIK tab to main Developer screen
- [ ] Test all KIK event simulations
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
- [ ] Update `CommandProcessor` to handle KIK platform
- [ ] Test system commands work on KIK (`~voices`, `~setvoice`, etc.)
- [ ] Implement KIK chat message sending
- [ ] Test command permissions with KIK users

### 5.2 Viewer Management
- [ ] Test KIK viewers appear in Viewers screen
- [ ] Verify viewer settings work for KIK users
- [ ] Test TTS voice settings for KIK viewers
- [ ] Test role assignment for KIK users

### 5.3 Permission System
- [ ] Map KIK user roles to Stream Mesh permissions
- [ ] Test moderator commands from KIK
- [ ] Verify permission checking works across platforms
- [ ] Test cross-platform command responses

**Files to Modify:**
- `src/backend/services/commandProcessor.ts`
- `src/ui/screens/Viewers.tsx`
- `src/ui/screens/SystemCommands.tsx`

---

## Phase 6: TTS Integration 🔊

### 6.1 Seamless TTS Support
- [ ] Test KIK chat messages trigger TTS
- [ ] Verify voice settings work for KIK users
- [ ] Test TTS filtering rules apply to KIK
- [ ] Ensure KIK messages respect TTS disabled setting

### 6.2 Cross-Platform TTS
- [ ] Test both platforms feeding into same TTS queue
- [ ] Verify proper message filtering (no bot message TTS)
- [ ] Test voice selection per user across platforms
- [ ] Test TTS muting functionality

### 6.3 TTS Commands
- [ ] Test `~setvoice` command from KIK
- [ ] Test `~myvoice` command from KIK  
- [ ] Test `~voices` command provides URL from KIK
- [ ] Verify TTS settings apply to both platforms

**Files to Modify:**
- `src/main.ts` (TTS event handling)
- `src/backend/services/commandProcessor.ts`

---

## Phase 7: UI Polish & Final Integration ✨

### 7.1 UI Consistency
- [ ] Apply KIK branding consistently
- [ ] Update all platform selectors to include KIK
- [ ] Test responsive layouts with KIK elements
- [ ] Verify dark/light theme support

### 7.2 Event Window Enhancements
- [ ] Test KIK events in standalone event windows
- [ ] Verify event window presets include KIK events
- [ ] Test event filtering by platform
- [ ] Ensure proper event sorting and display

### 7.3 Settings & Configuration
- [ ] Test platform-specific settings persistence
- [ ] Verify connection state restoration on app restart
- [ ] Test event configuration saves properly
- [ ] Ensure all settings screens include KIK options

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
- [ ] Update README.md with KIK support information
- [ ] Document KIK-specific configuration steps
- [ ] Add troubleshooting guide for KIK connection
- [ ] Update build documentation if needed

---

## Technical Implementation Notes

### KIK API Endpoints
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
| KIK Event | Stream Mesh Type |
|-----------|------------------|
| message | kick-chat |
| follow | kick-follow |
| subscription | kick-subscription |
| gift_subscription | kick-subgift |
| tip | kick-donation |
| raid | kick-raid |
| host | kick-host |

---

## Progress Tracking

### Completed Phases
- [ ] Phase 1: Authentication Foundation
- [ ] Phase 2: Core Platform Integration  
- [ ] Phase 3: Real-time Event System
- [ ] Phase 4: Developer Testing Tools
- [ ] Phase 5: Command System Integration
- [ ] Phase 6: TTS Integration
- [ ] Phase 7: UI Polish & Final Integration
- [ ] Phase 8: Testing & Documentation

### Current Status
**Phase**: Not Started  
**Last Updated**: June 13, 2025  
**Next Milestone**: Complete Phase 1 OAuth Setup

---

## Notes & Issues

### Known Limitations
- KIK API rate limits may be different from Twitch
- WebSocket connection stability needs testing
- Some KIK events may not have direct Twitch equivalents

### Future Enhancements
- Multi-account support (multiple KIK accounts)
- KIK-specific features (emotes, badges)
- Advanced cross-platform analytics
- Platform-specific command customization

---

*This document will be updated after each phase completion with progress, issues encountered, and lessons learned.*
