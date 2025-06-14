import React, { useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const DeveloperKick: React.FC = () => {
  const [customData, setCustomData] = useState({
    username: 'TestUser',
    channelId: '12345',
    amount: 1,
    message: 'Hello from KICK!',
    tier: 'Tier 1',
    months: 1,
    viewerCount: 50
  });
  
  const [isGeneratingSequence, setIsGeneratingSequence] = useState(false);
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // Simulate a chat message event
  const simulateChatMessage = async () => {
    const event = {
      type: 'chat',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      message: customData.message,
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'message-id': Math.random().toString(36).substr(2, 9),
        'color': '#53fc18'
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK chat message:', event);
    } catch (error) {
      console.error('Failed to simulate KICK chat message:', error);
    }
  };

  // Simulate a follow event
  const simulateFollow = async () => {
    const event = {
      type: 'channel.followed',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'channel-id': customData.channelId
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK follow:', event);
    } catch (error) {
      console.error('Failed to simulate KICK follow:', error);
    }
  };

  // Simulate a subscription event
  const simulateSubscription = async () => {
    const event = {
      type: 'channel.subscription.new',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      amount: customData.months,
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'channel-id': customData.channelId,
        'months': customData.months.toString(),
        'tier': customData.tier
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK subscription:', event);
    } catch (error) {
      console.error('Failed to simulate KICK subscription:', error);
    }
  };

  // Simulate a subscription renewal event
  const simulateSubscriptionRenewal = async () => {
    const event = {
      type: 'channel.subscription.renewal',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      amount: customData.months,
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'channel-id': customData.channelId,
        'months': customData.months.toString(),
        'tier': customData.tier
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK subscription renewal:', event);
    } catch (error) {
      console.error('Failed to simulate KICK subscription renewal:', error);
    }
  };

  // Simulate a gifted subscription event
  const simulateGiftedSubscription = async () => {
    const event = {
      type: 'channel.subscription.gifts',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      amount: 1,
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'channel-id': customData.channelId,
        'tier': customData.tier,
        'recipient': 'LuckyViewer' + Math.floor(Math.random() * 1000)
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK gifted subscription:', event);
    } catch (error) {
      console.error('Failed to simulate KICK gifted subscription:', error);
    }
  };

  // Simulate a user ban event
  const simulateBan = async () => {
    const event = {
      type: 'moderation.banned',
      platform: 'kick',
      channel: 'testchannel',
      user: customData.username,
      message: 'Violated community guidelines',
      time: new Date().toISOString(),
      tags: {
        'user-id': Math.floor(Math.random() * 100000).toString(),
        'channel-id': customData.channelId,
        'reason': 'Violated community guidelines'
      }
    };

    try {
      await window.electron.ipcRenderer.invoke('developer:simulateEvent', event);
      console.log('Simulated KICK ban:', event);
    } catch (error) {
      console.error('Failed to simulate KICK ban:', error);
    }
  };

  // Remove the simulateRaid function since KICK doesn't have raids

  // Generate automated event sequences
  const generateEventSequence = async () => {
    setIsGeneratingSequence(true);
    
    const events = [
      { type: 'follow', delay: 0 },
      { type: 'chat', delay: 1000 },
      { type: 'subscription', delay: 2000 },
      { type: 'chat', delay: 3000 },
      { type: 'renewal', delay: 4000 },
      { type: 'gift', delay: 5000 }
    ];

    for (const { type, delay } of events) {
      setTimeout(async () => {
        switch (type) {
          case 'chat':
            await simulateChatMessage();
            break;
          case 'follow':
            await simulateFollow();
            break;
          case 'subscription':
            await simulateSubscription();
            break;
          case 'renewal':
            await simulateSubscriptionRenewal();
            break;
          case 'gift':
            await simulateGiftedSubscription();
            break;
        }
      }, delay);
    }

    setTimeout(() => {
      setIsGeneratingSequence(false);
    }, 6000);
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
    backgroundColor: '#53fc18',
    color: '#000',
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
    <div style={getResponsiveContainerStyle(1200)}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: '#53fc18', marginBottom: 8 }}>
            🥊 KICK Developer Tools
          </h1>
          <p style={{ color: '#888', fontSize: 16 }}>
            Simulate KICK streaming events for testing and development
          </p>
        </div>

        {/* Custom Data Configuration */}
        <div style={{ 
          backgroundColor: '#1e1e1e', 
          padding: 24, 
          borderRadius: 8, 
          marginBottom: 24,
          border: '1px solid #333'
        }}>
          <h2 style={{ color: '#53fc18', marginBottom: 16, fontSize: 18 }}>
            Event Configuration
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Username
              </label>
              <input
                type="text"
                value={customData.username}
                onChange={(e) => setCustomData({ ...customData, username: e.target.value })}
                style={inputStyle}
                placeholder="TestUser"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Channel ID
              </label>
              <input
                type="text"
                value={customData.channelId}
                onChange={(e) => setCustomData({ ...customData, channelId: e.target.value })}
                style={inputStyle}
                placeholder="12345"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Chat Message
              </label>
              <input
                type="text"
                value={customData.message}
                onChange={(e) => setCustomData({ ...customData, message: e.target.value })}
                style={inputStyle}
                placeholder="Hello from KICK!"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Subscription Months
              </label>
              <input
                type="number"
                value={customData.months}
                onChange={(e) => setCustomData({ ...customData, months: parseInt(e.target.value) || 1 })}
                style={inputStyle}
                min="1"
                max="100"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Subscription Tier
              </label>
              <select
                value={customData.tier}
                onChange={(e) => setCustomData({ ...customData, tier: e.target.value })}
                style={inputStyle}
              >
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#ccc', fontSize: 14 }}>
                Raid Viewer Count
              </label>
              <input
                type="number"
                value={customData.viewerCount}
                onChange={(e) => setCustomData({ ...customData, viewerCount: parseInt(e.target.value) || 1 })}
                style={inputStyle}
                min="1"
                max="10000"
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
          <h2 style={{ color: '#53fc18', marginBottom: 16, fontSize: 18 }}>
            Event Simulation
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <button
              onClick={simulateChatMessage}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              💬 Chat Message
            </button>

            <button
              onClick={simulateFollow}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              ❤️ New Follower
            </button>

            <button
              onClick={simulateSubscription}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              ⭐ New Subscription
            </button>

            <button
              onClick={simulateSubscriptionRenewal}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              🔄 Subscription Renewal
            </button>

            <button
              onClick={simulateGiftedSubscription}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              🎁 Gifted Subscription
            </button>

            <button
              onClick={simulateBan}
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fff30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#53fc18'}
            >
              🚫 User Ban
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
          <h2 style={{ color: '#53fc18', marginBottom: 16, fontSize: 18 }}>
            Automated Event Sequences
          </h2>
          
          <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
            Generate a sequence of events to test event handling and UI responsiveness
          </p>
          
          <button
            onClick={generateEventSequence}
            disabled={isGeneratingSequence}
            style={{
              ...secondaryButtonStyle,
              backgroundColor: isGeneratingSequence ? '#666' : '#444',
              cursor: isGeneratingSequence ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isGeneratingSequence) {
                e.currentTarget.style.backgroundColor = '#555';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGeneratingSequence) {
                e.currentTarget.style.backgroundColor = '#444';
              }
            }}
          >
            {isGeneratingSequence ? '🔄 Generating Events...' : '🎬 Generate Event Sequence'}
          </button>
          
          {isGeneratingSequence && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#2a2a2a', 
              borderRadius: 4,
              color: '#53fc18',
              fontSize: 14
            }}>
              📡 Generating event sequence: Follow → Chat → Subscription → Chat → Renewal → Gift
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{ 
          backgroundColor: '#1a1a2e', 
          padding: 20, 
          borderRadius: 8, 
          marginTop: 24,
          border: '1px solid #53fc18'
        }}>
          <h3 style={{ color: '#53fc18', marginBottom: 12, fontSize: 16 }}>
            💡 Testing Tips
          </h3>
          <ul style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6, paddingLeft: 20 }}>
            <li>Open the Events screen to see simulated events in real-time</li>
            <li>Check Event History to verify events are being stored correctly</li>
            <li>Test TTS functionality by enabling it and using chat messages</li>
            <li>Use different usernames to test cross-platform viewer management</li>
            <li>Generate event sequences to test UI performance with rapid events</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeveloperKick;
