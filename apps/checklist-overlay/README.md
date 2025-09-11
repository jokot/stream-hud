# Checklist Overlay

A React-based browser overlay for OBS that displays a live progress checklist with real-time updates.

## Features

- 📋 **Live Checklist Display**: Shows tasks with completion status
- 🔄 **Real-time Updates**: WebSocket connection with polling fallback
- 🎨 **Customizable Appearance**: URL parameters for theming and layout
- ⚡ **Responsive Design**: Adapts to different screen sizes and scales
- ⌨️ **Keyboard Shortcuts**: Quick controls for live streaming
- 🎥 **OBS Optimized**: Transparent background, optimized for streaming

## Quick Start

### Development

```bash
# Start the overlay app
npm run dev

# Or from project root
pnpm dev:overlay
```

The app will be available at `http://localhost:5173/`

### Production Build

```bash
npm run build
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
| `theme` | string | `"light"` | Theme mode (`light` or `dark`) |
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