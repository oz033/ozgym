/* Kamera-Barcode-Scan + manuelle Eingabe (EAN/UPC) */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Keyboard, Flashlight, FlashlightOff } from "lucide-react";
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

/**
 * @param {{ onDetect: (code: string) => void, onClose: () => void }} props
 */
export default function BarcodeScanner({ onDetect, onClose }) {
  const [mode, setMode] = useState("camera"); // camera | manual
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const startingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
    } catch {
      /* ignore */
    }
    try {
      await s.clear();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (mode !== "camera") {
      stopScanner();
      return undefined;
    }

    let cancelled = false;
    handledRef.current = false;

    const start = async () => {
      if (startingRef.current) return;
      startingRef.current = true;
      setError("");
      try {
        await stopScanner();
        if (cancelled) return;

        const scanner = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const w = Math.min(vw, 320);
              const h = Math.min(Math.floor(w * 0.45), Math.floor(vh * 0.35));
              return { width: w, height: Math.max(80, h) };
            },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          (decoded) => {
            if (handledRef.current || cancelled) return;
            const code = String(decoded || "").replace(/\D/g, "");
            if (code.length < 8) return;
            handledRef.current = true;
            try {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(30);
              }
            } catch {
              /* ignore */
            }
            stopScanner().finally(() => onDetect(code));
          },
          () => {
            /* frame miss — ignore */
          },
        );

        // Torch capability (Android Chrome)
        try {
          const track = scanner.getRunningTrackCameraCapabilities?.();
          const torch = track?.torchFeature?.();
          if (torch?.isSupported?.()) setTorchSupported(true);
        } catch {
          setTorchSupported(false);
        }
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.message?.includes("Permission") || e?.name === "NotAllowedError"
            ? "Kamera-Zugriff verweigert. Bitte erlauben oder manuell eingeben."
            : e?.message?.includes("NotFound") || e?.name === "NotFoundError"
              ? "Keine Kamera gefunden. Barcode manuell eingeben."
              : "Kamera konnte nicht gestartet werden. Manuell eingeben.";
        setError(msg);
        setMode("manual");
      } finally {
        startingRef.current = false;
      }
    };

    // DOM-Knoten für html5-qrcode muss gemountet sein
    const t = requestAnimationFrame(() => start());

    return () => {
      cancelled = true;
      cancelAnimationFrame(t);
      stopScanner();
    };
  }, [mode, onDetect, stopScanner]);

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
    const code = manual.replace(/\D/g, "");
    if (code.length < 8) {
      showToast("Mindestens 8 Ziffern", "error");
      return;
    }
    onDetect(code);
  };

  return (
    <div className="ig-scan" role="dialog" aria-modal="true" aria-label="Barcode scannen">
      <header className="ig-scan-head">
        <h2 className="ig-scan-title">Barcode scannen</h2>
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={() => {
            stopScanner().finally(onClose);
          }}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
      </header>

      <p className="ig-scan-hint dim">
        Strichcode auf die Verpackung richten — funktioniert offline, wenn du
        das Produkt schon einmal geladen hast.
      </p>

      {mode === "camera" ? (
        <div className="ig-scan-camera-wrap">
          <div id={SCANNER_ID} className="ig-scan-region" />
          <div className="ig-scan-toolbar">
            {torchSupported ? (
              <button
                type="button"
                className="ig-chip sm"
                onClick={toggleTorch}
                aria-pressed={torchOn}
              >
                {torchOn ? <FlashlightOff size={14} /> : <Flashlight size={14} />}
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
}
