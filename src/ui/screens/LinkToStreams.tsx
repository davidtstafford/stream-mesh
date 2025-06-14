import React, { useEffect, useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const LinkToStreams: React.FC = () => {
  const [twitchUser, setTwitchUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // KICK state
  const [kickUser, setKickUser] = useState("");
  const [kickConnected, setKickConnected] = useState(false);
  const [kickLoading, setKickLoading] = useState(false);
  
  // KICK credentials state
  const [kickClientId, setKickClientId] = useState("");
  const [kickClientSecret, setKickClientSecret] = useState("");
  const [kickCredentialsSaved, setKickCredentialsSaved] = useState(false);
  const [showKickCredentials, setShowKickCredentials] = useState(false);
  
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  useEffect(() => {
    // Load Twitch status
    window.electron.ipcRenderer.invoke("twitch:status").then((status) => {
      setTwitchUser(status.username || "");
      setConnected(!!status.connected);
      setLoading(false);
    });
    
    // Load KICK status
    window.electron.ipcRenderer.invoke("kick:status").then((status) => {
      setKickUser(status.username || "");
      setKickConnected(!!status.connected);
    }).catch((err) => {
      console.error('Failed to load KICK status:', err);
    });
    
    // Load KICK credentials
    window.electron.ipcRenderer.invoke("kick:loadCredentials").then((credentials) => {
      if (credentials && credentials.client_id && credentials.client_secret) {
        setKickClientId(credentials.client_id);
        setKickClientSecret(credentials.client_secret);
        setKickCredentialsSaved(true);
      }
    }).catch((err) => {
      console.error('Failed to load KICK credentials:', err);
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

  // KICK handlers
  const handleKickSaveCredentials = async () => {
    if (!kickClientId.trim() || !kickClientSecret.trim()) {
      alert("Please enter both Client ID and Client Secret");
      return;
    }
    
    try {
      await window.electron.ipcRenderer.invoke("kick:saveCredentials", {
        client_id: kickClientId.trim(),
        client_secret: kickClientSecret.trim()
      });
      setKickCredentialsSaved(true);
      setShowKickCredentials(false);
      alert("KICK credentials saved successfully!");
    } catch (err) {
      alert("Failed to save KICK credentials");
      console.error('Failed to save KICK credentials:', err);
    }
  };

  const handleKickDeleteCredentials = async () => {
    try {
      await window.electron.ipcRenderer.invoke("kick:deleteCredentials");
      setKickClientId("");
      setKickClientSecret("");
      setKickCredentialsSaved(false);
      setShowKickCredentials(false);
      alert("KICK credentials deleted successfully!");
    } catch (err) {
      alert("Failed to delete KICK credentials");
      console.error('Failed to delete KICK credentials:', err);
    }
  };

  const handleKickOAuthConnect = async () => {
    setKickLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke("kick:oauth");
      if (result && result.accessToken && result.username) {
        setKickUser(result.username);
        setKickConnected(true);
      }
    } catch (err) {
      alert("KICK authentication failed. Please check your credentials and try again.");
      console.error('KICK OAuth failed:', err);
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
        <h2 style={{ color: "#53fc18", fontWeight: "bold" }}>KICK</h2>
        
        {!kickCredentialsSaved ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, marginBottom: 12, color: "#ccc" }}>
              To connect to KICK, you need to create your own OAuth application. 
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  window.electron.ipcRenderer.invoke('open-external-url', 'https://kick.com/settings/developer?action=create');
                }}
                style={{ color: "#53fc18", marginLeft: 4 }}
              >
                Create one here
              </a>
            </p>
            
            {!showKickCredentials ? (
              <button
                style={{
                  background: "#53fc18",
                  color: "#000",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={() => setShowKickCredentials(true)}
              >
                Setup KICK Credentials
              </button>
            ) : (
              <div style={{ background: "#2a2a2a", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client ID:</label>
                  <input
                    type="text"
                    value={kickClientId}
                    onChange={(e) => setKickClientId(e.target.value)}
                    placeholder="Enter your KICK Client ID"
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client Secret:</label>
                  <input
                    type="password"
                    value={kickClientSecret}
                    onChange={(e) => setKickClientSecret(e.target.value)}
                    placeholder="Enter your KICK Client Secret"
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      background: "#53fc18",
                      color: "#000",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={handleKickSaveCredentials}
                  >
                    Save Credentials
                  </button>
                  <button
                    style={{
                      background: "#666",
                      color: "#fff",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                    onClick={() => setShowKickCredentials(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
                  cursor: kickConnected || kickLoading ? "not-allowed" : "pointer"
                }}
                onClick={handleKickOAuthConnect}
              >
                {kickLoading ? "Connecting..." : "Connect"}
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
                  cursor: !kickConnected || kickLoading ? "not-allowed" : "pointer"
                }}
                onClick={handleKickDisconnect}
              >
                Disconnect
              </button>
              <button
                disabled={kickConnected}
                style={{
                  background: "#666",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  opacity: kickConnected ? 0.5 : 1,
                  cursor: kickConnected ? "not-allowed" : "pointer"
                }}
                onClick={() => setShowKickCredentials(true)}
              >
                Edit Credentials
              </button>
              <button
                disabled={kickConnected}
                style={{
                  background: "#cc2936",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  opacity: kickConnected ? 0.5 : 1,
                  cursor: kickConnected ? "not-allowed" : "pointer"
                }}
                onClick={handleKickDeleteCredentials}
              >
                Delete Credentials
              </button>
            </div>
            
            {showKickCredentials && (
              <div style={{ background: "#2a2a2a", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client ID:</label>
                  <input
                    type="text"
                    value={kickClientId}
                    onChange={(e) => setKickClientId(e.target.value)}
                    placeholder="Enter your KICK Client ID"
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client Secret:</label>
                  <input
                    type="password"
                    value={kickClientSecret}
                    onChange={(e) => setKickClientSecret(e.target.value)}
                    placeholder="Enter your KICK Client Secret"
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      background: "#53fc18",
                      color: "#000",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={handleKickSaveCredentials}
                  >
                    Save Credentials
                  </button>
                  <button
                    style={{
                      background: "#666",
                      color: "#fff",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                    onClick={() => setShowKickCredentials(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
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
            <span style={{ fontWeight: "bold" }}>✔</span> Connected to KICK as {kickUser}
          </div>
        )}
      </section>
    </div>
  );
};

export default LinkToStreams;
