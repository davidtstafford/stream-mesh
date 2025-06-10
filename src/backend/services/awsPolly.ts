// AWS Polly TTS service for Stream Mesh
import Polly = require('aws-sdk/clients/polly');
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

let polly: Polly | null = null;
let pollyConfig: PollyConfig | null = null;

const configFilePath = path.join(app.getPath('userData'), 'ttsConfig.json');

export function configurePolly(config: PollyConfig) {
  pollyConfig = config;
  polly = new Polly({
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
    polly = new Polly({
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

  // Load TTS settings to check for neural voice restriction
  let disableNeuralVoices = false;
  try {
    const userDataPath = app.getPath('userData');
    const ttsSettingsPath = path.join(userDataPath, 'ttsSettings.json');
    if (fs.existsSync(ttsSettingsPath)) {
      const ttsSettings = JSON.parse(fs.readFileSync(ttsSettingsPath, 'utf-8'));
      disableNeuralVoices = !!ttsSettings.disableNeuralVoices;
    }
  } catch {}

  // Find the requested voice in the voices list
  const allVoices = voicesJson as any[];
  let requestedVoiceId = voiceId || (pollyConfig ? pollyConfig.voiceId : undefined) || 'Brian';
  let requestedVoice = allVoices.find(v => v.Name === requestedVoiceId);
  let resolvedVoiceId = requestedVoiceId;
  let resolvedEngine = engine || (requestedVoice && requestedVoice.Engines && requestedVoice.Engines[0]) || 'standard';

  // If neural voices are disabled, force standard engine and fallback to Standard Brian if needed
  if (disableNeuralVoices) {
    // If requested voice does not support standard, fallback to Brian (standard)
    if (!requestedVoice || !requestedVoice.Engines.includes('standard')) {
      requestedVoice = allVoices.find(v => v.Name === 'Brian' && v.Engines.includes('standard'));
      resolvedVoiceId = 'Brian';
      resolvedEngine = 'standard';
    } else {
      resolvedEngine = 'standard';
    }
  }

  // Platform check
  const os = require('os');
  const isWindows = os.platform() === 'win32';
  const userDataDir = app.getPath('userData');
  let filePath: string;
  let result;
  if (isWindows) {
    // Synthesize as PCM and wrap as WAV
    const params: Polly.SynthesizeSpeechInput = {
      OutputFormat: 'pcm',
      Text: text,
      VoiceId: resolvedVoiceId,
      TextType: 'text',
      Engine: resolvedEngine as any,
      SampleRate: '16000', // 16kHz is widely supported
    };
    result = await polly.synthesizeSpeech(params).promise();
    if (!result.AudioStream) throw new Error('No audio stream returned');
    filePath = path.join(userDataDir, `streammesh_tts_${Date.now()}.wav`);
    // Write WAV header + PCM data
    const pcmBuffer = Buffer.from(result.AudioStream as Buffer);
    const wavBuffer = pcmToWav(pcmBuffer, 16000, 1);
    fs.writeFileSync(filePath, wavBuffer);
  } else {
    // Synthesize as MP3 for browser/OBS compatibility
    const params: Polly.SynthesizeSpeechInput = {
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: resolvedVoiceId,
      TextType: 'text',
      Engine: resolvedEngine as any,
    };
    result = await polly.synthesizeSpeech(params).promise();
    if (!result.AudioStream) throw new Error('No audio stream returned');
    filePath = path.join(userDataDir, `streammesh_tts_${Date.now()}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(result.AudioStream as Buffer));
  }
  return filePath;
}

// Helper: Wrap PCM buffer in a WAV header
function pcmToWav(pcmBuffer: Buffer, sampleRate: number, numChannels: number): Buffer {
  const byteRate = sampleRate * numChannels * 2; // 16-bit audio
  const blockAlign = numChannels * 2;
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0); // ChunkID
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4); // ChunkSize
  wavHeader.write('WAVE', 8); // Format
  wavHeader.write('fmt ', 12); // Subchunk1ID
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(numChannels, 22); // NumChannels
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(byteRate, 28); // ByteRate
  wavHeader.writeUInt16LE(blockAlign, 32); // BlockAlign
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample
  wavHeader.write('data', 36); // Subchunk2ID
  wavHeader.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size
  return Buffer.concat([wavHeader, pcmBuffer]);
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
