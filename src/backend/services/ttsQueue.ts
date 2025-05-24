// TTS Queue Manager for Stream Mesh
// Handles sequential TTS playback and queue management
import { EventEmitter } from 'events';
import { synthesizeSpeech, getPollyConfig } from './awsPolly';
import fs from 'fs';

interface TTSQueueItem {
  text: string;
  voiceId?: string;
  engine?: string;
  user?: string;
}

class TTSQueue extends EventEmitter {
  private queue: TTSQueueItem[] = [];
  private isPlaying = false;
  private stopRequested = false;

  enqueue(item: TTSQueueItem) {
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
      const item = this.queue.shift()!;
      try {
        const config = getPollyConfig();
        if (!config) throw new Error('Polly not configured');
        const filePath = await synthesizeSpeech(item.text, item.voiceId || config.voiceId, item.engine || (config as any).engine);
        // Play audio using a native player (Windows only, use PowerShell)
        await this.playAudio(filePath);
        fs.unlink(filePath, () => {}); // Clean up
      } catch (err) {
        this.emit('error', err);
      }
    }
    this.isPlaying = false;
    this.stopRequested = false;
    this.emit('queueChanged', this.queue.length);
  }

  private playAudio(filePath: string): Promise<void> {
    // Use PowerShell to play WAV audio synchronously (blocks until done)
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      // Use Windows Media SoundPlayer for WAV
      const command = `powershell -c (New-Object Media.SoundPlayer '${filePath}').PlaySync();`;
      exec(command, (error: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export const ttsQueue = new TTSQueue();
