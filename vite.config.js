import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PWA temporarily disabled — service worker kept serving the old onboarding wizard.
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
