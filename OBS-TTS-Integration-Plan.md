# OBS TTS Overlay Integration Plan

## Goal
Expose a browser source URL for TTS (Text-to-Speech) audio alerts, so users can add it to OBS as a browser source. The overlay should play TTS audio in real time, triggered by backend events, and the OBS Admin screen should display the TTS overlay URL, a copy button, and a live connection count (just like the chat overlay).

---

## Steps

### 1. Backend: Serve TTS Overlay HTML/JS
- [ ] Create `src/ui/assets/ttsoverlay.html` and `ttsoverlay.js` for the TTS overlay.
- [ ] In `obsIntegration.ts`, add endpoints:
    - `/obs/tts` → serves `ttsoverlay.html`
    - `/ui/assets/ttsoverlay.js` → serves `ttsoverlay.js`
- [ ] Add `/obs/tts/stream` SSE or WebSocket endpoint to push TTS events (with audio URLs or base64 data) to overlay clients.
- [ ] Track active TTS overlay connections (increment on connect, decrement on disconnect).
- [ ] Add `/obs/tts/connections` endpoint to return the number of active TTS overlay connections.

### 2. Backend: TTS Event Push Logic
- [ ] When a TTS event is triggered (e.g., chat triggers TTS), push the event (with audio URL or data) to all connected TTS overlay clients.
- [ ] Ensure audio files are accessible to the overlay (e.g., serve from a static directory or provide a direct URL).

### 3. Build: Asset Copy
- [ ] Update `copy-obs-assets.js` to also copy `ttsoverlay.html` and `ttsoverlay.js` to the backend assets directory after build.

### 4. Frontend: OBS Admin Screen
- [ ] In `OBS.tsx`, add a section for the TTS overlay:
    - Display the TTS overlay URL (e.g., `http://localhost:3001/obs/tts`)
    - Add a copy button
    - Show a live connection count ("N applications are currently accessing the overlay.")
    - Add a short explanation for how to use it in OBS

### 5. Frontend: TTS Overlay Implementation
- [ ] `ttsoverlay.html`/`.js` should:
    - Connect to `/obs/tts/stream` (SSE or WebSocket)
    - Play incoming TTS audio events automatically
    - (Optional) Show a simple visual indicator when audio is playing

### 6. Testing & Validation
- [ ] Test with multiple OBS/browser clients
- [ ] Confirm TTS audio plays in real time in all connected overlays
- [ ] Confirm connection count updates in Admin screen

---

## Future Enhancements
- [ ] Add support for TTS volume control, muting, or playback history in the overlay
- [ ] Add support for other event overlays (alerts, graphics, etc.)
