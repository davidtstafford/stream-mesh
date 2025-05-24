import React, { useState, useEffect } from 'react';
import pollyVoiceEngines from '../assets/pollyVoiceEngines.json';

// Extend the voice type to include SupportedEngines
interface PollyVoice {
  Id: string;
  Name: string;
  LanguageName: string;
  SupportedEngines: string[];
}

// Type assertion for imported JSON
const engineMap = pollyVoiceEngines as Record<string, string[]>;

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
  const [status, setStatus] = useState<string | null>(null);
  const [voices, setVoices] = useState<PollyVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('');

  // Fetch available voices from Polly after config is saved
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('polly:listVoices');
        // Ensure voices have SupportedEngines (backend should provide this)
        setVoices(result.voices || []);
        if (result.voices && result.voices.length > 0) {
          setSelectedVoice(result.voices[0].Id);
          setSelectedEngine(result.voices[0].SupportedEngines[0]);
        }
      } catch (err) {
        setStatus('Could not fetch Polly voices');
      }
    };
    fetchVoices();
  }, []);

  // Load saved AWS config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await window.electron.ipcRenderer.invoke('polly:getConfig');
        if (config) {
          setAccessKeyId(config.accessKeyId || '');
          setSecretAccessKey(config.secretAccessKey || '');
          setRegion(config.region || '');
          setSelectedVoice(config.voiceId || '');
        }
      } catch (err) {
        // Ignore if config not found
      }
    };
    fetchConfig();
  }, []);

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

  // Only show voices that are in the mapping
  const filteredVoices = voices.filter(v => engineMap[v.Name]);

  // When selectedVoice changes, always use the first mapped engine
  useEffect(() => {
    if (selectedVoice && engineMap[selectedVoice]) {
      setSelectedEngine(engineMap[selectedVoice][0]);
    }
  }, [selectedVoice]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await window.electron.ipcRenderer.invoke('polly:configure', {
        accessKeyId,
        secretAccessKey,
        region,
        voiceId: selectedVoice,
        engine: selectedEngine,
      });
      setStatus('Saved!');
    } catch (err) {
      setStatus('Failed to save Polly config');
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>TTS Settings</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Configure TTS voices, filters, and moderation. (Initial version: only basic settings, more coming soon)
      </div>
      <div style={{ marginBottom: 16 }}>
        <label><input type="checkbox" /> Enable TTS</label>
        <span style={{ marginLeft: 12, color: '#2ecc40' }}>TTS is OFF</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label><input type="checkbox" /> Read name before message</label>
        <div style={{ color: '#aaa', marginTop: 4 }}>TTS will only read the message</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Default Voice</div>
        <select
          value={selectedVoice}
          onChange={e => setSelectedVoice(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333' }}
        >
          {filteredVoices.length === 0 ? (
            <option>Loading voices...</option>
          ) : (
            filteredVoices.map(v => (
              <option key={v.Id} value={v.Name}>
                {v.Name} ({v.LanguageName})
              </option>
            ))
          )}
        </select>
        {/* Show engine being used as read-only label */}
        {selectedVoice && engineMap[selectedVoice] && (
          <div style={{ marginTop: 8, color: '#aaa' }}>
            Engine: <span style={{ color: '#fff', fontWeight: 'bold' }}>{engineMap[selectedVoice][0]}</span>
          </div>
        )}
        <button
          style={{ marginTop: 8, background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={async () => {
            setStatus(null);
            try {
              const filePath = await window.electron.ipcRenderer.invoke('polly:speak', {
                text: 'This is a test of Amazon Polly.',
                voiceId: filteredVoices.find(v => v.Name === selectedVoice)?.Id,
                engine: engineMap[selectedVoice][0],
              });
              const dataUrl = await window.electron.ipcRenderer.invoke('polly:getAudioDataUrl', filePath);
              const audio = new Audio(dataUrl);
              audio.play();
              setStatus('Test voice played!');
            } catch (err) {
              setStatus('Failed to play test voice');
            }
          }}
          disabled={!selectedVoice || voices.length === 0}
        >
          Test Voice
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
          Amazon Polly (Cloud TTS)
          <a href="TTS.MD" style={{ marginLeft: 8, color: '#00bfff', fontSize: 14 }}>Need help? See the TTS setup guide</a>
        </div>
        <input placeholder="Access Key ID" value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <input placeholder="Secret Access Key" type="password" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <input placeholder="AWS Region (e.g. us-east-1)" value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <button onClick={handleSave} disabled={saving} style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>{saving ? 'Saving...' : 'Save'}</button>
        {status && <div style={{ color: status === 'Saved!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{status}</div>}
      </div>
      <div style={{ color: '#aaa', marginTop: 16 }}>Coming soon: Moderation and more.</div>
    </div>
  );
};

export default TTS;
