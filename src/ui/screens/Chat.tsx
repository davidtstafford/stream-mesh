import React, { useState, useEffect, useRef } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface ChatMessage {
  id?: number;
  user: string;
  user_id?: string;
  platform: string;
  time: string;
  text: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [maxMessages, setMaxMessages] = useState<number>(100);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tempMaxMessages, setTempMaxMessages] = useState<number>(100);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // Load chat settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.ipcRenderer.invoke('chat:getSettings');
        setMaxMessages(settings.maxMessages || 100);
        setTempMaxMessages(settings.maxMessages || 100);
        setIsLoadingSettings(false);
      } catch (error) {
        console.error('Failed to load chat settings:', error);
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Load recent chat messages from database on mount
  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        const chatMessages = await window.electron.ipcRenderer.invoke('chat:fetch', {});
        // Get the most recent messages up to maxMessages
        const recentMessages = chatMessages.slice(-maxMessages);
        setMessages(recentMessages);
      } catch (error) {
        console.error('Failed to load recent chat messages:', error);
      }
    };
    
    if (!isLoadingSettings) {
      loadRecentMessages();
    }
  }, [isLoadingSettings, maxMessages]);

  // Listen for live chat messages
  useEffect(() => {
    const handleLiveChat = (chatData: any) => {
      const newMessage: ChatMessage = {
        user: chatData.user || 'Unknown',
        user_id: chatData.tags?.['user-id'] || '',
        platform: chatData.platform || 'unknown',
        time: chatData.time || new Date().toISOString(),
        text: chatData.message || chatData.text || '',
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        // Limit to maxMessages
        return updated.slice(-maxMessages);
      });
    };

    // Clear any existing listeners before adding new one
    window.electron.ipcRenderer.removeAllListeners('chat:live');
    window.electron.ipcRenderer.on('chat:live', handleLiveChat);

    // Cleanup on unmount
    return () => {
      window.electron.ipcRenderer.removeAllListeners('chat:live');
    };
  }, [maxMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save settings
  const saveSettings = async () => {
    try {
      await window.electron.ipcRenderer.invoke('chat:setSettings', {
        maxMessages: tempMaxMessages,
      });
      setMaxMessages(tempMaxMessages);
      setShowSettings(false);
      
      // Trim messages if new limit is lower
      setMessages((prev) => prev.slice(-tempMaxMessages));
    } catch (error) {
      console.error('Failed to save chat settings:', error);
    }
  };

  // Clear all messages
  const clearMessages = () => {
    if (window.confirm('Are you sure you want to clear all chat messages? This will only clear the display, not the database.')) {
      setMessages([]);
    }
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(1200), color: 'var(--text-color, #fff)', height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontWeight: 'bold', margin: 0 }}>Chat</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={clearMessages}
            style={{
              background: '#ff4444',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            Clear Display
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: '#3a8dde',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          style={{
            background: 'var(--surface, #23272b)',
            border: '1px solid #444',
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Chat Settings</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Maximum Messages to Display:
              <input
                type="number"
                min="10"
                max="1000"
                value={tempMaxMessages}
                onChange={(e) => setTempMaxMessages(parseInt(e.target.value) || 100)}
                style={{
                  marginLeft: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '6px 12px',
                  borderRadius: 4,
                  width: 100,
                }}
              />
            </label>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0 0' }}>
              Messages older than this limit will be removed from the display as new messages arrive.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={saveSettings}
              style={{
                background: '#00ff88',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setTempMaxMessages(maxMessages);
                setShowSettings(false);
              }}
              style={{
                background: '#666',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info Bar */}
      <div
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          fontSize: 14,
          color: '#888',
        }}
      >
        Showing {messages.length} messages (max: {maxMessages}) • Real-time chat • Messages persist across sessions
      </div>

      {/* Messages Display */}
      <div
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 16,
          height: 'calc(100vh - 300px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
            <p>No chat messages yet.</p>
            <p style={{ fontSize: 14 }}>Messages will appear here as viewers chat on your stream.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                padding: '8px 0',
                borderBottom: index < messages.length - 1 ? '1px solid #333' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  minWidth: 80,
                  fontSize: 12,
                  color: '#888',
                }}
              >
                {new Date(msg.time).toLocaleTimeString()}
              </div>
              <div
                style={{
                  minWidth: 70,
                  fontSize: 12,
                  color: '#666',
                  textTransform: 'capitalize',
                }}
              >
                {msg.platform}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: '#3a8dde', fontWeight: 'bold' }}>{msg.user}:</span>{' '}
                <span style={{ color: '#fff' }}>{msg.text}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Chat;
