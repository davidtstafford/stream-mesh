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
        // Only pass text and voiceId; engine is always resolved in synthesizeSpeech
        const filePath = await synthesizeSpeech(item.text, item.voiceId || config.voiceId);
        // Play audio using a native player (Windows only, use PowerShell)
        await this.playAudio(filePath);
        fs.unlink(filePath, () => {}); // Clean up
      } catch (err) {
        this.emit('error', err);
      }
      // Optionally, emit again after playback if you want to distinguish between 'waiting' and 'spoken'
      // this.emit('queueChanged', this.queue.length);
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
