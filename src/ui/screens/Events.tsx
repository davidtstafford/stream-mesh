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
    types: ['subscription', 'resub', 'subgift', 'cheer', 'hosted', 'raided']
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
};

const Events: React.FC = () => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [displayConfigs, setDisplayConfigs] = useState(defaultConfigs);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(Object.keys(defaultConfigs)));
  const eventsRef = useRef<HTMLDivElement>(null);

  // Load event configurations and set up real-time streaming
  useEffect(() => {
    // Load event display configurations
    const loadConfigs = async () => {
      try {
        const savedConfigs = await window.electron.ipcRenderer.invoke('eventConfig:load');
        if (savedConfigs && Object.keys(savedConfigs).length > 0) {
          // Merge saved configs with defaults
          const mergedConfigs = { ...defaultConfigs };
          Object.entries(savedConfigs).forEach(([type, config]: [string, any]) => {
            if (mergedConfigs[type]) {
              mergedConfigs[type] = { 
                ...mergedConfigs[type], 
                ...config,
                // Only show events that are enabled AND set to show in events
                enabled: config.enabled && config.showInEvents 
              };
            }
          });
          setDisplayConfigs(mergedConfigs);
          
          // Update active types to only include enabled types
          const enabledTypes = Object.entries(mergedConfigs)
            .filter(([_, config]) => config.enabled)
            .map(([type, _]) => type);
          setActiveTypes(new Set(enabledTypes));
        }
      } catch (error) {
        console.error('Failed to load event configurations:', error);
      }
    };

    // Load recent events from database
    const loadRecentEvents = async () => {
      try {
        const recentEvents = await window.electron.ipcRenderer.invoke('events:fetch', {
          limit: 50, // Get last 50 events
          orderBy: 'time',
          orderDirection: 'DESC'
        });
        
        // Convert database events to UI format
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
        
        setEvents(formattedEvents.reverse()); // Reverse to show oldest first
      } catch (error) {
        console.error('Failed to load recent events:', error);
      }
    };

    // Set up real-time event listener
    const handleLiveEvent = (event: any) => {
      // Convert event to UI format and add to events
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
      
      setEvents(prev => [...prev, formattedEvent]);
    };

    // Register listener for live events
    window.electron.ipcRenderer.on('events:live', handleLiveEvent);

    // Load initial data
    loadConfigs();
    loadRecentEvents();

    // Cleanup listener on unmount
    return () => {
      window.electron.ipcRenderer.removeAllListeners('events:live');
    };
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [events]);

  const toggleEventType = (type: string) => {
    setActiveTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const formatEventDisplay = (event: StreamEvent) => {
    const config = displayConfigs[event.type];
    if (!config) return null;

    const timeFormatted = new Date(event.time).toLocaleTimeString();
    
    switch (event.type) {
      case 'chat':
        return (
          <div style={{ color: config.color }}>
            <strong>{event.user}:</strong> {event.message}
          </div>
        );
      case 'subscription':
        const tier = event.amount || 1;
        return (
          <div style={{ color: config.color }}>
            <strong>🎉 {event.user}</strong> subscribed (Tier {tier})!
          </div>
        );
      case 'resub':
        const months = event.data?.months || 1;
        return (
          <div style={{ color: config.color }}>
            <strong>🔄 {event.user}</strong> resubscribed ({months} months)!
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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: 'var(--text-color, #fff)', height: 'calc(100vh - 64px)' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 24 }}>Live Events</h2>

      {/* Event Type Toggles */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Event Types:</h3>
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
                📡 {platformGroup.displayName}
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

      {/* Events Display */}
      <div 
        ref={eventsRef}
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 16,
          height: 'calc(100vh - 200px)',
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
                padding: '2px 6px',
                borderRadius: 4,
                background: displayConfigs[event.type]?.color || '#666',
                color: '#000',
                fontWeight: 'bold',
                marginRight: 12,
                textAlign: 'center'
              }}>
                {event.type.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                {formatEventDisplay(event)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 14, color: '#666', textAlign: 'center' }}>
        Showing {filteredEvents.length} of {events.length} events
        {activeTypes.size < eventTypes.length && ` (${eventTypes.length - activeTypes.size} types hidden)`}
      </div>
    </div>
  );
};

export default Events;
