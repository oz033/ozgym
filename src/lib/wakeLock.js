/**
 * Screen Wake Lock — keeps the display on during a workout (PWA / Safari).
 * Not background execution: only while the page is visible.
 */

let sentinel = null;
let wantLock = false;

async function requestLock() {
  if (!wantLock) return;
  if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return;
  if (document.visibilityState !== "visible") return;
  try {
    // Already held
    if (sentinel) return;
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
      // Re-acquire if we still want it (iOS often releases on blur)
      if (wantLock && document.visibilityState === "visible") {
        requestLock();
      }
    });
  } catch {
    /* permission / unsupported / low power — silent */
    sentinel = null;
  }
}

function onVisibility() {
  if (document.visibilityState === "visible" && wantLock) {
    requestLock();
  }
}

/**
 * @param {boolean} enable
 */
export function setWorkoutWakeLock(enable) {
  wantLock = !!enable;
  if (!enable) {
    try {
      sentinel?.release?.();
    } catch {
      /* ignore */
    }
    sentinel = null;
    document.removeEventListener("visibilitychange", onVisibility);
    return;
  }
  document.addEventListener("visibilitychange", onVisibility);
  requestLock();
}

export function isWakeLockSupported() {
  return typeof navigator !== "undefined" && !!navigator.wakeLock?.request;
}
