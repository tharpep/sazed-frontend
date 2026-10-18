import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// `pnpm dev:homelab` (mode "homelab", .env.homelab) points the app at relative /api and /gw;
// these proxy them to the live console on the tailnet, server-side, so the browser stays
// same-origin (the console's Caddy rejects cross-site browser requests) and holds no keys.
// @ts-expect-error process is a nodejs global
const labTarget = process.env.SAZED_LAB_URL || "https://sazed.tail77c590.ts.net";

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
    proxy: {
      "/api": { target: labTarget, changeOrigin: true },
      "/gw": { target: labTarget, changeOrigin: true },
    },
  },
}));
