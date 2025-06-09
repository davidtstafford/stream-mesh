import React, { useState } from 'react';
import EventWindow from '../components/EventWindow';

const Events: React.FC = () => {
  const [windowCounter, setWindowCounter] = useState(1);

  // Create a new detached event window
  const createNewEventWindow = async () => {
    const windowId = `event-window-${windowCounter}`;
    
    try {
      const result = await window.electron.ipcRenderer.invoke('eventWindow:create', windowId, {
        title: `Event Monitor ${windowCounter}`,
        width: 800,
        height: 600,
        alwaysOnTop: false
      });

      if (result.success) {
        console.log('Created new event window:', windowId);
        setWindowCounter(prev => prev + 1);
      } else {
        console.error('Failed to create event window:', result.error);
      }
    } catch (error) {
      console.error('Error creating event window:', error);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: 'var(--text-color, #fff)', height: 'calc(100vh - 64px)' }}>
      {/* Header with New Window button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={createNewEventWindow}
          style={{
            background: 'linear-gradient(45deg, #00ff88, #00cc6a)',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 25,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
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
        >
          🪟 New Window
        </button>
      </div>

      {/* Main Events Display */}
      <EventWindow windowId="main" isStandalone={false} />
    </div>
  );
};

export default Events;
