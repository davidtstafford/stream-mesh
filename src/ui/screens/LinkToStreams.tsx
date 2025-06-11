import React, { useEffect, useState } from 'react';

const LinkToStreams: React.FC = () => {
  const [twitchUser, setTwitchUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.ipcRenderer.invoke("twitch:status").then((status) => {
      setTwitchUser(status.username || "");
      setConnected(!!status.connected);
      setLoading(false);
    });
  }, []);

  const handleOAuthConnect = async () => {
    setLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke("twitch:oauth");
      if (result && result.accessToken && result.username) {
        setTwitchUser(result.username);
        setConnected(true);
        // Optionally, store the access token for future use
      }
    } catch (err) {
      alert("Twitch authentication failed.");
    }
    setLoading(false);
  };
  const handleDisconnect = async () => {
    setLoading(true);
    const status = await window.electron.ipcRenderer.invoke("twitch:disconnect");
    setConnected(false);
    setTwitchUser("");
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "0 auto",
        color: "var(--text-color, #fff)",
      }}
    >
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: "#9147ff", fontWeight: "bold" }}>TWITCH</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={connected || loading}
            style={{
              background: "#9147ff",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: 4,
              opacity: connected || loading ? 0.5 : 1,
            }}
            onClick={handleOAuthConnect}
          >
            Connect
          </button>
          <button
            disabled={!connected || loading}
            style={{
              background: "#333",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: 4,
              opacity: !connected || loading ? 0.5 : 1,
            }}
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
        {connected && (
          <div
            style={{
              background: "#2ecc40",
              color: "#fff",
              borderRadius: 4,
              padding: 8,
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: "bold" }}>✔</span> Connected to Twitch
          </div>
        )}
      </section>
    </div>
  );
};

export default LinkToStreams;
