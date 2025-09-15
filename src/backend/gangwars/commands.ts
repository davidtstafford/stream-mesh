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
  gwApproveJoinRequest,
  gwResolvePlayer,
  gwResolveGang
} from './core';
import { chatBus } from '../services/chatBus';
import { ttsQueue } from '../services/ttsQueue';

import { formatCurrency } from './core';

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
    case 'collect': {
      // Player collects passive income for all full 30-min intervals since last collection
      const result = await require('./core').gwCollectPassiveIncome(user.id);
      if (result.collected > 0) {
        return `@${user.name} You collected ${formatCurrency(result.collected)} in passive income!`;
      } else {
        const mins = Math.ceil(result.nextIn / 60000);
        return `@${user.name} No passive income available yet. Next in ~${mins} min.`;
      }
    }
    case 'promote': {
      // God Father can promote a Grunt to Lieutenant, or a Lieutenant to God Father (demoting self)
      if (!args[0]) return `@${user.name} Usage: ~gw promote <username>`;
      const player = await gwGetPlayer(user.id);
      if (!player || !player.gang_id) return `@${user.name} You are not in a gang!`;
      if (player.role !== 'God Father') return `@${user.name} Only the God Father can promote.`;
      const targetPlayer = await gwResolvePlayer(args[0]);
      if (!targetPlayer || targetPlayer.gang_id !== player.gang_id) return `@${user.name} Player not found in your gang.`;
      if (targetPlayer.id === user.id) return `@${user.name} You cannot promote yourself.`;
      if (targetPlayer.role === 'Grunt') {
        // Promote Grunt to Lieutenant
        await require('./core').gwSetPlayerRole(targetPlayer.id, 'Lieutenant');
        return `@${user.name} Promoted ${targetPlayer.name} to Lieutenant.`;
      } else if (targetPlayer.role === 'Lieutenant') {
        // Promote Lieutenant to God Father, demote self to Lieutenant
        await require('./core').gwSetPlayerRole(targetPlayer.id, 'God Father');
        await require('./core').gwSetPlayerRole(user.id, 'Lieutenant');
        return `@${user.name} Promoted ${targetPlayer.name} to God Father and became Lieutenant.`;
      } else if (targetPlayer.role === 'God Father') {
        return `@${user.name} ${targetPlayer.name} is already God Father.`;
      } else {
        return `@${user.name} Cannot promote this player.`;
      }
    }
    case 'stats': {
      // Show player stats, optionally for another user
      let targetPlayer = null;
      if (args[0]) {
        targetPlayer = await gwResolvePlayer(args[0]);
        if (!targetPlayer) return `@${user.name} Player not found.`;
      } else {
        targetPlayer = await require('./core').gwGetPlayer(user.id);
        if (!targetPlayer) return `@${user.name} You are not registered in Gang Wars.`;
      }
      let msg = `@${targetPlayer.name} Stats: Coins: ${formatCurrency(targetPlayer.currency)} | Wins: ${targetPlayer.wins}`;
      if (targetPlayer.gang_id) {
        const gang = await require('./core').gwGetGang(targetPlayer.gang_id);
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
  const weaponList = WEAPONS.map((w: import('./models').GWWeapon) => `${w.name}: ${formatCurrency(w.cost)} (Power: ${w.power}, Upgrade: ${formatCurrency(w.upgrade_cost)}, Max Lv: ${w.max_level})`).join(' | ');
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
  const gangName = args.join(' ').trim();
  if (!gangName) return `@${user.name} Usage: ~gw joingang <gang name>`;
  const gang = await gwResolveGang(gangName);
  if (!gang) return `@${user.name} Join failed: Gang not found`;
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
  const player = await gwGetPlayer(user.id);
  if (!player || !player.gang_id) return `@${user.name} You are not in a gang!`;
  if (player.role !== 'God Father') return `@${user.name} Only the God Father can disband the gang.`;
  result = await gwDisbandGang(player.gang_id);
  return result.success ? `@${user.name} Gang disbanded.` : `@${user.name} Disband failed: ${result.error}`;
    case 'deposit':
  result = await gwDeposit(user.id, Number(args[0]));
  return result.success ? `@${user.name} Deposited ${formatCurrency(Number(args[0]))}` : `@${user.name} Deposit failed: ${result.error}`;
    case 'withdraw':
  result = await gwWithdraw(user.id, Number(args[0]));
  return result.success ? `@${user.name} Withdrew ${formatCurrency(Number(args[0]))}` : `@${user.name} Withdraw failed: ${result.error}`;
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
  return result.success ? `@${user.name} Bought weapon: ${weapon.name} for ${formatCurrency(weapon.cost)}` : `@${user.name} Buy failed: ${result.error}`;
    case 'upgrade':
  result = await gwUpgradeWeapon(user.id, args[0]);
  // Find weapon for upgrade cost
  const { WEAPONS: WEAPONS_UPG } = require('./core');
  const weaponUpg = WEAPONS_UPG.find((w: any) => w.id.toLowerCase() === args[0]?.toLowerCase());
  const upgradeCost = weaponUpg ? formatCurrency(weaponUpg.upgrade_cost) : '';
  return result.success ? `@${user.name} Upgraded weapon: ${args[0]}${upgradeCost ? ` for ${upgradeCost}` : ''}` : `@${user.name} Upgrade failed: ${result.error}`;
    case 'attack': {
  if (!args[0]) return `@${user.name} Usage: ~gw attack <username>`;
  const targetPlayer = await gwResolvePlayer(args[0]);
  if (!targetPlayer) return `@${user.name} Attack failed: Player not found`;
  result = await gwAttackPlayer(user.id, targetPlayer.id);
      if (result.success) {
        if (result.winner === 'draw') return `Gang Wars: The battle between ${user.name} and ${targetPlayer.name} ended in a draw!`;
        // Show cash won/lost
        if (result.winner === user.id) {
          return `Gang Wars: ${user.name} attacked ${targetPlayer.name} and won! (+${formatCurrency(result.amount ?? 0)})`;
        } else {
          return `Gang Wars: ${user.name} attacked ${targetPlayer.name} and lost! (-${formatCurrency(result.amount ?? 0)})`;
        }
      } else {
        return `@${user.name} Attack failed: ${result.error}`;
      }
    }
    case 'attackgang': {
  const attacker = await gwGetPlayer(user.id);
  if (!attacker || !attacker.gang_id) return `@${user.name} You are not in a gang!`;
  const targetName = args.join(' ').trim();
  if (!targetName) return `@${user.name} Usage: ~gw attackgang <gang name>`;
  const targetGang = await gwResolveGang(targetName);
  if (!targetGang) return `@${user.name} Gang attack failed: Gang not found`;
  if (attacker.gang_id === targetGang.id) return `@${user.name} Cannot attack your own gang!`;
  result = await gwAttackGang(attacker.gang_id, targetGang.id);
      if (result.success) {
        if (result.winner === 'draw') return `Gang Wars: The gang battle between your gang and ${targetGang.name} ended in a draw!`;
        return `Gang Wars: Your gang attacked ${targetGang.name} and ${result.winner === attacker.gang_id ? 'won' : 'lost'}! (${result.amount ? (result.winner === attacker.gang_id ? '+' : '-') + formatCurrency(result.amount) : ''})`;
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
  const targetPlayer = await gwResolvePlayer(args[0]);
  if (!targetPlayer) return `@${user.name} Admin give failed: Player not found`;
  result = await gwAdminGiveCurrency(targetPlayer.id, Number(args[1]));
  return result.success ? `@${user.name} Gave ${formatCurrency(Number(args[1]))} to ${args[0]}.` : `@${user.name} Admin give failed: ${result.error}`;
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
  const targetPlayer = await gwResolvePlayer(targetName);
  if (!targetPlayer) return `@${user.name} Delete failed: Player not found`;
  if (targetPlayer.id === user.id) return `@${user.name} You cannot delete yourself!`;
  const result = await require('./core').gwDeletePlayer(user.id, targetPlayer.id);
  return result.success ? `@${user.name} Deleted player: ${targetName}` : `@${user.name} Delete failed: ${result.error}`;
    }
    default:
      return `@${user.name} Unknown command: ${command}`;
  }
}

// This handler will be called from the main chat event bus when a ~gw command is detected.
