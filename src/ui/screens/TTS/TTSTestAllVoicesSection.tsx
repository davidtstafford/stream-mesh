import React from 'react';
import { PollyVoiceSorted } from './TTSVoiceSelector';

interface TTSTestAllVoicesSectionProps {
  voices: PollyVoiceSorted[];
  testAllLoading: boolean;
  testAllOutput: string;
  setTestAllLoading: (loading: boolean) => void;
  setTestAllOutput: (output: string) => void;
}

const TTSTestAllVoicesSection: React.FC<TTSTestAllVoicesSectionProps> = ({
  voices,
  testAllLoading,
  testAllOutput,
  setTestAllLoading,
  setTestAllOutput,
}) => {
  return (
    <details style={{ marginTop: 32, background: '#23272b', borderRadius: 8, padding: 0 }}>
      <summary style={{ padding: 16, fontWeight: 600, fontSize: 16, color: '#fff', cursor: 'pointer', outline: 'none' }}>
        Test all voices – developer util only
      </summary>
      <div style={{ padding: 16 }}>
        <button
          style={{ padding: '8px 24px', borderRadius: 4, background: '#3a8dde', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 12 }}
          onClick={async () => {
            setTestAllLoading(true);
            setTestAllOutput('');
            try {
              // Sort voices: English first, then by LanguageName, then by Name
              const sortedVoices = [...voices].sort((a, b) => {
                const aEn = a.LanguageCode && a.LanguageCode.startsWith('en');
                const bEn = b.LanguageCode && b.LanguageCode.startsWith('en');
                if (aEn && !bEn) return -1;
                if (!aEn && bEn) return 1;
                const langCmp = (a.LanguageName || '').localeCompare(b.LanguageName || '');
                if (langCmp !== 0) return langCmp;
                return a.Name.localeCompare(b.Name);
              });
              const results: any[] = [];
              for (const v of sortedVoices) {
                const engines = Array.isArray((v as any).SupportedEngines) ? (v as any).SupportedEngines.filter((e: string) => e === 'neural' || e === 'standard') : [];
                const workingEngines: string[] = [];
                for (const engine of engines) {
                  try {
                    // @ts-ignore
                    await window.electron.ipcRenderer.invoke('polly:speak', { text: 'test', voiceId: v.Name, engine });
                    workingEngines.push(engine);
                  } catch {
                    // Skip if synthesis fails
                  }
                }
                if (workingEngines.length > 0) {
                  results.push({ Name: v.Name, LanguageName: v.LanguageName, LanguageCode: v.LanguageCode, Engines: workingEngines });
                }
              }
              setTestAllOutput(results.map(v => JSON.stringify(v)).join('\n'));
            } finally {
              setTestAllLoading(false);
            }
          }}
          disabled={testAllLoading || voices.length === 0}
        >
          {testAllLoading ? 'Testing All Voices...' : 'Test All Voices'}
        </button>
        <textarea
          style={{ width: '100%', minHeight: 200, marginTop: 8, background: '#181c20', color: '#fff', border: '1px solid #444', borderRadius: 4, fontFamily: 'monospace', fontSize: 14 }}
          value={testAllOutput}
          readOnly
          placeholder="Results will appear here as JSON..."
        />
      </div>
    </details>
  );
};

export default TTSTestAllVoicesSection;
