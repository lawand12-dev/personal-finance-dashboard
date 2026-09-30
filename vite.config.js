import { defineConfig } from "vite";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "finova",
  plugins: [tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: "/html/finova.html",
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    rollupOptions: {
      input: resolve(process.cwd(), "finova/html/finova.html"),
    },
  },
});
