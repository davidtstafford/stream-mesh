import React, { useState, useEffect } from 'react';
import pollyVoiceEnginesSorted from '../assets/pollyVoiceEngines.sorted.json';
import PollyConfigSection from './TTS/PollyConfigSection';
import TTSSettingsSection from './TTS/TTSSettingsSection';
import TTSVoiceSelector from './TTS/TTSVoiceSelector';
import TTSHelpModal from './TTS/TTSHelpModal';
import TTSQueueManager from './TTS/TTSQueueManager';
import { usePollyConfig } from './TTS/hooks/usePollyConfig';
import { useTTSSettings } from './TTS/hooks/useTTSSettings';

// PollyConfig type (copy from backend)
interface PollyConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  voiceId?: string;
  engine?: string;
}

// Remove all engineMap references and use the new array-based structure
export interface PollyVoiceSorted {
  Name: string;
  LanguageName: string;
  LanguageCode: string;
  Engines: string[];
}

// Utility to convert Windows path to file URL
function toFileUrl(filePath: string) {
  let path = filePath.replace(/\\/g, '/');
  if (!path.startsWith('/')) path = '/' + path;
  return 'file://' + path;
}

const TTS: React.FC = () => {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSettingsLoaded, setTtsSettingsLoaded] = useState(false);
  const [readNameBeforeMessage, setReadNameBeforeMessage] = useState(false);
  const [includePlatformWithName, setIncludePlatformWithName] = useState(false);
  const [ttsQueueLength, setTtsQueueLength] = useState<number>(0);
  const [maxRepeatedChars, setMaxRepeatedChars] = useState(3);
  const [saving, setSaving] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [voices, setVoices] = useState<PollyVoiceSorted[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    accessKeyId,
    secretAccessKey,
    region,
  } = usePollyConfig();

  // Load saved AWS config on mount
  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('polly:getConfig').then((config: PollyConfig) => {
      if (!isMounted) return;
      if (config) {
        setSelectedVoice(config.voiceId || '');
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Fetch available voices from Polly after config is saved
  useEffect(() => {
    let isMounted = true;
    setVoicesLoaded(false);
    const fetchVoices = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('polly:listVoices');
        if (!isMounted) return;
        setVoices(result.voices || []);
        setVoicesLoaded(true);
      } catch (err) {
        setTtsStatus('Could not fetch Polly voices');
        setVoicesLoaded(true);
      }
    };
    fetchVoices();
    return () => { isMounted = false; };
  }, []);

  // Load TTS settings on mount
  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('tts:getSettings').then((settings: { enabled: boolean, readNameBeforeMessage: boolean, includePlatformWithName: boolean, maxRepeatedChars?: number }) => {
      if (!isMounted) return;
      setTtsEnabled(!!settings.enabled);
      setReadNameBeforeMessage(!!settings.readNameBeforeMessage);
      setIncludePlatformWithName(!!settings.includePlatformWithName);
      setMaxRepeatedChars(typeof settings.maxRepeatedChars === 'number' ? settings.maxRepeatedChars : 3);
      setTtsSettingsLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  // Set selectedVoice only after both config and voices are loaded
  useEffect(() => {
    if (!voicesLoaded) return;
    setSelectedVoice(prev => {
      if (prev && voices.some(v => v.Name === prev)) {
        return prev;
      }
      if (voices.length > 0) {
        return voices[0].Name;
      }
      return '';
    });
  }, [voicesLoaded, voices]);

  // Use the new sorted JSON for the voice list
  const sortedVoices: PollyVoiceSorted[] = pollyVoiceEnginesSorted as PollyVoiceSorted[];

  // Handler for toggling TTS enabled
  const handleToggleTts = async () => {
    const newEnabled = !ttsEnabled;
    setTtsEnabled(newEnabled);
  };

  // Handler for toggling readNameBeforeMessage
  const handleToggleReadName = async () => {
    const newValue = !readNameBeforeMessage;
    setReadNameBeforeMessage(newValue);
    // If disabling, also disable includePlatformWithName
    const newIncludePlatform = newValue ? includePlatformWithName : false;
    setIncludePlatformWithName(newIncludePlatform);
  };

  // Handler for toggling includePlatformWithName
  const handleToggleIncludePlatform = async () => {
    const newValue = !includePlatformWithName;
    setIncludePlatformWithName(newValue);
  };

  // Handler for changing voice
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  // Handler for test voice
  const handleTestVoice = async () => {
    setTtsStatus(null);
    try {
      const filePath = await window.electron.ipcRenderer.invoke('polly:speak', {
        text: 'This is a test of Amazon Polly.',
        voiceId: selectedVoice,
      });
      const dataUrl = await window.electron.ipcRenderer.invoke('polly:getAudioDataUrl', filePath);
      const audio = new Audio(dataUrl);
      audio.play();
      setTtsStatus('Test voice played!');
      setTimeout(() => setTtsStatus(null), 2000);
    } catch (err) {
      setTtsStatus('Failed to play test voice');
      setTimeout(() => setTtsStatus(null), 2000);
    }
  };

  // Listen for TTS queue updates
  useEffect(() => {
    let isMounted = true;
    // Initial fetch
    window.electron.ipcRenderer.invoke('tts:queueStatus').then((res: { length: number }) => {
      if (isMounted && res && typeof res.length === 'number') setTtsQueueLength(res.length);
    });
    // Listen for live updates
    const handler = (_event: any, length: number) => {
      if (isMounted) setTtsQueueLength(length);
    };
    window.electron.ipcRenderer.on('tts:queueChanged', handler);
    return () => {
      isMounted = false;
      window.electron.ipcRenderer.removeAllListeners('tts:queueChanged');
    };
  }, []);

  // Save handler for TTS settings
  const handleSaveTTS = async (settings: {
    enabled: boolean;
    readNameBeforeMessage: boolean;
    includePlatformWithName: boolean;
    maxRepeatedChars: number;
  }) => {
    setSaving(true);
    await window.electron.ipcRenderer.invoke('tts:setSettings', settings);
    if (accessKeyId && secretAccessKey && region && selectedVoice) {
      await window.electron.ipcRenderer.invoke('polly:configure', {
        accessKeyId,
        secretAccessKey,
        region,
        voiceId: selectedVoice,
      });
    }
    setSaving(false);
    setTtsStatus('TTS settings saved!');
    setTimeout(() => setTtsStatus(null), 2000);
  };

  // Handle clearing the TTS queue
  const handleClearQueue = async () => {
    setTtsStatus(null);
    try {
      await window.electron.ipcRenderer.invoke('tts:clearQueue');
      setTtsStatus('TTS backlog cleared!');
      setTimeout(() => setTtsStatus(null), 2000);
    } catch (err) {
      setTtsStatus('Failed to clear TTS backlog');
      setTimeout(() => setTtsStatus(null), 2000);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      {/* Help Modal */}
      <TTSHelpModal showHelp={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Amazon Polly (Cloud TTS) - REQUIRED section */}
      <PollyConfigSection
        onHelp={() => setShowHelp(true)}
      />
      
      {/* TTS Settings Section */}
      <TTSSettingsSection saving={saving} onSave={handleSaveTTS} status={ttsStatus} />
      
      {/* Voice selection and test controls */}
      <TTSVoiceSelector
        voices={sortedVoices}
        selectedVoice={selectedVoice}
        onVoiceChange={(voiceId: string) => setSelectedVoice(voiceId)}
        onTestVoice={handleTestVoice}
        disabled={saving}
        status={ttsStatus}
      />
      
      <div style={{ color: '#aaa', marginTop: 16 }}>Coming soon: Moderation and more.</div>
      
      {/* TTS Queue Management */}
      <TTSQueueManager 
        ttsQueueLength={ttsQueueLength} 
        onClearQueue={handleClearQueue} 
        status={ttsStatus}
      />
    </div>
  );
};

export default TTS;
