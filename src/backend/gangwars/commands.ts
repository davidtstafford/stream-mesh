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
    case 'register':
      await gwRegisterPlayer(user.id, user.name, isSuperMod);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: `Registered for Gang Wars!`, time: new Date().toISOString() });
      break;
    case 'creategang':
      try {
        await gwCreateGang(user.id, args[0]);
        const msg = `Gang created: ${args[0]}`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      } catch (err: any) {
        const msg = `Gang creation failed: ${err?.message || err}`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      }
      break;
    case 'joingang':
      result = await gwJoinGang(user.id, args[0]);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Joined gang!` : `Join failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'leavegang':
      result = await gwLeaveGang(user.id);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Left gang.` : `Leave failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'disbandgang':
      result = await gwDisbandGang(args[0]);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Gang disbanded.` : `Disband failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'deposit':
      result = await gwDeposit(user.id, Number(args[0]));
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Deposited ${args[0]}` : `Deposit failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'withdraw':
      result = await gwWithdraw(user.id, Number(args[0]));
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Withdrew ${args[0]}` : `Withdraw failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'buy':
      result = await gwBuyWeapon(user.id, args[0]);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Bought weapon: ${args[0]}` : `Buy failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'upgrade':
      result = await gwUpgradeWeapon(user.id, args[0]);
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Upgraded weapon: ${args[0]}` : `Upgrade failed: ${result.error}`, time: new Date().toISOString() });
      break;
    case 'attack':
      result = await gwAttackPlayer(user.id, args[0]);
      if (result.success) {
        const msg = result.winner === 'draw'
          ? `Gang Wars: The battle between ${user.name} and ${args[0]} ended in a draw!`
          : `Gang Wars: ${user.name} attacked ${args[0]} and ${result.winner === user.id ? 'won' : 'lost'}!`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      } else {
        const msg = `Attack failed: ${result.error}`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      }
      break;
    case 'attackgang':
      result = await gwAttackGang(args[0], args[1]);
      if (result.success) {
        const msg = result.winner === 'draw'
          ? `Gang Wars: The gang battle between ${args[0]} and ${args[1]} ended in a draw!`
          : `Gang Wars: ${args[0]} attacked ${args[1]} and ${result.winner === args[0] ? 'won' : 'lost'}!`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      } else {
        const msg = `Gang attack failed: ${result.error}`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      }
      break;
    case 'adminreset':
      if (!isSuperMod) {
        const msg = `Admin command denied: Super Mod only.`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
        break;
      }
      result = await gwAdminReset();
      {
        const msg = result.success ? `Gang Wars: The game has been reset by admin!` : `Reset failed.`;
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: msg, time: new Date().toISOString() });
        ttsQueue.enqueue({ text: msg });
      }
      break;
    case 'admingive':
      if (!isSuperMod) {
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: `Admin command denied: Super Mod only.`, time: new Date().toISOString() });
        break;
      }
      if (!args[0] || isNaN(Number(args[1]))) {
        chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: `Usage: ~gw admingive <playerId> <amount>`, time: new Date().toISOString() });
        break;
      }
      result = await gwAdminGiveCurrency(args[0], Number(args[1]));
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: result.success ? `Gave ${args[1]} currency to ${args[0]}.` : `Admin give failed: ${result.error}`, time: new Date().toISOString() });
      break;
    default:
      chatBus.emitChatMessage({ platform: 'app', channel: '', user: user.name, message: `Unknown command: ${command}`, time: new Date().toISOString() });
      break;
  }
}

// This handler will be called from the main chat event bus when a ~gw command is detected.
