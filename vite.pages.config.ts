import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "gh-pages",
  publicDir: "../public",
  base: "/vita-gestao-saude/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
