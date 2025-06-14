import React, { useEffect, useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Add shimmer animation styles
const injectShimmerStyles = () => {
  if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('kick-shimmer-styles');
    if (!existingStyle) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'kick-shimmer-styles';
      styleSheet.textContent = `
        @keyframes shimmer {
          0% { transform: translateX(-100%); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0.4; }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }
};

const LinkToStreams: React.FC = () => {
  const [twitchUser, setTwitchUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Twitch credentials state
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchCredentialsSaved, setTwitchCredentialsSaved] = useState(false);
  const [showTwitchCredentials, setShowTwitchCredentials] = useState(false);
  const [showTwitchInstructions, setShowTwitchInstructions] = useState(false);
  
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  useEffect(() => {
    // Inject shimmer animation styles
    injectShimmerStyles();
    
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
        
        {/* Coming Soon Message */}
        <div style={{ 
          background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)", 
          border: "2px solid #53fc18", 
          borderRadius: 8, 
          padding: 20, 
          marginBottom: 16,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent 0%, #53fc18 50%, transparent 100%)",
            animation: "shimmer 2s ease-in-out infinite alternate"
          }} />
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{
              background: "#53fc18",
              color: "#000",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: "bold"
            }}>
              COMING SOON
            </div>
            <h3 style={{ margin: 0, color: "#53fc18", fontSize: 18 }}>Real-time Events</h3>
          </div>
          
          <p style={{ 
            fontSize: 14, 
            lineHeight: 1.5, 
            color: "#ccc", 
            margin: "0 0 16px 0" 
          }}>
            KICK integration is currently limited because KICK's API only supports webhooks for real-time events 
            (like chat messages, follows, subscriptions). Webhooks require a publicly accessible web server, 
            which isn't practical for desktop applications.
          </p>
          
          <p style={{ 
            fontSize: 13, 
            lineHeight: 1.4, 
            color: "#888", 
            margin: "0 0 16px 0" 
          }}>
            We're waiting for KICK to add WebSocket support for real-time events. KICK has acknowledged this 
            need and it's on their roadmap, but no timeline has been announced yet.
          </p>
          
          <div style={{ 
            background: "#1a1a1a", 
            border: "1px solid #333", 
            borderRadius: 6, 
            padding: 12,
            fontSize: 12
          }}>
            <strong style={{ color: "#53fc18" }}>💡 Current Status:</strong>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "#aaa" }}>
              <li>✅ Authentication & API integration completed</li>
              <li>✅ Chat message sending works</li>
              <li>❌ Real-time chat/events blocked by API limitations</li>
              <li>🔄 Waiting for KICK WebSocket API support</li>
            </ul>
          </div>
        </div>

      </section>
    </div>
  );
};

export default LinkToStreams;
