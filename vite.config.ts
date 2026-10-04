import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const previewAllowedHosts = [".e2b.app"];

export default defineConfig({
  plugins: [
    react(),
    {
      name: "virtual-tailwind-zero-css-file",
      resolveId(id) {
        if (id === "virtual:tailwind.css") {
          return "\0virtual:tailwind.css";
        }
        return null;
      },
      load(id) {
        if (id === "\0virtual:tailwind.css") {
          return "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n";
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: previewAllowedHosts,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: previewAllowedHosts,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  }
});
