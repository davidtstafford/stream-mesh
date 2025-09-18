import React, { useState, useEffect } from 'react';

const navItems = [
  { label: 'Link to Streams', key: 'link', icon: '🔗' },
  { label: 'Events', key: 'events', icon: '📊' },
  { label: 'Games', key: 'games', icon: '🎲' },
];
const adminItems = [
  { label: 'Event History', key: 'eventHistory', icon: '📜' },
  { label: 'Events Admin', key: 'eventsAdmin', icon: '⚙️' },
  { label: 'OBS', key: 'obs', icon: '📹' },
  { label: 'Preferences', key: 'preferences', icon: '🔧' },
  { label: 'TTS', key: 'tts', icon: '🔊' },
  { label: 'Viewers', key: 'viewers', icon: '👥' },
];

const commandItems = [
  { label: 'System Commands', key: 'systemCommands', icon: '🤖' },
  { label: 'Custom Commands', key: 'customCommands', icon: '✨' },
];
const TestingSimulationItems = [
  { label: 'Event Simulator', key: 'developer', icon: '🎮' },
];

const NavigationBar: React.FC<{ 
  active: string, 
  onNavigate: (key: string) => void,
  onCollapseChange?: (isCollapsed: boolean) => void 
}> = ({ active, onNavigate, onCollapseChange }) => {
  const [adminOpen, setAdminOpen] = useState(true);
  const [commandsOpen, setCommandsOpen] = useState(true);
  const [TestingSimulationOpen, setTestingSimulationOpen] = useState(true);
  
  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('nav-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('nav-collapsed', JSON.stringify(isCollapsed));
    // Notify parent component of collapse state change
    onCollapseChange?.(isCollapsed);
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('nav-collapse-change', { 
      detail: { isCollapsed } 
    }));
  }, [isCollapsed, onCollapseChange]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <nav style={{ 
      width: isCollapsed ? 60 : 240, 
      background: '#181c20', 
      color: '#fff', 
      height: '100vh', 
      fontFamily: 'sans-serif', 
      fontWeight: 'bold', 
      fontSize: 16,
      transition: 'width 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        style={{
          position: 'absolute',
          top: '50%',
          right: isCollapsed ? '-12px' : '-12px',
          transform: 'translateY(-50%)',
          width: 24,
          height: 40,
          background: '#181c20',
          border: '1px solid #333',
          borderRadius: '0 8px 8px 0',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 'bold',
          zIndex: 10,
          transition: 'all 0.2s ease'
        }}
        title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        {isCollapsed ? '>' : '<'}
      </button>

      <div style={{ 
        textAlign: 'center', 
        fontSize: isCollapsed ? 16 : 22, 
        padding: isCollapsed ? '24px 8px' : '24px 0', 
        borderBottom: '1px solid #333',
        transition: 'all 0.3s ease'
      }}>
        {isCollapsed ? 'SM' : 'Stream Mesh'}
      </div>
      
      <div style={{ overflowY: 'auto', height: 'calc(100vh - 80px)' }}>
        {navItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ 
              padding: isCollapsed ? '16px 8px' : '16px 24px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? 0 : 12,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}
            title={isCollapsed ? item.label : undefined}
          >
            <span style={{ fontSize: isCollapsed ? 18 : 16 }}>{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </div>
        ))}

        <div 
          onClick={() => !isCollapsed && setAdminOpen(o => !o)} 
          style={{ 
            padding: isCollapsed ? '16px 8px' : '16px 24px', 
            cursor: 'pointer', 
            background: '#222', 
            borderTop: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: isCollapsed ? 0 : 12
          }}
          title={isCollapsed ? 'Admin' : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 12 }}>
            <span style={{ fontSize: isCollapsed ? 18 : 16 }}>⚙️</span>
            {!isCollapsed && <span>Admin</span>}
          </div>
          {!isCollapsed && <span>{adminOpen ? '▼' : '▶'}</span>}
        </div>
        
        {adminOpen && !isCollapsed && adminItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ 
              padding: '12px 40px', 
              cursor: 'pointer', 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div 
          onClick={() => !isCollapsed && setCommandsOpen(o => !o)} 
          style={{ 
            padding: isCollapsed ? '16px 8px' : '16px 24px', 
            cursor: 'pointer', 
            background: '#222', 
            borderTop: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: isCollapsed ? 0 : 12
          }}
          title={isCollapsed ? 'Commands' : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 12 }}>
            <span style={{ fontSize: isCollapsed ? 18 : 16 }}>💬</span>
            {!isCollapsed && <span>Commands</span>}
          </div>
          {!isCollapsed && <span>{commandsOpen ? '▼' : '▶'}</span>}
        </div>
        
        {commandsOpen && !isCollapsed && commandItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ 
              padding: '12px 40px', 
              cursor: 'pointer', 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div 
          onClick={() => !isCollapsed && setTestingSimulationOpen(o => !o)} 
          style={{ 
            padding: isCollapsed ? '16px 8px' : '16px 24px', 
            cursor: 'pointer', 
            background: '#222', 
            borderTop: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: isCollapsed ? 0 : 12
          }}
          title={isCollapsed ? 'Testing & Simulation' : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 12 }}>
            <span style={{ fontSize: isCollapsed ? 18 : 16 }}>🧪</span>
            {!isCollapsed && <span>Testing & Simulation</span>}
          </div>
          {!isCollapsed && <span>{TestingSimulationOpen ? '▼' : '▶'}</span>}
        </div>
        
        {TestingSimulationOpen && !isCollapsed && TestingSimulationItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ 
              padding: '12px 40px', 
              cursor: 'pointer', 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;
