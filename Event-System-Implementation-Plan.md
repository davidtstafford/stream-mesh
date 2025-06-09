# Event System Implementation Plan

## Overview
This plan implements a comprehensive event system for Stream Mesh that replaces the existing chat bus with a unified event bus. The system will handle chat messages plus new Twitch events (subscriptions, cheers, raids, etc.) while maintaining backward compatibility with all existing features.

---

## Phase 1: Event Bus Foundation (Replacement for Chat Bus)
**Goal**: Create unified event bus that handles ALL events and maintains compatibility with existing systems.

### 1.1 Core Event System
- [x] Create new `eventBus.ts` service to replace `chatBus.ts`
- [x] Define unified `StreamEvent` interface for all event types
- [x] Implement event emission and subscription methods
- [x] Add event filtering capabilities

### 1.2 Database Schema
- [x] Create new `events` table in database
- [x] Add database functions for event storage/retrieval
- [x] Implement dual-write system (events + chat tables for compatibility)
- [x] Add database migration logic

### 1.3 Backward Compatibility
- [x] Update TTS integration to use new event bus (filter for chat events)
- [x] Update chat screen to receive events from new event bus
- [x] Update OBS chat overlay to work with new event system
- [x] Update viewer management to work with new events
- [x] Ensure all existing functionality continues to work

---

## Phase 2: Twitch Integration Updates (COMPLETED ✅)
**Goal**: Add new Twitch event listeners to capture subscription, cheer, raid, and host events.

### 2.1 Platform Integration Service Updates
- [x] Add `subscription` event listener to `platformIntegration.ts`
- [x] Add `resub` event listener
- [x] Add `subgift` event listener  
- [x] Add `cheer` event listener
- [x] Add `hosted` event listener
- [x] Add `raided` event listener

### 2.2 Event Processing
- [x] Implement event data extraction for each event type
- [x] Add event formatting functions
- [x] Route all new events through the event bus
- [x] Test event capture and processing

---

## Phase 3: Admin Configuration System (COMPLETED ✅)
**Goal**: Create admin interface to enable/disable different event types.

### 3.1 Event Settings Backend
- [x] Create event settings interface and storage
- [x] Add IPC handlers for event settings
- [x] Implement settings persistence
- [x] Add default event settings

### 3.2 Events Admin Screen
- [x] Create `EventsAdmin.tsx` screen
- [x] Add toggle switches for each event type
- [x] Implement settings save/load functionality
- [x] Add navigation menu item for Events Admin

---

## Phase 4: Event Display Screen (COMPLETED ✅)
**Goal**: Create main Events screen with dynamic grid layout and toggleable event types.

### 4.1 Events Screen Core
- [x] Create main `Events.tsx` screen
- [x] Add navigation menu item for Events (main screen, not admin submenu)
- [x] Implement toggle buttons for event type selection
- [x] Create responsive grid layout system

### 4.2 Event Display Components
- [x] Create individual event type display boxes
- [x] Implement real-time event streaming to UI
- [x] Add event formatting for display
- [x] Implement grid auto-sizing based on active toggles

### 4.3 Event Types Display
- [x] Chat events display box
- [x] Subscription events display box
- [x] Cheer events display box
- [x] Raid events display box
- [x] Host events display box
- [x] "All Events" combined display box

---

## Phase 5: Event History Screen (COMPLETED ✅)
**Goal**: Create comprehensive event history with search, filter, and delete capabilities.

### 5.1 Event History Backend
- [x] Add IPC handlers for event history operations
- [x] Implement event search and filtering
- [x] Add delete operations (individual, bulk, date-based)
- [x] Add pagination for performance

### 5.2 Event History UI
- [x] Create `EventHistory.tsx` screen
- [x] Add search functionality (by user, text, event type)
- [x] Add date range filtering
- [x] Implement delete operations UI
- [x] Add "delete events older than X days" feature
- [x] Add pagination controls

---

## Phase 6: Testing & Validation
**Goal**: Ensure all systems work correctly and maintain backward compatibility.

### 6.1 Compatibility Testing
- [x] Test TTS still works with chat messages
- [x] Legacy chat UI components safely removed (Chat.tsx, ChatHistory.tsx)
- [x] Test OBS chat overlay still functions
- [x] Test viewer management still works
- [x] Test database operations and backend chat infrastructure preserved

### 6.2 New Features Testing
- [ ] Test new event types are captured correctly
- [ ] Test Events admin screen toggles work
- [ ] Test Events display screen shows events correctly
- [ ] Test Event history search and delete functions
- [ ] Test responsive grid layout

### 6.3 Performance Testing
- [ ] Test with high event volume
- [ ] Test database performance with large event history
- [ ] Test UI responsiveness with many active event types
- [ ] Optimize as needed

---

## Phase 7: Documentation & Polish
**Goal**: Complete documentation and final polish.

### 7.1 Documentation
- [ ] Update README with new event system features
- [ ] Document event types and data structures
- [ ] Add user guide for new screens
- [ ] Update technical documentation

### 7.2 Final Polish
- [ ] Review and improve UI/UX
- [ ] Add error handling and user feedback
- [ ] Performance optimizations
- [ ] Code cleanup and comments

---

## Technical Specifications

### Event Data Structure
```typescript
interface StreamEvent {
  type: 'chat' | 'subscription' | 'resub' | 'subgift' | 'cheer' | 'hosted' | 'raided';
  platform: string;
  channel: string;
  user: string;
  message?: string;
  amount?: number; // cheer bits, sub tier, raid viewers
  data?: any; // event-specific data
  tags?: any; // platform tags
  time: string;
}
```

### Database Schema
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  platform TEXT NOT NULL,
  channel TEXT,
  user TEXT NOT NULL,
  data TEXT, -- JSON blob for event-specific data
  message TEXT, -- For chat/events with messages
  amount INTEGER, -- For cheers, sub tiers, raid viewers
  metadata TEXT, -- JSON for additional data (tags, etc.)
  time TEXT NOT NULL
);
```

### Navigation Structure
```
Main Navigation:
- Chat (existing)
- Events (NEW - main screen)
- TTS (existing)
- Viewers (existing)
- ...

Admin Submenu:
- TTS Admin (existing)
- Events Admin (NEW)
- ...

History Submenu:
- Chat History (existing)
- Event History (NEW)
- ...
```

---

## Migration Strategy

### Backward Compatibility Approach
1. **Keep existing chat table** during initial implementation
2. **Dual-write** chat events to both chat and events tables
3. **Gradual migration** of UI components to use events table
4. **Eventually deprecate** chat table once everything is migrated

### Rollback Plan
- Keep existing chatBus.ts as backup
- Maintain existing chat database functions
- Feature flags for switching between old/new systems if needed

---

## Success Criteria
- [x] All existing chat functionality continues to work
- [x] New event types are captured and displayed
- [x] Events admin allows enabling/disabling event types
- [x] Events screen shows real-time events with dynamic grid
- [x] Event history allows searching and managing events
- [x] Legacy chat UI components successfully removed with OBS integration preserved
- [ ] Performance remains acceptable with high event volume
- [x] No data loss during migration

---

## Notes
- TTS integration remains chat-only for now
- OBS integration for events is planned for future phases
- Focus on robust foundation that can be extended later
- Maintain clean separation between event types for future expansion
