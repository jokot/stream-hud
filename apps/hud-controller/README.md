# HUD Controller

A desktop Electron application that provides global keyboard shortcuts and system tray integration for controlling the Stream HUD checklist system.

## 🎯 Purpose

The HUD Controller acts as the command center for streamers, allowing them to control their checklist overlay without switching focus from their streaming software or games. It runs silently in the background and communicates with the WebSocket service to update the overlay in real-time.

## ✨ Features

- ⌨️ **Global Shortcuts**: Control checklist from anywhere on your system
- 🖥️ **System Tray**: Minimal interface with quick access
- 🚀 **Auto-Launch**: Starts automatically with your system
- 🔄 **Real-time Sync**: WebSocket communication with overlay
- 🎮 **Gaming Friendly**: Works even when games are in fullscreen
- ⚙️ **Configurable**: Customizable shortcuts and settings

## 🛠️ Technology Stack

- **Electron 27** - Cross-platform desktop framework
- **TypeScript** - Type-safe development
- **Electron-Vite** - Fast build tool for Electron
- **WebSocket Client** - Real-time communication
- **Auto-Launch** - System startup integration

## Quick Start

### Prerequisites

- Node.js 18+
- The Stream HUD checklist service running on `http://localhost:7006`

### Installation

1. **Install dependencies:**
   ```bash
   cd apps/hud-controller
   pnpm install
   ```

2. **Create configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to customize settings if needed.

3. **Start the controller:**
   ```bash
   npm run dev
   ```

   The app will appear in your system tray.

## Default Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+T` | Toggle next incomplete task |
| `Alt+Shift+Space` | Toggle currently selected task |
| `Alt+Shift+J` | Move selection down |
| `Alt+Shift+K` | Move selection up |
| `Ctrl+Shift+R` | Reset all tasks (with confirmation) |
| `Alt+Shift+G` | Add new task (quick input) |
| `Alt+Shift+D` | Delete selected task |
| `Alt+Shift+E` | Edit selected task |
| `Alt+Shift+Up` | Move task up |
| `Alt+Shift+Down` | Move task down |
| `Alt+Shift+H` | Hide/show panel |

## Configuration

Edit the `.env` file to customize settings:

```env
# Checklist service configuration
CHECKLIST_BASE=http://localhost:7006
ADMIN_TOKEN=devtoken

# Global keyboard shortcuts
SHORTCUT_TOGGLE_NEXT=Alt+Shift+T
SHORTCUT_TOGGLE_SELECTED=Alt+Shift+Space
SHORTCUT_SELECT_UP=Alt+Shift+K
SHORTCUT_SELECT_DOWN=Alt+Shift+J
SHORTCUT_RESET=Alt+Shift+R
SHORTCUT_ADD_TASK=Alt+Shift+G

# Application settings
AUTOSTART=true
POLL_INTERVAL=2000
```

### Configuration Options

- **CHECKLIST_BASE**: URL of the checklist service
- **ADMIN_TOKEN**: Authentication token for API requests
- **SHORTCUT_***: Customize keyboard shortcuts (use Electron accelerator format)
- **AUTOSTART**: Enable/disable automatic startup with system
- **POLL_INTERVAL**: Polling interval in milliseconds when WebSocket is unavailable

## Tray Menu

Right-click the tray icon to access:

- **Status**: Shows connection status (CONNECTED/DISCONNECTED)
- **Toggle next**: Same as `Alt+Shift+T` shortcut
- **Reset...**: Reset all tasks with confirmation
- **Open Checklist Control**: Opens web control interface
- **Open Overlay**: Opens the checklist overlay
- **Start at login**: Toggle auto-start functionality
- **About**: View app information and shortcuts
- **Quit**: Exit the application

## Selection Model

The controller maintains a client-side selection state:

1. **Initialization**: Fetches tasks and selects first incomplete task (or first task)
2. **Navigation**: Use `J`/`K` shortcuts to move selection up/down cyclically
3. **Toggle**: Use `Space` shortcut to toggle the currently selected task
4. **Sync**: Selection stays in sync when tasks are added/removed/reordered

## Building for Production

### Development
```bash
pnpm run dev
```

### Build
```bash
pnpm run build
```

### Package for Distribution

**Windows:**
```bash
pnpm run pack:win
```

**macOS:**
```bash
pnpm run pack:mac
```

**Linux:**
```bash
pnpm run pack:linux
```

Built applications will be in the `dist/` directory.

## Troubleshooting

### Shortcuts Not Working

**Problem**: Global shortcuts don't respond

**Solutions**:
1. **Check for conflicts**: Some shortcuts may be reserved by the OS or other applications
2. **Try different shortcuts**: Edit `.env` file with alternative key combinations
3. **Run as administrator**: On Windows, some shortcuts may require elevated privileges
4. **Check tray notifications**: The app will notify you if shortcuts fail to register

**Common conflicting shortcuts**:
- `Alt+Tab` (Windows/Linux window switching)
- `Cmd+Space` (macOS Spotlight)
- `Alt+F4` (Windows close window)

### Connection Issues

**Problem**: Status shows "DISCONNECTED"

**Solutions**:
1. **Check checklist service**: Ensure `http://localhost:7006` is accessible
2. **Verify admin token**: Make sure `ADMIN_TOKEN` in `.env` matches the service
3. **Check firewall**: Ensure local connections to port 7006 are allowed
4. **Review logs**: Check console output for specific error messages

### Auto-start Not Working

**Problem**: App doesn't start with system

**Solutions**:
1. **Check permissions**: Auto-start may require user permissions on some systems
2. **Manual setup**: Add the app to your system's startup programs manually
3. **Path issues**: Ensure the executable path is correct after moving the app

**Manual auto-start setup**:
- **Windows**: Add to `Win+R` → `shell:startup`
- **macOS**: System Preferences → Users & Groups → Login Items
- **Linux**: Add to `~/.config/autostart/` or your desktop environment's startup apps

### Performance Issues

**Problem**: High CPU usage or slow response

**Solutions**:
1. **Increase poll interval**: Set `POLL_INTERVAL` to a higher value (e.g., 5000)
2. **Check WebSocket**: Ensure WebSocket connection is working (more efficient than polling)
3. **Close unnecessary apps**: Free up system resources

### Task Sync Issues

**Problem**: Tasks not updating or selection out of sync

**Solutions**:
1. **Check file permissions**: Ensure the app can read `configs/tasks.json`
2. **Restart services**: Restart both the controller and checklist service
3. **Clear cache**: Delete any cached data and restart

## Development

### Project Structure

```
apps/hud-controller/
├── src/
│   ├── main.ts          # App initialization and config
│   ├── tray.ts          # System tray and menu
│   ├── shortcuts.ts     # Global shortcut registration
│   ├── api.ts           # HTTP client for checklist service
│   ├── tasks.ts         # Task management and selection
│   └── autostart.ts     # System startup integration
├── build/
│   └── icon.svg         # Tray icon
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── electron.vite.config.ts  # Build configuration
├── .env.example         # Configuration template
└── README.md           # This file
```

### API Endpoints

The controller communicates with these checklist service endpoints:

- `GET /tasks` - Fetch all tasks
- `POST /tasks/toggle-next` - Toggle first incomplete task
- `POST /tasks/toggle` - Toggle specific task by ID
- `POST /tasks/reset` - Reset all tasks to incomplete
- `POST /tasks/add` - Add new task
- `WebSocket /checklist` - Real-time task updates

### Tech Stack

- **Electron**: Cross-platform desktop app framework
- **TypeScript**: Type-safe JavaScript
- **Axios**: HTTP client for API communication
- **WebSocket**: Real-time communication
- **Electron Vite**: Build tooling

## Security

- **Local only**: All communication is restricted to localhost
- **Token authentication**: Admin token required for write operations
- **No elevation**: Runs with normal user privileges
- **No incoming connections**: Controller only makes outbound requests

## License

Part of the Stream HUD project.