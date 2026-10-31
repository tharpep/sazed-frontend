import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const ZOD_LOCALES = "\0zod-locales";

// The second build: every catalog widget in one self-contained HTML file, which the gateway
// serves as MCP Apps ui:// resources. See src/cards/main.tsx.
export default defineConfig({
  root: path.resolve(__dirname, "src/cards"),
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      // The MCP Apps client imports all of Zod, and half of that is locale files nothing here uses.
      name: "strip-zod-locales",
      enforce: "pre",
      resolveId: (id) => (/locales\/index\.js$/.test(id) ? ZOD_LOCALES : null),
      load: (id) => (id === ZOD_LOCALES ? "export {}" : null),
    },
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2022",
    outDir: path.resolve(__dirname, "dist/cards"),
    emptyOutDir: false,
    rollupOptions: { input: path.resolve(__dirname, "src/cards/widget.html") },
  },
});
