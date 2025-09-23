# **Refactor to Main Overlay (Composable Panels)**

**Title:** Stream-HUD — Refactor overlay into `apps/overlay` with panel registry + routes
**Goal:** Replace `apps/checklist-overlay` with a **single overlay app** that can compose multiple **panels** (Checklist, Net HUD, AI Chat) via **URL params** or `hud.config.json`. Keep **panel-only** routes for scenes that want just one widget. Preserve current checklist behavior (WS first, poll fallback).

## Context (current repo)

* Monorepo with:

  * `apps/checklist-overlay` (React/Vite overlay)
  * `apps/hud-controller` (Electron tray / shortcuts)
  * `services/checklist-ws` (WS for checklist)
  * `configs/tasks.json` (source of truth)
* We’re adding **stats-bridge** later, but stub Net HUD WS now: `ws://localhost:7007/net`.

## Requirements

### A) New app & structure

Create **apps/overlay** and move/port the overlay code there.

```
apps/overlay/
  index.html
  package.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.cjs
  tsconfig.json
  src/
    main.tsx
    App.tsx
    styles.css
    core/
      types.ts              # Panel types & overlay config
      PanelRegistry.ts      # id -> component map
      Layout.tsx            # row/column/grid/stack renderer
      config.ts             # merge URL params + hud.config.json + defaults
    routes/
      OverlayMain.tsx       # multi-panel overlay
      OverlayChecklist.tsx  # panel-only
      OverlayNet.tsx        # panel-only
      OverlayAI.tsx         # panel-only (can be stubbed)
    panels/
      Checklist.tsx         # port from old app (keep WS→poll)
      NetHud.tsx            # consume WS payload (can mock if service not running)
      AIChat.tsx            # consume WS payload (stub ok)
    lib/
      ws.ts                 # robust WS client with backoff
      params.ts             # URL param parsing helpers
      format.ts             # bytes/bps formatting
```

Keep `apps/checklist-overlay` temporarily for reference; mark it **deprecated** or delete after parity is verified.

### B) Panel contract (TypeScript)

```ts
// core/types.ts
export type PanelId = 'checklist' | 'net' | 'ai';
export type PanelSize = 'sm' | 'md' | 'lg';

export type PanelConfig = {
  id: PanelId;
  enabled: boolean;
  size?: PanelSize;              // layout hint
  props?: Record<string, any>;   // per-panel options (bitrate, persona, etc.)
};

export type OverlayConfig = {
  layout: 'row' | 'column' | 'grid2' | 'stack';
  gap?: number;                  // px
  scale?: number;                // 0.5–2.0
  theme?: 'dark' | 'light';
  panels: PanelConfig[];         // render order = array order
};

// every panel receives merged config + its own props
export type PanelProps = {
  size?: PanelSize;
  props?: Record<string, any>;
};
```

```ts
// core/PanelRegistry.ts
import Checklist from '../panels/Checklist';
import NetHud from '../panels/NetHud';
import AIChat from '../panels/AIChat';

export const PANEL_REGISTRY = {
  checklist: Checklist,
  net: NetHud,
  ai: AIChat,
} as const;
```

### C) Routes

Use React Router:

```tsx
// App.tsx
<Routes>
  <Route path="/overlays/main" element={<OverlayMain/>} />
  <Route path="/overlays/checklist" element={<OverlayChecklist/>} />
  <Route path="/overlays/net" element={<OverlayNet/>} />
  <Route path="/overlays/ai" element={<OverlayAI/>} />
  <Route path="*" element={<OverlayMain/>} /> {/* default */}
</Routes>
```

### D) Config sources & precedence

1. **URL params** (scene-level overrides)
2. `configs/hud.config.json` (project defaults)
3. Hardcoded sensible defaults

Create `configs/hud.config.json` example:

```json
{
  "layout": "row",
  "gap": 16,
  "scale": 1.0,
  "theme": "dark",
  "panels": [
    { "id": "checklist", "enabled": true, "size": "md" },
    { "id": "net",       "enabled": true, "size": "md", "props": { "bitrate": 3500, "threshold": 0.7 } },
    { "id": "ai",        "enabled": false, "size": "sm", "props": { "persona": "hype", "cadence": 20 } }
  ]
}
```

### E) URL parameter grammar

* **Global:**

  * `layout=row|column|grid2|stack`
  * `gap=16` (px), `scale=1.1`, `theme=dark|light`
* **Panels list (order + size):**

  * `panels=checklist(md),net(md),ai(sm)`

    * size optional; defaults to `md`
* **Per-panel options (read inside panels):**

  * Net: `bitrate=3500&threshold=0.7`
  * AI: `persona=hype&cadence=20`
* If `panels` is omitted, use `hud.config.json`.

### F) Layout behavior

* `row` / `column`: flex with `gap`.
* `grid2`: CSS grid with two columns; map `sm|md|lg` to width hints.
* `stack`: vertical stack for sidebars.
* Apply global `scale` via `transform: scale()` with `transform-origin: top left`.

### G) WebSocket contracts

* **Checklist WS (primary):** `ws://localhost:7006/checklist`

  * Fallback: poll `configs/tasks.json` every 2000ms when WS is down.
  * Keep current checklist item schema and progress calc.
* **Net WS:** `ws://localhost:7007/net`

  * Payload v1:

    ```json
    { "v":1,"ts":1736567890,"iface":"en0","upload_bps":2987000,"download_bps":512000,"session_bytes":734003200,"redline":false }
    ```
* **AI WS:** `ws://localhost:7008/ai` (can be stubbed for now).

Implement a shared `connectWS(url, onMsg, onStatus)` with exponential backoff + jitter.

### H) Panel ports (minimal)

* **Checklist.tsx**: port existing UI; show small chip `WS`/`POLL`.
* **NetHud.tsx**: render Upload/Download/Session; redline banner when alert=true (read `bitrate`,`threshold` from props/URL). If WS down, show “Disconnected”.
* **AIChat.tsx**: simple feed list; if WS down, show “Waiting for AI messages…”.

### I) Vite env defaults

Expose WS URLs via Vite env with sane defaults:

```
VITE_CHECKLIST_WS_URL=ws://localhost:7006/checklist
VITE_NET_WS_URL=ws://localhost:7007/net
VITE_AI_WS_URL=ws://localhost:7008/ai
```

### J) Migration & cleanup

* Update root `pnpm-workspace.yaml` to include `apps/overlay`.
* Add scripts:

  ```json
  { "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:overlay": "pnpm --filter overlay dev",
    "build:overlay": "pnpm --filter overlay build"
  }}
  ```
* Update README with new routes and param grammar.
* Keep `apps/checklist-overlay` until parity, then remove or archive.

### K) Acceptance criteria

* `/overlays/main` renders **multiple panels** per `panels=` or `hud.config.json`.
* `/overlays/checklist`, `/overlays/net`, `/overlays/ai` render **panel-only** UIs (no chrome).
* Changing `panels` order/size in URL reorders/resizes immediately.
* Checklist still **WS first** then **poll fallback** and shows a tiny status chip.
* Net HUD reads WS and updates at \~1 Hz; redline triggers per threshold.
* Global `scale` and `layout` work and fit OBS Browser Source cleanly.
* No runtime errors; bundle remains lightweight.

### L) Nice-to-have (if quick)

* Tiny per-panel status dot (`UP/DOWN`) in a corner.
* `?debug=1` overlays a grid & payload values (for dev only).

**Deliverables**

* New `apps/overlay` app with code/files per structure above.
* Ported Checklist panel + new Net/AI stubs.
* Updated README documenting routes, params, and how to add the overlay in OBS.

> Now perform the refactor exactly as specified, generating all files and wiring the routes, panel registry, config merge, and WS connectors. Keep code clean, typed, and production-ready.
