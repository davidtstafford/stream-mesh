// Main Electron process
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { initDatabase, insertChatMessage, fetchChatMessages, deleteAllChatMessages, deleteChatMessageById, fetchViewers, fetchSettings, fetchViewerSettings, upsertViewerSetting, upsertViewer } from './backend/core/database';
import { platformIntegrationService } from './backend/services/platformIntegration';
import { startTwitchOAuth } from './backend/services/twitchOAuth';
import { chatBus } from './backend/services/chatBus';
import { registerChatBusDbListener } from './backend/core/database';
import fs from 'fs';
import { configurePolly, getPollyConfig, synthesizeSpeech } from './backend/services/awsPolly';
import { ttsQueue } from './backend/services/ttsQueue';
import crypto from 'crypto';

const userDataPath = app.getPath('userData');
const authFilePath = path.join(userDataPath, 'auth.json');
const ttsSettingsFilePath = path.join(userDataPath, 'ttsSettings.json');

function saveTwitchAuth(auth: { username: string, accessToken: string }) {
  fs.writeFileSync(authFilePath, JSON.stringify(auth, null, 2), 'utf-8');
}

function loadTwitchAuth(): { username: string, accessToken: string } | null {
  try {
    const data = fs.readFileSync(authFilePath, 'utf-8');
    const auth = JSON.parse(data);
    if (auth && auth.username && auth.accessToken) return auth;
    return null;
  } catch {
    return null;
  }
}

// TTS global settings (for extensibility)
interface TTSSettings {
  enabled: boolean;
  readNameBeforeMessage: boolean;
  includePlatformWithName: boolean;
  // Future: per-user overrides, blocklist, message prefix, etc.
}

function loadTTSSettings(): TTSSettings {
  try {
    const data = fs.readFileSync(ttsSettingsFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    // Backward compatibility: add missing fields
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
      readNameBeforeMessage: typeof parsed.readNameBeforeMessage === 'boolean' ? parsed.readNameBeforeMessage : false,
      includePlatformWithName: typeof parsed.includePlatformWithName === 'boolean' ? parsed.includePlatformWithName : false,
    };
  } catch {
    // Default: TTS off, no name prefix, no platform
    return { enabled: false, readNameBeforeMessage: false, includePlatformWithName: false };
  }
}

function saveTTSSettings(settings: TTSSettings) {
  fs.writeFileSync(ttsSettingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Stream Mesh'
  });

  win.on('closed', () => {
    console.log('Main window closed');
    // Prevent app from quitting for 10 seconds for debugging
    setTimeout(() => {
      console.log('Exiting after debug delay.');
      app.quit();
    }, 10000);
  });
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription);
  });

  if (isDev) {
    win.loadURL('http://localhost:3000').catch(err => {
      console.error('Failed to load dev server:', err);
    });
  } else {
    win.loadFile(path.join(__dirname, 'index.html')).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }
}

function cleanUpTempTTSFiles() {
  const userDataDir = app.getPath('userData');
  const files = fs.readdirSync(userDataDir);
  for (const file of files) {
    // Only delete files that match the temp TTS pattern
    if (/^streammesh_tts_\d+\.wav$/.test(file)) {
      try {
        fs.unlinkSync(path.join(userDataDir, file));
        console.log('[cleanup] Deleted temp TTS file:', file);
      } catch (err) {
        console.warn('[cleanup] Failed to delete temp TTS file:', file, err);
      }
    }
  }
}

app.whenReady().then(async () => {
  cleanUpTempTTSFiles();
  initDatabase();
  registerChatBusDbListener();
  // const mainWindow = BrowserWindow.getAllWindows()[0] || BrowserWindow.getFocusedWindow();

  // Auto-connect to Twitch if credentials exist
  const twitchAuth = loadTwitchAuth();
  if (twitchAuth) {
    try {
      await platformIntegrationService.connectTwitchWithOAuth(twitchAuth);
      console.log('Auto-connected to Twitch as', twitchAuth.username);
    } catch (err) {
      console.error('Failed to auto-connect to Twitch:', err);
    }
  }

  // Register all IPC handlers (chat, twitch, etc.)
  // IPC handlers for chat messages
  ipcMain.handle('chat:insert', async (_event, msg) => {
    return new Promise((resolve, reject) => {
      insertChatMessage(msg, err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  ipcMain.handle('chat:fetch', async (_event, filters) => {
    return new Promise((resolve, reject) => {
      fetchChatMessages(filters || {}, (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('chat:deleteAll', async () => {
    return new Promise((resolve, reject) => {
      deleteAllChatMessages(err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  ipcMain.handle('chat:deleteById', async (_event, id) => {
    return new Promise((resolve, reject) => {
      deleteChatMessageById(id, err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  // Twitch connection IPC handlers with error logging
  ipcMain.handle('twitch:connect', async (_event, username: string) => {
    try {
      return platformIntegrationService.connectTwitch(username);
    } catch (err) {
      console.error('twitch:connect error:', err);
      throw err;
    }
  });
  ipcMain.handle('twitch:disconnect', async () => {
    try {
      return platformIntegrationService.disconnectTwitch();
    } catch (err) {
      console.error('twitch:disconnect error:', err);
      throw err;
    }
  });
  ipcMain.handle('twitch:status', async () => {
    try {
      return platformIntegrationService.getTwitchStatus();
    } catch (err) {
      console.error('twitch:status error:', err);
      throw err;
    }
  });

  // --- Twitch OAuth IPC handler ---
  ipcMain.handle('twitch:oauth', async (_event) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('No main window');
    try {
      const accessToken = await startTwitchOAuth(win);
      console.log('Twitch OAuth accessToken:', accessToken);
      // Fetch the username using the Twitch API
      const userInfoRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': 'cboarqiyyeps1ew3f630aimpj6d8wf',
        },
      });
      const userInfo = await userInfoRes.json();
      console.log('Twitch userInfo response:', userInfo);
      const username = userInfo.data && userInfo.data[0] && userInfo.data[0].login;
      if (!username) throw new Error('Could not fetch Twitch username');
      // Connect to Twitch chat using tmi.js
      await platformIntegrationService.connectTwitchWithOAuth({ username, accessToken });
      saveTwitchAuth({ username, accessToken });
      return { accessToken, username };
    } catch (err) {
      console.error('Twitch OAuth error:', err);
      throw err;
    }
  });

  // Polly IPC handlers
  ipcMain.handle('polly:configure', async (_event, config) => {
    configurePolly(config);
    return true;
  });

  ipcMain.handle('polly:getConfig', async () => {
    return getPollyConfig();
  });

  // TTS settings IPC handlers
  ipcMain.handle('tts:getSettings', async () => {
    return loadTTSSettings();
  });
  ipcMain.handle('tts:setSettings', async (_event, settings: TTSSettings) => {
    saveTTSSettings(settings);
    return true;
  });

  ipcMain.handle('polly:speak', async (_event, { text, voiceId, engine }) => {
    return synthesizeSpeech(text, voiceId, engine);
  });

  ipcMain.handle('polly:listVoices', async () => {
    try {
      const voices = await (await import('./backend/services/awsPolly')).listPollyVoices();
      return { voices };
    } catch (err) {
      return { voices: [], error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('polly:getAudioDataUrl', async (_event, filePath: string) => {
    const data = fs.readFileSync(filePath);
    const base64 = data.toString('base64');
    return `data:audio/mp3;base64,${base64}`;
  });

  // TTS queue IPC handlers
  ipcMain.handle('tts:clearQueue', async () => {
    ttsQueue.clearQueue();
    return true;
  });
  ipcMain.handle('tts:queueStatus', async () => {
    return { length: ttsQueue.getQueueLength() };
  });

  // Register IPC handler to open a local file
  ipcMain.handle('open-local-file', async (_event, relativePath: string) => {
    try {
      // Resolve relative to the app root (handles both dev and packaged)
      let basePath = isDev ? process.cwd() : process.resourcesPath;
      // Remove leading slashes if present
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.replace(/^[/\\]+/, '');
      }
      const absPath = path.join(basePath, relativePath);
      await shell.openPath(absPath);
      return true;
    } catch (err) {
      return false;
    }
  });

  // IPC handlers for viewers moderation system
  ipcMain.handle('fetchViewers', async () => {
    return new Promise((resolve, reject) => {
      fetchViewers((err, rows) => {
        if (err) reject(err.message);
        else resolve((rows || []).map(row => ({
          id: row.id,
          name: row.name, // Use name as display name
          platform: row.platform, // Return the real platform value
          lastActive: row.last_active_time,
        })));
      });
    });
  });

  ipcMain.handle('fetchSettings', async () => {
    return new Promise((resolve, reject) => {
      fetchSettings((err, rows) => {
        if (err) reject(err.message);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('fetchViewerSettings', async (_event, viewerId) => {
    return new Promise((resolve, reject) => {
      fetchViewerSettings(viewerId, (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('updateViewerSettings', async (_event, viewerId, settings) => {
    // settings: { [setting_id]: value }
    return Promise.all(Object.entries(settings).map(([setting_id, value]) =>
      new Promise((resolve, reject) => {
        upsertViewerSetting({ viewer_id: viewerId, setting_id, value: value as string | null }, err => {
          if (err) reject(err.message);
          else resolve(true);
        });
      })
    ));
  });

  // Listen to chatBus and enqueue chat messages for TTS
  chatBus.onChatMessage((event) => {
    // --- Upsert viewer on every chat message ---
    // Generate a unique viewer id as a hash of platform and user id
    const platformUserId = event.tags?.['user-id'] || event.user;
    const platform = event.platform;
    // Use a 12-character truncated SHA-256 hash for viewer ID (safe, compact, and unique for this use case)
    const viewerKey = crypto.createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);
    upsertViewer({
      id: viewerKey,
      name: event.user,
      platform: event.platform,
      platform_key: platformUserId,
      last_active_time: event.time,
    });

    // Only enqueue if TTS is enabled
    const ttsSettings = loadTTSSettings();
    if (ttsSettings.enabled) {
      let ttsText = event.message;
      if (ttsSettings.readNameBeforeMessage && event.user) {
        let namePart = event.user;
        if (ttsSettings.includePlatformWithName && event.platform) {
          namePart = `${event.user} from ${event.platform}`;
        }
        if (ttsText.trim().endsWith('?')) {
          ttsText = `${namePart} asks ${ttsText}`;
        } else {
          ttsText = `${namePart} says ${ttsText}`;
        }
      }
      ttsQueue.enqueue({
        text: ttsText,
        user: event.user,
        // Optionally: voiceId/engine from config or per-user in future
      });
    }
    // Send live chat message to renderer for real-time update
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('chat:live', event);
    }
  });

  // --- Forward TTS queueChanged events to renderer ---
  ttsQueue.on('queueChanged', (length: number) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && win.webContents) {
      win.webContents.send('tts:queueChanged', length);
    }
  });

  // Only create the window after all handlers are registered
  createWindow();
});

app.on('window-all-closed', () => {
  // Prevent immediate quit for debugging
  console.log('window-all-closed event');
  // Do not quit immediately
});

app.on('before-quit', () => {
  cleanUpTempTTSFiles();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
