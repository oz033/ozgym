import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./gym-app.jsx";
import { showToast } from "./components/ui.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Update-Fluss: neue Version erkannt → Toast mit "Neu laden". Nutzer
// entscheidet den Zeitpunkt (nie mitten im Workout unterbrochen).
// Delay: ToastHost mountet erst nach dem Splash — Event darf nicht verpuffen.
const updateSW = registerSW({
  onNeedRefresh() {
    setTimeout(() => {
      showToast("Neue Version verfügbar.", "info", {
        sticky: true,
        actionLabel: "Neu laden",
        onAction: () => updateSW(true),
      });
    }, 1800);
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
);
