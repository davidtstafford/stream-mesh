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
  emotes?: any; // Twitch emote metadata
}

class TTSQueue extends EventEmitter {
  private queue: TTSQueueItem[] = [];
  private isPlaying = false;
  private stopRequested = false;
  private maxQueueSize = 50; // Prevent memory buildup
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Set max listeners to prevent memory leak warnings
    this.setMaxListeners(100);
    
    // Start periodic cleanup of temp files
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // Clean up temp files every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupTempFiles();
    }, 5 * 60 * 1000);
  }

  private cleanupTempFiles() {
    try {
      const { app } = require('electron');
      const userDataDir = app.getPath('userData');
      
      if (!fs.existsSync(userDataDir)) return;
      
      const files = fs.readdirSync(userDataDir);
      const now = Date.now();
      
      for (const file of files) {
        if (/^streammesh_tts_\d+\.(mp3|wav)$/.test(file)) {
          const filePath = path.join(userDataDir, file);
          try {
            const stats = fs.statSync(filePath);
            // Delete files older than 10 minutes
            if (now - stats.mtime.getTime() > 10 * 60 * 1000) {
              fs.unlinkSync(filePath);
              console.log('[TTSQueue] Cleaned up old temp file:', file);
            }
          } catch (err) {
            // File might be in use, skip
          }
        }
      }
    } catch (err) {
      console.warn('[TTSQueue] Error during temp file cleanup:', err);
    }
  }

  enqueue(item: TTSQueueItem) {
    console.log('[TTSQueue] Enqueue:', JSON.stringify(item));
    
    // Prevent memory buildup by limiting queue size
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('[TTSQueue] Queue full, dropping oldest items');
      this.queue = this.queue.slice(-this.maxQueueSize + 1);
    }
    
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

  destroy() {
    // Clean up resources
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearQueue();
    this.removeAllListeners();
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
        if (!config) {
          console.error('[TTSQueue] Polly not configured, skipping item');
          continue;
        }
        
        console.log('[TTSQueue] Synthesizing:', item.text, 'Voice:', item.voiceId || config.voiceId);
        
        // Add timeout for synthesis to prevent hanging on Catalina
        const filePath = await Promise.race([
          synthesizeSpeech(item.text, item.voiceId || config.voiceId, undefined, item.emotes),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('TTS synthesis timeout')), 30000)
          )
        ]);

        // Broadcast to OBS TTS overlays (use a file URL that browser can access)
        const fileName = path.basename(filePath);
        const audioUrl = `/tts-audio/${fileName}`;
        console.log('[TTSQueue] Broadcasting overlay event:', audioUrl);
        broadcastTTSOverlayEvent({ url: audioUrl });

        // Play audio using a native player
        if (!item.muteNative) {
          console.log('[TTSQueue] Native playback:', filePath);
          try {
            // Add timeout for audio playback as well
            await Promise.race([
              this.playAudio(filePath),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Audio playback timeout')), 15000)
              )
            ]);
          } catch (audioErr) {
            console.warn('[TTSQueue] Audio playback failed:', audioErr);
            // Continue processing even if audio playback fails
          }
        } else {
          console.log('[TTSQueue] Native playback muted');
        }
        
        // Delay deletion to allow overlays to load/play the file
        setTimeout(() => {
          try {
            fs.unlink(filePath, (err) => {
              if (err) console.warn('[TTSQueue] Failed to delete temp file:', err);
            });
          } catch (unlinkErr) {
            console.warn('[TTSQueue] Error during file deletion:', unlinkErr);
          }
        }, 8000); // Increased to 8 seconds for Catalina
        
      } catch (err) {
        console.error('[TTSQueue] Error processing item:', err);
        this.emit('error', err);
        
        // If we get too many errors in a row, pause briefly to prevent spam
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
          console.log('[TTSQueue] Pausing due to network/timeout errors...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second pause
        }
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
