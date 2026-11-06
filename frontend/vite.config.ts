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
    port: 5174,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: process.env["BACKEND_URL"] || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: false,
        // Certains relais d’aperçu réservent Authorization pour leur propre accès.
        // Restaurer le jeton applicatif avant Laravel, sans changer sa validation.
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq, req) => {
            const session = req.headers["x-session-begpharma"];
            if (typeof session === "string" && session) {
              proxyReq.setHeader("Authorization", `Bearer ${session}`);
              proxyReq.removeHeader("X-Session-Begpharma");
            }
          });
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
});
