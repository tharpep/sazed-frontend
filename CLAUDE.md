# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Vite dev server at http://localhost:3000 (web only)
- `pnpm dev:homelab` — same, against the live homelab console: mode `homelab` (`.env.homelab`) sets relative `/api` + `/gw`, and `vite.config.ts` proxies them to `https://sazed.tail77c590.ts.net` (override with `SAZED_LAB_URL`). Needs Tailscale on. No keys locally; Caddy on CT 106 adds them.
- `pnpm tauri dev` — Tauri desktop window (requires Rust toolchain)
- `pnpm build` — TypeScript check + Vite build, then `vite.cards.config.ts` builds `dist/cards/widget.html`
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
- `src/features/home/` — `HomePage`, the landing view when no conversation is open (it replaced the chat `EmptyState` and the Apps page). Top to bottom (no approvals strip; Pryce removed it, those stay on their pages and in Pushover): the greeting (tapping the name toggles private apps, `uiStore.privateRevealed`, in memory only and cleared whenever the console is backgrounded), a three-tile glance row (services up → Homelab List, free for media → Homelab Storage, next automation run → Automations), and `AppGrid`. App docks the composer below it; sending a message turns Home into the conversation, and tapping Home again (or the rail's Home) starts a new chat. The day brief, weather and suggestion pills were dropped from the landing (their hooks still feed `DisplayPage`).
- `src/features/chat/` — `MessageList`, `MessageBlock` (markdown-rendered via `react-markdown`/`remark-gfm`/`rehype-highlight`), `Composer`, `ToolCallCard`, `StreamingIndicator`.
- `src/features/journal/` — `JournalPage` (responsive two-pane ≥900px / single-pane below, inline `Editor` with autosave + raw/rendered markdown toggle, cursor-paginated "load more", per-category default subcategory pinned in `localStorage`). `ACTIVE_CATEGORY` constant gates personal — schema/API support it but the UI surface is off until a category switcher is built.
- `src/features/kb/` — `KnowledgePage` (Tailwind, mobile-first): `AddContent` (upload a file / paste text / add a URL, optional category), `SearchPanel` (test what `search_knowledge_base` returns), the sources list with `SourceSheet` (summary, stored text, delete with confirm), and `MemorySection` (Sazed's memory facts, grouped by type, add/delete). KB calls go to the gateway `/kb/*` via `src/api/kb.ts` (`gatewayFetch`; it leaves Content-Type alone for FormData uploads); memory goes to Sazed `/memory`. No Drive sync: the KB is fed only by uploads and ingest.
- `src/features/settings/`, `src/features/audit/`, `src/features/finance/` — still CSS Modules, styled via `legacy-compat.css`. Never rebuilt in the Tailwind/shadcn redesign since neither `DESIGN.md` nor the design spec detailed their visual language; reachable from the Sidebar (Settings) except Finance. `AuditPage` (the old Tool log) is no longer in the nav: the Activity page replaced it.
- `src/features/display/` — `DisplayPage`, a separate kiosk-style `/display` route, plus its own private copies of `MarkdownContent`, `StreamingIndicator`, `ToolsRow`, `ToolCard` (relocated here from `chat/` during the redesign once chat got its own differently-shaped equivalents). Out of scope for chat/journal work.
- `src/features/homelab/` — `HomelabPage` (summary, host line, services grouped Sazed/Apps/Infrastructure with problems sorted first, 30s refresh paused while hidden) and `ServiceSheet` (bottom sheet on phones, right panel on desktop: facts, maintenance/mute/notes, start/restart with a confirm dialog that names every service sharing the container, outage + container lifecycle history). Data from the gateway's `/homelab/*` via `src/api/homelab.ts`. Mobile-first by design (the iPhone is the main client). Status color rule: healthy is neutral, only down is `destructive`, maintenance uses the gold `accent`. Reached from the desktop rail and the phone tab bar (`uiStore.homelabOpen`). Its default view is now the **Map**; a Map | List | Storage toggle is remembered in localStorage (`rememberHomelabView` lets Home open a given tab). Private services (registry `private`, from the gateway's homelab-only file) are filtered out of the List, the Map's chips and counts until revealed on Home.
  - `MapView`: the architecture map, drawn from the gateway's `/homelab/map`, with no positions in code.
    - It reproduces the approved mockup: homelab frame, purple homelab nodes, gray clients and providers, and health dots.
    - Line routing lives in `mapGeometry.ts`: curves into the next column, drops within a column, `route: over` across the top.
    - It's the Wide layout. A layout switch offers Wide | Flow | Focus on desktop (lands on Wide) and Flow | Focus on phones (lands on Focus); the choice isn't remembered, so each device opens on its best fit.
  - `MapMobile.tsx`: the two phone-sized layouts, same data, live traffic and `MapPanel`; on desktop they render centred at up to 440px.
    - `FlowMap`: map columns become tiers stacked top to bottom (You, the homelab frame, Outside). Every box sits on a fixed three-slot grid, so lines that skip a row run down the gaps between slots instead of through boxes. Within a tier, boxes are ordered by where their neighbours sit, and boxes with no lines fill a free slot in a higher homelab row.
    - `FocusMap`: one box in the middle, what talks to it above and what it talks to below, in two columns around a central trunk. Tapping a box re-centres there; a trail (last 5) steps back. A box picked in Wide or Flow joins the trail.
  - `mapTraffic.ts`: live traffic from Sazed's Activity stream.
    - Each event lights the lines whose `signals` match it for 2.5 s; job steps light the worker's model line.
    - Line speed comes from the last 15 minutes of matches; idle lines are dim and slow.
  - `MapPanel`: the selected node's health, container stats (CPU, memory, disk), 15-minute traffic, recent activity on its lines, and buttons into `ServiceSheet` for actions.
  - `StorageCard`: gateway `/homelab/storage`, refreshed every 60s while visible. Shows free space for media (the Proxmox pool behind CT 100's media disk, not df), series/movies/torrent counts and sizes, how many downloads were never imported, and a collapsible disk-by-container list. No titles anywhere (Pryce doesn't want what he watches shown; the gateway doesn't send them). Rendered compact in the Media apps node's `MapPanel`, and as the Homelab page's Storage tab (`full`: every pool, containers expanded). The List view host line shows GB free per pool.
- `src/features/apps/` — `AppGrid`, rendered by `HomePage` (the separate Apps page and `uiStore.appsOpen` are gone): a launcher grid of every registry service with an `open_url`, split into Apps (registry group `apps`) and Homelab (the rest; the console itself is hidden). Tiles use the registry's `icon` slug from homarr-labs/dashboard-icons (PNG via jsDelivr, letter fallback), show a dot only when down or in maintenance, and say "home only" for non-`*.ts.net` links. CT 100's apps are served on the tailnet by `tailscale serve --https=<port>` on CT 100, so they open from the phone anywhere. Home passes the services in (private ones dropped until revealed); data from the gateway's `/homelab/services`, refreshed on load and when the page becomes visible.
- `src/features/gateway/` — `GatewayPage`: integrations (gateway `/health/integrations`; the four Google ones collapse into one row; unreported ones get a dashed dot), model spend by model and use for 24h/7d/30d plus tool-call reliability (Sazed `/audit/metrics`, via `getMetrics` in `src/api/audit.ts`; per-call detail stays in the Tool log), and the gateway's capability directory (`/health`). Reached from the desktop rail and the phone More sheet (`uiStore.gatewayOpen`).
- `src/features/automations/` — `AutomationsPage` (list with plain-English schedule via `describeCron`, next run, last run status; 30s refresh) and `AutomationSheet` (create/edit: name, prompt, cron + timezone with a live next-runs preview from `/automations/preview-schedule`, on/Pushover/journal/quiet switches, run now, delete with confirm). `RunHistory` lists runs with output and an "Open session" link that loads the run's Sazed session in chat (how a `needs_approval` run gets approved). Data from Sazed `/automations` via `src/api/automations.ts`. Gateway-call automations show read-only (edit them via the API). The page has an Automations | Jobs tab switch; Jobs is `src/features/jobs/` (below).
- `src/features/jobs/` — `JobsPanel` (start research, quick or deep, optionally saved to the KB; or a second opinion, on the sazed-worker; recent jobs list, polling every 5s while one is active) and `JobSheet` (result as markdown, a live "what it did" list built from the agent's streamed steps by `stepsFromEvents`, cancel, the prompt sent). Data from Sazed `/jobs` via `src/api/jobs.ts`.
- `src/features/backlog/` — the Backlog page (`uiStore.backlogOpen`, desktop rail plus phone More sheet).
  - `BacklogPage`: Open / Approved / Dismissed views, type filter chips, an add form, 30s refresh. The Open view splits into Priority (numbered, by rank) and "Not prioritized yet"; the sheet's Priority row moves items (Top, Up, Down, Remove, Make next, Prioritize).
  - `BacklogSheet`: markdown summary, why, repos, sources. Actions: Approve (repo and an optional note; starts the change job and PR right away), Dismiss, Restore, Mark done. Opens the item's job in `JobSheet`. Merged PRs mark items done on their own (Sazed polls); Mark done is for work done elsewhere.
  - Deep links: `/?page=<backlog|automations|homelab|kb|journal>[&item=<backlog id>]` (`apps` still works and opens Home), read once on load in `App.tsx` (Pushover buttons use them).
  - Phone tab bar: Home (launcher plus chat), Homelab, Automate (the Automations page; the short label fits next to Knowledge on a 375px phone), Knowledge, More (Conversations, Gateway, Journal, Backlog, Settings, Activity).
  - Items are never deleted: dismissed ones stay so the scout won't re-propose them.
  - Data from Sazed `/backlog` via `src/api/backlog.ts`. Scout/triage automations (`pipeline` actions) show read-only in `AutomationSheet`.
- `src/features/activity/` — the Activity page (`uiStore.auditOpen`, which it took over from the Tool log; desktop rail plus phone More sheet).
  - `ActivityPage`: the timeline, with a 24-hour summary, a "now" line, category and errors filters, and Load older.
    - It streams live from Sazed `/activity/stream`, using fetch rather than EventSource so the key header works. It reconnects with backoff and catches up from the last id.
    - Pause holds new rows; running jobs show their latest step.
  - `FlowSheet`: the flow view for an event's trace, plus linked traces.
    - Chats split into turns at each user message; the turn holding the clicked event opens.
    - Each row has a waterfall bar and a +offset; job steps nest under the job.
    - It refetches (debounced) when a live event lands in the flow.
  - `FlowRow`: one row plus its detail (tool input/output, tokens and cost, results, PR and conversation links).
  - Data via `src/api/activity.ts`.
- `src/features/auth/` — `AuthGate`, wraps the whole app in `main.tsx`.
- `src/cards/` — MCP Apps build of the catalog: one self-contained HTML file holding every widget. The gateway fills in the `__WIDGET__` meta tag per `ui://` resource, and the tool's structured result becomes the widget's props. `card.css` maps the host's theme variables onto the widgets' tokens.
- `src/widgets/` — `CalendarWidget`, `TaskWidget`, `EmailBadge`, `UpcomingWidget`, `WeatherWidget`, `ClockWidget`, `GitHubWidget`, `HomelabWidget`, `catalog.ts` (one definition per widget: component, Zod props schema, ownership, `live` for widgets that fetch their own data when given no props; compile-time checks tie each schema to its API type and component, and it generates the catalog prompt), `strictSchema.ts` (JSON Schema Claude strict tool use accepts), `WidgetRenderer` (validates props and renders chat's `UIBlock`s, with `FallbackCard` for unknown or invalid ones). Import Zod as `import * as z from "zod"`; the named import bundles every locale. Used by `DisplayPage`; not rendered as a card grid in chat anymore.
- `src-tauri/` — Tauri shell. Window 900×620, min 600×480, `decorations: false`. `TitleBar` uses `-webkit-app-region: drag`; interactive children use `no-drag`.

## Conventions

- Chat, journal, and the navigation shell are Tailwind utility classes + shadcn/ui primitives, following the OKLCH token system and Named Rules in `DESIGN.md` (read it before touching visual code in these areas) and the brand/product guidance in `PRODUCT.md`. No CSS Modules in these three areas.
- Settings, Audit, Finance, and `DisplayPage` remain CSS Modules, styled through `legacy-compat.css`'s token aliases. If you're touching one of these and want it on the new system, that's a real (unscoped) redesign task — flag it rather than half-converting.
- Markdown rendering is enabled in chat message bodies (`react-markdown` + `remark-gfm` + `rehype-highlight`, same stack the journal editor's read view already used).
- Default to desktop-only layouts without media queries. The journal feature is the deliberate exception: it ships a responsive layout (two-pane ≥900px, single-pane below) because it's used on mobile.
- `DESIGN.md` and `PRODUCT.md` are the design reference for chat/journal/shell work, replacing the old `ui_reference.html` (removed).
- View switching among Chat/Journal/KB/Settings/Audit/Finance is `uiStore` boolean state, not `react-router` routes — see Architecture above. Only `/` and `/display` are real routes.
