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
  gwAttackGang,
  gwAdminReset,
  gwAdminGiveCurrency
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

export async function handleGangWarsCommand(
  user: { id: string; name: string },
  command: string,
  args: string[],
  isSuperMod: boolean
) {
  let result;
  switch (command) {
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
    case 'creategang':
      try {
        await gwCreateGang(user.id, args[0]);
        return `@${user.name} Gang created: ${args[0]}`;
      } catch (err: any) {
        return `@${user.name} Gang creation failed: ${err?.message || err}`;
      }
    case 'joingang':
      result = await gwJoinGang(user.id, args[0]);
      return result.success ? `@${user.name} Joined gang!` : `@${user.name} Join failed: ${result.error}`;
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
      result = await gwBuyWeapon(user.id, args[0]);
      return result.success ? `@${user.name} Bought weapon: ${args[0]}` : `@${user.name} Buy failed: ${result.error}`;
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
        return `Gang Wars: ${user.name} attacked ${targetArg} and ${result.winner === user.id ? 'won' : 'lost'}!`;
      } else {
        return `@${user.name} Attack failed: ${result.error}`;
      }
    }
    case 'attackgang': {
      // Allow attackgang by gang name (no change)
      result = await gwAttackGang(args[0], args[1]);
      if (result.success) {
        if (result.winner === 'draw') return `Gang Wars: The gang battle between ${args[0]} and ${args[1]} ended in a draw!`;
        return `Gang Wars: ${args[0]} attacked ${args[1]} and ${result.winner === args[0] ? 'won' : 'lost'}!`;
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
        return `@${user.name} Usage: ~gw admingive <playerId> <amount>`;
      }
      result = await gwAdminGiveCurrency(args[0], Number(args[1]));
      return result.success ? `@${user.name} Gave ${args[1]} currency to ${args[0]}.` : `@${user.name} Admin give failed: ${result.error}`;
    default:
      return `@${user.name} Unknown command: ${command}`;
  }
}

// This handler will be called from the main chat event bus when a ~gw command is detected.
