# Stream HUD - Checklist Overlay

A browser overlay for OBS that displays a live progress checklist with WebSocket support and polling fallback.

## Features

- 📋 **Live Checklist**: Real-time task progress tracking
- 🔄 **Dual Data Sources**: WebSocket with automatic polling fallback
- 🎨 **Customizable UI**: URL parameters for theme, scale, and layout
- ⚡ **Fast Setup**: No backend required for basic usage
- 🎥 **OBS Ready**: Optimized for browser source integration
- ⌨️ **Global Shortcuts**: System tray controller with global keyboard shortcuts
- 🖥️ **Cross-platform**: Works on Windows, macOS, and Linux

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Clone and install dependencies
cd stream-hud
pnpm install
```

### Development

```bash
# Start overlay and WebSocket server
pnpm dev

# Start everything including tray controller
pnpm dev:all

# Or start individually:
pnpm dev:overlay     # React app on http://localhost:5173
pnpm dev:ws          # WebSocket server on ws://localhost:7006
pnpm dev:controller  # Electron tray app with global shortcuts
```

### Production Build

```bash
pnpm build
```

## Usage

### Basic Setup (Polling Mode)

1. Edit `configs/tasks.json` with your checklist items
2. Open `http://localhost:5173` in your browser
3. Add as Browser Source in OBS

### Advanced Setup (WebSocket Mode)

1. Start the WebSocket server: `pnpm dev:ws`
2. Edit `configs/tasks.json` - changes will broadcast automatically
3. Open `http://localhost:5173` - will connect via WebSocket

### HUD Controller (Global Shortcuts)

The HUD Controller is an Electron tray app that provides global keyboard shortcuts for controlling the checklist, even when other applications (like OBS or games) are in focus.

1. **Start the controller**: `pnpm dev:controller`
2. **Look for the tray icon** in your system tray
3. **Use global shortcuts** to control tasks:
   - `Alt+Shift+T` - Toggle next incomplete task
   - `Alt+Shift+Space` - Toggle currently selected task
   - `Alt+Shift+J/K` - Navigate selection up/down
   - `Alt+Shift+R` - Reset all tasks
   - `Alt+Shift+G` - Add new task

4. **Right-click tray icon** for menu options and settings

See `apps/hud-controller/README.md` for detailed setup and troubleshooting.

## Configuration

### URL Parameters

Customize the overlay appearance with URL parameters:

```
http://localhost:5173/?scale=1.2&theme=dark&title=My%20Stream&showProgress=1&compact=0
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `scale` | `1.0` | Scale factor (0.5-2.0) |
| `title` | `"Checklist"` | Overlay title |
| `theme` | `"light"` | Theme (`light` or `dark`) |
| `showProgress` | `1` | Show progress bar (1 or 0) |
| `compact` | `0` | Compact layout (1 or 0) |

### Tasks Configuration

Edit `configs/tasks.json`:

```json
{
  "items": [
    {
      "id": "1",
      "text": "Setup stream overlay",
      "done": true,
      "group": "Setup" // Optional grouping
    },
    {
      "id": "2",
      "text": "Test audio levels",
      "done": false
    }
  ],
  "ts": 1736567000
}
```

### Keyboard Shortcuts

- **R**: Force reload data
- **T**: Toggle first incomplete item (demo)

## OBS Integration

### Adding as Browser Source

1. In OBS, add a new **Browser Source**
2. Set URL to: `http://localhost:5173/?scale=1.1&theme=dark`
3. Set Width: `400`, Height: `600`
4. Check **Shutdown source when not visible**
5. Check **Refresh browser when scene becomes active**

### Recommended Settings

- **For overlays**: Use `scale=0.8` and `compact=1`
- **For full screen**: Use `scale=1.2` and `showProgress=1`
- **For dark themes**: Add `theme=dark`

## Project Structure

```
stream-hud/
├── apps/
│   └── checklist-overlay/          # React overlay app
│       ├── src/
│       │   ├── panels/Checklist.tsx # Main checklist component
│       │   ├── lib/
│       │   │   ├── ws.ts           # WebSocket client
│       │   │   ├── params.ts       # URL parameter handling
│       │   │   └── format.ts       # Utility functions
│       │   └── ...
│       └── ...
├── services/
│   └── checklist-ws/               # WebSocket server
│       └── src/server.ts           # Main server file
├── configs/
│   └── tasks.json                  # Task configuration
└── ...
```

## Data Flow

1. **WebSocket Mode**: Server watches `configs/tasks.json` → broadcasts changes → overlay updates
2. **Polling Mode**: Overlay polls `configs/tasks.json` every 2 seconds
3. **Fallback**: Automatically switches from WebSocket to polling if connection fails

## Development

### Adding New Features

1. **UI Components**: Add to `apps/checklist-overlay/src/panels/`
2. **Utilities**: Add to `apps/checklist-overlay/src/lib/`
3. **Server Logic**: Modify `services/checklist-ws/src/server.ts`

### Styling

- Uses **Tailwind CSS** with custom components
- Dark mode support via `class` strategy
- Animations with **Framer Motion**

### Testing

```bash
# Test overlay in browser
open http://localhost:5173/?scale=1.5&theme=dark&title=Test

# Test WebSocket connection
# Edit configs/tasks.json and watch for live updates
```

## Troubleshooting

### Common Issues

**Overlay not updating:**
- Check if WebSocket server is running (`pnpm dev:ws`)
- Verify `configs/tasks.json` exists and is valid JSON
- Look for errors in browser console

**OBS not showing overlay:**
- Ensure correct URL with `http://localhost:5173`
- Check browser source dimensions
- Try refreshing the browser source

**WebSocket connection failed:**
- Overlay automatically falls back to polling mode
- Check server logs for connection issues
- Verify port 7006 is not blocked

### Debug Mode

Open browser developer tools to see:
- Connection status (WebSocket vs Polling)
- Data updates in real-time
- Error messages

## License

MIT License - feel free to use for your streams!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with OBS
5. Submit a pull request

---

**Happy Streaming! 🎥✨**