import React, { useEffect, useState } from 'react';

type ChatMessage = {
  id: number;
  user: string;
  user_id: string;
  platform: string;
  time: string;
  text: string;
};

const ChatHistory: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState('');
  const [platform, setPlatform] = useState('');
  const [text, setText] = useState('');
  const [searching, setSearching] = useState(false);

  // Fetch messages with optional filters
  const fetchMessages = async (filters = {}) => {
    setLoading(true);
    const rows = await window.electron.ipcRenderer.invoke('chat:fetch', filters);
    setMessages(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    await fetchMessages({ user, platform, text });
    setSearching(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all chat messages?')) return;
    setLoading(true);
    await window.electron.ipcRenderer.invoke('chat:deleteAll');
    await fetchMessages();
  };

  const handleDeleteRow = async (id: number) => {
    if (!window.confirm('Delete this message?')) return;
    setLoading(true);
    await window.electron.ipcRenderer.invoke('chat:deleteById', id);
    await fetchMessages({ user, platform, text });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', color: 'var(--text-color, #fff)' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Chat History</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="User" value={user} onChange={e => setUser(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #333' }} />
        <input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #333' }} />
        <input placeholder="Text" value={text} onChange={e => setText(e.target.value)} style={{ flex: 2, padding: 8, borderRadius: 4, border: '1px solid #333' }} />
        <button onClick={handleSearch} disabled={searching} style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>{searching ? 'Searching...' : 'Search'}</button>
        <button onClick={handleDeleteAll} style={{ background: '#ff4d4f', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Delete All</button>
      </div>
      <table style={{ width: '100%', background: 'var(--surface, #23272b)', borderRadius: 8, borderCollapse: 'collapse' }}>
        <thead style={{ background: 'var(--background, #181c20)' }}>
          <tr>
            <th>ID</th><th>User</th><th>User ID</th><th>Platform</th><th>Time</th><th>Text</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
          ) : messages.length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa' }}>No messages found</td></tr>
          ) : (
            messages.map(msg => (
              <tr key={msg.id}>
                <td>{msg.id}</td>
                <td>{msg.user}</td>
                <td>{msg.user_id}</td>
                <td>{msg.platform}</td>
                <td>{msg.time}</td>
                <td>{msg.text}</td>
                <td><button onClick={() => handleDeleteRow(msg.id)} style={{ background: '#ff7875', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <div>
          <button style={{ marginRight: 8 }} disabled>Prev</button>
          <button disabled>Next</button>
          <span style={{ marginLeft: 16 }}>Page 1 / 1</span>
        </div>
        <div>{messages.length} messages</div>
      </div>
    </div>
  );
};

export default ChatHistory;
