import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks(id) { if (id.includes("@oondemand/oon-core-front")) return "ooncore"; if (id.includes("@chakra-ui") || id.includes("@emotion")) return "ui-vendor"; if (id.includes("react")) return "react-vendor"; } } } },
  resolve: { preserveSymlinks: true },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4002",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    fs: { allow: [".."] },
  },
});
