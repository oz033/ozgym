/**
 * Header mascot GIFs for Theme Studio.
 * Selecting a mascot can apply a matching accent palette.
 */

/** Built-in pack (files in /public) */
export const MASCOT_CATALOG = [
  {
    id: "none",
    label: "Aus",
    src: null,
    accent: null,
    accent2: null,
  },
  {
    id: "camille",
    label: "Camille",
    src: "/header-fighter.gif",
    // Purple / neon fighting game vibe
    accent: "#c084fc",
    accent2: "#7c3aed",
  },
];

export function getMascot(id) {
  return MASCOT_CATALOG.find((m) => m.id === id) || MASCOT_CATALOG[0];
}

export function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length < 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function onAccentFor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#0c0d12";
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62 ? "#0c0d12" : "#ffffff";
}

/**
 * Sample dominant vibrant color from an image/gif first frame (canvas).
 * @param {string} src data-url or absolute/relative url
 * @returns {Promise<{ accent: string, accent2: string } | null>}
 */
export function sampleAccentFromImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.decoding = "async";
    // same-origin public assets only
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        // Bucket saturated colors (skip near-black / near-white / gray)
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 40) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (sat < 0.22 || lum < 0.12 || lum > 0.92) continue;
          const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
          const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, sat: 0 };
          prev.n += 1;
          prev.r += r;
          prev.g += g;
          prev.b += b;
          prev.sat += sat;
          buckets.set(key, prev);
        }
        let best = null;
        for (const v of buckets.values()) {
          const score = v.n * (1 + v.sat / v.n);
          if (!best || score > best.score) {
            best = {
              score,
              r: v.r / v.n,
              g: v.g / v.n,
              b: v.b / v.n,
            };
          }
        }
        if (!best) {
          resolve(null);
          return;
        }
        const accent = rgbToHex(best.r, best.g, best.b);
        // darker companion
        const accent2 = rgbToHex(best.r * 0.55, best.g * 0.55, best.b * 0.7);
        resolve({ accent, accent2 });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Resolve header GIF src from themeCfg.
 * @param {{ mascot?: string, mascotSrc?: string | null }} cfg
 */
export function resolveMascotSrc(cfg = {}) {
  if (cfg.mascot === "custom" && cfg.mascotSrc) return cfg.mascotSrc;
  const m = getMascot(cfg.mascot || "none");
  return m.src || null;
}
