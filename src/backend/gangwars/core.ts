// --- Deposit currency into gang bank ---
export function gwDeposit(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement deposit logic
  return Promise.resolve({ success: false, error: 'Not implemented' });
}

// --- Withdraw currency from gang bank ---
export function gwWithdraw(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement withdraw logic
  return Promise.resolve({ success: false, error: 'Not implemented' });
}
import { db } from '../core/database';

export function gwBuyWeapon(playerId: string, weaponId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement weapon purchase logic
  return Promise.resolve({ success: false, error: 'Not implemented' });
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
export function gwJoinGang(playerId: string, gangId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    const player = await gwGetPlayer(playerId);
    if (!player) return resolve({ success: false, error: 'Player not registered' });
    const gang = await gwGetGang(gangId);
    if (!gang) return resolve({ success: false, error: 'Gang not found' });
    if (player.gang_id) return resolve({ success: false, error: 'Already in a gang' });
    db.all('SELECT * FROM gw_players WHERE gang_id = ?', [gangId], (err: any, members: any[]) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      if (members.length >= 5) return resolve({ success: false, error: 'Gang is full' });
      db.run('UPDATE gw_players SET gang_id = ? WHERE id = ?', [gangId, playerId], (err2: any) => {
        if (err2) return resolve({ success: false, error: 'DB error' });
        resolve({ success: true });
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
    db.run('UPDATE gw_players SET gang_id = NULL WHERE id = ?', [playerId], (err: any) => {
      if (err) return resolve({ success: false, error: 'DB error' });
      resolve({ success: true });
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


export function gwUpgradeWeapon(playerId: string, weaponId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement weapon upgrade logic
  return Promise.resolve({ success: false, error: 'Not implemented' });
}

// --- Combat logic (stubs) ---
export function gwAttackPlayer(attackerId: string, targetId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement player-vs-player combat
  return Promise.resolve({ success: false, error: 'Not implemented' });
}

export function gwAttackGang(attackerGangId: string, targetGangId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement gang-vs-gang combat
  return Promise.resolve({ success: false, error: 'Not implemented' });
}

// --- Admin tools (stubs) ---
export function gwAdminReset(): Promise<{ success: boolean }> {
  // TODO: Implement full reset
  return Promise.resolve({ success: false });
}

export function gwAdminGiveCurrency(playerId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement admin currency grant
  return Promise.resolve({ success: false, error: 'Not implemented' });
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
        // Update player to join gang
        db.run(
          `UPDATE gw_players SET gang_id = ? WHERE id = ?`,
          [gangId, playerId],
          (err2) => {
            if (err2) reject(err2);
            else resolve();
          }
        );
      }
    );
  });
}



