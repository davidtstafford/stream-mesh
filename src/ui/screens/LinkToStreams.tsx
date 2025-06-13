import React, { useEffect, useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const LinkToStreams: React.FC = () => {
  const [twitchUser, setTwitchUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // KIK state
  const [kickUser, setKickUser] = useState("");
  const [kickConnected, setKickConnected] = useState(false);
  const [kickLoading, setKickLoading] = useState(false);
  
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  useEffect(() => {
    // Load Twitch status
    window.electron.ipcRenderer.invoke("twitch:status").then((status) => {
      setTwitchUser(status.username || "");
      setConnected(!!status.connected);
      setLoading(false);
    });
    
    // Load KIK status
    window.electron.ipcRenderer.invoke("kick:status").then((status) => {
      setKickUser(status.username || "");
      setKickConnected(!!status.connected);
    }).catch((err) => {
      console.error('Failed to load KIK status:', err);
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

  // KIK handlers
  const handleKickOAuthConnect = async () => {
    setKickLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke("kick:oauth");
      if (result && result.accessToken && result.username) {
        setKickUser(result.username);
        setKickConnected(true);
      }
    } catch (err) {
      alert("KIK authentication failed.");
    }
    setKickLoading(false);
  };

  const handleKickDisconnect = async () => {
    setKickLoading(true);
    const status = await window.electron.ipcRenderer.invoke("kick:disconnect");
    setKickConnected(false);
    setKickUser("");
    setKickLoading(false);
  };

  return (
    <div
      style={{
        ...getResponsiveContainerStyle(400),
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

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: "#53fc18", fontWeight: "bold" }}>KIK</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={kickConnected || kickLoading}
            style={{
              background: "#53fc18",
              color: "#000",
              padding: "8px 16px",
              border: "none",
              borderRadius: 4,
              opacity: kickConnected || kickLoading ? 0.5 : 1,
              fontWeight: "bold",
            }}
            onClick={handleKickOAuthConnect}
          >
            Connect
          </button>
          <button
            disabled={!kickConnected || kickLoading}
            style={{
              background: "#333",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: 4,
              opacity: !kickConnected || kickLoading ? 0.5 : 1,
            }}
            onClick={handleKickDisconnect}
          >
            Disconnect
          </button>
        </div>
        {kickConnected && (
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
            <span style={{ fontWeight: "bold" }}>✔</span> Connected to KIK as {kickUser}
          </div>
        )}
      </section>
    </div>
  );
};

export default LinkToStreams;
