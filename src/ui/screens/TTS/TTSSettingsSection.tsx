import React, { useState } from 'react';
import { useTTSSettings } from './hooks/useTTSSettings';
// Modal for editing TTS blocklist
const BlocklistModal: React.FC<{
  open: boolean;
  onClose: () => void;
  blocklist: string[];
  setBlocklist: (list: string[]) => void;
}> = ({ open, onClose, blocklist, setBlocklist }) => {
  const [input, setInput] = useState('');
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000 }}>
      <div style={{ maxWidth: 420, margin: '120px auto', background: '#181c20', padding: 24, borderRadius: 8, color: '#fff', boxShadow: '0 2px 16px #0008' }}>
        <h3 style={{ marginBottom: 12 }}>TTS Blocklist</h3>
        <div style={{ color: '#aaa', marginBottom: 12 }}>
          Add words or phrases that will prevent TTS from reading a message if matched (case-insensitive, anywhere in message). Example: <b>!gamble</b> will block <i>!gamble 40000</i>.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add word or phrase"
            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #444', background: '#23272b', color: '#fff' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                setBlocklist([...blocklist, input.trim()]);
                setInput('');
              }
            }}
          />
          <button
            onClick={() => { if (input.trim()) { setBlocklist([...blocklist, input.trim()]); setInput(''); }}}
            style={{ padding: '8px 16px', borderRadius: 4, background: '#3a8dde', color: '#fff', border: 'none' }}
          >Add</button>
        </div>
        <ul style={{ maxHeight: 180, overflowY: 'auto', padding: 0, margin: 0, listStyle: 'none' }}>
          {blocklist.map((word, i) => (
            <li key={word + i} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ flex: 1, color: '#fff', fontSize: 15 }}>{word}</span>
              <button
                onClick={() => setBlocklist(blocklist.filter((_, idx) => idx !== i))}
                style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 13 }}
              >Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button onClick={onClose} style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

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
    enableEmojis,
    setEnableEmojis,
    enableEmotes,
    setEnableEmotes,
    maxRepeatedEmotes,
    setMaxRepeatedEmotes,
  } = useTTSSettings();

  // Blocklist state
  const [blocklist, setBlocklistState] = useState<string[]>([]);
  const [blocklistModalOpen, setBlocklistModalOpen] = useState(false);

  // Load blocklist from backend on mount
  React.useEffect(() => {
    window.electron.ipcRenderer.invoke('tts:getBlocklist').then((list: string[]) => {
      if (Array.isArray(list)) setBlocklistState(list);
    });
  }, []);
  // Save blocklist to backend on change
  React.useEffect(() => {
    window.electron.ipcRenderer.invoke('tts:setBlocklist', blocklist);
  }, [blocklist]);

  const openBlocklistModal = () => setBlocklistModalOpen(true);
  const closeBlocklistModal = () => setBlocklistModalOpen(false);
  const setBlocklist = (list: string[]) => setBlocklistState(list.filter(w => !!w.trim()));

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
      <BlocklistModal open={blocklistModalOpen} onClose={closeBlocklistModal} blocklist={blocklist} setBlocklist={setBlocklist} />
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>TTS Settings</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Configure TTS voices, filters, and moderation. (Initial version: only basic settings, more coming soon)
      </div>

  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label>
          <input type="checkbox" checked={ttsEnabled} onChange={handleToggleTts} disabled={!ttsSettingsLoaded} /> Enable TTS
        </label>
        <span style={{ marginLeft: 12, color: ttsEnabled ? '#2ecc40' : '#ff4d4f' }}>
          TTS is {ttsEnabled ? 'ON' : 'OFF'}
        </span>
        <button
          type="button"
          style={{ marginLeft: 24, background: '#3a8dde', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500, cursor: 'pointer' }}
          onClick={openBlocklistModal}
        >
          Edit TTS Blocklist
        </button>
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
        <label>
          <input
            type="checkbox"
            checked={enableEmojis}
            onChange={e => setEnableEmojis(e.target.checked)}
            disabled={!ttsSettingsLoaded}
          />{' '}
          Enable emojis in TTS
        </label>
        <div style={{ color: '#aaa', marginTop: 4 }}>
          When enabled, emojis will be read out in TTS. When disabled, all emojis will be skipped.
        </div>
        {enableEmojis && (
          <div style={{ marginTop: 8, marginLeft: 24 }}>
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
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={enableEmotes}
            onChange={e => setEnableEmotes(e.target.checked)}
            disabled={!ttsSettingsLoaded}
          />{' '}
          Enable emotes in TTS
        </label>
        <div style={{ color: '#aaa', marginTop: 4 }}>
          When enabled, Twitch emotes will be read out in TTS. When disabled, all emotes will be skipped.
        </div>
        {enableEmotes && (
          <div style={{ marginTop: 8, marginLeft: 24 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Max repeated emotes</div>
            <input
              type="number"
              min={1}
              max={10}
              value={maxRepeatedEmotes}
              onChange={e => setMaxRepeatedEmotes(Number(e.target.value))}
              style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #333', marginRight: 8 }}
            />
            <span style={{ color: '#aaa' }}>
              Example: <b>Kappa Kappa Kappa Kappa</b> → <b>Kappa Kappa Kappa</b> (if limit is 3)
            </span>
          </div>
        )}
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
  {/* Settings are now saved automatically on change. */}
    </div>
  );
};

export default TTSSettingsSection;
