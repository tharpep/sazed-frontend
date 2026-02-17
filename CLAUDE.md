# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server at http://localhost:3000 (web only)
- `pnpm tauri dev` — Tauri desktop window (requires Rust toolchain)
- `pnpm build` — TypeScript check + Vite build
- `pnpm tauri build` — Full desktop build after `pnpm build`

## Architecture

Static UI only. No backend, no API calls, no network requests anywhere. All rendered content comes from `src/mock/data.ts`.

**Stack:** React 19 + TypeScript, Vite 7, Tauri v2, CSS Modules + CSS custom properties. Package manager: pnpm.

**Layout (App.tsx):** Column flex, 100vh. State: `historyOpen` (boolean) and `view` (`'empty' | 'chat'`, defaults to `'chat'`). HistoryOverlay is always mounted, toggled via `translateX` — never `display: none`.

**Source layout:**
- `src/styles/` — `tokens.css` (all CSS custom properties from `ui_reference.html`) and `reset.css` (box-sizing, body, `@font-face`). Both imported in `main.tsx`. These are the only global CSS files.
- `src/assets/fonts/` — Self-hosted DM Sans + JetBrains Mono woff2 files.
- `src/mock/data.ts` — All hardcoded content: `MOCK_MESSAGES`, `MOCK_SESSIONS`, `MOCK_EVENTS`. TypeScript interfaces: `Message`, `Session`, `ToolCall`.
- `src/components/` — Shared UI primitives: `TopBar/` (TrafficLights, StatusDot, IconButton, TopBar) and `InputBar/`.
- `src/features/chat/` — Chat view: ChatArea, Message, ToolCard, ToolsRow, EventLine, TaskLine, StreamingIndicator, EmptyState.
- `src/features/history/` — HistoryOverlay, HistoryItem, HistorySearch.
- `src-tauri/` — Rust/Tauri shell. Window: 900×620, min 600×480, `decorations: false` (no native title bar). TopBar uses `-webkit-app-region: drag`; interactive children use `no-drag`.

## Hard Rules

- No `fetch` calls, no API client, no `.env` variables.
- No Zustand — `useState` only, exclusively for UI toggles.
- CSS Modules only on components; no global class names.
- No media queries — desktop layout only.
- No markdown renderer in message bodies.
- All content must come from `src/mock/data.ts`, not scattered string literals.
- Before making any UI changes, read `ui_reference.html` in the repo root — it is the pixel-accurate design reference.
