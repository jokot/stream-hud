import WebSocket from 'ws'
import { initializeApi, getApi, Task } from './api'
import { showNotification } from './main'

interface Config {
  checklistBase: string
  adminToken: string
  pollInterval: number
  [key: string]: any
}

class TaskManager {
  private tasks: Task[] = []
  private selectedIndex: number = 0
  private pollInterval: NodeJS.Timeout | null = null
  private ws: WebSocket | null = null
  private config: Config
  private isConnected: boolean = false

  constructor(config: Config) {
    this.config = config
    initializeApi(config.checklistBase, config.adminToken)
  }

  async initialize(): Promise<void> {
    // Try to connect via WebSocket first, fall back to polling
    const wsConnected = await this.connectWebSocket()
    if (!wsConnected) {
      console.log('WebSocket connection failed, falling back to polling')
      this.startPolling()
    }

    // Initial task fetch
    await this.fetchTasks()
  }

  private async connectWebSocket(): Promise<boolean> {
    try {
      const wsUrl = this.config.checklistBase.replace('http', 'ws') + '/checklist'
      this.ws = new WebSocket(wsUrl)

      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false)
          return
        }

        const timeout = setTimeout(() => {
          resolve(false)
        }, 5000)

        this.ws.on('open', () => {
          clearTimeout(timeout)
          console.log('WebSocket connected')
          this.isConnected = true
          resolve(true)
        })

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString())
            console.log(`WebSocket message received: type=${message.type}, tasks count=${message.tasks?.length || 'none'}`)
            if (message.type === 'tasks_updated' && message.tasks) {
              console.log(`Processing WebSocket update with ${message.tasks.length} tasks`)
              this.updateTasks(message.tasks)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        })

        this.ws.on('close', () => {
          console.log('WebSocket disconnected, falling back to polling')
          this.isConnected = false
          this.ws = null
          this.startPolling()
        })

        this.ws.on('error', (error) => {
          clearTimeout(timeout)
          console.error('WebSocket error:', error)
          this.isConnected = false
          resolve(false)
        })
      })
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      return false
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }

    this.pollInterval = setInterval(async () => {
      await this.fetchTasks()
    }, this.config.pollInterval)

    console.log(`Started polling every ${this.config.pollInterval}ms`)
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async fetchTasks(): Promise<void> {
    try {
      const api = getApi()
      const tasks = await api.getTasks()
      if (tasks) {
        this.updateTasks(tasks)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  private updateTasks(newTasks: Task[]): void {
    const previousTasks = [...this.tasks]
    this.tasks = newTasks.sort((a, b) => (a.order || 0) - (b.order || 0))

    // Maintain selection after task updates
    this.maintainSelection(previousTasks)

    console.log(`Updated ${this.tasks.length} tasks`)
  }

  private maintainSelection(previousTasks: Task[]): void {
    console.log(`maintainSelection: prev=${previousTasks.length}, current=${this.tasks.length}, selectedIndex=${this.selectedIndex}`)
    
    if (previousTasks.length === 0 || this.tasks.length === 0) {
      this.selectedIndex = 0
      console.log(`maintainSelection: reset to 0 (empty lists)`)
      return
    }

    // Try to keep the same task selected by ID first
    const previousSelectedTask = previousTasks[this.selectedIndex]
    console.log(`maintainSelection: previousSelectedTask=${previousSelectedTask?.id || 'none'}`)
    
    if (previousSelectedTask) {
      const newIndex = this.tasks.findIndex(task => task.id === previousSelectedTask.id)
      if (newIndex !== -1) {
        this.selectedIndex = newIndex
        console.log(`maintainSelection: Maintained selection: task ${previousSelectedTask.id} at index ${newIndex}/${this.tasks.length - 1}`)
        return
      }
    }

    // If tasks were added, try to maintain relative position
    if (this.tasks.length > previousTasks.length) {
      console.log(`maintainSelection: Tasks added, checking for new tasks`)
      // Find new tasks that weren't in the previous list
      const previousTaskIds = new Set(previousTasks.map(task => task.id))
      const newTasks = this.tasks.filter(task => !previousTaskIds.has(task.id))
      console.log(`maintainSelection: Found ${newTasks.length} new tasks: ${newTasks.map(t => t.id).join(', ')}`)
      
      if (newTasks.length > 0) {
        // If new tasks were added, select the first new task for better UX
        const firstNewTaskIndex = this.tasks.findIndex(task => !previousTaskIds.has(task.id))
        if (firstNewTaskIndex !== -1) {
          this.selectedIndex = firstNewTaskIndex
          console.log(`maintainSelection: Selected newly added task '${this.tasks[firstNewTaskIndex].text}' at index ${this.selectedIndex}/${this.tasks.length - 1}`)
          return
        }
      }
    }

    // If the selected task is gone, clamp the index
    this.selectedIndex = Math.min(this.selectedIndex, this.tasks.length - 1)
    this.selectedIndex = Math.max(0, this.selectedIndex)
    console.log(`maintainSelection: Clamped selection to index ${this.selectedIndex}/${this.tasks.length - 1}`)
  }

  selectNext(): void {
    if (this.tasks.length === 0) return
    const oldIndex = this.selectedIndex
    this.selectedIndex = (this.selectedIndex + 1) % this.tasks.length
    const selectedTask = this.tasks[this.selectedIndex]
    console.log(`selectNext: ${oldIndex} -> ${this.selectedIndex} (total: ${this.tasks.length}) - Selected: '${selectedTask?.text || 'none'}'`)
    this.broadcastSelection()
  }

  selectPrevious(): void {
    if (this.tasks.length === 0) return
    const oldIndex = this.selectedIndex
    this.selectedIndex = this.selectedIndex === 0 
      ? this.tasks.length - 1 
      : this.selectedIndex - 1
    console.log(`selectPrevious: ${oldIndex} -> ${this.selectedIndex} (total: ${this.tasks.length})`)
    this.broadcastSelection()
  }

  selectNextIncomplete(): void {
    if (this.tasks.length === 0) return

    // Find the first incomplete task
    const incompleteIndex = this.tasks.findIndex(task => !task.completed)
    if (incompleteIndex !== -1) {
      this.selectedIndex = incompleteIndex
      this.broadcastSelection()
    }
  }

  private async broadcastSelection(): Promise<void> {
    const selectedTask = this.getSelectedTask()
    const api = getApi()
    try {
      await api.selectTask(selectedTask?.id || null)
    } catch (error) {
      console.error('Failed to broadcast selection:', error)
    }
  }

  getSelectedTask(): Task | null {
    if (this.tasks.length === 0 || this.selectedIndex < 0 || this.selectedIndex >= this.tasks.length) {
      return null
    }
    return this.tasks[this.selectedIndex]
  }

  getTasks(): Task[] {
    return [...this.tasks]
  }

  getSelectedIndex(): number {
    return this.selectedIndex
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionStatus(): 'CONNECTED' | 'DISCONNECTED' {
    return this.isWebSocketConnected() || this.pollInterval !== null ? 'CONNECTED' : 'DISCONNECTED'
  }

  destroy(): void {
    this.stopPolling()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

let taskManagerInstance: TaskManager | null = null

export function initializeTaskManager(config: Config): TaskManager {
  if (taskManagerInstance) {
    taskManagerInstance.destroy()
  }
  
  taskManagerInstance = new TaskManager(config)
  taskManagerInstance.initialize()
  return taskManagerInstance
}

export function getTaskManager(): TaskManager {
  if (!taskManagerInstance) {
    throw new Error('TaskManager not initialized. Call initializeTaskManager first.')
  }
  return taskManagerInstance
}

export { TaskManager }