import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA wieder aktiv. Der alte Vorfall (SW servierte den entfernten
// Onboarding-Wizard) ist gelöst: registerType "prompt" + Update-Toast in
// main.jsx — der Nutzer entscheidet, WANN die neue Version übernimmt
// (nie mitten im Workout), cleanupOutdatedCaches räumt Altlasten weg.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      // public/manifest.webmanifest bleibt die eine Quelle (inkl. shortcuts)
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Übungs-GIFs/Bilder (jsDelivr-CDN): einmal gesehen = offline da.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*\.(gif|png|jpe?g|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "ozgym-exercise-media",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              // <img> lädt no-cors → opaque responses (Status 0) mitcachen
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ozgym-fonts-css",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "ozgym-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
