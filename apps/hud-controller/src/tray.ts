import { Tray, Menu, shell, dialog, app } from 'electron'
import { getTaskManager } from './tasks'
import { getApi } from './api'
import { showNotification } from './main'
import { getAutostartStatus, setAutostart } from './autostart'

interface Config {
  checklistBase: string
  shortcuts: {
    toggleNext: string
    toggleSelected: string
    selectUp: string
    selectDown: string
    reset: string
  }
  [key: string]: any
}

export function createTray(iconPath: string, config: Config): Tray {
  const tray = new Tray(iconPath)
  
  // Set tooltip
  tray.setToolTip('Stream HUD Controller')
  
  // Build and set context menu
  updateTrayMenu(tray, config)
  
  // Update menu periodically to reflect connection status
  setInterval(() => {
    updateTrayMenu(tray, config)
  }, 5000)
  
  return tray
}

function updateTrayMenu(tray: Tray, config: Config): void {
  try {
    const taskManager = getTaskManager()
    const connectionStatus = taskManager.getConnectionStatus()
    const isAutostart = getAutostartStatus()
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Status: ${connectionStatus}`,
        enabled: false,
        icon: connectionStatus === 'CONNECTED' ? undefined : undefined // Could add status icons
      },
      { type: 'separator' },
      {
        label: `Toggle next (${config.shortcuts.toggleNext})`,
        click: async () => {
          try {
            const api = getApi()
            const success = await api.toggleNext()
            if (success) {
              showNotification('Checklist', 'Toggled next incomplete task')
            } else {
              showNotification('Error', 'Failed to toggle next task')
            }
          } catch (error) {
            showNotification('Error', 'Failed to toggle next task')
          }
        }
      },
      {
        label: 'Reset…',
        click: async () => {
          const result = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Cancel', 'Reset All Tasks'],
            defaultId: 0,
            title: 'Reset Checklist',
            message: 'Are you sure you want to reset all tasks?',
            detail: 'This will mark all tasks as incomplete and cannot be undone.'
          })

          if (result.response === 1) {
            try {
              const api = getApi()
              const success = await api.resetTasks(true)
              if (success) {
                showNotification('Checklist', 'All tasks have been reset')
              } else {
                showNotification('Error', 'Failed to reset tasks')
              }
            } catch (error) {
              showNotification('Error', 'Failed to reset tasks')
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Open Checklist Control',
        click: () => {
          const controlUrl = `${config.checklistBase}/control`
          shell.openExternal(controlUrl).catch(() => {
            showNotification('Error', 'Failed to open checklist control page')
          })
        }
      },
      {
        label: 'Open Overlay',
        click: () => {
          const overlayUrl = 'http://localhost:5173/?scale=1.2&theme=dark&title=Stream%20Checklist&showProgress=1'
          shell.openExternal(overlayUrl).catch(() => {
            showNotification('Error', 'Failed to open overlay page')
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Start at login',
        type: 'checkbox',
        checked: isAutostart,
        click: async (menuItem) => {
          try {
            await setAutostart(menuItem.checked)
            showNotification(
              'Settings', 
              menuItem.checked ? 'Enabled start at login' : 'Disabled start at login'
            )
          } catch (error) {
            showNotification('Error', 'Failed to update autostart setting')
            // Revert checkbox state on error
            menuItem.checked = !menuItem.checked
          }
        }
      },
      { type: 'separator' },
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'About Stream HUD Controller',
            message: 'Stream HUD Controller',
            detail: `Version: ${app.getVersion()}\n\nA global shortcuts controller for Stream HUD checklist.\n\nShortcuts:\n• ${config.shortcuts.toggleNext} - Toggle next task\n• ${config.shortcuts.toggleSelected} - Toggle selected task\n• ${config.shortcuts.selectUp}/${config.shortcuts.selectDown} - Navigate selection\n• ${config.shortcuts.reset} - Reset all tasks`
          })
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])
    
    tray.setContextMenu(contextMenu)
  } catch (error) {
    console.error('Error updating tray menu:', error)
    
    // Fallback minimal menu
    const fallbackMenu = Menu.buildFromTemplate([
      {
        label: 'Status: ERROR',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])
    
    tray.setContextMenu(fallbackMenu)
  }
}

// Handle tray click events
export function setupTrayEvents(tray: Tray): void {
  // On Windows/Linux, single click shows menu
  // On macOS, right-click shows menu (handled automatically)
  
  tray.on('click', () => {
    // Show a brief status notification on click
    try {
      const taskManager = getTaskManager()
      const status = taskManager.getConnectionStatus()
      const tasks = taskManager.getTasks()
      const completedCount = tasks.filter(t => t.completed).length
      
      showNotification(
        'Stream HUD Controller',
        `Status: ${status} | Tasks: ${completedCount}/${tasks.length} completed`
      )
    } catch (error) {
      showNotification('Stream HUD Controller', 'Controller is running')
    }
  })
  
  tray.on('double-click', () => {
    // Double-click to open overlay
    const overlayUrl = 'http://localhost:5173/?scale=1.2&theme=dark&title=Stream%20Checklist&showProgress=1'
    shell.openExternal(overlayUrl).catch(() => {
      showNotification('Error', 'Failed to open overlay page')
    })
  })
}