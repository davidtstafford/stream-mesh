import React from 'react';
import { useTTSSettings } from './hooks/useTTSSettings';

interface TTSSettingsSectionProps {
  saving: boolean;
  onSave: (settings: {
    enabled: boolean;
    readNameBeforeMessage: boolean;
    includePlatformWithName: boolean;
    maxRepeatedChars: number;
    maxRepeatedEmojis: number;
    skipLargeNumbers: boolean;
    muteWhenActiveSource: boolean;
    disableNeuralVoices: boolean;
  }) => void;
}

const TTSSettingsSection: React.FC<TTSSettingsSectionProps> = ({ saving, onSave }) => {
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
    maxRepeatedEmojis,
    setMaxRepeatedEmojis,
    skipLargeNumbers,
    setSkipLargeNumbers,
    muteWhenActiveSource,
    setMuteWhenActiveSource,
    disableNeuralVoices,
    setDisableNeuralVoices,
  } = useTTSSettings();

  // Handlers
  const handleToggleTts = () => setTtsEnabled(!ttsEnabled);
  const handleToggleReadName = () => {
    const newValue = !readNameBeforeMessage;
    setReadNameBeforeMessage(newValue);
    if (!newValue) setIncludePlatformWithName(false);
  };
  const handleToggleIncludePlatform = () => setIncludePlatformWithName(!includePlatformWithName);
  const handleToggleDisableNeural = () => setDisableNeuralVoices(!disableNeuralVoices);
  const handleSave = () => {
    onSave({
      enabled: ttsEnabled,
      readNameBeforeMessage,
      includePlatformWithName,
      maxRepeatedChars,
      maxRepeatedEmojis,
      skipLargeNumbers,
      muteWhenActiveSource,
      disableNeuralVoices,
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
          <input
            type="checkbox"
            checked={disableNeuralVoices}
            onChange={handleToggleDisableNeural}
            disabled={!ttsSettingsLoaded}
          />{' '}
          <b>Disable neural voices</b>
        </label>
        <div style={{ color: '#aaa', marginTop: 6, maxWidth: 520 }}>
          <b>Note:</b> Neural voices sound more natural but cost significantly more on AWS Polly. When enabled, only standard voices will be available and used for TTS, reducing costs. Please save and refresh this screen to see the affects.
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={muteWhenActiveSource}
            onChange={e => setMuteWhenActiveSource(e.target.checked)}
            disabled={!ttsSettingsLoaded}
          />{' '}
          Mute TTS when in use by active source
        </label>
        <div style={{ color: '#aaa', marginTop: 6, maxWidth: 520 }}>
          <b>Note:</b> When this is <b>OFF</b>, you may hear an echo if both this app and another app (like OBS) are playing TTS audio at the same time.<br />
          When <b>ON</b>, TTS audio will be muted in this app while an active overlay/browser source is connected (such as in OBS), helping to prevent echo or double playback.
        </div>
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Max repeated emojis</div>
        <input
          type="number"
          min={1}
          max={10}
          value={maxRepeatedEmojis}
          onChange={e => setMaxRepeatedEmojis(Number(e.target.value))}
          style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #333', marginRight: 8 }}
        />
        <span style={{ color: '#aaa' }}>
          Example: <b>😂😂😂😂😂</b> → <b>😂😂😂</b> (if limit is 3)
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={skipLargeNumbers}
            onChange={e => setSkipLargeNumbers(e.target.checked)}
            disabled={!ttsSettingsLoaded}
          />{' '}
          Skip reading large numbers
        </label>
        <span style={{ color: '#aaa', marginLeft: 8 }}>
          (Ignores numbers longer than 6 digits)
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
