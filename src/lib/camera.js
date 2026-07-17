/**
 * Kamera-Helfer für PWA/Browser.
 *
 * Wichtig iOS/Safari: getUserMedia MUSS in der User-Gesture-Kette laufen
 * (Button-onClick). setState → useEffect → setTimeout bricht die Kette —
 * dann startet die Kamera nicht oder dekodiert nie.
 */

/** @returns {Promise<MediaStream>} */
export async function requestBarcodeCamera() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("Keine Kamera-API in diesem Browser"), {
      name: "NotSupportedError",
    });
  }

  // Erst Rückkamera versuchen, dann weicher Fallback
  const attempts = [
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    {
      audio: false,
      video: { facingMode: "environment" },
    },
    {
      audio: false,
      video: true,
    },
  ];

  let lastErr;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Kamera nicht verfügbar");
}

export function stopMediaStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

export function cameraErrorMessage(e) {
  const name = e?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Kamera-Zugriff verweigert. In den Browser-Einstellungen erlauben, oder Foto/Manuell nutzen.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Keine Kamera gefunden — Foto oder manuell nutzen.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Kamera ist belegt (andere App?). Foto oder manuell nutzen.";
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return "Kamera nur über HTTPS / installierte App möglich.";
  }
  return e?.message || "Kamera konnte nicht gestartet werden.";
}
