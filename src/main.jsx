import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./gym-app.jsx";

// Clear signal you're on local Vite, not Vercel / old PWA cache
if (import.meta.env.DEV) {
  document.title = "OZGYM · DEV (Swipe-Pager)";
  try {
    // Kill any leftover service workers that pin old bundles
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
    if (typeof caches !== "undefined" && caches.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
