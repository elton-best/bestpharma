import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env["BACKEND_URL"] || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
