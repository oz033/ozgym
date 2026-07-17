/**
 * iPhone / PWA shell helpers — standalone detect, share, install coach.
 */

/** True when launched as installed Home Screen app (or Android TWA). */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    if (window.matchMedia?.("(display-mode: fullscreen)").matches) return true;
    // iOS Safari legacy
    if (window.navigator.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Web Share API — returns 'shared' | 'cancelled' | 'unsupported'
 */
export async function sharePayload({ title, text, url }) {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  try {
    await navigator.share({
      title: title || "OZGYM",
      text: text || "",
      ...(url ? { url } : {}),
    });
    return "shared";
  } catch (e) {
    if (e?.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

/** Local dismiss keys for install coach */
export const INSTALL_DISMISS_KEY = "ozgym_install_dismiss_v1";

export function wasInstallDismissed() {
  try {
    return localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallCoach() {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}
