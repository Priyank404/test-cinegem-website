import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  server: {
    host: true, // listen on all interfaces
    port: 5173,

    // allow Cloudflare Tunnel hostname
    allowedHosts: true,

    historyApiFallback: true,
  },
});