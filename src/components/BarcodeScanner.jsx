/* Kamera-Barcode-Scan + manuelle Eingabe (EAN/UPC) — mobil-robust */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard, Flashlight, FlashlightOff, Camera } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { showToast } from "./ui.jsx";

const SCANNER_ID = "ozgym-barcode-region";

const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

/** Nur Ziffern; EAN/UPC mind. 8, max. 18 */
function normalizeBarcode(raw) {
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length < 8 || code.length > 18) return "";
  return code;
}

/**
 * @param {{ onDetect: (code: string) => void, onClose: () => void }} props
 */
export default function BarcodeScanner({ onDetect, onClose }) {
  const [mode, setMode] = useState("camera"); // camera | manual
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Kamera startet…");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const startingRef = useRef(false);
  // Stabile Callbacks — verhindert Kamera-Neustart bei Parent-Rerenders
  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  onDetectRef.current = onDetect;
  onCloseRef.current = onClose;

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      if (s.isScanning) {
        // Timeout: stop() hängt auf manchen iOS/Android-Builds
        await Promise.race([
          s.stop(),
          new Promise((r) => setTimeout(r, 1200)),
        ]);
      }
    } catch {
      /* ignore */
    }
    try {
      await s.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const finishWithCode = useCallback(
    (code) => {
      if (handledRef.current) return;
      const clean = normalizeBarcode(code);
      if (!clean) return;
      handledRef.current = true;
      setStatus("Erkannt — suche Produkt…");
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch {
        /* ignore */
      }
      showToast("Barcode erkannt", "success");
      // Zuerst Parent benachrichtigen (Lookup), Kamera im Hintergrund stoppen.
      // Früher: stop().finally(onDetect) → stop hängt → gar nichts passiert.
      try {
        onDetectRef.current?.(clean);
      } catch (e) {
        console.error("[scan] onDetect", e);
        showToast("Scan-Verarbeitung fehlgeschlagen", "error");
        handledRef.current = false;
      }
      stopScanner();
    },
    [stopScanner],
  );

  useEffect(() => {
    if (mode !== "camera") {
      stopScanner();
      return undefined;
    }

    let cancelled = false;
    handledRef.current = false;
    setStatus("Kamera startet…");

    const start = async () => {
      if (startingRef.current) return;
      startingRef.current = true;
      setError("");

      try {
        // Region muss im DOM + mit Layout-Größe existieren
        const el = document.getElementById(SCANNER_ID);
        if (!el) {
          throw new Error("Scanner-Element fehlt");
        }

        await stopScanner();
        if (cancelled) return;

        // Alte Library-Reste im Container leeren
        el.innerHTML = "";

        const scanner = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: FORMATS,
          verbose: false,
          // Native BarcodeDetector (Chrome/Android, Safari 17.4+) — viel zuverlässiger für EAN
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 15,
            // Breite Leiste: 1D-EAN braucht mehr Breite als QR
            qrbox: (vw, vh) => {
              const w = Math.floor(Math.min(vw * 0.92, 360));
              const h = Math.floor(Math.min(Math.max(w * 0.38, 100), vh * 0.32));
              return { width: w, height: h };
            },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          (decoded) => {
            if (cancelled) return;
            finishWithCode(decoded);
          },
          () => {
            /* frame miss */
          },
        );

        if (cancelled) {
          await stopScanner();
          return;
        }

        setStatus("Code in den Rahmen halten");

        // iOS-Fix: Video-Constraints nochmal anwenden (sonst oft kein Decode)
        try {
          await new Promise((r) => setTimeout(r, 350));
          if (cancelled || !scannerRef.current) return;
          const caps = scanner.getRunningTrackCapabilities?.();
          if (caps) {
            const advanced = {};
            if (caps.focusMode?.includes?.("continuous")) {
              advanced.focusMode = "continuous";
            }
            await scanner.applyVideoConstraints({
              advanced: Object.keys(advanced).length ? [advanced] : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            });
          }
        } catch {
          /* optional */
        }

        try {
          const track = scanner.getRunningTrackCameraCapabilities?.();
          const torch = track?.torchFeature?.();
          if (torch?.isSupported?.()) setTorchSupported(true);
        } catch {
          setTorchSupported(false);
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("[scan] start failed", e);
        const msg =
          e?.message?.includes("Permission") ||
          e?.name === "NotAllowedError" ||
          e?.name === "NotAllowedError"
            ? "Kamera-Zugriff verweigert. Bitte erlauben oder manuell eingeben."
            : e?.name === "NotFoundError" || e?.message?.includes("NotFound")
              ? "Keine Kamera gefunden. Barcode manuell eingeben."
              : e?.name === "NotReadableError"
                ? "Kamera belegt (andere App?). Manuell eingeben."
                : "Kamera konnte nicht gestartet werden. Manuell eingeben.";
        setError(msg);
        setStatus("");
        setMode("manual");
      } finally {
        startingRef.current = false;
      }
    };

    // Kurzer Delay: Portal + Layout auf dem Handy erst stabil
    const t = setTimeout(() => {
      if (!cancelled) start();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(t);
      stopScanner();
    };
  }, [mode, finishWithCode, stopScanner]);

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const caps = s.getRunningTrackCameraCapabilities?.();
      const torch = caps?.torchFeature?.();
      if (!torch?.isSupported?.()) {
        showToast("Taschenlampe nicht verfügbar", "info");
        return;
      }
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch {
      showToast("Taschenlampe fehlgeschlagen", "error");
    }
  };

  const submitManual = (e) => {
    e?.preventDefault?.();
    const code = normalizeBarcode(manual);
    if (!code) {
      showToast("Barcode: 8–18 Ziffern", "error");
      return;
    }
    finishWithCode(code);
  };

  const node = (
    <div
      className="ig-scan"
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scannen"
    >
      <header className="ig-scan-head">
        <h2 className="ig-scan-title">Barcode scannen</h2>
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={() => {
            stopScanner().finally(() => onCloseRef.current?.());
          }}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
      </header>

      <p className="ig-scan-hint dim">
        Strichcode waagrecht in den Rahmen — EAN von Billa, Hofer, Spar u. a.
      </p>

      {mode === "camera" ? (
        <div className="ig-scan-camera-wrap">
          <div id={SCANNER_ID} className="ig-scan-region" />
          {status ? (
            <p className="ig-scan-status" role="status">
              <Camera size={14} aria-hidden="true" /> {status}
            </p>
          ) : null}
          <div className="ig-scan-toolbar">
            {torchSupported ? (
              <button
                type="button"
                className="ig-chip sm"
                onClick={toggleTorch}
                aria-pressed={torchOn}
              >
                {torchOn ? (
                  <FlashlightOff size={14} />
                ) : (
                  <Flashlight size={14} />
                )}
                {torchOn ? "Licht aus" : "Licht an"}
              </button>
            ) : null}
            <button
              type="button"
              className="ig-chip sm"
              onClick={() => setMode("manual")}
            >
              <Keyboard size={14} /> Manuell
            </button>
          </div>
        </div>
      ) : (
        <form className="ig-scan-manual" onSubmit={submitManual}>
          {error ? <p className="ig-scan-error">{error}</p> : null}
          <label className="ig-num-field">
            <span>Barcode (EAN)</span>
            <input
              className="ig-input mono"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="z. B. 9001234567890"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              maxLength={18}
            />
          </label>
          <button type="submit" className="ig-btn-primary wide xl">
            Produkt suchen
          </button>
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            onClick={() => {
              setError("");
              setMode("camera");
            }}
          >
            Kamera erneut versuchen
          </button>
        </form>
      )}
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
