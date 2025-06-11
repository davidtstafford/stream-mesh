import React, { useState, useEffect, useRef } from 'react';

interface StreamEvent {
  type: string;
  platform: string;
  channel: string;
  user: string;
  message?: string;
  amount?: number;
  data?: any;
  time: string;
}

interface EventDisplayConfig {
  enabled: boolean;
  color: string;
  displayName: string;
}

interface PlatformEventGroup {
  platform: string;
  displayName: string;
  types: string[];
}

const platformGroups: PlatformEventGroup[] = [
  {
    platform: 'general',
    displayName: 'General',
    types: ['chat']
  },
  {
    platform: 'twitch',
    displayName: 'Twitch',
    types: ['subscription', 'resub', 'subgift', 'cheer', 'hosted', 'raided', 'redeem']
  }
];

const defaultConfigs: Record<string, EventDisplayConfig> = {
  chat: { enabled: true, color: '#3a8dde', displayName: 'Chat Messages' },
  subscription: { enabled: true, color: '#9147ff', displayName: 'New Subscriptions' },
  resub: { enabled: true, color: '#7b68ee', displayName: 'Resubscriptions' },
  subgift: { enabled: true, color: '#ff6b6b', displayName: 'Gifted Subs' },
  cheer: { enabled: true, color: '#ffd700', displayName: 'Bit Cheers' },
  hosted: { enabled: true, color: '#ff7f50', displayName: 'Hosts' },
  raided: { enabled: true, color: '#ff4500', displayName: 'Raids' },
  redeem: { enabled: true, color: '#00ff88', displayName: 'Channel Point Redemptions' },
};

interface EventWindowProps {
  windowId: string;
  initialConfig?: {
    selectedTypes?: string[];
    customTitle?: string;
    [key: string]: any;
  };
  isStandalone?: boolean;
}

const EventWindow: React.FC<EventWindowProps> = ({ windowId, initialConfig, isStandalone = false }) => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [displayConfigs, setDisplayConfigs] = useState(defaultConfigs);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [liveEventCount, setLiveEventCount] = useState(0);
  const [isToggleCollapsed, setIsToggleCollapsed] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Load saved toggle state from localStorage (with windowId prefix for isolation)
  const loadToggleState = () => {
    try {
      const saved = localStorage.getItem(`events-active-types-${windowId}`);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load toggle state:', error);
    }
    // If no saved state, use initial config or default to all types
    if (initialConfig?.selectedTypes) {
      return new Set(initialConfig.selectedTypes);
    }
    return new Set(Object.keys(defaultConfigs));
  };

  // Save toggle state to localStorage
  const saveToggleState = (activeTypes: Set<string>) => {
    try {
      localStorage.setItem(`events-active-types-${windowId}`, JSON.stringify(Array.from(activeTypes)));
    } catch (error) {
      console.error('Failed to save toggle state:', error);
    }
  };

  // Filter events to last 30 minutes
  const filterRecentEvents = (events: StreamEvent[]) => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return events.filter(event => new Date(event.time) >= thirtyMinutesAgo);
  };

  // Toggle event type
  const toggleEventType = (type: string) => {
    setActiveTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      saveToggleState(newSet);
      return newSet;
    });
  };

  // Load event configurations and set up real-time streaming
  useEffect(() => {
    console.log(`🟢 [EventWindow-${windowId}] Component mounted, setting up event listener`);
    
    // Load saved toggle state first
    const savedToggleState = loadToggleState();
    setActiveTypes(savedToggleState as Set<string>);

    // Load event display configurations
    const loadConfigs = async () => {
      try {
        const savedConfigs = await window.electron.ipcRenderer.invoke('eventConfig:load');
        if (savedConfigs && Object.keys(savedConfigs).length > 0) {
          const mergedConfigs = { ...defaultConfigs };
          Object.entries(savedConfigs).forEach(([type, config]: [string, any]) => {
            if (mergedConfigs[type]) {
              mergedConfigs[type] = { 
                ...mergedConfigs[type], 
                ...config,
                enabled: config.enabled && config.showInEvents 
              };
            }
          });
          setDisplayConfigs(mergedConfigs);
        } else {
          setDisplayConfigs(defaultConfigs);
        }
      } catch (error) {
        console.error('Failed to load event configurations:', error);
        setDisplayConfigs(defaultConfigs);
      }
    };

    // Load recent events from database
    const loadRecentEvents = async () => {
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const recentEvents = await window.electron.ipcRenderer.invoke('events:fetch', {
          limit: 100,
          orderBy: 'time',
          orderDirection: 'DESC',
          dateFrom: thirtyMinutesAgo
        });
        
        const formattedEvents: StreamEvent[] = recentEvents.map((event: any) => ({
          type: event.type,
          platform: event.platform,
          channel: event.channel,
          user: event.user,
          message: event.message,
          amount: event.amount,
          data: event.data ? JSON.parse(event.data) : undefined,
          time: event.time
        }));
        
        setEvents(filterRecentEvents(formattedEvents));
      } catch (error) {
        console.error('Failed to load recent events:', error);
      }
    };

    // Set up real-time event listener
    const handleLiveEvent = (event: any) => {
      console.log(`🔴 [EventWindow-${windowId}] Received live event:`, event.type, 'from', event.platform);
      
      setLiveEventCount(prev => prev + 1);
      
      const formattedEvent: StreamEvent = {
        type: event.type,
        platform: event.platform,
        channel: event.channel,
        user: event.user,
        message: event.message,
        amount: event.amount,
        data: event.data,
        time: event.time
      };
      
      setEvents(prev => {
        const updated = [formattedEvent, ...prev];
        const filtered = filterRecentEvents(updated).slice(0, 100);
        return filtered;
      });
    };

    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      setEvents(prev => filterRecentEvents(prev));
    }, 60000);

    // Clear any existing listeners before adding new one
    window.electron.ipcRenderer.removeAllListeners('events:live');
    console.log(`🔵 [EventWindow-${windowId}] Setting up IPC listener for events:live`);
    
    // Register listener for live events
    window.electron.ipcRenderer.on('events:live', handleLiveEvent);
    console.log(`🔵 [EventWindow-${windowId}] IPC listener registered successfully`);

    // WORKAROUND: Poll for new events every 2 seconds as fallback
    const pollInterval = setInterval(async () => {
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const recentEvents = await window.electron.ipcRenderer.invoke('events:fetch', {
          limit: 100,
          orderBy: 'time',
          orderDirection: 'DESC',
          dateFrom: thirtyMinutesAgo
        });
        
        const formattedEvents: StreamEvent[] = recentEvents.map((event: any) => ({
          type: event.type,
          platform: event.platform,
          channel: event.channel,
          user: event.user,
          message: event.message,
          amount: event.amount,
          data: event.data ? JSON.parse(event.data) : undefined,
          time: event.time
        }));
        
        const filtered = filterRecentEvents(formattedEvents);
        
        setEvents(prev => {
          if (filtered.length !== prev.length || 
              (filtered.length > 0 && prev.length > 0 && filtered[0].time !== prev[0].time)) {
            console.log(`🟢 [EventWindow-${windowId}] Polling detected`, filtered.length - prev.length, 'new events');
            return filtered;
          }
          return prev;
        });
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Load initial data
    loadConfigs();
    loadRecentEvents();

    // Cleanup listener on unmount
    return () => {
      console.log(`🔴 [EventWindow-${windowId}] Component unmounting, cleaning up event listener`);
      window.electron.ipcRenderer.removeAllListeners('events:live');
      clearInterval(cleanupInterval);
      clearInterval(pollInterval);
    };
  }, [windowId, initialConfig]);

  // Render event content
  const renderEventContent = (event: StreamEvent) => {
    const config = displayConfigs[event.type] || { color: '#888', displayName: event.type };
    
    switch (event.type) {
      case 'chat':
        return (
          <div style={{ color: config.color }}>
            <strong>{event.user}:</strong> {event.message}
          </div>
        );
      case 'subscription':
        return (
          <div style={{ color: config.color }}>
            <strong>🌟 {event.user}</strong> just subscribed!
          </div>
        );
      case 'resub':
        const months = event.data?.months || 1;
        return (
          <div style={{ color: config.color }}>
            <strong>🔥 {event.user}</strong> resubscribed for {months} months!
            {event.message && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{event.message}"</div>}
          </div>
        );
      case 'subgift':
        const recipient = event.data?.recipient || 'someone';
        return (
          <div style={{ color: config.color }}>
            <strong>🎁 {event.user}</strong> gifted a sub to {recipient}!
          </div>
        );
      case 'cheer':
        return (
          <div style={{ color: config.color }}>
            <strong>✨ {event.user}</strong> cheered {event.amount} bits!
          </div>
        );
      case 'hosted':
        return (
          <div style={{ color: config.color }}>
            <strong>📺 {event.user}</strong> is hosting with {event.amount || 0} viewers!
          </div>
        );
      case 'raided':
        return (
          <div style={{ color: config.color }}>
            <strong>⚡ {event.user}</strong> raided with {event.amount || 0} viewers!
          </div>
        );
      case 'redeem':
        const rewardTitle = event.data?.rewardTitle || 'Unknown Reward';
        const cost = event.amount || 0;
        const userInput = event.message;
        return (
          <div style={{ color: config.color }}>
            <strong>🎁 {event.user}</strong> redeemed "{rewardTitle}" ({cost} points)
            {userInput && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{userInput}"</div>}
          </div>
        );
      default:
        return (
          <div style={{ color: config.color }}>
            <strong>{event.user}</strong> - {event.type}
          </div>
        );
    }
  };

  const filteredEvents = events.filter(event => activeTypes.has(event.type));
  const eventTypes = Object.keys(displayConfigs).filter(type => displayConfigs[type].enabled);

  // Generate dynamic title for standalone windows
  const getDynamicTitle = () => {
    if (!isStandalone) return 'Live Events';
    
    // Use custom title from initialConfig if provided
    if (initialConfig?.customTitle) {
      return `Event Monitor - ${initialConfig.customTitle}`;
    }
    
    if (activeTypes.size === 0) {
      return 'Event Monitor - No Events Selected';
    }
    
    const activeTypeNames = Array.from(activeTypes)
      .map(type => displayConfigs[type]?.displayName || type)
      .sort()
      .join(', ');
    
    return `Event Monitor - ${activeTypeNames}`;
  };

  // Update window title when active types change (for standalone windows)
  useEffect(() => {
    if (isStandalone && window.electron?.ipcRenderer) {
      const updateWindowTitle = async () => {
        try {
          const dynamicTitle = getDynamicTitle();
          await window.electron.ipcRenderer.invoke('eventWindow:updateTitle', windowId, dynamicTitle);
        } catch (error) {
          console.error('Failed to update window title:', error);
        }
      };
      
      updateWindowTitle();
    }
  }, [activeTypes, isStandalone, windowId, displayConfigs]);

  const containerStyle = isStandalone ? {
    padding: 16,
    color: '#fff',
    background: '#1a1a1a',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif'
  } : {
    maxWidth: 1200,
    margin: '0 auto',
    color: 'var(--text-color, #fff)',
    height: 'calc(100vh - 64px)'
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontWeight: 'bold', margin: 0 }}>
          {getDynamicTitle()}
        </h2>
        <div style={{ fontSize: 14, color: '#888' }}>
          Last 30 minutes • Latest first • Live events: {liveEventCount}
        </div>
      </div>

      {/* Event Type Toggles - Collapsible */}
      <div style={{ marginBottom: 24 }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: isToggleCollapsed ? 8 : 16,
            cursor: 'pointer',
            padding: '8px 0',
            borderBottom: '1px solid #333'
          }}
          onClick={() => setIsToggleCollapsed(!isToggleCollapsed)}
        >
          <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Event Types
            <span style={{ fontSize: 12, color: '#888' }}>
              ({activeTypes.size} selected)
            </span>
          </h3>
          <span style={{ 
            fontSize: 18, 
            color: '#888',
            transition: 'transform 0.2s',
            transform: isToggleCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </div>
        
        {!isToggleCollapsed && (
          <div style={{ paddingTop: 8 }}>
            {platformGroups.map((platformGroup, index) => {
              const platformTypes = platformGroup.types.filter(type => displayConfigs[type]?.enabled);
              if (platformTypes.length === 0) return null;
              
              return (
                <div key={platformGroup.platform} style={{ marginBottom: 16 }}>
                  <h4 style={{ 
                    color: '#ffd700', 
                    fontSize: 14, 
                    marginBottom: 8, 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}>
                    {platformGroup.displayName}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {platformTypes.map(type => {
                      const config = displayConfigs[type];
                      const isActive = activeTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleEventType(type)}
                          style={{
                            background: isActive ? config.color : '#444',
                            color: isActive ? '#000' : '#fff',
                            border: `2px solid ${config.color}`,
                            padding: '8px 16px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: 14,
                            transition: 'all 0.2s',
                            opacity: isActive ? 1 : 0.6,
                          }}
                        >
                          {config.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Events Display */}
      <div 
        ref={eventsRef}
        style={{
          background: isStandalone ? '#2a2a2a' : 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 16,
          height: isStandalone ? 'calc(100vh - 200px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
            <p>No events to display.</p>
            <p style={{ fontSize: 14 }}>
              {activeTypes.size === 0 
                ? 'Select event types above to see events.'
                : 'Events will appear here as they happen on your stream.'
              }
            </p>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div 
              key={index}
              style={{
                padding: '8px 0',
                borderBottom: index < filteredEvents.length - 1 ? '1px solid #333' : 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ 
                minWidth: 80, 
                fontSize: 12, 
                color: '#888', 
                marginRight: 12 
              }}>
                {new Date(event.time).toLocaleTimeString()}
              </div>
              <div style={{ 
                minWidth: 60,
                fontSize: 12,
                color: '#666',
                marginRight: 12,
                textTransform: 'capitalize'
              }}>
                {event.platform}
              </div>
              <div style={{ flex: 1 }}>
                {renderEventContent(event)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventWindow;
