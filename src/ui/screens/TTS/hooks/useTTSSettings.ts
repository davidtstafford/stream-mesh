import { useState, useEffect } from 'react';

export interface TTSSettings {
  enabled: boolean;
  readNameBeforeMessage: boolean;
  includePlatformWithName: boolean;
  maxRepeatedChars?: number;
  maxRepeatedEmojis?: number;
  skipLargeNumbers?: boolean;
  muteWhenActiveSource?: boolean;
  disableNeuralVoices?: boolean; // New: disables neural voices in UI/backend
}

export function useTTSSettings() {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSettingsLoaded, setTtsSettingsLoaded] = useState(false);
  const [readNameBeforeMessage, setReadNameBeforeMessage] = useState(false);
  const [includePlatformWithName, setIncludePlatformWithName] = useState(false);
  const [maxRepeatedChars, setMaxRepeatedChars] = useState(3);
  const [maxRepeatedEmojis, setMaxRepeatedEmojis] = useState(3);
  const [skipLargeNumbers, setSkipLargeNumbers] = useState(false);
  const [muteWhenActiveSource, setMuteWhenActiveSource] = useState(false);
  const [disableNeuralVoices, setDisableNeuralVoices] = useState(false);

  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('tts:getSettings').then((settings: TTSSettings) => {
      if (!isMounted) return;
      setTtsEnabled(!!settings.enabled);
      setReadNameBeforeMessage(!!settings.readNameBeforeMessage);
      setIncludePlatformWithName(!!settings.includePlatformWithName);
      setMaxRepeatedChars(typeof settings.maxRepeatedChars === 'number' ? settings.maxRepeatedChars : 3);
      setMaxRepeatedEmojis(typeof settings.maxRepeatedEmojis === 'number' ? settings.maxRepeatedEmojis : 3);
      setSkipLargeNumbers(!!settings.skipLargeNumbers);
      setMuteWhenActiveSource(!!settings.muteWhenActiveSource);
      setDisableNeuralVoices(!!settings.disableNeuralVoices);
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
    maxRepeatedEmojis,
    setMaxRepeatedEmojis,
    skipLargeNumbers,
    setSkipLargeNumbers,
    muteWhenActiveSource,
    setMuteWhenActiveSource,
    disableNeuralVoices,
    setDisableNeuralVoices,
  };
}
