# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server at http://localhost:3000 (web only)
- `pnpm tauri dev` — Tauri desktop window (requires Rust toolchain)
- `pnpm build` — TypeScript check + Vite build
- `pnpm tauri build` — Full desktop build after `pnpm build`

## Architecture

**Stack:** React 19 + TypeScript, Vite 7, Tauri v2, Zustand, CSS Modules + CSS custom properties. Package manager: pnpm.

The app talks to the **Sazed** backend (agent API). Base URL and API key come from env: `VITE_SAZED_URL` (default `http://localhost:8000`) and `VITE_API_KEY` (optional). All requests go through `src/api/client.ts` (`apiFetch`).

**Layout (App.tsx):** Column flex, 100vh. HistoryOverlay is always mounted, toggled via `translateX`. TopBar shows Conversations toggle, Knowledge Base button (currently no-op), and online status (from `/health` poll every 30s). Chat state and session state are in Zustand stores; view switches between empty state and chat based on whether there are messages.

**Source layout:**

- `src/styles/` — `tokens.css` (CSS custom properties from `ui_reference.html`) and `reset.css` (box-sizing, body, `@font-face`). Both imported in `main.tsx`. Only global CSS.
- `src/assets/fonts/` — Self-hosted DM Sans + JetBrains Mono woff2.
- `src/mock/data.ts` — TypeScript interfaces only: `Message`, `Session`, `ToolCall`. No hardcoded message/session data; content comes from the API.
- `src/api/` — `client.ts` (apiFetch), `chat.ts` (postMessage), `conversations.ts` (list, get, process), `memory.ts` (get, put, delete).
- `src/store/` — Zustand: `chatStore` (messages, sessionId, send, newSession, loadSession), `sessionStore` (sessions, loadSessions, selectSession), `uiStore` (historyOpen, online, toggles).
- `src/components/` — TopBar/ (TrafficLights, StatusDot, IconButton, TopBar), InputBar/.
- `src/features/chat/` — ChatArea, Message, ToolCard, ToolsRow, EventLine, TaskLine, StreamingIndicator, EmptyState.
- `src/features/history/` — HistoryOverlay, HistoryItem, HistorySearch.
- `src-tauri/` — Tauri shell. Window 900×620, min 600×480, `decorations: false`. TopBar uses `-webkit-app-region: drag`; interactive children use `no-drag`.

## Conventions

- CSS Modules only on components; no global class names except in `src/styles/`.
- No media queries — desktop layout only.
- No markdown renderer in message bodies.
- Before UI changes, read `ui_reference.html` in the repo root as the design reference.
