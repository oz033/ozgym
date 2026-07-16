/**
 * iOS / PWA icon pipeline from public/logo-source-oz.png
 *
 * - Larger O+Z (content ~90% of tile — less empty margin)
 * - Soft “liquid glass” tile: frosted white gradient + specular + edge
 * - Full-bleed square; iOS applies the continuous corner mask itself
 *   (no baked squircle)
 */
import sharp from "sharp";
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, "..", "public");
const SRC = join(outDir, "logo-source-oz.png");
if (!existsSync(SRC)) {
  console.error("Missing public/logo-source-oz.png");
  process.exit(1);
}

/** Content fill of the mark inside the icon (0–1). Higher = bigger O+Z. */
const MARK_FILL = 0.9;
/** Extra padding around ink bbox before scale (fraction of bbox). */
const BBOX_PAD = 0.06;

/**
 * Crop logo ink tightly, return transparent PNG of the mark only.
 */
async function extractMarkPng() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // non-near-white = ink
      if (luma < 248) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const padX = Math.round((maxX - minX + 1) * BBOX_PAD);
  const padY = Math.round((maxY - minY + 1) * BBOX_PAD);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(w - 1, maxX + padX);
  maxY = Math.min(h - 1, maxY + padY);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  // Build RGBA: black ink with alpha from darkness (for clean composite)
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((minY + y) * w + (minX + x)) * c;
      const r = data[si],
        g = data[si + 1],
        b = data[si + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      // ink amount 0..1
      let ink = Math.max(0, Math.min(1, (255 - luma) / 255));
      if (ink < 0.04) ink = 0;
      const oi = (y * cw + x) * 4;
      out[oi] = 12; // near-black, slight soft
      out[oi + 1] = 12;
      out[oi + 2] = 14;
      out[oi + 3] = Math.round(ink * 255);
    }
  }

  return sharp(out, {
    raw: { width: cw, height: ch, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Frosted glass base: soft cool gradient + top specular + edge vignette.
 * Looks like iOS “liquid glass” tile under the mark (still opaque for PWA).
 */
async function glassBase(size) {
  // Vertical soft gradient (cool white)
  const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbfcfe"/>
      <stop offset="45%" stop-color="#f2f4f8"/>
      <stop offset="100%" stop-color="#e4e8ef"/>
    </linearGradient>
    <linearGradient id="spec" x1="0.15" y1="0" x2="0.85" y2="0.55">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vign" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.06"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <!-- top glass specular blob -->
  <ellipse cx="${size * 0.42}" cy="${size * 0.18}" rx="${size * 0.55}" ry="${size * 0.32}" fill="url(#spec)"/>
  <!-- soft rim light at top edge -->
  <rect width="100%" height="${Math.max(2, Math.round(size * 0.08))}" fill="url(#rim)"/>
  <!-- subtle edge depth -->
  <rect width="100%" height="100%" fill="url(#vign)"/>
</svg>`);

  return sharp(svg).png().toBuffer();
}

/**
 * Soft contact shadow under the mark for floating glass depth.
 */
async function contactShadow(size, markSize) {
  const rx = Math.round(markSize * 0.42);
  const ry = Math.round(markSize * 0.12);
  const cy = Math.round(size * 0.62);
  const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <filter id="b" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.max(2, size * 0.018)}"/>
    </filter>
  </defs>
  <ellipse cx="${size / 2}" cy="${cy}" rx="${rx}" ry="${ry}"
    fill="#000000" fill-opacity="0.14" filter="url(#b)"/>
</svg>`);
  return sharp(svg).png().toBuffer();
}

async function composeIcon(size, { forMaskable = false } = {}) {
  const fill = forMaskable ? Math.min(MARK_FILL, 0.78) : MARK_FILL;
  const markSize = Math.round(size * fill);
  const markRaw = await extractMarkPng();
  const mark = await sharp(markRaw)
    .resize(markSize, markSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const base = await glassBase(size);
  const shadow = await contactShadow(size, markSize);

  const buf = await sharp(base)
    .composite([
      { input: shadow, gravity: "centre" },
      { input: mark, gravity: "centre" },
    ])
    .flatten({ background: { r: 242, g: 244, b: 248 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return buf;
}

async function write(name, size, opts) {
  const buf = await composeIcon(size, opts);
  writeFileSync(join(outDir, name), buf);
  console.log(
    `✅ ${name} (${size}x${size}${opts?.forMaskable ? " maskable" : ""} · mark ${(MARK_FILL * 100) | 0}%)`,
  );
}

// In-app mark (header / splash)
await write("oz-mark.png", 512);

// iOS apple-touch
await write("apple-touch-icon.png", 180);

// PWA
await write("pwa-192x192.png", 192);
await write("pwa-512x512.png", 512);
await write("pwa-512x512-maskable.png", 512, { forMaskable: true });

// Favicon
await write("favicon-32.png", 32);

const fav = await composeIcon(32);
const b64 = fav.toString("base64");
writeFileSync(
  join(outDir, "favicon.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#f2f4f8"/>
  <image width="32" height="32" href="data:image/png;base64,${b64}"/>
</svg>
`,
);
console.log("✅ favicon.svg");
console.log("Done — larger O+Z + glass tile (no baked squircle)");
