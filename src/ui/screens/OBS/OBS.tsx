import React from 'react';

const OBS: React.FC = () => {

  const chatUrl = 'http://localhost:3001/obs/chat';
  const [copied, setCopied] = React.useState(false);

  const [connections, setConnections] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const fetchConnections = () => {
      fetch('http://localhost:3001/obs/chat/connections')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setConnections(typeof data.connections === 'number' ? data.connections : null);
        })
        .catch(() => {
          if (!cancelled) setConnections(null);
        });
    };
    fetchConnections();
    const interval = setInterval(fetchConnections, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(chatUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ marginTop: 24 }}>OBS Integration</h2>
      <p>
        To add the chat overlay to OBS, copy the URL below and add it as a <b>Browser Source</b> in OBS Studio.<br />
        The overlay will show your live chat with Stream Mesh formatting.
      </p>
      <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center' }}>
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
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            borderRadius: 4,
            border: 'none',
            background: copied ? '#3a8dde' : '#444',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ color: '#3ad67d', marginTop: 8, fontSize: 15, minHeight: 22 }}>
        {connections === null && 'Checking active connections...'}
        {typeof connections === 'number' && connections === 0 && 'No applications are currently accessing the overlay.'}
        {typeof connections === 'number' && connections === 1 && '1 application is currently accessing the overlay.'}
        {typeof connections === 'number' && connections > 1 && `${connections} applications are currently accessing the overlay.`}
      </div>
      <div style={{ color: '#aaa', marginTop: 16, fontSize: 15 }}>
        <b>Tip:</b> You can resize the browser source in OBS to fit your stream layout. The overlay background is transparent.
      </div>
    </div>
  );
};

export default OBS;
