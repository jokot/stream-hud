import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

// Simple autostart implementation without external dependencies
// For production, consider using electron-auto-launch package

class AutostartManager {
  private appName: string = 'StreamHUDController'
  private execPath: string

  constructor() {
    this.execPath = app.getPath('exe')
  }

  async setAutostart(enable: boolean): Promise<void> {
    const platform = os.platform()
    
    try {
      switch (platform) {
        case 'win32':
          await this.setWindowsAutostart(enable)
          break
        case 'darwin':
          await this.setMacAutostart(enable)
          break
        case 'linux':
          await this.setLinuxAutostart(enable)
          break
        default:
          throw new Error(`Autostart not supported on platform: ${platform}`)
      }
    } catch (error) {
      console.error('Failed to set autostart:', error)
      throw error
    }
  }

  async getAutostartStatus(): Promise<boolean> {
    const platform = os.platform()
    
    try {
      switch (platform) {
        case 'win32':
          return await this.getWindowsAutostartStatus()
        case 'darwin':
          return await this.getMacAutostartStatus()
        case 'linux':
          return await this.getLinuxAutostartStatus()
        default:
          return false
      }
    } catch (error) {
      console.error('Failed to get autostart status:', error)
      return false
    }
  }

  private async setWindowsAutostart(enable: boolean): Promise<void> {
    const { spawn } = require('child_process')
    
    return new Promise((resolve, reject) => {
      const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
      
      if (enable) {
        // Add registry entry
        const cmd = spawn('reg', ['add', regKey, '/v', this.appName, '/t', 'REG_SZ', '/d', `"${this.execPath}"`, '/f'])
        
        cmd.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Registry add failed with code ${code}`))
          }
        })
      } else {
        // Remove registry entry
        const cmd = spawn('reg', ['delete', regKey, '/v', this.appName, '/f'])
        
        cmd.on('close', (code) => {
          // Code 1 means the entry didn't exist, which is fine
          if (code === 0 || code === 1) {
            resolve()
          } else {
            reject(new Error(`Registry delete failed with code ${code}`))
          }
        })
      }
    })
  }

  private async getWindowsAutostartStatus(): Promise<boolean> {
    const { spawn } = require('child_process')
    
    return new Promise((resolve) => {
      const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
      const cmd = spawn('reg', ['query', regKey, '/v', this.appName])
      
      cmd.on('close', (code) => {
        // Code 0 means the entry exists
        resolve(code === 0)
      })
    })
  }

  private async setMacAutostart(enable: boolean): Promise<void> {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${this.appName}.plist`)
    
    if (enable) {
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${this.appName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${this.execPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>`
      
      await fs.promises.writeFile(plistPath, plistContent)
    } else {
      try {
        await fs.promises.unlink(plistPath)
      } catch (error) {
        // File doesn't exist, which is fine
        if ((error as any).code !== 'ENOENT') {
          throw error
        }
      }
    }
  }

  private async getMacAutostartStatus(): Promise<boolean> {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${this.appName}.plist`)
    
    try {
      await fs.promises.access(plistPath)
      return true
    } catch {
      return false
    }
  }

  private async setLinuxAutostart(enable: boolean): Promise<void> {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart')
    const desktopFilePath = path.join(autostartDir, `${this.appName}.desktop`)
    
    if (enable) {
      // Ensure autostart directory exists
      await fs.promises.mkdir(autostartDir, { recursive: true })
      
      const desktopContent = `[Desktop Entry]
Type=Application
Name=${this.appName}
Exec=${this.execPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true`
      
      await fs.promises.writeFile(desktopFilePath, desktopContent)
    } else {
      try {
        await fs.promises.unlink(desktopFilePath)
      } catch (error) {
        // File doesn't exist, which is fine
        if ((error as any).code !== 'ENOENT') {
          throw error
        }
      }
    }
  }

  private async getLinuxAutostartStatus(): Promise<boolean> {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart')
    const desktopFilePath = path.join(autostartDir, `${this.appName}.desktop`)
    
    try {
      await fs.promises.access(desktopFilePath)
      return true
    } catch {
      return false
    }
  }
}

const autostartManager = new AutostartManager()

export async function setupAutostart(enable: boolean): Promise<void> {
  return autostartManager.setAutostart(enable)
}

export async function setAutostart(enable: boolean): Promise<void> {
  return autostartManager.setAutostart(enable)
}

export function getAutostartStatus(): boolean {
  // Return cached status or false by default
  // In a real implementation, you might want to cache this
  return false
}

export async function getAutostartStatusAsync(): Promise<boolean> {
  return autostartManager.getAutostartStatus()
}