import { globalShortcut, BrowserWindow, ipcMain, dialog } from 'electron'
import { getApi } from './api'
import { getTaskManager } from './tasks'
import { showNotification } from './main'

interface ShortcutConfig {
  toggleNext: string
  toggleSelected: string
  selectUp: string
  selectDown: string
  reset: string
  addTask?: string
  deleteTask?: string
}

interface Config {
  shortcuts: ShortcutConfig
  [key: string]: any
}

let registeredShortcuts: string[] = []

export function registerAllShortcuts(config: Config): boolean {
  const shortcuts = config.shortcuts
  let allRegistered = true

  // Unregister any existing shortcuts first
  unregisterAllShortcuts()

  // Register toggle next shortcut
  if (!registerShortcut(shortcuts.toggleNext, handleToggleNext)) {
    console.warn(`Failed to register shortcut: ${shortcuts.toggleNext}`)
    allRegistered = false
  }

  // Register toggle selected shortcut
  if (!registerShortcut(shortcuts.toggleSelected, handleToggleSelected)) {
    console.warn(`Failed to register shortcut: ${shortcuts.toggleSelected}`)
    allRegistered = false
  }

  // Register select up shortcut
  if (!registerShortcut(shortcuts.selectUp, handleSelectUp)) {
    console.warn(`Failed to register shortcut: ${shortcuts.selectUp}`)
    allRegistered = false
  }

  // Register select down shortcut
  if (!registerShortcut(shortcuts.selectDown, handleSelectDown)) {
    console.warn(`Failed to register shortcut: ${shortcuts.selectDown}`)
    allRegistered = false
  }

  // Register reset shortcut
  if (!registerShortcut(shortcuts.reset, handleReset)) {
    console.warn(`Failed to register shortcut: ${shortcuts.reset}`)
    allRegistered = false
  }

  // Register add task shortcut (optional)
  if (shortcuts.addTask) {
    if (!registerShortcut(shortcuts.addTask, handleAddTask)) {
      console.warn(`Failed to register shortcut: ${shortcuts.addTask}`)
      allRegistered = false
    }
  }

  // Register delete task shortcut (optional)
  if (shortcuts.deleteTask) {
    if (!registerShortcut(shortcuts.deleteTask, handleDeleteTask)) {
      console.warn(`Failed to register shortcut: ${shortcuts.deleteTask}`)
      allRegistered = false
    }
  }

  console.log(`Registered ${registeredShortcuts.length} shortcuts`)
  return allRegistered
}

export function unregisterAllShortcuts(): void {
  registeredShortcuts.forEach(shortcut => {
    globalShortcut.unregister(shortcut)
  })
  registeredShortcuts = []
  console.log('Unregistered all shortcuts')
}

function registerShortcut(accelerator: string, callback: () => void): boolean {
  try {
    const success = globalShortcut.register(accelerator, callback)
    if (success) {
      registeredShortcuts.push(accelerator)
      console.log(`Registered shortcut: ${accelerator}`)
    }
    return success
  } catch (error) {
    console.error(`Error registering shortcut ${accelerator}:`, error)
    return false
  }
}

// Shortcut handlers
async function handleToggleNext(): Promise<void> {
  try {
    const api = getApi()
    const success = await api.toggleNext()
    if (success) {
      showNotification('Checklist', 'Toggled next incomplete task')
    } else {
      showNotification('Error', 'Failed to toggle next task')
    }
  } catch (error) {
    console.error('Error in handleToggleNext:', error)
    showNotification('Error', 'Failed to toggle next task')
  }
}

async function handleToggleSelected(): Promise<void> {
  try {
    const taskManager = getTaskManager()
    const selectedTask = taskManager.getSelectedTask()
    
    if (!selectedTask) {
      showNotification('Error', 'No task selected')
      return
    }

    const api = getApi()
    const success = await api.toggleTask(selectedTask.id)
    if (success) {
      const status = selectedTask.completed ? 'incomplete' : 'complete'
      showNotification('Checklist', `Marked "${selectedTask.text}" as ${status}`)
    } else {
      showNotification('Error', 'Failed to toggle selected task')
    }
  } catch (error) {
    console.error('Error in handleToggleSelected:', error)
    showNotification('Error', 'Failed to toggle selected task')
  }
}

function handleSelectUp(): void {
  try {
    const taskManager = getTaskManager()
    taskManager.selectPrevious()
    const selectedTask = taskManager.getSelectedTask()
    if (selectedTask) {
      showNotification('Selection', `Selected: ${selectedTask.text}`)
    }
  } catch (error) {
    console.error('Error in handleSelectUp:', error)
  }
}

function handleSelectDown(): void {
  try {
    const taskManager = getTaskManager()
    taskManager.selectNext()
    const selectedTask = taskManager.getSelectedTask()
    if (selectedTask) {
      showNotification('Selection', `Selected: ${selectedTask.text}`)
    }
  } catch (error) {
    console.error('Error in handleSelectDown:', error)
  }
}

async function handleReset(): Promise<void> {
  try {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Cancel', 'Reset All Tasks'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirm Reset',
      message: 'Are you sure you want to reset all tasks?',
      detail: 'This will mark all tasks as incomplete. This action cannot be undone.'
    })
    
    if (response === 1) { // User clicked "Reset All Tasks"
      const api = getApi()
      const success = await api.resetTasks()
      
      if (success) {
        showNotification('Tasks Reset', 'All tasks have been reset to incomplete')
      } else {
        showNotification('Reset Failed', 'Failed to reset tasks', 'error')
      }
    }
  } catch (error) {
    console.error('Error resetting tasks:', error)
    showNotification('Reset Error', 'An error occurred while resetting tasks', 'error')
  }
}

async function handleAddTask(): Promise<void> {
  try {
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Cancel', 'Add Task'],
      defaultId: 1,
      title: 'Add New Task',
      message: 'Add a new task to the checklist',
      detail: 'Enter the task description in the input field that will appear.',
      inputType: 'text',
      inputPlaceholder: 'Enter task description...'
    })

    if (result.response === 0) { // User clicked Cancel
      return
    }

    // Use a simple prompt as fallback since Electron doesn't have built-in input dialog
    const { BrowserWindow } = require('electron')
    const inputWindow = new BrowserWindow({
      width: 400,
      height: 200,
      modal: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    const inputHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Add New Task</title>
        <style>
          body { font-family: system-ui; padding: 20px; margin: 0; }
          input { width: 100%; padding: 8px; margin: 10px 0; font-size: 14px; }
          button { padding: 8px 16px; margin: 5px; cursor: pointer; }
          .buttons { text-align: right; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h3>Add New Task</h3>
        <input type="text" id="taskInput" placeholder="Enter task description..." autofocus>
        <div class="buttons">
          <button onclick="cancel()">Cancel</button>
          <button onclick="addTask()">Add Task</button>
        </div>
        <script>
          const { ipcRenderer } = require('electron')
          function cancel() {
            ipcRenderer.send('input-result', null)
          }
          function addTask() {
            const value = document.getElementById('taskInput').value.trim()
            if (value) {
              ipcRenderer.send('input-result', value)
            }
          }
          document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask()
            if (e.key === 'Escape') cancel()
          })
        </script>
      </body>
      </html>
    `

    inputWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(inputHtml))

    const taskText = await new Promise<string | null>((resolve) => {
      const { ipcMain } = require('electron')
      const handler = (_: any, result: string | null) => {
        ipcMain.removeListener('input-result', handler)
        inputWindow.close()
        resolve(result)
      }
      ipcMain.on('input-result', handler)
      
      inputWindow.on('closed', () => {
        ipcMain.removeListener('input-result', handler)
        resolve(null)
      })
    })

    if (!taskText) {
      return
    }

    const api = getApi()
    const success = await api.addTask(taskText)
    if (success) {
      showNotification('Checklist', `Added task: "${taskText}"`)
    } else {
      showNotification('Error', 'Failed to add task')
    }
  } catch (error) {
    console.error('Error in handleAddTask:', error)
    showNotification('Error', 'Failed to add task')
  }
}

async function handleDeleteTask(): Promise<void> {
  try {
    const taskManager = getTaskManager()
    const selectedTask = taskManager.getSelectedTask()
    
    if (!selectedTask) {
      return
    }

    const { response } = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Cancel', 'Delete Task'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete this task?`,
      detail: `Task: "${selectedTask.text}"\n\nThis action cannot be undone.`
    })
    
    if (response === 1) { // User clicked "Delete Task"
      // Re-check if the task is still selected and exists
      const currentSelectedTask = taskManager.getSelectedTask()
      if (!currentSelectedTask || currentSelectedTask.id !== selectedTask.id) {
        showNotification('Error', 'Task is no longer selected or has been deleted')
        return
      }
      
      const api = getApi()
      const success = await api.deleteTask(selectedTask.id)
      
      if (success) {
        showNotification('Task Deleted', `Deleted: "${selectedTask.text}"`)
      } else {
        showNotification('Delete Failed', 'Failed to delete task')
      }
    }
  } catch (error) {
    console.error('Error deleting task:', error)
    showNotification('Delete Error', 'An error occurred while deleting the task')
  }
}

export { registeredShortcuts }