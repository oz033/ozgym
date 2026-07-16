/**
 * iOS / PWA icon pipeline from public/logo-source-oz.png
 *
 * Apple HIG: full-bleed square artwork. iOS applies the continuous corner
 * mask itself — NEVER bake rounded corners, outer chrome, or gray margins
 * into the source.
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

// White tile — black brush O+Z on pure white (iOS full-bleed)
const CREAM = { r: 255, g: 255, b: 255, alpha: 1 };

async function squareFullBleed(name, size) {
  // Cover + center crop to exact square (strips accidental letterboxing)
  const buf = await sharp(SRC)
    .resize(size, size, { fit: "cover", position: "centre" })
    .flatten({ background: CREAM }) // no alpha / no transparent corners
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(outDir, name), buf);
  console.log(`✅ ${name} (${size}x${size} full-bleed)`);
}

/** Android adaptive / maskable: mark in center ~80% on cream */
async function maskable(name, size) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: CREAM })
    .flatten({ background: CREAM })
    .png()
    .toBuffer();
  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: CREAM },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(outDir, name), buf);
  console.log(`✅ ${name} (${size}x${size} maskable safe-zone)`);
}

// In-app mark (header / splash) — same full-bleed master
await squareFullBleed("oz-mark.png", 512);

// iOS apple-touch (180) — square, full bleed; iOS rounds it
await squareFullBleed("apple-touch-icon.png", 180);

// PWA
await squareFullBleed("pwa-192x192.png", 192);
await squareFullBleed("pwa-512x512.png", 512);
await maskable("pwa-512x512-maskable.png", 512);

// Favicon
await squareFullBleed("favicon-32.png", 32);

const b64 = (
  await sharp(SRC)
    .resize(32, 32, { fit: "cover" })
    .flatten({ background: CREAM })
    .png()
    .toBuffer()
).toString("base64");
writeFileSync(
  join(outDir, "favicon.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ffffff"/>
  <image width="32" height="32" href="data:image/png;base64,${b64}"/>
</svg>
`,
);
console.log("✅ favicon.svg");
console.log("Done — iOS full-bleed icons (no baked squircle)");
