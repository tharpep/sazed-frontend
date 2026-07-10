# Sazed Frontend Redesign — Design Spec

## Problem

The current UI (React 19 + Tauri desktop shell, CSS Modules + custom-property tokens) looks and feels AI-generated rather than like a considered product. This isn't a fresh problem — the most recent commit on `main` (`b46dcf4`) is itself a full AI-assisted redesign ("The Keeper" design language: warm dark palette, Newsreader serif + DM Sans, periwinkle/gold accent duet) and it still misses. The token system on paper isn't unreasonable, but the result reads as generic "elegant AI app" rather than something with its own considered identity — and the Newsreader+Inter-adjacent pairing is itself a recognizable AI-default choice.

Goal: a ground-up rebuild that reads as a deliberately designed product — the kind of polish level Claude.ai, ChatGPT, or Linear ship — not a redesign iterating on the existing visual language.

## Non-goals

- No backend/API changes. `src/api/*`, `src/store/*` business logic, and the data contracts they expose are untouched.
- No change to `src-tauri/` window behavior (900×620, min 600×480, custom chromeless titlebar) beyond restyling the titlebar's visual treatment.
- Not attempting pixel-parity with any referenced product — "Claude.ai-like" is a direction (warm neutrals, restrained color, quiet typography, generous whitespace), not a clone target.

## Approach

Full rebuild of the presentation layer on a new foundation: **Tailwind v4 + shadcn/ui (Radix primitives, owned as source and fully restyled) + Motion** (the framer-motion successor), replacing CSS Modules entirely. Business logic (`api/`, `store/`, `mock/data.ts` type contracts) is kept as-is; every visual file is rebuilt from zero with no reference to the current `tokens.css`, `ui_reference.html`, or existing component markup — deliberately avoiding carrying forward the previous attempt's unexamined assumptions.

## Design System

**Typography:** Two families, used deliberately rather than decoratively.
- **Geist** (UI, body, chat text) — clean, high-legibility, the family several of the most polished current products (Vercel, Linear) actually ship. Neutral enough not to read as "an AI picked this."
- **Fraunces** (display/presence only — app name, empty-state greeting, section headings) — warm, characterful serif, explicitly chosen over Newsreader (the previous attempt's choice, and a common LLM-default pick) to avoid repeating the same "feels AI-generated" signature at the typography level.

**Color:** Light + dark themes, both warm-neutral (cream/paper in light, warm near-black in dark — never pure `#fff`/`#000`). One primary accent color used only for interactive state and meaning (links, active nav, primary actions, focus rings) — not for decoration or gradients. Exact palette values are finalized during implementation using the `impeccable` skill's color methodology, not hardcoded in this spec.

**Motion:** Purposeful micro-interactions only — message entry, composer focus, sidebar expand/collapse, streaming text reveal. Respects `prefers-reduced-motion`. No motion added purely for "delight" without a functional reason (state change, hierarchy, feedback).

**Spacing/type scale, radii, shadows:** Rebuilt as Tailwind theme tokens (not hand-rolled CSS custom properties) during implementation, following the `impeccable` skill's form heuristics.

## Layout & Navigation

Current pattern: `HistoryOverlay` slides over the entire app via `translateX` when toggled from the TopBar. New pattern: **collapsible icon-rail sidebar** (Linear/Arc-style) — collapsed by default (icon-only: new chat, history, journal, settings), expands in place to show the conversation list and titles, collapses again on selection or outside click. This gives the same information architecture as Claude.ai's persistent sidebar without permanently consuming width in a 600–900px window — chosen explicitly over an always-visible sidebar because of the small fixed window size.

The custom Tauri titlebar (traffic lights, drag region) is kept functionally as-is (`-webkit-app-region: drag` pattern, `TrafficLights` component) but its visual treatment — spacing, iconography, the status dot, the online/offline indicator — is rebuilt from scratch.

## Chat Experience

- Flat message layout — no chat bubbles. User and assistant messages distinguished by weight/color/alignment, not container chrome, matching the Claude/ChatGPT-style flat transcript.
- **Markdown rendering enabled in chat message bodies.** The current app explicitly disables this (`CLAUDE.md`: "No markdown renderer in chat message bodies"). This is a deliberate behavior change: both reference products render rich markdown in chat, and its absence is part of why the current app doesn't feel like them. Reuses the `react-markdown` + `remark-gfm` + `rehype-highlight` stack already used in the journal feature — no new markdown dependency needed.
- Tool-call cards redesigned: collapsed by default, one icon per tool category, expand to show input/output.
- Floating, auto-growing composer at the bottom of the chat pane with a primary send action.
- Streaming: smooth incremental text reveal with a restrained (not spinner-heavy) in-progress indicator.
- Empty state: time-of-day-aware greeting set in the display serif.

## Journal

Same functional behavior as today (two-pane responsive layout ≥900px / single-pane below, inline markdown editor with raw/rendered toggle, FAB, search, cursor-paginated "load more", per-category default subcategory) — fully reskinned on the new component system. The `ACTIVE_CATEGORY` gate (personal category hidden pending a category switcher) is preserved as-is; building that switcher is out of scope here.

## Component & Build Strategy

- Add Tailwind v4, shadcn/ui (CLI-scaffolded components live in `src/components/ui/` as owned source, then restyled — not consumed as an external themed package), and Motion as dependencies.
- Delete and rebuild: `src/styles/` (replaced by a Tailwind entry stylesheet + CSS variables for theme values, light/dark via a `class` strategy on `<html>`), `src/components/`, `src/features/`, `App.tsx`'s JSX/structure (routing logic and store wiring preserved, presentation rebuilt).
- Keep untouched: `src/api/`, `src/store/`, `src/mock/data.ts`, `src-tauri/` (except the titlebar's visual restyling), `vite.config.ts`, `tsconfig.json` (Tailwind's Vite plugin is additive, not a config rewrite).
- `pnpm` remains the package manager; no framework change (still Vite, not Next — this is a Tauri desktop app, SSR is irrelevant here).

## Verification

- `pnpm dev` boots cleanly; visually verify both light and dark themes.
- Exercise the real chat flow against the running `sazed` backend if reachable in the dev environment (per this workspace's `GATEWAY_URL`/`VITE_SAZED_URL` conventions); otherwise verify against the existing mock/dev flow the app already supports.
- `pnpm build` (TypeScript check + Vite build) passes with no new type errors.
- `pnpm tauri dev` boots the desktop shell if a Rust toolchain is available in this environment; if not, this is flagged as a human-verification item (matching the "no test suite, verify by running it" pattern used elsewhere in this workspace).
- No formal test suite exists in this repo (confirmed via `CLAUDE.md`) — verification is build + lint + manual/visual exercise of the running app, not unit tests.

## Deliverable

A new branch (`redesign/from-scratch`, already created) culminating in a PR against `main`. Per explicit instruction, this PR is **not to be merged** — it's for review only.
