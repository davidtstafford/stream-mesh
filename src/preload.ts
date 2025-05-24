import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

// Expose APIs to renderer here if needed
contextBridge.exposeInMainWorld('api', {
  // Add backend APIs here
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  }
});
