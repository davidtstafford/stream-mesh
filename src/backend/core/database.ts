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

// Register a listener for chat messages from the chatBus
export function registerChatBusDbListener() {
  chatBus.onChatMessage((event: ChatMessageEvent) => {
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
