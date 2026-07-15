/**
 * Generatoren für einfache, flache Muskel-Flächen (keine anatomischen
 * Details) aus einer Bounding-Box. bodyData.ts beschreibt jede Muskelregion
 * nur als Zahlen (x,y,w,h + Form) — die eigentlichen SVG-Pfade entstehen
 * hier, damit ~90 Regionen über 4 Diagramme konsistent aussehen statt
 * einzeln von Hand gezeichnet zu sein.
 */

/** Abgerundetes Rechteck/Kapsel — Standard für Gliedmaßen (Arme, Beine). */
export function capsule(x: number, y: number, w: number, h: number, roundness = 0.42): string {
  const rx = w * roundness;
  const ry = Math.min(h * 0.16, rx);
  return [
    `M ${x + rx} ${y}`,
    `H ${x + w - rx}`,
    `Q ${x + w} ${y} ${x + w} ${y + ry}`,
    `V ${y + h - ry}`,
    `Q ${x + w} ${y + h} ${x + w - rx} ${y + h}`,
    `H ${x + rx}`,
    `Q ${x} ${y + h} ${x} ${y + h - ry}`,
    `V ${y + ry}`,
    `Q ${x} ${y} ${x + rx} ${y}`,
    "Z",
  ].join(" ");
}

/** Weiche Ellipse — für rundliche Flächen (Brust, Gesäß, Schulterkappen). */
export function blob(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry} ${cx + rx} ${cy - ry} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry} ${cx - rx} ${cy + ry} ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

/** Kite/Diamant — für Trapez (schmal an Hals & Taille, breit an den Schultern). */
export function diamond(cx: number, topY: number, midW: number, midY: number, bottomY: number): string {
  return [
    `M ${cx} ${topY}`,
    `L ${cx + midW / 2} ${midY}`,
    `L ${cx} ${bottomY}`,
    `L ${cx - midW / 2} ${midY}`,
    "Z",
  ].join(" ");
}

/**
 * Tropfenform mit einseitiger Wölbung — für Lats/Obliques (schmal oben,
 * bauchig zur Seite). `dir` bestimmt, ob die Wölbung nach rechts (1, für die
 * linke Körperseite) oder links (-1, rechte Körperseite) zeigt.
 */
export function sideStrip(x: number, y: number, w: number, h: number, dir: 1 | -1, bulge: "top" | "bottom" | "mid" = "mid"): string {
  const bulgeY = bulge === "top" ? y + h * 0.28 : bulge === "bottom" ? y + h * 0.72 : y + h * 0.5;
  const outX = x + w * dir;
  return [
    `M ${x} ${y}`,
    `Q ${outX} ${bulgeY} ${x} ${y + h}`,
    `Q ${x - w * 0.15 * dir} ${bulgeY} ${x} ${y}`,
    "Z",
  ].join(" ");
}
