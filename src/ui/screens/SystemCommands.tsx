import React, { useState, useEffect } from 'react';

interface SystemCommand {
  command: string;
  enabled: boolean;
  description: string;
}

const SystemCommands: React.FC = () => {
  const [commands, setCommands] = useState<SystemCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Load commands on mount
  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      const systemCommands = await window.electron.ipcRenderer.invoke('commands:getSystemCommands');
      setCommands(systemCommands);
    } catch (error) {
      console.error('Failed to load system commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommand = async (command: string, enabled: boolean) => {
    setSaving(command);
    try {
      await window.electron.ipcRenderer.invoke('commands:setEnabled', command, enabled);
      
      // Update local state
      setCommands(prev => prev.map(cmd => 
        cmd.command === command ? { ...cmd, enabled } : cmd
      ));
    } catch (error) {
      console.error('Failed to toggle command:', error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>System Commands</h2>
        <div style={{ color: '#aaa' }}>Loading commands...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>System Commands</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Built-in commands provided by Stream Mesh. Toggle to enable/disable each command.
      </div>
      
      {commands.length === 0 ? (
        <div style={{ 
          background: '#2a2a2a', 
          border: '1px solid #444',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          color: '#aaa'
        }}>
          No system commands available.
        </div>
      ) : (
        <table style={{ 
          width: '100%', 
          background: '#23272b', 
          borderRadius: 8, 
          borderCollapse: 'collapse',
          overflow: 'hidden'
        }}>
          <thead style={{ background: '#181c20' }}>
            <tr>
              <th style={{ 
                padding: '16px', 
                textAlign: 'left', 
                color: '#fff', 
                fontWeight: 'bold',
                borderBottom: '1px solid #444'
              }}>
                Command
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'left', 
                color: '#fff', 
                fontWeight: 'bold',
                borderBottom: '1px solid #444'
              }}>
                Description
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#fff', 
                fontWeight: 'bold',
                borderBottom: '1px solid #444',
                width: '120px'
              }}>
                Enabled
              </th>
            </tr>
          </thead>
          <tbody>
            {commands.map((command, index) => (
              <tr key={command.command} style={{ 
                borderBottom: index < commands.length - 1 ? '1px solid #333' : 'none'
              }}>
                <td style={{ 
                  padding: '16px', 
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {command.command}
                </td>
                <td style={{ 
                  padding: '16px', 
                  color: '#ccc',
                  fontSize: '14px'
                }}>
                  {command.description}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: saving === command.command ? 'not-allowed' : 'pointer',
                    opacity: saving === command.command ? 0.6 : 1
                  }}>
                    <input 
                      type="checkbox" 
                      checked={command.enabled}
                      disabled={saving === command.command}
                      onChange={(e) => toggleCommand(command.command, e.target.checked)}
                      style={{ cursor: 'inherit' }}
                    />
                    {saving === command.command && (
                      <span style={{ fontSize: '12px', color: '#aaa' }}>Saving...</span>
                    )}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Info section */}
      <div style={{ 
        marginTop: 24, 
        padding: 16, 
        background: '#2a2a2a', 
        borderRadius: 8, 
        border: '1px solid #444' 
      }}>
        <h3 style={{ color: '#3a8dde', marginBottom: 8, fontSize: '16px' }}>💡 How System Commands Work</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#aaa', fontSize: '14px' }}>
          <li>Commands are triggered when viewers type them in chat</li>
          <li>Responses are automatically sent back to the same chat</li>
          <li>Only enabled commands will respond to chat messages</li>
          <li>Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemCommands;
