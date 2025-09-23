// Panel types and overlay configuration
export type PanelId = 'checklist' | 'net' | 'ai';
export type PanelSize = 'sm' | 'md' | 'lg';
export type LayoutType = 'row' | 'column' | 'grid2' | 'stack';
export type ThemeType = 'dark' | 'light';

export interface PanelConfig {
  id: PanelId;
  enabled: boolean;
  size?: PanelSize;              // layout hint
  props?: Record<string, any>;   // per-panel options (bitrate, persona, etc.)
}

export interface OverlayConfig {
  layout: LayoutType;
  gap?: number;                  // px
  scale?: number;                // 0.5–2.0
  theme?: ThemeType;
  panels: PanelConfig[];         // render order = array order
}

// Props that every panel receives
export interface PanelProps {
  size?: PanelSize;
  props?: Record<string, any>;
}

// WebSocket connection status
export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSConnection {
  status: WSStatus;
  url: string;
  lastError?: string;
  reconnectAttempts: number;
}

// Panel-specific payload types
export interface ChecklistTask {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
}

export interface ChecklistData {
  tasks: ChecklistTask[];
  progress: number; // 0-100
}

export interface NetHudData {
  v: number;
  ts: number;
  iface: string;
  upload_bps: number;
  download_bps: number;
  session_bytes: number;
  redline: boolean;
}

export interface AIMessage {
  id: string;
  timestamp: number;
  content: string;
  type: 'message' | 'alert' | 'hype';
}

export interface AIData {
  messages: AIMessage[];
  persona?: string;
  cadence?: number;
}

// Global window interface extensions
declare global {
  interface Window {
    electronAPI?: {
      onTogglePanelVisibility: (callback: () => void) => void;
      removeTogglePanelVisibilityListener: (callback: () => void) => void;
    };
  }
}