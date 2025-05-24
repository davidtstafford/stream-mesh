// AWS Polly TTS service for Stream Mesh
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface PollyConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  voiceId?: string;
}

let polly: AWS.Polly | null = null;
let pollyConfig: PollyConfig | null = null;

export function configurePolly(config: PollyConfig) {
  pollyConfig = config;
  polly = new AWS.Polly({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
  });
}

export function getPollyConfig(): PollyConfig | null {
  return pollyConfig;
}

export async function synthesizeSpeech(text: string, voiceId?: string, engine?: string): Promise<string> {
  if (!polly || !pollyConfig) throw new Error('Polly is not configured');
  const params: AWS.Polly.SynthesizeSpeechInput = {
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voiceId || pollyConfig.voiceId || 'Joanna',
    TextType: 'text',
    Engine: engine as any || 'standard',
  };
  const result = await polly.synthesizeSpeech(params).promise();
  if (!result.AudioStream) throw new Error('No audio stream returned');
  // Save to userData directory instead of temp for Electron compatibility
  const userDataDir = app.getPath('userData');
  const filePath = path.join(userDataDir, `streammesh_tts_${Date.now()}.mp3`);
  fs.writeFileSync(filePath, result.AudioStream as Buffer);
  return filePath;
}

export async function listPollyVoices(): Promise<any[]> {
  if (!polly) throw new Error('Polly is not configured');
  const result = await polly.describeVoices({}).promise();
  return result.Voices || [];
}

// Expose Polly service via IPC in main.ts
// In main.ts, add:
//
// import { configurePolly, getPollyConfig, synthesizeSpeech } from './backend/services/awsPolly';
//
// ipcMain.handle('polly:configure', async (_event, config) => {
//   configurePolly(config);
//   return true;
// });
//
// ipcMain.handle('polly:getConfig', async () => {
//   return getPollyConfig();
// });
//
// ipcMain.handle('polly:speak', async (_event, { text, voiceId }) => {
//   return synthesizeSpeech(text, voiceId);
// });
