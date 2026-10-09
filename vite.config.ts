import { readFile, stat } from "node:fs/promises";
import { parseRosterCsvText } from "./src/services/rosterImport";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const previewAllowedHosts = [".e2b.app"];
const LOCAL_ROSTER_MAX_BYTES = 10 * 1024 * 1024;

/** Optional, development-only summary provider for the user's workspace attachment.
 * It is enabled only when YAMO_ROSTER_SOURCE is set at server startup. The endpoint
 * returns validated aggregates only; it never sends individual rows to the browser.
 * The file is never copied into the app bundle or repository.
 */
const localRosterSourcePlugin = (): Plugin => ({
  name: "local-roster-summary",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__dev/roster-summary", async (request, response) => {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.end();
        return;
      }
      const sourcePath = process.env.YAMO_ROSTER_SOURCE;
      if (!sourcePath) {
        // This optional development feed is absent during ordinary local preview.
        // 204 keeps a normal no-data state from appearing as a browser console 404.
        response.statusCode = 204;
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.end();
        return;
      }
      if (!/\.(csv|txt)$/i.test(sourcePath)) {
        response.statusCode = 400;
        response.end();
        return;
      }
      try {
        const metadata = await stat(sourcePath);
        if (!metadata.isFile() || metadata.size > LOCAL_ROSTER_MAX_BYTES) {
          response.statusCode = metadata.size > LOCAL_ROSTER_MAX_BYTES ? 413 : 404;
          response.end();
          return;
        }
        const contents = await readFile(sourcePath, "utf8");
        const preview = parseRosterCsvText(contents);
        if (!preview.ok || !preview.summary) {
          response.statusCode = 422;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ ok: false, errors: preview.errors.map(({ code, count }) => ({ code, count })) }));
          return;
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.end(JSON.stringify(preview.summary));
      } catch {
        response.statusCode = 404;
        response.end();
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    localRosterSourcePlugin(),
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
