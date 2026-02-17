# Sazed Frontend — UI Build Plan

Reference mockup: `ui_reference.html` (repo root). Read it before building anything.
**Goal: pixel-accurate static UI only. No backend calls, no API layer, no real state management. All data is hardcoded mock data.**

---

## Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Desktop | Tauri v2 |
| Package manager | pnpm |
| Styling | CSS Modules + CSS custom properties (no Tailwind, no CSS-in-JS) |
| State | React `useState` only — local component state for UI toggles |
| Fonts | Self-hosted DM Sans + JetBrains Mono (woff2) — no Google Fonts link |

No Zustand. No API client. No `.env` variables. No `fetch` calls anywhere.

---

## Final File Tree

```
src/
├── styles/
│   ├── tokens.css          ← all CSS custom properties from ui_reference.html :root block, verbatim
│   └── reset.css           ← box-sizing reset, body base styles, @font-face declarations
├── assets/
│   └── fonts/              ← DM Sans (300,400,500,600) + JetBrains Mono (400,500) woff2 files
├── mock/
│   └── data.ts             ← all hardcoded mock data (messages, sessions, memory facts)
├── components/
│   ├── TopBar/
│   │   ├── TopBar.tsx           ← full top bar, owns layout of children
│   │   ├── TopBar.module.css
│   │   ├── TrafficLights.tsx    ← three colored dots (red/yellow/green), decorative only
│   │   ├── StatusDot.tsx        ← pulsing green dot, always online in static build
│   │   └── IconButton.tsx       ← 30×30 icon button, props: active?, title, onClick, children
│   └── InputBar/
│       ├── InputBar.tsx         ← › prompt + input field + blinking cursor when empty/unfocused
│       └── InputBar.module.css
├── features/
│   ├── chat/
│   │   ├── ChatArea.tsx         ← scrollable message list, renders mock messages
│   │   ├── ChatArea.module.css
│   │   ├── Message.tsx          ← one turn; role: 'user' | 'assistant'
│   │   ├── Message.module.css
│   │   ├── ToolCard.tsx         ← icon + label + ✓ check
│   │   ├── ToolsRow.tsx         ← flex row of ToolCard components
│   │   ├── EventLine.tsx        ← mono time + event name + optional meta
│   │   ├── TaskLine.tsx         ← accent arrow + task text
│   │   ├── StreamingIndicator.tsx ← three pulsing dots (always visible in the streaming demo frame)
│   │   └── EmptyState.tsx       ← greeting + summary line + quick-action pills
│   └── history/
│       ├── HistoryOverlay.tsx   ← absolute overlay, slides in from left via translateX
│       ├── HistoryOverlay.module.css
│       ├── HistoryItem.tsx      ← session title (truncated) + relative time, prop: active
│       └── HistorySearch.tsx    ← uncontrolled input, visual only
├── App.tsx                 ← root shell: owns historyOpen toggle, renders all views
├── App.module.css
├── main.tsx                ← ReactDOM.createRoot, imports tokens.css and reset.css
└── vite-env.d.ts
```

---

## Mock Data (`src/mock/data.ts`)

All content rendered in the app comes from this file. Export typed constants:

```
MOCK_MESSAGES — array of message objects matching the active chat in the reference:
  - user: "What's happening today? And remind me about the Voyage AI rate limits..."
  - assistant: tools=[calendar ✓, kb ✓], body with event lines (10:00 standup, 1:00 office hours, 5:30 gym) + Voyage AI paragraph
  - user: "Ha, sounds like me. Create a task to implement the backoff logic this week."
  - assistant: tools=[tasks ✓], body: "Done. Added to your list, due Friday."

MOCK_SESSIONS — array of session objects for the history overlay:
  - Today: "Calendar & Voyage AI rate limits" (active), 8:42 AM
  - Yesterday: "KB sync endpoint debugging" 3:15 PM, "Senior design progress report" 10:20 AM
  - This Week: "Neon connection pool config", "Voyage AI embedding tests", "Session processing design", "Gateway auth refactor notes"

MOCK_EVENTS — used inside MOCK_MESSAGES assistant body:
  - { time: "10:00", name: "Senior Design standup", meta: "· 30m, Zoom" }
  - { time: "1:00",  name: "Office hours — Dr. Chen", meta: "" }
  - { time: "5:30",  name: "Gym", meta: "" }
```

---

## Component Specs

### App.tsx
- Root layout: `display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg)`.
- Local state: `const [historyOpen, setHistoryOpen] = useState(false)`.
- Local state: `const [view, setView] = useState<'empty' | 'chat'>('chat')` — default to `'chat'` so mock messages are visible immediately.
- Renders `<HistoryOverlay>` always in the DOM, toggled via `translateX` (never `display: none` — the slide animation requires the element to stay mounted).
- Shows `<EmptyState>` when `view === 'empty'`, `<ChatArea>` when `view === 'chat'`.
- Always renders `<InputBar>` at the bottom.
- Passes `historyOpen` and `onToggleHistory={() => setHistoryOpen(o => !o)}` to `<TopBar>`.

### TopBar
- `display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; background: var(--bg)`.
- Apply `-webkit-app-region: drag` via an inline style or CSS class on the topbar element.
- Apply `-webkit-app-region: no-drag` on `TrafficLights` and the right-side actions wrapper so clicks register.
- Left: `<TrafficLights />`.
- Center: title — `font-size: 12px; color: var(--text-faint)`. Content: `<strong>sazed</strong> · session #247`.
- Right: conversations `<IconButton active={historyOpen}>` (chat bubble SVG), KB `<IconButton>` (book SVG, no-op), `<StatusDot />`.

### TrafficLights
- Three `div` elements, each `11×11px`, `border-radius: 50%`. Gap: `7px`. `display: flex`.
- Colors: `#E8706B` (red), `#E8C46B` (yellow), `#6BC880` (green).
- Purely decorative. No click handlers.

### StatusDot
- Single `div`: `6×6px`, `border-radius: 50%`, `background: var(--success)`.
- Animation: `pulse 2.5s ease-in-out infinite` — keyframes: `0%, 100% { opacity: 1 }  50% { opacity: 0.35 }`.
- Always rendered as "online" in the static build.

### IconButton
- Props: `active?: boolean`, `title?: string`, `onClick?: () => void`, `children: ReactNode`.
- `30×30px`, `border-radius: 7px`, `border: none`, `background: transparent`, `color: var(--text-faint)`, `cursor: pointer`.
- Hover: `background: var(--bg-hover); color: var(--text-secondary)`.
- When `active`: `background: var(--accent-soft); color: var(--accent)`.
- Children are SVG icons passed inline (15×15px, `stroke="currentColor"`, `strokeWidth={2}`, `fill="none"`).

### HistoryOverlay
- `position: absolute; top: 0; left: 0; width: 260px; height: 100%; background: var(--bg-elevated); border-right: 1px solid var(--border); z-index: 20`.
- `transition: transform 0.3s var(--ease)`.
- Hidden: `transform: translateX(-100%)`. Visible: `transform: translateX(0)`. Controlled by `open` prop.
- **Header** (`padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center`):
  - "History" — `font-size: 13px; font-weight: 500; color: var(--text-secondary)`.
  - `+` button: `26×26px`, `border-radius: 6px`, `border: 1px solid var(--border)`, hover uses accent colors. No-op click.
- **Search** (`padding: 10px 12px; border-bottom: 1px solid var(--border)`): input field, `border-radius: 6px`, `background: var(--bg)`, placeholder "Search conversations...", focus `border-color: var(--accent-muted)`. Visual only.
- **List**: renders `MOCK_SESSIONS` grouped by date. Date group labels: `font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); padding: 12px 8px 6px`.
- Each `<HistoryItem>` receives `active` prop. First item (today's session) is always active.

### HistoryItem
- `padding: 9px 10px; border-radius: 7px; cursor: pointer`.
- Hover: `background: var(--bg-hover)`.
- Active: `background: var(--accent-soft)`.
- Title: `font-size: 13px; color: var(--text)` (active: `color: var(--accent)`). `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
- Time: `font-size: 11px; color: var(--text-faint); margin-top: 2px`.
- No click behavior needed beyond visual hover.

### ChatArea
- `flex: 1; overflow-y: auto; padding: 20px 24px`.
- Inner content `div`: `max-width: 680px; width: 100%; margin: 0 auto; display: flex; flex-direction: column`.
- Renders `MOCK_MESSAGES` mapped to `<Message>` components.
- No scroll-to-bottom logic needed (static content fits in view).

### Message
- Props: `role: 'user' | 'assistant'`, `content: string`, `tools?: ToolCall[]`, `children?: ReactNode`.
- Outer: `margin-bottom: 20px; display: flex; flex-direction: column; gap: 5px`.
- Label: `font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase`. "you" in `var(--accent)`, "sazed" in `var(--text-faint)`.
- For assistant with tools: render `<ToolsRow tools={tools} />` between label and body.
- Body: `font-size: 14px; line-height: 1.65; color: var(--text); letter-spacing: -0.005em`.
- For the assistant message with calendar data: render `<EventLine>` components inside the body instead of plain text.

### ToolCard
- Props: `category: 'calendar' | 'email' | 'tasks' | 'kb' | 'notify' | 'memory'`, `label: string`, `done?: boolean`.
- `display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; cursor: pointer`.
- Hover: `background: var(--bg-surface); border-color: var(--border-strong)`.
- Icon `div`: `22×22px`, `border-radius: 5px`. Category → color/bg:
  - `calendar` → `var(--pastel-green)` / `var(--pastel-green-bg)`
  - `email` → `var(--pastel-red)` / `var(--pastel-red-bg)`
  - `tasks` → `var(--pastel-blue)` / `var(--pastel-blue-bg)`
  - `kb` → `var(--pastel-purple)` / `var(--pastel-purple-bg)`
  - `notify` → `var(--pastel-amber)` / `var(--pastel-amber-bg)`
  - `memory` → `var(--pastel-amber)` / `var(--pastel-amber-bg)`
- Label: `color: var(--text-secondary); white-space: nowrap`.
- Check `✓`: `color: var(--success); font-size: 11px; margin-left: 2px`. Only render when `done === true`.

### EventLine
- Props: `time: string`, `name: string`, `meta?: string`.
- `display: flex; align-items: baseline; gap: 10px; padding: 2px 0`.
- Time: `font-family: var(--mono); font-size: 12px; color: var(--accent-muted); flex-shrink: 0; min-width: 48px`.
- Name: `color: var(--text); font-size: 14px`.
- Meta: `color: var(--text-tertiary); font-size: 13px`.

### TaskLine
- Props: `text: string`.
- `display: flex; align-items: baseline; gap: 8px; padding: 2px 0`.
- Arrow `→`: `color: var(--accent); font-size: 13px; flex-shrink: 0`.
- Text: `font-size: 14px; color: var(--text)`.

### StreamingIndicator
- Three `div` elements: `4×4px`, `border-radius: 50%`, `background: var(--text-faint)`.
- `display: flex; gap: 4px; padding: 4px 0; align-items: center`.
- Animation per dot: `stream 1.4s ease-in-out infinite`. Keyframes: `0%, 80%, 100% { opacity: 0.2; transform: scale(0.8) }  40% { opacity: 1; transform: scale(1) }`.
- Dot 2: `animation-delay: 0.2s`. Dot 3: `animation-delay: 0.4s`.
- In the static build, `StreamingIndicator` is rendered as the last item in the streaming demo view (visible in the mobile streaming frame of the reference). It is not shown in the main chat view.

### EmptyState
- `flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px`.
- Greeting: `font-size: 22px; font-weight: 300; color: var(--text); letter-spacing: -0.02em`. Text: `"Evening, Pryce"`.
- Sub: `font-size: 13px; color: var(--text-faint)`. Text: `"2 tasks due tomorrow · inbox clear"`.
- Quick actions wrapper: `display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; justify-content: center`.
- Each pill: `padding: 7px 14px; border-radius: 100px; border: 1px solid var(--border); background: transparent; color: var(--text-tertiary); font-size: 12px; cursor: pointer; letter-spacing: 0.01em`.
  - Hover: `border-color: var(--accent-muted); color: var(--accent); background: var(--accent-soft)`. Transition: `0.2s var(--ease)`.
- Pills: "Tomorrow's plan", "Open tasks", "Search notes", "Unread emails". All no-op clicks in static build.

### InputBar
- `padding: 10px 24px 18px; border-top: 1px solid var(--border); flex-shrink: 0; background: var(--bg)`.
- Inner row: `max-width: 680px; margin: 0 auto; display: flex; align-items: center; gap: 10px`.
- `›` prompt: `font-family: var(--mono); font-size: 14px; color: var(--accent); opacity: 0.7; flex-shrink: 0; user-select: none`.
- Input `<input type="text">`: `flex: 1; border: none; outline: none; font-family: var(--font); font-size: 14px; color: var(--text); background: transparent; padding: 8px 0; caret-color: var(--accent)`. Placeholder: `"ask sazed anything..."`, `color: var(--text-faint)`.
- Blinking cursor: a separate `span` element — `width: 1.5px; height: 16px; background: var(--accent); animation: blink 1.1s step-end infinite; vertical-align: text-bottom; opacity: 0.7`. Show only when input value is `""` and input is not focused. Use local `useState` for focus tracking.
- Keyframes for blink: `0%, 100% { opacity: 0.7 }  50% { opacity: 0 }`.
- In the static build, Enter key clears the input only (no network call, no message appended).

---

## Build Order

Build strictly in this order. Each step must render without errors before proceeding.

1. **Foundation** — Create `tokens.css` (verbatim `:root` block from `ui_reference.html`), `reset.css` (box-sizing, body base, `@font-face` for self-hosted fonts). Import both in `main.tsx`. Delete `App.css` and `index.css`.
2. **Fonts** — Download DM Sans and JetBrains Mono woff2 subsets and place in `src/assets/fonts/`. Wire `@font-face` in `reset.css`. Verify fonts render in browser.
3. **App shell** — Rewrite `App.tsx` + `App.module.css`: `.app` container (`flex-column, 100vh, overflow hidden, background: var(--bg)`). Placeholder `<div>` for each region (topbar, main, inputbar). Confirm dark background fills window.
4. **Tauri window** — Update `src-tauri/tauri.conf.json`: `width: 900, height: 620, minWidth: 600, minHeight: 480, decorations: false`. Restart `pnpm tauri dev` to apply.
5. **TopBar** — `TrafficLights`, `StatusDot`, `IconButton`, assembled in `TopBar`. Hardcode title to "sazed · session #247". History button is non-functional stub. Confirm drag region works in Tauri.
6. **InputBar** — Static render. Blink cursor logic (local `useState` for focus + value). Enter clears input. No message append.
7. **EmptyState** — Greeting, sub text, quick-action pills. All static. No-op clicks.
8. **Mock data** — Create `src/mock/data.ts` with `MOCK_MESSAGES`, `MOCK_SESSIONS`, `MOCK_EVENTS`. TypeScript interfaces: `Message`, `Session`, `ToolCall`.
9. **ToolCard + ToolsRow** — Render `ToolsRow` with sample `MOCK_MESSAGES` tools. Verify category colors match reference.
10. **EventLine + TaskLine** — Render inside a hardcoded assistant message body. Verify mono font and color tokens.
11. **Message** — Full component with label, optional ToolsRow, body (plain text or EventLine children). Render both a user message and an assistant message with tools.
12. **StreamingIndicator** — Three-dot animation. Render standalone to verify timing.
13. **ChatArea** — Map `MOCK_MESSAGES` to `<Message>` components. Confirm layout matches the "Desktop — Active Conversation" frame in the reference.
14. **HistoryOverlay** — Static render with `MOCK_SESSIONS`. Date grouping, active item. No search logic.
15. **Toggle** — Wire `historyOpen` state in `App.tsx`: conversations `IconButton` in `TopBar` calls `onToggleHistory`, `HistoryOverlay` receives `open` prop and applies `translateX`. Verify slide animation.
16. **Visual QA** — Open `ui_reference.html` in a browser side-by-side with `pnpm dev`. Check every element: spacing, font weights, colors, borders, animations. Fix deviations.

---

## Tauri Window Config

Update `src-tauri/tauri.conf.json` window entry:

```json
{
  "title": "Sazed",
  "width": 900,
  "height": 620,
  "minWidth": 600,
  "minHeight": 480,
  "decorations": false,
  "transparent": false
}
```

`decorations: false` removes the native OS title bar. The custom `TopBar` with traffic lights takes its place. `-webkit-app-region: drag` on the `TopBar` element makes the bar draggable; `no-drag` on interactive children (TrafficLights, action buttons) ensures clicks still register.

---

## Hard Rules

- **No `fetch` calls.** No API client. No `.env` variables. No network requests of any kind.
- **No Zustand.** State is `useState` only, and only for UI toggles (`historyOpen`, input focus/value).
- **No `display: none` on `HistoryOverlay`.** Use `translateX` only. The element must stay mounted.
- **No media queries.** Desktop layout only.
- **No markdown renderer.** Plain text in `MessageBody`.
- **No scroll-to-bottom logic.** Mock content is short enough.
- **All content comes from `src/mock/data.ts`.** No hardcoded strings scattered across components.
- **CSS Modules only.** No global class names on components. Tokens and reset are the only global CSS files.
