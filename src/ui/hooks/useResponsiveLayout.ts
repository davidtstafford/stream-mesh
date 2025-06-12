// Hook for responsive layout based on navigation state
import { useState, useEffect } from 'react';

export const useResponsiveLayout = () => {
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('nav-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('nav-collapsed');
      setNavCollapsed(saved ? JSON.parse(saved) : false);
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from NavigationBar
    window.addEventListener('nav-collapse-change', (e: any) => {
      setNavCollapsed(e.detail.isCollapsed);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nav-collapse-change', handleStorageChange);
    };
  }, []);

  const getResponsiveMaxWidth = (baseWidth: number): number => {
    // When collapsed, we gain ~180px of extra space (240px -> 60px)
    // Add this extra space to the base width
    return navCollapsed ? baseWidth + 180 : baseWidth;
  };

  const getResponsiveContainerStyle = (baseMaxWidth: number) => ({
    maxWidth: getResponsiveMaxWidth(baseMaxWidth),
    margin: '0 auto',
    transition: 'max-width 0.3s ease'
  });

  return {
    navCollapsed,
    getResponsiveMaxWidth,
    getResponsiveContainerStyle
  };
};
