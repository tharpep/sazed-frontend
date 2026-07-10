<!-- SEED, colors/typography resolved via palette.mjs + design conversation. Re-run /impeccable document once components exist, to capture real spacing/radii/component tokens and generate the sidecar. -->
---
name: Sazed
description: A calm, considered desktop companion for a personal AI agent.
colors:
  primary-light: "oklch(0.560 0.150 340)"
  primary-dark: "oklch(0.680 0.160 340)"
  accent-light: "oklch(0.620 0.140 75)"
  accent-dark: "oklch(0.780 0.130 75)"
  bg-light: "oklch(1.000 0.000 0)"
  bg-dark: "oklch(0.090 0.000 0)"
  surface-light: "oklch(0.970 0.002 340)"
  surface-dark: "oklch(0.160 0.004 340)"
  ink-light: "oklch(0.180 0.008 340)"
  ink-dark: "oklch(0.930 0.004 340)"
  muted-light: "oklch(0.550 0.006 340)"
  muted-dark: "oklch(0.620 0.006 340)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontWeight: 400
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 500
    letterSpacing: "0.02em"
---

# Design System: Sazed

## 1. Overview

**Creative North Star: "The Quiet Study"**

A small, considered room you return to throughout the day — not a control panel, not a demo of AI capability. The interface gets out of the way of two things: the conversation, and the page you're writing in. Warmth in this system comes entirely from one deliberate color (a deep rose, not the reflexive blue-or-purple of most AI chat tools) and from typography — never from a tinted background. Surfaces stay pure: true white in light mode, true near-black in dark mode. This is a direct correction of the saturated 2026 AI-design default (warm-cream body background, muted "elegant" accent) that the previous implementation in this repo fell into, and that this rebuild explicitly rejects.

This system explicitly rejects: purple gradients, glassmorphism-as-decoration, hero-metric cards, uppercase tracked eyebrows, identical icon+heading+text card grids, warm-tinted "paper" backgrounds, and dense SaaS-dashboard chrome. It is built for a single window between 600px and 900px wide — every density and navigation decision is made for that size, not shrunk down from a wide-screen assumption.

**Key Characteristics:**
- Pure-neutral surfaces (true white / true near-black); all warmth lives in the rose primary and the gold accent, never in the background.
- One primary color used sparingly (restrained strategy, target ≤10% of any given screen's surface area) for interactive elements, links, and primary actions.
- A second, distinct accent (warm gold) reserved for status/secondary emphasis — never competing with primary for the same role.
- Serif display type appears only at moments of presence (app name, empty-state greeting, section headers) — never in UI chrome or body text.
- Flat by default; elevation is a response to state, not a resting decoration.

## 2. Colors

Two brand colors on pure-neutral ground: a deep rose primary carries interaction and warmth, a warm gold secondary accent carries status and distinct emphasis. Neither the background nor the surface layer is tinted.

### Primary
- **Quiet Rose** (`oklch(0.560 0.150 340)` light / `oklch(0.680 0.160 340)` dark): The single interactive color — links, primary buttons, active nav state, focus rings, the send action. Deliberately not blue or purple (the reflexive AI-chat-tool choice); a deep rose reads as considered and personal without tipping into "creative tool" brightness. Dark mode lifts lightness and chroma slightly to stay legible against near-black.

### Secondary
- **Warm Gold** (`oklch(0.620 0.140 75)` light / `oklch(0.780 0.130 75)` dark): Reserved for status pills, secondary badges, and the display-serif greeting's occasional highlight word. Distinct from Quiet Rose in both hue (75° vs 340°) and role — it never appears on the same element as primary.

### Neutral
- **Pure White / Pure Near-Black** (`oklch(1.000 0.000 0)` / `oklch(0.090 0.000 0)`): The body background in light and dark mode respectively. Zero chroma — deliberately not tinted warm. This is the single most important color decision in the system; see the Named Rule below.
- **Whisper Surface** (`oklch(0.970 0.002 340)` light / `oklch(0.160 0.004 340)` dark): Cards, panels, the sidebar, input fields — background pulled fractionally toward ink, same hue family, chroma near zero. The difference from bg should read as "a slightly raised plane," not as a visible tint.
- **Ink** (`oklch(0.180 0.008 340)` light / `oklch(0.930 0.004 340)` dark): Body text. ≥7:1 contrast against bg in both modes.
- **Muted** (`oklch(0.550 0.006 340)` light / `oklch(0.620 0.006 340)` dark): Secondary text — timestamps, placeholder copy, tertiary labels. ≥3.5:1 contrast against bg; verify at implementation time, don't let "muted" drift toward illegible light gray.

### Named Rules
**The Uncolored Ground Rule.** Background and surface carry zero chroma (or near-zero, ≤0.005) in both themes. Warmth is Quiet Rose's job, never the body background's. If a background value has chroma above 0.01, that's a bug, not a style choice — this is the exact mistake the previous implementation in this repo made.

**The One Voice Rule.** Quiet Rose appears on ≤10% of any given screen's surface area. Its rarity is what makes it register as intentional rather than decorative.

## 3. Typography

**Display Font:** Fraunces (with Georgia, Times New Roman, serif fallback)
**Body Font:** Geist (with -apple-system, BlinkMacSystemFont, sans-serif fallback)
**Label Font:** Geist, medium weight, slight positive tracking

**Character:** A warm literary serif reserved for rare moments of presence, paired with a clean, high-legibility grotesque that carries every interactive surface. The pairing is a deliberate contrast axis (serif × sans), not two similar sans-serifs competing — and specifically not the Newsreader-adjacent serif choice the previous implementation made, to avoid repeating a recognizable "AI redesigned this" signature.

### Hierarchy
- **Display** (Fraunces, weight 400, `clamp(1.75rem, 4vw, 2.75rem)`, line-height 1.1, letter-spacing -0.02em): App name, empty-state greeting, journal entry titles. Appears rarely — this is presence, not a heading style to reach for by default.
- **Headline** (Geist, weight 600, 20px, line-height 1.3): Section headers within the app (sidebar section labels, journal date headers).
- **Body** (Geist, weight 400, 15px, line-height 1.55): Chat message text, journal entry body, general UI copy. Cap measure at 65-75ch where prose wraps freely (journal entries); chat messages follow the chat column's natural width instead.
- **Label** (Geist, weight 500, 13px, letter-spacing 0.02em): Buttons, nav items, form labels, timestamps. Sentence case, never uppercase — this system has no tracked-uppercase eyebrows anywhere.

### Named Rules
**The Presence Rule.** Fraunces appears in at most one place per screen. If a screen already has a serif greeting, no other element on that screen may also be set in Fraunces.

## 4. Elevation

Flat by default — the Responsive motion energy this system commits to (feedback and transitions, not orchestrated choreography) implies restraint in elevation too. Depth is conveyed primarily through the Whisper Surface neutral (a lighter/darker plane, not a shadow) and only secondarily through a soft, low-opacity shadow when a surface truly floats above content (the composer, an open dropdown, the expanded sidebar).

### Shadow Vocabulary
- **Resting** (none): Cards, panels, and the collapsed sidebar sit flush — no shadow at rest.
- **Floating** (`box-shadow: 0 8px 24px oklch(0 0 0 / 0.12)`): Reserved for elements that are genuinely temporary/overlaid — the expanded sidebar, an open menu, the composer's focus state, a toast.

### Named Rules
**The Flat-By-Default Rule.** Shadows appear only as a response to a genuinely overlaid or floating state. A resting card, panel, or message never carries a shadow.

## 5. Components

No component library exists yet (pre-implementation). Re-run `/impeccable document` once the rebuild has real components to extract exact shape, padding, and state treatment — this section is intentionally omitted here rather than fabricated, per seed-mode guidance.

## 6. Do's and Don'ts

### Do:
- **Do** keep bg and surface at zero or near-zero chroma (≤0.005) in both themes — pure white light, pure near-black dark.
- **Do** let Quiet Rose (`oklch(0.560/0.680 0.150/0.160 340)`) be the only color that carries interactive meaning — links, primary actions, focus, active state.
- **Do** reserve Fraunces for a single presence moment per screen; everything else is Geist.
- **Do** keep shadows absent at rest; introduce them only for genuinely floating/overlaid elements.
- **Do** design every layout for a 600-900px window first.

### Don't:
- **Don't** tint the body background warm ("claude-beige": cream/sand/paper bg + muted accent) — named explicitly because it is the saturated AI-design default of 2026 and the exact mistake this repo's previous redesign made.
- **Don't** use purple gradients, glassmorphism as decoration, hero-metric cards, or identical icon+heading+text card grids (PRODUCT.md anti-references, carried through verbatim).
- **Don't** set uppercase tracked "eyebrow" labels above sections — this system has no eyebrows anywhere.
- **Don't** use `border-left`/`border-right` as a colored accent stripe on cards or list items.
- **Don't** reach for a persistent, always-visible sidebar — the window is too small; use the collapsible icon-rail pattern instead.
- **Don't** render chat messages as bubbles with container chrome — flat transcript, distinguished by weight/color only.
