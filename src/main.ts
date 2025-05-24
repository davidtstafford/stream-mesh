// Main Electron process
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { initDatabase, insertChatMessage, fetchChatMessages, deleteAllChatMessages, deleteChatMessageById } from './backend/core/database';
import { platformIntegrationService } from './backend/services/platformIntegration';
import { startTwitchOAuth } from './backend/services/twitchOAuth';
import { chatBus } from './backend/services/chatBus';
import { registerChatBusDbListener } from './backend/core/database';
import fs from 'fs';
import { configurePolly, getPollyConfig, synthesizeSpeech } from './backend/services/awsPolly';

const userDataPath = app.getPath('userData');
const authFilePath = path.join(userDataPath, 'auth.json');

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

app.whenReady().then(async () => {
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

  // Only create the window after all handlers are registered
  createWindow();
});

app.on('window-all-closed', () => {
  // Prevent immediate quit for debugging
  console.log('window-all-closed event');
  // Do not quit immediately
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
