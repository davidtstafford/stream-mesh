// Main Electron process
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
// Use require instead of import for potentially problematic packages
const isDev = require('electron-is-dev');
import { initDatabase, insertChatMessage, fetchChatMessages, deleteAllChatMessages, deleteChatMessageById, fetchViewers, fetchSettings, fetchViewerSettings, upsertViewerSetting, upsertViewer, registerEventBusDbListener, insertEvent, fetchEvents, deleteEventById, deleteEventsByType, deleteEventsOlderThan, deleteAllEvents, countEvents } from './backend/core/database';
import { platformIntegrationService } from './backend/services/platformIntegration';
import { startTwitchOAuth, clearTwitchSession } from './backend/services/twitchOAuth';
import { startKickOAuth, validateKickToken, refreshKickToken, clearKickSession } from './backend/services/kickOAuth';
import { eventBus } from './backend/services/eventBus';
import { configurePolly, getPollyConfig, synthesizeSpeech } from './backend/services/awsPolly';
import { ttsQueue } from './backend/services/ttsQueue';
import { registerObsOverlayEndpoints } from './backend/services/obsIntegration';
import { commandProcessor } from './backend/services/commandProcessor';

// --- Gang Wars IPC handlers ---
import { gwListGangs, gwListPlayers, gwDisbandGang, gwGetGang } from './backend/gangwars/core';

ipcMain.handle('gangwars:listGangs', async () => {
  try {
    const gangs = await gwListGangs();
    return { success: true, gangs };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('gangwars:listPlayers', async () => {
  try {
    const players = await gwListPlayers();
    return { success: true, players };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('gangwars:deleteGang', async (_event, gangId: string) => {
  try {
    const result = await gwDisbandGang(gangId);
    return result;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('gangwars:renameGang', async (_event, gangId: string, newName: string) => {
  try {
    // Simple implementation: update the gang name
    const gang = await gwGetGang(gangId);
    if (!gang) return { success: false, error: 'Gang not found' };
    const { db } = require('./backend/core/database');
    return new Promise((resolve) => {
      db.run('UPDATE gw_gangs SET name = ? WHERE id = ?', [newName, gangId], (err: any) => {
        if (err) resolve({ success: false, error: 'DB error' });
        else resolve({ success: true });
      });
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

// Use require for Node.js built-in modules and potentially problematic packages
const fs = require('fs');
const express = require('express') as typeof import('express');
const os = require('os');

// Function to get the local IP address
function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost'; // Fallback to localhost if no IP found
}

const userDataPath = app.getPath('userData');
const authFilePath = path.join(userDataPath, 'auth.json');
const kickAuthFilePath = path.join(userDataPath, 'kickAuth.json');
const ttsSettingsFilePath = path.join(userDataPath, 'ttsSettings.json');
const eventConfigFilePath = path.join(userDataPath, 'eventConfig.json');
const commandSettingsFilePath = path.join(userDataPath, 'commandSettings.json');
const kickCredentialsFilePath = path.join(userDataPath, 'kickCredentials.json');
const twitchCredentialsFilePath = path.join(userDataPath, 'twitchCredentials.json');

// Track event windows
const eventWindows = new Map<string, BrowserWindow>();

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

// KICK auth storage functions
function saveKickAuth(auth: { username: string, accessToken: string, refreshToken: string, expiresAt: number }) {
  fs.writeFileSync(kickAuthFilePath, JSON.stringify(auth, null, 2), 'utf-8');
}

function loadKickAuth(): { username: string, accessToken: string, refreshToken: string, expiresAt: number } | null {
  try {
    const data = fs.readFileSync(kickAuthFilePath, 'utf-8');
    const auth = JSON.parse(data);
    if (auth && auth.username && auth.accessToken && auth.refreshToken && auth.expiresAt) return auth;
    return null;
  } catch {
    return null;
  }
}

// KICK credentials storage functions (for user-provided client_id and client_secret)
function saveKickCredentials(credentials: { client_id: string, client_secret: string }) {
  fs.writeFileSync(kickCredentialsFilePath, JSON.stringify(credentials, null, 2), 'utf-8');
}

function loadKickCredentials(): { client_id: string, client_secret: string } | null {
  try {
    const data = fs.readFileSync(kickCredentialsFilePath, 'utf-8');
    const credentials = JSON.parse(data);
    if (credentials && credentials.client_id && credentials.client_secret) return credentials;
    return null;
  } catch {
    return null;
  }
}

function deleteKickCredentials(): void {
  try {
    if (fs.existsSync(kickCredentialsFilePath)) {
      fs.unlinkSync(kickCredentialsFilePath);
      console.log('KICK credentials file deleted');
    }
  } catch (err) {
    console.error('Failed to delete KICK credentials file:', err);
  }
}

// Twitch credentials storage functions (for user-provided client_id)
function saveTwitchCredentials(credentials: { client_id: string }) {
  fs.writeFileSync(twitchCredentialsFilePath, JSON.stringify(credentials, null, 2), 'utf-8');
}

function loadTwitchCredentials(): { client_id: string } | null {
  try {
    const data = fs.readFileSync(twitchCredentialsFilePath, 'utf-8');
    const credentials = JSON.parse(data);
    if (credentials && credentials.client_id) return credentials;
    return null;
  } catch {
    return null;
  }
}

function deleteTwitchCredentials(): void {
  try {
    if (fs.existsSync(twitchCredentialsFilePath)) {
      fs.unlinkSync(twitchCredentialsFilePath);
      console.log('Twitch credentials file deleted');
    }
  } catch (err) {
    console.error('Failed to delete Twitch credentials file:', err);
  }
}

// Auth deletion functions
function deleteTwitchAuth(): void {
  try {
    if (fs.existsSync(authFilePath)) {
      fs.unlinkSync(authFilePath);
      console.log('Twitch auth file deleted');
    }
  } catch (err) {
    console.error('Failed to delete Twitch auth file:', err);
  }
}

function deleteKickAuth(): void {
  try {
    if (fs.existsSync(kickAuthFilePath)) {
      fs.unlinkSync(kickAuthFilePath);
      console.log('KICK auth file deleted');
    }
  } catch (err) {
    console.error('Failed to delete KICK auth file:', err);
  }
}

// TTS global settings (for extensibility)
interface TTSSettings {
  enabled: boolean;
  readNameBeforeMessage: boolean;
  includePlatformWithName: boolean;
  maxRepeatedChars?: number; // 0 = no limit, 2 = limit to 2, 3 = limit to 3 (default)
  maxRepeatedEmojis?: number; // 0 = no limit, 2 = limit to 2, 3 = limit to 3 (default)
  skipLargeNumbers?: boolean; // Skip large numbers (6+ digits) in TTS
  muteWhenActiveSource?: boolean; // Mute native playback if overlays are connected
  disableNeuralVoices?: boolean; // New: disables neural voices in UI/backend
  blocklist?: string[]; // List of phrases that block TTS if present
  enableEmojis?: boolean; // Enable emoji reading
  enableEmotes?: boolean; // Enable emote reading
  maxRepeatedEmotes?: number; // Max repeated emotes
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
      maxRepeatedChars: typeof parsed.maxRepeatedChars === 'number' ? parsed.maxRepeatedChars : 3,
      maxRepeatedEmojis: typeof parsed.maxRepeatedEmojis === 'number' ? parsed.maxRepeatedEmojis : 3,
      skipLargeNumbers: typeof parsed.skipLargeNumbers === 'boolean' ? parsed.skipLargeNumbers : false,
      muteWhenActiveSource: typeof parsed.muteWhenActiveSource === 'boolean' ? parsed.muteWhenActiveSource : false,
      disableNeuralVoices: typeof parsed.disableNeuralVoices === 'boolean' ? parsed.disableNeuralVoices : false,
      blocklist: Array.isArray(parsed.blocklist) ? parsed.blocklist : [],
      enableEmojis: typeof parsed.enableEmojis === 'boolean' ? parsed.enableEmojis : true,
      enableEmotes: typeof parsed.enableEmotes === 'boolean' ? parsed.enableEmotes : true,
      maxRepeatedEmotes: typeof parsed.maxRepeatedEmotes === 'number' ? parsed.maxRepeatedEmotes : 3,
    };
  } catch {
    // Default: TTS off, no name prefix, no platform, maxRepeatedChars = 3, maxRepeatedEmojis = 3, emotes/emojis enabled, maxRepeatedEmotes = 3
    return {
      enabled: false,
      readNameBeforeMessage: false,
      includePlatformWithName: false,
      maxRepeatedChars: 3,
      maxRepeatedEmojis: 3,
      skipLargeNumbers: false,
      disableNeuralVoices: false,
      enableEmojis: true,
      enableEmotes: true,
      maxRepeatedEmotes: 3
    };
  }
}

function saveTTSSettings(settings: TTSSettings) {
  fs.writeFileSync(ttsSettingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
}

function loadEventConfig(): Record<string, any> {
  try {
    const data = fs.readFileSync(eventConfigFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveEventConfig(configs: Record<string, any>) {
  fs.writeFileSync(eventConfigFilePath, JSON.stringify(configs, null, 2), 'utf-8');
}

// Command settings (for system commands enable/disable, permissions, and TTS)
interface CommandSettings {
  [command: string]: {
    enabled: boolean;
    permissionLevel?: 'viewer' | 'moderator' | 'super_moderator';
    enableTTSReply?: boolean;
  };
}

function loadCommandSettings(): CommandSettings {
  try {
    const data = fs.readFileSync(commandSettingsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Default: all commands enabled at viewer level with TTS off
    return {
      '~hello': { enabled: true, permissionLevel: 'viewer', enableTTSReply: false },
      '~voices': { enabled: true, permissionLevel: 'viewer', enableTTSReply: false },
      '~setvoice': { enabled: true, permissionLevel: 'viewer', enableTTSReply: false },
      '~myvoice': { enabled: true, permissionLevel: 'viewer', enableTTSReply: false }
    };
  }
}

function saveCommandSettings(settings: CommandSettings) {
  fs.writeFileSync(commandSettingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
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
    win.loadURL('http://localhost:3000').catch((err: any) => {
      console.error('Failed to load dev server:', err);
    });
  } else {
    win.loadFile(path.join(__dirname, 'index.html')).catch((err: any) => {
      console.error('Failed to load index.html:', err);
    });
  }
}

// Cleanup and error handling improvements
let cleanupInterval: NodeJS.Timeout | null = null;

function startPeriodicCleanup() {
  // Clean up temp files every 10 minutes
  cleanupInterval = setInterval(() => {
    try {
      cleanUpTempTTSFiles();
    } catch (err) {
      console.warn('[Main] Error during periodic cleanup:', err);
    }
  }, 10 * 60 * 1000);
}

function stopPeriodicCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

function cleanUpTempTTSFiles() {
  try {
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) return;
    
    const files = fs.readdirSync(userDataDir);
    const now = Date.now();
    
    for (const file of files) {
      // Only delete files that match the temp TTS pattern (mp3 or wav, for legacy)
      if (/^streammesh_tts_\d+\.(mp3|wav)$/.test(file)) {
        try {
          const filePath = path.join(userDataDir, file);
          const stats = fs.statSync(filePath);
          
          // Delete files older than 30 minutes (aggressive cleanup for Catalina)
          if (now - stats.mtime.getTime() > 30 * 60 * 1000) {
            fs.unlinkSync(filePath);
            console.log('[cleanup] Deleted old temp TTS file:', file);
          }
        } catch (err) {
          console.warn('[cleanup] Failed to delete temp TTS file:', file, err);
        }
      }
    }
  } catch (err) {
    console.warn('[cleanup] Error during cleanup:', err);
  }
}

// Utility to limit repeated characters in a string
function filterRepeatedChars(text: string, maxRepeats: number): string {
  if (!maxRepeats || maxRepeats < 1) return text;
  // Replace runs of the same character longer than maxRepeats
  return text.replace(/(.)\1{1,}/g, (match, char) => {
    if (/\p{Emoji}/u.test(char)) return match; // skip emoji
    return char.repeat(Math.min(match.length, maxRepeats));
  });
}

// Utility to limit repeated emojis in a string
function filterRepeatedEmojis(text: string, maxRepeats: number): string {
  if (!maxRepeats || maxRepeats < 1) return text;
  // Replace runs of the same emoji longer than maxRepeats
  return text.replace(/(\p{Emoji})\1{1,}/gu, (match, emoji) => {
    return emoji.repeat(Math.min(match.length, maxRepeats));
  });
}

// Utility to filter large numbers from TTS text
function filterLargeNumbers(text: string, skip: boolean, threshold: number = 6): string {
  if (!skip) return text;
  return text.replace(/\d{6,}/g, '[large number]');
}

app.whenReady().then(async () => {
  cleanUpTempTTSFiles();
  startPeriodicCleanup(); // Start periodic cleanup for Catalina stability
  initDatabase();
  registerEventBusDbListener();
  
  // Initialize command processor with saved settings
  const commandSettings = loadCommandSettings();
  // Apply settings to the command processor
  Object.entries(commandSettings).forEach(([command, config]) => {
    commandProcessor.setCommandEnabled(command, config.enabled);
    if (config.permissionLevel) {
      commandProcessor.setCommandPermissionLevel(command, config.permissionLevel);
    }
    if (config.enableTTSReply !== undefined) {
      commandProcessor.setCommandTTSReply(command, config.enableTTSReply);
    }
  });
  
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

  // Auto-connect to KICK if credentials exist
  // DISABLED: KICK integration disabled until WebSocket support is available
  // const kickAuth = loadKickAuth();
  // if (kickAuth) {
  //   // Load credentials for token refresh
  //   const kickCredentials = loadKickCredentials();
  //   if (!kickCredentials) {
  //     console.log('KICK credentials not found, skipping auto-connect');
  //   } else {
  //     try {
  //       // Check if token is expired and refresh if needed
  //       if (Date.now() >= kickAuth.expiresAt) {
  //         console.log('KICK token expired, refreshing...');
  //         try {
  //           const refreshedTokens = await refreshKickToken(kickAuth.refreshToken, kickCredentials);
  //           const updatedAuth = {
  //             username: kickAuth.username,
  //             accessToken: refreshedTokens.access_token,
  //             refreshToken: refreshedTokens.refresh_token,
  //             expiresAt: Date.now() + (refreshedTokens.expires_in * 1000)
  //           };
  //           saveKickAuth(updatedAuth);
  //           await platformIntegrationService.connectKickWithOAuth(updatedAuth);
  //           console.log('Auto-connected to KICK as', updatedAuth.username);
  //         } catch (refreshError) {
  //           console.error('Failed to refresh KICK token:', refreshError);
  //           console.log('Please reconnect KICK manually through the UI');
  //           // Clear the invalid auth data
  //           deleteKickAuth();
  //         }
  //       } else {
  //         await platformIntegrationService.connectKickWithOAuth(kickAuth);
  //         console.log('Auto-connected to KICK as', kickAuth.username);
  //       }
  //     } catch (err) {
  //       console.error('Failed to auto-connect to KICK:', err);
  //       console.log('Please reconnect KICK manually through the UI');
  //     }
  //   }
  // }
  console.log('KICK auto-connection disabled - waiting for WebSocket API support');

  // Listen for KICK token refresh events to save updated tokens
  platformIntegrationService.on('kick-token-refreshed', (newAuth) => {
    console.log('KICK tokens refreshed, saving to storage...');
    saveKickAuth(newAuth);
  });

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
    const { format } = filters || {};
    return new Promise((resolve, reject) => {
      fetchChatMessages(filters || {}, (err, rows) => {
        if (err) reject(err.message);
        else if (format === 'formatted') {
          // Use backend formatting for each message
          const { formatChatMessage } = require('./backend/services/chatFormatting');
          resolve((rows || []).map((row: any) => formatChatMessage({
            platform: row.platform,
            channel: row.channel || '',
            user: row.user,
            message: row.text, // DB uses 'text', live uses 'message'
            time: row.time,
          })));
        } else {
          resolve(rows);
        }
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

  // Event system IPC handlers
  ipcMain.handle('events:fetch', async (_event, filters) => {
    return new Promise((resolve, reject) => {
      fetchEvents(filters || {}, (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('events:deleteAll', async () => {
    return new Promise((resolve, reject) => {
      deleteAllEvents(err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  ipcMain.handle('events:deleteById', async (_event, id) => {
    return new Promise((resolve, reject) => {
      deleteEventById(id, err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  ipcMain.handle('events:deleteByType', async (_event, type) => {
    return new Promise((resolve, reject) => {
      deleteEventsByType(type, err => {
        if (err) reject(err.message);
        else resolve(true);
      });
    });
  });

  ipcMain.handle('events:count', async (_event, filters) => {
    return new Promise((resolve, reject) => {
      countEvents(filters || {}, (err, count) => {
        if (err) reject(err.message);
        else resolve(count || 0);
      });
    });
  });

  // Event configuration IPC handlers (using file storage)
  ipcMain.handle('eventConfig:load', async () => {
    try {
      return loadEventConfig();
    } catch (error) {
      console.error('Failed to load event config:', error);
      return {};
    }
  });

  ipcMain.handle('eventConfig:save', async (_event, configs) => {
    try {
      saveEventConfig(configs);
      return true;
    } catch (error) {
      console.error('Failed to save event config:', error);
      throw error;
    }
  });

  // Developer tools IPC handlers
  ipcMain.handle('developer:triggerEvent', async (_event, eventData) => {
    try {
      console.log('Developer: Triggering event:', eventData);
      
      // Send the event through the eventBus using the correct method
      eventBus.emitEvent(eventData);
      
      return { success: true, message: `Triggered ${eventData.type} event successfully` };
    } catch (err) {
      console.error('developer:triggerEvent error:', err);
      throw err;
    }
  });

  // KICK Developer simulation handler (alias for triggerEvent)
  ipcMain.handle('developer:simulateEvent', async (_event, eventData) => {
    try {
      console.log('Developer: Simulating KICK event:', eventData);
      
      // Send the event through the eventBus using the correct method
      eventBus.emitEvent(eventData);
      
      return { success: true, message: `Simulated ${eventData.type} event successfully` };
    } catch (err) {
      console.error('developer:simulateEvent error:', err);
      throw err;
    }
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
      const result = platformIntegrationService.disconnectTwitch();
      deleteTwitchAuth(); // Delete stored auth file
      await clearTwitchSession(); // Clear browser session data
      return result;
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
    
    // Load user-provided credentials
    const credentials = loadTwitchCredentials();
    if (!credentials) {
      throw new Error('Twitch credentials not found. Please save your Client ID first.');
    }
    
    try {
      const accessToken = await startTwitchOAuth(win, credentials);
      console.log('Twitch OAuth accessToken:', accessToken);
      // Fetch the username using the Twitch API
      const userInfoRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': credentials.client_id,
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

  // --- KICK OAuth IPC handlers ---
  ipcMain.handle('kick:oauth', async (_event) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('No main window');
    
    // Load user-provided credentials
    const credentials = loadKickCredentials();
    if (!credentials) {
      throw new Error('KICK credentials not found. Please save your Client ID and Client Secret first.');
    }
    
    try {
      const tokenResponse = await startKickOAuth(win, credentials);
      console.log('KICK OAuth token response:', tokenResponse);
      
      // Validate token and get user info
      const userInfo = await validateKickToken(tokenResponse.access_token);
      console.log('KICK userInfo response:', userInfo);
      
      // Extract username from channels API response
      let username: string;
      if (userInfo.data && Array.isArray(userInfo.data) && userInfo.data.length > 0) {
        const lastChannel = userInfo.data[userInfo.data.length - 1];
        username = lastChannel.slug || lastChannel.broadcaster_username;
      } else {
        username = userInfo.username || userInfo.login || userInfo.slug;
      }
      
      if (!username) throw new Error('Could not fetch KICK username from API response');
      
      // Prepare auth object
      const kickAuth = {
        username,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
      };
      
      // Connect to KICK
      await platformIntegrationService.connectKickWithOAuth(kickAuth);
      saveKickAuth(kickAuth);
      
      return { accessToken: tokenResponse.access_token, username };
    } catch (err) {
      console.error('KICK OAuth error:', err);
      throw err;
    }
  });

  ipcMain.handle('kick:connect', async (_event, username: string) => {
    try {
      // For now, this is a placeholder - KICK uses OAuth only
      throw new Error('KICK requires OAuth authentication. Use kick:oauth instead.');
    } catch (err) {
      console.error('kick:connect error:', err);
      throw err;
    }
  });

  ipcMain.handle('kick:disconnect', async () => {
    try {
      const result = platformIntegrationService.disconnectKick();
      deleteKickAuth(); // Delete stored auth file
      await clearKickSession(); // Clear browser session data
      return result;
    } catch (err) {
      console.error('kick:disconnect error:', err);
      throw err;
    }
  });

  ipcMain.handle('kick:status', async () => {
    try {
      // KICK integration disabled - WebSocket events not available for desktop apps
      // Return disconnected status to prevent auto-connection attempts
      return { connected: false, username: "", disabled: true, reason: "Real-time events require WebSocket support" };
    } catch (err) {
      console.error('kick:status error:', err);
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

  // Network utility handlers
  ipcMain.handle('network:getLocalIP', async () => {
    return getLocalIPAddress();
  });

  // TTS settings IPC handlers
  ipcMain.handle('tts:getBlocklist', async () => {
    const settings = loadTTSSettings();
    return Array.isArray(settings.blocklist) ? settings.blocklist : [];
  });
  ipcMain.handle('tts:setBlocklist', async (_event, blocklist: string[]) => {
    const settings = loadTTSSettings();
    settings.blocklist = Array.isArray(blocklist) ? blocklist : [];
    saveTTSSettings(settings);
    return true;
  });
  ipcMain.handle('tts:getSettings', async () => {
    return loadTTSSettings();
  });
  ipcMain.handle('tts:setSettings', async (_event, settings: TTSSettings) => {
    // Always preserve the current blocklist unless explicitly set
    const current = loadTTSSettings();
    const merged = { ...settings, blocklist: Array.isArray(settings.blocklist) ? settings.blocklist : (current.blocklist || []) };
    saveTTSSettings(merged);
    return true;
  });

  // Command system IPC handlers
  ipcMain.handle('commands:getSystemCommands', async () => {
    try {
      const commands = commandProcessor.getSystemCommands();
      console.log('[Main] Returning system commands:', commands);
      return commands;
    } catch (error) {
      console.error('[Main] Error getting system commands:', error);
      throw error;
    }
  });
  
  ipcMain.handle('commands:setEnabled', async (_event, command: string, enabled: boolean) => {
    commandProcessor.setCommandEnabled(command, enabled);
    
    // Save to persistent storage
    const currentSettings = loadCommandSettings();
    if (!currentSettings[command]) {
      currentSettings[command] = { enabled, permissionLevel: 'viewer' };
    } else {
      currentSettings[command].enabled = enabled;
    }
    saveCommandSettings(currentSettings);
    
    return true;
  });

  ipcMain.handle('commands:setPermissionLevel', async (_event, command: string, permissionLevel: 'viewer' | 'moderator' | 'super_moderator') => {
    commandProcessor.setCommandPermissionLevel(command, permissionLevel);
    
    // Save to persistent storage
    const currentSettings = loadCommandSettings();
    if (!currentSettings[command]) {
      currentSettings[command] = { enabled: true, permissionLevel };
    } else {
      currentSettings[command].permissionLevel = permissionLevel;
    }
    saveCommandSettings(currentSettings);
    
    return true;
  });

  ipcMain.handle('commands:setTTSReply', async (_event, command: string, enableTTSReply: boolean) => {
    commandProcessor.setCommandTTSReply(command, enableTTSReply);
    
    // Save to persistent storage
    const currentSettings = loadCommandSettings();
    if (!currentSettings[command]) {
      currentSettings[command] = { enabled: true, enableTTSReply };
    } else {
      currentSettings[command].enableTTSReply = enableTTSReply;
    }
    saveCommandSettings(currentSettings);
    
    return true;
  });
  
  ipcMain.handle('commands:getSettings', async () => {
    return loadCommandSettings();
  });

  // Chat message sending IPC handler
  ipcMain.handle('chat:sendMessage', async (_event, message: string) => {
    try {
      await platformIntegrationService.sendChatMessage(message);
      return { success: true };
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
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

  // Event window management IPC handlers
  console.log('🔧 Registering event window IPC handlers...');
  ipcMain.handle('eventWindow:create', async (_event, windowId: string, config?: any) => {
    console.log('🚀 eventWindow:create handler called with windowId:', windowId);
    try {
      // Don't create if window already exists
      if (eventWindows.has(windowId)) {
        const existingWindow = eventWindows.get(windowId);
        if (existingWindow && !existingWindow.isDestroyed()) {
          existingWindow.focus();
          return { success: true, windowId };
        }
        // Clean up destroyed window reference
        eventWindows.delete(windowId);
      }

      const eventWindow = new BrowserWindow({
        width: config?.width || 800,
        height: config?.height || 600,
        x: config?.x || undefined,
        y: config?.y || undefined,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true
        },
        title: config?.title || 'Event Monitor',
        alwaysOnTop: config?.alwaysOnTop || false,
        frame: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true
      });

      // Track the window
      eventWindows.set(windowId, eventWindow);

      // Clean up when window is closed
      eventWindow.on('closed', () => {
        eventWindows.delete(windowId);
      });

      // Load the same URL as main window but with a query parameter to identify it as an event window
      if (isDev) {
        eventWindow.loadURL(`http://localhost:3000?eventWindow=${windowId}&config=${encodeURIComponent(JSON.stringify(config || {}))}`);
      } else {
        eventWindow.loadFile(path.join(__dirname, 'index.html'), {
          query: { eventWindow: windowId, config: JSON.stringify(config || {}) }
        });
      }

      return { success: true, windowId };
    } catch (error) {
      console.error('Failed to create event window:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('🔧 Registering eventWindow:close handler...');
  ipcMain.handle('eventWindow:close', async (_event, windowId: string) => {
    try {
      const window = eventWindows.get(windowId);
      if (window && !window.isDestroyed()) {
        window.close();
        return { success: true };
      }
      return { success: false, error: 'Window not found or already closed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('🔧 Registering eventWindow:list handler...');
  ipcMain.handle('eventWindow:list', async () => {
    const activeWindows: string[] = [];
    for (const [windowId, window] of eventWindows.entries()) {
      if (!window.isDestroyed()) {
        activeWindows.push(windowId);
      } else {
        eventWindows.delete(windowId);
      }
    }
    return activeWindows;
  });

  console.log('🔧 Registering eventWindow:updateTitle handler...');
  ipcMain.handle('eventWindow:updateTitle', async (_event, windowId: string, title: string) => {
    try {
      const window = eventWindows.get(windowId);
      if (window && !window.isDestroyed()) {
        window.setTitle(title);
        return { success: true };
      }
      return { success: false, error: 'Window not found or already closed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
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

  // Register IPC handler to open external URLs
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
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
    // settings: { [key]: value }
    return Promise.all(Object.entries(settings).map(([key, value]) =>
      new Promise((resolve, reject) => {
        upsertViewerSetting({ viewer_id: viewerId, key, value: value as string | null }, err => {
          if (err) reject(err.message);
          else resolve(true);
        });
      })
    ));
  });

  ipcMain.handle('deleteViewer', async (_event, viewerId) => {
    return new Promise((resolve, reject) => {
      // Delete from settings (KVP table) first, then viewers
      const db = require('./backend/core/database');
      fetchSettings((err, rows) => {
        if (err) return reject(err.message);
        // Delete all settings for this viewer
        db.db.run('DELETE FROM settings WHERE viewer_id = ?', [viewerId], (err2: Error | null) => {
          if (err2) return reject(err2.message);
          // Delete the viewer itself
          db.db.run('DELETE FROM viewers WHERE id = ?', [viewerId], (err3: Error | null) => {
            if (err3) return reject(err3.message);
            resolve(true);
          });
        });
      });
    });
  });

  // Listen to eventBus and enqueue chat messages for TTS (filter for chat events only)
  eventBus.onEventType('chat', (event) => {
    // Skip if no message (shouldn't happen for chat events, but type safety)
    if (!event.message) return;
    
    // Skip bot messages to prevent TTS spam
    if (event.tags?.['is-bot-message'] === 'true') {
      console.log('[TTS] Skipping bot message:', event.message);
      return;
    }
    
    // Type-safe access to message
    const messageText = event.message;

    // --- Upsert viewer on every chat message ---
    // Generate a unique viewer id as a hash of platform and user id
    const platformUserId = event.tags?.['user-id'] || event.user;
    const platform = event.platform;
    const crypto = require('crypto');
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
      // Fetch viewer settings synchronously (from DB)
      fetchViewerSettings(viewerKey, (err, rows) => {
        let voiceId = undefined;
        let ttsDisabled = false;
        if (!err && Array.isArray(rows)) {
          const voiceSetting = rows.find(r => r.key === 'voice');
          if (voiceSetting && voiceSetting.value && voiceSetting.value !== '') {
            voiceId = voiceSetting.value;
          }
          const ttsSetting = rows.find(r => r.key === 'tts_disabled');
          if (ttsSetting && ttsSetting.value === 'true') {
            ttsDisabled = true;
          }
        }
        if (ttsDisabled) return; // Do not enqueue if TTS is disabled for this user
        let ttsText = messageText;
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
        // Apply repeated char filter
        if (typeof ttsSettings.maxRepeatedChars === 'number' && ttsSettings.maxRepeatedChars > 0) {
          ttsText = filterRepeatedChars(ttsText, ttsSettings.maxRepeatedChars);
        }
        // Apply repeated emoji filter
        if (typeof ttsSettings.maxRepeatedEmojis === 'number' && ttsSettings.maxRepeatedEmojis > 0) {
          ttsText = filterRepeatedEmojis(ttsText, ttsSettings.maxRepeatedEmojis);
        }
        // Apply large number filter
        if (typeof ttsSettings.skipLargeNumbers === 'boolean' && ttsSettings.skipLargeNumbers) {
          ttsText = filterLargeNumbers(ttsText, true);
        }
        // --- Mute native playback if overlays are connected and muteWhenActiveSource is true ---
        const { getActiveTTSOverlayConnections } = require('./backend/services/obsIntegration');
        const muteNative = !!ttsSettings.muteWhenActiveSource && getActiveTTSOverlayConnections() > 0;
        ttsQueue.enqueue({
          text: ttsText,
          user: event.user,
          voiceId, // If set, will override default
          muteNative,
          emotes: event.tags?.emotes,
        });
      });
    }
    // Send live chat message to renderer for real-time update (format for UI/OBS)
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      // Use backend formatting for live messages
      const { formatChatMessage } = require('./backend/services/chatFormatting');
      win.webContents.send('chat:live', formatChatMessage(event));
    }
  });

  // --- Forward all events from eventBus to renderer for Events screen ---
  eventBus.onEvent((event: any) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && win.webContents) {
      console.log('Forwarding event to renderer:', event.type, event.user); // Debug log
      win.webContents.send('events:live', event);
    } else {
      console.log('No window available to forward event to'); // Debug log
    }

    // Also forward to all event windows
    for (const [windowId, eventWindow] of eventWindows.entries()) {
      if (!eventWindow.isDestroyed() && eventWindow.webContents) {
        eventWindow.webContents.send('events:live', event);
      } else {
        // Clean up destroyed window reference
        eventWindows.delete(windowId);
      }
    }
  });

  // --- Forward TTS queueChanged events to renderer ---
  ttsQueue.on('queueChanged', (length: number) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && win.webContents) {
      win.webContents.send('tts:queueChanged', length);
    }
  });

  // --- Express server for OBS overlays ---
  const overlayServer = express();
  // Enable CORS for all overlay endpoints
  overlayServer.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });
  registerObsOverlayEndpoints(overlayServer);
  overlayServer.listen(3001, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`Overlay server running on http://localhost:3001`);
    console.log(`Overlay server accessible from network at http://${localIP}:3001`);
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
  console.log('[Main] App shutting down, cleaning up...');
  stopPeriodicCleanup();
  
  // Clean up TTS queue
  try {
    ttsQueue.destroy();
  } catch (err) {
    console.warn('[Main] Error destroying TTS queue:', err);
  }
  
  cleanUpTempTTSFiles();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// After app/server is created:
if (process.env.NODE_ENV !== 'test') {
  // ...existing code to create express app...
  // Remove this line, as we now use overlayServer for OBS endpoints
  // registerObsOverlayEndpoints(app); // <-- Remove this line
}

// Add global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to show a user-friendly error dialog
  if (!isDev) {
    console.error('Stack trace:', error.stack);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- KICK Credentials IPC handlers ---
  ipcMain.handle('kick:saveCredentials', async (_event, credentials: { client_id: string, client_secret: string }) => {
    try {
      saveKickCredentials(credentials);
      return { success: true };
    } catch (err) {
      console.error('kick:saveCredentials error:', err);
      throw err;
    }
  });

  ipcMain.handle('kick:loadCredentials', async () => {
    try {
      const credentials = loadKickCredentials();
      return credentials || null;
    } catch (err) {
      console.error('kick:loadCredentials error:', err);
      throw err;
    }
  });

  ipcMain.handle('kick:deleteCredentials', async () => {
    try {
      deleteKickCredentials();
      return { success: true };
    } catch (err) {
      console.error('kick:deleteCredentials error:', err);
      throw err;
    }
  });

  // --- Twitch Credentials IPC handlers ---
  ipcMain.handle('twitch:saveCredentials', async (_event, credentials: { client_id: string }) => {
    try {
      saveTwitchCredentials(credentials);
      return { success: true };
    } catch (err) {
      console.error('twitch:saveCredentials error:', err);
      throw err;
    }
  });

  ipcMain.handle('twitch:loadCredentials', async () => {
    try {
      const credentials = loadTwitchCredentials();
      return credentials || null;
    } catch (err) {
      console.error('twitch:loadCredentials error:', err);
      throw err;
    }
  });

  ipcMain.handle('twitch:deleteCredentials', async () => {
    try {
      deleteTwitchCredentials();
      return { success: true };
    } catch (err) {
      console.error('twitch:deleteCredentials error:', err);
      throw err;
    }
  });

  // Get local IP address handler
  ipcMain.handle('system:getLocalIPAddress', async () => {
    try {
      const ipAddress = getLocalIPAddress();
      return { success: true, ipAddress };
    } catch (err) {
      console.error('system:getLocalIPAddress error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
