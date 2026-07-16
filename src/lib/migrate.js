/* Migration alter Speicherstände auf das aktuelle Datenmodell */

import { uid } from "./utils.js";
import { PLAN_COLORS } from "./constants.js";
import {
  mergeUserLibrary,
  slimLibraryForStorage,
  getCatalog,
  buildCleverFitPlans,
} from "./exerciseCatalog.js";
import { migratePlansToPrepTemplates } from "./stretches.js";

/* Theme-Studio-Voreinstellung: null-Accent = Modus-Standard (m/f/neutral) */
export const DEFAULT_THEME_CFG = {
  accent: null, // null | "mono" | Hex
  gradient: true,
  glow: true,
  glass: false,
  radius: "round", // round | sharp
  motion: "full", // full | reduced
  density: "cozy", // cozy | compact
  font: "grotesk", // grotesk | mono
};

export const DEFAULT_SETTINGS = {
  autoRest: true,
  restSeconds: 90,
  sound: true,
  haptics: true,
  weeklyGoal: 3,
  /** Ziel-Dauer einer Session in Minuten; 0 = ganzer Plan */
  sessionMinutes: 45,
  theme: "dark",
  waterGoal: 0, // 0 = aus, sonst ml/Tag
  kcalGoal: 0, // 0 = aus, sonst kcal/Tag
  themeCfg: { ...DEFAULT_THEME_CFG },
};

export const DEFAULT_PROFILE = {
  heightCm: "",
  weightKg: "",
  weightLog: [],
  gender: null,
  age: "",
  goal: null,
  level: null,
  daysPerWeek: 3,
  equipment: [],
  duration: 45,
  // Onboarding-Wizard deaktiviert — App startet direkt mit Clever-Fit-Plänen.
  onboarded: true,
};

// Altes Split-System -> dynamische Pläne (Clever Fit OK/UK + optional custom names)
export function migrateToPlans(parsed, settings) {
  if (parsed.plans && parsed.library) return parsed;
  const library = getCatalog().map((e) => ({ ...e }));
  (parsed.exercises || []).forEach((name) => {
    if (!library.some((l) => l.name === name)) {
      library.push({
        id: "custom-" + uid(),
        name,
        muscle: null,
        zone: null,
        zone2: null,
        equipment: "",
        custom: true,
      });
    }
  });
  const rest = settings?.restSeconds || 90;
  const [okPlan, ukPlan] = buildCleverFitPlans(rest);
  const split = parsed.split;
  if (split?.mode === "week" && split.days) {
    Object.entries(split.days).forEach(([day, unit]) => {
      if (unit === "ok" && !okPlan.days.includes(day)) okPlan.days.push(day);
      else if (unit === "uk" && !ukPlan.days.includes(day)) ukPlan.days.push(day);
      else if (unit === "gk" && !okPlan.days.includes(day)) okPlan.days.push(day);
    });
  }
  return {
    ...parsed,
    library,
    plans: [okPlan, ukPlan],
    activePlanId: okPlan.id,
  };
}

// Overlay user favorites/customs onto the full static catalog (1.3k+).
export function mergeLibrary(existing) {
  return mergeUserLibrary(existing);
}

/** Ensure Clever Fit OK/UK presets exist (idempotent by preset/id). */
export function ensureCleverFitPlans(plans, restSeconds = 90) {
  const list = Array.isArray(plans) ? [...plans] : [];
  const presets = buildCleverFitPlans(restSeconds);
  for (const p of presets) {
    const idx = list.findIndex(
      (x) => x.id === p.id || x.preset === p.preset,
    );
    if (idx === -1) {
      list.push(p);
    } else {
      // Keep user edits (exercises, days, notes). Only refresh display name
      // if still the old branded default — never wipe workout content on load.
      const existing = list[idx];
      const legacyName =
        existing.name === "Oberkörper (Clever Fit)" ||
        existing.name === "Unterkörper (Clever Fit)";
      list[idx] = {
        ...existing,
        name: legacyName ? p.name : existing.name || p.name,
        description: existing.description || p.description,
        preset: p.preset || existing.preset,
      };
    }
  }
  return list;
}

// Frischer Zustand: volle Bibliothek + Clever Fit OK/UK als Standardpläne.
export function freshState() {
  const settings = { ...DEFAULT_SETTINGS };
  const plans = buildCleverFitPlans(settings.restSeconds);
  return {
    logs: [],
    library: getCatalog().map((e) => ({ ...e })),
    plans,
    activePlanId: plans[0]?.id || null,
    /** Wiederverwendbare Warm-up- / Cool-down-Vorlagen */
    prepTemplates: [],
    wellness: {},
    profile: { ...DEFAULT_PROFILE },
    settings,
    /** Übungen zum Nachholen (wegen Dauer-Kappung o. manuell gemerkt) */
    carryOver: [],
    /** Abgeschlossene Einheiten: { date, seconds, sets, volume, prs } */
    sessions: [],
  };
}

// Kompletter Ladepfad: parse -> Defaults -> Migrationen
export function hydrate(parsed) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings || {}),
    themeCfg: { ...DEFAULT_THEME_CFG, ...(parsed.settings?.themeCfg || {}) },
  };
  const migrated = migrateToPlans(parsed, settings);
  let plans = ensureCleverFitPlans(migrated.plans, settings.restSeconds);
  const { plans: plansWithPrep, prepTemplates } = migratePlansToPrepTemplates(
    plans,
    parsed.prepTemplates || migrated.prepTemplates || [],
  );
  plans = plansWithPrep;
  const activePlanId =
    migrated.activePlanId && plans.some((p) => p.id === migrated.activePlanId)
      ? migrated.activePlanId
      : plans[0]?.id || null;
  return {
    ...migrated,
    library: mergeLibrary(migrated.library),
    plans,
    prepTemplates,
    activePlanId,
    wellness: migrated.wellness || {},
    carryOver: Array.isArray(migrated.carryOver) ? migrated.carryOver : [],
    sessions: Array.isArray(migrated.sessions) ? migrated.sessions : [],
    profile: {
      ...DEFAULT_PROFILE,
      ...(migrated.profile || {}),
      // Always skip the onboarding wizard (Clever Fit presets are enough).
      onboarded: true,
    },
    settings,
  };
}

/** Persist only customs + favorite flags (catalog is rebuilt on load). */
export function prepareForStorage(state) {
  return {
    ...state,
    library: slimLibraryForStorage(state.library),
  };
}
