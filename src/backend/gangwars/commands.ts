import {
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

export function handleGangWarsCommand(
  user: { id: string; name: string },
  command: string,
  args: string[],
  isSuperMod: boolean
) {
  switch (command) {
    case 'join':
      // gwRegisterPlayer(user.id, user.name, isSuperMod)
      break;
    case 'creategang':
      // gwCreateGang(user.id, args[0])
      break;
    case 'joingang':
      // gwJoinGang(user.id, args[0])
      break;
    case 'leavegang':
      // gwLeaveGang(user.id)
      break;
    // ...other commands
    default:
      // Unknown command
      break;
  }
}

// This handler will be called from the main chat event bus when a ~gw command is detected.
