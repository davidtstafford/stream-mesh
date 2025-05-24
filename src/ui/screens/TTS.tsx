import React, { useState, useEffect } from 'react';
import pollyVoiceEnginesSorted from '../assets/pollyVoiceEngines.sorted.json';

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
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [pollyStatus, setPollyStatus] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [voices, setVoices] = useState<PollyVoiceSorted[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [pollyConfig, setPollyConfig] = useState<PollyConfig | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSettingsLoaded, setTtsSettingsLoaded] = useState(false);
  const [readNameBeforeMessage, setReadNameBeforeMessage] = useState(false);
  const [includePlatformWithName, setIncludePlatformWithName] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pollyCollapsed, setPollyCollapsed] = useState(() => {
    // Collapse if all required fields are present, else expand
    return !!(accessKeyId && secretAccessKey && region);
  });

  // Load saved AWS config on mount
  useEffect(() => {
    let isMounted = true;
    setConfigLoaded(false);
    window.electron.ipcRenderer.invoke('polly:getConfig').then((config: PollyConfig) => {
      if (!isMounted) return;
      setPollyConfig(config);
      setConfigLoaded(true);
      if (config) {
        setAccessKeyId(config.accessKeyId || '');
        setSecretAccessKey(config.secretAccessKey || '');
        setRegion(config.region || '');
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
        setPollyStatus('Could not fetch Polly voices');
        setVoicesLoaded(true);
      }
    };
    fetchVoices();
    return () => { isMounted = false; };
  }, []);

  // Load TTS settings on mount
  useEffect(() => {
    let isMounted = true;
    window.electron.ipcRenderer.invoke('tts:getSettings').then((settings: { enabled: boolean, readNameBeforeMessage: boolean, includePlatformWithName: boolean }) => {
      if (!isMounted) return;
      setTtsEnabled(!!settings.enabled);
      setReadNameBeforeMessage(!!settings.readNameBeforeMessage);
      setIncludePlatformWithName(!!settings.includePlatformWithName);
      setTtsSettingsLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  // Set selectedVoice and selectedEngine only after both config and voices are loaded
  useEffect(() => {
    if (!configLoaded || !voicesLoaded) return;
    setSelectedVoice(prev => {
      if (prev && voices.some(v => v.Name === prev)) return prev;
      if (pollyConfig && pollyConfig.voiceId && voices.some(v => v.Name === pollyConfig.voiceId)) {
        setSelectedEngine(voices.find(v => v.Name === pollyConfig.voiceId)?.Engines[0] || '');
        return pollyConfig.voiceId;
      }
      if (voices.length > 0) {
        setSelectedEngine(voices[0].Engines[0]);
        return voices[0].Name;
      }
      return '';
    });
  }, [configLoaded, voicesLoaded, voices, pollyConfig]);

  // Save config on change
  useEffect(() => {
    if (accessKeyId && secretAccessKey && region && selectedVoice && selectedEngine) {
      window.electron.ipcRenderer.invoke('polly:configure', {
        accessKeyId,
        secretAccessKey,
        region,
        voiceId: selectedVoice,
        engine: selectedEngine,
      });
    }
  }, [accessKeyId, secretAccessKey, region, selectedVoice, selectedEngine]);

  // Use the new sorted JSON for the voice list
  const sortedVoices: PollyVoiceSorted[] = pollyVoiceEnginesSorted as PollyVoiceSorted[];

  // When selectedVoice changes, update selectedEngine to the first engine in the selected voice's Engines array
  useEffect(() => {
    if (!selectedVoice) return;
    const found = sortedVoices.find(v => v.Name === selectedVoice);
    if (found && found.Engines.length > 0) {
      setSelectedEngine(found.Engines[0]);
    }
  }, [selectedVoice, sortedVoices]);

  // Set selectedVoice on initial load if not set
  useEffect(() => {
    if (!selectedVoice && sortedVoices.length > 0) {
      setSelectedVoice(sortedVoices[0].Name);
    }
  }, [sortedVoices, selectedVoice]);

  // Save only Polly config
  const handleSavePolly = async () => {
    if (!pollyConfig) return;
    setSaving(true);
    const newConfig = {
      ...pollyConfig,
      accessKeyId,
      secretAccessKey,
      region,
      voiceId: selectedVoice,
      engine: selectedEngine,
    };
    await window.electron.ipcRenderer.invoke('polly:configure', newConfig);
    setPollyConfig(newConfig);
    setSaving(false);
    setPollyStatus('Polly config saved!');
    setTimeout(() => setPollyStatus(null), 2000);
  };

  // Save only TTS settings (global)
  const handleSaveTTS = async () => {
    setSaving(true);
    await window.electron.ipcRenderer.invoke('tts:setSettings', {
      enabled: ttsEnabled,
      readNameBeforeMessage,
      includePlatformWithName
    });
    // Save selected voice/engine as well
    if (accessKeyId && secretAccessKey && region && selectedVoice && selectedEngine) {
      await window.electron.ipcRenderer.invoke('polly:configure', {
        accessKeyId,
        secretAccessKey,
        region,
        voiceId: selectedVoice,
        engine: selectedEngine,
      });
    }
    setSaving(false);
    setTtsStatus('TTS settings saved!');
    setTimeout(() => setTtsStatus(null), 2000);
  };

  // Helper for opening the local file in a modal (in-app)
  const openTTSGuide = () => {
    setShowHelp(true);
  };

  // Update collapse state if config changes
  React.useEffect(() => {
    if (accessKeyId && secretAccessKey && region) {
      setPollyCollapsed(true);
    } else {
      setPollyCollapsed(false);
    }
  }, [accessKeyId, secretAccessKey, region]);

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

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      {/* Help Modal */}
      {showHelp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#23272e',
            borderRadius: 8,
            maxWidth: 800,
            width: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 32px #000',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                zIndex: 10,
              }}
              title="Close help"
            >
              ×
            </button>
            <iframe
              src="/ui/assets/TTS.html"
              title="TTS Setup Guide"
              style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8, background: '#23272e' }}
            />
          </div>
        </div>
      )}
      {/* Amazon Polly (Cloud TTS) - REQUIRED section */}
      <div style={{
        marginBottom: 24,
        border: '1px solid #444',
        borderRadius: 8,
        background: '#23272e',
        boxShadow: '0 2px 8px #0002',
        position: 'relative',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '12px 16px',
            borderBottom: pollyCollapsed ? 'none' : '1px solid #444',
            background: '#23272e',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
          onClick={() => setPollyCollapsed(c => !c)}
        >
          <span style={{ fontWeight: 'bold', fontSize: 18, color: '#00bfff', flex: 1 }}>
            Amazon Polly (Cloud TTS) <span style={{ color: '#ff4d4f', fontWeight: 600 }}>*</span>
          </span>
          <span style={{ color: '#aaa', fontSize: 14, marginRight: 12 }}>
            {pollyCollapsed ? 'Show' : 'Hide'}
          </span>
          <span style={{ fontSize: 22, color: '#aaa' }}>{pollyCollapsed ? '+' : '–'}</span>
        </div>
        {!pollyCollapsed && (
          <div style={{ padding: 16 }}>
            <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 8 }}>
              Amazon Polly setup is <b>required</b> for TTS to work.
            </div>
            <div style={{ color: '#aaa', marginBottom: 12 }}>
              Enter your AWS credentials and region to enable Text-to-Speech. This is a one-time setup.
            </div>
            <input placeholder="Access Key ID" value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
            <input placeholder="Secret Access Key" type="password" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
            <input placeholder="AWS Region (e.g. us-east-1)" value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
            <button onClick={handleSavePolly} disabled={saving} style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>{saving ? 'Saving...' : 'Save Polly Config'}</button>
            {pollyStatus && <div style={{ color: pollyStatus === 'Polly config saved!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{pollyStatus}</div>}
            <div style={{ marginTop: 12 }}>
              <span
                onClick={openTTSGuide}
                style={{ color: '#00bfff', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
                title="Open the TTS setup guide"
              >
                Need help? See the TTS setup guide
              </span>
            </div>
          </div>
        )}
        {/* Visual cue if incomplete */}
        {(!accessKeyId || !secretAccessKey || !region) && pollyCollapsed && (
          <div style={{ color: '#ff4d4f', fontSize: 13, padding: '0 16px 12px 16px' }}>
            <b>Required:</b> Please complete Amazon Polly setup above to enable TTS.
          </div>
        )}
      </div>
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
        {/* Show engine being used as read-only label */}
        {selectedVoice && (
          <div style={{ marginTop: 8, color: '#aaa' }}>
            Engine: <span style={{ color: '#fff', fontWeight: 'bold' }}>{sortedVoices.find((v: PollyVoiceSorted) => v.Name === selectedVoice)?.Engines[0]}</span>
          </div>
        )}
        <button
          style={{ marginTop: 8, background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={async () => {
            setTtsStatus(null);
            try {
              const filePath = await window.electron.ipcRenderer.invoke('polly:speak', {
                text: 'This is a test of Amazon Polly.',
                voiceId: selectedVoice,
                engine: sortedVoices.find((v: PollyVoiceSorted) => v.Name === selectedVoice)?.Engines[0],
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
          }}
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
    </div>
  );
};

export default TTS;
