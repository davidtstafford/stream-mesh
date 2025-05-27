import React, { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  platform: string;
  user: string;
  time: string;
  message: string;
  color: string;
  platformLabel: string;
  timeFormatted: string;
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // On mount, fetch recent chat messages from the database
  useEffect(() => {
    let mounted = true;
    window.electron.ipcRenderer.invoke('chat:fetch', { platform: 'twitch', format: 'formatted' })
      .then((rows: any[]) => {
        if (!mounted) return;
        setMessages(rows || []);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = (_event: any, msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    window.electron.ipcRenderer.on('chat:live', handler);
    return () => {
      window.electron.ipcRenderer.removeAllListeners('chat:live');
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);



  return (
    <div style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#9147ff', fontWeight: 'bold' }}>Chat</h2>
      <div ref={chatRef} style={{ border: '1px solid #444', borderRadius: 8, padding: 16, height: 400, overflowY: 'auto', background: '#23272b' }}>
        <div style={{ fontWeight: 'bold', color: '#9147ff' }}>System: <span style={{ color: '#fff', fontWeight: 'normal' }}>Welcome to Stream Mesh Chat!</span></div>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginTop: 8 }}>
            <span style={{ color: '#888', fontWeight: 'bold', marginRight: 6 }}>{msg.platformLabel}</span>
            <span style={{ color: msg.color, fontWeight: 'bold' }}>{msg.user}</span>
            <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>{msg.timeFormatted}</span>
            <span style={{ color: '#fff', marginLeft: 8 }}>{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chat;
