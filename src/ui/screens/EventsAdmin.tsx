import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface EventConfig {
  type: string;
  enabled: boolean;
  showInEvents: boolean;
  color: string;
  displayName: string;
}

interface PlatformEventConfigs {
  platform: string;
  displayName: string;
  events: EventConfig[];
}

interface WindowPreset {
  id: string;
  name: string;
  eventTypes: string[];
  width: number;
  height: number;
  alwaysOnTop: boolean;
}

const defaultPlatformConfigs: PlatformEventConfigs[] = [
  {
    platform: 'general',
    displayName: 'General',
    events: [
      { type: 'chat', enabled: true, showInEvents: true, color: '#3a8dde', displayName: 'Chat Messages' },
    ]
  },
  {
    platform: 'twitch',
    displayName: 'Twitch',
    events: [
      { type: 'subscription', enabled: true, showInEvents: true, color: '#9147ff', displayName: 'New Subscriptions' },
      { type: 'resub', enabled: true, showInEvents: true, color: '#7b68ee', displayName: 'Resubscriptions' },
      { type: 'subgift', enabled: true, showInEvents: true, color: '#ff6b6b', displayName: 'Gifted Subs' },
      { type: 'cheer', enabled: true, showInEvents: true, color: '#ffd700', displayName: 'Bit Cheers' },
      { type: 'hosted', enabled: true, showInEvents: true, color: '#ff7f50', displayName: 'Hosts' },
      { type: 'raided', enabled: true, showInEvents: true, color: '#ff4500', displayName: 'Raids' },
      { type: 'redeem', enabled: true, showInEvents: true, color: '#00ff88', displayName: 'Channel Point Redemptions' },
    ]
  }
];

const EventsAdmin: React.FC = () => {
  const [platformConfigs, setPlatformConfigs] = useState<PlatformEventConfigs[]>(defaultPlatformConfigs);
  const [windowPresets, setWindowPresets] = useState<WindowPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { getResponsiveContainerStyle } = useResponsiveLayout();
  const [newPreset, setNewPreset] = useState<Partial<WindowPreset>>({
    name: '',
    eventTypes: [],
    width: 800,
    height: 600,
    alwaysOnTop: false
  });

  // Get all available event types
  const allEventTypes = defaultPlatformConfigs.flatMap(platform => 
    platform.events.map(config => ({
      type: config.type,
      displayName: config.displayName
    }))
  );

  // Load configurations
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const savedConfigs = await window.electron.ipcRenderer.invoke('eventConfig:load');
        
        if (savedConfigs && Object.keys(savedConfigs).length > 0) {
          // Extract window presets and event configs
          const { windowPresets: savedPresets, ...eventConfigs } = savedConfigs;
          
          // Load window presets
          if (savedPresets && Array.isArray(savedPresets)) {
            setWindowPresets(savedPresets);
          }
          
          // Load event configs
          const mergedPlatformConfigs = defaultPlatformConfigs.map(platformConfig => ({
            ...platformConfig,
            events: platformConfig.events.map(eventConfig => {
              const savedConfig = eventConfigs[eventConfig.type];
              return savedConfig ? { ...eventConfig, ...savedConfig } : eventConfig;
            })
          }));
          setPlatformConfigs(mergedPlatformConfigs);
        }
      } catch (error) {
        console.error('Failed to load configurations:', error);
      }
    };
    loadConfigs();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Convert platform configs back to flat structure
      const configsObject = platformConfigs.reduce((acc, platform) => {
        platform.events.forEach(config => {
          acc[config.type] = {
            type: config.type,
            enabled: config.enabled,
            showInEvents: config.showInEvents,
            color: config.color,
            displayName: config.displayName
          };
        });
        return acc;
      }, {} as Record<string, any>);

      // Add window presets
      configsObject.windowPresets = windowPresets;

      await window.electron.ipcRenderer.invoke('eventConfig:save', configsObject);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
    setLoading(false);
  };

  // Handle updating individual event configs
  const updateEventConfig = (platformIndex: number, eventIndex: number, field: keyof EventConfig, value: any) => {
    setPlatformConfigs(prev => prev.map((platform, pIdx) => 
      pIdx === platformIndex 
        ? {
            ...platform,
            events: platform.events.map((config, eIdx) => 
              eIdx === eventIndex ? { ...config, [field]: value } : config
            )
          }
        : platform
    ));
    setSaved(false);
  };

  // Window preset functions
  const addWindowPreset = () => {
    if (!newPreset.name || !newPreset.eventTypes || newPreset.eventTypes.length === 0) {
      alert('Please enter a name and select at least one event type');
      return;
    }

    const preset: WindowPreset = {
      id: Date.now().toString(),
      name: newPreset.name,
      eventTypes: newPreset.eventTypes,
      width: newPreset.width || 800,
      height: newPreset.height || 600,
      alwaysOnTop: newPreset.alwaysOnTop || false
    };

    setWindowPresets(prev => [...prev, preset]);
    setNewPreset({
      name: '',
      eventTypes: [],
      width: 800,
      height: 600,
      alwaysOnTop: false
    });
    setSaved(false);
  };

  const deleteWindowPreset = (id: string) => {
    setWindowPresets(prev => prev.filter(preset => preset.id !== id));
    setSaved(false);
  };

  const toggleEventTypeInNewPreset = (eventType: string) => {
    setNewPreset(prev => ({
      ...prev,
      eventTypes: prev.eventTypes?.includes(eventType)
        ? prev.eventTypes.filter(type => type !== eventType)
        : [...(prev.eventTypes || []), eventType]
    }));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: 'var(--text-color, #fff)', padding: 20 }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Events Administration</h2>
      
      <p style={{ color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
        Configure event settings, colors, and display options. Create custom popup window presets for monitoring specific events.
      </p>

      {/* Event Configuration Section */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ 
          fontWeight: 'bold', 
          marginBottom: 24, 
          fontSize: '1.2em',
          paddingBottom: 8,
          borderBottom: '2px solid #444'
        }}>
          Event Configuration
        </h3>
        
        {platformConfigs.map((platformConfig, platformIndex) => (
          <div 
            key={platformConfig.platform}
            style={{ 
              marginBottom: 32,
              background: '#2a2a2a',
              padding: 24,
              borderRadius: 8,
              border: '1px solid #444'
            }}
          >
            <h4 style={{ 
              marginBottom: 16, 
              color: '#ffd700',
              fontSize: '1.1em'
            }}>
              {platformConfig.displayName} Events
            </h4>
            
            <div style={{ display: 'grid', gap: 16 }}>
              {platformConfig.events.map((config, eventIndex) => (
                <div 
                  key={config.type}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.8fr 120px 140px 100px 120px',
                    gap: 16,
                    alignItems: 'center',
                    padding: 16,
                    background: '#333',
                    borderRadius: 8,
                    border: '1px solid #555'
                  }}
                >
                  <div>
                    <input
                      type="text"
                      value={config.displayName}
                      onChange={(e) => updateEventConfig(platformIndex, eventIndex, 'displayName', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#444',
                        color: '#fff',
                        border: '1px solid #666',
                        padding: '8px 7px',
                        borderRadius: 4,
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ fontSize: '0.8em', color: '#aaa', marginTop: 4 }}>
                      {config.type}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 4,
                      cursor: 'pointer'
                    }}>
                      <span style={{ fontSize: '0.8em', color: '#aaa' }}>Enabled</span>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateEventConfig(platformIndex, eventIndex, 'enabled', e.target.checked)}
                        style={{ 
                          transform: 'scale(1.2)',
                          cursor: 'pointer'
                        }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 4,
                      cursor: 'pointer'
                    }}>
                      <span style={{ fontSize: '0.8em', color: '#aaa' }}>Show in Events</span>
                      <input
                        type="checkbox"
                        checked={config.showInEvents}
                        onChange={(e) => updateEventConfig(platformIndex, eventIndex, 'showInEvents', e.target.checked)}
                        style={{ 
                          transform: 'scale(1.2)',
                          cursor: 'pointer'
                        }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 4,
                      cursor: 'pointer'
                    }}>
                      <span style={{ fontSize: '0.8em', color: '#aaa' }}>Color</span>
                      <input
                        type="color"
                        value={config.color}
                        onChange={(e) => updateEventConfig(platformIndex, eventIndex, 'color', e.target.value)}
                        style={{
                          width: 40,
                          height: 30,
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: config.color
                        }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    backgroundColor: config.color, 
                    borderRadius: '50%',
                    margin: '0 auto',
                    border: '2px solid #666'
                  }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Window Presets Section */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ 
          fontWeight: 'bold', 
          marginBottom: 24, 
          fontSize: '1.2em',
          paddingBottom: 8,
          borderBottom: '2px solid #444'
        }}>
          Event Window Presets
        </h3>

        {/* New Preset Form */}
        <div style={{ 
          background: '#2a2a2a', 
          padding: 24, 
          borderRadius: 8, 
          border: '1px solid #444',
          marginBottom: 24
        }}>
          <h4 style={{ marginBottom: 16, color: '#ffd700' }}>Create New Window Preset</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Preset Name</label>
              <input
                type="text"
                value={newPreset.name || ''}
                onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Subs & Cheers"
                style={{
                  width: '100%',
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '8px 12px',
                  borderRadius: 4,
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Width</label>
                <input
                  type="number"
                  value={newPreset.width || 800}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                  min="400"
                  style={{
                    width: '100%',
                    background: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Height</label>
                <input
                  type="number"
                  value={newPreset.height || 600}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                  min="300"
                  style={{
                    width: '100%',
                    background: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Always on Top</label>
                <input
                  type="checkbox"
                  checked={newPreset.alwaysOnTop || false}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, alwaysOnTop: e.target.checked }))}
                  style={{ 
                    transform: 'scale(1.2)', 
                    marginTop: 8,
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 'bold' }}>Select Event Types</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 8 
            }}>
              {allEventTypes.map(eventType => (
                <label 
                  key={eventType.type}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '8px 12px',
                    background: newPreset.eventTypes?.includes(eventType.type) ? '#444' : '#333',
                    borderRadius: 4,
                    cursor: 'pointer',
                    border: newPreset.eventTypes?.includes(eventType.type) ? '1px solid #666' : '1px solid #555'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newPreset.eventTypes?.includes(eventType.type) || false}
                    onChange={() => toggleEventTypeInNewPreset(eventType.type)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{eventType.displayName}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={addWindowPreset}
            style={{
              background: '#00ff88',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Add Preset
          </button>
        </div>

        {/* Existing Presets */}
        {windowPresets.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 16 }}>Existing Window Presets</h4>
            <div style={{ display: 'grid', gap: 16 }}>
              {windowPresets.map(preset => (
                <div 
                  key={preset.id}
                  style={{
                    background: '#2a2a2a',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h5 style={{ margin: '0 0 8px 0', color: '#ffd700' }}>{preset.name}</h5>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9em' }}>
                      Events: {preset.eventTypes.map(type => 
                        allEventTypes.find(et => et.type === type)?.displayName || type
                      ).join(', ')}
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.8em' }}>
                      Size: {preset.width}×{preset.height}
                      {preset.alwaysOnTop && ' • Always on Top'}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWindowPreset(preset.id)}
                    style={{
                      background: '#ff4444',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
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
        
        <button 
          onClick={() => { setPlatformConfigs(defaultPlatformConfigs); setWindowPresets([]); setSaved(false); }}
          disabled={loading}
          style={{
            background: '#ff6b6b',
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
      </div>

      {/* Help Section */}
      <div style={{ marginTop: 32, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
        <h3 style={{ marginBottom: 12, color: '#ffd700' }}>ℹ️ How to Use</h3>
        <ul style={{ color: '#aaa', lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
          <li><strong>Event Configuration:</strong> Enable/disable events, customize colors and display names</li>
          <li><strong>Window Presets:</strong> Create custom popup windows with specific event filters</li>
          <li><strong>Preset Name:</strong> The name that will appear as a button on the Events screen</li>
          <li><strong>Event Types:</strong> Select which events will be shown in popup windows</li>
          <li>After creating presets, go to the Events screen to see your custom buttons</li>
        </ul>
      </div>
    </div>
  );
};

export default EventsAdmin;
