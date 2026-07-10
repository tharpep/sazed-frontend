# Product

## Register

product

## Users

The user themselves — a single individual using their own personal AI agent, "Sazed." Used as a small (900×620, min 600×480) Tauri desktop window and secondarily as a responsive web app. Context: daily, personal use — chatting with the assistant about calendar, tasks, email, knowledge-base lookups, and journaling. Not a multi-tenant SaaS product; there is exactly one user, and the "customer" and "user" are the same person. The primary job on any given screen is either (a) having a conversation with the assistant and reading its tool-call activity, (b) finding a past conversation, or (c) writing/reviewing a journal entry.

## Product Purpose

A calm, focused surface for talking to a personal AI assistant and keeping a personal journal — not a demo of AI capability, not a SaaS dashboard. It exists so the user has one small, trustworthy window they open throughout the day, the way they'd open Claude.ai or ChatGPT, except it's theirs and it's connected to their own calendar/email/tasks/notes.

## Brand Personality

Calm, considered, warm. Quiet confidence rather than flashiness — the interface of an assistant you trust, not a tool that's performing "AI-ness" at you. Voice and visual language should feel like a considered personal product (Claude.ai-tier polish), not a hobby project or a generated template.

## Anti-references

- Generic AI-generated aesthetic tells: purple gradients, glassmorphism-as-decoration, hero-metric cards, uppercase tracked eyebrows above sections, identical icon+heading+text card grids, gradient text.
- The specific prior attempt in this repo's own history (commit `b46dcf4`, "The Keeper" design language) — a considered token system that still reads as generic "elegant AI app." Newsreader+Inter-adjacent pairings and warm-dark-with-two-accent-colors schemes are explicitly not the direction; this rebuild does not reference that implementation.
- Dense SaaS admin-dashboard chrome (heavy sidebars with badge counts everywhere, data tables as the primary surface, KPI tiles) — this is a single-user conversational tool, not a multi-tenant ops console.

## Design Principles

- **One considered accent, not a palette.** Restrained color strategy: warm neutrals carry the interface, one accent color carries meaning (interactive state, focus), nothing else competes for attention.
- **Small window, not a shrunk desktop app.** The primary surface is a 600–900px-wide window. Every layout decision (navigation pattern, information density) is made for that size first, not adapted down from a wide-screen assumption.
- **Read as a product, not a redesign.** No component, page, or token may be carried over from the current implementation's visual language — a fresh foundation (Tailwind + shadcn/ui + Motion), not an iteration.
- **Content over chrome.** The conversation and the journal entry are the interface; navigation, status indicators, and window controls stay quiet and out of the way.
- **Motion with a reason.** Every animation marks a real state change (message arriving, panel expanding, focus shifting) — never decoration for its own sake.

## Accessibility & Inclusion

Standard WCAG AA: body text ≥4.5:1 contrast, large/bold text ≥3:1, visible focus states on all interactive elements, full keyboard navigation, `prefers-reduced-motion` support on every animation. No specific accommodation beyond that was requested.
