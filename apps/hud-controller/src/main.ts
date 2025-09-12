import { app, BrowserWindow, Notification } from 'electron'
import { join } from 'path'
import * as dotenv from 'dotenv'
import { createTray } from './tray'
import { registerAllShortcuts, unregisterAllShortcuts } from './shortcuts'
import { initializeTaskManager } from './tasks'
import { testConnection } from './api'
import { setupAutostart } from './autostart'

// Load environment variables
dotenv.config()

interface Config {
  checklistBase: string
  adminToken: string
  autostart: boolean
  notifications: boolean
  pollInterval: number
  shortcuts: {
    toggleNext: string
    toggleSelected: string
    selectUp: string
    selectDown: string
    reset: string
    addTask?: string
    deleteTask?: string
  }
}

let config: Config
let tray: Electron.Tray | null = null

function loadConfig(): Config {
  const defaultConfig: Config = {
    checklistBase: process.env.CHECKLIST_BASE || 'http://localhost:7006',
    adminToken: process.env.ADMIN_TOKEN || 'devtoken',
    shortcuts: {
      toggleNext: process.env.SHORTCUT_TOGGLE_NEXT || 'Alt+Shift+T',
      toggleSelected: process.env.SHORTCUT_TOGGLE_SELECTED || 'Alt+Shift+Space',
      selectUp: process.env.SHORTCUT_SELECT_UP || 'Alt+Shift+K',
      selectDown: process.env.SHORTCUT_SELECT_DOWN || 'Alt+Shift+J',
      reset: process.env.SHORTCUT_RESET || 'Alt+Shift+R',
      addTask: process.env.SHORTCUT_ADD_TASK || 'Alt+Shift+G',
      deleteTask: process.env.SHORTCUT_DELETE_TASK || 'Alt+Shift+D'
    },
    autostart: process.env.AUTOSTART === 'true',
    notifications: process.env.NOTIFICATIONS !== 'false',
    pollInterval: parseInt(process.env.POLL_INTERVAL || '2000', 10)
  }

  // Validate required config
  if (!defaultConfig.adminToken || defaultConfig.adminToken === '') {
    showNotification('Configuration Error', 'Admin token is missing. Please check your .env file.')
  }

  return defaultConfig
}

function showNotification(title: string, body: string) {
  // Notifications completely disabled
  return
}

async function initializeApp() {
  try {
    // Load configuration
    config = loadConfig()
    
    // Test connection to checklist service
    const isConnected = await testConnection(config.checklistBase, config.adminToken)
    if (!isConnected) {
      showNotification('Connection Warning', 'Cannot connect to checklist service. Some features may not work.')
    }

    // Create tray
    const iconPath = join(__dirname, '../build/icon.png')
    tray = createTray(iconPath, config)
    
    // Register global shortcuts
    const shortcutsRegistered = registerAllShortcuts(config)
    if (!shortcutsRegistered) {
      showNotification('Shortcuts Warning', 'Some shortcuts could not be registered. They may be reserved by the system.')
    }

    // Initialize task manager (polling/WebSocket)
    initializeTaskManager(config)

    // Setup autostart if enabled
    if (config.autostart) {
      setupAutostart(true)
    }

    console.log('HUD Controller initialized successfully')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    showNotification('Initialization Error', 'Failed to start HUD Controller. Check console for details.')
  }
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our tray instead
    if (tray) {
      showNotification('HUD Controller', 'Application is already running in system tray.')
    }
  })

  // This method will be called when Electron has finished initialization
  app.whenReady().then(() => {
    initializeApp()
  })

  // Quit when all windows are closed (not applicable for tray apps)
  app.on('window-all-closed', () => {
    // Keep the app running in the background
  })

  app.on('before-quit', () => {
    // Cleanup shortcuts before quitting
    unregisterAllShortcuts()
  })

  // macOS specific: re-create tray when dock icon is clicked
  app.on('activate', () => {
    if (!tray) {
      initializeApp()
    }
  })
}

// Export config for other modules
export { config, showNotification }