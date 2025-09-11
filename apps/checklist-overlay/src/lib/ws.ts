export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  group?: string;
};

export type ChecklistPayload = {
  items: ChecklistItem[];
  ts: number;
  source: 'ws' | 'poll';
};

export type DataCallback = (payload: ChecklistPayload) => void;
export type StatusCallback = (connected: boolean, source: 'ws' | 'poll') => void;

export class ChecklistDataSource {
  private ws: WebSocket | null = null;
  private pollInterval: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private wsUrl: string;
  private pollUrl: string;
  private onData: DataCallback;
  private onStatus: StatusCallback;
  private isConnected = false;
  private currentSource: 'ws' | 'poll' = 'poll';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    onData: DataCallback,
    onStatus: StatusCallback,
    wsUrl = 'ws://localhost:7006/checklist',
    pollUrl = '/configs/tasks.json'
  ) {
    this.onData = onData;
    this.onStatus = onStatus;
    this.wsUrl = wsUrl;
    this.pollUrl = pollUrl;
  }

  start() {
    // Try WebSocket first
    this.connectWebSocket();
    
    // Start polling as fallback after 1 second
    setTimeout(() => {
      if (!this.isConnected) {
        this.startPolling();
      }
    }, 1000);
  }

  stop() {
    this.cleanup();
  }

  forceReload() {
    if (this.currentSource === 'poll') {
      this.pollOnce();
    }
  }

  private connectWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.currentSource = 'ws';
        this.reconnectAttempts = 0;
        this.stopPolling();
        this.onStatus(true, 'ws');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload: ChecklistPayload = JSON.parse(event.data);
          payload.source = 'ws';
          this.onData(payload);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.ws = null;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.log('Max reconnect attempts reached, falling back to polling');
          this.startPolling();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.startPolling();
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private startPolling() {
    if (this.pollInterval) return;
    
    console.log('Starting polling mode');
    this.currentSource = 'poll';
    this.onStatus(false, 'poll');
    
    // Poll immediately
    this.pollOnce();
    
    // Then poll every 2 seconds
    this.pollInterval = setInterval(() => {
      this.pollOnce();
    }, 2000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollOnce() {
    try {
      const response = await fetch(this.pollUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const payload: ChecklistPayload = {
        items: data.items || [],
        ts: data.ts || Date.now() / 1000,
        source: 'poll'
      };
      
      this.onData(payload);
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnected = false;
  }
}