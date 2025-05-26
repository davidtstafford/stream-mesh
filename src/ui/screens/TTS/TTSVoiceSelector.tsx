import React from 'react';

// Use the same interface as in TTS.tsx
export interface PollyVoiceSorted {
  Name: string;
  LanguageName: string;
  LanguageCode: string;
  Engines: string[];
}

interface VoiceSelectorProps {
  voices: PollyVoiceSorted[];
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  onTestVoice: () => void;
  disabled?: boolean;
  status?: string | null;
}

const TTSVoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onVoiceChange,
  onTestVoice,
  disabled,
  status,
}) => {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Default Voice</div>
      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333' }}
        disabled={disabled}
      >
        {voices.length === 0 ? (
          <option>Loading voices...</option>
        ) : (
          voices.map((v: PollyVoiceSorted) => (
            <option key={v.Name + v.LanguageCode} value={v.Name}>
              {v.Name} ({v.LanguageName})
            </option>
          ))
        )}
      </select>
      <button
        style={{ marginTop: 8, background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
        onClick={onTestVoice}
        disabled={!selectedVoice || voices.length === 0 || disabled}
      >
        Test Voice
      </button>
      {status && <div style={{ color: status === 'Test voice played!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{status}</div>}
    </div>
  );
};

export default TTSVoiceSelector;
