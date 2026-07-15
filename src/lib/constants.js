/* Zentrale Daten: Übungen, Bibliothek, Ziele, Badges, Motivation */

import { uid } from "./utils.js";

export const APP_NAME = "OZGYM";
// Prefer ozgym key; migrate still reads legacy ironlog keys in hydrate boot.
export const STORAGE_KEY = "ozgym:state:v1";
export const STORAGE_KEY_LEGACY = ["ironlog:state:v3", "ironlog:state:v2", "ironlog:state"];

export const EXERCISE_META = {
  Shoulderpress: {
    group: "Oberkörper",
    zone: "shoulders",
    zone2: "arms",
    nr: 12,
    order: 1,
    reps: "8–12",
    hint: "Rechtwinkel der Arme, Griffe auf Schulterhöhe",
    benefit: "Für breite Schultern & starke Schultermuskulatur",
  },
  Chestpress: {
    group: "Oberkörper",
    zone: "chest",
    zone2: "arms",
    nr: 10,
    order: 2,
    reps: "8–12",
    hint: "Rechtwinkel der Arme, Griffe auf Brusthöhe",
    benefit: "Baut die Brustmuskulatur auf",
  },
  Pulldown: {
    group: "Oberkörper",
    zone: "back",
    zone2: "arms",
    nr: 13,
    order: 3,
    reps: "8–12",
    hint: "Brust zum Polster, Ellbogen nach unten zur Körpermitte",
    benefit: "Trainiert den breiten Rückenmuskel (Lat)",
  },
  "Low Row": {
    group: "Oberkörper",
    zone: "back",
    zone2: "shoulders",
    nr: 16,
    order: 4,
    reps: "8–12",
    hint: "Brust zum Polster, Ellbogen nach hinten ziehen",
    benefit: "Stärkt den mittleren Rücken & hintere Schulter",
  },
  "Lower Back": {
    group: "Oberkörper",
    zone: "back",
    zone2: "abs",
    nr: 23,
    order: 7,
    reps: "8–12",
    hint: "Hüfte nach hinten, Schultern auf dem oberen Polster",
    benefit: "Kräftigt den unteren Rücken & Rumpf",
  },
  "Arm Extension": {
    group: "Oberkörper",
    zone: "arms",
    nr: 18,
    order: 5,
    reps: "8–12",
    hint: "Oberarme am Körper, nur die Unterarme bewegen",
    benefit: "Formt die Trizeps (Rückseite der Arme)",
  },
  "Arm Curl": {
    group: "Oberkörper",
    zone: "arms",
    nr: 19,
    order: 6,
    reps: "8–12",
    hint: "Oberarme am Körper, nur die Unterarme bewegen",
    benefit: "Baut den Bizeps auf (Vorderseite der Arme)",
  },
  "Leg Press": {
    group: "Unterkörper",
    zone: "legs",
    zone2: "abs",
    nr: 3,
    order: 1,
    reps: "6–10",
    hint: "2er- oder 3er-Linie, Fußspitzen leicht nach außen",
    benefit: "Der ultimative Bein-Boost (Quadrizeps, Po)",
  },
  "Leg Extension": {
    group: "Unterkörper",
    zone: "legs",
    nr: 2,
    order: 2,
    reps: "8–12",
    hint: "Polster oberhalb vom Knöchel, Fußspitzen nach oben strecken",
    benefit: "Isoliert den vorderen Oberschenkel",
  },
  "Leg Curl": {
    group: "Unterkörper",
    zone: "legs",
    nr: 7,
    order: 3,
    reps: "8–12",
    hint: "Polster oberhalb vom Knöchel, Fußspitzen nach oben strecken",
    benefit: "Trainiert die hintere Oberschenkelmuskulatur",
  },
  Adductor: {
    group: "Unterkörper",
    zone: "legs",
    nr: 8,
    order: 4,
    reps: "8–12",
    hint: "Selbsterklärend",
    benefit: "Stärkt die Innenseite der Oberschenkel",
  },
  Abductor: {
    group: "Unterkörper",
    zone: "legs",
    nr: 1,
    order: 5,
    reps: "8–12",
    hint: "Selbsterklärend",
    benefit: "Aktiviert die Außenseite der Oberschenkel & Po",
  },
  "Abdominal Crunch": {
    group: "Unterkörper",
    zone: "abs",
    nr: 20,
    order: 6,
    reps: "8–12",
    hint: "Selbsterklärend",
    benefit: "Für eine starke Körpermitte",
  },
};

export const DEFAULT_EXERCISES = Object.keys(EXERCISE_META);

export const MUSCLE_GROUPS = [
  { id: "chest", name: "Brust", zone: "chest" },
  { id: "shoulders", name: "Schultern", zone: "shoulders" },
  { id: "back", name: "Rücken", zone: "back" },
  { id: "biceps", name: "Bizeps", zone: "arms" },
  { id: "triceps", name: "Trizeps", zone: "arms" },
  { id: "legs", name: "Beine", zone: "legs" },
  { id: "glutes", name: "Po", zone: "legs" },
  { id: "core", name: "Core", zone: "abs" },
];
export const MUSCLE_NAME = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.id, m.name]),
);
export const MUSCLE_ZONE = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.id, m.zone]),
);

export const META_MUSCLE = {
  Shoulderpress: "shoulders",
  Chestpress: "chest",
  Pulldown: "back",
  "Low Row": "back",
  "Lower Back": "back",
  "Arm Extension": "triceps",
  "Arm Curl": "biceps",
  "Leg Press": "legs",
  "Leg Extension": "legs",
  "Leg Curl": "legs",
  Adductor: "legs",
  Abductor: "glutes",
  "Abdominal Crunch": "core",
};

// Machines only — full 1.3k catalog lives in exerciseCatalog.js (getCatalog).
// migrateToPlans still uses this as a fallback seed for legacy gym-device names.
export const LIBRARY_DEFAULT = Object.entries(EXERCISE_META).map(([name, m]) => ({
  id: "lib-" + name.toLowerCase().replace(/\s+/g, "-"),
  name,
  muscle: META_MUSCLE[name],
  zone: m.zone,
  zone2: m.zone2 || null,
  equipment: "Maschine",
  hint: m.hint !== "Selbsterklärend" ? m.hint : "",
  nr: m.nr,
  machine: true,
}));

export const PLAN_COLORS = ["#e3b23c", "#c8f04a", "#4aa8f0", "#f0654a", "#b06af0", "#4af0c8"];
export const PLAN_ICONS = ["●", "◆", "▲", "■", "◐", "○", "◇", "✳"];

// Leerer Plan-Rohling: einzige Quelle für die Plan-Form, damit PlansTab und
// schnelle Erstellen-Aktionen anderer Tabs nicht divergieren.
export function blankPlan(index, name = "Neuer Plan") {
  return {
    id: "plan-" + uid(),
    name,
    color: PLAN_COLORS[index % PLAN_COLORS.length],
    icon: PLAN_ICONS[index % PLAN_ICONS.length],
    description: "",
    days: [],
    exercises: [],
  };
}

export const WEEKDAYS = [
  { key: "mon", label: "Montag", short: "Mo" },
  { key: "tue", label: "Dienstag", short: "Di" },
  { key: "wed", label: "Mittwoch", short: "Mi" },
  { key: "thu", label: "Donnerstag", short: "Do" },
  { key: "fri", label: "Freitag", short: "Fr" },
  { key: "sat", label: "Samstag", short: "Sa" },
  { key: "sun", label: "Sonntag", short: "So" },
];

export const ZONE_LABEL = {
  shoulders: "Schultern",
  chest: "Brust",
  back: "Rücken",
  arms: "Arme",
  legs: "Beine",
  abs: "Bauch",
};

/* ---------------- Onboarding-Optionen ---------------- */

export const GOALS = {
  f: [
    { id: "glutes", name: "Glutes & Beine", icon: "◉", desc: "Runder, starker Po & definierte Beine" },
    { id: "core", name: "Core & Bauch", icon: "◆", desc: "Starke Mitte, aufrechte Haltung" },
    { id: "fatloss", name: "Fat Loss", icon: "▲", desc: "Abnehmen mit Kraft & Ausdauer" },
    { id: "toning", name: "Straffung", icon: "○", desc: "Definieren & straffen am ganzen Körper" },
    { id: "fitness", name: "Allgemeine Fitness", icon: "✳", desc: "Fit, gesund & voller Energie" },
  ],
  m: [
    { id: "muscle", name: "Muskelaufbau", icon: "■", desc: "Maximale Hypertrophie, sichtbare Masse" },
    { id: "strength", name: "Kraft", icon: "▲", desc: "Schwere Gewichte, mehr Grundkraft" },
    { id: "performance", name: "Performance", icon: "✦", desc: "Explosivität & athletische Leistung" },
    { id: "endurance", name: "Ausdauer", icon: "◇", desc: "Kraftausdauer & Kondition" },
  ],
};

export const GOAL_NAME = Object.fromEntries(
  [...GOALS.f, ...GOALS.m].map((g) => [g.id, g.name]),
);

export const LEVELS = [
  { id: "beginner", name: "Einsteiger", desc: "Neu dabei oder lange Pause" },
  { id: "intermediate", name: "Fortgeschritten", desc: "Trainiere seit 6+ Monaten" },
  { id: "advanced", name: "Profi", desc: "Trainiere seit Jahren konstant" },
];

export const EQUIPMENT_OPTIONS = [
  { id: "Maschine", name: "Geräte / Maschinen", icon: "▦" },
  { id: "Kurzhantel", name: "Kurzhanteln", icon: "◈" },
  { id: "Langhantel", name: "Langhantel", icon: "▬" },
  { id: "Kabelzug", name: "Kabelzug", icon: "↕" },
  { id: "Körpergewicht", name: "Körpergewicht", icon: "◯" },
];

export const DURATIONS = [
  { id: 30, name: "30 Min", desc: "Kurz & knackig" },
  { id: 45, name: "45 Min", desc: "Der Klassiker" },
  { id: 60, name: "60 Min", desc: "Volles Programm" },
  { id: 75, name: "75+ Min", desc: "Alles geben" },
];

/* ---------------- Gamification ---------------- */

export const BADGE_DEFS = [
  { id: "w1", name: "Erster Schritt", desc: "1. Training", icon: "○", check: (s) => s.totalWorkouts >= 1 },
  { id: "w10", name: "Dranbleiber", desc: "10 Trainings", icon: "◐", check: (s) => s.totalWorkouts >= 10 },
  { id: "w25", name: "Gewohnheitstier", desc: "25 Trainings", icon: "◑", check: (s) => s.totalWorkouts >= 25 },
  { id: "w50", name: "Eisenfresser", desc: "50 Trainings", icon: "●", check: (s) => s.totalWorkouts >= 50 },
  { id: "w100", name: "Veteran", desc: "100 Trainings", icon: "✦", check: (s) => s.totalWorkouts >= 100 },
  { id: "pr1", name: "Rekordjäger", desc: "1. Rekord", icon: "▲", check: (s) => s.prCount >= 1 },
  { id: "pr10", name: "PR-Maschine", desc: "10 Rekorde", icon: "◆", check: (s) => s.prCount >= 10 },
  { id: "v10k", name: "10 Tonnen", desc: "10.000 kg bewegt", icon: "▪", check: (s) => s.totalVolume >= 10000 },
  { id: "v100k", name: "100 Tonnen", desc: "100.000 kg bewegt", icon: "■", check: (s) => s.totalVolume >= 100000 },
  { id: "s4", name: "Ein Monat", desc: "4 Wochen Serie", icon: "◇", check: (s) => s.streakWeeks >= 4 },
  { id: "s12", name: "Ein Quartal", desc: "12 Wochen Serie", icon: "✳", check: (s) => s.streakWeeks >= 12 },
];

/* ---------------- Motivation ---------------- */

// Tages-Zitat: deterministisch per Datum gewählt
export const DAILY_QUOTES = {
  any: [
    "Der schwerste Teil ist erledigt, sobald du anfängst.",
    "Kleine Schritte jeden Tag schlagen große Pläne ohne Taten.",
    "Du musst nicht perfekt sein — nur dranbleiben.",
    "Dein einziger Vergleich bist du von gestern.",
    "Disziplin ist Selbstliebe in Arbeitskleidung.",
    "Heute trainieren, morgen stolz sein.",
    "Fortschritt passiert außerhalb der Komfortzone.",
    "Ein Training bereust du nie — nur das ausgelassene.",
    "Stärke wächst in den Momenten, in denen du weitermachst.",
    "Konstanz schlägt Intensität.",
    "Jede Wiederholung bringt dich näher ans Ziel.",
    "Der Körper erreicht, was der Kopf glaubt.",
    "Du bist eine Einheit davon entfernt, dich besser zu fühlen.",
    "Motivation bringt dich her, Gewohnheit hält dich hier.",
  ],
  f: [
    "Stark ist das neue Schön.",
    "Du trainierst nicht, um weniger zu werden — sondern mehr.",
    "Selbstfürsorge heißt heute: Training.",
  ],
  m: [
    "Niemand hebt das Gewicht für dich.",
    "Werde der Typ, der niemals absagt.",
    "Eisen lügt nicht.",
  ],
};

export const MOTIVATION_POOL = [
  "Stark gemacht — weiter so.",
  "Perfektes Tempo.",
  "Jede Wiederholung zählt.",
  "Sauber durchgezogen.",
];
