// Gang Wars database schema (TypeScript/SQLite)
// This file defines the initial tables and types for the Gang Wars game.

// Player Table
// id: string (unique, e.g. chat username or user id)
// name: string
// currency: number
// gang_id: string | null
// inventory: JSON (array of weapon ids)
// wins: number
// is_supermod: boolean

// Gang Table
// id: string (unique)
// name: string
// members: JSON (array of player ids)
// bank: number
// wins: number
// disband_votes: JSON (array of player ids)

// Weapon Table
// id: string (unique)
// name: string
// power: number
// accuracy: number
// cost: number
// effect: string (optional)

// Transaction Table (optional)
// id: string
// type: string (e.g. 'deposit', 'attack', 'win', etc.)
// player_id: string
// gang_id: string | null
// amount: number
// timestamp: datetime

// These tables will be created in the backend database initialization step.
