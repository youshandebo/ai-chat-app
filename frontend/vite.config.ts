import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6556,
    proxy: {
      "/api": {
        target: "http://localhost:6555",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist"
  }
});