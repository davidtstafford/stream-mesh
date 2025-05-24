// Global type declarations for Electron preload API
export {};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }

  interface ElectronAPI {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      // Add more methods if you expose them
    };
  }

  declare interface Window {
    electronAPI: ElectronAPI;
  }
}
