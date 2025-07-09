import React from 'react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const OBS: React.FC = () => {
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // State for IP address
  const [localIP, setLocalIP] = React.useState<string>('localhost');

  // Fetch local IP address on component mount
  React.useEffect(() => {
    const fetchIP = async () => {
      try {
        const ip = await (window as any).electron.ipcRenderer.invoke('network:getLocalIP');
        setLocalIP(ip);
      } catch (error) {
        console.error('Failed to fetch local IP:', error);
        setLocalIP('localhost'); // Fallback to localhost
      }
    };
    fetchIP();
  }, []);

  // Chat overlay logic
  const chatUrl = `http://${localIP}:3001/obs/chat`;
  const [copiedChat, setCopiedChat] = React.useState(false);
  const [connectionsChat, setConnectionsChat] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const fetchConnections = () => {
      fetch(`http://${localIP}:3001/obs/chat/connections`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setConnectionsChat(typeof data.connections === 'number' ? data.connections : null);
        })
        .catch(() => {
          if (!cancelled) setConnectionsChat(null);
        });
    };
    fetchConnections();
    const interval = setInterval(fetchConnections, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [localIP]);
  const handleCopyChat = () => {
    navigator.clipboard.writeText(chatUrl);
    setCopiedChat(true);
    setTimeout(() => setCopiedChat(false), 1200);
  };

  // TTS overlay logic
  const ttsUrl = `http://${localIP}:3001/obs/tts`;
  const [copiedTTS, setCopiedTTS] = React.useState(false);
  const [connectionsTTS, setConnectionsTTS] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const fetchConnections = () => {
      fetch(`http://${localIP}:3001/obs/tts/connections`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setConnectionsTTS(typeof data.connections === 'number' ? data.connections : null);
        })
        .catch(() => {
          if (!cancelled) setConnectionsTTS(null);
        });
    };
    fetchConnections();
    const interval = setInterval(fetchConnections, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [localIP]);
  const handleCopyTTS = () => {
    navigator.clipboard.writeText(ttsUrl);
    setCopiedTTS(true);
    setTimeout(() => setCopiedTTS(false), 1200);
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(600), color: '#fff' }}>
      <h2 style={{ marginTop: 24 }}>OBS Integration</h2>

      {/* IP Address Information */}
      <div style={{ 
        background: '#2a2a2a', 
        border: '1px solid #444', 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 24,
        fontSize: 14
      }}>
        <div style={{ marginBottom: 8 }}>
          <strong style={{ color: '#3a8dde' }}>Network Information:</strong>
        </div>
        <div style={{ color: '#aaa' }}>
          Local IP Address: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{localIP}</span>
        </div>
        <div style={{ color: '#aaa', marginTop: 8, fontSize: 12 }}>
          💡 This IP address allows OBS on other devices to connect to your Stream Mesh overlays.
        </div>
      </div>

      {/* Chat Overlay Section */}
      <h3 style={{ marginTop: 32 }}>Chat Overlay</h3>
      <p>
        To add the chat overlay to OBS, copy the URL below and add it as a <b>Browser Source</b> in OBS Studio.<br />
        The overlay will show your live chat with Stream Mesh formatting.
      </p>
      <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={chatUrl}
          readOnly
          style={{
            flex: 1,
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            marginRight: 8,
          }}
        />
        <button
          onClick={handleCopyChat}
          style={{
            padding: '8px 16px',
            borderRadius: 4,
            border: 'none',
            background: copiedChat ? '#3a8dde' : '#444',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          {copiedChat ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ color: '#3ad67d', marginTop: 8, fontSize: 15, minHeight: 22 }}>
        {connectionsChat === null && 'Checking active connections...'}
        {typeof connectionsChat === 'number' && connectionsChat === 0 && 'No applications are currently accessing the overlay.'}
        {typeof connectionsChat === 'number' && connectionsChat === 1 && '1 application is currently accessing the overlay.'}
        {typeof connectionsChat === 'number' && connectionsChat > 1 && `${connectionsChat} applications are currently accessing the overlay.`}
      </div>
      <div style={{ color: '#aaa', marginTop: 8, fontSize: 15 }}>
        <b>Tip:</b> You can resize the browser source in OBS to fit your stream layout. The overlay background is transparent.
      </div>

      {/* TTS Overlay Section */}
      <h3 style={{ marginTop: 32 }}>TTS Overlay</h3>
      <p>
        To add the TTS (Text-to-Speech) audio overlay to OBS, copy the URL below and add it as a <b>Browser Source</b> in OBS Studio.<br />
        The overlay will play TTS audio alerts in real time as they are triggered.
      </p>
      <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={ttsUrl}
          readOnly
          style={{
            flex: 1,
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            marginRight: 8,
          }}
        />
        <button
          onClick={handleCopyTTS}
          style={{
            padding: '8px 16px',
            borderRadius: 4,
            border: 'none',
            background: copiedTTS ? '#3a8dde' : '#444',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          {copiedTTS ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ color: '#3ad67d', marginTop: 8, fontSize: 15, minHeight: 22 }}>
        {connectionsTTS === null && 'Checking active connections...'}
        {typeof connectionsTTS === 'number' && connectionsTTS === 0 && 'No applications are currently accessing the overlay.'}
        {typeof connectionsTTS === 'number' && connectionsTTS === 1 && '1 application is currently accessing the overlay.'}
        {typeof connectionsTTS === 'number' && connectionsTTS > 1 && `${connectionsTTS} applications are currently accessing the overlay.`}
      </div>
      <div style={{ color: '#aaa', marginTop: 8, fontSize: 15 }}>
        <b>Tip:</b> You can resize the browser source in OBS to fit your stream layout. The overlay background is transparent and will only play audio when a TTS event is triggered.
      </div>
    </div>
  );
};

export default OBS;
