# OBS Integration Plan

This document outlines the plan for integrating OBS (Open Broadcaster Software) with the Stream Mesh application. The goal is to provide a modular, extensible, and maintainable system for exposing browser source URLs that OBS can use to display overlays such as chat, TTS, audio alerts, and event graphics. The integration will follow the same modular frontend/backend coding standards as the TTS system. The initial MVP will focus on sending chat messages to OBS via a browser source, but the architecture will support future extensions for TTS, audio, and event-driven overlays (e.g., Twitch redeems, TikTok alerts).

Key principles:
- All overlays are exposed as browser source URLs for OBS to connect to.
- Chat message formatting and style logic will be unified and handled by the backend, ensuring consistency between the in-app chat and OBS overlays.
- The system is designed to be modular, so new overlay types (TTS, alerts, graphics) can be added easily.

## Checklist

- [x] **Create modular OBS screen under Admin**
  - Frontend: `OBS.tsx` in `ui/screens/OBS/` **(done)**
  - Backend: `obsIntegration.ts` in `backend/services/` **(done)**
  - Add navigation entry for OBS in Admin **(done)**

- [x] **Refactor chat message formatting to backend**
  - Backend provides unified, style-rich chat message format for both Chat screen and OBS browser source **(done)**
  - Update Chat screen to consume backend-formatted messages **(done)**

- [ ] **MVP: OBS Chat Browser Source**
  - Create web server endpoint (e.g., `/obs/chat`) that serves a browser-friendly chat overlay
  - Overlay uses same style/font/layout as Chat screen
  - Add UI in OBS screen to display/copy the browser source URL

- [ ] **Future Extensions**
  - Add endpoints for TTS, audio alerts, and event graphics (Twitch redeems, TikTok alerts, etc.)
  - Modularize backend logic for pushing events to both Chat and OBS overlays
