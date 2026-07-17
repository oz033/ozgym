/* Barcode-Scanner
 *
 * Web/PWA ≠ native App: Apple/Google ML-Scan gibt es im Browser nicht.
 * iPhone Safari: Foto (Systemkamera) = zuverlässigster Weg.
 * Live: fullscreen + ZXing 1D — auf Android oft ok, iOS wackelig.
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
  BrowserMultiFormatOneDReader,
  BarcodeFormat,
} from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { showToast } from "./ui.jsx";
import { isIos } from "../lib/iosShell.js";
import {
  requestBarcodeCamera,
  stopMediaStream,
  cameraErrorMessage,
} from "../lib/camera.js";
import {
  normalizeBarcode,
  decodeBarcodeFromFile,
} from "../lib/barcodeDecode.js";

function makeLiveReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  // OneD-Reader = schneller/zuverlässiger für Strichcodes als MultiFormat
  return new BrowserMultiFormatOneDReader(hints, {
    delayBetweenScanAttempts: 50,
    delayBetweenScanSuccess: 600,
    tryPlayVideoTimeout: 10000,
  });
}

/**
 * @param {{
 *   onDetect: (code: string) => void,
 *   onClose: () => void,
 *   stream?: MediaStream | null,
 *   cameraError?: string,
 *   preferPhoto?: boolean,
 * }} props
 */
export default function BarcodeScanner({
  onDetect,
  onClose,
  stream = null,
  cameraError = "",
  preferPhoto = false,
}) {
  const ios = preferPhoto || isIos();
  const [mode, setMode] = useState(ios ? "photo" : "live");
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState(
    ios
      ? "Am iPhone: Foto der Verpackung — erkennt EAN am zuverlässigsten"
      : "Code vor die Kamera halten",
  );
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [error, setError] = useState(cameraError || "");
  const [liveStarting, setLiveStarting] = useState(false);

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(stream);
  const handledRef = useRef(false);
  const ownStreamRef = useRef(false);

  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  onDetectRef.current = onDetect;
  onCloseRef.current = onClose;

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

  // Live decode
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

      if (!activeStream) {
        // Stream sollte vom Live-Button kommen; Fallback
        try {
          setStatus("Kamera startet…");
          activeStream = await requestBarcodeCamera();
          if (cancelled) {
            stopMediaStream(activeStream);
            return;
          }
          streamRef.current = activeStream;
          ownStreamRef.current = true;
        } catch (e) {
          if (cancelled) return;
          setError(cameraErrorMessage(e));
          setStatus("Foto oder manuell nutzen");
          setMode("photo");
          return;
        }
      }

      video.srcObject = activeStream;
      try {
        await video.play();
      } catch (e) {
        console.warn("[scan] video.play", e);
      }

      try {
        const track = activeStream.getVideoTracks?.()[0];
        const caps = track?.getCapabilities?.() || {};
        if (caps.torch) setTorchSupported(true);
      } catch {
        setTorchSupported(false);
      }

      if (cancelled) return;
      setStatus("Strichcode waagrecht in den Rahmen");
      setError(
        ios
          ? "Hinweis: Live am iPhone ist unsicher — Foto ist besser."
          : "",
      );

      const reader = makeLiveReader();
      readerRef.current = reader;

      try {
        const controls = await reader.decodeFromStream(
          activeStream,
          video,
          (result) => {
            if (cancelled || handledRef.current) return;
            if (result) {
              finishWithCode(result.getText?.() || "");
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
        console.warn("[scan] zxing live", e);
        setError("Live-Scan fehlgeschlagen — bitte Foto aufnehmen.");
        setMode("photo");
      }
    };

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
  }, [mode, finishWithCode, teardownDecode, stream, ios]);

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

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || handledRef.current) return;
    setBusyPhoto(true);
    setStatus("Foto wird gelesen…");
    setError("");
    try {
      const text = await decodeBarcodeFromFile(file);
      if (!text || !finishWithCode(text)) {
        showToast(
          "Kein Barcode erkannt — näher, scharf, ganzer Code im Bild",
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
    if (ownStreamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      ownStreamRef.current = false;
    }
    onCloseRef.current?.();
  };

  const openNativeCamera = () => {
    fileRef.current?.click();
  };

  /** Live starten — getUserMedia im Tap (iOS) */
  const startLiveFromTap = async () => {
    setLiveStarting(true);
    setError("");
    try {
      // Alten eigenen Stream ersetzen
      if (ownStreamRef.current) {
        stopMediaStream(streamRef.current);
        ownStreamRef.current = false;
      }
      const s = await requestBarcodeCamera();
      streamRef.current = s;
      ownStreamRef.current = true;
      setMode("live");
      setStatus("Strichcode waagrecht in den Rahmen");
    } catch (e) {
      setError(cameraErrorMessage(e));
      showToast(cameraErrorMessage(e), "info");
      setMode("photo");
    } finally {
      setLiveStarting(false);
    }
  };

  const node = (
    <div
      className={"ig-scan" + (mode === "live" ? " ig-scan-live" : "")}
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

      {mode === "live" ? (
        <div className="ig-scan-camera-wrap">
          <div className="ig-scan-region">
            <video
              ref={videoRef}
              className="ig-scan-video"
              playsInline
              muted
              autoPlay
            />
            <div className="ig-scan-frame" aria-hidden="true" />
            <p className="ig-scan-overlay-hint">{status}</p>
          </div>
          {error ? <p className="ig-scan-error ig-scan-error-float">{error}</p> : null}
          <div className="ig-scan-toolbar ig-scan-toolbar-float">
            <button
              type="button"
              className="ig-btn-primary"
              disabled={busyPhoto}
              onClick={openNativeCamera}
            >
              <ImagePlus size={16} /> Foto
            </button>
            {torchSupported ? (
              <button
                type="button"
                className="ig-chip sm"
                onClick={toggleTorch}
                aria-pressed={torchOn}
              >
                {torchOn ? <FlashlightOff size={14} /> : <Flashlight size={14} />}
                Licht
              </button>
            ) : null}
            <button
              type="button"
              className="ig-chip sm"
              onClick={() => setMode("manual")}
            >
              <Keyboard size={14} /> Manuell
            </button>
            {ios ? (
              <button
                type="button"
                className="ig-chip sm"
                onClick={() => setMode("photo")}
              >
                Foto-Modus
              </button>
            ) : null}
          </div>
        </div>
      ) : mode === "photo" ? (
        <div className="ig-scan-photo-pane">
          <div className="ig-scan-photo-card">
            <ImagePlus size={44} strokeWidth={1.5} aria-hidden="true" />
            <p className="ig-scan-photo-title">
              {ios ? "iPhone-Kamera (empfohlen)" : "Foto scannen"}
            </p>
            <p className="ig-scan-photo-desc dim">
              {ios
                ? "Im Browser gibt es keinen Apple-Scan wie in Store-Apps. Foto der EAN ist der zuverlässige Web-Weg — oft in 1 Sekunde erkannt."
                : "Fotografiere den Strichcode scharf und gerade."}
            </p>
            <button
              type="button"
              className="ig-btn-primary wide xl"
              disabled={busyPhoto}
              onClick={openNativeCamera}
            >
              <Camera size={18} />{" "}
              {busyPhoto ? "Wird gelesen…" : "Foto aufnehmen"}
            </button>
            <button
              type="button"
              className="ig-btn-primary wide ghosted"
              disabled={liveStarting}
              onClick={startLiveFromTap}
            >
              {liveStarting ? "Kamera…" : "Live-Scan versuchen"}
            </button>
          </div>
          {status ? (
            <p className="ig-scan-status" role="status">
              {status}
            </p>
          ) : null}
          {error ? <p className="ig-scan-error">{error}</p> : null}
          <div className="ig-scan-toolbar">
            <button
              type="button"
              className="ig-chip sm"
              onClick={() => setMode("manual")}
            >
              <Keyboard size={14} /> Manuell tippen
            </button>
          </div>
          <p className="ig-scan-footnote dim">
            Cola Zero u. a. sind in Open Food Facts — wenn „unbekannt“, oft
            Server-Limit. Nochmal scannen oder Code tippen.
          </p>
        </div>
      ) : (
        <form className="ig-scan-manual" onSubmit={submitManual}>
          <label className="ig-num-field">
            <span>Barcode (EAN)</span>
            <input
              className="ig-input mono"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="z. B. 5449000131805 (Cola Zero)"
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
            onClick={() => setMode(ios ? "photo" : "live")}
          >
            Zurück
          </button>
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            disabled={busyPhoto}
            onClick={openNativeCamera}
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
        aria-label="Barcode fotografieren"
      />
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
