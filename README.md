# Sazed Frontend

Static UI for the Sazed chat app. See [PLAN.md](./PLAN.md) for architecture and build order.

## Commands

- **Web:** `pnpm dev` — dev server at http://localhost:3000
- **Desktop:** `pnpm tauri dev` — Tauri window (requires Rust)
- **Build:** `pnpm build` then `pnpm tauri build`

## Stack

React 19, TypeScript, Vite 7, Tauri v2, CSS Modules, no backend calls (static mock data).
