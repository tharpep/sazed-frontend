---
name: Sazed
description: The Sazed console, a calm work tool for a personal agent and homelab.
direction: D, hybrid (picked 2026-11-05). Graphite's surfaces, type and rows, with Paper's plain sentences and Instrument's numbers. Replaces the rose "Quiet Study" seed.
colors:
  bg: { light: "oklch(0.990 0.001 265)", dark: "oklch(0.170 0.005 265)" }
  shell: { light: "oklch(0.945 0.004 265)", dark: "oklch(0.145 0.005 265)" }
  surface: { light: "oklch(1.000 0.000 0)", dark: "oklch(0.205 0.006 265)" }
  raised: { light: "oklch(0.955 0.004 265)", dark: "oklch(0.245 0.007 265)" }
  line: { light: "oklch(0.905 0.005 265)", dark: "oklch(0.290 0.008 265)" }
  ink: { light: "oklch(0.220 0.010 265)", dark: "oklch(0.950 0.003 265)" }
  ink-2: { light: "oklch(0.450 0.012 265)", dark: "oklch(0.750 0.008 265)" }
  muted: { light: "oklch(0.540 0.012 265)", dark: "oklch(0.600 0.010 265)" }
  primary: { light: "oklch(0.520 0.150 258)", dark: "oklch(0.720 0.120 255)" }
  ok: { light: "oklch(0.560 0.140 155)", dark: "oklch(0.740 0.140 155)" }
  warn: { light: "oklch(0.620 0.140 70)", dark: "oklch(0.800 0.130 80)" }
  err: { light: "oklch(0.550 0.190 27)", dark: "oklch(0.700 0.170 25)" }
typography:
  sans: "Geist"
  mono: "Geist Mono"
  scale: { caption: 12px, meta: 13px, body: 14px, title: 15px, heading: 22px }
---

# Design System: Sazed

## 1. Overview

A calm work tool in the family of Linear, Vercel and Tailscale's admin console. The console is mostly scanned and operated (activity, homelab, automations, the board), so it favors clear hierarchy and compact, consistent rows. It speaks in plain sentences where a sentence says more than a number, and uses monospace for figures.

How it was chosen: a review of the old console, a sweep of how Linear, Vercel, Tailscale, Apple, Stripe and Raycast solve the same problems, then four directions on Home and Activity. Pryce picked D, the hybrid. The critique, reference board and mockups are in the side-session notes (`console-design-critique.md`) and the "Sazed console directions" artifact. Build new pages from those mockups; when you improve on one, say how.

**Key characteristics**
- Mid-gray dark (not black) and a near-white light theme, each with steps: `shell` < `bg` < `surface` < `raised`.
- The shell (rail, gaps) is darker and dimmer than the page, and the page sits on an inset panel, so content leads (Linear's 2026 refresh).
- One sans face (Geist) at five sizes; Geist Mono for figures, durations, costs and code.
- One blue accent (`primary`) for actions, links, focus and selection.
- State colors (`ok`, `warn`, `err`) only for state. Healthy is neutral unless the screen is about health.
- Flat. Panels separate by surface step and a 1px `line`, not shadow.

## 2. Colors

All tokens live in `src/styles/globals.css` as Tailwind colors, light on `:root` and dark on `.dark`.

| Token | Use |
|---|---|
| `shell` (`bg-sidebar`) | The rail and the gaps around the page panel, from 640px |
| `bg` | The page panel |
| `surface` | Panels, list groups, inputs, outline buttons, the view picker |
| `raised` | Hover, selected segment, menu highlight, icon tiles, active nav (dark) |
| `line` | Borders and dividers (also shadcn's `--border`/`--input`) |
| `ink` | Primary text |
| `ink-2` | Secondary text: descriptions, inactive controls |
| `muted` | Tertiary text: labels, timestamps, counts. AA on `bg` and `surface` in both themes. |
| `primary` | The accent: buttons, links, focus |
| `ok` / `warn` / `err` | State only. `accent` is a legacy alias of `warn`; `destructive` maps to `err`. |

## 3. Typography

Geist everywhere. New UI uses only the five-step scale (`text-caption`, `text-meta`, `text-body`, `text-title`, `text-heading`). `cn()` in `src/lib/utils.ts` knows these names, so they survive class merging.

| Step | Size / line | Use |
|---|---|---|
| caption | 12 / 16 | Meta on rows, pills, counts |
| meta | 13 / 18 | Descriptions, section labels, nav, segmented control, time column |
| body | 14 / 20 | Row titles, body copy |
| title | 15 / 22 | The hub name in the title row, phone header titles |
| heading | 22 / 28 | Rare: Home's greeting |

Sentence case everywhere; no uppercase eyebrows. Figures in monospace or `tabular-nums`.

## 4. Layout and shell

The app has one hub shell, designed phone first. Six hubs (Home, Chat, Work, Agents, System, Library) and Apps make up the navigation, held in `navStore`. Deep links and the command palette open hubs, views and items through `navStore`. The shell lives in `src/components/shell/`; its sizes are tokens in `globals.css` (`--rail-w`, `--title-h`, `--phone-head-h`, `--bar-h`, `--panel-w`).

- Phones (below 640px): a 54px header, the page, the docked composer on Home and Chat, and a 56px hub bar. The hub bar holds Home, Chat, Work, Apps and More; More opens a sheet with Agents, System and Library and their views, then Settings and Search, and takes the name of the hub that is open.
- Phone header tabs: on a hub with views, the header is that hub's view tabs (44px tall, the selected one underlined in `ink`), with Search at the end. Home shows the date with Settings and Search; Chat shows Chats, or Back and the conversation's title.
- From 640px: a 64px icon rail (every hub and Apps, icon above label, the gear at the bottom) and the page as an inset panel (8px gap, 12px radius, 1px `line`) on the shell. The panel opens with a 48px title row: hub name, view tabs, the view's primary action and Search. Home has no row, only the search field in the corner. The Home entry, in the rail and the hub bar, shows how many things are waiting on you.
- The window bar only renders in the Tauri window (window controls and the drag region). The theme switch lives in Settings and the palette.
- Tap targets on phones are at least 44px. Desktop sizes come back from 640px.
- 4px spacing grid. Page gutter 16px on phones, 32px from `md`. `PageBody` is left-aligned with a 1024px max width.
- Radii: 6px controls, 8px rows and tiles, 10px panels, 12px the page panel.
- Shadow only for things that float (menus, sheets, dialogs): `shadow-floating`.

## 5. Components

Shared components live in `src/components/system/` (import from `@/components/system`) and, for the shell's parts that pages use, `src/components/shell/`. shadcn primitives in `src/components/ui/` stay the base for buttons, menus, sheets and dialogs.

| Component | What it is |
|---|---|
| `Page`, `PageBody` | Page frame and its scrolling body; the shell's header or title row names the page |
| `ToolsRow` | The top of a view's content: its `ViewPicker` and, on phones, its primary action. From 640px the action moves into the title row |
| `ViewPicker` | A view's third-level choice (a filter, or Homelab's Map, List, Storage, Links): one 44px button reading "Show <choice>", which opens a bottom sheet of choices. Choices can carry a count and a hint; `compact` is the 28px form |
| `DetailPanel` | An item's detail: a bottom sheet on phones, a 400px right-hand panel from 640px, over a scrim until 1180px and inline beside the page from there. Its actions go in `footer` |
| Sheet detents | A phone sheet opens at the medium detent (64% of the visible height, leaving at least 72px above). Dragging the handle up 40px takes it to full height (10px below the safe area); dragging down 70px drops it back to medium, then closes it. The keyboard shrinks both |
| `Reader` | Long text (plans, journal entries). On phones a full-screen layer with a context line on top and a bottom toolbar holding a 44px Back button named for the view it returns to, plus the item's actions. From 640px it sits in the page with a back row, at a 68ch measure |
| `StatusPill` | Dot + short label for live, paused, connected |
| `Segmented` | A small inline switch inside a view, such as Usage's range; options can carry a count. Views and filters use `ViewPicker` |
| `ListSection`, `ListRow` | A titled group of rows: leading icon, title, description, right-aligned meta, a time column from `md`; rows can expand details under themselves |
| `EmptyState` | What a list says when empty: what would appear and how to get some |
| `Button` (ui) | `outline` for most actions, `default` (primary) for the one main action, `ghost` for low-weight actions |

Activity (`src/features/activity/`) is the reference page: `DayChart` (totals plus a 24-hour bar chart), runs grouped by trace with steps folded in (`runs.ts`), Everything / Needs you / Errors in a `ViewPicker`.

## 6. Do's and Don'ts

**Do**
- Start from the mockup, and say how and why when you improve on it.
- Use the components above before hand-rolling a header, row, tab set or empty state.
- Translate internals: model IDs to names ("Sonnet 5.5"), cron to sentences, outcomes to words ("Failed at the second opinion step").
- Group repeated events (one row per run, steps inside), put what needs Pryce first, summarize before detail.

**Don't**
- Don't use pure black, or tint `bg` with the accent.
- Don't add font sizes outside the scale, or uppercase tracked labels.
- Don't put decorative dots or colored stripes on rows; a dot means state.
- Don't build walls of equal tiles or icon grids (the self-hosted start-page look); one summary line or a row of chips, then lists. The one exception is Apps: it is a launcher, so its apps are an icon grid.
- Don't render chat messages as bubbles with container chrome.

## 7. The Display

`/display` (`src/features/display/`) is read from a metre away and stays on all day on an OLED, so it bends three rules on purpose.
- Pure black behind everything, not `bg`: black pixels are off on an OLED. Cards and chips keep `surface` and `line`.
- A distance scale instead of the five steps: 14 (labels), 18 (rows, date), 22 (wide date and far-tier lines), 20 for answers, plus the clock sized to its box. The screen shows less the farther you are: a dim gray clock when nobody is near, a big clock and three lines from across the room, and the full layout once touched.
- A night face: from 22:00 to 07:00 on touch screens, only the clock and the first thing tomorrow, in red on black. Everything drifts a few pixels each minute, and in landscape the clock and card swap sides every hour.

Everything else holds: D's colours, Geist, sentence case, `warn`/`err` only for state, rows like `ListRow`.

## 8. Migration

Colors and the shell moved app-wide; pages move to the components one at a time and keep their own markup on the new colors until then. Done: Activity. Next: Home (D's mockup: date and greeting, one sentence on how things are, status chips, Next up, apps as a short list, an ask bar that also jumps to pages), then Gateway, Automations, Homelab List, Knowledge. New pages (Board, Atlas, notes) start on this system.
