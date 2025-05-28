// TTS Queue Manager for Stream Mesh
// Handles sequential TTS playback and queue management
import { EventEmitter } from 'events';
import { synthesizeSpeech, getPollyConfig } from './awsPolly';
import path from 'path';
import { broadcastTTSOverlayEvent } from './obsIntegration';
import fs from 'fs';

interface TTSQueueItem {
  text: string;
  voiceId?: string;
  engine?: string;
  user?: string;
  muteNative?: boolean;
}

class TTSQueue extends EventEmitter {
  private queue: TTSQueueItem[] = [];
  private isPlaying = false;
  private stopRequested = false;

  enqueue(item: TTSQueueItem) {
    console.log('[TTSQueue] Enqueue:', JSON.stringify(item));
    // Add to the end of the queue (FIFO)
    this.queue.push(item);
    this.emit('queueChanged', this.queue.length);
    this.processQueue();
  }

  clearQueue() {
    this.queue = [];
    this.stopRequested = true;
    this.emit('queueChanged', 0);
  }

  getQueueLength() {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0) return;
    this.isPlaying = true;
    while (this.queue.length > 0 && !this.stopRequested) {
      // Remove from the front of the queue (FIFO)
      this.emit('queueChanged', this.queue.length - 1); // Emit before playback to update UI immediately
      const item = this.queue.shift()!;
      try {
        const config = getPollyConfig();
        if (!config) throw new Error('Polly not configured');
        console.log('[TTSQueue] Synthesizing:', item.text, 'Voice:', item.voiceId || config.voiceId);
        // Only pass text and voiceId; engine is always resolved in synthesizeSpeech
        const filePath = await synthesizeSpeech(item.text, item.voiceId || config.voiceId);

        // Broadcast to OBS TTS overlays (use a file URL that browser can access)
        // Serve from /tts-audio/ if needed, else use file://
        const fileName = path.basename(filePath);
        const audioUrl = `/tts-audio/${fileName}`;
        console.log('[TTSQueue] Broadcasting overlay event:', audioUrl);
        broadcastTTSOverlayEvent({ url: audioUrl });

        // Play audio using a native player (Windows only, use PowerShell)
        if (!item.muteNative) {
          console.log('[TTSQueue] Native playback:', filePath);
          await this.playAudio(filePath);
        } else {
          console.log('[TTSQueue] Native playback muted');
        }
        // Delay deletion to allow overlays to load/play the file
        setTimeout(() => {
          fs.unlink(filePath, () => {});
        }, 5000); // 5 seconds
      } catch (err) {
        console.error('[TTSQueue] Error:', err);
        this.emit('error', err);
      }
      // Optionally, emit again after playback if you want to distinguish between 'waiting' and 'spoken'
      // this.emit('queueChanged', this.queue.length);
    }
    this.isPlaying = false;
    this.stopRequested = false;
    this.emit('queueChanged', this.queue.length);
  }
// Utility for main process to get active TTS overlay connections

  private playAudio(filePath: string): Promise<void> {
    // Cross-platform audio playback
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const os = require('os');
      let command: string;
      const platform = os.platform();
      if (platform === 'win32') {
        // Windows: Use PowerShell SoundPlayer for WAV only (now always .wav on Windows)
        command = `powershell -c (New-Object Media.SoundPlayer '${filePath.replace(/'/g, "''")}').PlaySync();`;
      } else if (platform === 'darwin') {
        // macOS: Use afplay
        command = `afplay '${filePath.replace(/'/g, "'\\''")}'`;
      } else {
        // Linux: Try aplay, paplay, or play (from sox)
        // Try aplay first, fallback to paplay/play if needed
        command = `aplay '${filePath.replace(/'/g, "'\\''")}' || paplay '${filePath.replace(/'/g, "'\\''")}' || play '${filePath.replace(/'/g, "'\\''")}'`;
      }
      exec(command, (error: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export const ttsQueue = new TTSQueue();
