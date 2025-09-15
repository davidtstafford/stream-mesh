import {
  gwRegisterPlayer,
  gwCreateGang,
  gwJoinGang,
  gwLeaveGang,
  gwDisbandGang,
  gwDeposit,
  gwWithdraw,
  gwBuyWeapon,
  gwUpgradeWeapon,
  gwAttackPlayer,
  GwAttackResult,
  gwAttackGang,
  gwAdminReset,
  gwAdminGiveCurrency,
  gwGetPlayer,
  gwListJoinRequests,
  gwApproveJoinRequest
} from './core';
import { chatBus } from '../services/chatBus';
import { ttsQueue } from '../services/ttsQueue';

// Command: ~gw join <gang>
export async function handleGwJoinGang(playerId: string, gangId: string) {
  return await gwJoinGang(playerId, gangId);
}

// Command: ~gw leave
export async function handleGwLeaveGang(playerId: string) {
  return await gwLeaveGang(playerId);
}

// Command: ~gw disband <gang>
export async function handleGwDisbandGang(gangId: string) {
  return await gwDisbandGang(gangId);
}

// Command: ~gw deposit <amount>
export async function handleGwDeposit(playerId: string, amount: number) {
  return await gwDeposit(playerId, amount);
}

// Command: ~gw withdraw <amount>
export async function handleGwWithdraw(playerId: string, amount: number) {
  return await gwWithdraw(playerId, amount);
}

// Command: ~gw buy <weapon>
export async function handleGwBuyWeapon(playerId: string, weaponId: string) {
  return await gwBuyWeapon(playerId, weaponId);
}

// Command: ~gw upgrade <weapon>
export async function handleGwUpgradeWeapon(playerId: string, weaponId: string) {
  return await gwUpgradeWeapon(playerId, weaponId);
}

// Command: ~gw attack <player>
export async function handleGwAttackPlayer(attackerId: string, targetId: string) {
  return await gwAttackPlayer(attackerId, targetId);
}

// Command: ~gw attackgang <gang>
export async function handleGwAttackGang(attackerGangId: string, targetGangId: string) {
  return await gwAttackGang(attackerGangId, targetGangId);
}

// Command: ~gw admin reset
export async function handleGwAdminReset() {
  return await gwAdminReset();
}

// Command: ~gw admin give <player> <amount>
export async function handleGwAdminGiveCurrency(playerId: string, amount: number) {
  return await gwAdminGiveCurrency(playerId, amount);
}

// Command: ~gw passiveincome (internal, scheduled)
export async function handleGwDistributePassiveIncome(amount: number) {
  // This function is a stub for now
  return Promise.resolve();
}
// Gang Wars command handler scaffold
// This file will map chat commands (e.g. ~gwjoin) to backend logic.

// import { gwRegisterPlayer, gwCreateGang, ... } from './core';

// Main Gang Wars chat command handler
export async function handleGangWarsCommand(
  user: { id: string; name: string },
  command: string,
  args: string[],
  isSuperMod: boolean
) {
  // Always use isSuperMod from chat event for admin permission checks
  let result;
  switch (command) {
    case 'listplayers': {
      // Debug: List all player names and IDs
      const { db } = require('../core/database');
      const players = await new Promise<any[]>((resolve) => {
        db.all('SELECT id, name FROM gw_players', [], (err: any, rows: any[]) => {
          resolve(rows || []);
        });
      });
      if (!players.length) return `No players found.`;
      return 'Players: ' + players.map(p => `${p.name} (${p.id})`).join(' | ');
    }
    case 'stats': {
      // Show player stats
      const player = await require('./core').gwGetPlayer(user.id);
      if (!player) return `@${user.name} You are not registered in Gang Wars.`;
      let msg = `@${user.name} Stats: Coins: ${player.currency} | Wins: ${player.wins}`;
      if (player.gang_id) {
        const gang = await require('./core').gwGetGang(player.gang_id);
        if (gang) msg += ` | Gang: ${gang.name}`;
      }
      return msg;
    }
    case 'inventory': {
      // Show player inventory
      const player = await require('./core').gwGetPlayer(user.id);
      if (!player) return `@${user.name} You are not registered in Gang Wars.`;
      const { WEAPONS } = require('./core');
      let inv: Record<string, number> = {};
      try {
        if (!player.inventory) {
          inv = { bat: 1 };
        } else if (typeof player.inventory === 'string') {
          inv = JSON.parse(player.inventory);
        } else if (Array.isArray(player.inventory)) {
          for (const wid of player.inventory) inv[wid] = 1;
        } else if (typeof player.inventory === 'object') {
          inv = player.inventory as any;
        }
      } catch { inv = { bat: 1 }; }
      if (!inv.bat) inv.bat = 1;
      const items = Object.entries(inv).map(([wid, lvl]: any) => {
        const w = WEAPONS.find((w: any) => w.id === wid);
        return w ? `${w.name} (Lv${lvl})` : `${wid} (Lv${lvl})`;
      });
      return items.length ? `@${user.name} Inventory: ${items.join(' | ')}` : `@${user.name} Inventory is empty.`;
    }
    case 'quit': {
      // Player deletes their own account
      const result = await require('./core').gwDeletePlayer(user.id, user.id);
      return result.success ? `@${user.name} You have quit Gang Wars and your account has been deleted.` : `@${user.name} Quit failed: ${result.error}`;
    }
    case 'leaderboard': {
      // Top 3 players by wins, top 3 gangs by wins, user's player/gang rank
      const { db } = require('../core/database');
      // Top 3 players
      const topPlayers = await new Promise<any[]>((resolve) => {
        db.all('SELECT name, wins FROM gw_players ORDER BY wins DESC, name ASC LIMIT 3', [], (err: any, rows: any[]) => {
          resolve(rows || []);
        });
      });
      // Top 3 gangs
      const topGangs = await new Promise<any[]>((resolve) => {
        db.all('SELECT name, wins FROM gw_gangs ORDER BY wins DESC, name ASC LIMIT 3', [], (err: any, rows: any[]) => {
          resolve(rows || []);
        });
      });
      // User's player rank
      const playerRanks = await new Promise<any[]>((resolve) => {
        db.all('SELECT id, name, wins FROM gw_players ORDER BY wins DESC, name ASC', [], (err: any, rows: any[]) => {
          resolve(rows || []);
        });
      });
      const playerRank = playerRanks.findIndex(p => p.id === user.id) + 1;
      // User's gang rank (if in a gang)
      let gangRank = null;
      let userGangName = null;
      const userRow = playerRanks.find(p => p.id === user.id);
      if (userRow && userRow.gang_id) {
        const gangRanks = await new Promise<any[]>((resolve) => {
          db.all('SELECT id, name, wins FROM gw_gangs ORDER BY wins DESC, name ASC', [], (err: any, rows: any[]) => {
            resolve(rows || []);
          });
        });
        const userGang = await new Promise<any>((resolve) => {
          db.get('SELECT id, name FROM gw_gangs WHERE id = ?', [userRow.gang_id], (err: any, row: any) => {
            resolve(row);
          });
        });
        userGangName = userGang?.name;
        if (userGang) {
          gangRank = gangRanks.findIndex(g => g.id === userGang.id) + 1;
        }
      }
      // Format output
      let msg = `Top 3 Players: ` + topPlayers.map((p, i) => `${i+1}. ${p.name} (${p.wins} wins)`).join(' | ');
      msg += ` | Top 3 Gangs: ` + topGangs.map((g, i) => `${i+1}. ${g.name} (${g.wins} wins)`).join(' | ');
      msg += ` | Your Player Rank: ${playerRank > 0 ? playerRank : 'N/A'}`;
      if (userGangName && gangRank) msg += ` | Your Gang (${userGangName}) Rank: ${gangRank}`;
      return msg;
    }
    case 'shop': {
      // List all weapons and their prices
  const { WEAPONS } = require('./core');
  const weaponList = WEAPONS.map((w: import('./models').GWWeapon) => `${w.name}: $${w.cost} (Power: ${w.power}, Upgrade: $${w.upgrade_cost}, Max Lv: ${w.max_level})`).join(' | ');
  return `Gang Wars Shop: ${weaponList}`;
    }
    case 'register':
      await gwRegisterPlayer(user.id, user.name, isSuperMod);
      return `@${user.name} Registered for Gang Wars!`;
    case 'creategang': {
      // Support multi-word gang names
      const gangName = args.join(' ').trim();
      if (!gangName) return `@${user.name} Usage: ~gw creategang <gang name>`;
      try {
        await gwCreateGang(user.id, gangName);
        return `@${user.name} Gang created: ${gangName}`;
      } catch (err: any) {
        return `@${user.name} Gang creation failed: ${err?.message || err}`;
      }
    }
    case 'joingang': {
      // Support multi-word gang names
      const gangName = args.join(' ').trim();
      if (!gangName) return `@${user.name} Usage: ~gw joingang <gang name>`;
      // Find gang by name
      const { db } = require('../core/database');
      const gang = await new Promise<any>((resolve) => {
        db.get('SELECT id FROM gw_gangs WHERE LOWER(name) = LOWER(?)', [gangName], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (!gang || !gang.id) return `@${user.name} Join failed: Gang not found`;
      result = await gwJoinGang(user.id, gang.id);
      return result.success ? `@${user.name} Requested to join ${gangName}. Awaiting approval.` : `@${user.name} Join failed: ${result.error}`;
    }
    case 'listrequests': {
      // List join requests for your gang (officer or above)
      const player = await gwGetPlayer(user.id);
      if (!player || !player.gang_id) return `@${user.name} You are not in a gang!`;
      if (player.role !== 'Lieutenant' && player.role !== 'God Father') return `@${user.name} Only Lieutenants or God Father can view requests.`;
      const requests = await gwListJoinRequests(player.gang_id);
      if (!requests.length) return `@${user.name} No pending join requests.`;
      const names = await Promise.all(requests.map(async (r: any) => {
        const p = await gwGetPlayer(r.player_id);
        return p ? `${p.name} (id: ${r.id})` : `Unknown (id: ${r.id})`;
      }));
      return `@${user.name} Pending join requests: ` + names.join(' | ');
    }
    case 'approverequest': {
      // Approve a join request by request id
      const player = await gwGetPlayer(user.id);
      if (!player || !player.gang_id) return `@${user.name} You are not in a gang!`;
      if (player.role !== 'Lieutenant' && player.role !== 'God Father') return `@${user.name} Only Lieutenants or God Father can approve requests.`;
      const requestId = args[0];
      if (!requestId) return `@${user.name} Usage: ~gw approverequest <requestId>`;
      result = await gwApproveJoinRequest(requestId, user.id);
      return result.success ? `@${user.name} Approved join request.` : `@${user.name} Approve failed: ${result.error}`;
    }
    case 'leavegang':
      result = await gwLeaveGang(user.id);
      return result.success ? `@${user.name} Left gang.` : `@${user.name} Leave failed: ${result.error}`;
    case 'disbandgang':
      result = await gwDisbandGang(args[0]);
      return result.success ? `@${user.name} Gang disbanded.` : `@${user.name} Disband failed: ${result.error}`;
    case 'deposit':
      result = await gwDeposit(user.id, Number(args[0]));
      return result.success ? `@${user.name} Deposited ${args[0]}` : `@${user.name} Deposit failed: ${result.error}`;
    case 'withdraw':
      result = await gwWithdraw(user.id, Number(args[0]));
      return result.success ? `@${user.name} Withdrew ${args[0]}` : `@${user.name} Withdraw failed: ${result.error}`;
    case 'buy':
      let weaponArg = args[0];
      // Try to resolve weapon by id or name (case-insensitive, ignore spaces)
      const { WEAPONS } = require('./core');
      let weapon = WEAPONS.find((w: any) => w.id.toLowerCase() === weaponArg.toLowerCase());
      if (!weapon) {
        // Try by name (case-insensitive, ignore spaces)
        const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        weapon = WEAPONS.find((w: any) => norm(w.name) === norm(weaponArg));
      }
      if (!weapon) {
        return `@${user.name} Buy failed: Weapon not found`;
      }
      result = await gwBuyWeapon(user.id, weapon.id);
      return result.success ? `@${user.name} Bought weapon: ${weapon.name}` : `@${user.name} Buy failed: ${result.error}`;
    case 'upgrade':
      result = await gwUpgradeWeapon(user.id, args[0]);
      return result.success ? `@${user.name} Upgraded weapon: ${args[0]}` : `@${user.name} Upgrade failed: ${result.error}`;
    case 'attack': {
      // Allow attack by @username or username
      let targetArg = args[0];
      if (!targetArg) return `@${user.name} Usage: ~gw attack <username>`;
      if (targetArg.startsWith('@')) targetArg = targetArg.slice(1);
      // Try to resolve targetId by username
      const { db } = require('../core/database');
      const targetRow = await new Promise<any>((resolve) => {
        db.get('SELECT id FROM gw_players WHERE LOWER(name) = LOWER(?)', [targetArg], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (!targetRow || !targetRow.id) return `@${user.name} Attack failed: Player not found`;
      result = await gwAttackPlayer(user.id, targetRow.id);
      if (result.success) {
        if (result.winner === 'draw') return `Gang Wars: The battle between ${user.name} and ${targetArg} ended in a draw!`;
        // Show cash won/lost
        if (result.winner === user.id) {
          return `Gang Wars: ${user.name} attacked ${targetArg} and won! (+$${result.amount})`;
        } else {
          return `Gang Wars: ${user.name} attacked ${targetArg} and lost! (-$${result.amount})`;
        }
      } else {
        return `@${user.name} Attack failed: ${result.error}`;
      }
    }
    case 'attackgang': {
      // Support multi-word gang names for target
      const { db } = require('../core/database');
      // Get attacker's gang (by user)
      const attackerRow = await new Promise<any>((resolve) => {
        db.get('SELECT gang_id FROM gw_players WHERE id = ?', [user.id], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (!attackerRow || !attackerRow.gang_id) return `@${user.name} You are not in a gang!`;
      // Join all args for the target gang name
      const targetName = args.join(' ').trim();
      if (!targetName) return `@${user.name} Usage: ~gw attackgang <gang name>`;
      const targetGang = await new Promise<any>((resolve) => {
        db.get('SELECT id, name FROM gw_gangs WHERE LOWER(name) = LOWER(?)', [targetName], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (!targetGang || !targetGang.id) return `@${user.name} Gang attack failed: Gang not found`;
      // Prevent attacking own gang
      if (attackerRow.gang_id === targetGang.id) return `@${user.name} Cannot attack your own gang!`;
      result = await gwAttackGang(attackerRow.gang_id, targetGang.id);
      if (result.success) {
        if (result.winner === 'draw') return `Gang Wars: The gang battle between your gang and ${targetGang.name} ended in a draw!`;
        return `Gang Wars: Your gang attacked ${targetGang.name} and ${result.winner === attackerRow.gang_id ? 'won' : 'lost'}!`;
      } else {
        return `@${user.name} Gang attack failed: ${result.error}`;
      }
    }
    case 'adminreset':
      if (!isSuperMod) {
        return `@${user.name} Admin command denied: Super Mod only.`;
      }
      result = await gwAdminReset();
      return result.success ? `Gang Wars: The game has been reset by admin!` : `@${user.name} Reset failed.`;
    case 'admingive':
      if (!isSuperMod) {
        return `@${user.name} Admin command denied: Super Mod only.`;
      }
      if (!args[0] || isNaN(Number(args[1]))) {
        return `@${user.name} Usage: ~gw admingive <player> <amount>`;
      }
      // Try to resolve player by name or by ID (numeric or string)
      let targetArg = args[0];
      if (targetArg.startsWith('@')) targetArg = targetArg.slice(1);
      let targetId = null;
      const { db } = require('../core/database');
      // Try by exact name (case-insensitive)
      const rowByName = await new Promise<any>((resolve) => {
        db.get('SELECT id FROM gw_players WHERE name = ? COLLATE NOCASE', [targetArg], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (rowByName && rowByName.id) {
        targetId = rowByName.id;
      } else {
        // Try by ID (numeric or string)
        const rowById = await new Promise<any>((resolve) => {
          db.get('SELECT id FROM gw_players WHERE id = ?', [targetArg], (err: any, row: any) => {
            resolve(row);
          });
        });
        if (rowById && rowById.id) {
          targetId = rowById.id;
        }
      }
      if (!targetId) return `@${user.name} Admin give failed: Player not found`;
      result = await gwAdminGiveCurrency(targetId, Number(args[1]));
      return result.success ? `@${user.name} Gave ${args[1]} currency to ${args[0]}.` : `@${user.name} Admin give failed: ${result.error}`;
    case 'quit': {
      // Player deletes their own account
      const result = await require('./core').gwDeletePlayer(user.id, user.id);
      return result.success ? `@${user.name} You have quit Gang Wars and your account has been deleted.` : `@${user.name} Quit failed: ${result.error}`;
    }
    case 'deleteplayer': {
      if (!isSuperMod) {
        return `@${user.name} Command denied: Super Mod only.`;
      }
      const targetName = args.join(' ').trim();
      if (!targetName) return `@${user.name} Usage: ~gw deleteplayer <username>`;
      const { db } = require('../core/database');
      const targetRow = await new Promise<any>((resolve) => {
        db.get('SELECT id FROM gw_players WHERE LOWER(name) = LOWER(?)', [targetName.toLowerCase()], (err: any, row: any) => {
          resolve(row);
        });
      });
      if (!targetRow || !targetRow.id) return `@${user.name} Delete failed: Player not found`;
      if (targetRow.id === user.id) return `@${user.name} You cannot delete yourself!`;
      const result = await require('./core').gwDeletePlayer(user.id, targetRow.id);
      return result.success ? `@${user.name} Deleted player: ${targetName}` : `@${user.name} Delete failed: ${result.error}`;
    }
    default:
      return `@${user.name} Unknown command: ${command}`;
  }
}

// This handler will be called from the main chat event bus when a ~gw command is detected.
