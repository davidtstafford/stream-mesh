
# Gang Wars Game Design (Finalized)

This document outlines the confirmed features, rules, and implementation plan for the chat-based "Gang Wars" game for Stream Mesh. All commands use the `~gw` prefix (e.g., `~gwattack`).

## Core Rules & Features

### 1. Player & Gang System
- Players join the game with `~gwjoin` and receive starting currency (currency name is set by the admin when the game is activated).
- Players can only be in one gang at a time.
- Gangs have a maximum of 3 members.
- Players can create gangs (`~gwcreategang <name>`), join (`~gwjoingang <name>`), or leave (`~gwleavegang`).
- Gangs require a majority vote of members to disband.

### 2. Currency
- No cap on currency.
- Currency name, starting currency, and passive income rate are all set by the admin when the game is activated (not hardcoded).
- Players can deposit any amount or all their cash into the gang bank. Gang bank currency is safe from personal attacks but can be lost if the gang is attacked. Currency in the gang bank is not accessible to the player until withdrawn.

### 3. Weapons & Inventory
- Players start with a bat.
- Additional weapons will be available for purchase and upgrade. (See below for proposed list.)

### 4. Combat
- Attacks can be made against individuals (`~gwattack <user>`) or gangs (`~gwattackgang <gang>`).
- Gang attacks require a majority vote from the attacking gang.
- Outcomes affect both individual and gang currency.

### 5. Leaderboards & Stats
- Track both individual and gang wins.
- Track both individual and gang currency.

### 6. Admin Controls
- "Super Mods" can use admin commands (reset, give currency, etc.).

### 7. Miscellaneous
- All major events can be announced via TTS.
- Help and info commands available (`~gwhelp`).

---

## Proposed Weapons List

- Bat (starter)
- Slingshot
- Water Balloon
- Nerf Gun
- Rubber Chicken
- Super Soaker
- Foam Sword
- (More can be added for progression/fun)

Each weapon can have stats: power, accuracy, cost, and maybe a fun effect.

---

## Implementation Plan

### 1. Database & State
- Player table: id, name, currency, gang, inventory, wins, etc.
- Gang table: id, name, members, bank, wins, disband votes, etc.
- Weapons table: weapon types, stats, costs.
- Transaction/history table (optional, for audit/logs).

### 2. Command Handlers
- `~gwjoin`, `~gwprofile`, `~gwcreategang`, `~gwjoingang`, `~gwleavegang`, `~gwdeposit`, `~gwwithdraw`, `~gwbuyweapon`, `~gwinventory`, `~gwattack`, `~gwattackgang`, `~gwvote`, `~gwleaderboard`, `~gwstats`, `~gwhelp`, admin commands, etc.

### 3. Game Logic
- Passive income timer/loop.
- Attack resolution (individual and gang): calculate outcome, update currency, handle cooldowns.
- Gang disband logic (majority vote).
- Weapon purchase/upgrade logic.
- Bank/deposit/withdraw logic.

### 4. UI/UX (Chat, TTS, and App)
- Add a main "Games" section to the app UI, with a sub-tab for "Gang Wars" (and room for future games).
- Gang Wars sub-tab: controls, settings, leaderboards, help, and game status.
- Announce major events via TTS.
- Provide clear chat feedback for all actions.

### 5. Admin Tools
- Super Mod role check.
- Reset, give currency, etc.

### 6. Testing & Balancing
- Test all commands and edge cases.
- Adjust passive income, weapon stats, and costs for balance.

---

## Outstanding Design Questions

1. Confirm or suggest changes to the proposed weapon list.
2. Any additional features, upgrades, or random events you want?
3. Should there be a penalty for leaving a gang?
4. Should there be a minimum time before a gang can be disbanded?

---

**Please review and answer the outstanding questions above. Once confirmed, implementation will begin!**
