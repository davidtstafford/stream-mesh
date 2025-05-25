import { useState, useEffect } from 'react';

export interface PollyConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  voiceId?: string;
  engine?: string;
}

export function usePollyConfig() {
  const [pollyConfig, setPollyConfig] = useState<PollyConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Helper to reload config from disk
  const reloadConfig = async () => {
    setConfigLoaded(false);
    const config = await window.electron.ipcRenderer.invoke('polly:getConfig');
    setPollyConfig(config);
    setConfigLoaded(true);
    if (config) {
      setAccessKeyId(config.accessKeyId || '');
      setSecretAccessKey(config.secretAccessKey || '');
      setRegion(config.region || '');
    }
  };

  useEffect(() => {
    reloadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePollyConfig = async (voiceId?: string, engine?: string) => {
    setSaving(true);
    const newConfig = {
      accessKeyId,
      secretAccessKey,
      region,
      voiceId,
      engine,
    };
    await window.electron.ipcRenderer.invoke('polly:configure', newConfig);
    setStatus('Polly config saved!');
    setTimeout(() => setStatus(null), 2000);
    await reloadConfig(); // Always reload after save
    setSaving(false);
  };

  return {
    pollyConfig,
    configLoaded,
    accessKeyId,
    setAccessKeyId,
    secretAccessKey,
    setSecretAccessKey,
    region,
    setRegion,
    saving,
    status,
    setStatus,
    savePollyConfig,
    reloadConfig,
  };
}
