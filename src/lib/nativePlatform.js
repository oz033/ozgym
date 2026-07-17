/**
 * Capacitor-Erkennung und native Barcode-Bridge (iOS ML Kit).
 * Im Browser/PWA: alles false → Web-Scanner bleibt aktiv.
 */

import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function getNativePlatform() {
  try {
    return Capacitor.getPlatform?.() || "web";
  } catch {
    return "web";
  }
}

/**
 * Native ML-Kit-Scan (ready-to-use UI) — nur iOS/Android App.
 * @returns {Promise<string|null>} EAN/UPC-Ziffern oder null bei Abbruch
 */
export async function scanBarcodeNative() {
  if (!isNativeApp()) return null;

  const { BarcodeScanner, BarcodeFormat } = await import(
    "@capacitor-mlkit/barcode-scanning"
  );

  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) {
    throw new Error("Barcode-Scanner auf diesem Gerät nicht verfügbar.");
  }

  // Kamera-Recht
  let perm = await BarcodeScanner.checkPermissions();
  if (perm.camera !== "granted" && perm.camera !== "limited") {
    perm = await BarcodeScanner.requestPermissions();
  }
  if (perm.camera !== "granted" && perm.camera !== "limited") {
    throw new Error(
      "Kamera-Zugriff verweigert. Bitte in den iPhone-Einstellungen erlauben.",
    );
  }

  // Ready-to-use Scanner (fullscreen, nativ — wie Store-Apps)
  const { barcodes } = await BarcodeScanner.scan({
    formats: [
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
      BarcodeFormat.UpcA,
      BarcodeFormat.UpcE,
      BarcodeFormat.Code128,
    ],
    autoZoom: true,
  });

  const raw =
    barcodes?.[0]?.rawValue ||
    barcodes?.[0]?.displayValue ||
    "";
  const code = String(raw).replace(/\D/g, "");
  if (code.length < 8) return null;
  return code;
}

/** Ob nativer Scan sinnvoll ist (Capacitor iOS/Android) */
export async function canUseNativeBarcode() {
  if (!isNativeApp()) return false;
  try {
    const { BarcodeScanner } = await import(
      "@capacitor-mlkit/barcode-scanning"
    );
    const { supported } = await BarcodeScanner.isSupported();
    return !!supported;
  } catch {
    return false;
  }
}
