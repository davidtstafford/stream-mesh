import React from 'react';

const OBS: React.FC = () => {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ marginTop: 24 }}>OBS Integration</h2>
      <p>
        This screen will allow you to configure and manage OBS overlays for chat, TTS, alerts, and more.<br />
        <b>Coming soon:</b> Copy/paste browser source URLs for OBS, preview overlays, and advanced event integration.
      </p>
      <div style={{ color: '#aaa', marginTop: 16 }}>
        MVP: Chat overlay browser source will be available here.
      </div>
    </div>
  );
};

export default OBS;
