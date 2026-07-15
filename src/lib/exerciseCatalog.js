/**
 * Full exercise catalog from hasaneyldrm/exercises-dataset.
 * Static data + CDN media — not persisted wholesale in localStorage.
 */
import index from "../data/exercisesIndex.json";
import { EXERCISE_META, META_MUSCLE, MUSCLE_ZONE } from "./constants.js";

const MEDIA_BASE =
  index.mediaBase || "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";

function mediaUrl(rel) {
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  return MEDIA_BASE + String(rel).replace(/^\//, "");
}

/** Dataset equipment (EN) → app equipment labels (DE, for onboarding filter) */
const EQUIPMENT_MAP = {
  "body weight": "Körpergewicht",
  dumbbell: "Kurzhantel",
  barbell: "Langhantel",
  cable: "Kabelzug",
  "leverage machine": "Maschine",
  "smith machine": "Maschine",
  "ez barbell": "SZ-Stange",
  kettlebell: "Kurzhantel",
  band: "Körpergewicht",
  "resistance band": "Körpergewicht",
  assisted: "Maschine",
  weighted: "Körpergewicht",
  "stability ball": "Körpergewicht",
  "medicine ball": "Körpergewicht",
  "olympic barbell": "Langhantel",
  "trap bar": "Langhantel",
  "bosu ball": "Körpergewicht",
  roller: "Körpergewicht",
  wheel: "Körpergewicht",
  rope: "Kabelzug",
  sled: "Maschine",
  "tire": "Körpergewicht",
  "hammer": "Maschine",
  "stationary bike": "Maschine",
  "elliptical machine": "Maschine",
  "skierg machine": "Maschine",
  "stepmill machine": "Maschine",
  "upper body ergometer": "Maschine",
};

/** Map dataset target / body_part → app muscle id */
function mapMuscle(target, bodyPart) {
  const t = String(target || "").toLowerCase();
  const b = String(bodyPart || "").toLowerCase();
  const blob = `${t} ${b}`;

  if (/glute|butt/.test(blob)) return "glutes";
  if (/abductor/.test(blob)) return "glutes";
  if (/pectoral|chest/.test(blob)) return "chest";
  if (/deltoid|shoulder|delt/.test(blob)) return "shoulders";
  if (/bicep/.test(blob)) return "biceps";
  if (/tricep/.test(blob)) return "triceps";
  if (/lat|trapezius|spine|upper back|lower back|back|rhomboid|erector/.test(blob))
    return "back";
  if (/abs|oblique|core|waist|serratus/.test(blob)) return "core";
  if (
    /quad|hamstring|calf|adductor|leg|thigh|hip flexor|soleus|gastroc|tibialis/.test(
      blob,
    )
  )
    return "legs";
  if (/forearm|wrist|grip/.test(blob)) return "biceps";
  if (/cardio|cardiovascular/.test(blob)) return "core";
  if (/neck/.test(blob)) return "shoulders";
  return "core";
}

function mapEquipment(raw) {
  const key = String(raw || "").toLowerCase().trim();
  return EQUIPMENT_MAP[key] || "Maschine";
}

function titleCase(name) {
  return String(name || "")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Clever Fit machine sheet → best matching GIF/thumb in exercises-dataset.
 * Media © Gym visual (via hasaneyldrm/exercises-dataset).
 */
export const MACHINE_MEDIA_IDS = {
  Shoulderpress: "0587", // lever military press
  Chestpress: "0577", // lever chest press
  Pulldown: "0198", // cable pulldown
  "Low Row": "0861", // cable seated row
  "Lower Back": "0573", // lever back extension
  "Arm Extension": "0607", // lever triceps extension
  "Arm Curl": "0575", // lever bicep curl
  "Leg Press": "0739", // sled 45° leg press
  "Leg Extension": "0585", // lever leg extension
  "Leg Curl": "0586", // lever lying leg curl
  Adductor: "0598", // lever seated hip adduction
  Abductor: "0597", // lever seated hip abduction
  "Abdominal Crunch": "0212", // cable seated crunch
};

function datasetById(id) {
  return (index.exercises || []).find((e) => e.id === id) || null;
}

/** Gym-machine presets (keep ids/names for existing logs) + demo media */
export function machineLibraryEntries() {
  return Object.entries(EXERCISE_META).map(([name, m]) => {
    const media = datasetById(MACHINE_MEDIA_IDS[name]);
    return {
      id: "lib-" + name.toLowerCase().replace(/\s+/g, "-"),
      name,
      muscle: META_MUSCLE[name],
      zone: m.zone,
      zone2: m.zone2 || null,
      equipment: "Maschine",
      hint: m.hint !== "Selbsterklärend" ? m.hint : "",
      nr: m.nr,
      machine: true,
      cleverFit: true,
      image: media ? mediaUrl(media.image) : null,
      gif: media ? mediaUrl(media.gif) : null,
      target: media?.target || null,
      datasetId: media?.id || null,
    };
  });
}

/**
 * Standard Clever Fit OK/UK plans (Ozan sheet — Wien Döbling).
 * Stable ids so re-hydrate can detect them.
 */
export function buildCleverFitPlans(restSeconds = 90) {
  const machines = machineLibraryEntries();
  const byName = Object.fromEntries(machines.map((e) => [e.name, e]));

  const item = (name, sets, reps) => {
    const ex = byName[name];
    // Hints live on the library entry (ex.hint) — do NOT also put them in
    // plan.note, or WorkoutMode shows the same text twice.
    return {
      exerciseId: ex?.id,
      sets,
      reps,
      weight: null,
      rest: restSeconds,
      note: "",
    };
  };

  // Order + reps from the printed Clever Fit plan
  const ok = [
    item("Shoulderpress", 3, 10),
    item("Chestpress", 3, 10),
    item("Pulldown", 3, 10),
    item("Low Row", 3, 10),
    item("Lower Back", 3, 10),
    item("Arm Extension", 3, 10),
    item("Arm Curl", 3, 10),
  ].filter((x) => x.exerciseId);

  const uk = [
    item("Leg Press", 3, 8), // sheet: 6–10
    item("Leg Extension", 3, 10),
    item("Leg Curl", 3, 10),
    item("Adductor", 3, 10),
    item("Abductor", 3, 10),
    item("Abdominal Crunch", 3, 10),
  ].filter((x) => x.exerciseId);

  return [
    {
      id: "plan-clever-ok",
      name: "Oberkörper (Clever Fit)",
      color: "#e3b23c",
      icon: "▲",
      description: "Clever Fit Wien Döbling — Geräteplan OK (Nr. 10–23)",
      days: ["mon", "thu"],
      exercises: ok,
      preset: "clever-fit-ok",
    },
    {
      id: "plan-clever-uk",
      name: "Unterkörper (Clever Fit)",
      color: "#4aa8f0",
      icon: "▼",
      description: "Clever Fit Wien Döbling — Geräteplan UK (Nr. 1–20)",
      days: ["tue", "fri"],
      exercises: uk,
      preset: "clever-fit-uk",
    },
  ];
}

/** All 1.3k dataset exercises as library rows */
export function datasetLibraryEntries() {
  return (index.exercises || []).map((ex) => {
    const muscle = mapMuscle(ex.target, ex.body_part);
    return {
      id: "ds-" + ex.id,
      name: titleCase(ex.name),
      muscle,
      zone: MUSCLE_ZONE[muscle] || null,
      zone2: null,
      equipment: mapEquipment(ex.equipment),
      equipmentRaw: ex.equipment,
      target: ex.target,
      bodyPart: ex.body_part,
      image: mediaUrl(ex.image),
      gif: mediaUrl(ex.gif),
      datasetId: ex.id,
      dataset: true,
    };
  });
}

let _catalog = null;

/** Classic short names (Bench Press, Squat, …) with media from alias map */
const CLASSIC_SHORT = [
  ["lib-bench-press", "Bench Press", "chest", "chest", "arms", "Langhantel"],
  ["lib-incline-bench", "Incline Bench Press", "chest", "chest", "shoulders", "Langhantel"],
  ["lib-cable-fly", "Cable Fly", "chest", "chest", null, "Kabelzug"],
  ["lib-db-press", "Dumbbell Press", "chest", "chest", "arms", "Kurzhantel"],
  ["lib-shoulder-press-db", "Shoulder Press (Kurzhantel)", "shoulders", "shoulders", "arms", "Kurzhantel"],
  ["lib-lateral-raise", "Lateral Raise", "shoulders", "shoulders", null, "Kurzhantel"],
  ["lib-front-raise", "Front Raise", "shoulders", "shoulders", null, "Kurzhantel"],
  ["lib-rear-delt-fly", "Rear Delt Fly", "shoulders", "shoulders", "back", "Maschine"],
  ["lib-pull-up", "Pull Up", "back", "back", "arms", "Körpergewicht"],
  ["lib-seated-row", "Seated Row", "back", "back", "arms", "Kabelzug"],
  ["lib-deadlift", "Deadlift", "back", "back", "legs", "Langhantel"],
  ["lib-barbell-curl", "Barbell Curl", "biceps", "arms", null, "Langhantel"],
  ["lib-db-curl", "Dumbbell Curl", "biceps", "arms", null, "Kurzhantel"],
  ["lib-hammer-curl", "Hammer Curl", "biceps", "arms", null, "Kurzhantel"],
  ["lib-cable-curl", "Cable Curl", "biceps", "arms", null, "Kabelzug"],
  ["lib-pushdown", "Triceps Pushdown", "triceps", "arms", null, "Kabelzug"],
  ["lib-overhead-ext", "Overhead Extension", "triceps", "arms", null, "Kurzhantel"],
  ["lib-skull-crusher", "Skull Crusher", "triceps", "arms", null, "SZ-Stange"],
  ["lib-squat", "Squat", "legs", "legs", "abs", "Langhantel"],
  ["lib-rdl", "Romanian Deadlift", "glutes", "legs", "back", "Langhantel"],
  ["lib-calf-raise", "Calf Raise", "legs", "legs", null, "Maschine"],
  ["lib-lunges", "Lunges", "glutes", "legs", "abs", "Kurzhantel"],
  ["lib-hip-thrust", "Hip Thrust", "glutes", "legs", "abs", "Langhantel"],
  ["lib-glute-kickback", "Glute Kickback", "glutes", "legs", null, "Kabelzug"],
  ["lib-bulgarian-split", "Bulgarian Split Squat", "glutes", "legs", null, "Kurzhantel"],
  ["lib-goblet-squat", "Goblet Squat", "legs", "legs", "abs", "Kurzhantel"],
  ["lib-crunch", "Crunch", "core", "abs", null, "Körpergewicht"],
  ["lib-plank", "Plank", "core", "abs", "shoulders", "Körpergewicht"],
  ["lib-leg-raise", "Hanging Leg Raise", "core", "abs", null, "Körpergewicht"],
  ["lib-russian-twist", "Russian Twist", "core", "abs", null, "Körpergewicht"],
  ["lib-mountain-climber", "Mountain Climbers", "core", "abs", "legs", "Körpergewicht"],
  ["lib-burpee", "Burpees", "core", "abs", "legs", "Körpergewicht"],
];

/** Full catalog: machines → classics → dataset (dedupe by lower name) */
export function getCatalog() {
  if (_catalog) return _catalog;
  const machines = machineLibraryEntries();
  // ESM-friendly media attach without require
  const classics = CLASSIC_SHORT.map(([id, name, muscle, zone, zone2, equipment]) => {
    const aliasId = (index.aliases || {})[name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()];
    const hit = aliasId
      ? (index.exercises || []).find((e) => e.id === aliasId)
      : null;
    return {
      id,
      name,
      muscle,
      zone,
      zone2,
      equipment,
      classic: true,
      image: hit ? mediaUrl(hit.image) : null,
      gif: hit ? mediaUrl(hit.gif) : null,
      target: hit?.target || null,
      datasetId: hit?.id || null,
    };
  });
  const dataset = datasetLibraryEntries();
  const seen = new Set([
    ...machines.map((e) => e.name.toLowerCase()),
    ...classics.map((e) => e.name.toLowerCase()),
  ]);
  const extra = dataset.filter((e) => !seen.has(e.name.toLowerCase()));
  _catalog = [...machines, ...classics, ...extra];
  return _catalog;
}

/**
 * Merge persisted user library bits (custom + favorites) onto the full catalog.
 * Catalog is static; only customs/favorites/overrides live in localStorage.
 */
export function mergeUserLibrary(stored) {
  const catalog = getCatalog();
  const byId = new Map(catalog.map((e) => [e.id, { ...e }]));
  const customs = [];

  for (const e of stored || []) {
    if (!e?.id) continue;
    if (e.custom) {
      customs.push({ ...e });
      continue;
    }
    if (byId.has(e.id)) {
      byId.set(e.id, {
        ...byId.get(e.id),
        favorite: !!e.favorite,
        // allow user renames? keep catalog name
      });
    } else if (!String(e.id).startsWith("ds-")) {
      // legacy lib-* entries not in catalog — keep
      byId.set(e.id, { ...e });
    }
  }

  return [...byId.values(), ...customs];
}

/** Only persist customs + favorite flags (not the whole 1.3k catalog) */
export function slimLibraryForStorage(library) {
  const out = [];
  for (const e of library || []) {
    if (e.custom) {
      out.push(e);
      continue;
    }
    if (e.favorite) {
      out.push({ id: e.id, name: e.name, favorite: true });
    }
  }
  return out;
}

export const CATALOG_COUNT = () => getCatalog().length;
export const MEDIA_ATTRIBUTION =
  index.attribution || "© Gym visual — https://gymvisual.com/";
