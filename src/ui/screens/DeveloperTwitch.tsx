import React, { useState } from 'react';

const DeveloperTwitch: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [customData, setCustomData] = useState({
    username: 'TestUser',
    message: 'Hello from custom test!',
    amount: 100,
    months: 6,
    recipient: 'LuckyViewer',
    rewardTitle: 'Song Request'
  });

  const triggerEvent = async (eventType: string, eventData: any) => {
    setLoading(eventType);
    try {
      await window.electron.ipcRenderer.invoke('developer:triggerEvent', {
        type: eventType,
        platform: 'twitch',
        channel: 'test_channel',
        user: eventData.user || customData.username,
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

  const twitchEvents = [
    {
      name: 'Follow',
      type: 'follow',
      description: 'Simulate a new follower',
      icon: '👤',
      color: '#00d2ff',
      getData: () => ({ user: customData.username })
    },
    {
      name: 'Subscription (Tier 1)',
      type: 'subscription',
      description: 'New Tier 1 subscription',
      icon: '⭐',
      color: '#9147ff',
      getData: () => ({ user: customData.username, amount: 1 })
    },
    {
      name: 'Subscription (Tier 2)', 
      type: 'subscription',
      description: 'New Tier 2 subscription',
      icon: '⭐⭐',
      color: '#9147ff',
      getData: () => ({ user: customData.username, amount: 2 })
    },
    {
      name: 'Subscription (Tier 3)',
      type: 'subscription', 
      description: 'New Tier 3 subscription',
      icon: '⭐⭐⭐',
      color: '#9147ff',
      getData: () => ({ user: customData.username, amount: 3 })
    },
    {
      name: 'Resubscription',
      type: 'resub',
      description: 'User resubscribes with message',
      icon: '🔄',
      color: '#7b68ee',
      getData: () => ({ 
        user: customData.username, 
        message: customData.message,
        data: { months: customData.months }
      })
    },
    {
      name: 'Gift Subscription',
      type: 'subgift',
      description: 'User gifts a subscription',
      icon: '🎁',
      color: '#ff6b6b',
      getData: () => ({ 
        user: customData.username,
        data: { recipient: customData.recipient }
      })
    },
    {
      name: 'Bit Cheer',
      type: 'cheer',
      description: 'User cheers with bits',
      icon: '✨',
      color: '#ffd700',
      getData: () => ({ 
        user: customData.username,
        amount: customData.amount,
        message: customData.message
      })
    },
    {
      name: 'Host',
      type: 'hosted',
      description: 'Another streamer hosts you',
      icon: '📺',
      color: '#ff7f50',
      getData: () => ({ 
        user: customData.username,
        amount: customData.amount
      })
    },
    {
      name: 'Raid',
      type: 'raided',
      description: 'Another streamer raids you',
      icon: '⚡',
      color: '#ff4500',
      getData: () => ({ 
        user: customData.username,
        amount: customData.amount
      })
    },
    {
      name: 'Channel Point Redemption',
      type: 'redeem',
      description: 'User redeems channel points reward',
      icon: '🎁',
      color: '#00ff88',
      getData: () => ({ 
        user: customData.username,
        amount: customData.amount,
        message: customData.message,
        data: { 
          rewardTitle: customData.rewardTitle,
          rewardCost: customData.amount,
          userInput: customData.message
        }
      })
    }
  ];

  const runEventSequence = async () => {
    setLoading('sequence');
    
    const sequence = [
      { type: 'chat', data: { user: 'Viewer1', message: 'First!' }},
      { type: 'subscription', data: { user: 'NewSub', amount: 1 }},
      { type: 'chat', data: { user: 'Viewer2', message: 'Welcome NewSub!' }},
      { type: 'cheer', data: { user: 'CheerLeader', amount: 500, message: 'Great stream!' }},
      { type: 'chat', data: { user: 'Viewer3', message: 'PogChamp' }},
      { type: 'redeem', data: { 
        user: 'RewardFan', 
        amount: 250, 
        message: 'Can you do a backflip?',
        data: { rewardTitle: 'Physical Challenge', rewardCost: 250, userInput: 'Can you do a backflip?' }
      }},
      { type: 'resub', data: { user: 'LoyalFan', data: { months: 24 }, message: '2 years strong!' }},
      { type: 'raided', data: { user: 'BigStreamer', amount: 150 }},
      { type: 'chat', data: { user: 'RaidViewer1', message: 'Hey from the raid!' }},
      { type: 'chat', data: { user: 'RaidViewer2', message: 'First time here, looks cool!' }},
      { type: 'subgift', data: { user: 'Generous', data: { recipient: 'RandomViewer' }}},
    ];

    for (const event of sequence) {
      await triggerEvent(event.type, event.data);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    setLoading(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#9147ff', fontWeight: 'bold', marginBottom: 24 }}>
        🎮 Twitch Event Simulator
      </h2>
      
      <p style={{ color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
        Simulate specific Twitch events to test the event system. Customize the test data below 
        and trigger individual events or run automated sequences.
      </p>

      {/* Custom Data Form */}
      <div style={{ 
        background: '#2a2a2a', 
        border: '1px solid #444',
        borderRadius: 8,
        padding: 20,
        marginBottom: 32
      }}>
        <h3 style={{ color: '#9147ff', marginBottom: 16 }}>🎛️ Custom Test Data</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Username:
            </label>
            <input
              type="text"
              value={customData.username}
              onChange={(e) => setCustomData(prev => ({ ...prev, username: e.target.value }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Message:
            </label>
            <input
              type="text"
              value={customData.message}
              onChange={(e) => setCustomData(prev => ({ ...prev, message: e.target.value }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Amount (Bits/Viewers):
            </label>
            <input
              type="number"
              value={customData.amount}
              onChange={(e) => setCustomData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Months (Resub):
            </label>
            <input
              type="number"
              value={customData.months}
              onChange={(e) => setCustomData(prev => ({ ...prev, months: parseInt(e.target.value) || 1 }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Gift Recipient:
            </label>
            <input
              type="text"
              value={customData.recipient}
              onChange={(e) => setCustomData(prev => ({ ...prev, recipient: e.target.value }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#aaa', fontSize: 14 }}>
              Reward Title:
            </label>
            <input
              type="text"
              value={customData.rewardTitle}
              onChange={(e) => setCustomData(prev => ({ ...prev, rewardTitle: e.target.value }))}
              style={{
                width: '100%',
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      {/* Event Triggers */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#9147ff', marginBottom: 16 }}>🎯 Twitch Events</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 16 
        }}>
          {twitchEvents.map((event) => (
            <button
              key={`${event.type}-${event.name}`}
              onClick={() => triggerEvent(event.type, event.getData())}
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
                gap: 12,
                opacity: loading !== null && loading !== event.type ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>{event.icon}</span>
              <div>
                <div style={{ fontSize: '16px', marginBottom: 4 }}>{event.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {event.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Automated Sequences */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#9147ff', marginBottom: 16 }}>🚀 Automated Sequences</h3>
        
        <button
          onClick={runEventSequence}
          disabled={loading !== null}
          style={{
            background: loading === 'sequence' ? '#555' : '#e74c3c',
            color: '#fff',
            border: 'none',
            padding: '16px 24px',
            borderRadius: 8,
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: 16,
            opacity: loading !== null && loading !== 'sequence' ? 0.5 : 1
          }}
        >
          {loading === 'sequence' ? '🔄 Running Event Sequence...' : '🎬 Run Realistic Stream Sequence'}
        </button>
        
        <p style={{ color: '#aaa', fontSize: 14, marginTop: 8 }}>
          Runs a 15-second sequence simulating realistic stream activity with chat, subs, cheers, and raids.
        </p>
      </div>

      {/* Status */}
      {loading && (
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #9147ff',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: '#9147ff',
          fontWeight: 'bold'
        }}>
          🔄 {loading === 'sequence' ? 'Running event sequence...' : `Triggering ${loading} event...`}
        </div>
      )}
    </div>
  );
};

export default DeveloperTwitch;
