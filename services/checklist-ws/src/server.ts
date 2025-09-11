import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'chokidar';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  group?: string;
}

interface ChecklistData {
  items: ChecklistItem[];
  ts: number;
}

interface ChecklistPayload extends ChecklistData {
  source: 'ws';
}

class ChecklistWebSocketServer {
  private wss: WebSocketServer;
  private tasksFilePath: string;
  private lastData: ChecklistData | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private clients = new Set<WebSocket>();

  constructor(port = 7006) {
    // Path to tasks.json (relative to project root)
    this.tasksFilePath = resolve(__dirname, '../../../configs/tasks.json');
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      port,
      path: '/checklist'
    });

    console.log(`🚀 Checklist WebSocket server running on ws://localhost:${port}/checklist`);
    console.log(`📁 Watching: ${this.tasksFilePath}`);

    this.setupWebSocketHandlers();
    this.setupFileWatcher();
    this.loadInitialData();
    this.startPeriodicBroadcast();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📱 Client connected');
      this.clients.add(ws);

      // Send current data immediately
      if (this.lastData) {
        this.sendToClient(ws, this.lastData);
      }

      ws.on('close', () => {
        console.log('📱 Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private setupFileWatcher() {
    // Watch the tasks.json file for changes
    const watcher = watch(this.tasksFilePath, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', () => {
      console.log('📝 Tasks file changed, reloading...');
      this.loadAndBroadcast();
    });

    watcher.on('error', (error) => {
      console.error('❌ File watcher error:', error);
    });
  }

  private loadInitialData() {
    this.loadAndBroadcast();
  }

  private loadAndBroadcast() {
    const data = this.loadTasksFile();
    if (data) {
      this.lastData = data;
      this.broadcastToAll(data);
    }
  }

  private loadTasksFile(): ChecklistData | null {
    try {
      if (!existsSync(this.tasksFilePath)) {
        console.warn(`⚠️  Tasks file not found: ${this.tasksFilePath}`);
        return null;
      }

      const fileContent = readFileSync(this.tasksFilePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Validate data structure
      if (!data.items || !Array.isArray(data.items)) {
        console.error('❌ Invalid tasks file format: missing or invalid items array');
        return null;
      }

      // Ensure timestamp
      if (!data.ts) {
        data.ts = Math.floor(Date.now() / 1000);
      }

      console.log(`✅ Loaded ${data.items.length} tasks from file`);
      return data as ChecklistData;
    } catch (error) {
      console.error('❌ Failed to load tasks file:', error);
      return null;
    }
  }

  private sendToClient(ws: WebSocket, data: ChecklistData) {
    if (ws.readyState === WebSocket.OPEN) {
      const payload: ChecklistPayload = {
        ...data,
        source: 'ws'
      };
      
      try {
        ws.send(JSON.stringify(payload));
      } catch (error) {
        console.error('❌ Failed to send data to client:', error);
        this.clients.delete(ws);
      }
    }
  }

  private broadcastToAll(data: ChecklistData) {
    if (this.clients.size === 0) {
      return;
    }

    console.log(`📡 Broadcasting to ${this.clients.size} client(s)`);
    
    const payload: ChecklistPayload = {
      ...data,
      source: 'ws'
    };

    const message = JSON.stringify(payload);
    const clientsToRemove: WebSocket[] = [];

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('❌ Failed to broadcast to client:', error);
          clientsToRemove.push(ws);
        }
      } else {
        clientsToRemove.push(ws);
      }
    });

    // Clean up dead connections
    clientsToRemove.forEach(ws => this.clients.delete(ws));
  }

  private startPeriodicBroadcast() {
    // Broadcast every 2 seconds to keep connections alive
    this.broadcastInterval = setInterval(() => {
      if (this.lastData && this.clients.size > 0) {
        this.broadcastToAll(this.lastData);
      }
    }, 2000);
  }

  public stop() {
    console.log('🛑 Stopping WebSocket server...');
    
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }

    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.wss.close(() => {
      console.log('✅ WebSocket server stopped');
    });
  }
}

// Start the server
const server = new ChecklistWebSocketServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.stop();
  process.exit(0);
});