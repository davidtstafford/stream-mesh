import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Preferences: React.FC = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', color: 'var(--text-color, #fff)' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Preferences</h2>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Theme</div>
        <label style={{ marginRight: 16 }}>
          <input type="radio" name="theme" checked={theme === 'system'} onChange={() => setTheme('system')} /> System
        </label>
        <label style={{ marginRight: 16 }}>
          <input type="radio" name="theme" checked={theme === 'light'} onChange={() => setTheme('light')} /> Light
        </label>
        <label>
          <input type="radio" name="theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} /> Dark
        </label>
        <div style={{ color: '#aaa', marginTop: 8 }}>
          The theme setting controls the appearance of Stream Mesh. 'System' will follow your OS preference.
        </div>
      </div>
    </div>
  );
};

export default Preferences;
