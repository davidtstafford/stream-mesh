import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import NavigationBar from './navigation/NavigationBar';
import LinkToStreams from './screens/LinkToStreams';
import Preferences from './screens/Preferences';
import TTS from './screens/TTS';
import Viewers from './screens/Viewers';
import SystemCommands from './screens/SystemCommands';
import CustomCommands from './screens/CustomCommands';
import OBS from './screens/OBS/OBS';
import Events from './screens/Events';
import EventsAdmin from './screens/EventsAdmin';
import EventHistory from './screens/EventHistory';
import Developer from './screens/Developer';
import EventWindow from './components/EventWindow';
import './theme/theme.css';

const screenMap: Record<string, React.ReactNode> = {
  link: <LinkToStreams />, 
  preferences: <Preferences />, 
  tts: <TTS />, 
  viewers: <Viewers />, 
  systemCommands: <SystemCommands />, 
  customCommands: <CustomCommands />, 
  obs: <OBS />,
  events: <Events />,
  eventsAdmin: <EventsAdmin />,
  eventHistory: <EventHistory />,
  developer: <Developer />,
};

const App: React.FC = () => {
  const [active, setActive] = useState('link');
  const [isEventWindow, setIsEventWindow] = useState(false);
  const [eventWindowId, setEventWindowId] = useState('');
  const [eventWindowConfig, setEventWindowConfig] = useState({});
  const [navCollapsed, setNavCollapsed] = useState(() => {
    // Initialize with the same logic as NavigationBar
    const saved = localStorage.getItem('nav-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Check if this is an event window based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const windowId = urlParams.get('eventWindow');
    const config = urlParams.get('config');
    
    if (windowId) {
      setIsEventWindow(true);
      setEventWindowId(windowId);
      if (config) {
        try {
          setEventWindowConfig(JSON.parse(decodeURIComponent(config)));
        } catch (e) {
          console.error('Failed to parse event window config:', e);
        }
      }
    }
  }, []);

  // If this is an event window, render the standalone EventWindow component
  if (isEventWindow) {
    return (
      <ThemeProvider>
        <EventWindow 
          windowId={eventWindowId} 
          initialConfig={eventWindowConfig}
          isStandalone={true}
        />
      </ThemeProvider>
    );
  }

  // Normal app render
  return (
    <ThemeProvider>
      <div style={{ display: 'flex', height: '100vh', background: '#222' }}>
        <NavigationBar 
          active={active} 
          onNavigate={setActive}
          onCollapseChange={setNavCollapsed}
        />
        <main style={{ 
          flex: 1, 
          padding: navCollapsed ? '32px 48px' : '32px', 
          overflow: 'auto',
          transition: 'padding 0.3s ease',
          width: navCollapsed ? 'calc(100vw - 60px)' : 'calc(100vw - 240px)'
        }}>
          {screenMap[active]}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
