import React from 'react';

const Viewers: React.FC = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Viewer Management</h2>
      <table style={{ width: '100%', background: '#23272b', borderRadius: 8, borderCollapse: 'collapse' }}>
        <thead style={{ background: '#181c20' }}>
          <tr>
            <th>Name</th><th>User ID</th><th>Platform</th><th>Permission</th><th>TTS Blocked</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>No viewers</td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default Viewers;
