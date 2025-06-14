import React, { useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import DeveloperKick from './DeveloperKick';

const Developer: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'twitch' | 'kick'>('twitch');
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  const triggerEvent = async (eventType: string, eventData: any) => {
    setLoading(eventType);
    try {
      // Send event directly to the eventBus via IPC
      await window.electron.ipcRenderer.invoke('developer:triggerEvent', {
        type: eventType,
        platform: 'twitch',
        channel: 'test_channel',
        user: eventData.user || 'TestUser',
        message: eventData.message,
        amount: eventData.amount,
        data: eventData.data,
        time: new Date().toISOString()
      });
      
      console.log(`Triggered ${eventType} event`);
    } catch (error) {
      console.error(`Failed to trigger ${eventType} event:`, error);
    }
    setLoading(null);
  };

  const eventTests = [
    {
      name: 'Chat Message',
      type: 'chat',
      data: { user: 'TestViewer', message: 'Hello from test chat!' },
      color: '#3a8dde',
      icon: '💬'
    },
    {
      name: 'New Subscription',
      type: 'subscription',
      data: { user: 'NewSub123', amount: 1 },
      color: '#9147ff',
      icon: '⭐'
    },
    {
      name: 'Resubscription',
      type: 'resub',
      data: { user: 'LoyalViewer', data: { months: 12 } },
      color: '#7b68ee',
      icon: '🔄'
    },
    {
      name: 'Gifted Sub',
      type: 'subgift',
      data: { user: 'Gifter123', data: { recipient: 'LuckyViewer' } },
      color: '#ff6b6b',
      icon: '🎁'
    },
    {
      name: 'Bit Cheer',
      type: 'cheer',
      data: { user: 'CheerLeader', amount: 100 },
      color: '#ffd700',
      icon: '✨'
    },
    {
      name: 'Host',
      type: 'hosted',
      data: { user: 'HostingStreamer', amount: 25 },
      color: '#ff7f50',
      icon: '📺'
    },
    {
      name: 'Raid',
      type: 'raided',
      data: { user: 'RaidingStreamer', amount: 50 },
      color: '#ff4500',
      icon: '⚡'
    },
    {
      name: 'Channel Point Redemption',
      type: 'redeem',
      data: { 
        user: 'RewardRedeemer', 
        amount: 500,
        message: 'Please play my favorite song!',
        data: { 
          rewardTitle: 'Song Request',
          rewardCost: 500,
          userInput: 'Please play my favorite song!'
        }
      },
      color: '#00ff88',
      icon: '🎁'
    }
  ];

  const triggerMultipleEvents = async () => {
    setLoading('multiple');
    
    for (let i = 0; i < eventTests.length; i++) {
      const event = eventTests[i];
      await triggerEvent(event.type, event.data);
      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(null);
  };

  const triggerChatSpam = async () => {
    setLoading('chatSpam');
    
    const messages = [
      'Hey everyone!',
      'This stream is awesome!',
      'Kappa Kappa Kappa',
      'First time here, loving it!',
      'When is the next stream?',
      'PogChamp',
      'This game looks fun',
      'LUL that was funny'
    ];
    
    for (let i = 0; i < 8; i++) {
      await triggerEvent('chat', {
        user: `Viewer${i + 1}`,
        message: messages[i]
      });
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setLoading(null);
  };

  const testCommand = async () => {
    setLoading('command');
    try {
      // Simulate a ~hello command
      await triggerEvent('chat', {
        user: 'TestUser',
        message: '~hello'
      });
      console.log('Triggered ~hello command test');
    } catch (error) {
      console.error('Failed to trigger command test:', error);
    }
    setLoading(null);
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(800), color: '#fff' }}>
      <h2 style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: 16 }}>
        🛠️ Developer Tools
      </h2>
      
      <p style={{ color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
        Test event system functionality by triggering simulated events from different platforms.
        These events will flow through the complete event pipeline including the Events screen, 
        TTS system, and database storage.
      </p>

      {/* Platform Tabs */}
      <div style={{ 
        display: 'flex', 
        marginBottom: 32,
        borderBottom: '2px solid #333'
      }}>
        <button
          onClick={() => setActiveTab('twitch')}
          style={{
            background: activeTab === 'twitch' ? '#9147ff' : 'transparent',
            color: activeTab === 'twitch' ? '#fff' : '#888',
            border: 'none',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 16,
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s'
          }}
        >
          🟣 Twitch Events
        </button>
        <button
          onClick={() => setActiveTab('kick')}
          style={{
            background: activeTab === 'kick' ? '#53fc18' : 'transparent',
            color: activeTab === 'kick' ? '#000' : '#888',
            border: 'none',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 16,
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s'
          }}
        >
          🥊 KICK Events
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'twitch' ? (
        <div>
          {/* Individual Event Tests */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#ffd700', marginBottom: 16, fontSize: '1.1em' }}>
              🎯 Individual Event Tests
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 16 
            }}>
              {eventTests.map((event) => (
                <button
                  key={event.type}
                  onClick={() => triggerEvent(event.type, event.data)}
                  disabled={loading !== null}
                  style={{
                    background: loading === event.type ? '#555' : event.color,
                    color: loading === event.type ? '#aaa' : '#000',
                    border: 'none',
                    padding: '16px',
                    borderRadius: 8,
                    cursor: loading !== null ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: loading !== null && loading !== event.type ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{event.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div>{event.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {event.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Tests */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#ffd700', marginBottom: 16, fontSize: '1.1em' }}>
              🚀 Bulk Tests
            </h3>
            
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={triggerMultipleEvents}
                disabled={loading !== null}
                style={{
                  background: loading === 'multiple' ? '#555' : '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: 8,
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 14,
                  opacity: loading !== null && loading !== 'multiple' ? 0.5 : 1
                }}
              >
                {loading === 'multiple' ? '🔄 Triggering All Events...' : '🎪 Trigger All Event Types'}
              </button>
              
              <button
                onClick={triggerChatSpam}
                disabled={loading !== null}
                style={{
                  background: loading === 'chatSpam' ? '#555' : '#3498db',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: 8,
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 14,
                  opacity: loading !== null && loading !== 'chatSpam' ? 0.5 : 1
                }}
              >
                {loading === 'chatSpam' ? '🔄 Sending Messages...' : '💬 Simulate Chat Activity'}
              </button>
              
              <button
                onClick={testCommand}
                disabled={loading !== null}
                style={{
                  background: loading === 'command' ? '#555' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: 8,
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 14,
                  opacity: loading !== null && loading !== 'command' ? 0.5 : 1
                }}
              >
                {loading === 'command' ? '🔄 Testing Command...' : '🤖 Test ~hello Command'}
              </button>
            </div>
          </div>

          {/* Info Panel */}
          <div style={{ 
            background: '#2a2a2a', 
            border: '1px solid #444',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <h4 style={{ color: '#ffd700', marginBottom: 12 }}>ℹ️ Testing Notes</h4>
            <ul style={{ color: '#aaa', lineHeight: 1.6, margin: 0 }}>
              <li>Events will appear in real-time on the Events screen</li>
              <li>TTS will announce events if configured and enabled</li>
              <li>All events are stored in the database and visible in Event History</li>
              <li>Use Events Admin to configure which events are displayed</li>
              <li>Command testing will simulate a user typing ~hello in chat</li>
              <li>Check the browser console for event processing logs</li>
            </ul>
          </div>

          {/* Status */}
          {loading && (
            <div style={{
              background: '#1a1a1a',
              border: '2px solid #ffd700',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
              color: '#ffd700',
              fontWeight: 'bold'
            }}>
              🔄 {loading === 'multiple' ? 'Triggering all events...' : 
                  loading === 'chatSpam' ? 'Simulating chat activity...' : 
                  `Triggering ${loading} event...`}
            </div>
          )}
        </div>
      ) : (
        <DeveloperKick />
      )}
    </div>
  );
};

export default Developer;
