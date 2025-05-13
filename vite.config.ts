import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],
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
