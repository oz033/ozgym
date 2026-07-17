/* Barcode-Scanner — mobil-first
 *
 * 1) Live: getUserMedia + native BarcodeDetector (Chrome/Android, neuere Safari)
 * 2) Live-Fallback: html5-qrcode OHNE qrbox (qrbox bricht 1D-EAN oft)
 * 3) Foto: capture=environment → decode (zuverlässig auf iOS)
 * 4) Manuell tippen
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Keyboard,
  Flashlight,
  FlashlightOff,
  Camera,
  ImagePlus,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { showToast } from "./ui.jsx";

const FORMATS_BD = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
];

const FORMATS_H5 = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

function normalizeBarcode(raw) {
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length < 8 || code.length > 18) return "";
  return code;
}

function createDetector() {
  try {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      return null;
    }
    try {
      return new window.BarcodeDetector({ formats: FORMATS_BD });
    } catch {
      return new window.BarcodeDetector();
    }
  } catch {
    return null;
  }
}

/**
 * @param {{ onDetect: (code: string) => void, onClose: () => void }} props
 */
export default function BarcodeScanner({ onDetect, onClose }) {
  const [mode, setMode] = useState("live"); // live | manual
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Kamera startet…");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  /** 'native' | 'h5' | '' */
  const [engine, setEngine] = useState("");

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const h5Ref = useRef(null);
  const h5HostRef = useRef(null);
  const handledRef = useRef(false);
  const rafRef = useRef(0);
  const detectBusy = useRef(false);

  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  onDetectRef.current = onDetect;
  onCloseRef.current = onClose;

  const stopAll = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
    }
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.srcObject = null;
      } catch {
        /* ignore */
      }
    }
    const h5 = h5Ref.current;
    h5Ref.current = null;
    if (h5) {
      try {
        if (h5.isScanning) {
          await Promise.race([
            h5.stop(),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        }
      } catch {
        /* ignore */
      }
      try {
        await h5.clear();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const finishWithCode = useCallback(
    (raw) => {
      if (handledRef.current) return false;
      const clean = normalizeBarcode(raw);
      if (!clean) return false;
      handledRef.current = true;
      setStatus("Erkannt — suche Produkt…");
      try {
        navigator.vibrate?.(40);
      } catch {
        /* ignore */
      }
      showToast(`Barcode ${clean}`, "success");
      try {
        onDetectRef.current?.(clean);
      } catch (e) {
        console.error("[scan] onDetect", e);
        handledRef.current = false;
        showToast("Verarbeitung fehlgeschlagen", "error");
        return false;
      }
      // Kamera stoppen, Parent hat Scanner bereits unmounted oft
      stopAll();
      return true;
    },
    [stopAll],
  );

  useEffect(() => {
    if (mode !== "live") {
      stopAll();
      setEngine("");
      return undefined;
    }

    let cancelled = false;
    handledRef.current = false;
    setError("");
    setTorchSupported(false);
    setTorchOn(false);
    setEngine("");
    setStatus("Kamera startet…");

    const startNative = async (detector) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      try {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        if (caps.torch) setTorchSupported(true);
      } catch {
        /* ignore */
      }

      if (cancelled) return false;
      setEngine("native");
      setStatus("Code vor die Kamera halten");

      let last = 0;
      const loop = (ts) => {
        if (cancelled || handledRef.current) return;
        rafRef.current = requestAnimationFrame(loop);
        if (ts - last < 90) return;
        last = ts;
        const v = videoRef.current;
        if (!v || v.readyState < 2 || detectBusy.current) return;
        detectBusy.current = true;
        detector
          .detect(v)
          .then((codes) => {
            if (cancelled || handledRef.current) return;
            const text = (codes || [])
              .map((c) => c.rawValue)
              .find((t) => normalizeBarcode(t));
            if (text) finishWithCode(text);
          })
          .catch(() => {})
          .finally(() => {
            detectBusy.current = false;
          });
      };
      rafRef.current = requestAnimationFrame(loop);
      return true;
    };

    const startH5 = async () => {
      const host = h5HostRef.current;
      if (!host) throw new Error("Scanner-Host fehlt");
      host.innerHTML = "";
      const id = "ozgym-h5-scan";
      const box = document.createElement("div");
      box.id = id;
      box.className = "ig-scan-h5";
      host.appendChild(box);

      const scanner = new Html5Qrcode(id, {
        formatsToSupport: FORMATS_H5,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      h5Ref.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 12,
          // KEIN qrbox — 1D-EAN wird sonst auf dem Handy oft nie erkannt
          disableFlip: false,
        },
        (decoded) => {
          if (!cancelled) finishWithCode(decoded);
        },
        () => {},
      );

      if (cancelled) {
        await stopAll();
        return;
      }
      setEngine("h5");
      setStatus("Code vor die Kamera halten");

      try {
        const torch = scanner
          .getRunningTrackCameraCapabilities?.()
          ?.torchFeature?.();
        if (torch?.isSupported?.()) setTorchSupported(true);
      } catch {
        /* ignore */
      }
    };

    const run = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Keine Kamera-API — Foto oder manuell nutzen.");
        setStatus("Foto oder manuell");
        return;
      }

      const detector = createDetector();
      if (detector) {
        try {
          const ok = await startNative(detector);
          if (ok || cancelled) return;
        } catch (e) {
          console.warn("[scan] native failed", e);
          await stopAll();
        }
      }

      try {
        await startH5();
      } catch (e) {
        if (cancelled) return;
        console.warn("[scan] h5 failed", e);
        const msg =
          e?.name === "NotAllowedError" ||
          String(e?.message || "").toLowerCase().includes("permission")
            ? "Kamera-Zugriff verweigert — Foto oder manuell nutzen."
            : e?.name === "NotFoundError"
              ? "Keine Kamera — Foto oder manuell nutzen."
              : "Live-Scan nicht möglich — bitte Foto aufnehmen oder manuell eingeben.";
        setError(msg);
        setStatus("Foto oder manuell");
        setEngine("");
      }
    };

    const t = setTimeout(run, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      stopAll();
    };
  }, [mode, finishWithCode, stopAll]);

  const toggleTorch = async () => {
    try {
      const stream = streamRef.current;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        if (caps.torch) {
          const next = !torchOn;
          await track.applyConstraints({ advanced: [{ torch: next }] });
          setTorchOn(next);
          return;
        }
      }
      const h5 = h5Ref.current;
      if (h5) {
        const torch = h5
          .getRunningTrackCameraCapabilities?.()
          ?.torchFeature?.();
        if (torch?.isSupported?.()) {
          const next = !torchOn;
          await torch.apply(next);
          setTorchOn(next);
          return;
        }
      }
      showToast("Taschenlampe nicht verfügbar", "info");
    } catch {
      showToast("Taschenlampe fehlgeschlagen", "error");
    }
  };

  const decodeFile = async (file) => {
    // Native
    const detector = createDetector();
    if (detector && typeof createImageBitmap === "function") {
      try {
        const bmp = await createImageBitmap(file);
        try {
          const codes = await detector.detect(bmp);
          const text = (codes || [])
            .map((c) => c.rawValue)
            .find((t) => normalizeBarcode(t));
          if (text && finishWithCode(text)) return true;
        } finally {
          bmp.close?.();
        }
      } catch (err) {
        console.warn("[scan] photo BD", err);
      }
    }

    // html5-qrcode file scan
    const tmpId = "ozgym-scan-file-tmp";
    let host = document.getElementById(tmpId);
    if (!host) {
      host = document.createElement("div");
      host.id = tmpId;
      host.style.cssText =
        "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(host);
    }
    host.innerHTML = "";
    const scanner = new Html5Qrcode(tmpId, {
      formatsToSupport: FORMATS_H5,
      verbose: false,
      useBarCodeDetectorIfSupported: true,
    });
    try {
      const result = await scanner.scanFileV2(file, false);
      const text =
        typeof result === "string"
          ? result
          : result?.decodedText || result?.text || "";
      if (text && finishWithCode(text)) return true;
    } finally {
      try {
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }
    return false;
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || handledRef.current) return;
    setBusyPhoto(true);
    setStatus("Foto wird gelesen…");
    try {
      const ok = await decodeFile(file);
      if (!ok) {
        showToast("Kein Barcode im Foto — näher rangehen, scharf stellen", "error");
        setStatus("Kein Code im Foto");
      }
    } catch (err) {
      console.warn("[scan] photo", err);
      showToast("Foto konnte nicht gelesen werden", "error");
      setStatus("Foto fehlgeschlagen");
    } finally {
      setBusyPhoto(false);
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
            stopAll().finally(() => onCloseRef.current?.());
          }}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
      </header>

      <p className="ig-scan-hint dim">
        Live-Scan oder besser: <strong>Foto der Verpackung</strong> — funktioniert
        auch auf dem iPhone zuverlässig.
      </p>

      {mode === "live" ? (
        <div className="ig-scan-camera-wrap">
          <div
            className={
              "ig-scan-region" +
              (engine === "native" ? " is-native" : "") +
              (engine === "h5" ? " is-h5" : "")
            }
          >
            <video
              ref={videoRef}
              className="ig-scan-video"
              playsInline
              muted
              autoPlay
            />
            <div ref={h5HostRef} className="ig-scan-h5-host" />
            <div className="ig-scan-frame" aria-hidden="true" />
          </div>

          {status ? (
            <p className="ig-scan-status" role="status">
              <Camera size={14} aria-hidden="true" /> {status}
            </p>
          ) : null}
          {error ? <p className="ig-scan-error">{error}</p> : null}

          <div className="ig-scan-toolbar">
            <button
              type="button"
              className="ig-btn-primary"
              disabled={busyPhoto}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={16} aria-hidden="true" />
              {busyPhoto ? "Liest…" : "Foto aufnehmen"}
            </button>
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
              placeholder="z. B. 9008505000123"
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
              setMode("live");
            }}
          >
            Zurück zur Kamera
          </button>
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            disabled={busyPhoto}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={16} /> Foto scannen
          </button>
        </form>
      )}

      {/* Ein File-Input für Live + Manuell (capture = Rückkamera) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onPhoto}
        tabIndex={-1}
        aria-label="Barcode-Foto"
      />
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
