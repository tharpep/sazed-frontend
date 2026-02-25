# Sazed Frontend

React + Tauri desktop/web chat UI for [Sazed](https://github.com/tharpep/sazed), the personal AI agent.

## Ecosystem

Part of a personal AI ecosystem — see [sazed](https://github.com/tharpep/sazed) for the full picture.

## Commands

```bash
pnpm dev          # Vite dev server at http://localhost:3000
pnpm build        # TypeScript check + Vite build
pnpm tauri dev    # Tauri desktop window (requires Rust toolchain)
pnpm tauri build  # Full desktop build
```

## Stack

- **React 19** + TypeScript, Vite 7
- **Tauri v2** — frameless desktop shell (900×620)
- **Zustand** — chat, session, and UI state
- **CSS Modules** + CSS custom properties, self-hosted fonts

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `VITE_SAZED_URL` | `http://localhost:8000` | Sazed agent base URL |
| `VITE_API_KEY` | *(empty)* | API key for the agent |

All API requests go through `src/api/client.ts`.
