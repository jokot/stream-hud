Awesome — here’s a clean, copy-pasteable **one-shot prompt** to generate the **Checklist overlay** as a standalone first-win, plus the **project structure (only for this feature)**.

# One-shot prompt (for Claude/Trae/Cursor)

> **Title:** Stream-HUD — Checklist Overlay (v0.1 first win)
> **Goal:** Build a browser overlay (React + TS + Tailwind) that shows a live progress checklist for OBS. It must work **without any backend** (polling a local JSON file), but also support a **WebSocket** feed if available. Ship fast, simple, reliable.
>
> **Tech/stack**
>
> * Vite + React + TypeScript
> * TailwindCSS
> * Optional: framer-motion for subtle animations
>
> **Functional requirements**
>
> 1. **Checklist UI**
>
>    * Render list of items with `text` and `done`.
>    * Show **progress %** and “X / N tasks” counter.
>    * Optional groups: if items have `group`, show a small label.
>    * Subtle animations on toggle (fade/slide).
> 2. **Data sources (fallback chain)**
>
>    * Try **WebSocket** first: `VITE_CHECKLIST_WS_URL` or `ws://localhost:7006/checklist`.
>    * If WS not connected in 1s, **poll** `/configs/tasks.json` every **2000ms**.
>    * Always keep last good data; show a tiny status chip: “WS” or “POLL”.
> 3. **Config via URL params**
>
>    * `?scale=1.0` (0.5–2.0), `?title=Project%20X`, `?theme=dark|light`, `?showProgress=1|0`, `?compact=1|0`.
>    * Respect Tailwind dark mode on `theme=dark`.
> 4. **Keyboard shortcuts (local only)**
>
>    * **R** = reload data (force poll once).
>    * **T** = toggle the first incomplete item (for demo on stream).
> 5. **Types**
>
>    ```ts
>    export type ChecklistItem = { id: string; text: string; done: boolean; group?: string };
>    export type ChecklistPayload = { items: ChecklistItem[]; ts: number; source: 'ws'|'poll' };
>    ```
> 6. **Quality**
>
>    * No runtime errors.
>    * Overlay scales cleanly with `scale` param (use CSS transform origin top-left).
>    * Keep bundle light; no heavy deps beyond listed.
>
> **Files to create (relative to project root)**
>
> ```
> apps/checklist-overlay/
>   index.html
>   vite.config.ts
>   tailwind.config.ts
>   postcss.config.cjs
>   tsconfig.json
>   public/
>     favicon.svg
>   src/
>     main.tsx
>     App.tsx
>     panels/Checklist.tsx
>     lib/format.ts        # bytes/percent helpers if needed
>     lib/params.ts        # URL param helpers
>     lib/ws.ts            # WS connect with timeout; auto-reconnect
>     styles.css           # Tailwind base
> configs/
>   tasks.json             # sample data; overlay will poll this
> services/checklist-ws/
>   src/server.ts          # tiny Node WS server; reads tasks.json and broadcasts
>   tsconfig.json
>   package.json
> ```
>
> **Sample `configs/tasks.json`**
>
> ```json
> {
>   "items": [
>     { "id": "1", "text": "Scaffold overlay", "done": true },
>     { "id": "2", "text": "Render checklist items", "done": true },
>     { "id": "3", "text": "Progress % + counter", "done": false },
>     { "id": "4", "text": "Poll tasks.json fallback", "done": false },
>     { "id": "5", "text": "OBS Browser Source test", "done": false }
>   ],
>   "ts": 1736567000
> }
> ```
>
> **WS protocol**
>
> * Server URL default: `ws://localhost:7006/checklist`
> * Message payload (broadcasted when file changes or every 2s):
>
>   ```json
>   { "items":[...], "ts":1736567999, "source":"ws" }
>   ```
>
> **Minimal WS server (`services/checklist-ws/src/server.ts`)**
>
> * Node + ws.
> * Reads `../configs/tasks.json` on boot and on FS change.
> * Broadcasts every 2s OR on change.
> * No auth, local use only.
>
> **UI behavior**
>
> * Card style with rounded corners, border, slight blur (`backdrop-blur`).
> * Progress ring or bar (choose bar for simplicity).
> * If `compact=1`, hide header and use smaller spacing.
> * If `showProgress=0`, show only the list.
>
> **Dev scripts**
>
> * `pnpm --filter checklist-overlay dev` → Vite dev server (port 5173).
> * `pnpm --filter checklist-ws dev` → WS on port **7006**.
>
> **Acceptance criteria**
>
> * Opening `http://localhost:5173/?scale=1.1&theme=dark&title=Stream%20Checklist` renders the list and progress.
> * If WS up, status chip = “WS”; else “POLL”.
> * Editing `configs/tasks.json` updates the overlay within 2s.
> * Add to OBS as Browser Source → it fits + scales.
>
> **Deliverables**
>
> * All files above with working code.
> * Clear README with setup and OBS instructions.
> * No external network calls.
>
> **Style**
>
> * Clean, readable, small components.
> * No over-engineering; this is v0.1 “first win”.
> * Comment the tricky parts (WS fallback, scaling).
>
> **Now generate the project with the exact structure and working code.**

---

# Project structure (only for the checklist feature)

```
stream-hud/
├─ apps/
│  └─ checklist-overlay/
│     ├─ index.html
│     ├─ vite.config.ts
│     ├─ tailwind.config.ts
│     ├─ postcss.config.cjs
│     ├─ tsconfig.json
│     ├─ public/
│     │  └─ favicon.svg
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ styles.css
│        ├─ panels/
│        │  └─ Checklist.tsx
│        └─ lib/
│           ├─ params.ts
│           ├─ ws.ts
│           └─ format.ts
├─ services/
│  └─ checklist-ws/
│     ├─ src/
│     │  └─ server.ts        # tiny WS that streams configs/tasks.json
│     ├─ tsconfig.json
│     └─ package.json
├─ configs/
│  └─ tasks.json             # single source of truth for checklist
├─ package.json              # workspaces + scripts (pnpm)
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

**Notes**

* This is intentionally scoped to **checklist only** so you can ship v0.1 fast.
* The overlay tries WS first (`ws://localhost:7006/checklist`) and falls back to polling `configs/tasks.json`.
* You can later move this under `apps/overlay` and plug in Net HUD/AI panels, but this keeps the first win focused.

If you want, I can follow up with ready-to-paste **sample code** for `server.ts`, `ws.ts`, and `Checklist.tsx` using that structure.
