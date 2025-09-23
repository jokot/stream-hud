import { WSStatus, WSConnection } from '../core/types';

export type WSDataCallback<T = any> = (data: T) => void;
export type WSStatusCallback = (status: WSStatus) => void;

export interface WSClientOptions {
  url: string;
  fallbackUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  pollInterval?: number;
  enablePolling?: boolean;
}

export class WSClient<T = any> {
  private ws: WebSocket | null = null;
  private pollInterval: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  
  private options: Required<WSClientOptions>;
  private onData: WSDataCallback<T>;
  private onStatus: WSStatusCallback;
  
  private status: WSStatus = 'disconnected';
  private connection: WSConnection = 'none';
  private reconnectAttempts = 0;
  private isDestroyed = false;

  constructor(
    onData: WSDataCallback<T>,
    onStatus: WSStatusCallback,
    options: WSClientOptions
  ) {
    this.onData = onData;
    this.onStatus = onStatus;
    this.options = {
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      pollInterval: 2000,
      enablePolling: true,
      ...options,
      url: options.url,
      fallbackUrl: options.fallbackUrl || options.url.replace('ws://', 'http://').replace('wss://', 'https://')
    };
  }

  start(): void {
    if (this.isDestroyed) return;
    
    this.cleanup();
    this.connectWebSocket();
    
    // Start polling as fallback after initial connection attempt
    if (this.options.enablePolling) {
      setTimeout(() => {
        if (this.status !== 'connected' && !this.isDestroyed) {
          this.startPolling();
        }
      }, 1000);
    }
  }

  stop(): void {
    this.cleanup();
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
  }

  forceReload(): void {
    if (this.connection === 'polling') {
      this.pollOnce();
    }
  }

  getStatus(): WSStatus {
    return this.status;
  }

  getConnection(): WSConnection {
    return this.connection;
  }

  private connectWebSocket(): void {
    if (this.isDestroyed) return;
    
    // Clean up existing connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    try {
      this.updateStatus('connecting', 'websocket');
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        if (this.isDestroyed) return;
        
        console.log(`WebSocket connected to ${this.options.url}`);
        this.updateStatus('connected', 'websocket');
        this.reconnectAttempts = 0;
        this.stopPolling();
      };

      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        
        try {
          if (!event.data) {
            console.warn('WebSocket message has no data');
            return;
          }

          const data = JSON.parse(event.data);
          this.onData(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        if (this.isDestroyed) return;
        
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        this.ws = null;
        
        if (event.code === 1000) {
          // Normal closure, don't reconnect
          this.updateStatus('disconnected', 'none');
          return;
        }

        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.log('Max WebSocket reconnect attempts reached, falling back to polling');
          if (this.options.enablePolling) {
            this.startPolling();
          } else {
            this.updateStatus('error', 'none');
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.status === 'connecting') {
          // Connection failed, try polling if enabled
          if (this.options.enablePolling && this.reconnectAttempts === 0) {
            this.startPolling();
          }
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (this.options.enablePolling) {
        this.startPolling();
      } else {
        this.updateStatus('error', 'none');
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;
    
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );
    
    this.reconnectAttempts++;
    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.updateStatus('reconnecting', 'none');
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connectWebSocket();
      }
    }, delay);
  }

  private startPolling(): void {
    if (this.isDestroyed || this.pollInterval || !this.options.enablePolling) return;
    
    console.log('Starting polling mode');
    this.updateStatus('connected', 'polling');
    
    // Poll immediately
    this.pollOnce();
    
    // Then poll at regular intervals
    this.pollInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.pollOnce();
      }
    }, this.options.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const url = `${this.options.fallbackUrl}?t=${Date.now()}`;
      console.log(`Polling ${url}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.onData(data);
      
    } catch (error) {
      console.error('Polling failed:', error);
      
      // If polling fails consistently, update status
      if (this.status === 'connected' && this.connection === 'polling') {
        this.updateStatus('error', 'polling');
      }
    }
  }

  private updateStatus(status: WSStatus, connection: WSConnection): void {
    const changed = this.status !== status || this.connection !== connection;
    
    this.status = status;
    this.connection = connection;
    
    if (changed) {
      this.onStatus(status);
    }
  }

  private cleanup(): void {
    // Close WebSocket
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client cleanup');
      }
      this.ws = null;
    }
    
    // Clear intervals and timeouts
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset state
    this.updateStatus('disconnected', 'none');
    this.reconnectAttempts = 0;
  }
}

// Specialized clients for different data types
export class ChecklistWSClient extends WSClient<any> {
  constructor(onData: WSDataCallback<any>, onStatus: WSStatusCallback) {
    super(onData, onStatus, {
      url: import.meta.env.VITE_WS_CHECKLIST_URL || 'ws://localhost:7006/checklist',
      fallbackUrl: '/configs/tasks.json',
      enablePolling: true
    });
  }
}

export class NetHudWSClient extends WSClient<any> {
  constructor(onData: WSDataCallback<any>, onStatus: WSStatusCallback) {
    super(onData, onStatus, {
      url: import.meta.env.VITE_WS_NETHUD_URL || 'ws://localhost:7007/nethud',
      fallbackUrl: '/configs/nethud.json',
      enablePolling: true
    });
  }
}

export class AIChatWSClient extends WSClient<any> {
  constructor(onData: WSDataCallback<any>, onStatus: WSStatusCallback) {
    super(onData, onStatus, {
      url: import.meta.env.VITE_WS_AI_URL || 'ws://localhost:7008/ai',
      fallbackUrl: '/configs/ai.json',
      enablePolling: false // AI chat typically doesn't need polling fallback
    });
  }
}