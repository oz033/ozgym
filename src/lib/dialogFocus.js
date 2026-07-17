/**
 * Focus trap + restore for modal dialogs (a11y / UI Skills).
 * Minimal — no Radix. Use with data-state open/closing hosts.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) =>
      el.offsetParent !== null ||
      el === document.activeElement ||
      getComputedStyle(el).position === "fixed",
  );
}

/**
 * @param {HTMLElement | null} root panel that contains focusables
 * @param {{ onEscape?: () => void, initialFocus?: HTMLElement | null }} opts
 * @returns {() => void} cleanup (also restores focus to document.activeElement at attach time)
 */
export function trapFocus(root, opts = {}) {
  if (!root || typeof document === "undefined") return () => {};
  const previous = document.activeElement;
  const { onEscape, initialFocus } = opts;

  const focusFirst = () => {
    const list = getFocusable(root);
    const target =
      initialFocus && list.includes(initialFocus) ? initialFocus : list[0];
    try {
      target?.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  };

  // After paint so nodes exist
  const raf = requestAnimationFrame(focusFirst);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onEscape?.();
      return;
    }
    if (e.key !== "Tab") return;
    const list = getFocusable(root);
    if (!list.length) {
      e.preventDefault();
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else if (active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  document.addEventListener("keydown", onKeyDown, true);

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKeyDown, true);
    try {
      if (previous && typeof previous.focus === "function") {
        previous.focus({ preventScroll: true });
      }
    } catch {
      /* ignore */
    }
  };
}

export function dialogCloseMs() {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--modal-close-dur")
      .trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 150;
    return raw.endsWith("s") && !raw.endsWith("ms") ? n * 1000 : n;
  } catch {
    return 150;
  }
}
