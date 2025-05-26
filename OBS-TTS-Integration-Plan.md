# OBS TTS Overlay Integration Plan

## Goal
Expose a browser source URL for TTS (Text-to-Speech) audio alerts, so users can add it to OBS as a browser source. The overlay should play TTS audio in real time, triggered by backend events, and the OBS Admin screen should display the TTS overlay URL, a copy button, and a live connection count (just like the chat overlay).

---

## Steps

### 1. Backend: Serve TTS Overlay HTML/JS
- [x] Create `src/ui/assets/ttsoverlay.html` and `ttsoverlay.js` for the TTS overlay.
- [x] In `obsIntegration.ts`, add endpoints:
    - `/obs/tts` → serves `ttsoverlay.html`
    - `/ui/assets/ttsoverlay.js` → serves `ttsoverlay.js`
- [x] Add `/obs/tts/stream` SSE endpoint to push TTS events (with audio URLs) to overlay clients.
- [x] Track active TTS overlay connections (increment on connect, decrement on disconnect).
- [x] Add `/obs/tts/connections` endpoint to return the number of active TTS overlay connections.

### 2. Backend: TTS Event Push Logic
- [x] When a TTS event is triggered (e.g., chat triggers TTS), push the event (with audio URL) to all connected TTS overlay clients.
- [x] Ensure audio files are accessible to the overlay (e.g., serve from a static directory or provide a direct URL).
- [ ] **NEW:** Add `/tts-audio/:file` endpoint to serve generated TTS audio files from the Electron user data directory, with security checks.

### 3. Build: Asset Copy
- [x] Update `copy-obs-assets.js` to also copy `ttsoverlay.html` and `ttsoverlay.js` to the backend assets directory after build.

### 4. Frontend: OBS Admin Screen
- [x] In `OBS.tsx`, add a section for the TTS overlay:
    - Display the TTS overlay URL (e.g., `http://localhost:3001/obs/tts`)
    - Add a copy button
    - Show a live connection count ("N applications are currently accessing the overlay.")
    - Add a short explanation for how to use it in OBS

### 5. Frontend: TTS Overlay Implementation
- [x] `ttsoverlay.html`/`.js`:
    - Connects to `/obs/tts/stream` (SSE)
    - Plays incoming TTS audio events automatically
    - (Optional) Shows a simple visual indicator when audio is playing

### 6. Testing & Validation
- [ ] Test with multiple OBS/browser clients
- [ ] Confirm TTS audio plays in real time in all connected overlays
- [ ] Confirm connection count updates in Admin screen

---

## Future Enhancements
- [ ] Add support for TTS volume control, muting, or playback history in the overlay
- [ ] Add support for other event overlays (alerts, graphics, etc.)
