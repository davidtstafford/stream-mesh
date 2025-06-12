import React, { useState, useEffect } from 'react';
import EventWindow from '../components/EventWindow';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface WindowPreset {
  id: string;
  name: string;
  eventTypes: string[];
  width: number;
  height: number;
  alwaysOnTop: boolean;
}

const Events: React.FC = () => {
  const [windowCounter, setWindowCounter] = useState(1);
  const [windowPresets, setWindowPresets] = useState<WindowPreset[]>([]);
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // Load window presets
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const savedConfigs = await window.electron.ipcRenderer.invoke('eventConfig:load');
        if (savedConfigs?.windowPresets && Array.isArray(savedConfigs.windowPresets)) {
          setWindowPresets(savedConfigs.windowPresets);
        }
      } catch (error) {
        console.error('Failed to load window presets:', error);
      }
    };
    loadPresets();
  }, []);

  // Create a generic detached event window
  const createGenericEventWindow = async () => {
    const windowId = `event-window-${windowCounter}`;
    
    try {
      const result = await window.electron.ipcRenderer.invoke('eventWindow:create', windowId, {
        title: 'Live Events',
        width: 800,
        height: 600,
        alwaysOnTop: false,
        selectedTypes: [] // Will show all events
      });

      if (result.success) {
        console.log('Created generic event window:', windowId);
        setWindowCounter(prev => prev + 1);
      } else {
        console.error('Failed to create generic event window:', result.error);
      }
    } catch (error) {
      console.error('Error creating generic event window:', error);
    }
  };

  // Create a new detached event window from preset
  const createPresetEventWindow = async (preset: WindowPreset) => {
    const windowId = `${preset.name.toLowerCase().replace(/\s+/g, '-')}-${windowCounter}`;
    
    try {
      const result = await window.electron.ipcRenderer.invoke('eventWindow:create', windowId, {
        title: preset.name,
        width: preset.width,
        height: preset.height,
        alwaysOnTop: preset.alwaysOnTop,
        selectedTypes: preset.eventTypes,
        customTitle: preset.name  // Pass the preset name as custom title
      });

      if (result.success) {
        console.log('Created preset event window:', windowId);
        setWindowCounter(prev => prev + 1);
      } else {
        console.error('Failed to create preset event window:', result.error);
      }
    } catch (error) {
      console.error('Error creating preset event window:', error);
    }
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(1200), color: 'var(--text-color, #fff)', height: 'calc(100vh - 64px)' }}>
      {/* Header with Window Preset buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontWeight: 'bold', margin: 0 }}>Events</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {windowPresets.length === 0 ? (
            <div style={{ 
              color: '#aaa', 
              fontSize: '0.9em',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0 }}>No window presets configured.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8em' }}>
                Go to Events Admin to create popup window presets.
              </p>
            </div>
          ) : (
            <>
              <span style={{ color: '#aaa', fontSize: '0.9em', marginRight: 8 }}>Open Window:</span>
              <button
                onClick={createGenericEventWindow}
                style={{
                  background: 'linear-gradient(45deg, #3a8dde, #2a6db8)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(58, 141, 222, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(58, 141, 222, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(58, 141, 222, 0.3)';
                }}
                title="Open a window showing all events"
              >
                🪟 All Events
              </button>
              {windowPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => createPresetEventWindow(preset)}
                  style={{
                    background: 'linear-gradient(45deg, #00ff88, #00cc6a)',
                    color: '#000',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0, 255, 136, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 136, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 255, 136, 0.3)';
                  }}
                  title={`Events: ${preset.eventTypes.join(', ')}`}
                >
                  🪟 {preset.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Events Display */}
      <EventWindow windowId="main" isStandalone={false} />
    </div>
  );
};

export default Events;
