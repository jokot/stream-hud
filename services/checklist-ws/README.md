# Checklist WebSocket Service

A Node.js WebSocket server that provides real-time communication between the Stream HUD overlay and controller applications, with persistent task storage and file watching capabilities.

## 🎯 Purpose

This service acts as the central communication hub for the Stream HUD system, managing task data persistence, real-time synchronization between clients, and providing both WebSocket and HTTP APIs for task management.

## ✨ Features

- 🔄 **Real-time Communication**: WebSocket server for instant updates
- 💾 **Persistent Storage**: JSON file-based task storage
- 👀 **File Watching**: Automatic reload when task file changes
- 🌐 **HTTP API**: RESTful endpoints for task management
- 🔗 **CORS Enabled**: Cross-origin requests supported
- 📡 **Multi-client Support**: Broadcast updates to all connected clients
- 🛡️ **Error Handling**: Robust error handling and recovery

## 🛠️ Technology Stack

- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe development
- **Express.js** - Web framework
- **ws** - WebSocket library
- **Chokidar** - File system watcher
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Development
```bash
# Install dependencies (from project root)
pnpm install

# Start development server with hot reload
pnpm dev:ws

# Or run from this directory
pnpm dev
```

The service will be available at:
- **WebSocket**: `ws://localhost:8080`
- **HTTP API**: `http://localhost:8080`

### Production
```bash
# Build TypeScript
pnpm build:ws

# Or from this directory
pnpm build

# Start production server
pnpm start
```

## 📡 API Reference

### WebSocket Events

#### Client → Server
```typescript
// Get all tasks
{
  type: 'get_tasks'
}

// Add new task
{
  type: 'add_task',
  data: {
    text: 'Task description'
  }
}

// Update task
{
  type: 'update_task',
  data: {
    id: 'task_id',
    text: 'Updated text',
    done: true
  }
}

// Delete task
{
  type: 'delete_task',
  data: {
    id: 'task_id'
  }
}

// Reset all tasks
{
  type: 'reset_tasks'
}
```

#### Server → Client
```typescript
// Task list update
{
  type: 'tasks_updated',
  data: {
    items: [...tasks]
  }
}

// Error response
{
  type: 'error',
  message: 'Error description'
}
```

### HTTP Endpoints

#### GET `/api/tasks`
Retrieve all tasks

**Response:**
```json
{
  "items": [
    {
      "id": "task_1758039746414_uryzq3veo",
      "text": "Task description",
      "done": false,
      "completed": false,
      "order": 0
    }
  ]
}
```

#### POST `/api/tasks`
Create a new task

**Request:**
```json
{
  "text": "New task description"
}
```

#### PUT `/api/tasks/:id`
Update an existing task

**Request:**
```json
{
  "text": "Updated description",
  "done": true
}
```

#### DELETE `/api/tasks/:id`
Delete a task

#### POST `/api/tasks/reset`
Reset all tasks (mark as incomplete)

## 📁 Project Structure

```
src/
└── server.ts           # Main server implementation
    ├── WebSocket server setup
    ├── Express HTTP server
    ├── File watching logic
    ├── Task management functions
    └── Error handling
```

## 🔧 Configuration

### Environment Variables

```env
# Server port (default: 8080)
PORT=8080

# Task file path (default: ../../configs/tasks.json)
TASKS_FILE_PATH=../../configs/tasks.json

# Enable debug logging
DEBUG=false

# CORS origin (default: *)
CORS_ORIGIN=*
```

### Task File Format

Tasks are stored in JSON format:

```json
{
  "items": [
    {
      "id": "unique_task_id",
      "text": "Task description",
      "done": false,
      "completed": false,
      "order": 0
    }
  ]
}
```

## 🔄 Data Flow

1. **File Watching**: Service monitors `configs/tasks.json` for changes
2. **WebSocket Connections**: Clients connect for real-time updates
3. **Task Operations**: CRUD operations via WebSocket or HTTP
4. **Broadcast Updates**: All connected clients receive updates
5. **Persistence**: Changes automatically saved to JSON file

## 🔌 Integration

This service integrates with:
- **Checklist Overlay** (`apps/checklist-overlay`) - Receives real-time task updates
- **HUD Controller** (`apps/hud-controller`) - Sends task management commands
- **Task Storage** (`configs/tasks.json`) - Persistent data storage

## 🛡️ Error Handling

### WebSocket Errors
- Connection failures are logged and handled gracefully
- Invalid message formats return error responses
- Client disconnections are cleaned up automatically

### File System Errors
- Missing task file is created automatically
- File permission errors are logged with helpful messages
- Corrupted JSON files are backed up and recreated

### HTTP Errors
- Standard HTTP status codes for different error types
- Detailed error messages in development mode
- CORS preflight handling

## 📊 Monitoring

### Logging
The service logs:
- Client connections/disconnections
- Task operations (add, update, delete)
- File system events
- Error conditions

### Health Check
```bash
# Check if service is running
curl http://localhost:8080/api/tasks
```

## 🚀 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

### PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start dist/server.js --name "checklist-ws"

# Monitor
pm2 monit
```

### Systemd Service
```ini
[Unit]
Description=Checklist WebSocket Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/service
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

**WebSocket connection failed:**
- Check firewall settings
- Verify port is not blocked
- Ensure service is running

**File permission errors:**
- Check read/write permissions on `configs/tasks.json`
- Ensure parent directory exists
- Run with appropriate user permissions

### Debug Mode
Enable detailed logging:
```env
DEBUG=true
```

This will show:
- All WebSocket messages
- File system events
- HTTP request details
- Error stack traces

## 🔒 Security Considerations

- Service runs on localhost by default
- No authentication required for local development
- CORS can be restricted for production
- File system access limited to task file
- No sensitive data stored or transmitted

---

*Part of the Stream HUD ecosystem - see main project README for complete setup instructions.*