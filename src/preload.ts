import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

// Expose APIs to renderer here if needed
contextBridge.exposeInMainWorld('api', {
  // Add backend APIs here
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      // Wrap the listener to handle the event properly
      const wrappedListener = (event: any, ...args: any[]) => listener(...args);
      ipcRenderer.on(channel, wrappedListener);
      return wrappedListener;
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
    removeListener: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.removeListener(channel, listener),
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => ipcRenderer.invoke(...args),
    // You can add more methods if needed
  }
});
