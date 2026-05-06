import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6556,
    proxy: {
      "/api": {
        target: "http://localhost:6555",
        changeOrigin: true,
        ws: true,
        timeout: 60000,
        proxyTimeout: 60000
      }
    }
  },
  preview: {
    port: 6556,
    proxy: {
      "/api": {
        target: "http://localhost:6555",
        changeOrigin: true,
        ws: true,
        timeout: 60000,
        proxyTimeout: 60000
      }
    }
  },
  build: {
    outDir: "dist"
  }
});