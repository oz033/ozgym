import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

// Eclipse-Mark: Vollkreis mit diagonal ausgeschnittenem Balken, deckungsgleich
// mit public/favicon.svg. Erzeugt normale + maskable Icons (Android Safe Zone).
function drawIcon(size, maskable) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c0d12";
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    const r = size * 0.24;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
    ctx.fill();
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * (maskable ? 0.3 : 0.36);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f2f3f7";
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  ctx.translate(cx, cy);
  ctx.rotate((-32 * Math.PI) / 180);
  const barW = size * 1.3;
  const barH = size * 0.13;
  ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
  ctx.restore();

  return canvas;
}

for (const size of [192, 512]) {
  const canvas = drawIcon(size, false);
  writeFileSync(`public/pwa-${size}x${size}.png`, canvas.toBuffer("image/png"));
  console.log(`✅ public/pwa-${size}x${size}.png`);
}
writeFileSync("public/pwa-512x512-maskable.png", drawIcon(512, true).toBuffer("image/png"));
console.log("✅ public/pwa-512x512-maskable.png");
