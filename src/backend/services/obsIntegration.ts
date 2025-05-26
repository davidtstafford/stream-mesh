// OBS Integration Service (MVP)
// This module will handle backend logic for OBS overlays (chat, TTS, alerts, etc.)
// Future: Add endpoints and event push logic for overlays

export function getObsOverlayUrl(type: 'chat' | 'tts' | 'alerts' = 'chat'): string {
  // Placeholder: In a real app, this would generate a local server URL
  // For MVP, just return a static example
  return `http://localhost:3000/obs/${type}`;
}
