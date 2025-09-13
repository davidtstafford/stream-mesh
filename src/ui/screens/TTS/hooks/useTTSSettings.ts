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
  enableEmojis?: boolean; // New: enables emoji reading and max repeated emojis
  enableEmotes?: boolean;
  maxRepeatedEmotes?: number;
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
  const [enableEmojis, setEnableEmojisState] = useState(true);
  const [enableEmotes, setEnableEmotesState] = useState(true);
  const [maxRepeatedEmotes, setMaxRepeatedEmotesState] = useState(3);

  // Save settings to backend, preserving blocklist
  const saveSettings = async (settings: TTSSettings) => {
    // Always merge in the current blocklist
    const current = await window.electron.ipcRenderer.invoke('tts:getBlocklist');
    window.electron.ipcRenderer.invoke('tts:setSettings', { ...settings, blocklist: current });
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
      enableEmojis,
      enableEmotes,
      maxRepeatedEmotes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsEnabled, readNameBeforeMessage, includePlatformWithName, maxRepeatedChars, maxRepeatedEmojis, skipLargeNumbers, muteWhenActiveSource, disableNeuralVoices, enableEmojis, enableEmotes, maxRepeatedEmotes, ttsSettingsLoaded]);

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
      setEnableEmojisState(settings.enableEmojis !== false); // default true
      setEnableEmotesState(settings.enableEmotes !== false); // default true
      setMaxRepeatedEmotesState(typeof settings.maxRepeatedEmotes === 'number' ? settings.maxRepeatedEmotes : 3);
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
    enableEmojis,
    setEnableEmojis: setEnableEmojisState,
    enableEmotes,
    setEnableEmotes: setEnableEmotesState,
    maxRepeatedEmotes,
    setMaxRepeatedEmotes: setMaxRepeatedEmotesState,
  };
}
