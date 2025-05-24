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
    last_active_time DATETIME NOT NULL -- Last time the viewer was active
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viewer_id TEXT NOT NULL,            -- Foreign key to viewers.id
    key TEXT NOT NULL,                  -- Setting name (e.g., 'role', 'tts_disabled', 'voice')
    value TEXT,                         -- Setting value
    FOREIGN KEY (viewer_id) REFERENCES viewers(id)
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

// Upsert a viewer (insert if new, update last_active_time if exists)
export function upsertViewer({ id, platform, platform_key, last_active_time }: { id: string, platform: string, platform_key: string, last_active_time: string }, cb?: (err: Error | null) => void) {
  db.run(
    `INSERT INTO viewers (id, platform, platform_key, last_active_time)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_active_time=excluded.last_active_time` ,
    [id, platform, platform_key, last_active_time],
    cb || (() => {})
  );
}

// Fetch all viewers (for UI table)
export function fetchViewers(cb: (err: Error | null, rows?: any[]) => void) {
  db.all('SELECT id, platform, platform_key, last_active_time FROM viewers', [], cb);
}

// Fetch all settings (for UI settings modal)
export function fetchSettings(cb: (err: Error | null, rows?: any[]) => void) {
  db.all('SELECT * FROM settings', [], cb);
}

// Fetch all settings for a given viewer (viewer_settings + settings join)
export function fetchViewerSettings(viewerId: string, cb: (err: Error | null, rows?: any[]) => void) {
  db.all(`
    SELECT vs.id, vs.setting_id, vs.value, s.name, s.type, s.default_value
    FROM settings s
    LEFT JOIN viewer_settings vs ON vs.setting_id = s.id AND vs.viewer_id = ?
  `, [viewerId], cb);
}

// Upsert a viewer setting (insert or update value)
export function upsertViewerSetting({ viewer_id, setting_id, value }: { viewer_id: string, setting_id: string, value: string | null }, cb: (err: Error | null) => void) {
  db.run(
    `INSERT INTO viewer_settings (id, viewer_id, setting_id, value)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?)
     ON CONFLICT(viewer_id, setting_id) DO UPDATE SET value=excluded.value`,
    [viewer_id, setting_id, value],
    cb
  );
}

// Register a listener for chat messages from the chatBus
export function registerChatBusDbListener() {
  chatBus.onChatMessage((event: ChatMessageEvent) => {
    // Upsert viewer on every chat message
    upsertViewer({
      id: event.tags?.['user-id'] || '',
      platform: event.platform,
      platform_key: event.user,
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
