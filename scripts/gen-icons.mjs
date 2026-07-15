/**
 * OZGYM PWA icons — Classic O+Z glass (matches favicon.svg / brand.jsx).
 * Generates: apple-touch-icon.png (180), pwa-192, pwa-512, pwa-512-maskable.
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, "..", "public");
mkdirSync(outDir, { recursive: true });

/** Full-bleed app icon SVG (0–64 viewBox, no inner padding — iOS applies its own mask). */
function iconSvg(size, { maskable = false } = {}) {
  // Safe zone for maskable: keep mark in center ~80%
  const pad = maskable ? 8 : 0;
  const vb = 64;
  const inner = vb - pad * 2;
  // Scale mark into inner square
  const scale = inner / 56; // mark content roughly in 4..60 of original
  const ox = pad + (inner - 56 * scale) / 2 - 4 * scale;
  const oy = ox;

  // Solid dark fill to edge (iOS rounds corners itself for apple-touch)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${vb} ${vb}" fill="none">
  <defs>
    <linearGradient id="body" x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#5B8CFF" stop-opacity="0.55"/>
      <stop offset="42%" stop-color="#1A1D28" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#0C0E14" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="shine" x1="32" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="32" cy="28" r="22" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2E7BFF" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#2E7BFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rim" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <!-- Full square background (required for apple-touch / home screen) -->
  <rect width="${vb}" height="${vb}" fill="#0C0E14"/>
  <rect x="0" y="0" width="${vb}" height="${vb}" fill="url(#body)"/>
  <rect x="0.5" y="0.5" width="${vb - 1}" height="${vb - 1}" rx="0" stroke="url(#rim)" stroke-width="1" fill="none"/>
  <circle cx="32" cy="30" r="22" fill="url(#glow)"/>
  <rect x="0" y="0" width="${vb}" height="32" fill="url(#shine)"/>
  <path d="M8 8 C16 5 48 5 56 8" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.28" stroke-linecap="round"/>
  <!-- O -->
  <circle cx="32" cy="32" r="15.5" stroke="#FFFFFF" stroke-width="5.8" stroke-opacity="0.96" fill="none"/>
  <circle cx="32" cy="32" r="11.6" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.14" fill="none"/>
  <!-- Z on top -->
  <path d="M24 24 H40 L24 40 H40" stroke="#2E7BFF" stroke-width="5.2" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>
</svg>`;
}

async function writePng(name, size, opts = {}) {
  const svg = Buffer.from(iconSvg(size, opts));
  const buf = await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log(`✅ ${name} (${size}x${size}, ${buf.length} bytes)`);
}

await writePng("apple-touch-icon.png", 180);
await writePng("pwa-192x192.png", 192);
await writePng("pwa-512x512.png", 512);
await writePng("pwa-512x512-maskable.png", 512, { maskable: true });

// Also refresh favicon as PNG fallback for older Safari
await writePng("favicon-32.png", 32);

console.log("Done — O+Z glass icons written to public/");
