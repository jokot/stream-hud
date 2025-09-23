# Checklist Overlay

A React-based browser overlay for OBS that displays a real-time synchronized checklist with smooth animations and customizable appearance.

## 🎯 Purpose

This overlay serves as the visual component of the Stream HUD system, designed to be used as a browser source in OBS Studio. It displays a dynamic checklist that updates in real-time based on WebSocket communications from the backend service.

## ✨ Features

- 🔄 **Real-time Updates**: Instant synchronization via WebSocket connection
- 🎨 **Smooth Animations**: Powered by Framer Motion for professional transitions
- 🎭 **OBS Ready**: Transparent background and optimized for streaming
- ⚙️ **URL Configuration**: Customizable via URL parameters
- 📱 **Responsive Design**: Adapts to different overlay sizes
- 🎨 **Tailwind Styling**: Modern, utility-first CSS framework

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animation library
- **WebSocket** - Real-time communication

## 🚀 Quick Start

### Development
```bash
# Install dependencies (from project root)
pnpm install

# Start development server
pnpm dev:overlay

# Or run from this directory
pnpm dev
```

The overlay will be available at `http://localhost:5173`

### Production Build
```bash
# Build for production
pnpm build:overlay

# Or from this directory
pnpm build
```

## Usage

### Basic URL

```
http://localhost:5173/
```

### Customized URL with Parameters

```
http://localhost:5173/?scale=1.2&theme=dark&title=My%20Stream&showProgress=1&compact=0
```

## URL Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `scale` | number | `1.0` | Scale factor (0.5-2.0) for sizing |
| `title` | string | `"Checklist"` | Title displayed at the top |
| `theme` | string | `"dark"` | Theme mode (`light` or `dark`) |
| `showProgress` | boolean | `1` | Show progress bar (1 or 0) |
| `compact` | boolean | `0` | Compact layout mode (1 or 0) |

### Examples

**For streaming overlay:**
```
http://localhost:5173/?scale=0.8&theme=dark&compact=1
```

**For full screen display:**
```
http://localhost:5173/?scale=1.5&showProgress=1&title=Stream%20Goals
```

**Minimal setup:**
```
http://localhost:5173/?compact=1&showProgress=0
```

## Updating the Checklist

### Method 1: Edit tasks.json (Recommended)

The checklist data is stored in `../../configs/tasks.json`. Edit this file to update your tasks:

```json
{
  "items": [
    {
      "id": "1",
      "text": "Setup stream overlay",
      "done": true,
      "group": "Setup"
    },
    {
      "id": "2",
      "text": "Test audio levels",
      "done": false,
      "group": "Audio"
    },
    {
      "id": "3",
      "text": "Check camera angle",
      "done": false
    }
  ],
  "ts": 1736567000
}
```

#### Task Properties

- `id` (string, required): Unique identifier for the task
- `text` (string, required): Task description
- `done` (boolean, required): Completion status
- `group` (string, optional): Group/category for organizing tasks

#### Real-time Updates

- **With WebSocket server running**: Changes are broadcast immediately
- **Without WebSocket server**: Changes are polled every 2 seconds
- The `ts` (timestamp) field helps track when the file was last updated

### Method 2: Keyboard Shortcuts (Demo)

While the overlay is focused:

- **R**: Force reload data from tasks.json
- **T**: Toggle first incomplete item (demo feature)

### Method 3: API Integration (Advanced)

You can integrate with external tools by:

1. **Direct file modification**: Update `tasks.json` programmatically
2. **WebSocket messages**: Send updates to the WebSocket server
3. **Custom polling endpoint**: Modify the polling URL in the code

## Data Flow

```
tasks.json ← Edit file
    ↓
WebSocket Server ← Watches file changes
    ↓
Overlay App ← Receives updates
    ↓
OBS Browser Source ← Displays overlay
```

**Fallback mode:**
```
tasks.json ← Edit file
    ↓
Overlay App ← Polls every 2s
    ↓
OBS Browser Source ← Displays overlay
```

## OBS Integration

### Adding as Browser Source

1. **Add Source**: Browser Source in OBS
2. **URL**: `http://localhost:5173/?scale=1.1&theme=dark`
3. **Dimensions**: Width: 400px, Height: 600px
4. **Settings**:
   - ✅ Shutdown source when not visible
   - ✅ Refresh browser when scene becomes active

### Recommended OBS Settings

**For corner overlay:**
- Scale: `0.8`
- Compact: `1`
- Theme: `dark`
- Size: 300x400px

**For full screen:**
- Scale: `1.2`
- Show Progress: `1`
- Size: 500x700px

## Customization

### Themes

- **Light theme**: Clean, minimal design
- **Dark theme**: Streaming-friendly, low contrast

### Layout Modes

- **Normal**: Full layout with spacing
- **Compact**: Condensed for smaller overlays

### Progress Display

- **With progress bar**: Shows completion percentage
- **Without progress bar**: Clean task list only

## Troubleshooting

### Overlay not updating

1. Check if WebSocket server is running
2. Verify `tasks.json` exists and is valid JSON
3. Look for errors in browser console (F12)
4. Try force reload with **R** key

### OBS not showing overlay

1. Ensure correct URL: `http://localhost:5173/`
2. Check browser source dimensions
3. Try refreshing the browser source
4. Verify the dev server is running

### WebSocket connection issues

- Overlay automatically falls back to polling mode
- Check server logs for connection errors
- Verify port 7006 is not blocked

### Performance optimization

- Use `compact=1` for smaller overlays
- Disable progress bar if not needed
- Use appropriate scale factor for your setup

## Development

### Project Structure

```
src/
├── panels/
│   └── Checklist.tsx     # Main checklist component
├── lib/
│   ├── ws.ts            # WebSocket client
│   ├── params.ts        # URL parameter handling
│   └── format.ts        # Utility functions
├── App.tsx              # Root component
└── main.tsx            # Entry point
```

### Key Components

- **Checklist.tsx**: Main overlay component with task rendering
- **ws.ts**: Handles WebSocket connection and polling fallback
- **params.ts**: Parses and manages URL parameters

### Adding New Features

1. **New URL parameters**: Add to `params.ts`
2. **Styling changes**: Modify Tailwind classes in components
3. **Data processing**: Update logic in `Checklist.tsx`
4. **Connection handling**: Modify `ws.ts`

### Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Vite**: Build tool and dev server

## License

MIT License - Part of the Stream HUD project.