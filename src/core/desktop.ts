export interface DesktopInfo {
  name: string;
  version: string;
  electron: string;
  platform: string;
}

interface DesktopBridge {
  isDesktop: boolean;
  getInfo(): Promise<DesktopInfo>;
}

declare global {
  interface Window {
    ouricinhoDesktop?: DesktopBridge;
  }
}

export function isDesktop(): boolean {
  return window.ouricinhoDesktop?.isDesktop === true;
}

export async function getDesktopInfo(): Promise<DesktopInfo | null> {
  if (!window.ouricinhoDesktop) return null;
  try {
    return await window.ouricinhoDesktop.getInfo();
  } catch {
    return null;
  }
}
