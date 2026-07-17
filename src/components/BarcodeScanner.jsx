/* Barcode-Scanner (PWA/Browser)
 *
 * Warum es vorher oft „nichts tat“:
 * 1) getUserMedia im useEffect/setTimeout → iOS verliert User-Gesture
 * 2) html5-qrcode + qrbox erkennt 1D-EAN am Handy unzuverlässig
 *
 * Ansatz wie stabile Web-Scanner (ZXing):
 * - Stream kommt VOM PARENT (im onClick geholt)
 * - Decode mit @zxing/browser (1D/EAN)
 * - Foto-Scan + Manuell als Fallback
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
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
} from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { showToast } from "./ui.jsx";
import { stopMediaStream } from "../lib/camera.js";

function normalizeBarcode(raw) {
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length < 8 || code.length > 18) return "";
  return code;
}

function makeReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  // Continuously try; ZXing throws NotFoundException per frame — normal
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 800,
    tryPlayVideoTimeout: 8000,
  });
}

/**
 * @param {{
 *   onDetect: (code: string) => void,
 *   onClose: () => void,
 *   stream?: MediaStream | null,
 *   cameraError?: string,
 * }} props
 */
export default function BarcodeScanner({
  onDetect,
  onClose,
  stream = null,
  cameraError = "",
}) {
  const [mode, setMode] = useState("live"); // live | manual
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState(
    stream ? "Code vor die Kamera halten" : "Kamera wird vorbereitet…",
  );
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [error, setError] = useState(cameraError || "");

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(stream);
  const handledRef = useRef(false);
  const ownStreamRef = useRef(false); // true = we must stop stream on unmount

  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  onDetectRef.current = onDetect;
  onCloseRef.current = onClose;

  // Parent may pass stream after first paint
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    if (cameraError) setError(cameraError);
  }, [cameraError]);

  const teardownDecode = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
    try {
      readerRef.current?.reset();
    } catch {
      /* ignore */
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
      teardownDecode();
      try {
        onDetectRef.current?.(clean);
      } catch (e) {
        console.error("[scan] onDetect", e);
        handledRef.current = false;
        showToast("Verarbeitung fehlgeschlagen", "error");
        return false;
      }
      return true;
    },
    [teardownDecode],
  );

  // Live decode with ZXing from parent stream (or self-requested fallback)
  useEffect(() => {
    if (mode !== "live") {
      teardownDecode();
      return undefined;
    }

    let cancelled = false;
    handledRef.current = false;

    const start = async () => {
      const video = videoRef.current;
      if (!video) return;

      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.playsInline = true;

      let activeStream = streamRef.current;

      // Fallback only if parent couldn't get stream (still try — may fail on iOS)
      if (!activeStream) {
        try {
          setStatus("Kamera startet…");
          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          });
          if (cancelled) {
            stopMediaStream(activeStream);
            return;
          }
          streamRef.current = activeStream;
          ownStreamRef.current = true;
        } catch (e) {
          if (cancelled) return;
          console.warn("[scan] getUserMedia fallback", e);
          setError(
            "Live-Kamera nicht verfügbar. Nutze „Foto aufnehmen“ — das funktioniert im Browser und in der Home-Screen-App.",
          );
          setStatus("Foto oder manuell");
          return;
        }
      }

      video.srcObject = activeStream;
      try {
        await video.play();
      } catch (e) {
        console.warn("[scan] video.play", e);
      }

      // Torch capability
      try {
        const track = activeStream.getVideoTracks?.()[0];
        const caps = track?.getCapabilities?.() || {};
        if (caps.torch) setTorchSupported(true);
      } catch {
        setTorchSupported(false);
      }

      if (cancelled) return;
      setStatus("Code waagrecht vor die Kamera halten");
      setError("");

      const reader = makeReader();
      readerRef.current = reader;

      try {
        const controls = await reader.decodeFromStream(
          activeStream,
          video,
          (result, err) => {
            if (cancelled || handledRef.current) return;
            if (result) {
              const text = result.getText?.() || String(result.text || "");
              finishWithCode(text);
              return;
            }
            // NotFoundException every frame — ignore
            if (err && err.name && err.name !== "NotFoundException") {
              // occasional checksum errors etc.
            }
          },
        );
        if (cancelled) {
          controls?.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e) {
        if (cancelled) return;
        console.warn("[scan] zxing start", e);
        setError(
          "Live-Scan fehlgeschlagen. Bitte „Foto aufnehmen“ — funktioniert auch im Browser.",
        );
        setStatus("Foto oder manuell");
      }
    };

    // microtask: video node must be mounted; stream already acquired in click
    const t = requestAnimationFrame(() => {
      if (!cancelled) start();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(t);
      teardownDecode();
      if (ownStreamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
        ownStreamRef.current = false;
      }
      const v = videoRef.current;
      if (v) {
        try {
          v.srcObject = null;
        } catch {
          /* ignore */
        }
      }
    };
  }, [mode, finishWithCode, teardownDecode, stream]);

  // Parent closes scanner: don't stop parent-owned stream here if parent handles it
  useEffect(() => {
    return () => {
      teardownDecode();
      // Parent owns stream from openScanner — FoodTab must stop it on close
    };
  }, [teardownDecode]);

  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks?.()[0];
      const caps = track?.getCapabilities?.() || {};
      if (!caps.torch) {
        showToast("Taschenlampe nicht verfügbar", "info");
        return;
      }
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      showToast("Taschenlampe fehlgeschlagen", "error");
    }
  };

  const decodeImageFile = async (file) => {
    const reader = makeReader();
    const url = URL.createObjectURL(file);
    try {
      // Prefer ImageBitmap path via img element
      const img = new Image();
      img.decoding = "async";
      const loaded = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Bild laden fehlgeschlagen"));
      });
      img.src = url;
      await loaded;
      const result = await reader.decodeFromImageElement(img);
      const text = result?.getText?.() || "";
      return normalizeBarcode(text) ? text : "";
    } finally {
      URL.revokeObjectURL(url);
      try {
        reader.reset();
      } catch {
        /* ignore */
      }
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || handledRef.current) return;
    setBusyPhoto(true);
    setStatus("Foto wird gelesen…");
    try {
      const text = await decodeImageFile(file);
      if (!text || !finishWithCode(text)) {
        showToast(
          "Kein Barcode im Foto — näher, scharf, guter Kontrast",
          "error",
        );
        setStatus("Kein Code im Foto — erneut versuchen");
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

  const handleClose = () => {
    teardownDecode();
    onCloseRef.current?.();
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
          onClick={handleClose}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
      </header>

      <p className="ig-scan-hint dim">
        Funktioniert im Browser und als Home-Screen-App. Am iPhone oft am
        zuverlässigsten: <strong>Foto aufnehmen</strong>.
      </p>

      {mode === "live" ? (
        <div className="ig-scan-camera-wrap">
          <div className="ig-scan-region is-native">
            <video
              ref={videoRef}
              className="ig-scan-video"
              playsInline
              muted
              autoPlay
            />
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
              placeholder="z. B. 3017620422003"
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
            onClick={() => setMode("live")}
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
