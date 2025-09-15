// Gang Wars TypeScript models and types

export interface GWPlayer {
  id: string;
  name: string;
  currency: number;
  gang_id?: string;
  inventory: string[];
  wins: number;
  is_supermod: boolean;
}

export interface GWGang {
  id: string;
  name: string;
  members: string[];
  bank: number;
  wins: number;
  disband_votes: string[];
}

export interface GWWeapon {
  id: string;
  name: string;
  cost: number;
  power: number;
  upgrade_cost: number;
  max_level: number;
}

export interface GWTransaction {
  id: string;
  player_id: string;
  type: 'earn' | 'spend' | 'deposit' | 'withdraw' | 'admin';
  amount: number;
  timestamp: number;
  note?: string;
}
