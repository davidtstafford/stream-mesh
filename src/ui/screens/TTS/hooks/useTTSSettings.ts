import { useState, useEffect } from 'react';

export interface TTSSettings {
  enabled: boolean;
  readNameBeforeMessage: boolean;
  includePlatformWithName: boolean;
  maxRepeatedChars?: number;
}

export function useTTSSettings() {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSettingsLoaded, setTtsSettingsLoaded] = useState(false);
  const [readNameBeforeMessage, setReadNameBeforeMessage] = useState(false);
  const [includePlatformWithName, setIncludePlatformWithName] = useState(false);
  const [maxRepeatedChars, setMaxRepeatedChars] = useState(3);

  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('tts:getSettings').then((settings: TTSSettings) => {
      if (!isMounted) return;
      setTtsEnabled(!!settings.enabled);
      setReadNameBeforeMessage(!!settings.readNameBeforeMessage);
      setIncludePlatformWithName(!!settings.includePlatformWithName);
      setMaxRepeatedChars(typeof settings.maxRepeatedChars === 'number' ? settings.maxRepeatedChars : 3);
      setTtsSettingsLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  return {
    ttsEnabled,
    setTtsEnabled,
    ttsSettingsLoaded,
    readNameBeforeMessage,
    setReadNameBeforeMessage,
    includePlatformWithName,
    setIncludePlatformWithName,
    maxRepeatedChars,
    setMaxRepeatedChars,
  };
}
