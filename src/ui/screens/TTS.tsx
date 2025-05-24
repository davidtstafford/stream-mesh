import React from 'react';

const TTS: React.FC = () => {
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
        <select style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333' }}>
          <option>Jacek (Polish) [Polly]</option>
        </select>
        <button style={{ marginTop: 8, background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Test Voice</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
          Amazon Polly (Cloud TTS)
          <a href="TTS.MD" style={{ marginLeft: 8, color: '#00bfff', fontSize: 14 }}>Need help? See the TTS setup guide</a>
        </div>
        <input placeholder="Access Key ID" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <input placeholder="Secret Access Key" type="password" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <input placeholder="AWS Region (e.g. us-east-1)" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
        <button style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Save</button>
      </div>
      <div style={{ color: '#aaa', marginTop: 16 }}>Coming soon: Moderation and more.</div>
    </div>
  );
};

export default TTS;
