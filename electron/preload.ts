import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopInfo {
  name: string;
  version: string;
  electron: string;
  platform: string;
}

contextBridge.exposeInMainWorld('ouricinhoDesktop', {
  isDesktop: true,
  getInfo: (): Promise<DesktopInfo> => ipcRenderer.invoke('app:getInfo') as Promise<DesktopInfo>,
});
