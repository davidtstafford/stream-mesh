import React, { useEffect, useState } from 'react';
import { usePollyConfig } from './hooks/usePollyConfig';

interface PollyConfigSectionProps {
  // onHelp prop removed - instructions are now inline
}

const PollyConfigSection: React.FC<PollyConfigSectionProps> = () => {
  const {
    accessKeyId,
    setAccessKeyId,
    secretAccessKey,
    setSecretAccessKey,
    region,
    setRegion,
    saving,
    status,
    setStatus,
    savePollyConfig,
    configLoaded,
  } = usePollyConfig();

  // Collapse if all required fields are present and loaded (on initial load only)
  const [collapsed, setCollapsed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  useEffect(() => {
    if (configLoaded && accessKeyId && secretAccessKey && region) {
      setCollapsed(true);
    }
    // Do not auto-expand if already collapsed and user is editing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded]);

  // Expand if user starts editing
  const handleInputChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCollapsed(false);
    setter(e.target.value);
  };

  return (
    <div style={{
      marginBottom: 24,
      border: '1px solid #444',
      borderRadius: 8,
      background: '#23272e',
      boxShadow: '0 2px 8px #0002',
      position: 'relative',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '12px 16px',
          borderBottom: collapsed ? 'none' : '1px solid #444',
          background: '#23272e',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ fontWeight: 'bold', fontSize: 18, color: '#00bfff', flex: 1 }}>
          Amazon Polly (Cloud TTS) <span style={{ color: '#ff4d4f', fontWeight: 600 }}>*</span>
        </span>
        <span style={{ color: '#aaa', fontSize: 14, marginRight: 12 }}>
          {collapsed ? 'Show' : 'Hide'}
        </span>
        <span style={{ fontSize: 22, color: '#aaa' }}>{collapsed ? '+' : '–'}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: 16 }}>
          <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 8 }}>
            Amazon Polly setup is <b>required</b> for TTS to work.
          </div>
          <div style={{ color: '#aaa', marginBottom: 12 }}>
            Enter your AWS credentials and region to enable Text-to-Speech. This is a one-time setup.
          </div>
          <input placeholder="Access Key ID" value={accessKeyId} onChange={handleInputChange(setAccessKeyId)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
          <input placeholder="Secret Access Key" type="password" value={secretAccessKey} onChange={handleInputChange(setSecretAccessKey)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
          <input placeholder="AWS Region (e.g. us-east-1)" value={region} onChange={handleInputChange(setRegion)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #333', marginBottom: 8 }} />
          <button onClick={() => savePollyConfig()} disabled={saving} style={{ background: '#3a3f4b', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>{saving ? 'Saving...' : 'Save Polly Config'}</button>
          {status && <div style={{ color: status === 'Polly config saved!' ? '#2ecc40' : '#ff4d4f', marginTop: 8 }}>{status}</div>}
          
          {/* Instructions Section */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                background: "transparent",
                border: "1px solid #444",
                color: "#00bfff",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span style={{ transform: showInstructions ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
              Need help? See the TTS setup guide
            </button>
            
            {showInstructions && (
              <div style={{ 
                background: "#1a1a1a", 
                border: "1px solid #333", 
                borderRadius: 6, 
                padding: 16, 
                marginTop: 8,
                fontSize: 13,
                lineHeight: 1.4
              }}>
                <h4 style={{ color: "#00bfff", marginTop: 0, marginBottom: 12, fontSize: 14 }}>
                  How to Set Up Amazon Polly TTS:
                </h4>
                
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ color: "#00bfff", marginBottom: 8, fontSize: 13 }}>Step 1: Create AWS Account</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 4 }}>
                      Go to <a href="#" onClick={(e) => { e.preventDefault(); window.electron?.ipcRenderer?.invoke('open-external-url', 'https://aws.amazon.com/'); }} style={{ color: "#00bfff" }}>aws.amazon.com</a> and create a free account
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Sign in to the AWS Management Console
                    </li>
                  </ol>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ color: "#00bfff", marginBottom: 8, fontSize: 13 }}>Step 2: Create IAM User for Polly</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 4 }}>
                      Navigate to <strong>IAM</strong> service in AWS Console
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Click <strong>"Users"</strong> → <strong>"Create User"</strong>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Enter username: <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 3, color: "#fff" }}>stream-mesh-polly</code>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Select <strong>"Attach policies directly"</strong>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Search for and select: <strong>AmazonPollyFullAccess</strong>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Complete user creation
                    </li>
                  </ol>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ color: "#00bfff", marginBottom: 8, fontSize: 13 }}>Step 3: Create Access Keys</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 4 }}>
                      Click on the created user name
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Go to <strong>"Security credentials"</strong> tab
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Click <strong>"Create access key"</strong>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Select <strong>"Application running outside AWS"</strong>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      Add description: <em>"Stream Mesh TTS access"</em>
                    </li>
                    <li style={{ marginBottom: 4 }}>
                      <strong>Important:</strong> Copy both <strong style={{ color: "#00bfff" }}>Access Key ID</strong> and <strong style={{ color: "#00bfff" }}>Secret Access Key</strong>
                    </li>
                  </ol>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ color: "#00bfff", marginBottom: 8, fontSize: 13 }}>Step 4: Choose AWS Region</h5>
                  <p style={{ color: "#ddd", margin: "0 0 8px 0" }}>
                    Common regions for Polly:
                  </p>
                  <ul style={{ paddingLeft: 20, margin: 0, color: "#ddd" }}>
                    <li style={{ marginBottom: 2 }}>
                      <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 3, color: "#fff" }}>us-east-1</code> - US East (N. Virginia)
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 3, color: "#fff" }}>us-west-2</code> - US West (Oregon)
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 3, color: "#fff" }}>eu-west-1</code> - Europe (Ireland)
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 3, color: "#fff" }}>ap-southeast-2</code> - Asia Pacific (Sydney)
                    </li>
                  </ul>
                </div>

                <div style={{ 
                  background: "#2a2a2a", 
                  border: "1px solid #00bfff", 
                  borderRadius: 4, 
                  padding: 12, 
                  marginTop: 16,
                  fontSize: 12
                }}>
                  <strong style={{ color: "#00bfff" }}>💡 Cost Information:</strong> Amazon Polly offers a generous free tier with 5 million characters per month for the first 12 months. After that, pricing is typically $4.00 per 1 million characters for standard voices.
                </div>

                <div style={{ 
                  background: "#2a2a2a", 
                  border: "1px solid #ff4d4f", 
                  borderRadius: 4, 
                  padding: 12, 
                  marginTop: 12,
                  fontSize: 12
                }}>
                  <strong style={{ color: "#ff4d4f" }}>⚠️ Security:</strong> Your AWS credentials are stored locally and never shared. Keep them secure and never share them publicly. You can rotate access keys anytime in the AWS Console.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {(!accessKeyId || !secretAccessKey || !region) && collapsed && (
        <div style={{ color: '#ff4d4f', fontSize: 13, padding: '0 16px 12px 16px' }}>
          <b>Required:</b> Please complete Amazon Polly setup above to enable TTS.
        </div>
      )}
    </div>
  );
};

export default PollyConfigSection;
