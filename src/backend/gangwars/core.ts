// Delete a player by ID (Super Mod only)
// If requesterId === playerId, always allow (app owner self-delete). Otherwise, check is_supermod.
export function gwDeletePlayer(requesterId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    // Always allow player deletion from the UI (IPC)
    db.run('UPDATE gw_players SET gang_id = NULL WHERE id = ?', [playerId], () => {
      db.run('DELETE FROM gang_join_requests WHERE player_id = ?', [playerId], () => {
        db.all('SELECT id, disband_votes FROM gw_gangs', [], (err3: any, gangs: any[]) => {
          if (Array.isArray(gangs)) {
            gangs.forEach(gang => {
              let votes: string[] = [];
              try { votes = JSON.parse(gang.disband_votes || '[]'); } catch {}
              if (votes.includes(playerId)) {
                const newVotes = votes.filter((v: string) => v !== playerId);
                db.run('UPDATE gw_gangs SET disband_votes = ? WHERE id = ?', [JSON.stringify(newVotes), gang.id]);
              }
            });
          }
          db.run('DELETE FROM gw_players WHERE id = ?', [playerId], (err2: any) => {
            if (err2) return resolve({ success: false, error: 'DB error' });
            resolve({ success: true });
          });
        });
      });
    });
  });
}
// --- List all gangs ---
export function gwListGangs(): Promise<GWGang[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM gw_gangs', [], async (err: any, gangs: any[]) => {
      if (err) return reject(err);
      // For each gang, fetch members
      const result: GWGang[] = await Promise.all((gangs || []).map(async (gang) => {
        return new Promise<GWGang>((res) => {
          db.all('SELECT id FROM gw_players WHERE gang_id = ?', [gang.id], (err2: any, memberRows: any[]) => {
            const members = Array.isArray(memberRows) ? memberRows.map(m => m.id) : [];
            res({ ...gang, members });
          });
        });
      }));
      resolve(result);
    });
  });
}

// --- List all players ---
export function gwListPlayers(): Promise<GWPlayer[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM gw_players', [], (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
// --- Deposit currency into gang bank ---
export function gwDeposit(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement deposit logic
  return Promise.resolve({ success: false, error: 'Not implemented' });
}

// --- Withdraw currency from gang bank ---
export async function gwWithdraw(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // Role-based withdraw logic
  const player: GWPlayer = await gwGetPlayer(playerId);
  if (!player || !player.gang_id) return { success: false, error: 'Not in a gang' };
  const gang: GWGang = await gwGetGang(player.gang_id);
  if (!gang) return { success: false, error: 'Gang not found' };
  if (player.role === 'Grunt') {
    // Grunt cannot withdraw directly
    return { success: false, error: 'Grunts cannot withdraw. Request approval from a Lieutenant or God Father.' };
  }
  if (player.role === 'Lieutenant') {
    // Lieutenant can withdraw up to 10% of bank
    if (amount > gang.bank * 0.1) return { success: false, error: 'Lieutenant can only withdraw up to 10% of gang bank.' };
  }
  // God Father can withdraw any amount
  if (amount > gang.bank) return { success: false, error: 'Insufficient gang funds' };
  return new Promise((resolve) => {
    db.run('UPDATE gw_gangs SET bank = bank - ? WHERE id = ?', [amount, gang.id], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true });
    });
  });
}

import { db } from '../core/database';

// --- DB Migration for join requests and roles ---
db.serialize(() => {
  // Add role column to gw_players if not exists
  db.run('ALTER TABLE gw_players ADD COLUMN role TEXT DEFAULT "Grunt"', (err: any) => {});
  // Create gang_join_requests table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS gang_join_requests (
    id TEXT PRIMARY KEY,
    player_id TEXT,
    gang_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err: any) => {});
});
import { GWWeapon, GWPlayer, GWGang } from './models';


// Example weapon list (should be loaded from DB or config in production)
export const WEAPONS: GWWeapon[] = [
  { id: 'pistol', name: 'Pistol', cost: 100, power: 10, upgrade_cost: 50, max_level: 3 },
  { id: 'shotgun', name: 'Shotgun', cost: 300, power: 25, upgrade_cost: 150, max_level: 3 },
  { id: 'rifle', name: 'Rifle', cost: 600, power: 50, upgrade_cost: 300, max_level: 3 },
  { id: 'smg', name: 'SMG', cost: 1200, power: 80, upgrade_cost: 600, max_level: 4 },
  { id: 'sniper', name: 'Sniper Rifle', cost: 3000, power: 150, upgrade_cost: 1200, max_level: 4 },
  { id: 'lmg', name: 'Light Machine Gun', cost: 7000, power: 300, upgrade_cost: 2500, max_level: 4 },
  { id: 'rocket', name: 'Rocket Launcher', cost: 20000, power: 800, upgrade_cost: 6000, max_level: 5 },
  { id: 'flamethrower', name: 'Flamethrower', cost: 50000, power: 1500, upgrade_cost: 15000, max_level: 5 },
  { id: 'minigun', name: 'Minigun', cost: 150000, power: 4000, upgrade_cost: 40000, max_level: 5 },
  { id: 'railgun', name: 'Railgun', cost: 500000, power: 12000, upgrade_cost: 120000, max_level: 6 },
  { id: 'plasmacannon', name: 'Plasma Cannon', cost: 2000000, power: 40000, upgrade_cost: 400000, max_level: 6 },
  { id: 'orbital', name: 'Orbital Strike', cost: 10000000, power: 200000, upgrade_cost: 2000000, max_level: 7 },
  { id: 'blackhole', name: 'Black Hole Generator', cost: 50000000, power: 1000000, upgrade_cost: 10000000, max_level: 7 },
  { id: 'nanobot', name: 'Nanobot Swarm', cost: 200000000, power: 5000000, upgrade_cost: 40000000, max_level: 8 },
  { id: 'antimatter', name: 'Antimatter Bomb', cost: 1000000000, power: 20000000, upgrade_cost: 200000000, max_level: 8 }
];

function getInventoryObj(player: GWPlayer): Record<string, number> {
  let inventory: Record<string, number> = {};
  try {
    if (typeof player.inventory === 'string') {
      inventory = JSON.parse(player.inventory);
    } else if (Array.isArray(player.inventory)) {
      // Legacy: convert array to object with level 1
      for (const wid of player.inventory) inventory[wid] = 1;
    } else if (typeof player.inventory === 'object') {
      inventory = player.inventory as any;
    }
  } catch { inventory = {}; }
  return inventory;
}

export async function gwBuyWeapon(playerId: string, weaponId: string): Promise<{ success: boolean; error?: string }> {
  const player: GWPlayer = await gwGetPlayer(playerId);
  if (!player) return { success: false, error: 'Player not found' };
  const weapon = WEAPONS.find(w => w.id === weaponId);
  if (!weapon) return { success: false, error: 'Weapon not found' };
  if (player.currency < weapon.cost) return { success: false, error: 'Insufficient funds' };
  let inventory = getInventoryObj(player);
  if (inventory[weaponId]) return { success: false, error: 'Already owned' };
  inventory[weaponId] = 1;
  // Update player inventory and currency
  return new Promise((resolve) => {
    db.run('UPDATE gw_players SET currency = currency - ?, inventory = ? WHERE id = ?', [weapon.cost, JSON.stringify(inventory), playerId], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true });
    });
  });
}
// --- Get player/gang info ---
export function gwGetPlayer(playerId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM gw_players WHERE id = ?`, [playerId], (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function gwGetGang(gangId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM gw_gangs WHERE id = ?`, [gangId], (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
  // --- End get functions ---

// --- Gang joining ---
import { v4 as uuidv4 } from 'uuid';
export function gwJoinGang(playerId: string, gangId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    const player = await gwGetPlayer(playerId);
    if (!player) return resolve({ success: false, error: 'Player not registered' });
    const gang = await gwGetGang(gangId);
    if (!gang) return resolve({ success: false, error: 'Gang not found' });
    if (player.gang_id) return resolve({ success: false, error: 'Already in a gang' });
    // Check for existing request
    db.get('SELECT * FROM gang_join_requests WHERE player_id = ? AND gang_id = ?', [playerId, gangId], (err: any, row: any) => {
      if (row) return resolve({ success: false, error: 'Already requested to join' });
      // Add join request
      db.run('INSERT INTO gang_join_requests (id, player_id, gang_id) VALUES (?, ?, ?)', [uuidv4(), playerId, gangId], (err2: any) => {
        if (err2) return resolve({ success: false, error: 'DB error' });
        resolve({ success: true });
      });
    });
  });
}

// List join requests for a gang
export function gwListJoinRequests(gangId: string): Promise<any[]> {
  return new Promise((resolve) => {
    db.all('SELECT * FROM gang_join_requests WHERE gang_id = ?', [gangId], (err: any, rows: any[]) => {
      resolve(rows || []);
    });
  });
}

// Approve a join request (by request id)
export function gwApproveJoinRequest(requestId: string, approverId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    // Get request
    db.get('SELECT * FROM gang_join_requests WHERE id = ?', [requestId], async (err: any, req: any) => {
      if (!req) return resolve({ success: false, error: 'Request not found' });
      // Check approver's role
      const approver = await gwGetPlayer(approverId);
      if (!approver || !approver.gang_id || (approver.role !== 'Lieutenant' && approver.role !== 'God Father'))
        return resolve({ success: false, error: 'Not authorized' });
      if (approver.gang_id !== req.gang_id) return resolve({ success: false, error: 'Not your gang' });
      // Add player to gang
      db.run('UPDATE gw_players SET gang_id = ?, role = ? WHERE id = ?', [req.gang_id, 'Grunt', req.player_id], (err2: any) => {
        if (err2) return resolve({ success: false, error: 'DB error' });
        // Remove request
        db.run('DELETE FROM gang_join_requests WHERE id = ?', [requestId], (err3: any) => {
          if (err3) return resolve({ success: false, error: 'DB error' });
          resolve({ success: true });
        });
      });
    });
  });
}

// --- Gang leaving ---
export function gwLeaveGang(playerId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    const player = await gwGetPlayer(playerId);
    if (!player) return resolve({ success: false, error: 'Player not registered' });
    if (!player.gang_id) return resolve({ success: false, error: 'Not in a gang' });
    const gangId = player.gang_id;
    db.run('UPDATE gw_players SET gang_id = NULL WHERE id = ?', [playerId], async (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      // Check if any members remain in the gang
      const remaining = await new Promise<number>((res) => {
        db.get('SELECT COUNT(*) as cnt FROM gw_players WHERE gang_id = ?', [gangId], (err2: any, row: any) => {
          res(row ? row.cnt : 0);
        });
      });
      if (remaining === 0) {
        db.run('DELETE FROM gw_gangs WHERE id = ?', [gangId], (err3: any) => {
          if (err3) return resolve({ success: false, error: 'DB error deleting gang' });
          resolve({ success: true });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
}

// --- Gang disband ---
export function gwDisbandGang(gangId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    const gang = await gwGetGang(gangId);
    if (!gang) return resolve({ success: false, error: 'Gang not found' });
    db.run('UPDATE gw_players SET gang_id = NULL WHERE gang_id = ?', [gangId], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      db.run('DELETE FROM gw_gangs WHERE id = ?', [gangId], (err2: any) => {
        if (err2) return resolve({ success: false, error: 'DB error' });
        resolve({ success: true });
      });
    });
  });
}


export async function gwUpgradeWeapon(playerId: string, weaponId: string): Promise<{ success: boolean; error?: string }> {
  const player: GWPlayer = await gwGetPlayer(playerId);
  if (!player) return { success: false, error: 'Player not found' };
  const weapon = WEAPONS.find(w => w.id === weaponId);
  if (!weapon) return { success: false, error: 'Weapon not found' };
  let inventory = getInventoryObj(player);
  const currentLevel = inventory[weaponId] || 0;
  if (!currentLevel) return { success: false, error: 'Weapon not owned' };
  if (currentLevel >= weapon.max_level) return { success: false, error: 'Max level reached' };
  if (player.currency < weapon.upgrade_cost) return { success: false, error: 'Insufficient funds' };
  inventory[weaponId] = currentLevel + 1;
  return new Promise((resolve) => {
    db.run('UPDATE gw_players SET currency = currency - ?, inventory = ? WHERE id = ?', [weapon.upgrade_cost, JSON.stringify(inventory), playerId], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true });
    });
  });
}

// --- Combat logic (stubs) ---
export async function gwAttackPlayer(attackerId: string, targetId: string): Promise<{ success: boolean; error?: string; winner?: string }> {
  const attacker: GWPlayer = await gwGetPlayer(attackerId);
  const target: GWPlayer = await gwGetPlayer(targetId);
  if (!attacker || !target) return { success: false, error: 'Player not found' };
  if (attackerId === targetId) return { success: false, error: 'Cannot attack self' };
  // Calculate power
  const attackerInv = getInventoryObj(attacker);
  const targetInv = getInventoryObj(target);
  let attackerPower = 0, targetPower = 0;
  for (const wid in attackerInv) {
    const w = WEAPONS.find(w => w.id === wid);
    if (w) attackerPower += w.power * attackerInv[wid];
  }
  for (const wid in targetInv) {
    const w = WEAPONS.find(w => w.id === wid);
    if (w) targetPower += w.power * targetInv[wid];
  }
  // Add some randomness
  attackerPower += Math.floor(Math.random() * 10);
  targetPower += Math.floor(Math.random() * 10);
  let winner: string, loser: string;
  if (attackerPower === targetPower) return { success: true, winner: 'draw' };
  if (attackerPower > targetPower) { winner = attackerId; loser = targetId; }
  else { winner = targetId; loser = attackerId; }
  // Award winner, update stats
  return new Promise((resolve) => {
    db.run('UPDATE gw_players SET wins = wins + 1, currency = currency + 50 WHERE id = ?', [winner], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true, winner });
    });
  });
}

export async function gwAttackGang(attackerGangId: string, targetGangId: string): Promise<{ success: boolean; error?: string; winner?: string }> {
  const attackerGang: GWGang = await gwGetGang(attackerGangId);
  const targetGang: GWGang = await gwGetGang(targetGangId);
  if (!attackerGang || !targetGang) return { success: false, error: 'Gang not found' };
  if (attackerGangId === targetGangId) return { success: false, error: 'Cannot attack self' };
  // Get members
  const getMembers = (gang: GWGang) => Array.isArray(gang.members) ? gang.members : JSON.parse(gang.members as any as string);
  const attackerMembers: string[] = getMembers(attackerGang);
  const targetMembers: string[] = getMembers(targetGang);
  // Sum power for each gang
  let attackerPower = 0, targetPower = 0;
  for (const pid of attackerMembers) {
    const p: GWPlayer = await gwGetPlayer(pid);
    if (!p) continue;
    const inv = getInventoryObj(p);
    for (const wid in inv) {
      const w = WEAPONS.find(w => w.id === wid);
      if (w) attackerPower += w.power * inv[wid];
    }
  }
  for (const pid of targetMembers) {
    const p: GWPlayer = await gwGetPlayer(pid);
    if (!p) continue;
    const inv = getInventoryObj(p);
    for (const wid in inv) {
      const w = WEAPONS.find(w => w.id === wid);
      if (w) targetPower += w.power * inv[wid];
    }
  }
  // Add randomness
  attackerPower += Math.floor(Math.random() * 20);
  targetPower += Math.floor(Math.random() * 20);
  let winner: string, loser: string;
  if (attackerPower === targetPower) return { success: true, winner: 'draw' };
  if (attackerPower > targetPower) { winner = attackerGangId; loser = targetGangId; }
  else { winner = targetGangId; loser = attackerGangId; }
  // Award winner, update stats
  return new Promise((resolve) => {
    db.run('UPDATE gw_gangs SET wins = wins + 1, bank = bank + 100 WHERE id = ?', [winner], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true, winner });
    });
  });
}

// --- Admin tools (stubs) ---
export function gwAdminReset(): Promise<{ success: boolean }> {
  // Reset all Gang Wars tables: players, gangs, transactions
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('DELETE FROM gw_players', (err1: any) => {
        if (err1) return resolve({ success: false });
        db.run('DELETE FROM gw_gangs', (err2: any) => {
          if (err2) return resolve({ success: false });
          db.run('DELETE FROM gw_transactions', (err3: any) => {
            if (err3) return resolve({ success: false });
            resolve({ success: true });
          });
        });
      });
    });
  });
}

export function gwAdminGiveCurrency(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // Add currency to a player (admin only)
  return new Promise((resolve) => {
    db.run('UPDATE gw_players SET currency = currency + ? WHERE id = ?', [amount, playerId], function (err: any) {
      if (err) return resolve({ success: false, error: 'DB error' });
      if (this.changes === 0) return resolve({ success: false, error: 'Player not found' });
      resolve({ success: true });
    });
  });
}

// Player registration
export function gwRegisterPlayer(playerId: string, name: string, isSuperMod: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO gw_players (id, name, is_supermod) VALUES (?, ?, ?)` ,
      [playerId, name, isSuperMod ? 1 : 0],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Gang creation
export function gwCreateGang(playerId: string, gangName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gangId = `${gangName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    // Add gang
    db.run(
      `INSERT INTO gw_gangs (id, name, members) VALUES (?, ?, ?)`,
      [gangId, gangName, JSON.stringify([playerId])],
      (err) => {
        if (err) return reject(err);
        // Update player to join gang and set as God Father
        db.run(
          `UPDATE gw_players SET gang_id = ?, role = ? WHERE id = ?`,
          [gangId, 'God Father', playerId],
          (err2) => {
            if (err2) reject(err2);
            else resolve();
          }
        );
      }
    );
  });
}
// Kick member (God Father only)
export async function gwKickMember(gangId: string, targetPlayerId: string, requesterId: string): Promise<{ success: boolean; error?: string }> {
  const requester: GWPlayer = await gwGetPlayer(requesterId);
  if (!requester || requester.gang_id !== gangId || requester.role !== 'God Father') {
    return { success: false, error: 'Only the God Father can kick members.' };
  }
  // Prevent kicking self
  if (targetPlayerId === requesterId) return { success: false, error: 'Cannot kick yourself.' };
  // Check target is in gang
  const target: GWPlayer = await gwGetPlayer(targetPlayerId);
  if (!target || target.gang_id !== gangId) return { success: false, error: 'Target not in your gang.' };
  return new Promise((resolve) => {
    db.run('UPDATE gw_players SET gang_id = NULL, role = NULL WHERE id = ?', [targetPlayerId], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true });
    });
  });
}
