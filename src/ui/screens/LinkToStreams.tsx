import React, { useEffect, useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const LinkToStreams: React.FC = () => {
  const [twitchUser, setTwitchUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Twitch credentials state
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchCredentialsSaved, setTwitchCredentialsSaved] = useState(false);
  const [showTwitchCredentials, setShowTwitchCredentials] = useState(false);
  const [showTwitchInstructions, setShowTwitchInstructions] = useState(false);
  
  // KICK state
  const [kickUser, setKickUser] = useState("");
  const [kickConnected, setKickConnected] = useState(false);
  const [kickLoading, setKickLoading] = useState(false);
  
  // KICK credentials state
  const [kickClientId, setKickClientId] = useState("");
  const [kickClientSecret, setKickClientSecret] = useState("");
  const [kickCredentialsSaved, setKickCredentialsSaved] = useState(false);
  const [showKickCredentials, setShowKickCredentials] = useState(false);
  const [showKickInstructions, setShowKickInstructions] = useState(false);
  
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  useEffect(() => {
    // Load Twitch status
    window.electron.ipcRenderer.invoke("twitch:status").then((status) => {
      setTwitchUser(status.username || "");
      setConnected(!!status.connected);
      setLoading(false);
    });
    
    // Load Twitch credentials
    window.electron.ipcRenderer.invoke("twitch:loadCredentials").then((credentials) => {
      if (credentials && credentials.client_id) {
        setTwitchClientId(credentials.client_id);
        setTwitchCredentialsSaved(true);
      }
    }).catch((err) => {
      console.error('Failed to load Twitch credentials:', err);
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
      alert("Twitch authentication failed. Please check your credentials and try again.");
      console.error('Twitch OAuth failed:', err);
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

  // Twitch credential handlers
  const handleTwitchSaveCredentials = async () => {
    if (!twitchClientId.trim()) {
      alert("Please enter your Twitch Client ID");
      return;
    }
    
    try {
      await window.electron.ipcRenderer.invoke("twitch:saveCredentials", {
        client_id: twitchClientId.trim()
      });
      setTwitchCredentialsSaved(true);
      setShowTwitchCredentials(false);
      alert("Twitch credentials saved successfully!");
    } catch (err) {
      alert("Failed to save Twitch credentials");
      console.error('Failed to save Twitch credentials:', err);
    }
  };

  const handleTwitchDeleteCredentials = async () => {
    try {
      await window.electron.ipcRenderer.invoke("twitch:deleteCredentials");
      setTwitchClientId("");
      setTwitchCredentialsSaved(false);
      setShowTwitchCredentials(false);
      alert("Twitch credentials deleted successfully!");
    } catch (err) {
      alert("Failed to delete Twitch credentials");
      console.error('Failed to delete Twitch credentials:', err);
    }
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
        
        {!twitchCredentialsSaved ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, marginBottom: 12, color: "#ccc" }}>
              To connect to Twitch, you need to create your own OAuth application. 
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  window.electron.ipcRenderer.invoke('open-external-url', 'https://dev.twitch.tv/console/apps/create');
                }}
                style={{ color: "#9147ff", marginLeft: 4 }}
              >
                Create one here
              </a>
            </p>
            
            {/* Instructions Section */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowTwitchInstructions(!showTwitchInstructions)}
                style={{
                  background: "transparent",
                  border: "1px solid #444",
                  color: "#ccc",
                  padding: "6px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span style={{ transform: showTwitchInstructions ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                Setup Instructions
              </button>
              
              {showTwitchInstructions && (
                <div style={{ 
                  background: "#1a1a1a", 
                  border: "1px solid #333", 
                  borderRadius: 6, 
                  padding: 16, 
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.4
                }}>
                  <h4 style={{ color: "#9147ff", marginTop: 0, marginBottom: 12, fontSize: 14 }}>
                    How to Create Your Twitch OAuth Application:
                  </h4>
                  
                  <ol style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 8 }}>
                      Click the "Create one here" link above to open Twitch Developer Console
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      Fill in the application details:
                      <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#9147ff" }}>Name:</strong> This must be unique (e.g., "Stream Mesh [YourUsername]")
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#9147ff" }}>OAuth Redirect URLs:</strong> 
                          <code style={{ 
                            background: "#2a2a2a", 
                            padding: "2px 6px", 
                            borderRadius: 3, 
                            marginLeft: 6,
                            color: "#fff",
                            fontSize: 12
                          }}>
                            http://localhost:3300/auth/twitch/callback
                          </code>
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#9147ff" }}>Category:</strong> Application Integration
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#9147ff" }}>Client Type:</strong> Public
                        </li>
                      </ul>
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      Click "Create" to save your application
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      After creation, click "Manage" on your application
                    </li>
                    <li style={{ marginBottom: 0 }}>
                      Copy the <strong style={{ color: "#9147ff" }}>Client ID</strong> from the application details
                    </li>
                  </ol>
                  
                  <div style={{ 
                    background: "#2a2a2a", 
                    border: "1px solid #9147ff", 
                    borderRadius: 4, 
                    padding: 12, 
                    marginTop: 16,
                    fontSize: 12
                  }}>
                    <strong style={{ color: "#9147ff" }}>💡 Note:</strong> Unlike other platforms, Twitch only requires a Client ID for public applications. No Client Secret is needed.
                  </div>
                  
                  <div style={{ 
                    background: "#2a2a2a", 
                    border: "1px solid #ff4d4f", 
                    borderRadius: 4, 
                    padding: 12, 
                    marginTop: 12,
                    fontSize: 12
                  }}>
                    <strong style={{ color: "#ff4d4f" }}>⚠️ Important:</strong> Your Client ID is stored locally on your computer only. The application name must be unique across all Twitch apps.
                  </div>
                </div>
              )}
            </div>
            
            {!showTwitchCredentials ? (
              <button
                style={{
                  background: "#9147ff",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={() => setShowTwitchCredentials(true)}
              >
                Setup Twitch Credentials
              </button>
            ) : (
              <div style={{ background: "#2a2a2a", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client ID:</label>
                  <input
                    type="text"
                    value={twitchClientId}
                    onChange={(e) => setTwitchClientId(e.target.value)}
                    placeholder="Enter your Twitch Client ID"
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
                      background: "#9147ff",
                      color: "#fff",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={handleTwitchSaveCredentials}
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
                    onClick={() => setShowTwitchCredentials(false)}
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
                disabled={connected || loading}
                style={{
                  background: "#9147ff",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  opacity: connected || loading ? 0.5 : 1,
                  fontWeight: "bold",
                  cursor: connected || loading ? "not-allowed" : "pointer"
                }}
                onClick={handleOAuthConnect}
              >
                {loading ? "Connecting..." : "Connect"}
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
                  cursor: !connected || loading ? "not-allowed" : "pointer"
                }}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
              <button
                disabled={connected}
                style={{
                  background: "#666",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  opacity: connected ? 0.5 : 1,
                  cursor: connected ? "not-allowed" : "pointer"
                }}
                onClick={() => setShowTwitchCredentials(true)}
              >
                Edit Credentials
              </button>
              <button
                disabled={connected}
                style={{
                  background: "#cc2936",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  opacity: connected ? 0.5 : 1,
                  cursor: connected ? "not-allowed" : "pointer"
                }}
                onClick={handleTwitchDeleteCredentials}
              >
                Delete Credentials
              </button>
            </div>
            
            {showTwitchCredentials && (
              <div style={{ background: "#2a2a2a", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Client ID:</label>
                  <input
                    type="text"
                    value={twitchClientId}
                    onChange={(e) => setTwitchClientId(e.target.value)}
                    placeholder="Enter your Twitch Client ID"
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
                      background: "#9147ff",
                      color: "#fff",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    onClick={handleTwitchSaveCredentials}
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
                    onClick={() => setShowTwitchCredentials(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
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
            <span style={{ fontWeight: "bold" }}>✔</span> Connected to Twitch as {twitchUser}
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
            
            {/* Instructions Section */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowKickInstructions(!showKickInstructions)}
                style={{
                  background: "transparent",
                  border: "1px solid #444",
                  color: "#ccc",
                  padding: "6px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span style={{ transform: showKickInstructions ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                Setup Instructions
              </button>
              
              {showKickInstructions && (
                <div style={{ 
                  background: "#1a1a1a", 
                  border: "1px solid #333", 
                  borderRadius: 6, 
                  padding: 16, 
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.4
                }}>
                  <h4 style={{ color: "#53fc18", marginTop: 0, marginBottom: 12, fontSize: 14 }}>
                    How to Create Your KICK OAuth Application:
                  </h4>
                  
                  <ol style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 8 }}>
                      Click the "Create one here" link above to open KICK Developer Portal
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      Fill in the application details:
                      <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#53fc18" }}>Application Name:</strong> Stream Mesh (or any name you prefer)
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#53fc18" }}>Description:</strong> Desktop application for stream management
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#53fc18" }}>Redirect URL:</strong> 
                          <code style={{ 
                            background: "#2a2a2a", 
                            padding: "2px 6px", 
                            borderRadius: 3, 
                            marginLeft: 6,
                            color: "#fff",
                            fontSize: 12
                          }}>
                            http://localhost:3301/auth/kick/callback
                          </code>
                        </li>
                        <li style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#53fc18" }}>Enable Webhooks:</strong> Leave blank (not required)
                        </li>
                      </ul>
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#53fc18" }}>Scopes Requested:</strong> Select the following permissions:
                      <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                        <li style={{ marginBottom: 2 }}>✓ Read stream key</li>
                        <li style={{ marginBottom: 2 }}>✓ Read channel information</li>
                        <li style={{ marginBottom: 2 }}>✓ Write to Chat feed</li>
                        <li style={{ marginBottom: 2 }}>✓ Subscribe to events (read chat feed, follows, subscribes, gifts)</li>
                      </ul>
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      Click "Create Application" to save
                    </li>
                    <li style={{ marginBottom: 0 }}>
                      Copy the <strong style={{ color: "#53fc18" }}>Client ID</strong> and <strong style={{ color: "#53fc18" }}>Client Secret</strong> from the application details page
                    </li>
                  </ol>
                  
                  <div style={{ 
                    background: "#2a2a2a", 
                    border: "1px solid #53fc18", 
                    borderRadius: 4, 
                    padding: 12, 
                    marginTop: 16,
                    fontSize: 12
                  }}>
                    <strong style={{ color: "#53fc18" }}>⚠️ Important:</strong> Keep your Client Secret secure and never share it publicly. 
                    It will be stored locally on your computer only.
                  </div>
                </div>
              )}
            </div>
            
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
