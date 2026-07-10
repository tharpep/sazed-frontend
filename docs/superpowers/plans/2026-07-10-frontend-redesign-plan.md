# Sazed Frontend Redesign Implementation Plan

> **For agentic workers:** This plan is executed inline, in the same session it was written, by the same agent — not handed off to a fresh subagent. Component-level tasks specify exact contracts (props, behavior, which `DESIGN.md` tokens apply) rather than frozen JSX; the actual markup/CSS is written at build time against those contracts, since this is taste-driven visual craft, not a deterministic transformation. Mechanical setup tasks (dependencies, Tailwind config, tsconfig) ARE fully literal — there's one right answer for those.

**Goal:** Rebuild the entire presentation layer of the Sazed desktop/web app on Tailwind v4 + shadcn/ui + Motion, per `DESIGN.md`'s "Quiet Study" system, while leaving `src/api/`, `src/store/`, and `src-tauri/` untouched.

**Architecture:** See `DESIGN.md` (design system) and `docs/superpowers/specs/2026-07-10-frontend-redesign-design.md` (product spec) — both already committed and approved.

**Tech Stack:** React 19, TypeScript, Vite 7, Tailwind v4 (`@tailwindcss/vite`, CSS-first `@theme` config), shadcn/ui (Radix primitives, owned as source), Motion (`motion/react`), `geist` + `@fontsource-variable/fraunces` for type, `react-markdown` + `remark-gfm` + `rehype-highlight` (already installed, now also used in chat). Package manager: pnpm.

**No test suite in this repo** (confirmed via `CLAUDE.md`). Verification is `pnpm build` (TypeScript check + Vite build), `pnpm dev` booting without console errors, and manual visual review. **I have no browser/screenshot tool in this environment** — I cannot visually verify the result myself. Every task's verification step is build/type/import-level only; actual visual quality needs the user to run `pnpm dev` (or `pnpm tauri dev`) and look at it.

---

## File Structure

```
src/
  styles/
    globals.css          — @import "tailwindcss"; @custom-variant dark; @theme block (all DESIGN.md tokens); @font-face / font imports; base layer resets
  lib/
    utils.ts              — cn() helper (clsx + tailwind-merge), shadcn convention
  components/
    ui/                    — shadcn primitives, CLI-scaffolded then restyled: button, dialog, sheet, dropdown-menu, tooltip, scroll-area, separator, switch, textarea, avatar, tabs, badge
    theme/
      ThemeProvider.tsx    — light/dark/system, persists to localStorage, sets `.dark` class on <html>
      ThemeToggle.tsx      — sun/moon toggle button
    layout/
      TitleBar.tsx          — Tauri chrome: traffic-light-region + drag region, restyled
      Sidebar.tsx            — collapsible icon-rail; expands to show conversation list + journal/settings nav
      AppShell.tsx            — composes TitleBar + Sidebar + routed content, replaces current App.tsx body
  features/
    chat/
      EmptyState.tsx        — time-aware Fraunces greeting
      MessageList.tsx        — scrollable transcript
      MessageBlock.tsx        — flat message (no bubble), markdown-rendered
      Composer.tsx              — auto-growing textarea + send button
      ToolCallCard.tsx           — collapsed-by-default tool call, icon per category
      StreamingIndicator.tsx      — restrained in-progress indicator
    journal/
      JournalPage.tsx        — two-pane ≥900px / single-pane below (behavior preserved from current impl)
      EntryList.tsx            — reskinned list, search, cursor "load more"
      EntryEditor.tsx            — reskinned inline editor, raw/rendered toggle
  App.tsx                    — routing + store wiring only, presentation delegated to AppShell
  main.tsx                    — imports globals.css instead of tokens.css/reset.css
```

**Deleted entirely:** `src/styles/tokens.css`, `src/styles/reset.css`, every `*.module.css` file, `src/components/TopBar/`, `ui_reference.html` (superseded by `DESIGN.md`).

**Untouched:** `src/api/`, `src/store/`, `src/mock/data.ts`, `src-tauri/` (Rust shell — only its *visual* titlebar counterpart in React changes, window config stays), `vite.config.ts`'s Tauri-specific server block, `pnpm-lock.yaml` mechanics.

---

## Task 1: Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install the new foundation**

```bash
pnpm add tailwindcss @tailwindcss/vite motion geist @fontsource-variable/fraunces clsx tailwind-merge class-variance-authority lucide-react
pnpm add -D @types/node
```

`lucide-react` because shadcn's default icon library is Lucide (matches `components.json`'s `iconLibrary` convention) and the app currently has no icon system beyond hand-drawn SVGs.

- [ ] **Step 2: Verify**

```bash
pnpm list tailwindcss @tailwindcss/vite motion geist @fontsource-variable/fraunces
```
Expected: all five resolve to installed versions, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add Tailwind v4, shadcn/ui foundations, Motion, and new type families"
```

---

## Task 2: Tailwind v4 + path aliases

**Files:** Modify: `vite.config.ts`, `tsconfig.json`

- [ ] **Step 1: Add the Tailwind Vite plugin and path alias resolution**

`vite.config.ts` — add two imports and extend `plugins`/add `resolve`:
```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  root: ".",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. fixed port for dev (Tauri devUrl must match when using tauri dev)
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 3001,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 2: Add `baseUrl`/`paths` to `tsconfig.json`**

Change:
```json
  "compilerOptions": {
    "target": "ES2020",
```
to:
```json
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "target": "ES2020",
```

- [ ] **Step 3: Verify**

```bash
pnpm exec tsc --noEmit
```
Expected: no new errors (existing `.tsx` files still reference old CSS Modules imports at this point — that's fine, Tasks 4+ remove them; this step only confirms the config itself is valid TypeScript/JSON).

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "build: configure Tailwind v4 Vite plugin and @ path alias"
```

---

## Task 3: `globals.css` — the token system from `DESIGN.md`

**Files:** Create: `src/styles/globals.css`. Delete: `src/styles/tokens.css`, `src/styles/reset.css`.

- [ ] **Step 1: Write the full token stylesheet**

```css
@import "tailwindcss";
@import "@fontsource-variable/fraunces";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-display: "Fraunces Variable", Georgia, "Times New Roman", serif;
  --font-sans: "Geist", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", monospace;

  --color-primary-light: oklch(0.560 0.150 340);
  --color-primary-dark: oklch(0.680 0.160 340);
  --color-accent-light: oklch(0.620 0.140 75);
  --color-accent-dark: oklch(0.780 0.130 75);
  --color-bg-light: oklch(1.000 0.000 0);
  --color-bg-dark: oklch(0.090 0.000 0);
  --color-surface-light: oklch(0.970 0.002 340);
  --color-surface-dark: oklch(0.160 0.004 340);
  --color-ink-light: oklch(0.180 0.008 340);
  --color-ink-dark: oklch(0.930 0.004 340);
  --color-muted-light: oklch(0.550 0.006 340);
  --color-muted-dark: oklch(0.620 0.006 340);

  --shadow-floating: 0 8px 24px oklch(0 0 0 / 0.12);
}

/* Light is the default; dark overrides via the .dark class on <html>. */
:root {
  --color-primary: var(--color-primary-light);
  --color-accent: var(--color-accent-light);
  --color-bg: var(--color-bg-light);
  --color-surface: var(--color-surface-light);
  --color-ink: var(--color-ink-light);
  --color-muted: var(--color-muted-light);
}

.dark {
  --color-primary: var(--color-primary-dark);
  --color-accent: var(--color-accent-dark);
  --color-bg: var(--color-bg-dark);
  --color-surface: var(--color-surface-dark);
  --color-ink: var(--color-ink-dark);
  --color-muted: var(--color-muted-dark);
}

@theme inline {
  --color-primary: var(--color-primary);
  --color-accent: var(--color-accent);
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-ink: var(--color-ink);
  --color-muted: var(--color-muted);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-bg text-ink font-sans antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Notes: the `:root` / `.dark` indirection (raw token → semantic `--color-primary` etc.) lets `bg-bg`, `text-ink`, `bg-surface` utility classes work directly while the *value* flips per-theme via the class on `<html>`. `@theme inline` re-exposes those semantic names as Tailwind utilities (`bg-bg`, `text-ink`, `bg-surface`, `text-muted`, `bg-accent`, `text-primary`, etc.) — this is the standard shadcn/Tailwind-v4 pattern for theme-aware tokens. `--font-sans`/`--font-mono` set at `@theme` level become Tailwind's default `font-sans`/`font-mono` utilities automatically; `--font-display` is opt-in via `font-display` wherever Fraunces is deliberately used (per the Presence Rule — sparingly).

`geist` npm package: import its CSS in `main.tsx` (Task 3 Step 3) rather than here, since it ships its own `@font-face` setup — keep that separate from the hand-written token file.

- [ ] **Step 2: Delete the old stylesheets**

```bash
git rm src/styles/tokens.css src/styles/reset.css
```

- [ ] **Step 3: Update `main.tsx`'s imports**

Find the current CSS imports (`tokens.css`, `reset.css`) and replace with:
```typescript
import "geist/font/sans";
import "geist/font/mono";
import "./styles/globals.css";
```

- [ ] **Step 4: Verify**

```bash
pnpm dev
```
Boot the dev server, confirm no CSS import errors in the terminal output (I cannot see the rendered page — this only confirms the build pipeline accepts the new stylesheet). Stop the server after confirming clean boot.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/main.tsx
git commit -m "styles: replace tokens.css/reset.css with Tailwind v4 @theme system from DESIGN.md"
```

---

## Task 4: `lib/utils.ts` + shadcn init

**Files:** Create: `src/lib/utils.ts`, `components.json`

- [ ] **Step 1: Write the cn() helper**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Run shadcn init**

```bash
pnpm dlx shadcn@latest init
```
When prompted: base color → neutral (we override via our own token system regardless), CSS file → `src/styles/globals.css`, use CSS variables → yes, React Server Components → no (this is a Vite SPA), components alias → `@/components`, utils alias → `@/lib/utils`.

If the CLI writes its own competing color tokens into `globals.css`, remove them after — `DESIGN.md`'s tokens (already in the file from Task 3) are the source of truth, not shadcn's defaults.

- [ ] **Step 3: Add the primitives this rebuild needs**

```bash
pnpm dlx shadcn@latest add button dialog sheet dropdown-menu tooltip scroll-area separator switch textarea avatar tabs badge
```

These land in `src/components/ui/` as owned source (per `components.json`'s alias config) — every one gets restyled to match `DESIGN.md` (no default shadcn slate/zinc palette, no default radius) during the components that consume them, not left as stock.

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit
```
Expected: the new `src/components/ui/*.tsx` files type-check cleanly (they're generated by a maintained CLI against this exact stack — a failure here means a version mismatch, not a typo to hand-fix).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts components.json src/components/ui/
git commit -m "chore: initialize shadcn/ui, add base primitives"
```

---

## Task 5: Theme system

**Files:** Create: `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeToggle.tsx`

- [ ] **Step 1: `ThemeProvider`**

Contract: a React context provider wrapping the app. State: `theme: "light" | "dark" | "system"`, persisted to `localStorage` under key `sazed-theme`. On mount and on change, resolves `"system"` via `window.matchMedia("(prefers-color-scheme: dark)")`, and sets/removes the `.dark` class on `document.documentElement` accordingly (matching `globals.css`'s `.dark` selector from Task 3). Exposes `useTheme()` hook returning `{ theme, setTheme }`.

- [ ] **Step 2: `ThemeToggle`**

Contract: a small icon button (Lucide `Sun`/`Moon`, or a three-way segmented control if `system` should be directly selectable — implementer's call at build time) that calls `setTheme` from `useTheme()`. Lives in the Sidebar's collapsed rail (Task 6).

- [ ] **Step 3: Wire into `main.tsx`**

Wrap `<App />` in `<ThemeProvider>`.

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/theme/ src/main.tsx
git commit -m "theme: add light/dark/system ThemeProvider and toggle"
```

---

## Task 6: Layout shell — TitleBar, Sidebar, AppShell

**Files:** Create: `src/components/layout/TitleBar.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AppShell.tsx`. Modify: `App.tsx`. Delete: `src/components/TopBar/`, `src/features/history/`.

- [ ] **Step 1: `TitleBar`**

Contract: replaces the current `TopBar` component. Keeps the Tauri drag-region behavior (`-webkit-app-region: drag` on the bar itself, `no-drag` on every interactive child — traffic-light-adjacent spacing, the online/offline `StatusDot` equivalent) but restyled per `DESIGN.md` (no chrome beyond what's functionally necessary — this is "quiet," not a branded header bar). Height and traffic-light inset must still match `src-tauri`'s window decoration expectations (`decorations: false`) — read the current `TrafficLights.tsx`/`TopBar.module.css` for the exact inset values before deleting them, and preserve those pixel values in the rebuild even though the visual styling changes.

- [ ] **Step 2: `Sidebar`**

Contract: the collapsible icon-rail from the design spec. Collapsed state (default): fixed narrow width, vertically stacked icon buttons — new chat, conversation history, journal, theme toggle. Expanded state (on click of the history icon): animates wider (Motion, `layout` prop or explicit width animation with the exponential ease-out curve, respecting `prefers-reduced-motion`) to reveal the conversation list (replaces `HistoryOverlay`/`HistoryItem`/`HistorySearch` — same data source via `sessionStore`, new presentation) with a search input at the top. Collapses again on selecting a conversation or on outside click/Escape. Uses the `shadcn` `Button` (icon variant) for rail items and `ScrollArea` for the conversation list.

- [ ] **Step 3: `AppShell`**

Contract: composes `TitleBar` (top) + `Sidebar` (left) + a content area (right) that renders whichever route is active (`react-router-dom`, already a dependency — routes: chat, journal). Replaces the layout JSX currently inline in `App.tsx`; `App.tsx` itself keeps only routing/provider wiring and delegates all presentation to `AppShell`.

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit
pnpm dev
```
Confirm the dev server boots without errors and the app doesn't crash on load (check the terminal for uncaught exceptions logged from the Vite overlay's SSR/HMR output — I can't see the rendered page itself).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/App.tsx
git rm -r src/components/TopBar/ src/features/history/
git commit -m "layout: replace TopBar/HistoryOverlay with TitleBar + collapsible icon-rail Sidebar"
```

---

## Task 7: Chat experience

**Files:** Create: `src/features/chat/EmptyState.tsx`, `MessageList.tsx`, `MessageBlock.tsx`, `Composer.tsx`, `ToolCallCard.tsx`, `StreamingIndicator.tsx`. Delete the old `src/features/chat/*` files these replace (`ChatArea`, `DashboardEmpty`, old `EmptyState`, `EventLine`, `MarkdownContent`, old `Message`, old `StreamingIndicator`, `TaskLine`, old `ToolCard`, `ToolTray`, `ToolsRow`).

- [ ] **Step 1: `EmptyState`**

Contract: time-of-day-aware greeting ("Good morning" / "Good afternoon" / "Good evening") set in `font-display` (Fraunces), per the Presence Rule — the only Fraunces text on this screen. Below it, the `Composer` (Step 4) so the user can start typing immediately.

- [ ] **Step 2: `MessageBlock`**

Contract: renders one message. No bubble/container chrome — user and assistant messages distinguished by text color/weight (assistant: `text-ink`; user: still `text-ink` but right-aligned or with a subtle `text-muted`-toned label, implementer's call per `DESIGN.md`'s flat-transcript direction) and by a small role label. **Renders markdown** via `react-markdown` + `remark-gfm` + `rehype-highlight` (already a dependency, currently used only in the journal) — this is a deliberate behavior change from the current app, per the approved design spec. Code blocks get the existing `highlight.js` theme treatment, adapted to the new token colors. **Motion:** each new message entry animates in via `motion/react` (`<motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>`, exponential ease-out, no bounce), gated behind `prefers-reduced-motion` (crossfade/instant fallback) — this is the message-entry micro-interaction the design spec calls out explicitly.

- [ ] **Step 3: `MessageList`**

Contract: scrollable container (`ScrollArea` or native overflow, implementer's call based on how the current `ChatArea` handles auto-scroll-to-bottom behavior — preserve that behavior) rendering a list of `MessageBlock`s from `chatStore`'s `messages`. Interleaves `ToolCallCard`s (Step 5) where tool calls occurred, matching the current `ChatArea`'s ordering logic.

- [ ] **Step 4: `Composer`**

Contract: floating, auto-growing `Textarea` (shadcn primitive, restyled) pinned to the bottom of the chat column, primary send button (disabled while a response is streaming), Enter-to-send / Shift+Enter-for-newline (preserve current keybinding behavior — check `ChatArea.tsx` or wherever the current input lives for the existing handler before rebuilding it). **Motion:** focus state transitions the composer toward the `Floating` shadow token (`shadow-floating` from `globals.css`) via a Motion or CSS transition (short duration, exponential ease-out) rather than snapping instantly — this is the composer-focus micro-interaction the design spec calls out explicitly, and it's also the one place `Floating` elevation is earned per the Flat-By-Default Rule.

- [ ] **Step 5: `ToolCallCard`**

Contract: collapsed by default (shows tool name + a Lucide icon mapped per tool category — calendar, tasks, email, KB, files, GitHub, etc.), expands on click to show input/output. Replaces `ToolCard`/`ToolsRow`/`ToolTray`/`EventLine`/`TaskLine` — check what distinct tool-display shapes those four components currently handle (they likely cover different tool result types) before collapsing them into one component; if the current app genuinely needs more than one visual shape (e.g. a calendar event looks meaningfully different from a generic tool result), keep that as a documented, deliberate variant within `ToolCallCard` rather than losing the distinction.

- [ ] **Step 6: `StreamingIndicator`**

Contract: restrained in-progress marker (not a spinner) shown while `chatStore` indicates an active stream — e.g. a soft pulsing dot or cursor-blink at the end of the in-progress message, per the Responsive motion energy (feedback, not choreography).

- [ ] **Step 7: Verify**

```bash
pnpm exec tsc --noEmit
pnpm dev
```
Confirm clean boot. If a `VITE_SAZED_URL`/`VITE_API_KEY` pointing at a running `sazed` backend is available in this environment, manually exercise a chat round-trip via `curl` against the backend directly to confirm the API contract still matches what `chatStore`/`src/api/chat.ts` expect (unchanged by this plan) — this doesn't verify the UI, only that the untouched data layer this UI now renders against is still compatible.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/
git commit -m "chat: rebuild transcript, composer, and tool cards on the new design system, enable markdown rendering"
```

---

## Task 8: Journal reskin

**Files:** Create: `src/features/journal/JournalPage.tsx`, `EntryList.tsx`, `EntryEditor.tsx`. Delete the old journal component files these replace.

- [ ] **Step 1: Read the current journal implementation in full before rebuilding**

The journal feature has real behavioral complexity (two-pane responsive breakpoint at 900px, cursor pagination, per-category default subcategory pinned to `localStorage`, `ACTIVE_CATEGORY` gate, duplicate-save race handling per the git history's `c3d731a` fix). Read every file in the current `src/features/journal/` before deleting it, and preserve every one of these behaviors exactly — this task is a visual reskin, not a behavioral rewrite. `EntryEditor` keeps the raw/rendered markdown toggle (`react-markdown` + `remark-gfm`, the journal's existing deliberate exception to "no markdown renderer" — now also true for chat, but the journal's read-view rendering predates and is unrelated to Task 7's change).

- [ ] **Step 2: `EntryList`**

Contract: reskinned list with search input and "load more" cursor pagination, same data flow as the current `JournalPage`'s list logic.

- [ ] **Step 3: `EntryEditor`**

Contract: reskinned inline editor. Replace the current FAB (floating action button) with a treatment consistent with `Composer`'s primary-action styling — a FAB is a mobile-web pattern; decide at build time whether it still fits this app's small-window-desktop-first posture or whether a persistent "new entry" affordance in `EntryList`'s header reads better, per `DESIGN.md`'s "no card-grid, no generic SaaS chrome" direction. Either way, the entry point must remain reachable single-handed on the mobile responsive layout (≥900px two-pane / below single-pane is preserved).

- [ ] **Step 4: `JournalPage`**

Contract: composes `EntryList` + `EntryEditor` in the existing two-pane/single-pane responsive shell.

- [ ] **Step 5: Verify**

```bash
pnpm exec tsc --noEmit
pnpm dev
```

- [ ] **Step 6: Commit**

```bash
git add src/features/journal/
git commit -m "journal: reskin on the new design system, preserve all existing behavior"
```

---

## Task 9: Cleanup + documentation

**Files:** Modify: `CLAUDE.md`. Delete: `ui_reference.html`.

- [ ] **Step 1: Remove the superseded design reference**

```bash
git rm ui_reference.html
```

- [ ] **Step 2: Update `CLAUDE.md`**

Replace the `Stack`, `Source layout`, and `Conventions` sections to describe the new foundation: Tailwind v4 + shadcn/ui (`src/components/ui/`) + Motion, `DESIGN.md`/`PRODUCT.md` as the design reference (replacing the `ui_reference.html` pointer), the new `src/components/layout/`, `src/components/theme/` directories, and the now-enabled markdown rendering in chat (removing the "No markdown renderer in chat message bodies" convention line, since Task 7 changes it).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git rm ui_reference.html
git commit -m "docs: update CLAUDE.md for the new design system, retire ui_reference.html"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full build**

```bash
pnpm build
```
Expected: TypeScript check + Vite build both pass with zero errors. This is the strongest signal available in this environment — it exercises every file's types and the full module graph at once.

- [ ] **Step 2: Boot check**

```bash
pnpm dev
```
Confirm clean boot (no console/terminal errors) and leave a note for the user on which URL to open (`http://localhost:3000`) to actually look at it.

- [ ] **Step 3: Tauri boot, if a Rust toolchain is available**

```bash
pnpm tauri dev
```
If this environment has no Rust toolchain, this will fail at the Cargo step, not the frontend step — note that as a human-verification item rather than treating it as this plan's failure.

- [ ] **Step 4: Explicit handoff note**

State clearly to the user: every verification step above is build/type/boot-level. Actual visual quality — contrast, spacing rhythm, whether the rose accent and Fraunces moments land the way `DESIGN.md` intends, whether the collapsible sidebar feels right at the real window size — needs the user to run the app and look at it. Recommend `/impeccable critique` or `/impeccable polish` as a next-session follow-up once there's a running app to point those commands at.

---

## Self-Review Notes

- **Deviation from `writing-plans`'s literal-code-per-step default:** component tasks (5-8) specify contracts, not frozen JSX, because this plan is executed by the same agent, in the same session, immediately after writing it — freezing exact markup now would either go stale the moment real build-time judgment calls happen (exact Tailwind class values, hover states, exact Motion parameters) or require writing every component's code twice for no benefit. Mechanical/config tasks (1-4) remain fully literal, since those have one correct answer.
- **No visual verification available:** stated explicitly in the header and repeated in Task 10 rather than implied — this environment has no browser/screenshot tool, so every "verify" step in this plan is necessarily build/type-level, not visual, and the plan does not claim otherwise.
- **Behavioral parity for journal is explicit, not assumed:** Task 8 Step 1 requires reading the current implementation in full before deleting it, specifically calling out the non-obvious behaviors (duplicate-save race fix, cursor pagination, per-category localStorage pinning) that a purely visual reskin could easily drop by accident.
- **Tool-call display consolidation is flagged, not decided in advance:** the current app has four components (`ToolCard`/`ToolsRow`/`ToolTray`/`EventLine`/`TaskLine`) for what the design collapses into one `ToolCallCard` — Task 7 Step 5 requires checking whether that's a safe consolidation or whether some of those represent a genuinely distinct display shape worth keeping as a variant, rather than assuming full consolidation is correct.
