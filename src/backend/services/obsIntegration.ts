
import path from 'path';
const express = require('express') as typeof import('express');
import type { Request, Response, Express } from 'express';

// --- OBS TTS Overlay Endpoint ---
export let activeTTSOverlayConnections = 0;
const ttsOverlayClients: Response[] = [];
// Utility for main process to get active TTS overlay connections
export function getActiveTTSOverlayConnections(): number {
  return activeTTSOverlayConnections;
}

// Broadcast a TTS event (e.g., { url }) to all connected overlay clients
export function broadcastTTSOverlayEvent(event: { url: string }) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of ttsOverlayClients) {
    try {
      res.write(data);
    } catch {}
  }
}

export function getObsOverlayUrl(type: 'chat' | 'tts' | 'alerts' = 'chat'): string {
  // Placeholder: In a real app, this would generate a local server URL
  // For MVP, just return a static example
  return `http://localhost:3000/obs/${type}`;
}

// --- OBS Chat Overlay Endpoint ---
// Track active SSE connections
let activeChatOverlayConnections = 0;

export function registerObsOverlayEndpoints(app: Express) {
  // Serve generated TTS audio files securely from Electron userData dir
  // Only allow files matching streammesh_tts_*.wav
  try {
    // Dynamically require Electron's app module (works in Electron main process)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronApp = require('electron').app;
    const fs = require('fs');
    app.get('/tts-audio/:file', (req: Request, res: Response) => {
      const file = req.params.file;
      if (!/^streammesh_tts_\d+\.(mp3|wav)$/.test(file)) {
        return res.status(400).send('Invalid file name');
      }
      const userDataDir = electronApp.getPath('userData');
      const filePath = path.join(userDataDir, file);
      fs.access(filePath, fs.constants.R_OK, (err: any) => {
        if (err) return res.status(404).send('File not found');
        res.sendFile(filePath);
      });
    });
  } catch (err) {
    // If not running in Electron, skip this endpoint
    console.warn('TTS audio endpoint not registered (not running in Electron main process)');
  }
  // Serve the TTS overlay HTML
  app.get('/obs/tts', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../ui/assets/ttsoverlay.html'));
  });
  // Serve the TTS overlay JS
  app.get('/ui/assets/ttsoverlay.js', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../ui/assets/ttsoverlay.js'));
  });
  // Endpoint to get the number of active TTS overlay connections
  app.get('/obs/tts/connections', (_req: Request, res: Response) => {
    res.json({ connections: activeTTSOverlayConnections });
  });
  // SSE endpoint for TTS events
  app.get('/obs/tts/stream', (req: Request, res: Response) => {
    activeTTSOverlayConnections++;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    ttsOverlayClients.push(res);
    // Send keepalive
    const keepAlive = setInterval(() => res.write(':keepalive\n\n'), 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      activeTTSOverlayConnections = Math.max(0, activeTTSOverlayConnections - 1);
      // Remove from clients array
      const idx = ttsOverlayClients.indexOf(res);
      if (idx !== -1) ttsOverlayClients.splice(idx, 1);
    });
  });
  // Serve the overlay HTML
  app.get('/obs/chat', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../ui/assets/chatoverlay.html'));
  });
  // Serve the overlay JS
  app.get('/ui/assets/chatoverlay.js', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../ui/assets/chatoverlay.js'));
  });
  // Serve the theme CSS (already handled if static, else add here)

  // Endpoint to get the number of active chat overlay connections
  app.get('/obs/chat/connections', (_req: Request, res: Response) => {
    res.json({ connections: activeChatOverlayConnections });
  });

  // SSE endpoint for chat messages
  app.get('/obs/chat/stream', (req: Request, res: Response) => {
    activeChatOverlayConnections++;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Send keepalive
    const keepAlive = setInterval(() => res.write(':keepalive\n\n'), 25000);
    // Listen for chat events from the new eventBus
    const { formatChatMessage } = require('./chatFormatting');
    const onChat = (event: any) => {
      // Convert StreamEvent to ChatMessage format for formatting
      const chatMessage = {
        platform: event.platform,
        channel: event.channel,
        user: event.user,
        message: event.message,
        time: event.time,
      };
      res.write(`data: ${JSON.stringify(formatChatMessage(chatMessage))}\n\n`);
    };
    const { eventBus } = require('./eventBus');
    eventBus.onEventType('chat', onChat);
    req.on('close', () => {
      clearInterval(keepAlive);
      eventBus.off('event:chat', onChat);
      activeChatOverlayConnections = Math.max(0, activeChatOverlayConnections - 1);
    });
  });

  // Endpoint to get the number of active chat overlay connections
  app.get('/obs/chat/connections', (_req, res) => {
    res.json({ connections: activeChatOverlayConnections });
  });
}
