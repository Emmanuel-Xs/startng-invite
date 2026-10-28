import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // three.js (~520 kB) is split into its own chunk and only loads when a face is first needed.
  build: { chunkSizeWarningLimit: 600 },
});
