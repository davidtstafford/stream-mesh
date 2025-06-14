import React, { useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import DeveloperKick from './DeveloperKick';

const Developer: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'twitch' | 'kick'>('twitch');
  const { getResponsiveContainerStyle } = useResponsiveLayout();
  
  // Twitch custom data state
  const [twitchCustomData, setTwitchCustomData] = useState({
    username: 'TestUser',
    message: 'Hello from custom test!',
    amount: 100,
    months: 6,
    recipient: 'LuckyViewer',
    rewardTitle: 'Song Request'
  });

  const triggerTwitchEvent = async (eventType: string, eventData: any) => {
    setLoading(eventType);
    try {
      await window.electron.ipcRenderer.invoke('developer:triggerEvent', {
        type: eventType,
        platform: 'twitch',
        channel: 'test_channel',
        user: eventData.user || twitchCustomData.username,
        message: eventData.message,
        amount: eventData.amount,
        data: eventData.data,
        time: new Date().toISOString()
      });
      
      console.log(`Triggered Twitch ${eventType} event`);
    } catch (error) {
      console.error(`Failed to trigger Twitch ${eventType} event:`, error);
    }
    setLoading(null);
  };

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

  // Twitch event simulation functions
  const simulateTwitchFollow = async () => {
    await triggerTwitchEvent('follow', { user: twitchCustomData.username });
  };

  const simulateTwitchSubscription = async (tier: number = 1) => {
    await triggerTwitchEvent('subscription', { 
      user: twitchCustomData.username, 
      amount: tier 
    });
  };

  const simulateTwitchResub = async () => {
    await triggerTwitchEvent('resub', {
      user: twitchCustomData.username,
      message: twitchCustomData.message,
      data: { months: twitchCustomData.months }
    });
  };

  const simulateTwitchSubgift = async () => {
    await triggerTwitchEvent('subgift', {
      user: twitchCustomData.username,
      data: { recipient: twitchCustomData.recipient }
    });
  };

  const simulateTwitchCheer = async () => {
    await triggerTwitchEvent('cheer', {
      user: twitchCustomData.username,
      amount: twitchCustomData.amount,
      message: twitchCustomData.message
    });
  };

  const simulateTwitchHost = async () => {
    await triggerTwitchEvent('hosted', {
      user: twitchCustomData.username,
      amount: twitchCustomData.amount
    });
  };

  const simulateTwitchRaid = async () => {
    await triggerTwitchEvent('raided', {
      user: twitchCustomData.username,
      amount: twitchCustomData.amount
    });
  };

  const simulateTwitchRedeem = async () => {
    await triggerTwitchEvent('redeem', {
      user: twitchCustomData.username,
      amount: twitchCustomData.amount,
      message: twitchCustomData.message,
      data: {
        rewardTitle: twitchCustomData.rewardTitle,
        rewardCost: twitchCustomData.amount,
        userInput: twitchCustomData.message
      }
    });
  };

  const simulateTwitchChat = async () => {
    await triggerTwitchEvent('chat', {
      user: twitchCustomData.username,
      message: twitchCustomData.message
    });
  };

  // Twitch event sequence
  const generateTwitchEventSequence = async () => {
    setLoading('sequence');
    
    const sequence = [
      () => simulateTwitchChat(),
      () => simulateTwitchSubscription(1),
      () => simulateTwitchChat(),
      () => simulateTwitchCheer(),
      () => simulateTwitchResub(),
      () => simulateTwitchRaid()
    ];

    for (let i = 0; i < sequence.length; i++) {
      setTimeout(sequence[i], i * 1500);
    }

    setTimeout(() => {
      setLoading(null);
    }, sequence.length * 1500);
  };

  const inputStyle = {
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    width: '100%'
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#9147ff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.2s'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#444',
    color: '#fff'
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
          {/* Custom Data Configuration */}
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            padding: 24, 
            borderRadius: 8, 
            marginBottom: 24,
            border: '1px solid #333'
          }}>
            <h2 style={{ color: '#9147ff', marginBottom: 16, fontSize: 18 }}>
              Event Configuration
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={twitchCustomData.username}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, username: e.target.value })}
                  style={inputStyle}
                  placeholder="TestUser"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Chat Message
                </label>
                <input
                  type="text"
                  value={twitchCustomData.message}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, message: e.target.value })}
                  style={inputStyle}
                  placeholder="Hello from Twitch!"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Amount (Bits/Viewers)
                </label>
                <input
                  type="number"
                  value={twitchCustomData.amount}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, amount: parseInt(e.target.value) || 100 })}
                  style={inputStyle}
                  min="1"
                  max="10000"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Subscription Months
                </label>
                <input
                  type="number"
                  value={twitchCustomData.months}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, months: parseInt(e.target.value) || 1 })}
                  style={inputStyle}
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Gift Recipient
                </label>
                <input
                  type="text"
                  value={twitchCustomData.recipient}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, recipient: e.target.value })}
                  style={inputStyle}
                  placeholder="LuckyViewer"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                  Reward Title
                </label>
                <input
                  type="text"
                  value={twitchCustomData.rewardTitle}
                  onChange={(e) => setTwitchCustomData({ ...twitchCustomData, rewardTitle: e.target.value })}
                  style={inputStyle}
                  placeholder="Song Request"
                />
              </div>
            </div>
          </div>

          {/* Event Simulation Buttons */}
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            padding: 24, 
            borderRadius: 8, 
            marginBottom: 24,
            border: '1px solid #333'
          }}>
            <h2 style={{ color: '#9147ff', marginBottom: 16, fontSize: 18 }}>
              Event Simulation
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <button
                onClick={simulateTwitchChat}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                💬 Chat Message
              </button>

              <button
                onClick={() => simulateTwitchSubscription(1)}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                ⭐ New Subscription
              </button>

              <button
                onClick={simulateTwitchResub}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                🔄 Resubscription
              </button>

              <button
                onClick={simulateTwitchSubgift}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                🎁 Gifted Sub
              </button>

              <button
                onClick={simulateTwitchCheer}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                ✨ Bit Cheer
              </button>

              <button
                onClick={simulateTwitchHost}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                📺 Host Event
              </button>

              <button
                onClick={simulateTwitchRaid}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                ⚡ Raid Event
              </button>

              <button
                onClick={simulateTwitchRedeem}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9147ff'}
              >
                🎁 Channel Points
              </button>
            </div>
          </div>

          {/* Automated Sequences */}
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            padding: 24, 
            borderRadius: 8, 
            border: '1px solid #333'
          }}>
            <h2 style={{ color: '#9147ff', marginBottom: 16, fontSize: 18 }}>
              Automated Event Sequences
            </h2>
            
            <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
              Generate sequences of events to test event handling and UI responsiveness
            </p>
            
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={generateTwitchEventSequence}
                disabled={loading === 'sequence'}
                style={{
                  ...secondaryButtonStyle,
                  backgroundColor: loading === 'sequence' ? '#666' : '#444',
                  cursor: loading === 'sequence' ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (loading !== 'sequence') {
                    e.currentTarget.style.backgroundColor = '#555';
                  }
                }}
                onMouseLeave={(e) => {
                  if (loading !== 'sequence') {
                    e.currentTarget.style.backgroundColor = '#444';
                  }
                }}
              >
                {loading === 'sequence' ? '🔄 Running Sequence...' : '🎬 Run Event Sequence'}
              </button>
            </div>
            
            {loading === 'sequence' && (
              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                backgroundColor: '#2a2a2a', 
                borderRadius: 4,
                color: '#9147ff',
                fontSize: 14
              }}>
                📡 Running Twitch event sequence with realistic delays...
              </div>
            )}
          </div>
        </div>
      ) : (
        <DeveloperKick />
      )}
    </div>
  );
};

export default Developer;
