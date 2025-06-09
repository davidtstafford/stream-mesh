import React, { useState } from 'react';

const navItems = [
  { label: 'Link to Streams', key: 'link' },
  { label: 'Events', key: 'events' },
];
const adminItems = [
  { label: 'Event History', key: 'eventHistory' },
  { label: 'Events Admin', key: 'eventsAdmin' },
  { label: 'OBS', key: 'obs' },
  { label: 'Preferences', key: 'preferences' },
  { label: 'TTS', key: 'tts' },
  { label: 'Viewers', key: 'viewers' },
];

const commandItems = [
  { label: 'System Commands', key: 'systemCommands' },
  { label: 'Custom Commands', key: 'customCommands' },
];
const TestingSimulationItems = [
  { label: 'Event Simulator', key: 'TestingSimulation' },
  { label: 'Twitch Events', key: 'TestingSimulationTwitch' },
];

const NavigationBar: React.FC<{ active: string, onNavigate: (key: string) => void }> = ({ active, onNavigate }) => {
  const [adminOpen, setAdminOpen] = useState(true);
  const [commandsOpen, setCommandsOpen] = useState(true);
  const [TestingSimulationOpen, setTestingSimulationOpen] = useState(true);
  return (
    <nav style={{ width: 240, background: '#181c20', color: '#fff', height: '100vh', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 16 }}>
      <div style={{ textAlign: 'center', fontSize: 22, padding: '24px 0', borderBottom: '1px solid #333' }}>
        Stream Mesh
      </div>
      <div>
        {navItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ padding: '16px 24px', cursor: 'pointer' }}
          >
            {item.label}
          </div>
        ))}
        <div onClick={() => setAdminOpen(o => !o)} style={{ padding: '16px 24px', cursor: 'pointer', background: '#222', borderTop: '1px solid #333' }}>Admin {adminOpen ? '▼' : '▶'}</div>
        {adminOpen && adminItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ padding: '12px 40px', cursor: 'pointer', fontWeight: 500 }}
          >
            {item.label}
          </div>
        ))}
        <div onClick={() => setCommandsOpen(o => !o)} style={{ padding: '16px 24px', cursor: 'pointer', background: '#222', borderTop: '1px solid #333' }}>Commands {commandsOpen ? '▼' : '▶'}</div>
        {commandsOpen && commandItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ padding: '12px 40px', cursor: 'pointer', fontWeight: 500 }}
          >
            {item.label}
          </div>
        ))}
        <div onClick={() => setTestingSimulationOpen(o => !o)} style={{ padding: '16px 24px', cursor: 'pointer', background: '#222', borderTop: '1px solid #333' }}>Testing & Simulation  {TestingSimulationOpen ? '▼' : '▶'}</div>
        {TestingSimulationOpen && TestingSimulationItems.map(item => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={active === item.key ? 'active-nav' : ''}
            style={{ padding: '12px 40px', cursor: 'pointer', fontWeight: 500 }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;
