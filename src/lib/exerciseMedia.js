/**
 * Lookup against hasaneyldrm/exercises-dataset (slim local index + CDN media).
 * Media © Gym visual — attribution must stay visible.
 */
import index from "../data/exercisesIndex.json";

const MEDIA_BASE = index.mediaBase || "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";
const ATTRIBUTION = index.attribution || "© Gym visual — https://gymvisual.com/";

const byId = new Map();
const byNormName = new Map();

for (const ex of index.exercises || []) {
  byId.set(ex.id, ex);
  byNormName.set(norm(ex.name), ex);
}

// Preferred id aliases for our library names
const aliasIds = index.aliases || {};

export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mediaUrl(rel) {
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  return MEDIA_BASE + String(rel).replace(/^\//, "");
}

/**
 * Find best exercise record for a display name.
 * @returns {{ id, name, body_part, equipment, target, secondary, gifUrl, imageUrl, attribution } | null}
 */
export function findExerciseMedia(exerciseName) {
  if (!exerciseName) return null;
  const n = norm(exerciseName);

  // 1) curated alias → id
  const aliasId = aliasIds[n];
  if (aliasId && byId.has(aliasId)) {
    return shape(byId.get(aliasId));
  }

  // 2) exact name
  if (byNormName.has(n)) return shape(byNormName.get(n));

  // 3) fuzzy: token overlap, prefer non-band short matches
  const tokens = n.split(" ").filter(Boolean);
  if (!tokens.length) return null;

  let best = null;
  let bestScore = -1e9;
  for (const ex of index.exercises || []) {
    const en = norm(ex.name);
    const hit = tokens.filter((t) => en.includes(t)).length;
    if (hit < Math.ceil(tokens.length * 0.6)) continue;

    let s = hit * 3;
    if (tokens.length <= 3 && (en.startsWith("band ") || en.includes(" female"))) s -= 5;
    if (en === n) s += 20;
    s -= Math.abs(en.split(" ").length - tokens.length) * 0.25;
    if (s > bestScore) {
      bestScore = s;
      best = ex;
    }
  }
  return best ? shape(best) : null;
}

function shape(ex) {
  return {
    id: ex.id,
    name: ex.name,
    body_part: ex.body_part,
    equipment: ex.equipment,
    target: ex.target,
    secondary: ex.secondary || [],
    gifUrl: mediaUrl(ex.gif),
    imageUrl: mediaUrl(ex.image),
    attribution: ATTRIBUTION,
    source: index.source,
  };
}

export function mediaAttribution() {
  return ATTRIBUTION;
}
