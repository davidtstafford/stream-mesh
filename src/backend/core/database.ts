import path from 'path';
import { app } from 'electron';
import sqlite3 from 'sqlite3';
import { chatBus, ChatMessageEvent } from '../services/chatBus';

// Determine the path for the SQLite database file in the user's app data directory
const dbPath = path.join(app.getPath('userData'), 'StreamMesh.sqlite');

// Open the SQLite database (will create if it doesn't exist)
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
  } else {
    console.log('SQLite database opened at', dbPath);
  }
});

// Example: Create a table for chat messages if it doesn't exist
export function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    user_id TEXT,
    platform TEXT,
    time TEXT,
    text TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS viewers (
    id TEXT PRIMARY KEY, -- Hash of platform user id and platform name
    name TEXT NOT NULL,  -- Display name of the viewer
    platform TEXT NOT NULL, -- Platform name (e.g., 'twitch')
    platform_key TEXT,   -- Platform-specific user id or key
    last_active_time DATETIME NOT NULL -- Last time the viewer was active
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viewer_id TEXT NOT NULL,            -- Foreign key to viewers.id
    key TEXT NOT NULL,                  -- Setting name (e.g., 'role', 'tts_disabled', 'voice')
    value TEXT,                         -- Setting value
    FOREIGN KEY (viewer_id) REFERENCES viewers(id),
    UNIQUE(viewer_id, key)
  )`);
}

// Insert a chat message
export function insertChatMessage({ user, user_id, platform, time, text }: { user: string, user_id: string, platform: string, time: string, text: string }, cb: (err: Error | null) => void) {
  db.run(
    `INSERT INTO chat_messages (user, user_id, platform, time, text) VALUES (?, ?, ?, ?, ?)`,
    [user, user_id, platform, time, text],
    cb
  );
}

// Fetch chat messages (optionally with filters)
export function fetchChatMessages({ user, platform, text }: { user?: string, platform?: string, text?: string }, cb: (err: Error | null, rows?: any[]) => void) {
  let query = 'SELECT * FROM chat_messages WHERE 1=1';
  const params: any[] = [];
  if (user) { query += ' AND user = ?'; params.push(user); }
  if (platform) { query += ' AND platform = ?'; params.push(platform); }
  if (text) { query += ' AND text LIKE ?'; params.push(`%${text}%`); }
  db.all(query, params, cb);
}

// Delete all chat messages
export function deleteAllChatMessages(cb: (err: Error | null) => void) {
  db.run('DELETE FROM chat_messages', cb);
}

// Delete a single chat message by id
export function deleteChatMessageById(id: number, cb: (err: Error | null) => void) {
  db.run('DELETE FROM chat_messages WHERE id = ?', [id], cb);
}

// Ensure default settings for a viewer
export function ensureDefaultViewerSettings(viewerId: string, cb: (err: Error | null) => void) {
  // Check if each setting exists, insert if not
  const defaults = [
    { key: 'tts_disabled', value: 'false' },
    { key: 'role', value: 'viewer' },
    { key: 'voice', value: '' },
  ];
  let remaining = defaults.length;
  let error: Error | null = null;
  defaults.forEach(({ key, value }) => {
    db.get('SELECT 1 FROM settings WHERE viewer_id = ? AND key = ?', [viewerId, key], (err1, row) => {
      if (err1) error = err1;
      if (!row) {
        db.run('INSERT INTO settings (viewer_id, key, value) VALUES (?, ?, ?)', [viewerId, key, value], err2 => {
          if (err2) error = err2;
          if (--remaining === 0) cb(error);
        });
      } else {
        if (--remaining === 0) cb(error);
      }
    });
  });
}

// Upsert a viewer (insert if new, update last_active_time if exists)
export function upsertViewer({ id, name, platform, platform_key, last_active_time }: { id: string, name: string, platform: string, platform_key: string, last_active_time: string }, cb?: (err: Error | null) => void) {
  db.run(
    `INSERT INTO viewers (id, name, platform, platform_key, last_active_time)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_active_time=excluded.last_active_time` ,
    [id, name, platform, platform_key, last_active_time],
    (err) => {
      if (!err) {
        ensureDefaultViewerSettings(id, () => {});
      }
      if (cb) cb(err);
    }
  );
}

// Fetch all viewers (for UI table)
export function fetchViewers(cb: (err: Error | null, rows?: any[]) => void) {
  db.all('SELECT id, name, platform, last_active_time FROM viewers', [], cb);
}

// Fetch all settings (for UI settings modal)
export function fetchSettings(cb: (err: Error | null, rows?: any[]) => void) {
  db.all('SELECT * FROM settings', [], cb);
}

// Fetch all settings for a given viewer (settings table only)
export function fetchViewerSettings(viewerId: string, cb: (err: Error | null, rows?: any[]) => void) {
  db.all(
    'SELECT id, key, value FROM settings WHERE viewer_id = ?',
    [viewerId],
    cb
  );
}

// Upsert a viewer setting (insert or update value)
export function upsertViewerSetting({ viewer_id, key, value }: { viewer_id: string, key: string, value: string | null }, cb: (err: Error | null) => void) {
  db.run(
    `INSERT INTO settings (viewer_id, key, value)
     VALUES (?, ?, ?)
     ON CONFLICT(viewer_id, key) DO UPDATE SET value=excluded.value`,
    [viewer_id, key, value],
    cb
  );
}

// Register a listener for chat messages from the chatBus
export function registerChatBusDbListener() {
  chatBus.onChatMessage((event: ChatMessageEvent) => {
    // Use a 12-character truncated SHA-256 hash for viewer ID (safe, compact, and unique for this use case)
    const platformUserId = event.tags?.['user-id'] || event.user;
    const platform = event.platform;
    const viewerKey = require('crypto').createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);
    upsertViewer({
      id: viewerKey,
      name: event.user,
      platform: event.platform,
      platform_key: platformUserId,
      last_active_time: event.time,
    });
    insertChatMessage({
      user: event.user,
      user_id: event.tags?.['user-id'] || '',
      platform: event.platform,
      time: event.time,
      text: event.message,
    }, (err) => {
      if (err) {
        console.error('Failed to insert chat message:', err);
      }
    });
  });
}
