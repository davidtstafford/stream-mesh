import React from 'react';

const SystemCommands: React.FC = () => {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>System Commands</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Built-in commands provided by Stream Mesh. Toggle to enable/disable each command.
      </div>
      <table style={{ width: '100%', background: '#23272b', borderRadius: 8, borderCollapse: 'collapse' }}>
        <thead style={{ background: '#181c20' }}>
          <tr>
            <th>Command</th><th>Description</th><th>Enabled</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>!hello</td>
            <td>Replies with a hello message to the user.</td>
            <td><input type="checkbox" checked readOnly /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SystemCommands;
