import React from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const CustomCommands: React.FC = () => {
  const { getResponsiveContainerStyle } = useResponsiveLayout();
  
  return (
    <div style={{ ...getResponsiveContainerStyle(700), color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 8 }}>Custom Commands</h2>
      <div style={{ color: '#aaa', marginBottom: 16 }}>
        Create and manage your own chat commands. (Coming soon)
      </div>
    </div>
  );
};

export default CustomCommands;
