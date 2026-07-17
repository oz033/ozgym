/* Zentrale Daten: Übungen, Bibliothek, Ziele, Badges, Motivation */

import { uid } from "./utils.js";

export const APP_NAME = "OZGYM";
// Prefer ozgym key; migrate still reads legacy ironlog keys in hydrate boot.
export const STORAGE_KEY = "ozgym:state:v1";
export const STORAGE_KEY_LEGACY = ["ironlog:state:v3", "ironlog:state:v2", "ironlog:state"];

/** Resolved display title from settings (falls back to OZGYM). */
export function resolveAppName(settingsOrName) {
  if (typeof settingsOrName === "string") {
    const t = settingsOrName.trim().slice(0, 24);
    return t || APP_NAME;
  }
  const t = String(settingsOrName?.appName ?? "")
    .trim()
    .slice(0, 24);
  return t || APP_NAME;
}

export const EXERCISE_META = {
  Shoulderpress: {
    group: "Oberkörper",
    zone: "shoulders",
    zone2: "arms",
    nr: 12,
    order: 1,
    reps: "8–12",
    hint: "Griffe auf Schulterhöhe, Ellbogen ~90°",
    benefit: "Für breite Schultern & starke Schultermuskulatur",
    guide: {
      setup: [
        "Sitzhöhe so einstellen, dass die Griffe auf Schulterhöhe sind.",
        "Rücken fest an die Lehne, Füße flach auf dem Boden.",
        "Griffe greifen, Handgelenke gerade, Ellbogen unter den Händen (~90°).",
      ],
      move: [
        "Gewicht kontrolliert nach oben drücken, bis die Arme fast gestreckt sind (Ellbogen nicht durchdrücken).",
        "Kurz oben anhalten, Schultern nicht hochziehen.",
        "Langsam wieder absenken, bis die Oberarme etwa waagrecht / 90° sind.",
      ],
      avoid: [
        "Nicht mit dem Rücken vom Polster abheben.",
        "Kein Schwung aus den Beinen oder dem Hohlkreuz.",
      ],
    },
  },
  Chestpress: {
    group: "Oberkörper",
    zone: "chest",
    zone2: "arms",
    nr: 10,
    order: 2,
    reps: "8–12",
    hint: "Griffe auf Brusthöhe, Ellbogen ~90°",
    benefit: "Baut die Brustmuskulatur auf",
    guide: {
      setup: [
        "Sitz so, dass die Griffe auf mittlerer Brusthöhe liegen.",
        "Schulterblätter leicht zusammen und nach unten, Rücken an der Lehne.",
        "Füße fest am Boden, Bauch leicht anspannen.",
      ],
      move: [
        "Griffe nach vorne drücken, bis die Arme fast gestreckt sind.",
        "Brust anspannen, Schultern bleiben unten.",
        "Kontrolliert zurückführen, bis die Ellbogen etwa 90° sind — nicht zu weit hinter den Körper.",
      ],
      avoid: [
        "Schultern nicht nach vorne rollen.",
        "Gewicht nicht abfedern oder fallen lassen.",
      ],
    },
  },
  Pulldown: {
    group: "Oberkörper",
    zone: "back",
    zone2: "arms",
    nr: 13,
    order: 3,
    reps: "8–12",
    hint: "Brust zum Polster, Ellbogen zur Körpermitte",
    benefit: "Trainiert den breiten Rückenmuskel (Lat)",
    guide: {
      setup: [
        "Oberschenkelpolster fest auf die Oberschenkel drücken (Stabilität).",
        "Breiten Griff greifen, etwas weiter als schulterbreit.",
        "Leicht nach hinten lehnen (ca. 10–15°), Brust raus.",
      ],
      move: [
        "Stange mit den Ellbogen nach unten/hinten zur oberen Brust ziehen.",
        "Am tiefsten Punkt Schulterblätter zusammenziehen, kurz halten.",
        "Stange kontrolliert nach oben führen, Arme strecken ohne aus dem Sitz zu springen.",
      ],
      avoid: [
        "Nicht mit dem ganzen Oberkörper reißen.",
        "Stange nicht hinter den Nacken ziehen.",
      ],
    },
  },
  "Low Row": {
    group: "Oberkörper",
    zone: "back",
    zone2: "shoulders",
    nr: 16,
    order: 4,
    reps: "8–12",
    hint: "Brust am Polster, Ellbogen nach hinten",
    benefit: "Stärkt den mittleren Rücken & hintere Schulter",
    guide: {
      setup: [
        "Brust fest gegen das Polster, Füße auf der Plattform oder dem Boden.",
        "Griffe greifen, Arme gestreckt, Schultern entspannt nach unten.",
        "Sitzhöhe so, dass die Griffe auf etwa Brusthöhe kommen.",
      ],
      move: [
        "Ellbogen eng am Körper nach hinten ziehen, als würdest du etwas in die Hosentasche stecken.",
        "Schultern hinten zusammenziehen, Brust bleibt am Polster.",
        "Langsam nach vorne ausstrecken, Spannung im Rücken halten.",
      ],
      avoid: [
        "Oberkörper nicht nach hinten schwingen.",
        "Schultern nicht zu den Ohren hochziehen.",
      ],
    },
  },
  "Lower Back": {
    group: "Oberkörper",
    zone: "back",
    zone2: "abs",
    nr: 23,
    order: 7,
    reps: "8–12",
    hint: "Hüfte am Polster, Bewegung aus dem unteren Rücken",
    benefit: "Kräftigt den unteren Rücken & Rumpf",
    guide: {
      setup: [
        "Hüftpolster so einstellen, dass die Hüftbeuge genau am Polster sitzt.",
        "Füße flach, Beine leicht gebeugt oder wie am Gerät vorgesehen.",
        "Arme verschränkt vor der Brust oder am Griff halten — nicht mit den Händen ziehen.",
      ],
      move: [
        "Oberkörper kontrolliert nach hinten strecken (Rücken aufrichten).",
        "Am oberen Punkt kurz halten, unterer Rücken aktiv.",
        "Langsam nach vorne absenken, Rücken bleibt gerade — nicht rund einsinken.",
      ],
      avoid: [
        "Kein Schwung, keine ruckartigen Bewegungen.",
        "Nicht ins extreme Hohlkreuz pressen.",
      ],
    },
  },
  "Arm Extension": {
    group: "Oberkörper",
    zone: "arms",
    nr: 18,
    order: 5,
    reps: "8–12",
    hint: "Oberarme fix, nur Unterarme strecken",
    benefit: "Formt die Trizeps (Rückseite der Arme)",
    guide: {
      setup: [
        "Sitzhöhe: Oberarme liegen bequem auf dem Polster, Ellbogen fest.",
        "Griffe greifen, Handgelenke neutral.",
        "Rücken anlehnen, Ellbogen zeigen nach vorne/unten und bleiben dort.",
      ],
      move: [
        "Nur die Unterarme strecken, bis die Arme fast gerade sind.",
        "Trizeps anspannen, kurz halten.",
        "Kontrolliert zurück in die Startposition (nicht unter das Polster federn).",
      ],
      avoid: [
        "Ellbogen nicht vom Polster heben.",
        "Kein Schwung aus Schultern oder Rücken.",
      ],
    },
  },
  "Arm Curl": {
    group: "Oberkörper",
    zone: "arms",
    nr: 19,
    order: 6,
    reps: "8–12",
    hint: "Oberarme fix, nur Unterarme beugen",
    benefit: "Baut den Bizeps auf (Vorderseite der Arme)",
    guide: {
      setup: [
        "Sitz so, dass die Oberarme flach auf dem Polster liegen.",
        "Ellbogen am unteren Rand des Polsters fixiert.",
        "Griffe von unten greifen, Handgelenke gerade.",
      ],
      move: [
        "Unterarme nach oben beugen, bis die Hände fast bei den Schultern sind.",
        "Bizeps anspannen, kurz halten.",
        "Langsam absenken, bis die Arme fast gestreckt sind — Spannung behalten.",
      ],
      avoid: [
        "Oberarme nicht abheben oder wackeln.",
        "Nicht mit dem Oberkörper mitreißen.",
      ],
    },
  },
  "Leg Press": {
    group: "Unterkörper",
    zone: "legs",
    zone2: "abs",
    nr: 3,
    order: 1,
    reps: "6–10",
    hint: "Füße schulterbreit, Knie folgen den Zehen",
    benefit: "Der ultimative Bein-Boost (Quadrizeps, Po)",
    guide: {
      setup: [
        "Rücken und Becken fest an die Lehne, Kopf entspannt.",
        "Füße schulterbreit auf die Platte (2er-/3er-Linie), Zehen leicht nach außen.",
        "Knie in einer Linie mit den Zehen — nicht nach innen knicken.",
      ],
      move: [
        "Sicherung lösen, Platte kontrolliert absenken, bis die Knie ca. 90° sind.",
        "Durch die Fersen / ganze Fußsohle nach oben drücken.",
        "Oben Knie nicht komplett durchdrücken, Spannung in den Beinen halten.",
      ],
      avoid: [
        "Po nicht von der Lehne abheben (zu tief / zu schwer).",
        "Knie nicht nach innen knicken.",
      ],
    },
  },
  "Leg Extension": {
    group: "Unterkörper",
    zone: "legs",
    nr: 2,
    order: 2,
    reps: "8–12",
    hint: "Polster über den Knöcheln, Knie in der Achse",
    benefit: "Isoliert den vorderen Oberschenkel",
    guide: {
      setup: [
        "Rücken an der Lehne, Kniegelenke am Ende der Sitzfläche (Achse des Geräts).",
        "Unteres Polster knapp oberhalb der Knöchel platzieren.",
        "Griffe an den Seiten halten, Oberkörper ruhig.",
      ],
      move: [
        "Beine strecken, bis sie fast gerade sind — kontrolliert, ohne zu schnappen.",
        "Oben kurz den vorderen Oberschenkel anspannen.",
        "Langsam absenken, bis etwas unter 90° — nicht mit Schwung aufschlagen.",
      ],
      avoid: [
        "Hüfte nicht vom Sitz heben.",
        "Keine ruckartigen Endpositionen.",
      ],
    },
  },
  "Leg Curl": {
    group: "Unterkörper",
    zone: "legs",
    nr: 7,
    order: 3,
    reps: "8–12",
    hint: "Polster über den Knöcheln, Hüfte am Polster",
    benefit: "Trainiert die hintere Oberschenkelmuskulatur",
    guide: {
      setup: [
        "Bauch/Hüfte am Polster, Knie frei über der Kante (Geräteachse).",
        "Rollenpolster knapp über den Fersen/Knöcheln.",
        "Griffe festhalten, Hüfte bleibt am Polster.",
      ],
      move: [
        "Fersen Richtung Po ziehen, hintere Oberschenkel anspannen.",
        "Oben kurz halten.",
        "Langsam strecken, ohne das Gewicht unkontrolliert fallen zu lassen.",
      ],
      avoid: [
        "Hüfte nicht hochdrücken / Hohlkreuz.",
        "Kein Schwung mit dem ganzen Körper.",
      ],
    },
  },
  Adductor: {
    group: "Unterkörper",
    zone: "legs",
    nr: 8,
    order: 4,
    reps: "8–12",
    hint: "Polster an der Innenseite der Knie",
    benefit: "Stärkt die Innenseite der Oberschenkel",
    guide: {
      setup: [
        "Sitz aufrecht, Rücken an der Lehne.",
        "Polster an der Innenseite der Knie/Oberschenkel anlegen.",
        "Startposition: Beine geöffnet im angenehmen, nicht überdehnten Winkel.",
      ],
      move: [
        "Beine gegen den Widerstand zusammenführen.",
        "Innen-Oberschenkel anspannen, kurz halten.",
        "Kontrolliert wieder öffnen — nicht auseinanderschnappen lassen.",
      ],
      avoid: [
        "Nicht mit dem Oberkörper mithelfen.",
        "Kein zu großer Startwinkel mit Schmerzen in der Leiste.",
      ],
    },
  },
  Abductor: {
    group: "Unterkörper",
    zone: "legs",
    nr: 1,
    order: 5,
    reps: "8–12",
    hint: "Polster an der Außenseite der Knie",
    benefit: "Aktiviert die Außenseite der Oberschenkel & Po",
    guide: {
      setup: [
        "Sitz aufrecht, Rücken an der Lehne.",
        "Polster an der Außenseite der Knie.",
        "Füße auf den Ablagen, Knie etwa 90°.",
      ],
      move: [
        "Beine gegen den Widerstand nach außen drücken.",
        "Po/Außenseite anspannen, kurz halten.",
        "Langsam wieder zusammenführen.",
      ],
      avoid: [
        "Oberkörper nicht zur Seite kippen.",
        "Bewegung nicht zu klein und hektisch machen.",
      ],
    },
  },
  "Abdominal Crunch": {
    group: "Unterkörper",
    zone: "abs",
    nr: 20,
    order: 6,
    reps: "8–12",
    hint: "Bewegung aus der Bauchmitte, nicht aus dem Nacken",
    benefit: "Für eine starke Körpermitte",
    guide: {
      setup: [
        "Sitz so, dass die Brustpolster bequem auf dem oberen Brustkorb liegen.",
        "Füße unter die Fußrollen oder flach am Boden — je nach Gerät.",
        "Hände an den Griffen, Nacken lang, Kinn leicht Richtung Brust.",
      ],
      move: [
        "Oberkörper nach vorne/unten rollen, als würdest du die Rippen zu den Hüften ziehen.",
        "Bauch anspannen, kurz halten.",
        "Kontrolliert zurück in die Ausgangsposition, Bauchspannung behalten.",
      ],
      avoid: [
        "Nicht am Nacken ziehen.",
        "Keine Schwungbewegung aus dem Schwung der Arme.",
      ],
    },
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
  guide: m.guide || null,
  benefit: m.benefit || "",
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
    // Wiederverwendbare Prep-Vorlagen (IDs in data.prepTemplates)
    warmupTemplateId: null,
    cooldownTemplateId: null,
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
