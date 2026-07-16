/* Warm-up-, Cool-down- & Cardio-Bibliothek.
 *
 * Kontextabhängig: Zonen aus dem Trainingsplan steuern die Smart-Filter.
 * mediaName = Name im Übungs-Dataset (englisch) für GIF-Lookup via
 * findExerciseMedia; name = deutsche Anzeige.
 */

import { ZONE_LABEL } from "./constants.js";
import { uid } from "./utils.js";

/** Art der Prep-Übung (manuelle Filter im Picker) */
export const PREP_KINDS = [
  { id: "warmup", label: "Warm-up" },
  { id: "mobility", label: "Mobilität" },
  { id: "dynamic_stretch", label: "Dynamisches Stretching" },
  { id: "static_stretch", label: "Statisches Stretching" },
  { id: "cardio", label: "Cardio" },
];

export const PREP_KIND_LABEL = Object.fromEntries(
  PREP_KINDS.map((k) => [k.id, k.label]),
);

export const CARDIO_INTENSITIES = [
  { id: "leicht", label: "Leicht" },
  { id: "moderat", label: "Moderat" },
  { id: "intensiv", label: "Intensiv" },
];

export const PREP_EQUIPMENT = [
  { id: "Körpergewicht", label: "Eigengewicht" },
  { id: "Maschine", label: "Gerät / Cardio" },
];

/** Alle Zonen, die die App kennt */
export const ALL_ZONES = ["chest", "shoulders", "back", "arms", "legs", "abs"];

/**
 * Fokus aus Plan-Namen ableiten (Push/Pull/Legs/Oberkörper/Ganzkörper).
 * Ergänzt die Zonen aus den tatsächlichen Plan-Übungen.
 */
const NAME_FOCUS = [
  {
    re: /\b(push|brust|chest|drücken)\b/i,
    zones: ["chest", "shoulders", "arms"],
  },
  {
    re: /\b(pull|rücken|back|ziehen|lat)\b/i,
    zones: ["back", "arms", "shoulders"],
  },
  {
    re: /\b(leg|bein|unterkörper|uk|glute|po)\b/i,
    zones: ["legs"],
  },
  {
    re: /\b(oberkörper|ok|upper)\b/i,
    zones: ["chest", "shoulders", "back", "arms"],
  },
  {
    re: /\b(ganz|full|gk|fullbody|full.?body)\b/i,
    zones: ALL_ZONES,
  },
];

/** Prep-Katalog: warm-up / mobility / stretch / cardio */
const PREP_CATALOG = [
  /* ── Generisches Warm-up ── */
  {
    id: "wu-squat-reach",
    name: "Squat to Overhead Reach",
    mediaName: "squat to overhead reach",
    kind: "warmup",
    zones: [],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Ganzer Körper wach: tief in die Hocke, Arme gestreckt nach oben.",
  },
  {
    id: "wu-high-knees",
    name: "High Knees an der Wand",
    mediaName: "high knee against wall",
    kind: "warmup",
    zones: [],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Puls hoch: Knie zügig abwechselnd Richtung Brust.",
  },
  {
    id: "wu-arm-circles",
    name: "Armkreisen",
    mediaName: "arm circles",
    kind: "warmup",
    zones: ["shoulders", "chest", "arms"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Große Kreise vorwärts und rückwärts — Schultergelenk schmieren.",
  },
  {
    id: "wu-jumping-jacks",
    name: "Hampelmänner",
    // Kein treffendes Dataset-GIF → kein Bild
    mediaName: null,
    kind: "warmup",
    zones: [],
    equipment: "Körpergewicht",
    seconds: 40,
    note: "Leichte Cardio-Aktivierung vor dem Kraftblock.",
  },
  {
    id: "wu-bodyweight-squat",
    name: "Bodyweight Squats",
    mediaName: "bodyweight squat",
    kind: "warmup",
    zones: ["legs"],
    equipment: "Körpergewicht",
    reps: 12,
    note: "Hüfte, Knie und Sprunggelenke vor Beinübungen aktivieren.",
  },

  /* ── Push / Brust / Schulter ── */
  {
    id: "wu-chest-dyn",
    name: "Dynamischer Brust-Stretch",
    mediaName: "dynamic chest stretch (male)",
    kind: "dynamic_stretch",
    zones: ["chest", "shoulders"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Arme schwungvoll öffnen und schließen — Brust öffnet sich.",
  },
  {
    id: "wu-shoulder-open",
    name: "Schulter-Öffner",
    mediaName: "dynamic chest stretch (male)",
    kind: "mobility",
    zones: ["shoulders", "chest"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Arme auf Schulterhöhe schwingen, Schulterblätter aktiv.",
  },
  {
    id: "wu-scap-push",
    name: "Scapular Push-up",
    mediaName: "scapular push-up",
    kind: "mobility",
    zones: ["chest", "shoulders", "back"],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Arme gestreckt, nur Schulterblätter bewegen — Stabilität vor Druck.",
  },
  {
    id: "wu-wrist",
    name: "Handgelenk-Kreisen",
    mediaName: "wrist circles",
    kind: "mobility",
    zones: ["arms"],
    equipment: "Körpergewicht",
    seconds: 25,
    note: "Handgelenke mobilisieren — wichtig vor Druck- und Curl-Übungen.",
  },
  {
    id: "wu-band-pull",
    name: "Band Pull-Apart (imaginiert)",
    mediaName: "rear delt fly",
    kind: "warmup",
    zones: ["shoulders", "back"],
    equipment: "Körpergewicht",
    reps: 12,
    note: "Hintere Schulter aktivieren — Balance zu Push-Tagen.",
  },

  /* ── Pull / Rücken ── */
  {
    id: "wu-squat-row",
    name: "Bodyweight Squat Row",
    mediaName: "bodyweight squatting row",
    kind: "warmup",
    zones: ["back", "legs"],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Rücken-Aktivierung: aus der Hocke ziehen, Schulterblätter zusammen.",
  },
  {
    id: "wu-lat-side",
    name: "Seitneigung im Stand",
    mediaName: "standing lateral stretch",
    kind: "dynamic_stretch",
    zones: ["back", "abs"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Langsam zur Seite neigen, Lat länger werden lassen.",
  },
  {
    id: "wu-cat-cow",
    name: "Cat-Cow",
    mediaName: "cat cow",
    kind: "mobility",
    zones: ["back", "abs"],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Wirbelsäule mobilisieren — Rund und Hohl im Wechsel.",
  },
  {
    id: "wu-thoracic",
    name: "Brustwirbelsäulen-Rotation",
    mediaName: "spine stretch",
    kind: "mobility",
    zones: ["back", "shoulders"],
    equipment: "Körpergewicht",
    reps: 8,
    note: "Aus dem Vierfüßler den Arm zur Decke öffnen.",
  },

  /* ── Beine / Hüfte / Sprunggelenk ── */
  {
    id: "wu-glute-march",
    name: "Glute Bridge March",
    mediaName: "glute bridge march",
    kind: "warmup",
    zones: ["legs"],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Po anspannen, Becken oben halten, Knie abwechselnd heben.",
  },
  {
    id: "wu-knee-hug",
    name: "Knie zur Brust",
    mediaName: "hug keens to chest",
    kind: "dynamic_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    reps: 8,
    note: "Im Wechsel ein Knie zur Brust ziehen, kurz halten.",
  },
  {
    id: "wu-ankle",
    name: "Fußgelenk-Kreisen",
    mediaName: "ankle circles",
    kind: "mobility",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 25,
    note: "Sprunggelenke lockern — stabiler Stand bei Beinübungen.",
  },
  {
    id: "wu-leg-swing",
    name: "Beinschwingen",
    mediaName: "standing hip extension",
    kind: "dynamic_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    reps: 10,
    note: "Hüfte öffnen: Bein kontrolliert vor und zurück schwingen.",
  },
  {
    id: "wu-worlds-greatest",
    name: "World's Greatest Stretch",
    mediaName: "worlds greatest stretch",
    kind: "mobility",
    zones: ["legs", "back", "abs"],
    equipment: "Körpergewicht",
    reps: 6,
    note: "Ausfallschritt, Ellbogen Richtung Boden, Rotation — Hüfte & T-Spine.",
  },
  {
    id: "wu-hip-circles",
    name: "Hüftkreisen",
    mediaName: "hip circles",
    kind: "mobility",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Große Kreise mit der Hüfte — vor Squats und Lunges.",
  },

  /* ── Core ── */
  {
    id: "wu-crab-twist",
    name: "Crab Twist Toe Touch",
    mediaName: "crab twist toe touch",
    kind: "warmup",
    zones: ["abs"],
    equipment: "Körpergewicht",
    reps: 8,
    note: "Rotation aus der Körpermitte, Gegenhand zum Fuß.",
  },
  {
    id: "wu-dead-bug",
    name: "Dead Bug (langsam)",
    mediaName: "dead bug",
    kind: "warmup",
    zones: ["abs"],
    equipment: "Körpergewicht",
    reps: 8,
    note: "Rumpf stabil, Arm/Bein diagonal strecken.",
  },

  /* ── Cool-down: statisch ── */
  {
    id: "cd-chest-behind",
    name: "Brust-Stretch hinter dem Kopf",
    mediaName: "behind head chest stretch",
    kind: "static_stretch",
    zones: ["chest"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Hände hinterm Kopf, Ellenbogen sanft nach hinten öffnen.",
  },
  {
    id: "cd-chest-front",
    name: "Brust & vordere Schulter",
    mediaName: "chest and front of shoulder stretch",
    kind: "static_stretch",
    zones: ["chest", "shoulders"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Arm strecken, Brust wegdrehen — Zug über die ganze Vorderseite.",
  },
  {
    id: "cd-rear-delt",
    name: "Hintere Schulter dehnen",
    mediaName: "rear deltoid stretch",
    kind: "static_stretch",
    zones: ["shoulders", "back"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Arm quer vor die Brust ziehen, Schulter unten lassen.",
  },
  {
    id: "cd-lat",
    name: "Kniender Lat-Stretch",
    mediaName: "kneeling lat stretch",
    kind: "static_stretch",
    zones: ["back"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Arme weit nach vorn, Brust Richtung Boden sinken lassen.",
  },
  {
    id: "cd-lower-back",
    name: "Unterer Rücken im Sitzen",
    mediaName: "seated lower back stretch",
    kind: "static_stretch",
    zones: ["back"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Rund werden, Bauch Richtung Oberschenkel sinken lassen.",
  },
  {
    id: "cd-triceps",
    name: "Trizeps über Kopf",
    mediaName: "overhead triceps stretch",
    kind: "static_stretch",
    zones: ["arms"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Ellenbogen hinter den Kopf, mit der Gegenhand sanft nachdrücken.",
  },
  {
    id: "cd-biceps",
    name: "Bizeps an der Wand",
    mediaName: "biceps stretch",
    kind: "static_stretch",
    zones: ["arms"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Arm gestreckt an der Wand, Körper leicht drehen.",
  },
  {
    id: "cd-hamstring",
    name: "Beinrückseite dehnen",
    mediaName: "hamstring stretch",
    kind: "static_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Bein gestreckt, Oberkörper lang nach vorn — kein runder Rücken.",
  },
  {
    id: "cd-quad",
    name: "Quadrizeps im Vierfüßler",
    mediaName: "all fours squad stretch",
    kind: "static_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Fuß zum Po ziehen, Hüfte bleibt gestreckt.",
  },
  {
    id: "cd-calf",
    name: "Waden an der Wand",
    mediaName: "calf stretch with hands against wall",
    kind: "static_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 30,
    note: "Hinteres Bein gestreckt, Ferse bleibt am Boden.",
  },
  {
    id: "cd-butterfly",
    name: "Schmetterling",
    mediaName: "butterfly yoga pose",
    kind: "static_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 40,
    note: "Fußsohlen zusammen, Knie sanft Richtung Boden sinken lassen.",
  },
  {
    id: "cd-hip-flexor",
    name: "Hüftbeuger-Dehnung",
    mediaName: "kneeling hip flexor stretch",
    kind: "static_stretch",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Ausfallschritt kniend, Becken nach vorn schieben.",
  },
  {
    id: "cd-sphinx",
    name: "Sphinx",
    mediaName: "sphinx",
    kind: "static_stretch",
    zones: ["abs"],
    equipment: "Körpergewicht",
    seconds: 35,
    note: "Auf die Unterarme stützen, Bauch lang machen, ruhig atmen.",
  },
  {
    id: "cd-child",
    name: "Kindhaltung",
    mediaName: "child pose",
    kind: "static_stretch",
    zones: ["back", "abs"],
    equipment: "Körpergewicht",
    seconds: 40,
    note: "Entspannen, Arme lang, Atmung tief.",
  },

  /* ── Cardio: mediaName nur wenn exakt im Dataset (kein Fuzzy) ── */
  {
    id: "cardio-treadmill",
    name: "Laufband",
    mediaName: "walking on incline treadmill",
    kind: "cardio",
    zones: [],
    equipment: "Maschine",
    seconds: 300,
    intensity: "moderat",
    note: "Vor dem Kraftblock: Gehen oder leichtes Joggen.",
  },
  {
    id: "cardio-bike",
    name: "Fahrrad / Ergometer",
    mediaName: "stationary bike walk",
    kind: "cardio",
    zones: [],
    equipment: "Maschine",
    seconds: 300,
    intensity: "moderat",
    note: "Gleichmäßiges Treten, Knie weich.",
  },
  {
    id: "cardio-elliptical",
    name: "Crosstrainer",
    mediaName: "walk elliptical cross trainer",
    kind: "cardio",
    zones: [],
    equipment: "Maschine",
    seconds: 300,
    intensity: "moderat",
    note: "Gelenkschonend Puls hochbringen.",
  },
  {
    id: "cardio-rower",
    name: "Rudergerät",
    // Kein echtes Ruder-GIF im Dataset → kein Bild
    mediaName: null,
    kind: "cardio",
    zones: ["back", "legs", "arms"],
    equipment: "Maschine",
    seconds: 240,
    intensity: "moderat",
    note: "Beine → Rumpf → Arme. Technik vor Tempo.",
  },
  {
    id: "cardio-stair",
    name: "Treppensteiger",
    mediaName: "walking on stepmill",
    kind: "cardio",
    zones: ["legs"],
    equipment: "Maschine",
    seconds: 240,
    intensity: "moderat",
    note: "Aufrechte Haltung, Geländer nur zur Sicherheit.",
  },
  {
    id: "cardio-jump-rope",
    name: "Seilspringen",
    mediaName: "jump rope",
    kind: "cardio",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 120,
    intensity: "intensiv",
    note: "Auf dem Vorfuß landen, lockere Schultern.",
  },
  {
    id: "cardio-walk",
    name: "Gehen",
    // Kein reines Gehen-ohne-Geräte im Dataset → kein Bild (kein Farmers Walk)
    mediaName: null,
    kind: "cardio",
    zones: [],
    equipment: "Körpergewicht",
    seconds: 300,
    intensity: "leicht",
    note: "Schnelles Gehen als sanfter Einstieg.",
  },
  {
    id: "cardio-jog",
    name: "Joggen",
    mediaName: "short stride run",
    kind: "cardio",
    zones: ["legs"],
    equipment: "Körpergewicht",
    seconds: 300,
    intensity: "moderat",
    note: "Lockerer Dauerlauf-Tempo vor dem Workout.",
  },
];

export function getPrepCatalog() {
  return PREP_CATALOG;
}

/**
 * Immer ganz oben im Warm-up-Picker — Cardio-Aufwärmen (nur mit
 * sauberem Dataset-GIF bzw. ohne Bild).
 * Reihenfolge = Anzeige-Reihenfolge.
 */
export const ALWAYS_TOP_WARMUP_IDS = [
  "cardio-elliptical", // Crosstrainer
  "cardio-bike", // Fahrrad
  "cardio-walk", // Gehen
  "cardio-treadmill", // Laufband
  "cardio-rower", // Rudergerät
  "cardio-jog", // Joggen
  "cardio-jump-rope", // Seilspringen
  "cardio-stair", // Treppensteiger
  "wu-jumping-jacks", // Hampelmänner (ohne GIF)
];

export function getAlwaysTopWarmupItems(excludeIds = []) {
  const exclude = new Set(excludeIds);
  const byId = Object.fromEntries(PREP_CATALOG.map((e) => [e.id, e]));
  return ALWAYS_TOP_WARMUP_IDS.map((id) => byId[id]).filter(
    (e) => e && !exclude.has(e.id),
  );
}

/** Zonen aus der heutigen Queue ableiten (zone + zone2 der Übungen) */
export function zonesFromQueue(queue) {
  const zones = new Set();
  (queue || []).forEach((it) => {
    if (it?.entry?.zone) zones.add(it.entry.zone);
    if (it?.entry?.zone2) zones.add(it.entry.zone2);
  });
  return zones;
}

/** Zonen aus Plan-Übungen + Name-Heuristik (Push/Pull/Legs/…) */
export function zonesFromPlan(plan, libraryById = {}) {
  const zones = new Set();
  (plan?.exercises || []).forEach((item) => {
    const entry = libraryById[item.exerciseId];
    if (entry?.zone) zones.add(entry.zone);
    if (entry?.zone2) zones.add(entry.zone2);
    // muscle → zone mapping fallback
    if (entry?.muscle && !entry.zone) {
      const m = entry.muscle;
      if (m === "biceps" || m === "triceps") zones.add("arms");
      else if (m === "glutes") zones.add("legs");
      else if (m === "core") zones.add("abs");
      else if (ALL_ZONES.includes(m)) zones.add(m);
    }
  });
  const name = String(plan?.name || "");
  for (const rule of NAME_FOCUS) {
    if (rule.re.test(name)) {
      rule.zones.forEach((z) => zones.add(z));
    }
  }
  return zones;
}

export function focusLabelForZones(zones) {
  const z = zones instanceof Set ? zones : new Set(zones || []);
  if (!z.size) return "Allgemein";
  if (z.size >= 5) return "Ganzkörper";
  const has = (x) => z.has(x);
  const onlyUpper =
    [...z].every((x) => ["chest", "shoulders", "back", "arms", "abs"].includes(x)) &&
    !has("legs");
  const onlyLegs = [...z].every((x) => x === "legs" || x === "abs") && has("legs");
  if (onlyLegs) return "Beine / Hüfte";
  if (has("chest") && has("shoulders") && !has("back")) return "Push";
  if (has("back") && !has("chest")) return "Pull";
  if (onlyUpper) return "Oberkörper";
  return [...z].map((x) => ZONE_LABEL[x] || x).join(" · ");
}

const MODE_DEFAULT_KINDS = {
  warmup: ["warmup", "mobility", "dynamic_stretch"],
  cooldown: ["static_stretch", "mobility"],
  cardio: ["cardio"],
};

/**
 * Intelligente Filterung des Prep-Katalogs.
 * @param {object} opts
 * @param {'warmup'|'cooldown'|'cardio'} opts.mode
 * @param {Set|string[]} [opts.planZones] — Muskelzonen des Trainingsplans
 * @param {string} [opts.kind] — manueller Art-Filter
 * @param {string} [opts.zone] — manuelle Muskelzone
 * @param {string} [opts.equipment] — Eigengewicht / Maschine
 * @param {string} [opts.query]
 * @param {boolean} [opts.smart=true] — nur passende Zonen (generisch immer dabei)
 * @param {string[]} [opts.excludeIds]
 */
export function filterPrepCatalog(opts = {}) {
  const {
    mode = "warmup",
    planZones,
    kind = "",
    zone = "",
    equipment = "",
    query = "",
    smart = true,
    excludeIds = [],
  } = opts;

  const zoneSet = planZones instanceof Set ? planZones : new Set(planZones || []);
  const q = String(query || "").trim().toLowerCase();
  const exclude = new Set(excludeIds);
  const allowedKinds = kind ? [kind] : MODE_DEFAULT_KINDS[mode] || MODE_DEFAULT_KINDS.warmup;

  return PREP_CATALOG.filter((item) => {
    if (exclude.has(item.id)) return false;
    if (!allowedKinds.includes(item.kind)) return false;
    if (equipment && item.equipment !== equipment) return false;
    if (zone) {
      // manuelle Zone: generische (leere zones) + passende
      if (item.zones.length && !item.zones.includes(zone)) return false;
    } else if (smart && zoneSet.size > 0 && mode !== "cardio") {
      // Smart: generisch (zones=[]) immer, sonst Schnittmenge mit Plan
      if (item.zones.length > 0 && !item.zones.some((z) => zoneSet.has(z))) {
        return false;
      }
    }
    if (q) {
      const blob = [
        item.name,
        item.note,
        PREP_KIND_LABEL[item.kind],
        item.equipment,
        ...(item.zones || []).map((z) => ZONE_LABEL[z] || z),
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    // Spezifische (mit Zone-Match) vor generischen
    const aSpec = a.zones.length ? 0 : 1;
    const bSpec = b.zones.length ? 0 : 1;
    return aSpec - bSpec || a.name.localeCompare(b.name, "de");
  });
}

/** Plan-Item aus Katalog-Eintrag (persistierbar) */
export function prepItemFromCatalog(entry, overrides = {}) {
  return {
    id: entry.id,
    catalogId: entry.id,
    name: entry.name,
    mediaName: entry.mediaName || entry.name || null,
    kind: entry.kind || "warmup",
    zones: [...(entry.zones || [])],
    equipment: entry.equipment || "Körpergewicht",
    seconds: overrides.seconds ?? entry.seconds ?? null,
    reps: overrides.reps ?? entry.reps ?? null,
    note: overrides.note ?? entry.note ?? "",
    distanceKm: overrides.distanceKm ?? null,
    intensity: overrides.intensity ?? entry.intensity ?? null,
    // Optional: direkte CDN-URLs (Bibliothek / Dataset)
    gif: entry.gif || null,
    image: entry.image || null,
  };
}

/** Bibliotheks-Übung → Prep-Eintrag (für Suche mit GIF) */
export function prepItemFromLibrary(libEntry, kind = "warmup") {
  const zone = libEntry.zone || null;
  return prepItemFromCatalog(
    {
      id: libEntry.id,
      name: libEntry.name,
      mediaName: libEntry.name,
      kind,
      zones: zone ? [zone] : [],
      equipment: libEntry.equipment || "",
      seconds: kind === "cardio" ? 300 : 30,
      reps: null,
      gif: libEntry.gif || null,
      image: libEntry.image || null,
    },
  );
}

/** Eigene Übung (nicht im Katalog) — manuell vom Nutzer angelegt */
export function prepItemFromCustom({
  name,
  kind = "warmup",
  zone = null,
  seconds = null,
  reps = null,
  note = "",
  equipment = "Körpergewicht",
  intensity = null,
  distanceKm = null,
}) {
  const id = "custom-prep-" + uid();
  const zones = zone ? [zone] : [];
  return {
    id,
    catalogId: id,
    name: String(name || "").trim(),
    mediaName: null,
    kind,
    zones,
    equipment,
    seconds: seconds != null && seconds !== "" ? Number(seconds) : null,
    reps: reps != null && reps !== "" ? Number(reps) : null,
    note: note || "",
    distanceKm: distanceKm != null && distanceKm !== "" ? Number(distanceKm) : null,
    intensity: intensity || null,
    custom: true,
  };
}

function pickForZones(items, zones, perZone, cap) {
  const out = [];
  const seen = new Set();
  const zoneList = [...zones];
  for (const z of zoneList) {
    let n = 0;
    for (const item of items) {
      if (!item.zones.includes(z)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ ...prepItemFromCatalog(item), zone: z });
      n++;
      if (n >= perZone || out.length >= cap) break;
    }
    if (out.length >= cap) return out;
  }
  return out;
}

/** Auto Warm-up aus Queue-Zonen (ohne Plan-Override) */
export function buildWarmup(queue, cap = 5) {
  const zones = zonesFromQueue(queue);
  if (!zones.size) return [];
  const generic = PREP_CATALOG.filter(
    (i) =>
      (i.kind === "warmup" || i.kind === "mobility") &&
      i.zones.length === 0,
  ).slice(0, 2);
  const pool = PREP_CATALOG.filter((i) =>
    ["warmup", "mobility", "dynamic_stretch"].includes(i.kind),
  );
  const specific = pickForZones(pool, zones, 2, cap - generic.length);
  const genericItems = generic.map((g) => ({
    ...prepItemFromCatalog(g),
    zone: null,
  }));
  return [...genericItems, ...specific].slice(0, cap);
}

/** Auto Cool-down aus trainierten Zonen */
export function buildCooldown(zones, cap = 5) {
  const zoneSet = zones instanceof Set ? zones : new Set(zones || []);
  if (!zoneSet.size) return [];
  const pool = PREP_CATALOG.filter((i) => i.kind === "static_stretch");
  return pickForZones(pool, zoneSet, 2, cap);
}

/** Smart-Vorschlag für den Plan-Editor */
export function suggestWarmupForPlan(plan, libraryById, cap = 5) {
  const zones = zonesFromPlan(plan, libraryById);
  if (!zones.size) {
    // ohne Übungen: generisches Mini-Warm-up
    return PREP_CATALOG.filter(
      (i) => i.kind === "warmup" && i.zones.length === 0,
    )
      .slice(0, 2)
      .map((e) => prepItemFromCatalog(e));
  }
  // fake queue for reuse
  const fakeQueue = [...zones].map((z) => ({ entry: { zone: z } }));
  return buildWarmup(fakeQueue, cap);
}

export function suggestCooldownForPlan(plan, libraryById, cap = 5) {
  const zones = zonesFromPlan(plan, libraryById);
  return buildCooldown(zones, cap);
}

/* ── Wiederverwendbare Prep-Vorlagen (Warm-up / Cool-down) ── */

/** @param {'warmup'|'cooldown'} kind */
export function blankPrepTemplate(kind, name = "") {
  return {
    id: "prep-" + uid(),
    kind,
    name:
      name ||
      (kind === "cooldown" ? "Cool-down" : "Warm-up"),
    items: [],
  };
}

export function getPrepTemplate(templates, id) {
  if (!id) return null;
  return (templates || []).find((t) => t.id === id) || null;
}

export function templatesOfKind(templates, kind) {
  return (templates || []).filter((t) => t.kind === kind);
}

function normalizePrepItems(items) {
  return (items || []).map((item) => ({
    ...item,
    zone: item.zones?.[0] || item.zone || null,
  }));
}

/**
 * Workout-Auflösung über zugewiesene Vorlagen (plan.warmupTemplateId).
 * Legacy: plan.warmup[] / plan.cardio[] falls noch vorhanden.
 * Kein Auto-Warm-up ohne Zuweisung.
 */
export function resolveWarmupItems(plan, prepTemplates = []) {
  const t = getPrepTemplate(prepTemplates, plan?.warmupTemplateId);
  if (t?.items?.length) return normalizePrepItems(t.items);
  // Legacy inline
  const legacy = [
    ...(plan?.cardio || []),
    ...(plan?.warmup || []),
  ];
  if (legacy.length) return normalizePrepItems(legacy);
  return [];
}

/**
 * Cool-down nur wenn Vorlage zugewiesen (oder Legacy plan.cooldown[]).
 * Kein stilles Auto-Cool-down — Nutzer soll überspringen/starten wählen können.
 */
export function resolveCooldownItems(plan, prepTemplates = [], _trainedZones) {
  const t = getPrepTemplate(prepTemplates, plan?.cooldownTemplateId);
  if (t?.items?.length) return normalizePrepItems(t.items);
  if (plan?.cooldown?.length) return normalizePrepItems(plan.cooldown);
  return [];
}

/** @deprecated Cardio steckt in Warm-up-Vorlagen; leer für Backcompat */
export function resolveCardioItems(_plan) {
  return [];
}

/**
 * Inline-Plan-Arrays (warmup/cooldown/cardio) → globale Vorlagen + IDs.
 * Idempotent: vorhandene warmupTemplateId bleibt.
 */
export function migratePlansToPrepTemplates(plans, existingTemplates = []) {
  const templates = Array.isArray(existingTemplates)
    ? existingTemplates.map((t) => ({ ...t, items: [...(t.items || [])] }))
    : [];
  const nextPlans = (plans || []).map((plan) => {
    let warmupTemplateId = plan.warmupTemplateId || null;
    let cooldownTemplateId = plan.cooldownTemplateId || null;

    const legacyWarm = [
      ...(plan.cardio || []),
      ...(plan.warmup || []),
    ];
    if (!warmupTemplateId && legacyWarm.length) {
      const t = blankPrepTemplate(
        "warmup",
        `${plan.name || "Plan"} · Warm-up`,
      );
      t.items = legacyWarm;
      templates.push(t);
      warmupTemplateId = t.id;
    }

    if (!cooldownTemplateId && plan.cooldown?.length) {
      const t = blankPrepTemplate(
        "cooldown",
        `${plan.name || "Plan"} · Cool-down`,
      );
      t.items = [...plan.cooldown];
      templates.push(t);
      cooldownTemplateId = t.id;
    }

    // Inline-Arrays entfernen — Quelle der Wahrheit sind Vorlagen
    const {
      warmup: _w,
      cooldown: _c,
      cardio: _k,
      ...rest
    } = plan;
    return {
      ...rest,
      warmupTemplateId,
      cooldownTemplateId,
    };
  });
  return { plans: nextPlans, prepTemplates: templates };
}

export function formatPrepMeta(item) {
  const parts = [];
  if (item.kind === "cardio") {
    if (item.seconds) {
      const m = Math.round(item.seconds / 60);
      parts.push(m >= 1 ? `${m} Min` : `${item.seconds}s`);
    }
    if (item.distanceKm != null && item.distanceKm > 0) {
      parts.push(`${item.distanceKm} km`);
    }
    if (item.intensity) {
      const lab =
        CARDIO_INTENSITIES.find((x) => x.id === item.intensity)?.label ||
        item.intensity;
      parts.push(lab);
    }
  } else if (item.seconds) {
    parts.push(`${item.seconds}s`);
  } else if (item.reps) {
    parts.push(`${item.reps} Wdh.`);
  }
  if (item.kind && PREP_KIND_LABEL[item.kind]) {
    parts.push(PREP_KIND_LABEL[item.kind]);
  }
  return parts.join(" · ");
}
