import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    // Exclude maplibre from Vite's dependency pre-bundling
    // This often helps with plugins that rely on side effects to extend global objects (like L)
    include: ["maplibre-gl"],
  },
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      $assets: path.resolve("./src/assets"),
    },
  },
  server: {
    host: true, // Listen on all addresses, including LAN
  },
  build: {
    sourcemap: true,
  },
});
