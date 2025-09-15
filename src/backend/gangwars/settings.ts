import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const settingsFile = path.join(app.getPath('userData'), 'gangwarsSettings.json');

export interface GangWarsSettings {
  currencyName: string;
  gameEnabled: boolean;
}

const defaultSettings: GangWarsSettings = {
  currencyName: 'Coins',
  gameEnabled: true,
};

export function loadGangWarsSettings(): GangWarsSettings {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch {}
  return { ...defaultSettings };
}

export function saveGangWarsSettings(settings: GangWarsSettings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}
