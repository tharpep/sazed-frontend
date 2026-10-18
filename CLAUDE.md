# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server at http://localhost:3000 (web only)
- `pnpm dev:homelab` — same, against the live homelab console: mode `homelab` (`.env.homelab`) sets relative `/api` + `/gw`, and `vite.config.ts` proxies them to `https://sazed.tail77c590.ts.net` (override with `SAZED_LAB_URL`). Needs Tailscale on. No keys locally; Caddy on CT 106 adds them.
- `pnpm tauri dev` — Tauri desktop window (requires Rust toolchain)
- `pnpm build` — TypeScript check + Vite build
- `pnpm tauri build` — Full desktop build after `pnpm build`

## Architecture

**Stack:** React 19 + TypeScript, Vite 7, Tauri v2, Zustand, Tailwind v4 + shadcn/ui (Base UI primitives, owned as source under `src/components/ui/`) + Motion for chat/journal/layout. Settings and Audit still use CSS Modules against a compatibility token layer (see Conventions). Package manager: pnpm.

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
- `src/features/kb/` — `KnowledgePage` (Tailwind, mobile-first): `AddContent` (upload a file / paste text / add a URL, optional category), `SearchPanel` (test what `search_knowledge_base` returns), the sources list with `SourceSheet` (summary, stored text, delete with confirm), and `MemorySection` (Sazed's memory facts, grouped by type, add/delete). KB calls go to the gateway `/kb/*` via `src/api/kb.ts` (`gatewayFetch`; it leaves Content-Type alone for FormData uploads); memory goes to Sazed `/memory`. No Drive sync: the KB is fed only by uploads and ingest.
- `src/features/settings/`, `src/features/audit/`, `src/features/finance/` — still CSS Modules, styled via `legacy-compat.css`. Never rebuilt in the Tailwind/shadcn redesign since neither `DESIGN.md` nor the design spec detailed their visual language; reachable from the Sidebar (Settings, Audit) except Finance.
- `src/features/display/` — `DisplayPage`, a separate kiosk-style `/display` route, plus its own private copies of `MarkdownContent`, `StreamingIndicator`, `ToolsRow`, `ToolCard` (relocated here from `chat/` during the redesign once chat got its own differently-shaped equivalents). Out of scope for chat/journal work.
- `src/features/homelab/` — `HomelabPage` (summary, host line, services grouped Sazed/Apps/Infrastructure with problems sorted first, 30s refresh paused while hidden) and `ServiceSheet` (bottom sheet on phones, right panel on desktop: facts, maintenance/mute/notes, start/restart with a confirm dialog that names every service sharing the container, outage + container lifecycle history). Data from the gateway's `/homelab/*` via `src/api/homelab.ts`. Mobile-first by design (the iPhone is the main client). Status color rule: healthy is neutral, only down is `destructive`, maintenance uses the gold `accent`. Reached from the desktop rail and the phone More sheet (`uiStore.homelabOpen`).
- `src/features/gateway/` — `GatewayPage`: integrations (gateway `/health/integrations`; the four Google ones collapse into one row; unreported ones get a dashed dot), model spend by model and use for 24h/7d/30d plus tool-call reliability (Sazed `/audit/metrics`, via `getMetrics` in `src/api/audit.ts`; per-call detail stays in the Tool log), and the gateway's capability directory (`/health`). Reached from the desktop rail and the phone More sheet (`uiStore.gatewayOpen`).
- `src/features/automations/` — `AutomationsPage` (list with plain-English schedule via `describeCron`, next run, last run status; 30s refresh) and `AutomationSheet` (create/edit: name, prompt, cron + timezone with a live next-runs preview from `/automations/preview-schedule`, on/Pushover/journal/quiet switches, run now, delete with confirm). `RunHistory` lists runs with output and an "Open session" link that loads the run's Sazed session in chat (how a `needs_approval` run gets approved). Data from Sazed `/automations` via `src/api/automations.ts`. Gateway-call automations show read-only (edit them via the API). The page has an Automations | Jobs tab switch; Jobs is `src/features/jobs/` (below).
- `src/features/jobs/` — `JobsPanel` (start research, quick or deep, optionally saved to the KB; or a second opinion, on the sazed-worker; recent jobs list, polling every 5s while one is active) and `JobSheet` (result as markdown, a live "what it did" list built from the agent's streamed steps by `stepsFromEvents`, cancel, the prompt sent). Data from Sazed `/jobs` via `src/api/jobs.ts`.
- `src/features/backlog/` — the Backlog page (`uiStore.backlogOpen`, desktop rail plus phone More sheet).
  - `BacklogPage`: Open / Approved / Dismissed views, type filter chips, an add form, 30s refresh.
  - `BacklogSheet`: markdown summary, why, repos, sources. Actions: Approve (repo and an optional note; starts the change job and PR right away), Dismiss, Restore, Mark done. Opens the item's job in `JobSheet`.
  - Items are never deleted: dismissed ones stay so the scout won't re-propose them.
  - Data from Sazed `/backlog` via `src/api/backlog.ts`. Scout/triage automations (`pipeline` actions) show read-only in `AutomationSheet`.
- `src/features/auth/` — `AuthGate`, wraps the whole app in `main.tsx`.
- `src/widgets/` — `CalendarWidget`, `TaskWidget`, `EmailBadge`, `UpcomingWidget`, `WeatherWidget`, `ClockWidget`, `GitHubWidget`, `WidgetRenderer` (registry-based, renders chat's `UIBlock`s). Used by `DisplayPage` and by `EmptyState`'s day-brief data hooks; not rendered as a card grid in chat anymore.
- `src-tauri/` — Tauri shell. Window 900×620, min 600×480, `decorations: false`. `TitleBar` uses `-webkit-app-region: drag`; interactive children use `no-drag`.

## Conventions

- Chat, journal, and the navigation shell are Tailwind utility classes + shadcn/ui primitives, following the OKLCH token system and Named Rules in `DESIGN.md` (read it before touching visual code in these areas) and the brand/product guidance in `PRODUCT.md`. No CSS Modules in these three areas.
- Settings, Audit, Finance, and `DisplayPage` remain CSS Modules, styled through `legacy-compat.css`'s token aliases. If you're touching one of these and want it on the new system, that's a real (unscoped) redesign task — flag it rather than half-converting.
- Markdown rendering is enabled in chat message bodies (`react-markdown` + `remark-gfm` + `rehype-highlight`, same stack the journal editor's read view already used).
- Default to desktop-only layouts without media queries. The journal feature is the deliberate exception: it ships a responsive layout (two-pane ≥900px, single-pane below) because it's used on mobile.
- `DESIGN.md` and `PRODUCT.md` are the design reference for chat/journal/shell work, replacing the old `ui_reference.html` (removed).
- View switching among Chat/Journal/KB/Settings/Audit/Finance is `uiStore` boolean state, not `react-router` routes — see Architecture above. Only `/` and `/display` are real routes.
