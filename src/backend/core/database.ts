import path from 'path';
import { app } from 'electron';
import sqlite3 from 'sqlite3';
import { chatBus, ChatMessageEvent } from '../services/chatBus';
import { eventBus, StreamEvent } from '../services/eventBus';

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

  // New events table for unified event system
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    platform TEXT NOT NULL,
    channel TEXT,
    user TEXT NOT NULL,
    data TEXT,
    message TEXT,
    amount INTEGER,
    metadata TEXT,
    time TEXT NOT NULL
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

// Event functions - for the new unified event system
export function insertEvent(event: StreamEvent, cb: (err: Error | null) => void) {
  db.run(
    `INSERT INTO events (type, platform, channel, user, data, message, amount, metadata, time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.type,
      event.platform,
      event.channel,
      event.user,
      event.data ? JSON.stringify(event.data) : null,
      event.message || null,
      event.amount || null,
      event.tags ? JSON.stringify(event.tags) : null,
      event.time,
    ],
    cb
  );
}

// Fetch events with optional filters
export function fetchEvents(
  filters: {
    type?: string;
    platform?: string;
    user?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
    searchText?: string; // New: search within message and data fields
  },
  cb: (err: Error | null, rows?: any[]) => void
) {
  let query = 'SELECT * FROM events WHERE 1=1';
  const params: any[] = [];

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.platform) {
    query += ' AND platform = ?';
    params.push(filters.platform);
  }
  if (filters.user) {
    query += ' AND user = ?';
    params.push(filters.user);
  }
  if (filters.startTime) {
    query += ' AND time >= ?';
    params.push(filters.startTime);
  }
  if (filters.endTime) {
    query += ' AND time <= ?';
    params.push(filters.endTime);
  }
  if (filters.searchText) {
    query += ' AND (message LIKE ? OR data LIKE ? OR metadata LIKE ?)';
    const searchPattern = `%${filters.searchText}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY time DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  db.all(query, params, cb);
}

// Fetch events with viewer names (joined from viewers table)
export function fetchEventsWithViewerNames(
  filters: {
    type?: string;
    platform?: string;
    user?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
    searchText?: string;
  },
  cb: (err: Error | null, rows?: any[]) => void
) {
  let query = `
    SELECT 
      e.*,
      v.name as viewer_name,
      v.platform as viewer_platform
    FROM events e
    LEFT JOIN viewers v ON (
      v.platform = e.platform AND 
      (v.name = e.user OR v.platform_key = e.user)
    )
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.type) {
    query += ' AND e.type = ?';
    params.push(filters.type);
  }
  if (filters.platform) {
    query += ' AND e.platform = ?';
    params.push(filters.platform);
  }
  if (filters.user) {
    query += ' AND e.user = ?';
    params.push(filters.user);
  }
  if (filters.startTime) {
    query += ' AND e.time >= ?';
    params.push(filters.startTime);
  }
  if (filters.endTime) {
    query += ' AND e.time <= ?';
    params.push(filters.endTime);
  }
  if (filters.searchText) {
    query += ' AND (e.message LIKE ? OR e.data LIKE ? OR e.metadata LIKE ?)';
    const searchPattern = `%${filters.searchText}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY e.time DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  db.all(query, params, cb);
}

// Delete events by id
export function deleteEventById(id: number, cb: (err: Error | null) => void) {
  db.run('DELETE FROM events WHERE id = ?', [id], cb);
}

// Delete events by type
export function deleteEventsByType(type: string, cb: (err: Error | null) => void) {
  db.run('DELETE FROM events WHERE type = ?', [type], cb);
}

// Delete events older than specified date
export function deleteEventsOlderThan(date: string, cb: (err: Error | null) => void) {
  db.run('DELETE FROM events WHERE time < ?', [date], cb);
}

// Delete all events
export function deleteAllEvents(cb: (err: Error | null) => void) {
  db.run('DELETE FROM events', cb);
}

// Count events for pagination
export function countEvents(
  filters: {
    type?: string;
    platform?: string;
    user?: string;
    startTime?: string;
    endTime?: string;
    searchText?: string; // New: search within message and data fields
  },
  cb: (err: Error | null, count?: number) => void
) {
  let query = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
  const params: any[] = [];

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.platform) {
    query += ' AND platform = ?';
    params.push(filters.platform);
  }
  if (filters.user) {
    query += ' AND user = ?';
    params.push(filters.user);
  }
  if (filters.startTime) {
    query += ' AND time >= ?';
    params.push(filters.startTime);
  }
  if (filters.endTime) {
    query += ' AND time <= ?';
    params.push(filters.endTime);
  }
  if (filters.searchText) {
    query += ' AND (message LIKE ? OR data LIKE ? OR metadata LIKE ?)';
    const searchPattern = `%${filters.searchText}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  db.get(query, params, (err, row: any) => {
    cb(err, row ? row.count : 0);
  });
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

// Upsert a viewer (insert if new, update last_active_time and name if exists)
export function upsertViewer({ id, name, platform, platform_key, last_active_time }: { id: string, name: string, platform: string, platform_key: string, last_active_time: string }, cb?: (err: Error | null) => void) {
  db.run(
    `INSERT INTO viewers (id, name, platform, platform_key, last_active_time)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET 
       name=excluded.name,
       last_active_time=excluded.last_active_time` ,
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

// Register a listener for chat messages from the chatBus (backward compatibility)
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

// Register a listener for all events from the new eventBus (dual-write system)
export function registerEventBusDbListener() {
  eventBus.onEvent((event: StreamEvent) => {
    // Use a 12-character truncated SHA-256 hash for viewer ID (safe, compact, and unique for this use case)
    const platformUserId = event.tags?.['user-id'] || event.user;
    const platform = event.platform;
    const viewerKey = require('crypto').createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);
    
    // Update viewer information
    upsertViewer({
      id: viewerKey,
      name: event.user,
      platform: event.platform,
      platform_key: platformUserId,
      last_active_time: event.time,
    });
    
    // Insert event into events table
    insertEvent(event, (err) => {
      if (err) {
        console.error('Failed to insert event:', err);
      }
    });
    
    // For backward compatibility, also insert chat messages into the old chat_messages table
    if (event.type === 'chat' && event.message) {
      insertChatMessage({
        user: event.user,
        user_id: event.tags?.['user-id'] || '',
        platform: event.platform,
        time: event.time,
        text: event.message,
      }, (err) => {
        if (err) {
          console.error('Failed to insert chat message (backward compatibility):', err);
        }
      });
    }
  });
}
