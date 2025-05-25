import React from 'react';
import { useTTSSettings } from './hooks/useTTSSettings';

interface TTSSettingsSectionProps {
  saving: boolean;
  onSave: (settings: {
    enabled: boolean;
    readNameBeforeMessage: boolean;
    includePlatformWithName: boolean;
    maxRepeatedChars: number;
  }) => void;
  status: string | null;
}

const TTSSettingsSection: React.FC<TTSSettingsSectionProps> = ({ saving, onSave, status }) => {
  const {
    ttsEnabled,
    setTtsEnabled,
    ttsSettingsLoaded,
    readNameBeforeMessage,
    setReadNameBeforeMessage,
    includePlatformWithName,
    setIncludePlatformWithName,
    maxRepeatedChars,
    setMaxRepeatedChars,
  } = useTTSSettings();

  // Handlers
  const handleToggleTts = () => setTtsEnabled(!ttsEnabled);
  const handleToggleReadName = () => {
    const newValue = !readNameBeforeMessage;
    setReadNameBeforeMessage(newValue);
    if (!newValue) setIncludePlatformWithName(false);
  };
  const handleToggleIncludePlatform = () => setIncludePlatformWithName(!includePlatformWithName);
  const handleSave = () => {
    onSave({
      enabled: ttsEnabled,
      readNameBeforeMessage,
      includePlatformWithName,
      maxRepeatedChars,
    });
  };

  return (
    <div>
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
      <div style={{ marginTop: 24 }}>
        <button
          style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={() => handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save TTS Settings'}
        </button>
        {status && <div style={{ color: status === 'TTS settings saved!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{status}</div>}
      </div>
    </div>
  );
};

export default TTSSettingsSection;
