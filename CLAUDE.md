# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server at http://localhost:3000 (web only)
- `pnpm tauri dev` — Tauri desktop window (requires Rust toolchain)
- `pnpm build` — TypeScript check + Vite build
- `pnpm tauri build` — Full desktop build after `pnpm build`

## Architecture

**Stack:** React 19 + TypeScript, Vite 7, Tauri v2, Zustand, Tailwind v4 + shadcn/ui (Base UI primitives, owned as source under `src/components/ui/`) + Motion for chat/journal/layout. KB, Settings, and Audit still use CSS Modules against a compatibility token layer (see Conventions). Package manager: pnpm.

The app talks to the **Sazed** backend (agent API). Base URL and API key come from env: `VITE_SAZED_URL` (default `http://localhost:8000`) and `VITE_API_KEY` (optional). All requests go through `src/api/client.ts` (`apiFetch`).

**Layout (`App.tsx` + `components/layout/`):** `AppShell` composes `TitleBar` (top, custom Tauri chrome) + `Sidebar` (left, collapsible icon-rail) + a content slot. `App.tsx` itself only holds view-switching state (via `uiStore` booleans, not routes — see below) and renders the active view into that slot. `main.tsx` separately mounts a `BrowserRouter` with two real routes: `/` (the app, i.e. `App.tsx`) and `/display` (`DisplayPage`, a self-contained kiosk-style display view, out of this rebuild's scope).

**View switching is boolean-flag-based, not routed.** `uiStore` holds one boolean per destination (`historyOpen`, `kbOpen`, `settingsOpen`, `auditOpen`, `financeOpen`, `journalOpen`); each `toggleX()` action resets all the others. `Sidebar` calls these toggles directly. `financeOpen`/`FinancePage` still exist and work but have no Sidebar entry — Finance was excluded from navigation by product decision, not deleted.

**Theming:** `components/theme/ThemeProvider.tsx` — light/dark/system, persisted to `localStorage` (`sazed-theme` key), toggles the `.dark` class on `<html>`. `ThemeToggle` lives at the bottom of the Sidebar rail.

**Source layout:**

- `src/styles/` — `globals.css` (Tailwind v4 entry: `@theme` tokens sourced from `DESIGN.md`'s OKLCH palette, `@custom-variant dark`, shadcn's structural tokens aliased onto the same palette, rehype-highlight syntax colors, `.prose-journal` baseline). `legacy-compat.css` (aliases the old CSS Modules token vocabulary — `--bg`, `--text-*`, `--space-*`, `--pastel-*`, etc. — onto the new tokens, so KB/Settings/Audit keep working without a full rebuild). Both imported once in `main.tsx`.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge), the shadcn convention. `@/*` path alias resolves to `./src/*` (see `tsconfig.json` / `vite.config.ts`).
- `src/assets/fonts/` — unused now; fonts come from the `geist` npm package (`geist/font/sans`, `geist/font/mono`, imported in `main.tsx`) and `@fontsource-variable/fraunces` (imported in `globals.css`).
- `src/mock/data.ts` — TypeScript interfaces only: `Message`, `Session`, `MessageBlock`/`ToolBlock`/`UIBlock`. No hardcoded message/session data; content comes from the API.
- `src/api/` — `client.ts` (apiFetch), `chat.ts` (postMessage), `conversations.ts` (list, get, process), `memory.ts` (get, put, delete), `journal.ts` (listEntries with cursor pagination, CRUD, listSubcategories), `display.ts`, `audit.ts`, `finance.ts`.
- `src/store/` — Zustand: `chatStore`, `sessionStore`, `uiStore` (view-switching booleans + online status), `settingsStore`, `configStore`, `kbStore`, `memoryStore`.
- `src/components/ui/` — shadcn/ui primitives (button, dialog, sheet, dropdown-menu, tooltip, scroll-area, separator, switch, textarea, avatar, tabs, badge). Owned source, restyled per component as they're used — not consumed as a themed package.
- `src/components/theme/` — `ThemeProvider`, `ThemeToggle`.
- `src/components/layout/` — `TitleBar`, `Sidebar`, `AppShell`.
- `src/features/chat/` — `EmptyState` (time-aware greeting + one-line day brief + composer + suggestion pills — deliberately not a widget card grid, see below), `MessageList`, `MessageBlock` (markdown-rendered via `react-markdown`/`remark-gfm`/`rehype-highlight`), `Composer`, `ToolCallCard`, `StreamingIndicator`.
- `src/features/journal/` — `JournalPage` (responsive two-pane ≥900px / single-pane below, inline `Editor` with autosave + raw/rendered markdown toggle, cursor-paginated "load more", per-category default subcategory pinned in `localStorage`). `ACTIVE_CATEGORY` constant gates personal — schema/API support it but the UI surface is off until a category switcher is built.
- `src/features/kb/`, `src/features/settings/`, `src/features/audit/`, `src/features/finance/` — still CSS Modules, styled via `legacy-compat.css`. Never rebuilt in the Tailwind/shadcn redesign since neither `DESIGN.md` nor the design spec detailed their visual language; reachable from the Sidebar (KB, Settings, Audit) except Finance.
- `src/features/display/` — `DisplayPage`, a separate kiosk-style `/display` route, plus its own private copies of `MarkdownContent`, `StreamingIndicator`, `ToolsRow`, `ToolCard` (relocated here from `chat/` during the redesign once chat got its own differently-shaped equivalents). Out of scope for chat/journal work.
- `src/features/auth/` — `AuthGate`, wraps the whole app in `main.tsx`.
- `src/widgets/` — `CalendarWidget`, `TaskWidget`, `EmailBadge`, `UpcomingWidget`, `WeatherWidget`, `ClockWidget`, `GitHubWidget`, `WidgetRenderer` (registry-based, renders chat's `UIBlock`s). Used by `DisplayPage` and by `EmptyState`'s day-brief data hooks; not rendered as a card grid in chat anymore.
- `src-tauri/` — Tauri shell. Window 900×620, min 600×480, `decorations: false`. `TitleBar` uses `-webkit-app-region: drag`; interactive children use `no-drag`.

## Conventions

- Chat, journal, and the navigation shell are Tailwind utility classes + shadcn/ui primitives, following the OKLCH token system and Named Rules in `DESIGN.md` (read it before touching visual code in these areas) and the brand/product guidance in `PRODUCT.md`. No CSS Modules in these three areas.
- KB, Settings, Audit, Finance, and `DisplayPage` remain CSS Modules, styled through `legacy-compat.css`'s token aliases. If you're touching one of these and want it on the new system, that's a real (unscoped) redesign task — flag it rather than half-converting.
- Markdown rendering is enabled in chat message bodies (`react-markdown` + `remark-gfm` + `rehype-highlight`, same stack the journal editor's read view already used).
- Default to desktop-only layouts without media queries. The journal feature is the deliberate exception: it ships a responsive layout (two-pane ≥900px, single-pane below) because it's used on mobile.
- `DESIGN.md` and `PRODUCT.md` are the design reference for chat/journal/shell work, replacing the old `ui_reference.html` (removed).
- View switching among Chat/Journal/KB/Settings/Audit/Finance is `uiStore` boolean state, not `react-router` routes — see Architecture above. Only `/` and `/display` are real routes.
