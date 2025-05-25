import React from 'react';

interface TTSHelpModalProps {
  showHelp: boolean;
  onClose: () => void;
}

const TTSHelpModal: React.FC<TTSHelpModalProps> = ({ showHelp, onClose }) => {
  if (!showHelp) return null;
  
  return (
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
            onClick={onClose}
            style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TTSHelpModal;
