# Stream HUD API Documentation

Comprehensive API documentation for the Stream HUD WebSocket service and HTTP endpoints.

## 🌐 Base URLs

- **WebSocket**: `ws://localhost:8080`
- **HTTP API**: `http://localhost:8080/api`

## 🔌 WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to Stream HUD WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Message Format

All WebSocket messages follow this structure:

```typescript
interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}
```

### Client → Server Events

#### Get Tasks
Retrieve all current tasks.

```json
{
  "type": "get_tasks"
}
```

**Response:**
```json
{
  "type": "tasks_updated",
  "data": {
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
}
```

#### Add Task
Create a new task.

```json
{
  "type": "add_task",
  "data": {
    "text": "New task description"
  }
}
```

**Response:**
```json
{
  "type": "tasks_updated",
  "data": {
    "items": [...] // Updated task list
  }
}
```

#### Update Task
Modify an existing task.

```json
{
  "type": "update_task",
  "data": {
    "id": "task_1758039746414_uryzq3veo",
    "text": "Updated task description",
    "done": true,
    "completed": true
  }
}
```

#### Delete Task
Remove a task.

```json
{
  "type": "delete_task",
  "data": {
    "id": "task_1758039746414_uryzq3veo"
  }
}
```

#### Reset Tasks
Mark all tasks as incomplete.

```json
{
  "type": "reset_tasks"
}
```

#### Toggle Task
Toggle completion status of a task.

```json
{
  "type": "toggle_task",
  "data": {
    "id": "task_1758039746414_uryzq3veo"
  }
}
```

#### Reorder Tasks
Change task order.

```json
{
  "type": "reorder_tasks",
  "data": {
    "taskIds": ["task_2", "task_1", "task_3"]
  }
}
```

### Server → Client Events

#### Tasks Updated
Broadcast when task list changes.

```json
{
  "type": "tasks_updated",
  "data": {
    "items": [...] // Complete task list
  }
}
```

#### Error
Error response for invalid operations.

```json
{
  "type": "error",
  "message": "Task not found"
}
```

#### Connection Status
Connection acknowledgment.

```json
{
  "type": "connected",
  "message": "WebSocket connection established"
}
```

## 🌐 HTTP API

### Authentication

No authentication required for local development. All endpoints are publicly accessible.

### Content Type

All requests should use `Content-Type: application/json`.

### Error Responses

Standard HTTP status codes with JSON error messages:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Endpoints

#### GET `/api/tasks`
Retrieve all tasks.

**Response: 200 OK**
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
Create a new task.

**Request:**
```json
{
  "text": "New task description"
}
```

**Response: 201 Created**
```json
{
  "id": "task_1758039746414_uryzq3veo",
  "text": "New task description",
  "done": false,
  "completed": false,
  "order": 0
}
```

#### GET `/api/tasks/:id`
Retrieve a specific task.

**Response: 200 OK**
```json
{
  "id": "task_1758039746414_uryzq3veo",
  "text": "Task description",
  "done": false,
  "completed": false,
  "order": 0
}
```

**Response: 404 Not Found**
```json
{
  "error": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```

#### PUT `/api/tasks/:id`
Update an existing task.

**Request:**
```json
{
  "text": "Updated task description",
  "done": true,
  "completed": true
}
```

**Response: 200 OK**
```json
{
  "id": "task_1758039746414_uryzq3veo",
  "text": "Updated task description",
  "done": true,
  "completed": true,
  "order": 0
}
```

#### DELETE `/api/tasks/:id`
Delete a task.

**Response: 204 No Content**

**Response: 404 Not Found**
```json
{
  "error": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```

#### POST `/api/tasks/reset`
Reset all tasks (mark as incomplete).

**Response: 200 OK**
```json
{
  "message": "All tasks reset successfully",
  "count": 5
}
```

#### POST `/api/tasks/:id/toggle`
Toggle task completion status.

**Response: 200 OK**
```json
{
  "id": "task_1758039746414_uryzq3veo",
  "text": "Task description",
  "done": true,
  "completed": true,
  "order": 0
}
```

#### PUT `/api/tasks/reorder`
Reorder tasks.

**Request:**
```json
{
  "taskIds": ["task_2", "task_1", "task_3"]
}
```

**Response: 200 OK**
```json
{
  "message": "Tasks reordered successfully",
  "items": [...] // Updated task list with new order
}
```

## 📊 Data Models

### Task

```typescript
interface Task {
  id: string;           // Unique identifier
  text: string;         // Task description
  done: boolean;        // Completion status
  completed: boolean;   // Legacy completion field
  order: number;        // Display order
  createdAt?: string;   // ISO timestamp
  updatedAt?: string;   // ISO timestamp
}
```

### TaskList

```typescript
interface TaskList {
  items: Task[];
  lastModified?: string; // ISO timestamp
  version?: number;      // Data version
}
```

## 🔄 Real-time Updates

All task modifications trigger WebSocket broadcasts to connected clients:

1. **Client A** sends `add_task` via WebSocket
2. **Server** processes the request and updates storage
3. **Server** broadcasts `tasks_updated` to all connected clients
4. **All clients** receive the updated task list

## 🛡️ Error Handling

### WebSocket Errors

| Error Type | Description | Response |
|------------|-------------|----------|
| `INVALID_MESSAGE` | Malformed JSON | `{"type": "error", "message": "Invalid message format"}` |
| `UNKNOWN_TYPE` | Unknown message type | `{"type": "error", "message": "Unknown message type"}` |
| `TASK_NOT_FOUND` | Task ID doesn't exist | `{"type": "error", "message": "Task not found"}` |
| `VALIDATION_ERROR` | Invalid task data | `{"type": "error", "message": "Validation failed"}` |

### HTTP Errors

| Status Code | Description | Example |
|-------------|-------------|----------|
| `400` | Bad Request | Invalid JSON or missing required fields |
| `404` | Not Found | Task ID doesn't exist |
| `422` | Unprocessable Entity | Validation errors |
| `500` | Internal Server Error | Server-side errors |

## 🧪 Testing

### WebSocket Testing

Using a WebSocket client:

```javascript
// Connect
const ws = new WebSocket('ws://localhost:8080');

// Test get tasks
ws.send(JSON.stringify({ type: 'get_tasks' }));

// Test add task
ws.send(JSON.stringify({
  type: 'add_task',
  data: { text: 'Test task' }
}));
```

### HTTP Testing

Using curl:

```bash
# Get all tasks
curl http://localhost:8080/api/tasks

# Add new task
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "New task"}'

# Update task
curl -X PUT http://localhost:8080/api/tasks/task_id \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated task", "done": true}'

# Delete task
curl -X DELETE http://localhost:8080/api/tasks/task_id
```

## 📈 Rate Limiting

Currently no rate limiting is implemented. For production use, consider:

- WebSocket message rate limiting
- HTTP request rate limiting
- Connection limits per IP
- Message size limits

## 🔒 Security Considerations

- **Local Development**: No authentication required
- **Production**: Consider implementing:
  - API key authentication
  - CORS origin restrictions
  - Request validation
  - Rate limiting
  - HTTPS/WSS encryption

---

*This API documentation is part of the Stream HUD ecosystem. See the main project documentation for setup and integration guides.*