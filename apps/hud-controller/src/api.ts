import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { showNotification } from './main'

interface Task {
  id: string
  text: string
  completed: boolean
  order?: number
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

class ChecklistApi {
  private client: AxiosInstance
  private baseUrl: string
  private adminToken: string

  constructor(baseUrl: string, adminToken: string) {
    this.baseUrl = baseUrl
    this.adminToken = adminToken
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add request interceptor to include auth token for POST requests
    this.client.interceptors.request.use((config) => {
      if (config.method !== 'get' && this.adminToken) {
        config.headers.Authorization = `Bearer ${this.adminToken}`
      }
      return config
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleApiError(error)
        return Promise.reject(error)
      }
    )
  }

  private handleApiError(error: any) {
    if (error.response) {
      const status = error.response.status
      if (status === 401 || status === 403) {
        showNotification('Authentication Error', 'Admin token is invalid or expired.')
      } else if (status >= 500) {
        showNotification('Server Error', 'Checklist service is experiencing issues.')
      }
    } else if (error.request) {
      showNotification('Connection Error', 'Cannot reach checklist service.')
    } else {
      console.error('API Error:', error.message)
    }
  }

  async getTasks(): Promise<Task[] | null> {
    try {
      const response: AxiosResponse<Task[]> = await this.client.get('/tasks')
      return response.data
    } catch (error) {
      console.error('Failed to get tasks:', error)
      return null
    }
  }

  async toggleNext(): Promise<boolean> {
    try {
      await this.client.post('/tasks/toggle-next')
      return true
    } catch (error) {
      console.error('Failed to toggle next task:', error)
      return false
    }
  }

  async toggleTask(id: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/toggle', { id })
      return true
    } catch (error) {
      console.error('Failed to toggle task:', error)
      return false
    }
  }

  async resetTasks(confirm: boolean = true): Promise<boolean> {
    try {
      await this.client.post('/tasks/reset', { confirm })
      return true
    } catch (error) {
      console.error('Failed to reset tasks:', error)
      return false
    }
  }

  async addTask(text: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/add', { text })
      return true
    } catch (error) {
      console.error('Failed to add task:', error)
      return false
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/delete', { id: taskId })
      return true
    } catch (error) {
      console.error('Failed to delete task:', error)
      return false
    }
  }

  async editTask(taskId: string, text: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/edit', { id: taskId, text })
      return true
    } catch (error) {
      console.error('Failed to edit task:', error)
      return false
    }
  }

  async selectTask(taskId: string | null): Promise<boolean> {
    try {
      const response = await this.client.post('/tasks/select', { taskId })
      return response.status === 200
    } catch (error) {
      console.error('Failed to select task:', error)
      return false
    }
  }

  async moveTaskUp(taskId: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/move-up', { id: taskId })
      return true
    } catch (error) {
      console.error('Failed to move task up:', error)
      return false
    }
  }

  async moveTaskDown(taskId: string): Promise<boolean> {
    try {
      await this.client.post('/tasks/move-down', { id: taskId })
      return true
    } catch (error) {
      console.error('Failed to move task down:', error)
      return false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/tasks')
      return response.status === 200
    } catch (error) {
      return false
    }
  }
}

let apiInstance: ChecklistApi | null = null

export function initializeApi(baseUrl: string, adminToken: string): ChecklistApi {
  apiInstance = new ChecklistApi(baseUrl, adminToken)
  return apiInstance
}

export function getApi(): ChecklistApi {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initializeApi first.')
  }
  return apiInstance
}

export async function testConnection(baseUrl: string, adminToken: string): Promise<boolean> {
  const tempApi = new ChecklistApi(baseUrl, adminToken)
  return await tempApi.testConnection()
}

export type { Task, ApiResponse }