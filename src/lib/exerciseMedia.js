/**
 * Lookup against hasaneyldrm/exercises-dataset (slim local index + CDN media).
 * Media © Gym visual — attribution must stay visible.
 *
 * WICHTIG: Kein Fuzzy-Matching. Nur exakter Name oder kuratierter Alias.
 * Lieber kein GIF als das falsche.
 */
import index from "../data/exercisesIndex.json";

const MEDIA_BASE =
  index.mediaBase ||
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";
const ATTRIBUTION =
  index.attribution || "© Gym visual — https://gymvisual.com/";

const byId = new Map();
const byNormName = new Map();

for (const ex of index.exercises || []) {
  byId.set(ex.id, ex);
  byNormName.set(norm(ex.name), ex);
}

// Nur explizite, geprüfte Zuordnungen — keine „ähnlich genug“-Tricks.
// keys = norm(name)
const STRICT_ALIASES = {
  // index.aliases (Maschinen / Klassiker)
  ...(Object.fromEntries(
    Object.entries(index.aliases || {}).map(([k, v]) => [norm(k), v]),
  )),
  // Cardio / Warm-up: nur exakte Dataset-Namen
  "stationary bike walk": "0798",
  "walk elliptical cross trainer": "2141",
  "walking on incline treadmill": "3666",
  "walking on stepmill": "2311",
  "jump rope": "2612",
  "short stride run": "3656",
  run: "0685",
  "high knee against wall": "3636",
  "squat to overhead reach": "1685",
  "farmers walk": "2133",
};

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
 * Strict media lookup: alias → id, or exact normalized name only.
 * @returns {{ id, name, body_part, equipment, target, secondary, gifUrl, imageUrl, attribution } | null}
 */
export function findExerciseMedia(exerciseName) {
  if (!exerciseName) return null;
  const n = norm(exerciseName);
  if (!n) return null;

  const aliasId = STRICT_ALIASES[n];
  if (aliasId && byId.has(aliasId)) {
    return shape(byId.get(aliasId));
  }

  if (byNormName.has(n)) {
    return shape(byNormName.get(n));
  }

  // Kein Fuzzy — lieber nichts anzeigen
  return null;
}

/**
 * Nur wenn mediaName/name exakt im Dataset liegt (oder Alias).
 * Für Listen-Thumbs: false → kein Platzhalter-„Zaubern“.
 */
export function hasExactExerciseMedia(exerciseName) {
  return findExerciseMedia(exerciseName) != null;
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
