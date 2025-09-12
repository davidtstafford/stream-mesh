import { useState, useEffect, useRef } from 'react';

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
  const [ttsEnabled, setTtsEnabledState] = useState(false);
  const [ttsSettingsLoaded, setTtsSettingsLoaded] = useState(false);
  const [readNameBeforeMessage, setReadNameBeforeMessageState] = useState(false);
  const [includePlatformWithName, setIncludePlatformWithNameState] = useState(false);
  const [maxRepeatedChars, setMaxRepeatedCharsState] = useState(3);
  const [maxRepeatedEmojis, setMaxRepeatedEmojisState] = useState(3);
  const [skipLargeNumbers, setSkipLargeNumbersState] = useState(false);
  const [muteWhenActiveSource, setMuteWhenActiveSourceState] = useState(false);
  const [disableNeuralVoices, setDisableNeuralVoicesState] = useState(false);

  // Save settings to backend
  const saveSettings = (settings: TTSSettings) => {
    window.electron.ipcRenderer.invoke('tts:setSettings', settings);
  };

  // Save on every change
  useEffect(() => {
    if (!ttsSettingsLoaded) return;
    saveSettings({
      enabled: ttsEnabled,
      readNameBeforeMessage,
      includePlatformWithName,
      maxRepeatedChars,
      maxRepeatedEmojis,
      skipLargeNumbers,
      muteWhenActiveSource,
      disableNeuralVoices,
    });
  }, [ttsEnabled, readNameBeforeMessage, includePlatformWithName, maxRepeatedChars, maxRepeatedEmojis, skipLargeNumbers, muteWhenActiveSource, disableNeuralVoices, ttsSettingsLoaded]);

  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('tts:getSettings').then((settings: TTSSettings) => {
      if (!isMounted) return;
      setTtsEnabledState(!!settings.enabled);
      setReadNameBeforeMessageState(!!settings.readNameBeforeMessage);
      setIncludePlatformWithNameState(!!settings.includePlatformWithName);
      setMaxRepeatedCharsState(typeof settings.maxRepeatedChars === 'number' ? settings.maxRepeatedChars : 3);
      setMaxRepeatedEmojisState(typeof settings.maxRepeatedEmojis === 'number' ? settings.maxRepeatedEmojis : 3);
      setSkipLargeNumbersState(!!settings.skipLargeNumbers);
      setMuteWhenActiveSourceState(!!settings.muteWhenActiveSource);
      setDisableNeuralVoicesState(!!settings.disableNeuralVoices);
      setTtsSettingsLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  return {
    ttsEnabled,
    setTtsEnabled: setTtsEnabledState,
    ttsSettingsLoaded,
    readNameBeforeMessage,
    setReadNameBeforeMessage: setReadNameBeforeMessageState,
    includePlatformWithName,
    setIncludePlatformWithName: setIncludePlatformWithNameState,
    maxRepeatedChars,
    setMaxRepeatedChars: setMaxRepeatedCharsState,
    maxRepeatedEmojis,
    setMaxRepeatedEmojis: setMaxRepeatedEmojisState,
    skipLargeNumbers,
    setSkipLargeNumbers: setSkipLargeNumbersState,
    muteWhenActiveSource,
    setMuteWhenActiveSource: setMuteWhenActiveSourceState,
    disableNeuralVoices,
    setDisableNeuralVoices: setDisableNeuralVoicesState,
  };
}
