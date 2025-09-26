Here’s a clean, copy-paste **one-shot prompt** to implement the **Internet Speed & Usage** feature aligned with your new **Main Overlay** architecture.

---

# One-shot Prompt — Internet Speed & Usage (Net HUD)

**Title:** Stream-HUD — Implement Internet Speed & Usage (stats-bridge + Net HUD panel)

**Goal:** Add a local service that samples OS network stats and a composable **Net HUD** panel in the **Main Overlay**. Show **Upload/Download (bps)**, **Session Usage (bytes)**, and a **redline alert** when upload < target headroom. Fully local, no cloud.

---

## Context (repo today)

* Monorepo with:

  * `apps/overlay` (main overlay app with panel registry & routes) ← already refactored
  * `apps/hud-controller` (Electron tray for global shortcuts)
  * `services/checklist-ws` (WebSocket service for checklist)
  * `configs/tasks.json` (checklist data)
* We will add a new service: **`services/stats-bridge`** and a new panel: **`NetHud`**.

---

## Tech / constraints

* **Node 18+**, **TypeScript**, **pnpm workspaces**
* **systeminformation** (or equivalent) to read NIC counters (macOS/Windows)
* **WebSocket** (`ws`) for server broadcast
* **React + Vite + Tailwind** in `apps/overlay`
* Bind services to **localhost only**. No admin perms required.

---

## Features (MVP)

1. **stats-bridge service**

   * Every **1000 ms** sample the selected interface’s cumulative `tx_bytes` / `rx_bytes`.
   * Compute per-second **upload_bps**/**download_bps** and accumulate **session_bytes**.
   * **EMA smoothing** (`alpha=0.3`) to stabilize readings.
   * **Redline alert** when `emaUpload < (TARGET_BITRATE_KBPS * 1000) * REDLINE_THRESHOLD`.
   * Broadcast JSON every tick on **`ws://localhost:7007/net`**.
   * HTTP endpoints:

     * `GET /health` → `{ ok, iface, sample_ms }`
     * `GET /interfaces` → `[{ iface, operstate, ip4, speed }]`
     * `POST /reset` → `{ ok:true }` (zeros session counter)

2. **Net HUD panel (overlay)**

   * Connect to `VITE_NET_WS_URL` (default `ws://localhost:7007/net`), show:

     * **Upload**, **Download** (human readable bps)
     * **Session Usage** (human readable bytes)
     * Tiny status chip: `UP` / `DOWN`
     * Redline banner when `redline=true`
   * Read per-panel props via URL/config:

     * `bitrate` (kbps), `threshold` (0..1)

3. **Routes & composition**

   * Panel-only route: `/overlays/net`
   * Composed route via main overlay: `/overlays/main?panels=checklist(md),net(md)` (AI later)
   * Respect global params: `layout`, `scale`, `theme`, etc.

---

## File structure to create / modify

```
stream-hud/
├─ services/
│  └─ stats-bridge/
│     ├─ src/
│     │  ├─ index.ts          # boot WS + HTTP + sampling loop + heartbeat
│     │  ├─ net/
│     │  │  ├─ os.ts          # list interfaces + read rx/tx bytes
│     │  │  └─ smooth.ts      # EMA helpers
│     │  └─ routes/
│     │     └─ http.ts        # /health, /interfaces, /reset
│     ├─ .env.example
│     ├─ package.json
│     └─ tsconfig.json
│
└─ apps/
   └─ overlay/
      └─ src/
         ├─ panels/
         │  └─ NetHud.tsx      # new HUD UI (consumes WS payload)
         ├─ routes/
         │  ├─ OverlayNet.tsx  # /overlays/net
         │  └─ OverlayMain.tsx # already exists; ensure it can include 'net'
         ├─ core/
         │  ├─ types.ts        # include 'net' in PanelId
         │  └─ PanelRegistry.ts# register { net: NetHud }
         └─ lib/
            ├─ ws.ts           # robust WS client (reuse/backoff)
            ├─ params.ts       # parse ?bitrate,?threshold
            └─ format.ts       # bps/bytes helpers
```

---

## Config & payloads

**`services/stats-bridge/.env.example`**

```
STATS_PORT=7007
BIND_ADDR=127.0.0.1
IFACE=auto                 # or explicit (en0 / Wi-Fi / Ethernet)
SAMPLE_INTERVAL_MS=1000
EMA_ALPHA=0.3
TARGET_BITRATE_KBPS=3500
REDLINE_THRESHOLD=0.7
```

**WebSocket payload (v1)**

```json
{
  "v": 1,
  "ts": 1736567890,
  "iface": "en0",
  "upload_bps": 2987000,
  "download_bps": 512000,
  "session_bytes": 734003200,
  "redline": false
}
```

**Vite env in `apps/overlay`**

```
VITE_NET_WS_URL=ws://localhost:7007/net
```

**URL params**

```
# global (handled by OverlayMain)
layout=row|column|grid2|stack
scale=1.0
theme=dark|light
panels=checklist(md),net(md)

# per-panel (Net)
bitrate=3500
threshold=0.7
```

**`configs/hud.config.json` example**

```json
{
  "layout": "row",
  "gap": 16,
  "scale": 1.0,
  "theme": "dark",
  "panels": [
    { "id": "checklist", "enabled": true, "size": "md" },
    { "id": "net", "enabled": true, "size": "md", "props": { "bitrate": 3500, "threshold": 0.7 } }
  ]
}
```

---

## Implementation notes

**Interface selection**

* Auto-pick the first **up** non-virtual interface; allow override via `IFACE`.
* Expose `GET /interfaces` for manual selection (future tray menu).

**Sampling**

* Keep last `tx_prev`, `rx_prev`. At each tick:

  * `dtx = max(0, tx_now - tx_prev)`; `drx = max(0, rx_now - rx_prev)`
  * `upload_bps = (dtx * 8) / dt`; `download_bps = (drx * 8) / dt`
  * `session_bytes += dtx + drx`
  * EMA: `ema = α*current + (1-α)*ema_prev` (apply to upload/download)

**WS server**

* Path: `/net`
* Heartbeat ping every 30s; drop dead sockets; broadcast compact JSON.

**Overlay UI**

* Three tiles: Upload / Download / Session; format with helpers.
* Status chip: `UP/DOWN` (from WS state).
* Redline banner when `redline=true`, copy hints “Consider lowering bitrate”.

---

## Scripts (root or per package)

**root `package.json` add**

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:overlay": "pnpm --filter overlay dev",
    "dev:stats": "pnpm --filter stats-bridge dev",
    "build:overlay": "pnpm --filter overlay build"
  }
}
```

**services/stats-bridge/package.json (sketch)**

```json
{
  "name": "stats-bridge",
  "type": "module",
  "scripts": {
    "dev": "ts-node-esm src/index.ts"
  },
  "dependencies": {
    "ws": "^8",
    "systeminformation": "^5",
    "express": "^4",
    "cors": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "ts-node": "^10"
  }
}
```

---

## Acceptance criteria

* Start service: `pnpm dev:stats` → `GET /health` returns `{ ok:true }`; `/interfaces` lists NICs.
* Add `http://localhost:5173/overlays/net?bitrate=3500&threshold=0.7` to OBS → values update ~1 Hz.
* Begin an upload (e.g., cloud drive) → **Upload** rises; **Session Usage** increases.
* Lower `bitrate` in URL until redline triggers → banner appears.
* `POST /reset` zeros session_bytes → overlay reflects next tick.
* `/overlays/main?panels=checklist(md),net(md)` renders both panels cleanly; respects `layout`, `scale`.

---

## Nice-to-have (don’t block MVP)

* Mini UI at `http://localhost:7007/ui` to pick interface + reset.
* OBS tie-in (later): listen to obs-websocket “Start Streaming” to auto-reset.
* Session history persisted to `configs/data/net-usage.json`.

**Deliverables:** All files above with working code; updated README (how to run service, add Net overlay to OBS, URL params), brief Troubleshooting (NIC selection, firewall, Docker caveat).

> Now implement exactly this specification. Keep code typed, small, and production-ready.
