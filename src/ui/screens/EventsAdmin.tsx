import React, { useState, useEffect } from 'react';

interface EventConfig {
  type: string;
  enabled: boolean;
  showInEvents: boolean;
  color: string;
  displayName: string;
}

const defaultEventConfigs: EventConfig[] = [
  { type: 'chat', enabled: true, showInEvents: true, color: '#3a8dde', displayName: 'Chat Messages' },
  { type: 'subscription', enabled: true, showInEvents: true, color: '#9147ff', displayName: 'New Subscriptions' },
  { type: 'resub', enabled: true, showInEvents: true, color: '#7b68ee', displayName: 'Resubscriptions' },
  { type: 'subgift', enabled: true, showInEvents: true, color: '#ff6b6b', displayName: 'Gifted Subs' },
  { type: 'cheer', enabled: true, showInEvents: true, color: '#ffd700', displayName: 'Bit Cheers' },
  { type: 'hosted', enabled: true, showInEvents: true, color: '#ff7f50', displayName: 'Hosts' },
  { type: 'raided', enabled: true, showInEvents: true, color: '#ff4500', displayName: 'Raids' },
];

const EventsAdmin: React.FC = () => {
  const [configs, setConfigs] = useState<EventConfig[]>(defaultEventConfigs);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load event configurations
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const savedConfigs = await window.electron.ipcRenderer.invoke('eventConfig:load');
        // Merge saved configs with defaults
        const mergedConfigs = defaultEventConfigs.map(defaultConfig => {
          const savedConfig = savedConfigs[defaultConfig.type];
          return savedConfig ? { ...defaultConfig, ...savedConfig } : defaultConfig;
        });
        setConfigs(mergedConfigs);
      } catch (error) {
        console.error('Failed to load event configurations:', error);
        // Fall back to defaults
        setConfigs(defaultEventConfigs);
      }
    };
    loadConfigs();
  }, []);

  const updateConfig = (type: string, field: keyof EventConfig, value: boolean | string) => {
    setConfigs(prev => prev.map(config => 
      config.type === type ? { ...config, [field]: value } : config
    ));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Convert configs array to object format for backend
      const configsObject = configs.reduce((acc, config) => {
        acc[config.type] = {
          enabled: config.enabled,
          showInEvents: config.showInEvents,
          color: config.color,
          displayName: config.displayName
        };
        return acc;
      }, {} as Record<string, any>);
      
      await window.electron.ipcRenderer.invoke('eventConfig:save', configsObject);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save event configurations:', error);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setConfigs(defaultEventConfigs);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: 24 }}>⚙️ Events Administration</h2>
      
      <p style={{ color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
        Configure which event types are captured from Twitch and how they appear in the Events screen.
        Changes will be applied immediately after saving.
      </p>

      <table style={{ 
        width: '100%', 
        background: '#2a2a2a', 
        borderRadius: 8, 
        borderCollapse: 'collapse',
        marginBottom: 24,
        border: '1px solid #444'
      }}>
        <thead style={{ background: '#333' }}>
          <tr>
            <th style={{ padding: 16, textAlign: 'left', color: '#ffd700' }}>Event Type</th>
            <th style={{ padding: 16, textAlign: 'center', color: '#ffd700' }}>Enabled</th>
            <th style={{ padding: 16, textAlign: 'center', color: '#ffd700' }}>Show in Events</th>
            <th style={{ padding: 16, textAlign: 'center', color: '#ffd700' }}>Display Color</th>
            <th style={{ padding: 16, textAlign: 'left', color: '#ffd700' }}>Display Name</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config, index) => (
            <tr key={config.type} style={{ 
              borderTop: index > 0 ? '1px solid #444' : 'none',
              opacity: config.enabled ? 1 : 0.6
            }}>
              <td style={{ padding: 16, fontWeight: 'bold', color: config.color }}>
                {config.type}
              </td>
              <td style={{ padding: 16, textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={config.enabled}
                  onChange={(e) => updateConfig(config.type, 'enabled', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </td>
              <td style={{ padding: 16, textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={config.showInEvents}
                  onChange={(e) => updateConfig(config.type, 'showInEvents', e.target.checked)}
                  disabled={!config.enabled}
                  style={{ transform: 'scale(1.2)' }}
                />
              </td>
              <td style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={config.color}
                    onChange={(e) => updateConfig(config.type, 'color', e.target.value)}
                    disabled={!config.enabled}
                    style={{ marginRight: 8, width: 40, height: 30 }}
                  />
                  <span style={{ color: config.color, fontWeight: 'bold' }}>{config.color}</span>
                </div>
              </td>
              <td style={{ padding: 16 }}>
                <input 
                  type="text" 
                  value={config.displayName}
                  onChange={(e) => updateConfig(config.type, 'displayName', e.target.value)}
                  disabled={!config.enabled}
                  style={{
                    background: '#333',
                    border: '1px solid #555',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 4,
                    width: '100%',
                    fontFamily: 'inherit'
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 16 }}>
        <button 
          onClick={handleReset}
          disabled={loading}
          style={{
            background: '#666',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          Reset to Defaults
        </button>
        
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{
            background: saved ? '#2ecc40' : '#3a8dde',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
        <h3 style={{ marginBottom: 12, color: '#ffd700' }}>ℹ️ Configuration Guide</h3>
        <ul style={{ color: '#aaa', lineHeight: 1.6 }}>
          <li><strong>Enabled:</strong> Whether this event type is captured from Twitch</li>
          <li><strong>Show in Events:</strong> Whether this event appears in the main Events screen</li>
          <li><strong>Display Color:</strong> Color used for this event type in the Events screen</li>
          <li><strong>Display Name:</strong> Custom name shown in the Events screen</li>
        </ul>
      </div>
    </div>
  );
};

export default EventsAdmin;
