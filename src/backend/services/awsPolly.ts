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

  const params: AWS.Polly.SynthesizeSpeechInput = {
    OutputFormat: 'mp3', // Use MP3 for browser/OBS compatibility
    Text: text,
    VoiceId: resolvedVoiceId,
    TextType: 'text',
    Engine: resolvedEngine as any,
    // SampleRate is ignored for MP3
  };
  const result = await polly.synthesizeSpeech(params).promise();
  if (!result.AudioStream) throw new Error('No audio stream returned');
  const userDataDir = app.getPath('userData');
  const filePath = path.join(userDataDir, `streammesh_tts_${Date.now()}.mp3`);
  fs.writeFileSync(filePath, Buffer.from(result.AudioStream as Buffer));
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
