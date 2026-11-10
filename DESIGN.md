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
- The shell (sidebar, gaps) is darker and dimmer than the page, and the page sits on an inset panel, so content leads (Linear's 2026 refresh).
- One sans face (Geist) at five sizes; Geist Mono for figures, durations, costs and code.
- One blue accent (`primary`) for actions, links, focus and selection.
- State colors (`ok`, `warn`, `err`) only for state. Healthy is neutral unless the screen is about health.
- Flat. Panels separate by surface step and a 1px `line`, not shadow.

## 2. Colors

All tokens live in `src/styles/globals.css` as Tailwind colors, light on `:root` and dark on `.dark`.

| Token | Use |
|---|---|
| `shell` (`bg-sidebar`) | Sidebar, gaps around the page panel, Tauri title bar |
| `bg` | The page panel |
| `surface` | Panels, list groups, inputs, outline buttons, phone tab bar |
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
| title | 15 / 22 | Page titles (`PageHeader`) |
| heading | 22 / 28 | Rare: Home's greeting |

Sentence case everywhere; no uppercase eyebrows. Figures in monospace or `tabular-nums`.

## 4. Layout and shell

- Sidebar: labeled and grouped (Home, Chats / Watch / Work / Settings) from `md` (768px); an icon rail with tooltips between `sm` and `md`; the bottom tab bar on phones. The Activity entry shows how many jobs are waiting on you.
- From `sm` up the page is an inset panel (8px gap, 12px radius, 1px `line`) on the shell. Phones are edge to edge.
- The title bar only renders in the Tauri window (it's the drag region). The theme switch lives in Settings on desktop and in the More sheet on phones.
- 4px spacing grid. Page gutter 16px on phones, 32px from `md`. `PageBody` is left-aligned with a 1024px max width.
- Radii: 6px controls, 8px rows and tiles, 10px panels, 12px the page panel.
- Shadow only for things that float (menus, sheets, dialogs): `shadow-floating`.

## 5. Components

Shared components live in `src/components/system/` (import from `@/components/system`). shadcn primitives in `src/components/ui/` stay the base for buttons, menus, sheets and dialogs.

| Component | What it is |
|---|---|
| `Page`, `PageHeader`, `PageBody` | Page frame: title + status + actions on one line, then a scrolling body |
| `StatusPill` | Dot + short label for live, paused, connected |
| `Segmented` | The one control for switching views or filters of the same content; options can carry a count ("Needs you 1") |
| `ListSection`, `ListRow` | A titled group of rows: leading icon, title, description, right-aligned meta, a time column from `md`; rows can expand details under themselves |
| `EmptyState` | What a list says when empty: what would appear and how to get some |
| `Button` (ui) | `outline` for most actions, `default` (primary) for the one main action, `ghost` for low-weight actions |

Activity (`src/features/activity/`) is the reference page: `DayChart` (totals plus a 24-hour bar chart), runs grouped by trace with steps folded in (`runs.ts`), Everything / Needs you / Errors.

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
- Don't build walls of equal tiles or icon grids (the self-hosted start-page look); one summary line or a row of chips, then lists.
- Don't render chat messages as bubbles with container chrome.

## 7. The Display

`/display` (`src/features/display/`) is read from a metre away and stays on all day on an OLED, so it bends three rules on purpose.
- Pure black behind everything, not `bg`: black pixels are off on an OLED. Cards and chips keep `surface` and `line`.
- A distance scale instead of the five steps: 14 (labels), 18 (rows, date), 22 (wide date and far-tier lines), 20 for answers, plus the clock sized to its box. The screen shows less the farther you are: a dim gray clock when nobody is near, a big clock and three lines from across the room, and the full layout once touched.
- A night face: from 22:00 to 07:00 on touch screens, only the clock and the first thing tomorrow, in red on black. Everything drifts a few pixels each minute, and in landscape the clock and card swap sides every hour.

Everything else holds: D's colours, Geist, sentence case, `warn`/`err` only for state, rows like `ListRow`.

## 8. Migration

Colors and the shell moved app-wide; pages move to the components one at a time and keep their own markup on the new colors until then. Done: Activity. Next: Home (D's mockup: date and greeting, one sentence on how things are, status chips, Next up, apps as a short list, an ask bar that also jumps to pages), then Gateway, Automations, Homelab List, Knowledge. New pages (Board, Atlas, notes) start on this system.
