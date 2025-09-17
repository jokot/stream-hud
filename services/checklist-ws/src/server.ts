import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'chokidar';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  completed?: boolean; // Alias for done
  group?: string;
  order?: number;
}

interface ChecklistData {
  items: ChecklistItem[];
  ts: number;
  selectedTaskId?: string;
}

interface ChecklistPayload extends ChecklistData {
  source: 'ws';
}

class ChecklistWebSocketServer {
  private wss: WebSocketServer;
  private app: express.Application;
  private server: any;
  private tasksFilePath: string;
  private lastData: ChecklistData | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private clients = new Set<WebSocket>();
  private adminToken: string = 'devtoken';
  private selectedTaskId: string | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(port = 7006) {
    // Path to tasks.json (relative to project root)
    this.tasksFilePath = resolve(__dirname, '../../../configs/tasks.json');
    
    // Create Express app
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    
    // Create HTTP server
    this.server = createServer(this.app);
    
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/checklist'
    });

    // Setup routes and handlers
    this.setupHttpRoutes();
    this.setupWebSocketHandlers();
    this.setupFileWatcher();
    this.loadInitialData();
    // Removed periodic broadcast to prevent overlay flickering
    
    // Start server
    this.server.listen(port, () => {
      console.log(`🚀 Checklist server running on http://localhost:${port}`);
      console.log(`🚀 WebSocket server running on ws://localhost:${port}/checklist`);
      console.log(`📁 Watching: ${this.tasksFilePath}`);
    });
  }

  private setupHttpRoutes() {
    // Authentication middleware for POST requests
    const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const token = authHeader.substring(7);
      if (token !== this.adminToken) {
        return res.status(403).json({ error: 'Invalid admin token' });
      }
      
      next();
    };

    // GET /tasks - Get all tasks
    this.app.get('/tasks', (req, res) => {
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      // Convert done to completed for consistency
      const tasks = this.lastData.items.map(item => ({
        ...item,
        completed: item.done || item.completed || false
      }));
      
      res.json(tasks);
    });

    // POST /tasks/toggle-next - Toggle first incomplete task
    this.app.post('/tasks/toggle-next', authenticateAdmin, (req, res) => {
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const firstIncomplete = this.lastData.items.find(item => !item.done && !item.completed);
      if (!firstIncomplete) {
        return res.status(404).json({ error: 'No incomplete tasks found' });
      }
      
      this.toggleTaskById(firstIncomplete.id);
      res.json({ success: true, toggledTask: firstIncomplete.id });
    });

    // POST /tasks/toggle - Toggle specific task by ID
    this.app.post('/tasks/toggle', authenticateAdmin, (req, res) => {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const task = this.lastData.items.find(item => item.id === id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      this.toggleTaskById(id);
      res.json({ success: true, toggledTask: id });
    });

    // POST /tasks/reset - Reset all tasks to incomplete
    this.app.post('/tasks/reset', authenticateAdmin, (req, res) => {
      const { confirm } = req.body;
      if (!confirm) {
        return res.status(400).json({ error: 'Confirmation required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      this.resetAllTasks();
      res.json({ success: true, message: 'All tasks reset to incomplete' });
    });

    // POST /tasks/add - Add new task (optional endpoint)
    this.app.post('/tasks/add', authenticateAdmin, (req, res) => {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Task text is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      this.addTask(text.trim());
      res.json({ success: true, message: 'Task added successfully' });
    });

    // POST /tasks/delete - Delete task by ID
    this.app.post('/tasks/delete', authenticateAdmin, (req, res) => {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const taskIndex = this.lastData.items.findIndex(item => item.id === id);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const deletedTask = this.lastData.items[taskIndex];
      this.deleteTask(id);
      res.json({ success: true, message: 'Task deleted successfully', deletedTask: deletedTask.text });
    });

    // POST /tasks/edit - Edit task by ID
    this.app.post('/tasks/edit', authenticateAdmin, (req, res) => {
      const { id, text } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Task text is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const task = this.lastData.items.find(item => item.id === id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const oldText = task.text;
      this.editTask(id, text.trim());
      res.json({ success: true, message: 'Task updated successfully', oldText, newText: text.trim() });
    });

    // POST /tasks/select - Update selected task
    this.app.post('/tasks/select', authenticateAdmin, (req, res) => {
      const { taskId } = req.body;
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      // Validate task exists if taskId is provided
      if (taskId && !this.lastData.items.find(item => item.id === taskId)) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      this.selectedTaskId = taskId || null;
      this.broadcastSelectionUpdate();
      res.json({ success: true, selectedTaskId: this.selectedTaskId });
    });

    // POST /tasks/move-up - Move task up in order
    this.app.post('/tasks/move-up', authenticateAdmin, (req, res) => {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const success = this.moveTaskUp(id);
      if (!success) {
        return res.status(404).json({ error: 'Task not found or cannot move up' });
      }
      
      res.json({ success: true, message: 'Task moved up successfully' });
    });

    // POST /tasks/move-down - Move task down in order
    this.app.post('/tasks/move-down', authenticateAdmin, (req, res) => {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const success = this.moveTaskDown(id);
      if (!success) {
        return res.status(404).json({ error: 'Task not found or cannot move down' });
      }
      
      res.json({ success: true, message: 'Task moved down successfully' });
    });

    // POST /tasks/move-to-position - Move task to specific position
    this.app.post('/tasks/move-to-position', authenticateAdmin, (req, res) => {
      const { taskId, targetPosition } = req.body;
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      if (typeof targetPosition !== 'number' || targetPosition < 0) {
        return res.status(400).json({ error: 'Valid target position is required' });
      }
      
      if (!this.lastData) {
        return res.status(404).json({ error: 'No tasks data available' });
      }
      
      const success = this.moveTaskToPosition(taskId, targetPosition);
      if (!success) {
        return res.status(404).json({ error: 'Task not found or invalid position' });
      }
      
      res.json({ success: true, message: 'Task moved to position successfully' });
    });

    // GET /control - Simple control page (optional)
    this.app.get('/control', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Checklist Control</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .task { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .completed { background-color: #e8f5e8; }
            button { margin: 5px; padding: 5px 10px; }
          </style>
        </head>
        <body>
          <h1>Checklist Control</h1>
          <p>Use the HUD Controller app or API endpoints to manage tasks.</p>
          <p>WebSocket: ws://localhost:7006/checklist</p>
          <p>API Base: http://localhost:7006</p>
        </body>
        </html>
      `);
    });
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
    
    const payload = {
      type: 'tasks_updated',
      tasks: data.items,
      selectedTaskId: this.selectedTaskId || undefined,
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

  private broadcastSelectionUpdate() {
    if (!this.lastData) return;
    
    const payload: ChecklistPayload = {
      ...this.lastData,
      selectedTaskId: this.selectedTaskId || undefined,
      source: 'ws'
    };

    const message = JSON.stringify(payload);
    const clientsToRemove: WebSocket[] = [];

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('❌ Failed to broadcast selection update:', error);
          clientsToRemove.push(ws);
        }
      } else {
        clientsToRemove.push(ws);
      }
    });

    // Clean up dead connections
    clientsToRemove.forEach(ws => this.clients.delete(ws));
  }

  // Removed periodic broadcast to prevent overlay flickering
  // WebSocket connections will stay alive without constant broadcasting

  private toggleTaskById(taskId: string): boolean {
    if (!this.lastData) return false;
    
    const task = this.lastData.items.find(item => item.id === taskId);
    if (!task) return false;
    
    task.done = !task.done;
    task.completed = task.done; // Keep both properties in sync
    
    this.saveTasksFile();
    this.broadcastToAll(this.lastData);
    
    console.log(`✅ Toggled task "${task.text}" to ${task.done ? 'completed' : 'incomplete'}`);
    return true;
  }

  private resetAllTasks(): boolean {
    if (!this.lastData) return false;
    
    this.lastData.items.forEach(item => {
      item.done = false;
      item.completed = false;
    });
    
    this.saveTasksFile();
    this.broadcastToAll(this.lastData);
    
    console.log('✅ Reset all tasks to incomplete');
    return true;
  }

  private addTask(text: string): boolean {
    if (!this.lastData) return false;
    
    const newTask: ChecklistItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      done: false,
      completed: false,
      order: this.lastData.items.length
    };
    
    this.lastData.items.push(newTask);
    
    this.saveTasksFile();
    this.broadcastToAll(this.lastData);
    
    console.log(`✅ Added new task: "${text}"`);
    return true;
  }

  private deleteTask(taskId: string): boolean {
    if (!this.lastData) return false;
    
    const taskIndex = this.lastData.items.findIndex(item => item.id === taskId);
    if (taskIndex === -1) return false;
    
    const deletedTask = this.lastData.items[taskIndex];
    this.lastData.items.splice(taskIndex, 1);
    
    // Update order for remaining tasks
    this.lastData.items.forEach((item, index) => {
      item.order = index;
    });
    
    this.saveTasksFile();
    this.broadcastToAll(this.lastData);
    
    console.log(`✅ Deleted task: "${deletedTask.text}"`);    return true;
  }

  private editTask(taskId: string, newText: string): boolean {
    if (!this.lastData) return false;
    
    const task = this.lastData.items.find(item => item.id === taskId);
    if (!task) return false;
    
    const oldText = task.text;
    task.text = newText;
    
    this.saveTasksFile();
    this.broadcastToAll(this.lastData);
    
    console.log(`✅ Edited task: "${oldText}" -> "${newText}"`);
    return true;
  }

  private moveTaskUp(taskId: string): boolean {
    if (!this.lastData || this.lastData.items.length === 0) return false;
    
    const taskIndex = this.lastData.items.findIndex(item => item.id === taskId);
    if (taskIndex === -1) return false; // Task not found
    
    const task = this.lastData.items[taskIndex];
    
    if (taskIndex === 0) {
      // Wrap around: move from top to bottom
      this.lastData.items.splice(taskIndex, 1);
      this.lastData.items.push(task);
      
      // Update all order properties
      this.lastData.items.forEach((item, index) => {
        item.order = index;
      });
      
      console.log(`✅ Moved task "${task.text}" to bottom (wrap around)`);
    } else {
      // Normal move up: swap with the task above
      this.lastData.items[taskIndex] = this.lastData.items[taskIndex - 1];
      this.lastData.items[taskIndex - 1] = task;
      
      // Only update order for the two affected items
      this.lastData.items[taskIndex].order = taskIndex;
      this.lastData.items[taskIndex - 1].order = taskIndex - 1;
      
      console.log(`✅ Moved task "${task.text}" up`);
    }
    
    this.debouncedSave();
    this.broadcastToAll(this.lastData);
    
    return true;
  }

  private moveTaskDown(taskId: string): boolean {
    if (!this.lastData || this.lastData.items.length === 0) return false;
    
    const taskIndex = this.lastData.items.findIndex(item => item.id === taskId);
    if (taskIndex === -1) return false; // Task not found
    
    const task = this.lastData.items[taskIndex];
    
    if (taskIndex === this.lastData.items.length - 1) {
      // Wrap around: move from bottom to top
      this.lastData.items.splice(taskIndex, 1);
      this.lastData.items.unshift(task);
      
      // Update all order properties
      this.lastData.items.forEach((item, index) => {
        item.order = index;
      });
      
      console.log(`✅ Moved task "${task.text}" to top (wrap around)`);
    } else {
      // Normal move down: swap with the task below
      this.lastData.items[taskIndex] = this.lastData.items[taskIndex + 1];
      this.lastData.items[taskIndex + 1] = task;
      
      // Only update order for the two affected items
      this.lastData.items[taskIndex].order = taskIndex;
      this.lastData.items[taskIndex + 1].order = taskIndex + 1;
      
      console.log(`✅ Moved task "${task.text}" down`);
    }
    
    this.debouncedSave();
    this.broadcastToAll(this.lastData);
    
    return true;
  }

  private moveTaskToPosition(taskId: string, targetPosition: number): boolean {
    if (!this.lastData || this.lastData.items.length === 0) {
      return false;
    }

    const currentIndex = this.lastData.items.findIndex(item => item.id === taskId);
    if (currentIndex === -1) {
      return false;
    }

    // Clamp target position to valid range
    const maxPosition = this.lastData.items.length - 1;
    const clampedPosition = Math.max(0, Math.min(targetPosition, maxPosition));

    // If already at target position, no need to move
    if (currentIndex === clampedPosition) {
      return true;
    }

    // Remove task from current position
    const [task] = this.lastData.items.splice(currentIndex, 1);
    
    // Insert task at target position
    this.lastData.items.splice(clampedPosition, 0, task);
    
    // Update all order properties
    this.lastData.items.forEach((item, index) => {
      item.order = index;
    });
    
    console.log(`✅ Moved task "${task.text}" from position ${currentIndex} to position ${clampedPosition}`);
    
    this.debouncedSave();
    this.broadcastToAll(this.lastData);
    
    return true;
  }

  private saveTasksFile(): boolean {
    if (!this.lastData) return false;
    
    try {
      // Update timestamp
      this.lastData.ts = Math.floor(Date.now() / 1000);
      
      const jsonContent = JSON.stringify(this.lastData, null, 2);
      writeFileSync(this.tasksFilePath, jsonContent, 'utf-8');
      
      console.log('💾 Saved tasks to file');
      return true;
    } catch (error) {
      console.error('❌ Failed to save tasks file:', error);
      return false;
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveTasksFile();
      this.saveTimeout = null;
    }, 100); // 100ms debounce
  }

  public stop() {
    console.log('🛑 Stopping server...');
    
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      // Save any pending changes before stopping
      this.saveTasksFile();
    }

    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.clients.clear();

    this.wss.close();
    this.server.close(() => {
      console.log('✅ Server stopped');
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