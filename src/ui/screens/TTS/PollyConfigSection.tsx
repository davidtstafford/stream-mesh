import React, { useEffect, useState } from 'react';
import { usePollyConfig } from './hooks/usePollyConfig';

interface PollyConfigSectionProps {
  onHelp: () => void;
}

const PollyConfigSection: React.FC<PollyConfigSectionProps> = ({ onHelp }) => {
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
          <div style={{ marginTop: 12 }}>
            <span
              onClick={onHelp}
              style={{ color: '#00bfff', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
              title="Open the TTS setup guide"
            >
              Need help? See the TTS setup guide
            </span>
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
