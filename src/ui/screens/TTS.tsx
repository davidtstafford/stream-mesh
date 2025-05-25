import React, { useState, useEffect } from 'react';
import pollyVoiceEnginesSorted from '../assets/pollyVoiceEngines.sorted.json';
import PollyConfigSection from './TTS/PollyConfigSection';
import { usePollyConfig } from './TTS/hooks/usePollyConfig';

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

  // Save only TTS settings (global)
  const handleSaveTTS = async () => {
    setSaving(true);
    await window.electron.ipcRenderer.invoke('tts:setSettings', {
      enabled: ttsEnabled,
      readNameBeforeMessage,
      includePlatformWithName,
      maxRepeatedChars
    });
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

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      {/* Help Modal */}
      {showHelp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 }}>
          <div style={{ maxWidth: 800, margin: '100px auto', background: '#111', padding: 24, borderRadius: 8, color: '#fff' }}>
            <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Amazon Polly TTS - Help</h2>
            <div style={{ color: '#aaa', marginBottom: 16 }}>
              This section provides information about using Amazon Polly for Text-to-Speech (TTS) in your application.
            </div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: 8 }}>Enable TTS</h3>
              <div style={{ color: '#aaa' }}>
                Turn on TTS to enable voice reading of messages. You can configure the voice and other settings below.
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: 8 }}>Default Voice</h3>
              <div style={{ color: '#aaa' }}>
                Select the default voice for TTS. This will be used to read messages aloud.
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: 8 }}>Test Voice</h3>
              <div style={{ color: '#aaa' }}>
                Use the "Test Voice" button to play a test message using the selected voice. This helps you to quickly check the voice output.
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: 8 }}>Moderation and Filters</h3>
              <div style={{ color: '#aaa' }}>
                Coming soon: Advanced settings for moderation and filtering of messages.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Amazon Polly (Cloud TTS) - REQUIRED section */}
      <PollyConfigSection
        onHelp={() => setShowHelp(true)}
      />
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>TTS Settings</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Configure TTS voices, filters, and moderation. (Initial version: only basic settings, more coming soon)
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="checkbox" checked={ttsEnabled} onChange={handleToggleTts} disabled={!ttsSettingsLoaded} /> Enable TTS
        </label>
        <span style={{ marginLeft: 12, color: ttsEnabled ? '#2ecc40' : '#ff4d4f' }}>
          TTS is {ttsEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="checkbox" checked={readNameBeforeMessage} onChange={handleToggleReadName} disabled={!ttsSettingsLoaded} /> Read name before message
        </label>
        <div style={{ color: '#aaa', marginTop: 4 }}>
          {readNameBeforeMessage
            ? 'TTS will say "Alice says ..." or "Alice asks ..." before the message.'
            : 'TTS will only read the message.'}
        </div>
        {readNameBeforeMessage && (
          <div style={{ marginTop: 8, marginLeft: 24 }}>
            <label>
              <input
                type="checkbox"
                checked={includePlatformWithName}
                onChange={handleToggleIncludePlatform}
                disabled={!ttsSettingsLoaded || !readNameBeforeMessage}
              />{' '}
              Include platform with name (e.g. "Alice from Twitch says ...")
            </label>
          </div>
        )}
      </div>
      {/* Max repeated characters option */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Max repeated characters</div>
        <input
          type="number"
          min={1}
          max={10}
          value={maxRepeatedChars}
          onChange={e => setMaxRepeatedChars(Number(e.target.value))}
          style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #333', marginRight: 8 }}
        />
        <span style={{ color: '#aaa' }}>
          Example: <b>loooooool</b> → <b>lool</b> (if limit is 2, <b>lool</b>)
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Default Voice</div>
        <select
          value={selectedVoice}
          onChange={handleVoiceChange}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333' }}
        >
          {sortedVoices.length === 0 ? (
            <option>Loading voices...</option>
          ) : (
            sortedVoices.map((v: PollyVoiceSorted) => (
              <option key={v.Name + v.LanguageCode} value={v.Name}>
                {v.Name} ({v.LanguageName})
              </option>
            ))
          )}
        </select>
        <button
          style={{ marginTop: 8, background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={handleTestVoice}
          disabled={!selectedVoice || sortedVoices.length === 0}
        >
          Test Voice
        </button>
        {ttsStatus && <div style={{ color: ttsStatus === 'Test voice played!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{ttsStatus}</div>}
      </div>
      <div style={{ color: '#aaa', marginTop: 16 }}>Coming soon: Moderation and more.</div>
      <div style={{ marginTop: 24 }}>
        <button
          style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={handleSaveTTS}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save TTS Settings'}
        </button>
        {ttsStatus && <div style={{ color: ttsStatus === 'TTS settings saved!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{ttsStatus}</div>}
        <button
          style={{ background: '#ff4d4f', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4, marginLeft: 16 }}
          onClick={async () => {
            setTtsStatus(null);
            try {
              await window.electron.ipcRenderer.invoke('tts:clearQueue');
              setTtsStatus('TTS backlog cleared!');
              setTimeout(() => setTtsStatus(null), 2000);
            } catch (err) {
              setTtsStatus('Failed to clear TTS backlog');
              setTimeout(() => setTtsStatus(null), 2000);
            }
          }}
        >
          Clear TTS Backlog
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: '#aaa', fontSize: 15 }}>
          TTS Queue: <b>{ttsQueueLength}</b> message{ttsQueueLength === 1 ? '' : 's'} waiting
        </span>
      </div>
    </div>
  );
};

export default TTS;
