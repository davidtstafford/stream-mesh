import React from 'react';

interface TTSQueueManagerProps {
  ttsQueueLength: number;
  onClearQueue: () => void;
}

const TTSQueueManager: React.FC<TTSQueueManagerProps> = ({ 
  ttsQueueLength, 
  onClearQueue
}) => {
  return (
    <>
      <div style={{ marginTop: 24 }}>
        <button
          style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}
          onClick={onClearQueue}
        >
          Clear TTS Backlog
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: '#aaa', fontSize: 15 }}>
          TTS Queue: <b>{ttsQueueLength}</b> message{ttsQueueLength === 1 ? '' : 's'} waiting
        </span>
      </div>
    </>
  );
};

export default TTSQueueManager;
