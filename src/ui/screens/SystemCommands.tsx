import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface SystemCommand {
  command: string;
  enabled: boolean;
  description: string;
  permissionLevel: 'viewer' | 'moderator' | 'super_moderator';
  enableTTSReply: boolean;
  // Note: handler function is not included as it's not serializable for IPC
}

const SystemCommands: React.FC = () => {
  const [commands, setCommands] = useState<SystemCommand[]>([]);
  const [sortOption, setSortOption] = useState<'permission' | 'alphabetical'>('permission');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // Load commands on mount and when screen gains focus
  useEffect(() => {
    loadCommands();
    
    const handleFocus = () => {
      loadCommands();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadCommands = async () => {
    setLoading(true);
    setError(null);
    try {
      const systemCommands = await window.electron.ipcRenderer.invoke('commands:getSystemCommands');
      setCommands(systemCommands);
    } catch (error) {
      console.error('Failed to load system commands:', error);
      setError('Failed to load system commands. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic
  const getSortedCommands = () => {
    let filtered = commands.filter(cmd =>
      cmd.command.toLowerCase().includes(search.toLowerCase())
    );
    if (sortOption === 'alphabetical') {
      return filtered.slice().sort((a, b) => a.command.localeCompare(b.command));
    } else {
      // permission: viewer, moderator, super_moderator, then rest alphabetically
      const permOrder = { viewer: 0, moderator: 1, super_moderator: 2 };
      return filtered.slice().sort((a, b) => {
        const aPerm = permOrder[a.permissionLevel] ?? 99;
        const bPerm = permOrder[b.permissionLevel] ?? 99;
        if (aPerm !== bPerm) return aPerm - bPerm;
        return a.command.localeCompare(b.command);
      });
    }
  };

  const toggleCommand = async (command: string, enabled: boolean) => {
    setSaving(command);
    setError(null);
    try {
      await window.electron.ipcRenderer.invoke('commands:setEnabled', command, enabled);
      
      // Update local state
      setCommands(prev => prev.map(cmd => 
        cmd.command === command ? { ...cmd, enabled } : cmd
      ));
      
      setSuccessMessage(`${command} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle command:', error);
      setError(`Failed to ${enabled ? 'enable' : 'disable'} ${command}. Please try again.`);
    } finally {
      setSaving(null);
    }
  };

  const changePermissionLevel = async (command: string, permissionLevel: 'viewer' | 'moderator' | 'super_moderator') => {
    setSaving(command);
    setError(null);
    try {
      await window.electron.ipcRenderer.invoke('commands:setPermissionLevel', command, permissionLevel);
      
      // Update local state
      setCommands(prev => prev.map(cmd => 
        cmd.command === command ? { ...cmd, permissionLevel } : cmd
      ));
      
      setSuccessMessage(`${command} permission level set to ${permissionLevel}`);
    } catch (error) {
      console.error('Failed to change permission level:', error);
      setError(`Failed to change permission level for ${command}. Please try again.`);
    } finally {
      setSaving(null);
    }
  };

  const toggleTTSReply = async (command: string, enableTTSReply: boolean) => {
    setSaving(command);
    setError(null);
    try {
      await window.electron.ipcRenderer.invoke('commands:setTTSReply', command, enableTTSReply);
      
      // Update local state
      setCommands(prev => prev.map(cmd => 
        cmd.command === command ? { ...cmd, enableTTSReply } : cmd
      ));
      
      setSuccessMessage(`${command} TTS reply ${enableTTSReply ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle TTS reply:', error);
      setError(`Failed to toggle TTS reply for ${command}. Please try again.`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div style={{ ...getResponsiveContainerStyle(700), color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>System Commands</h2>
        <div style={{ color: '#aaa' }}>Loading commands...</div>
      </div>
    );
  }


  return (
    <div style={{ ...getResponsiveContainerStyle(700), color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontWeight: 'bold', margin: 0 }}>System Commands</h2>
        <button
          onClick={loadCommands}
          disabled={loading}
          style={{
            background: loading ? '#555' : '#3a8dde',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '🔄' : '🔄 Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #444',
              background: '#23272b',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        <div>
          <label style={{ color: '#aaa', marginRight: 8 }}>Sort by:</label>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value as 'permission' | 'alphabetical')}
            style={{
              background: '#23272b',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="permission">Permission Level</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Built-in commands provided by Stream Mesh. Toggle to enable/disable each command.
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#dc3545',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{
          background: '#28a745',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: '14px'
        }}>
          ✅ {successMessage}
        </div>
      )}
      
      {getSortedCommands().length === 0 ? (
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
                width: '160px'
              }}>
                Permission Level
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#fff', 
                fontWeight: 'bold',
                borderBottom: '1px solid #444',
                width: '120px'
              }}>
                TTS Reply
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
            {getSortedCommands().map((command, index) => (
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
                  <select
                    value={command.permissionLevel}
                    onChange={(e) => changePermissionLevel(command.command, e.target.value as 'viewer' | 'moderator' | 'super_moderator')}
                    disabled={saving === command.command}
                    style={{
                      background: '#333',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: 4,
                      padding: '6px 12px',
                      fontSize: '14px',
                      cursor: saving === command.command ? 'not-allowed' : 'pointer',
                      opacity: saving === command.command ? 0.6 : 1
                    }}
                  >
                    <option value="viewer">👤 Viewer</option>
                    <option value="moderator">🛡️ Moderator</option>
                    <option value="super_moderator">⭐ Super Moderator</option>
                  </select>
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
                      checked={command.enableTTSReply}
                      disabled={saving === command.command}
                      onChange={(e) => toggleTTSReply(command.command, e.target.checked)}
                      style={{ cursor: 'inherit' }}
                    />
                    <span style={{ fontSize: '12px', color: '#aaa' }}>
                      {command.enableTTSReply ? '🔊' : '🔇'}
                    </span>
                    {saving === command.command && (
                      <span style={{ fontSize: '12px', color: '#aaa' }}>Saving...</span>
                    )}
                  </label>
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
          <li><strong>Permission Levels:</strong></li>
          <li style={{ marginLeft: 20 }}>👤 <strong>Viewer:</strong> Anyone can use the command</li>
          <li style={{ marginLeft: 20 }}>🛡️ <strong>Moderator:</strong> Only moderators and super moderators can use</li>
          <li style={{ marginLeft: 20 }}>⭐ <strong>Super Moderator:</strong> Only super moderators can use</li>
          <li><strong>TTS Reply:</strong> Controls whether command responses are read aloud by Text-to-Speech</li>
          <li style={{ marginLeft: 20 }}>🔊 When enabled, bot responses will be read by TTS</li>
          <li style={{ marginLeft: 20 }}>🔇 When disabled, responses are sent silently to prevent TTS spam</li>
          <li>User roles can be managed in the Viewers screen</li>
          <li>Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemCommands;
