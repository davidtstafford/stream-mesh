// OBS Integration Service (MVP)
// This module will handle backend logic for OBS overlays (chat, TTS, alerts, etc.)
// Future: Add endpoints and event push logic for overlays

import path from 'path';
import express from 'express';

export function getObsOverlayUrl(type: 'chat' | 'tts' | 'alerts' = 'chat'): string {
  // Placeholder: In a real app, this would generate a local server URL
  // For MVP, just return a static example
  return `http://localhost:3000/obs/${type}`;
}

// --- OBS Chat Overlay Endpoint ---
export function registerObsOverlayEndpoints(app: express.Express) {
  // Serve the overlay HTML
  app.get('/obs/chat', (_req, res) => {
    res.sendFile(path.join(__dirname, '../ui/assets/chatoverlay.html'));
  });
  // Serve the overlay JS
  app.get('/ui/assets/chatoverlay.js', (_req, res) => {
    res.sendFile(path.join(__dirname, '../ui/assets/chatoverlay.js'));
  });
  // Serve the theme CSS (already handled if static, else add here)
  // SSE endpoint for chat messages
  app.get('/obs/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Send keepalive
    const keepAlive = setInterval(() => res.write(':keepalive\n\n'), 25000);
    // Listen for chat events
    const { formatChatMessage } = require('./chatFormatting');
    const onChat = (msg: any) => {
      res.write(`data: ${JSON.stringify(formatChatMessage(msg))}\n\n`);
    };
    const { chatBus } = require('./chatBus');
    chatBus.on('chat', onChat);
    req.on('close', () => {
      clearInterval(keepAlive);
      chatBus.off('chat', onChat);
    });
  });
}
