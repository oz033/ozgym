/* iPhone chrome: install coach + offline strip */

import React, { useEffect, useState } from "react";
import { Share, WifiOff, X } from "lucide-react";
import {
  isStandalone,
  isIos,
  wasInstallDismissed,
  dismissInstallCoach,
} from "../lib/iosShell.js";

/** Slim offline banner — sticky under header feel via fixed bottom above dock */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="ig-offline-banner" role="status" aria-live="polite">
      <WifiOff size={14} aria-hidden="true" />
      <span>Offline — Daten bleiben auf dem Gerät</span>
    </div>
  );
}

/**
 * Home-Screen install coach — only Safari (not already standalone).
 * iOS cannot programmatically install; we show the real path.
 */
export function InstallCoach({ hidden }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hidden) return;
    if (isStandalone()) return;
    if (wasInstallDismissed()) return;
    // Delay so splash / first paint settles
    const t = window.setTimeout(() => setShow(true), 2200);
    return () => clearTimeout(t);
  }, [hidden]);

  if (!show || hidden) return null;

  const ios = isIos();

  return (
    <div className="ig-install-coach" role="region" aria-label="App installieren">
      <div className="ig-install-coach-body">
        <span className="ig-install-coach-icon" aria-hidden="true">
          <Share size={18} />
        </span>
        <div className="ig-install-coach-text">
          <strong>Wie eine echte App</strong>
          <p>
            {ios
              ? "Tippe Teilen, dann „Zum Home-Bildschirm“ — Vollbild, ohne Safari-Leiste."
              : "Zum Home-Bildschirm hinzufügen für Vollbild und schnelleren Start."}
          </p>
        </div>
        <button
          type="button"
          className="ig-install-coach-x"
          aria-label="Hinweis schließen"
          onClick={() => {
            dismissInstallCoach();
            setShow(false);
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
