/* Smart Training Plan: Generierung aus Onboarding-Antworten + adaptive Logik */

import { uid, todayISO, mondayOf, localISO, todayKey } from "./utils.js";
import { WEEKDAYS } from "./constants.js";

/* Satz/Wdh/Pause-Schema pro Ziel, skaliert mit Level */
const GOAL_SCHEMES = {
  // Frauen-Ziele
  glutes: { sets: 3, reps: 12, rest: 60, focus: ["glutes", "legs", "core"], color: "#b06af0", icon: "◉" },
  core: { sets: 3, reps: 15, rest: 45, focus: ["core", "legs", "back"], color: "#f472b6", icon: "◆" },
  fatloss: { sets: 3, reps: 15, rest: 45, focus: null, color: "#f0654a", icon: "▲" },
  toning: { sets: 3, reps: 14, rest: 60, focus: null, color: "#b06af0", icon: "○" },
  fitness: { sets: 3, reps: 12, rest: 75, focus: null, color: "#4aa8f0", icon: "✳" },
  // Männer-Ziele
  muscle: { sets: 3, reps: 10, rest: 90, focus: null, color: "#e3b23c", icon: "■" },
  strength: { sets: 4, reps: 6, rest: 150, focus: ["chest", "back", "legs"], color: "#f0654a", icon: "▲" },
  performance: { sets: 3, reps: 8, rest: 90, focus: null, color: "#4aa8f0", icon: "✦" },
  endurance: { sets: 3, reps: 18, rest: 45, focus: null, color: "#4af0c8", icon: "◇" },
};

const LEVEL_MOD = {
  beginner: { sets: 0, exercises: -1 },
  intermediate: { sets: 0, exercises: 0 },
  advanced: { sets: 1, exercises: 1 },
};

// Muskelgruppen pro Split-Einheit
const SPLIT_UNITS = {
  full: { name: "Ganzkörper", icon: "●", muscles: ["legs", "chest", "back", "shoulders", "core"] },
  fullB: { name: "Ganzkörper B", icon: "◐", muscles: ["glutes", "back", "chest", "biceps", "triceps", "core"] },
  upper: { name: "Oberkörper", icon: "▲", muscles: ["chest", "back", "shoulders", "biceps", "triceps"] },
  lower: { name: "Unterkörper", icon: "▼", muscles: ["legs", "glutes", "core"] },
  push: { name: "Push", icon: "▶", muscles: ["chest", "shoulders", "triceps"] },
  pull: { name: "Pull", icon: "◀", muscles: ["back", "biceps", "core"] },
  legs: { name: "Leg Day", icon: "▼", muscles: ["legs", "glutes", "core"] },
};

// Trainingstage gleichmäßig über die Woche verteilen
const DAY_SLOTS = {
  2: ["mon", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "fri"],
  5: ["mon", "tue", "wed", "fri", "sat"],
  6: ["mon", "tue", "wed", "thu", "fri", "sat"],
};

// Split-Struktur je Trainingsfrequenz
function splitFor(daysPerWeek) {
  switch (Math.min(6, Math.max(2, daysPerWeek))) {
    case 2:
      return [["full"], ["fullB"]];
    case 3:
      return [["full"], ["fullB"], ["full"]];
    case 4:
      return [["upper"], ["lower"], ["upper"], ["lower"]];
    case 5:
      return [["push"], ["pull"], ["legs"], ["upper"], ["lower"]];
    default:
      return [["push"], ["pull"], ["legs"], ["push"], ["pull"], ["legs"]];
  }
}

/* Übungen für eine Einheit wählen: Equipment-Filter + Ziel-Fokus */
function pickExercises(library, unit, scheme, count, usedNames) {
  const allowed = library.filter(
    (e) => !e.custom || e.name, // alle gültigen Einträge
  );
  const inUnit = allowed.filter((e) => unit.muscles.includes(e.muscle));

  // Fokus-Muskeln zuerst und doppelt gewichtet
  const focusSet = new Set(scheme.focus || []);
  const scored = inUnit
    .map((e) => ({
      e,
      score:
        (focusSet.has(e.muscle) ? 100 : 0) +
        (e.equipment === "Maschine" ? 5 : 0) + // Maschinen = einsteigerfreundlich, stabil
        (usedNames.has(e.name) ? -50 : 0) +
        Math.random() * 10,
    }))
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const perMuscle = {};
  // Fokus-Ziele: bis zu 3 Übungen pro Fokus-Muskel, sonst max 2
  for (const { e } of scored) {
    if (picked.length >= count) break;
    const cap = focusSet.has(e.muscle) ? 3 : 2;
    if ((perMuscle[e.muscle] || 0) >= cap) continue;
    // Muskel-Abdeckung: erst jede Gruppe einmal, dann auffüllen
    picked.push(e);
    perMuscle[e.muscle] = (perMuscle[e.muscle] || 0) + 1;
    usedNames.add(e.name);
  }
  // Reihenfolge: große Muskeln zuerst
  const order = ["legs", "glutes", "chest", "back", "shoulders", "biceps", "triceps", "core"];
  picked.sort((a, b) => order.indexOf(a.muscle) - order.indexOf(b.muscle));
  return picked;
}

/**
 * Erzeugt Trainingspläne aus dem Onboarding-Profil.
 * @returns {Array} plans im App-Format
 */
export function generatePlans(profile, library) {
  const {
    goal = "fitness",
    level = "beginner",
    daysPerWeek = 3,
    equipment = [],
    duration = 45,
  } = profile;

  const scheme = GOAL_SCHEMES[goal] || GOAL_SCHEMES.fitness;
  const mod = LEVEL_MOD[level] || LEVEL_MOD.beginner;

  // Equipment-Filter (Körpergewicht geht immer)
  const allowedEquipment = new Set([...(equipment || []), "Körpergewicht", ""]);
  const filtered = library.filter(
    (e) => allowedEquipment.has(e.equipment) || e.custom,
  );
  // Fallback: zu wenig Auswahl -> komplette Bibliothek
  const pool = filtered.length >= 8 ? filtered : library;

  // 30min→4, 45min→5, 60min→6, 75min→7 Übungen; Level justiert ±1
  const perSession = Math.max(
    3,
    Math.min(8, Math.round(duration / 15) + 2 + mod.exercises),
  );
  const sets = scheme.sets + mod.sets;

  const units = splitFor(daysPerWeek);
  const slots = DAY_SLOTS[Math.min(6, Math.max(2, daysPerWeek))];

  // Gleiche Einheiten (z.B. Push 2x) teilen sich einen Plan mit mehreren Tagen
  const plansByUnit = {};
  const usedNames = new Set();
  units.forEach((unitKeys, i) => {
    const key = unitKeys[0];
    const day = slots[i];
    if (plansByUnit[key]) {
      plansByUnit[key].days.push(day);
      return;
    }
    const unit = SPLIT_UNITS[key];
    const picked = pickExercises(pool, unit, scheme, perSession, usedNames);
    plansByUnit[key] = {
      id: "plan-" + uid(),
      name: unit.name,
      color: scheme.color,
      icon: key === "full" ? scheme.icon : unit.icon,
      description: "Automatisch erstellt für dein Ziel",
      generated: true,
      days: [day],
      exercises: picked.map((e) => ({
        exerciseId: e.id,
        sets,
        reps: scheme.reps,
        weight: null,
        rest: scheme.rest,
      })),
    };
  });

  return Object.values(plansByUnit);
}

/* ---------------- Adaptive Logik (Smart Coach) ---------------- */

/**
 * Progressive Overload: Wenn die letzten beiden Einheiten einer Übung
 * alle Zielwiederholungen beim gleichen Top-Gewicht geschafft wurden,
 * schlage +2,5 kg vor.
 */
export function smartSuggest(logs, exerciseName, targetReps, fallback) {
  const sessions = logs
    .filter((l) => l.exercise === exerciseName)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!sessions.length)
    return { weight: fallback?.weight ?? 20, reps: fallback?.reps ?? targetReps ?? 10, bump: false };

  const last = sessions[0];
  const lastSets = last.sets || [];
  if (!lastSets.length)
    return { weight: fallback?.weight ?? 20, reps: fallback?.reps ?? targetReps ?? 10, bump: false };
  const lastTop = lastSets.reduce((m, s) => Math.max(m, s.weight || 0), 0);
  const lastReps = lastSets[lastSets.length - 1]?.reps ?? targetReps ?? 10;

  const hitAll = (sess, w) => {
    const sets = sess.sets || [];
    return (
      sets.length >= 2 &&
      sets.every((s) => s.reps >= (targetReps || 8) && s.weight >= w)
    );
  };

  const prev = sessions[1];
  const ready =
    hitAll(last, lastTop) && prev
      ? hitAll(prev, lastTop)
      : false;

  return {
    weight: ready ? lastTop + 2.5 : lastTop || fallback?.weight || 20,
    reps: lastReps,
    bump: ready,
  };
}

/**
 * Wochen-Analyse: verpasste geplante Tage, Fortschritt zum Wochenziel.
 */
export function weeklyAdherence(data) {
  const plans = (data.plans || []).filter((p) => (p.days || []).length > 0);
  const scheduled = new Set(plans.flatMap((p) => p.days));
  if (!scheduled.size) return null;

  const monday = mondayOf(todayISO());
  const trainedDates = new Set(data.logs.map((l) => l.date));
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const todayIdx = order.indexOf(todayKey());

  let missed = 0;
  let done = 0;
  order.forEach((key, i) => {
    if (!scheduled.has(key)) return;
    const d = new Date(monday + "T00:00:00");
    d.setDate(d.getDate() + i);
    const iso = localISO(d);
    if (trainedDates.has(iso)) done++;
    else if (i < todayIdx) missed++;
  });

  return { planned: scheduled.size, done, missed };
}

/**
 * Verpasste Einheit nachholen: schlägt vor, den nächsten Ruhetag zu nutzen.
 * Liefert den Wochentag-Key oder null.
 */
export function catchUpDay(data) {
  const adherence = weeklyAdherence(data);
  if (!adherence || adherence.missed === 0) return null;
  const plans = (data.plans || []).filter((p) => (p.days || []).length > 0);
  const scheduled = new Set(plans.flatMap((p) => p.days));
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const todayIdx = order.indexOf(todayKey());
  for (let i = todayIdx; i < 7; i++) {
    if (!scheduled.has(order[i]))
      return WEEKDAYS.find((w) => w.key === order[i]) || null;
  }
  return null;
}
