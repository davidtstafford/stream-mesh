// AWS Polly TTS service for Stream Mesh
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Load Polly voices/engines asset for backend-side engine lookup
import voicesJson from '../../shared/assets/pollyVoiceEngines.sorted.json';

export interface PollyConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  voiceId?: string;
  engine?: string;
}

let polly: AWS.Polly | null = null;
let pollyConfig: PollyConfig | null = null;

const configFilePath = path.join(app.getPath('userData'), 'ttsConfig.json');

export function configurePolly(config: PollyConfig) {
  pollyConfig = config;
  polly = new AWS.Polly({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
  });
  // Persist config to disk, including voiceId and engine
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    // Optionally, handle error silently or log minimal error
  }
}

export function getPollyConfig(): PollyConfig | null {
  try {
    const data = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(data);
    pollyConfig = config;
    polly = new AWS.Polly({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });
    return pollyConfig;
  } catch (err) {
    return null;
  }
}

function getFirstEngineForVoice(voiceId?: string): string {
  if (!voiceId) return 'standard';
  const found = (voicesJson as any[]).find(v => v.Name === voiceId);
  return found && found.Engines && found.Engines.length > 0 ? found.Engines[0] : 'standard';
}

export async function synthesizeSpeech(text: string, voiceId?: string, engine?: string): Promise<string> {
  if (!polly || !pollyConfig) throw new Error('Polly is not configured');
  const resolvedEngine = engine || getFirstEngineForVoice(voiceId || pollyConfig.voiceId);
  const params: AWS.Polly.SynthesizeSpeechInput = {
    OutputFormat: 'pcm', // Use PCM for WAV compatibility
    Text: text,
    VoiceId: voiceId || pollyConfig.voiceId || 'Joanna',
    TextType: 'text',
    Engine: resolvedEngine as any,
    SampleRate: '16000', // 16kHz mono
  };
  const result = await polly.synthesizeSpeech(params).promise();
  if (!result.AudioStream) throw new Error('No audio stream returned');
  // Convert PCM to WAV header
  const userDataDir = app.getPath('userData');
  const filePath = path.join(userDataDir, `streammesh_tts_${Date.now()}.wav`);
  const wavBuffer = pcmToWav(result.AudioStream as Buffer, 16000, 1);
  fs.writeFileSync(filePath, wavBuffer);
  return filePath;
}

// Helper: Convert PCM buffer to WAV
function pcmToWav(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28); // ByteRate
  header.writeUInt16LE(channels * 2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
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
