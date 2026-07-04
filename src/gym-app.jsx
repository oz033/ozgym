import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Dumbbell,
  Plus,
  TrendingUp,
  Timer as TimerIcon,
  Home as HomeIcon,
  Play,
  RotateCcw,
  Flame,
  X,
  Check,
  CalendarDays,
  Moon,
  Minus,
  Trophy,
  History,
  Scale,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Zap,
  Award,
  Target,
  User,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const STORAGE_KEY = "ironlog:state";

const EXERCISE_META = {
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

const DEFAULT_EXERCISES = Object.keys(EXERCISE_META);

const WEEKDAYS = [
  { key: "mon", label: "Montag", short: "Mo" },
  { key: "tue", label: "Dienstag", short: "Di" },
  { key: "wed", label: "Mittwoch", short: "Mi" },
  { key: "thu", label: "Donnerstag", short: "Do" },
  { key: "fri", label: "Freitag", short: "Fr" },
  { key: "sat", label: "Samstag", short: "Sa" },
  { key: "sun", label: "Sonntag", short: "So" },
];

const UNIT_LABEL = {
  rest: "Ruhetag",
  ok: "Oberkörper",
  uk: "Unterkörper",
  gk: "Ganzkörper",
};

const EMPTY_DAYS = {
  mon: "rest",
  tue: "rest",
  wed: "rest",
  thu: "rest",
  fri: "rest",
  sat: "rest",
  sun: "rest",
};
const DEFAULT_SPLIT = {
  mode: "week",
  days: { ...EMPTY_DAYS },
  interval: { every: 2, unit: "ok", anchor: null },
};

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = () => localISO(new Date());
const todayKey = () =>
  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};
const round1 = (n) => Math.round(n * 10) / 10;
const e1rm = (weight, reps) => (reps >= 1 ? weight * (1 + reps / 30) : 0);

/* ---------------- Sounds (Web Audio, keine Dateien nötig) ---------------- */
let sharedAudioCtx = null;
function playSound(type, enabled = true) {
  if (!enabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const tone = (freq, start, dur, wave = "triangle", vol = 0.14) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    if (type === "set") {
      tone(523, 0, 0.09, "triangle", 0.12);
      tone(784, 0.07, 0.12, "triangle", 0.1);
    } else if (type === "pr") {
      tone(523, 0, 0.14);
      tone(659, 0.12, 0.14);
      tone(784, 0.24, 0.14);
      tone(1047, 0.36, 0.4, "triangle", 0.16);
    } else if (type === "timer") {
      [0, 0.22, 0.44].forEach((t) => tone(880, t, 0.18, "square", 0.15));
    } else if (type === "tap") {
      tone(440, 0, 0.05, "sine", 0.06);
    }
  } catch (e) {
    /* Audio nicht verfügbar */
  }
}

/* ---------------- Animierte Zahlen (Count-up) ---------------- */
const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function CountUp({ value, format = (v) => Math.round(v), duration = 750 }) {
  const [display, setDisplay] = useState(REDUCED_MOTION ? value : 0);
  const displayRef = useRef(REDUCED_MOTION ? value : 0);
  useEffect(() => {
    if (REDUCED_MOTION) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(display)}</>;
}

function buzz(pattern, enabled = true) {
  if (enabled && navigator.vibrate) navigator.vibrate(pattern);
}

/* ---------------- Gamification (alles aus Logs abgeleitet, kein Extra-State) ---------------- */
const ACCENT_COLORS = [
  { id: "gold", color: "#e3b23c", rgb: "227,178,60", name: "Gold" },
  { id: "volt", color: "#c8f04a", rgb: "200,240,74", name: "Volt" },
  { id: "sky", color: "#4aa8f0", rgb: "74,168,240", name: "Ozean" },
  { id: "coral", color: "#f0654a", rgb: "240,101,74", name: "Koralle" },
];

function calcStats(logs, weeklyGoal = 3) {
  const dayVolumes = {};
  let totalSets = 0;
  let totalVolume = 0;
  for (const l of logs) {
    let v = 0;
    for (const s of l.sets) v += s.reps * s.weight;
    dayVolumes[l.date] = (dayVolumes[l.date] || 0) + v;
    totalSets += l.sets.length;
    totalVolume += v;
  }
  const days = Object.keys(dayVolumes).sort();

  // Rekorde: pro Übung jeder Tag, dessen Top-Gewicht alle vorherigen übertrifft
  let prCount = 0;
  const byExercise = {};
  for (const l of logs) {
    (byExercise[l.exercise] = byExercise[l.exercise] || []).push(l);
  }
  for (const list of Object.values(byExercise)) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    let best = 0;
    for (const l of list) {
      const top = l.sets.reduce((m, s) => Math.max(m, s.weight), 0);
      if (top > best) {
        if (best > 0) prCount++;
        best = top;
      }
    }
  }

  // Wochen-Streak: aufeinanderfolgende Wochen mit >= weeklyGoal Trainingstagen
  const mondayOf = (iso) => {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return localISO(d);
  };
  const weekCounts = {};
  for (const d of days) {
    const wk = mondayOf(d);
    weekCounts[wk] = (weekCounts[wk] || 0) + 1;
  }
  const thisMonday = mondayOf(todayISO());
  const thisWeekDays = weekCounts[thisMonday] || 0;
  let streakWeeks = 0;
  let cursor = new Date(thisMonday + "T00:00:00");
  if (thisWeekDays >= weeklyGoal) streakWeeks++;
  while (true) {
    cursor.setDate(cursor.getDate() - 7);
    const key = localISO(cursor);
    if ((weekCounts[key] || 0) >= weeklyGoal) streakWeeks++;
    else break;
  }

  const xp = totalSets * 10 + days.length * 40 + prCount * 30;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpFloor = (level - 1) ** 2 * 100;
  const xpNext = level ** 2 * 100;
  const levelPct = Math.min(1, (xp - xpFloor) / (xpNext - xpFloor || 1));

  return {
    totalWorkouts: days.length,
    totalSets,
    totalVolume,
    prCount,
    thisWeekDays,
    streakWeeks,
    xp,
    level,
    xpNext,
    levelPct,
    lastDays: days.slice(-3).reverse(),
    dayVolumes,
  };
}

const BADGE_DEFS = [
  { id: "w1", name: "Erster Schritt", desc: "1. Training", icon: "🏁", check: (s) => s.totalWorkouts >= 1 },
  { id: "w10", name: "Dranbleiber", desc: "10 Trainings", icon: "🔟", check: (s) => s.totalWorkouts >= 10 },
  { id: "w50", name: "Eisenfresser", desc: "50 Trainings", icon: "🦾", check: (s) => s.totalWorkouts >= 50 },
  { id: "w100", name: "Veteran", desc: "100 Trainings", icon: "🏛️", check: (s) => s.totalWorkouts >= 100 },
  { id: "pr1", name: "Rekordjäger", desc: "1. Rekord", icon: "🏆", check: (s) => s.prCount >= 1 },
  { id: "pr10", name: "PR-Maschine", desc: "10 Rekorde", icon: "🥇", check: (s) => s.prCount >= 10 },
  { id: "v10k", name: "10 Tonnen", desc: "10.000 kg bewegt", icon: "🐘", check: (s) => s.totalVolume >= 10000 },
  { id: "v100k", name: "100 Tonnen", desc: "100.000 kg bewegt", icon: "🚛", check: (s) => s.totalVolume >= 100000 },
  { id: "s4", name: "Ein Monat", desc: "4 Wochen Serie", icon: "🔥", check: (s) => s.streakWeeks >= 4 },
  { id: "s12", name: "Ein Quartal", desc: "12 Wochen Serie", icon: "⚡", check: (s) => s.streakWeeks >= 12 },
];

function normalizeSplit(s) {
  if (!s) return { ...DEFAULT_SPLIT };
  if (s.mode) {
    return {
      mode: s.mode,
      days: { ...EMPTY_DAYS, ...(s.days || {}) },
      interval: { every: 2, unit: "ok", anchor: null, ...(s.interval || {}) },
    };
  }
  return { ...DEFAULT_SPLIT, days: { ...EMPTY_DAYS, ...s } };
}

function getTodayUnit(split) {
  const s = normalizeSplit(split);
  if (s.mode === "interval") {
    if (!s.interval.anchor) return "rest";
    const anchor = new Date(s.interval.anchor + "T00:00:00");
    const now = new Date(todayISO() + "T00:00:00");
    const diff = Math.round((now - anchor) / 86400000);
    if (diff < 0) return "rest";
    return diff % s.interval.every === 0 ? s.interval.unit : "rest";
  }
  return s.days[todayKey()] || "rest";
}

function getUnitForDate(split, date) {
  const s = normalizeSplit(split);
  if (s.mode === "interval") {
    if (!s.interval.anchor) return "rest";
    const anchor = new Date(s.interval.anchor + "T00:00:00");
    const diff = Math.round((date - anchor) / 86400000);
    if (diff < 0) return "rest";
    return diff % s.interval.every === 0 ? s.interval.unit : "rest";
  }
  const key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
  return s.days[key] || "rest";
}

function daysUntilNextTraining(split) {
  const now = new Date(todayISO() + "T00:00:00");
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const unit = getUnitForDate(split, d);
    if (unit !== "rest") return { days: i, unit };
  }
  return null;
}

const SPLIT_PRESETS = [
  {
    id: "every2ok",
    name: "Jeden 2. Tag",
    desc: "Nur Oberkörper, alle 2 Tage — Start heute",
    make: () => ({
      ...DEFAULT_SPLIT,
      mode: "interval",
      interval: { every: 2, unit: "ok", anchor: todayISO() },
    }),
    matches: (s) =>
      s.mode === "interval" &&
      s.interval.every === 2 &&
      s.interval.unit === "ok",
  },
  {
    id: "mwf",
    name: "Mo · Mi · Fr",
    desc: "3× pro Woche, Ober-/Unterkörper im Wechsel",
    make: () => ({
      ...DEFAULT_SPLIT,
      mode: "week",
      days: { ...EMPTY_DAYS, mon: "ok", wed: "uk", fri: "ok" },
    }),
    matches: (s) =>
      s.mode === "week" &&
      WEEKDAYS.every(
        (d) =>
          s.days[d.key] ===
          { ...EMPTY_DAYS, mon: "ok", wed: "uk", fri: "ok" }[d.key],
      ),
  },
  {
    id: "tts",
    name: "Di · Do · Sa",
    desc: "3× pro Woche, Ober-/Unterkörper im Wechsel",
    make: () => ({
      ...DEFAULT_SPLIT,
      mode: "week",
      days: { ...EMPTY_DAYS, tue: "ok", thu: "uk", sat: "ok" },
    }),
    matches: (s) =>
      s.mode === "week" &&
      WEEKDAYS.every(
        (d) =>
          s.days[d.key] ===
          { ...EMPTY_DAYS, tue: "ok", thu: "uk", sat: "ok" }[d.key],
      ),
  },
  {
    id: "mt",
    name: "Mo · Do",
    desc: "2× pro Woche, Ganzkörper",
    make: () => ({
      ...DEFAULT_SPLIT,
      mode: "week",
      days: { ...EMPTY_DAYS, mon: "gk", thu: "gk" },
    }),
    matches: (s) =>
      s.mode === "week" &&
      WEEKDAYS.every(
        (d) => s.days[d.key] === { ...EMPTY_DAYS, mon: "gk", thu: "gk" }[d.key],
      ),
  },
  {
    id: "4day",
    name: "Mo · Di · Do · Fr",
    desc: "4× pro Woche, 2er-Split",
    make: () => ({
      ...DEFAULT_SPLIT,
      mode: "week",
      days: { ...EMPTY_DAYS, mon: "ok", tue: "uk", thu: "ok", fri: "uk" },
    }),
    matches: (s) =>
      s.mode === "week" &&
      WEEKDAYS.every(
        (d) =>
          s.days[d.key] ===
          { ...EMPTY_DAYS, mon: "ok", tue: "uk", thu: "ok", fri: "uk" }[d.key],
      ),
  },
];

/* ---------------- Sparkline: letzte Einheiten einer Übung ---------------- */
function Sparkline({ points, w = 90, h = 32 }) {
  if (points.length < 2) return null;
  const pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const path = coords.map((c) => c.join(",")).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        className="ig-spark-line"
        points={path}
        fill="none"
        stroke={up ? "var(--plate-green)" : "var(--plate-red)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
      {coords.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === coords.length - 1 ? 2.6 : 1.6}
          fill={
            i === coords.length - 1
              ? up
                ? "var(--plate-green)"
                : "var(--plate-red)"
              : "var(--chalk-dim)"
          }
        />
      ))}
    </svg>
  );
}

/* ---------------- Muskel-Silhouette: hebt trainierte Zone hervor ---------------- */
const ZONE_LABEL = {
  shoulders: "Schultern",
  chest: "Brust",
  back: "Rücken",
  arms: "Arme",
  legs: "Beine",
  abs: "Bauch",
};

function BodySilhouette({ zone, zone2, pulseKey }) {
  const cls = (z) =>
    z === zone
      ? "ig-sil-zone primary"
      : z === zone2
        ? "ig-sil-zone secondary"
        : "ig-sil-zone";
  return (
    <svg
      key={pulseKey}
      width="56"
      height="72"
      viewBox="0 0 56 72"
      role="img"
      aria-label={
        zone
          ? `Zielmuskel: ${ZONE_LABEL[zone]}${zone2 ? `, auch ${ZONE_LABEL[zone2]}` : ""}`
          : "Körperübersicht"
      }
    >
      {/* Kopf + Hals */}
      <circle cx="28" cy="7" r="5.5" fill="var(--glass-border)" />
      <rect x="25.5" y="12" width="5" height="4" rx="2" fill="var(--glass-border)" />
      {/* Schultern */}
      <path
        d="M12 20 Q28 13 44 20 L44 24 Q28 18 12 24 Z"
        className={cls("shoulders")}
      />
      {/* Rücken (Flanken) */}
      <path d="M11 24 Q13 34 14 41 L18 41 Q16 32 16 24 Z" className={cls("back")} />
      <path d="M45 24 Q43 34 42 41 L38 41 Q40 32 40 24 Z" className={cls("back")} />
      {/* Brust */}
      <path d="M17 23 Q28 20 39 23 L38 34 Q28 37 18 34 Z" className={cls("chest")} />
      {/* Arme */}
      <path d="M8 24 Q5 32 6 44 L11 44 Q10 33 12 25 Z" className={cls("arms")} />
      <path d="M48 24 Q51 32 50 44 L45 44 Q46 33 44 25 Z" className={cls("arms")} />
      {/* Bauch */}
      <path d="M19 36 Q28 39 37 36 L36 48 Q28 50 20 48 Z" className={cls("abs")} />
      {/* Beine */}
      <path d="M19 50 Q18 60 19 70 L26 70 Q27 60 27 51 Z" className={cls("legs")} />
      <path d="M37 50 Q38 60 37 70 L30 70 Q29 60 29 51 Z" className={cls("legs")} />
    </svg>
  );
}

/* ---------------- Onboarding ---------------- */
function Onboarding({ profile, onFinish }) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(profile.gender || null);
  const [age, setAge] = useState(profile.age || "");
  const [height, setHeight] = useState(profile.heightCm || "");
  const [weight, setWeight] = useState(profile.weightKg || "");
  const [presetId, setPresetId] = useState(null);

  const profileOk =
    gender &&
    Number(age) >= 10 &&
    Number(age) <= 100 &&
    Number(height) >= 100 &&
    Number(height) <= 250 &&
    Number(weight) >= 30 &&
    Number(weight) <= 300;

  const finish = () => {
    const preset = SPLIT_PRESETS.find((p) => p.id === presetId);
    onFinish(
      {
        gender,
        age: Number(age),
        heightCm: String(height),
        weightKg: String(weight),
      },
      preset ? preset.make() : null,
    );
  };

  return (
    <div className="ig-onboarding">
      <div className="ig-onb-header">
        <Dumbbell size={28} strokeWidth={2.4} />
        <span className="ig-onb-brand">IronLog</span>
        <span className="ig-onb-sub">
          {step === 0
            ? "Erzähl uns kurz etwas über dich"
            : "Wie oft willst du trainieren?"}
        </span>
      </div>

      <div className="ig-onb-dots">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={"ig-onb-dot" + (i === step ? " active" : "")}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="ig-onb-step" key="profil">
          <div className="ig-field-label">Geschlecht</div>
          <div className="ig-onb-gender-row">
            <button
              className={"ig-onb-gender" + (gender === "f" ? " active" : "")}
              onClick={() => {
                setGender("f");
                playSound("tap");
              }}
            >
              <span className="ig-onb-gender-icon">♀</span>
              Frau
            </button>
            <button
              className={"ig-onb-gender" + (gender === "m" ? " active" : "")}
              onClick={() => {
                setGender("m");
                playSound("tap");
              }}
            >
              <span className="ig-onb-gender-icon">♂</span>
              Mann
            </button>
          </div>

          <div className="ig-onb-field-grid">
            <label className="ig-num-field">
              Alter
              <input
                className="ig-input center"
                type="number"
                inputMode="numeric"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
            <label className="ig-num-field">
              Größe (cm)
              <input
                className="ig-input center"
                type="number"
                inputMode="numeric"
                placeholder="178"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
            <label className="ig-num-field">
              Gewicht (kg)
              <input
                className="ig-input center"
                type="number"
                inputMode="decimal"
                placeholder="75"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>

          <button
            className="ig-btn-primary wide"
            disabled={!profileOk}
            onClick={() => {
              setStep(1);
              playSound("tap");
            }}
          >
            Weiter
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="ig-onb-step" key="plan">
          <div className="ig-field-label">Trainingsplan wählen</div>
          <div className="ig-preset-list">
            {SPLIT_PRESETS.map((p) => (
              <button
                key={p.id}
                className={
                  "ig-preset-card" + (presetId === p.id ? " active" : "")
                }
                onClick={() => {
                  setPresetId(p.id);
                  playSound("tap");
                }}
              >
                <span className="ig-preset-name">{p.name}</span>
                <span className="ig-preset-desc">{p.desc}</span>
                {presetId === p.id && (
                  <Check size={16} className="ig-preset-check" />
                )}
              </button>
            ))}
          </div>
          <button
            className="ig-btn-primary wide"
            disabled={!presetId}
            onClick={finish}
          >
            <Check size={16} /> Los geht's
          </button>
          <button className="ig-onb-back" onClick={() => setStep(0)}>
            Zurück
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- App shell ---------------- */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({
    exercises: DEFAULT_EXERCISES,
    logs: [],
    profile: {
      heightCm: "",
      weightKg: "",
      weightLog: [],
      gender: null,
      age: "",
      onboarded: false,
    },
    split: { ...DEFAULT_SPLIT },
    settings: {
      autoRest: true,
      restSeconds: 90,
      sound: true,
      haptics: true,
      weeklyGoal: 3,
      accent: "gold",
    },
  });
  const [tab, setTab] = useState("home");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData((prev) => ({
            ...prev,
            ...parsed,
            exercises: [
              ...DEFAULT_EXERCISES,
              ...(parsed.exercises || []).filter(
                (e) => !DEFAULT_EXERCISES.includes(e),
              ),
            ],
            profile: {
              heightCm: "",
              weightKg: "",
              weightLog: [],
              gender: null,
              age: "",
              onboarded: false,
              ...(parsed.profile || {}),
            },
            split: normalizeSplit(parsed.split),
            settings: {
              autoRest: true,
              restSeconds: 90,
              sound: true,
              haptics: true,
              weeklyGoal: 3,
              accent: "gold",
              ...(parsed.settings || {}),
            },
          }));
        }
      } catch (e) {
        /* keine gespeicherten Daten vorhanden */
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Speichern fehlgeschlagen", e);
      }
    }, 250);
  }, []);

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        const next = typeof fn === "function" ? fn(prev) : fn;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const accent =
    ACCENT_COLORS.find((a) => a.id === data.settings?.accent) ||
    ACCENT_COLORS[0];
  const accentStyle = {
    "--plate-yellow": accent.color,
    "--accent-rgb": accent.rgb,
  };

  if (!loaded) {
    return (
      <div className="ig-app" style={accentStyle}>
        <Style />
        <div className="ig-loading">
          <Dumbbell size={28} />
          <span>Lade Training …</span>
        </div>
      </div>
    );
  }

  if (!data.profile.onboarded) {
    return (
      <div className="ig-app" style={accentStyle}>
        <Style />
        <div className="ig-phone">
          <Onboarding
            profile={data.profile}
            onFinish={(profilePatch, split) => {
              playSound("pr", data.settings?.sound !== false);
              update((prev) => {
                const today = todayISO();
                const w = Number(profilePatch.weightKg);
                const rest = (prev.profile.weightLog || []).filter(
                  (e) => e.date !== today,
                );
                const weightLog =
                  w > 0
                    ? [...rest, { date: today, kg: w }].sort((a, b) =>
                        a.date.localeCompare(b.date),
                      )
                    : prev.profile.weightLog || [];
                return {
                  ...prev,
                  profile: {
                    ...prev.profile,
                    ...profilePatch,
                    weightLog,
                    onboarded: true,
                  },
                  split: split || prev.split,
                };
              });
            }}
          />
        </div>
      </div>
    );
  }

  const soundOn = data.settings?.sound !== false;
  const goTo = (t) => {
    setTab(t);
    playSound("tap", soundOn);
    buzz(15, data.settings?.haptics !== false);
  };

  return (
    <div className="ig-app" style={accentStyle}>
      <Style />
      <div className="ig-phone">
        <header className="ig-header">
          <div className="ig-brand">
            <Dumbbell size={20} strokeWidth={2.4} />
            <span>IronLog</span>
          </div>
          <button
            className="ig-mute-btn"
            onClick={() =>
              update((prev) => ({
                ...prev,
                settings: { ...prev.settings, sound: !prev.settings?.sound },
              }))
            }
            aria-label={soundOn ? "Sound stummschalten" : "Sound einschalten"}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <span className="ig-date">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
          </span>
        </header>

        <main className="ig-main">
          {tab === "home" && (
            <DashboardTab data={data} goTo={goTo} />
          )}
          {tab === "workout" && (
            <LogTab data={data} update={update} goTo={goTo} />
          )}
          {tab === "plan" && <PlanTab data={data} update={update} />}
          {tab === "progress" && <ProgressTab data={data} />}
          {tab === "profile" && <BmiTab data={data} update={update} />}
        </main>

        <nav className="ig-tabbar">
          <TabBtn
            active={tab === "home"}
            onClick={() => goTo("home")}
            icon={<HomeIcon size={20} />}
            label="Home"
          />
          <TabBtn
            active={tab === "workout"}
            onClick={() => goTo("workout")}
            icon={<Dumbbell size={20} />}
            label="Training"
          />
          <TabBtn
            active={tab === "plan"}
            onClick={() => goTo("plan")}
            icon={<CalendarDays size={20} />}
            label="Plan"
          />
          <TabBtn
            active={tab === "progress"}
            onClick={() => goTo("progress")}
            icon={<TrendingUp size={20} />}
            label="Verlauf"
          />
          <TabBtn
            active={tab === "profile"}
            onClick={() => goTo("profile")}
            icon={<User size={20} />}
            label="Profil"
          />
        </nav>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      className={"ig-tab" + (active ? " active" : "")}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ---------------- Streak Calendar ---------------- */
function StreakCalendar({ logs, today, onClose }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);

  const now = new Date(today + "T00:00:00");
  now.setMonth(now.getMonth() + monthOffset);
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = lastDay.getDate();

  // Build cells
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayLogs = logs.filter((l) => l.date === dateStr);
    const isToday = dateStr === today;
    cells.push({
      date: dateStr,
      day: d,
      trained: dayLogs.length > 0,
      dayLogs,
      isToday,
    });
  }

  const selectedLogs = selectedDate
    ? logs.filter((l) => l.date === selectedDate)
    : [];

  // Streak calculation (current + best)
  const logDates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date(today + "T00:00:00");
  while (true) {
    const ds = localISO(d);
    if (logDates.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  const sortedDates = [...logDates].sort();
  let bestStreak = 0,
    cur = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      cur = 1;
      continue;
    }
    const prev = new Date(sortedDates[i - 1] + "T00:00:00");
    const curr = new Date(sortedDates[i] + "T00:00:00");
    if ((curr - prev) / 86400000 === 1) cur++;
    else {
      bestStreak = Math.max(bestStreak, cur);
      cur = 1;
    }
  }
  bestStreak = Math.max(bestStreak, cur);

  return (
    <div className="ig-streak-card">
      <div className="ig-streak-header">
        <span className="ig-streak-title">Trainings-Kalender</span>
        <button
          className="ig-icon-btn ghost"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X size={14} />
        </button>
      </div>

      <div className="ig-streak-stats">
        <div className="ig-streak-stat">
          <span className="ig-streak-num">{streak}</span>
          <span className="ig-streak-label">Tage Serie</span>
        </div>
        <div className="ig-streak-stat">
          <span className="ig-streak-num">{bestStreak}</span>
          <span className="ig-streak-label">Beste Serie</span>
        </div>
        <div className="ig-streak-stat">
          <span className="ig-streak-num">{logDates.size}</span>
          <span className="ig-streak-label">Tage gesamt</span>
        </div>
      </div>

      {/* Month navigation */}
      <div className="ig-cal-month-nav">
        <button
          className="ig-icon-btn ghost"
          onClick={() => setMonthOffset((o) => o - 1)}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="ig-cal-month-label">
          {monthNames[month]} {year}
        </span>
        <button
          className="ig-icon-btn ghost"
          onClick={() => setMonthOffset((o) => o + 1)}
          aria-label="Nächster Monat"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="ig-cal-grid">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((wd) => (
          <div key={wd} className="ig-cal-wd">
            {wd}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`} className="ig-cal-cell empty" />;
          return (
            <button
              key={c.date}
              className={
                "ig-cal-cell" +
                (c.trained ? " trained" : "") +
                (c.isToday ? " today" : "") +
                (selectedDate === c.date ? " selected" : "")
              }
              onClick={() =>
                setSelectedDate(selectedDate === c.date ? null : c.date)
              }
            >
              <span className="ig-cal-day">{c.day}</span>
              {c.trained && <span className="ig-cal-dot" />}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="ig-cal-detail">
          {selectedLogs.length === 0 ? (
            <p className="ig-empty">Keine Übungen an diesem Tag</p>
          ) : (
            selectedLogs.map((l) => (
              <div key={l.id || l.exercise} className="ig-cal-ex-row">
                <span className="ig-cal-ex-name">{l.exercise}</span>
                <div className="ig-cal-sets-row">
                  {l.sets.map((s, si) => (
                    <span key={si} className="ig-badge dim mono">
                      {s.reps} × {s.weight} kg
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="ig-cal-vol">
            Volumen:{" "}
            {Math.round(
              selectedLogs.reduce(
                (v, l) =>
                  v + l.sets.reduce((sv, s) => sv + s.reps * s.weight, 0),
                0,
              ),
            )}{" "}
            kg
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function DashboardTab({ data, goTo }) {
  const stats = useMemo(
    () => calcStats(data.logs, data.settings?.weeklyGoal || 3),
    [data.logs, data.settings?.weeklyGoal],
  );
  const todayUnit = getTodayUnit(data.split);
  const today = todayISO();
  const todayVolume = stats.dayVolumes[today] || 0;
  const weeklyGoal = data.settings?.weeklyGoal || 3;
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const earnedBadges = BADGE_DEFS.filter((b) => b.check(stats));
  const trainedToday = !!stats.dayVolumes[today];

  if (stats.totalWorkouts === 0) {
    return (
      <div className="ig-tabpane">
        <div className="ig-card ig-hero ig-empty-hero">
          <span className="ig-empty-illu" aria-hidden="true">
            🏋️
          </span>
          <span className="ig-hero-greeting">{greeting}!</span>
          <span className="ig-hero-plan">
            Dein erstes Workout wartet. Nach der ersten Einheit siehst du hier
            deinen Fortschritt, deine Serie und deine Rekorde.
          </span>
          <button
            className="ig-btn-primary wide xl"
            onClick={() => goTo("workout")}
          >
            <Play size={18} /> Erstes Workout starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ig-tabpane">
      <div className="ig-card ig-hero">
        <span className="ig-hero-greeting">{greeting} 💪</span>
        <span className="ig-hero-plan">
          {trainedToday
            ? "Training erledigt — stark!"
            : todayUnit === "rest"
              ? "Heute ist Ruhetag. Regeneration zählt auch."
              : `Heute laut Plan: ${UNIT_LABEL[todayUnit]}${todayUnit !== "gk" ? "-Einheit" : ""}`}
        </span>
        {todayUnit !== "rest" && !trainedToday && (
          <button className="ig-btn-primary wide" onClick={() => goTo("workout")}>
            <Play size={16} /> Training starten
          </button>
        )}
        {trainedToday && (
          <button className="ig-btn-primary wide ghosted" onClick={() => goTo("workout")}>
            <Plus size={16} /> Weiteren Satz loggen
          </button>
        )}
      </div>

      <div className="ig-card ig-level-card">
        <div className="ig-level-head">
          <span className="ig-level-badge">
            <Zap size={14} /> Level {stats.level}
          </span>
          <span className="ig-level-xp mono">
            {stats.xp} / {stats.xpNext} XP
          </span>
        </div>
        <div className="ig-level-track">
          <div
            className="ig-level-fill"
            style={{ width: `${stats.levelPct * 100}%` }}
          />
        </div>
      </div>

      <div className="ig-dash-grid">
        <div className="ig-card ig-dash-stat">
          <Flame size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp value={stats.streakWeeks} />
          </span>
          <span className="ig-dash-label">
            {stats.streakWeeks === 0
              ? "Starte deine Serie!"
              : stats.streakWeeks === 1
                ? "Woche Serie"
                : "Wochen Serie"}
          </span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Target size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            {stats.thisWeekDays >= weeklyGoal
              ? "✓"
              : `${stats.thisWeekDays}/${weeklyGoal}`}
          </span>
          <span className="ig-dash-label">
            {stats.thisWeekDays >= weeklyGoal
              ? "Wochenziel erreicht! 🎉"
              : weeklyGoal - stats.thisWeekDays === 1
                ? "Noch 1 Training bis zum Ziel"
                : "Wochenziel"}
          </span>
          <div className="ig-mini-track">
            <div
              className="ig-mini-fill"
              style={{
                width: `${Math.min(1, stats.thisWeekDays / weeklyGoal) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="ig-card ig-dash-stat">
          <Scale size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp
              value={todayVolume}
              format={(v) =>
                todayVolume >= 1000
                  ? `${round1(v / 1000)}t`
                  : `${Math.round(v)}`
              }
            />
          </span>
          <span className="ig-dash-label">
            {todayVolume >= 1000 ? "Volumen heute" : "kg heute"}
          </span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Trophy size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp value={stats.prCount} />
          </span>
          <span className="ig-dash-label">Rekorde</span>
        </div>
      </div>

      {stats.lastDays.length > 0 && (
        <div className="ig-card">
          <div className="ig-field-label">
            <History size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Letzte Trainings
          </div>
          <div className="ig-recent-list">
            {stats.lastDays.map((d) => {
              const dayLogs = data.logs.filter((l) => l.date === d);
              const sets = dayLogs.reduce((n, l) => n + l.sets.length, 0);
              const vol = stats.dayVolumes[d] || 0;
              return (
                <button
                  key={d}
                  className="ig-recent-row"
                  onClick={() => goTo("progress")}
                >
                  <span className="ig-recent-date">{fmtDate(d)}</span>
                  <span className="ig-recent-meta">
                    {dayLogs.length} Übungen · {sets} Sätze ·{" "}
                    {Math.round(vol)} kg
                  </span>
                  <ChevronRight size={15} className="ig-recent-chev" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {earnedBadges.length > 0 && (
        <div className="ig-card">
          <div className="ig-field-label">
            <Award size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Abzeichen ({earnedBadges.length}/{BADGE_DEFS.length})
          </div>
          <div className="ig-badge-row">
            {earnedBadges.slice(-4).map((b) => (
              <div className="ig-badge-chip" key={b.id} title={b.desc}>
                <span className="ig-badge-icon">{b.icon}</span>
                <span className="ig-badge-name">{b.name}</span>
              </div>
            ))}
            <button
              className="ig-badge-more"
              onClick={() => goTo("progress")}
              aria-label="Alle Abzeichen ansehen"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Home / Log tab ---------------- */
function LogTab({ data, update, goTo }) {
  const todayUnit = getTodayUnit(data.split);
  const today = todayISO();
  const [active, setActive] = useState(false);
  const [showStreak, setShowStreak] = useState(false);

  const queue = useMemo(() => {
    const group =
      todayUnit === "ok"
        ? "Oberkörper"
        : todayUnit === "uk"
          ? "Unterkörper"
          : null;
    const meta = data.exercises.filter((e) => EXERCISE_META[e]);
    const custom = data.exercises.filter((e) => !EXERCISE_META[e]);
    const pick = group
      ? meta.filter((e) => EXERCISE_META[e].group === group)
      : meta;
    return [
      ...pick.sort(
        (a, b) =>
          (EXERCISE_META[a].group || "").localeCompare(
            EXERCISE_META[b].group || "",
          ) || (EXERCISE_META[a].order || 99) - (EXERCISE_META[b].order || 99),
      ),
      ...custom,
    ];
  }, [data.exercises, todayUnit]);

  const setsToday = useMemo(() => {
    const map = {};
    data.logs
      .filter((l) => l.date === today)
      .forEach((l) => {
        map[l.exercise] = (map[l.exercise] || 0) + l.sets.length;
      });
    return map;
  }, [data.logs, today]);

  const sparkByExercise = useMemo(() => {
    const byEx = {};
    data.logs.forEach((l) => {
      (byEx[l.exercise] = byEx[l.exercise] || []).push(l);
    });
    const out = {};
    Object.entries(byEx).forEach(([ex, list]) => {
      out[ex] = list
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-5)
        .map((l) => l.sets.reduce((m, s) => Math.max(m, s.weight), 0))
        .filter((v) => v > 0);
    });
    return out;
  }, [data.logs]);

  const todayVolume = useMemo(
    () =>
      data.logs
        .filter((l) => l.date === today)
        .reduce(
          (v, l) => v + l.sets.reduce((sv, s) => sv + s.reps * s.weight, 0),
          0,
        ),
    [data.logs, today],
  );

  const doneExercises = queue.filter(
    (e) => (setsToday[e] || 0) >= WO_TARGET_SETS,
  ).length;

  const restCountdown = useMemo(
    () => daysUntilNextTraining(data.split),
    [data.split],
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (todayUnit !== "rest") return;
    const iv = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(iv);
  }, [todayUnit]);
  const countdown = useMemo(() => {
    if (todayUnit !== "rest" || !restCountdown) return null;
    const target = new Date(today + "T00:00:00");
    target.setDate(target.getDate() + restCountdown.days);
    const ms = target.getTime() - nowTick;
    if (ms <= 0) return null;
    const totalH = Math.floor(ms / 3600000);
    return {
      days: Math.floor(totalH / 24),
      hours: totalH % 24,
      unit: restCountdown.unit,
      weekday: target.toLocaleDateString("de-DE", { weekday: "long" }),
    };
  }, [todayUnit, restCountdown, today, nowTick]);

  const soundOn = data.settings?.sound !== false;
  const hapticsOn = data.settings?.haptics !== false;

  return (
    <div className="ig-tabpane">
      {todayUnit !== "rest" ? (
        <button
          className="ig-plan-banner"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
        >
          <CalendarDays size={16} />
          <span>
            Heute laut Plan:{" "}
            <strong>
              {UNIT_LABEL[todayUnit]}
              {todayUnit !== "gk" ? " Einheit" : ""}
            </strong>
          </span>
          <ChevronRight
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
          />
        </button>
      ) : countdown ? (
        <button
          className="ig-card ig-rest-card"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
        >
          <Moon size={22} className="ig-rest-icon" />
          <div className="ig-rest-body">
            <span className="ig-rest-title">
              Nächstes Training: {countdown.weekday} ·{" "}
              {UNIT_LABEL[countdown.unit]}
            </span>
            <span className="ig-rest-count mono">
              {countdown.days > 0 &&
                `${countdown.days} ${countdown.days === 1 ? "Tag" : "Tage"} `}
              {countdown.hours} Std
            </span>
            <span className="ig-rest-sub">
              Zeit zur Regeneration — dein Körper baut jetzt Muskeln auf.
            </span>
          </div>
          <ChevronRight
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
          />
        </button>
      ) : (
        <button
          className="ig-plan-banner rest"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
        >
          <Moon size={16} />
          <span>Heute laut Plan: Ruhetag — Regeneration zählt auch.</span>
          <ChevronRight
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
          />
        </button>
      )}

      {showStreak && (
        <StreakCalendar
          logs={data.logs}
          today={today}
          onClose={() => setShowStreak(false)}
        />
      )}

      <div className="ig-card">
        <div className="ig-field-label">
          {doneExercises >= queue.length && queue.length > 0
            ? "Alles geschafft — starke Leistung! 💪"
            : queue.length - doneExercises === 1 && doneExercises > 0
              ? "Fast geschafft — nur noch eine Übung"
              : queue.length - doneExercises === 2 && doneExercises > 0
                ? "Fast geschafft — nur noch zwei Übungen"
                : `Heutiges Workout · ${queue.length} Übungen`}
        </div>
        <ul className="ig-queue-list">
          {queue.map((e) => {
            const done = (setsToday[e] || 0) >= WO_TARGET_SETS;
            const partial = !done && (setsToday[e] || 0) > 0;
            return (
              <li
                key={e}
                className={
                  "ig-queue-row" +
                  (done ? " done" : "") +
                  (partial ? " partial" : "")
                }
              >
                <span className="ig-queue-dot">
                  {done ? "✓" : partial ? "◐" : "○"}
                </span>
                <span className="ig-queue-name">{e}</span>
                {(sparkByExercise[e] || []).length >= 2 && (
                  <Sparkline points={sparkByExercise[e]} w={54} h={20} />
                )}
                <span className="ig-queue-meta mono">
                  {setsToday[e] || 0}/{WO_TARGET_SETS}
                </span>
              </li>
            );
          })}
        </ul>
        {todayVolume > 0 && (
          <span className="ig-queue-vol">
            Heute bewegt: <strong>{Math.round(todayVolume)} kg</strong>
          </span>
        )}
      </div>

      {doneExercises >= queue.length && queue.length > 0 ? (
        <div className="ig-card ig-done-note">
          <span className="ig-done-note-icon">🎉</span>
          <span>
            Training für heute komplett. Gönn dir die Pause — morgen geht's
            weiter!
          </span>
        </div>
      ) : (
        <button
          className="ig-btn-primary wide xl"
          disabled={queue.length === 0}
          onClick={() => {
            setActive(true);
            playSound("pr", soundOn);
            buzz([40, 30, 40], hapticsOn);
          }}
        >
          <Play size={20} />
          {doneExercises > 0 ? "Workout fortsetzen" : "Workout starten"}
        </button>
      )}

      {active && (
        <WorkoutMode
          data={data}
          update={update}
          queue={queue}
          onExit={() => setActive(false)}
          onFinish={() => {
            setActive(false);
            if (goTo) goTo("home");
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Fullscreen Workout Mode ---------------- */
const WO_TARGET_SETS = 3;

const MOTIVATION_POOL = [
  "👏 Stark gemacht — weiter so.",
  "⚡ Perfektes Tempo.",
  "🔥 Jede Wiederholung zählt.",
  "💪 Sauber durchgezogen.",
];

function WorkoutMode({ data, update, queue, onExit, onFinish }) {
  const today = todayISO();
  const soundOn = data.settings?.sound !== false;
  const hapticsOn = data.settings?.haptics !== false;
  const restSeconds = data.settings?.restSeconds || 90;

  const setsFor = useCallback(
    (ex) =>
      data.logs
        .filter((l) => l.date === today && l.exercise === ex)
        .reduce((n, l) => n + l.sets.length, 0),
    [data.logs, today],
  );

  const firstOpen = queue.findIndex((e) => setsFor(e) < WO_TARGET_SETS);
  const [idx, setIdx] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [phase, setPhase] = useState(
    firstOpen === -1 ? "done" : "lift",
  ); // lift | rest | go | done
  const [restLeft, setRestLeft] = useState(restSeconds);
  const [restTotal, setRestTotal] = useState(restSeconds);
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef(null);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);

  const [showSwipeHint, setShowSwipeHint] = useState(
    () => !localStorage.getItem("ironlog:swipehint") && queue.length > 1,
  );
  useEffect(() => {
    if (!showSwipeHint) return;
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      try {
        localStorage.setItem("ironlog:swipehint", "1");
      } catch (e) {
        /* egal */
      }
    }, 4500);
    return () => clearTimeout(t);
  }, [showSwipeHint]);

  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(iv);
  }, []);

  const sessionRef = useRef({ sets: 0, volume: 0, prs: 0, records: [], zones: new Set() });

  const exercise = queue[idx] || "";
  const meta = EXERCISE_META[exercise];
  const doneCount = setsFor(exercise);
  const isLast = idx === queue.length - 1;

  const logsForExercise = useMemo(
    () => data.logs.filter((l) => l.exercise === exercise),
    [data.logs, exercise],
  );
  const lastSession = useMemo(
    () =>
      logsForExercise
        .filter((l) => l.date !== today)
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null,
    [logsForExercise, today],
  );
  const bestBefore = useMemo(() => {
    let best = 0;
    logsForExercise
      .filter((l) => l.date !== today)
      .forEach((l) =>
        l.sets.forEach((s) => {
          if (s.weight > best) best = s.weight;
        }),
      );
    return best;
  }, [logsForExercise, today]);
  // Eingaben bei Übungswechsel aus letzter Einheit vorbelegen
  useEffect(() => {
    const top = lastSession?.sets[lastSession.sets.length - 1];
    if (top) {
      setWeight(top.weight);
      setReps(top.reps);
    } else {
      setWeight(20);
      setReps(10);
    }
  }, [exercise]); // eslint-disable-line

  const milestone = useMemo(() => {
    if (doneCount > 0 && doneCount < WO_TARGET_SETS) {
      const left = WO_TARGET_SETS - doneCount;
      return `⚡ Noch ${left} ${left === 1 ? "Satz" : "Sätze"} bis Tagesziel`;
    }
    const current = Math.max(bestBefore, Number(weight) || 0);
    if (bestBefore > 0 && Number(weight) >= bestBefore) {
      return `🏆 Rekord möglich — Bestwert ist ${bestBefore} kg`;
    }
    if (current > 0) {
      const stepKg = current < 100 ? 10 : 25;
      const next = Math.ceil((current + 0.01) / stepKg) * stepKg;
      return `🔥 Noch ${round1(next - current)} kg bis ${next} kg`;
    }
    return null;
  }, [bestBefore, weight, doneCount]);

  const [feedback, setFeedback] = useState(null);

  const step = (setter, current, delta, min) =>
    setter(round1(Math.max(min, (Number(current) || 0) + delta)));

  const advance = useCallback(() => {
    // Nach Pause: nächster Satz oder nächste offene Übung
    const currentDone = setsFor(exercise) >= WO_TARGET_SETS;
    if (!currentDone) {
      setPhase("lift");
      return;
    }
    const nextIdx = queue.findIndex(
      (e, i) => i > idx && setsFor(e) < WO_TARGET_SETS,
    );
    const anyOpen = queue.findIndex((e) => setsFor(e) < WO_TARGET_SETS);
    if (nextIdx !== -1) {
      setIdx(nextIdx);
      setPhase("lift");
    } else if (anyOpen !== -1) {
      setIdx(anyOpen);
      setPhase("lift");
    } else {
      setPhase("done");
    }
  }, [exercise, idx, queue, setsFor]);

  // Rest-Countdown
  useEffect(() => {
    if (phase !== "rest") return;
    const iv = setInterval(() => {
      setRestLeft((l) => {
        if (l <= 1) {
          clearInterval(iv);
          playSound("timer", soundOn);
          buzz([200, 100, 200], hapticsOn);
          setPhase("go");
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, soundOn, hapticsOn]);

  // "💪 Weiter!"-Moment, dann automatisch weiter
  useEffect(() => {
    if (phase !== "go") return;
    const t = setTimeout(advance, 1300);
    return () => clearTimeout(t);
  }, [phase, advance]);

  const completeSet = () => {
    const w = Number(weight);
    const r = Number(reps);
    if (!exercise || !w || !r) return;
    const isPr = w > bestBefore && bestBefore > 0;
    update((prev) => {
      const logs = [...prev.logs];
      const li = logs.findIndex(
        (l) => l.exercise === exercise && l.date === today,
      );
      if (li >= 0)
        logs[li] = { ...logs[li], sets: [...logs[li].sets, { reps: r, weight: w }] };
      else logs.push({ id: Date.now(), exercise, date: today, sets: [{ reps: r, weight: w }] });
      return { ...prev, logs };
    });
    const s = sessionRef.current;
    s.sets += 1;
    s.volume += w * r;
    if (meta?.zone) s.zones.add(meta.zone);
    if (meta?.zone2) s.zones.add(meta.zone2);
    if (isPr) {
      s.prs += 1;
      s.records.push({ exercise, weight: w });
      playSound("pr", soundOn);
      buzz([80, 60, 80], hapticsOn);
    } else {
      playSound("set", soundOn);
      buzz(40, hapticsOn);
    }
    const willBeDone = doneCount + 1 >= WO_TARGET_SETS;
    const openAfter = queue.filter(
      (e) => (e === exercise ? doneCount + 1 : setsFor(e)) < WO_TARGET_SETS,
    ).length;

    // Coach-Feedback für die Pause
    const lastTop = lastSession
      ? lastSession.sets.reduce((m, x) => Math.max(m, x.weight), 0)
      : 0;
    const setsLeft = WO_TARGET_SETS - (doneCount + 1);
    let fb;
    if (isPr) fb = `🏆 Neuer Rekord — ${w} kg!`;
    else if (lastTop > 0 && w > lastTop) fb = "🔥 Stärker als letzte Woche!";
    else if (willBeDone && openAfter === 1)
      fb = "💪 Stark! Nur noch eine Übung.";
    else if (willBeDone) fb = `👏 ${exercise} erledigt!`;
    else if (setsLeft === 1) fb = "⚡ Stark gemacht — noch ein Satz.";
    else fb = MOTIVATION_POOL[s.sets % MOTIVATION_POOL.length];
    setFeedback(fb);

    if (willBeDone && openAfter === 0) {
      setPhase("done");
      playSound("pr", soundOn);
    } else {
      setRestTotal(restSeconds);
      setRestLeft(restSeconds);
      setPhase("rest");
    }
  };

  // Letzten Satz zurücknehmen (Vertipper-Korrektur in der Pause)
  const undoLastSet = () => {
    const w = Number(weight);
    const r = Number(reps);
    update((prev) => {
      const logs = prev.logs
        .map((l) =>
          l.exercise === exercise && l.date === today
            ? { ...l, sets: l.sets.slice(0, -1) }
            : l,
        )
        .filter((l) => l.sets.length > 0);
      return { ...prev, logs };
    });
    const s = sessionRef.current;
    s.sets = Math.max(0, s.sets - 1);
    s.volume = Math.max(0, s.volume - w * r);
    const lastRec = s.records[s.records.length - 1];
    if (lastRec && lastRec.exercise === exercise && lastRec.weight === w) {
      s.records.pop();
      s.prs = Math.max(0, s.prs - 1);
    }
    setFeedback(null);
    setPhase("lift");
    playSound("tap", soundOn);
    buzz(20, hapticsOn);
  };

  // Swipe (nur beim Heben)
  const onPointerDown = (e) => {
    if (phase !== "lift") return;
    dragRef.current = { x: e.clientX, active: true };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current?.active) return;
    setDragX(e.clientX - dragRef.current.x);
  };
  const onPointerUp = () => {
    if (!dragRef.current?.active) return;
    const dx = dragX;
    dragRef.current.active = false;
    setDragX(0);
    if (dx < -60 && idx < queue.length - 1) {
      setIdx(idx + 1);
      playSound("tap", soundOn);
      setShowSwipeHint(false);
    } else if (dx > 60 && idx > 0) {
      setIdx(idx - 1);
      playSound("tap", soundOn);
      setShowSwipeHint(false);
    }
  };

  // Nächste offene Übung (für Coach-Karte in der Pause)
  const nextUp = useMemo(() => {
    const currentDone = setsFor(exercise) >= WO_TARGET_SETS;
    if (!currentDone) return null;
    return (
      queue.find((e, i) => i > idx && setsFor(e) < WO_TARGET_SETS) ||
      queue.find((e) => setsFor(e) < WO_TARGET_SETS) ||
      null
    );
  }, [queue, idx, exercise, setsFor]);

  const totalSetsDone = queue.reduce(
    (n, e) => n + Math.min(setsFor(e), WO_TARGET_SETS),
    0,
  );
  const totalPct = queue.length
    ? totalSetsDone / (queue.length * WO_TARGET_SETS)
    : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  /* ---- Abschluss-Screen ---- */
  if (phase === "done") {
    const s = sessionRef.current;
    const xp = s.sets * 10 + s.prs * 30;
    const stats = calcStats(data.logs, data.settings?.weeklyGoal || 3);
    return (
      <div className="ig-wo ig-wo-done">
        <div className="ig-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="ig-confetti-bit"
              style={{
                left: `${(i * 41) % 100}%`,
                animationDelay: `${(i % 8) * 0.18}s`,
                animationDuration: `${2.2 + (i % 5) * 0.35}s`,
              }}
            >
              {["🎉", "💪", "⭐", "🔥"][i % 4]}
            </span>
          ))}
        </div>
        <div className="ig-wo-done-body">
          <span className="ig-wo-done-icon">🏆</span>
          <h2 className="ig-wo-done-title">Workout abgeschlossen!</h2>
          <div className="ig-dash-grid">
            <div className="ig-card ig-dash-stat">
              <TimerIcon size={16} className="ig-dash-icon" />
              <span className="ig-dash-num mono">
                {mm}:{ss}
              </span>
              <span className="ig-dash-label">Dauer</span>
            </div>
            <div className="ig-card ig-dash-stat">
              <Scale size={16} className="ig-dash-icon" />
              <span className="ig-dash-num mono">
                <CountUp
                  value={s.volume}
                  duration={1100}
                  format={(v) => `${Math.round(v)} kg`}
                />
              </span>
              <span className="ig-dash-label">Volumen</span>
            </div>
            <div className="ig-card ig-dash-stat">
              <Zap size={16} className="ig-dash-icon" />
              <span className="ig-dash-num mono">
                <CountUp
                  value={xp}
                  duration={1100}
                  format={(v) => `+${Math.round(v)}`}
                />
              </span>
              <span className="ig-dash-label">XP</span>
            </div>
            <div className="ig-card ig-dash-stat">
              <Flame size={16} className="ig-dash-icon" />
              <span className="ig-dash-num mono">{stats.streakWeeks}</span>
              <span className="ig-dash-label">Wochen Serie</span>
            </div>
          </div>
          {s.records.length > 0 && (
            <div className="ig-card ig-wo-records">
              <div className="ig-field-label">
                <Trophy size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Neue Rekorde
              </div>
              {s.records.map((r) => (
                <span key={r.exercise} className="ig-wo-record-row">
                  🏆 {r.exercise}: <strong>{r.weight} kg</strong>
                </span>
              ))}
            </div>
          )}
          {s.zones.size > 0 && (
            <div className="ig-plan-badges" style={{ justifyContent: "center" }}>
              {[...s.zones].map((z) => (
                <span key={z} className="ig-badge">
                  {ZONE_LABEL[z]}
                </span>
              ))}
            </div>
          )}
          <p className="ig-wo-recovery">
            Gute Arbeit! Trink Wasser, iss Protein — die Muskeln wachsen in
            der Pause.
          </p>
          <button className="ig-btn-primary wide xl" onClick={onFinish}>
            <Check size={18} /> Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ---- Aktiver Modus ---- */
  return (
    <div className="ig-wo">
      <header className="ig-wo-head">
        <button className="ig-icon-btn ghost" onClick={onExit} aria-label="Workout verlassen">
          <X size={20} />
        </button>
        <div className="ig-wo-head-mid">
          <span className="ig-wo-head-title">
            Übung {idx + 1} von {queue.length}
          </span>
          <div className="ig-mini-track">
            <div className="ig-mini-fill" style={{ width: `${totalPct * 100}%` }} />
          </div>
        </div>
        <div className="ig-wo-head-stats mono">
          <span>{mm}:{ss}</span>
          <span
            key={Math.round(sessionRef.current.volume)}
            className="ig-num-pop"
          >
            {Math.round(sessionRef.current.volume)} kg
          </span>
        </div>
      </header>

      {showSwipeHint && (
        <div className="ig-wo-swipe-hint" aria-hidden="true">
          ← Wischen zum Übungswechsel →
        </div>
      )}

      <div className="ig-wo-nextline">
        {(() => {
          const open = queue.filter((e) => setsFor(e) < WO_TARGET_SETS).length;
          const next =
            queue.find(
              (e, i) => i > idx && setsFor(e) < WO_TARGET_SETS,
            ) ||
            queue.find(
              (e, i) => i !== idx && setsFor(e) < WO_TARGET_SETS,
            );
          if (open <= 1 && setsFor(exercise) < WO_TARGET_SETS)
            return "🏁 Letzte Übung — dann hast du's geschafft!";
          if (!next) return "Gleich geschafft!";
          return (
            <>
              Danach: <strong>{next}</strong>
              {open > 2 && ` · noch ${open - 1} weitere`}
            </>
          );
        })()}
      </div>

      <div
        className="ig-wo-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(calc(${-idx * 100}% + ${dragX}px))`,
          transition: dragRef.current?.active ? "none" : "transform 0.35s var(--ease-out)",
        }}
      >
        {queue.map((e, i) => {
          const m = EXERCISE_META[e];
          const active = i === idx;
          return (
            <div
              key={e}
              className={
                "ig-wo-card" +
                (active ? " active" : "") +
                (active && isLast ? " final" : "")
              }
            >
              {active && isLast && (
                <div className="ig-wo-final-banner">🏁 Letzte Übung — jetzt alles geben!</div>
              )}
              <div className="ig-wo-card-top">
                <div className="ig-hero-sil">
                  <BodySilhouette zone={m?.zone} zone2={m?.zone2} pulseKey={e + active} />
                  <span className="ig-hero-mid-label">
                    {[ZONE_LABEL[m?.zone], ZONE_LABEL[m?.zone2]]
                      .filter(Boolean)
                      .join(" + ") || "Eigene Übung"}
                  </span>
                </div>
                <div className="ig-wo-card-info">
                  <h3 className="ig-wo-ex-name">{e}</h3>
                  <div className="ig-plan-badges">
                    {m && <span className="ig-badge">Gerät {m.nr}</span>}
                    <span className="ig-badge">{m?.reps || "8–12"} Wdh.</span>
                  </div>
                  {active && (
                    <div className="ig-wo-mini-stats mono">
                      {lastSession && (
                        <span>
                          Zuletzt:{" "}
                          {lastSession.sets[lastSession.sets.length - 1].weight}{" "}
                          kg
                        </span>
                      )}
                      {bestBefore > 0 && <span>PR: {bestBefore} kg</span>}
                    </div>
                  )}
                </div>
              </div>
              {active && m?.hint && m.hint !== "Selbsterklärend" && (
                <p className="ig-wo-hint">{m.hint}</p>
              )}
              {active && milestone && (
                <span className="ig-wo-milestone" key={milestone}>
                  {milestone}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="ig-wo-bottom">
        <div className="ig-wo-sets">
          {Array.from({ length: WO_TARGET_SETS }, (_, i) => (
            <span
              key={i}
              className={"ig-prog-dot" + (i < doneCount ? " done" : i === doneCount ? " next" : "")}
            />
          ))}
        </div>
        <div className="ig-set-inputs two">
          <div className="ig-num-field">
            <span className="ig-steplabel">Gewicht (kg)</span>
            <div className="ig-steplabel-controls">
              <button className="ig-step-mini" onClick={() => step(setWeight, weight, -2.5, 0)}>
                <Minus size={16} />
              </button>
              <span className="ig-step-val mono">{weight}</span>
              <button className="ig-step-mini" onClick={() => step(setWeight, weight, 2.5, 0)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="ig-num-field">
            <span className="ig-steplabel">Wdh.</span>
            <div className="ig-steplabel-controls">
              <button className="ig-step-mini" onClick={() => step(setReps, reps, -1, 1)}>
                <Minus size={16} />
              </button>
              <span className="ig-step-val mono">{reps}</span>
              <button className="ig-step-mini" onClick={() => step(setReps, reps, 1, 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
        <button
          className="ig-btn-primary wide xl"
          disabled={doneCount >= WO_TARGET_SETS}
          onClick={completeSet}
        >
          <Check size={20} />
          {doneCount >= WO_TARGET_SETS
            ? "Übung fertig"
            : `Satz ${doneCount + 1} von ${WO_TARGET_SETS} abschließen`}
        </button>
      </div>

      {(phase === "rest" || phase === "go") && (
        <div className="ig-wo-rest">
          {phase === "go" ? (
            <div className="ig-wo-go">💪 Weiter!</div>
          ) : (
            <>
              {feedback && (
                <div className="ig-wo-feedback" key={feedback}>
                  {feedback}
                </div>
              )}
              <RestRing left={restLeft} total={restTotal} />
              <div className="ig-wo-rest-btns">
                <button
                  className="ig-chip"
                  onClick={() => {
                    setRestLeft((l) => l + 15);
                    setRestTotal((t) => t + 15);
                  }}
                >
                  +15 Sek
                </button>
                <button
                  className="ig-chip"
                  onClick={() => {
                    playSound("tap", soundOn);
                    setPhase("go");
                    setRestLeft(0);
                  }}
                >
                  Pause überspringen
                </button>
              </div>
              {nextUp && (
                <div className="ig-wo-coach">
                  <span className="ig-field-label">Als Nächstes</span>
                  <span className="ig-wo-coach-name">{nextUp}</span>
                  <div className="ig-plan-badges">
                    <span className="ig-badge">{WO_TARGET_SETS} Sätze</span>
                    <span className="ig-badge">
                      {EXERCISE_META[nextUp]?.reps || "8–12"} Wdh.
                    </span>
                    {EXERCISE_META[nextUp]?.zone && (
                      <span className="ig-badge dim">
                        {ZONE_LABEL[EXERCISE_META[nextUp].zone]}
                      </span>
                    )}
                  </div>
                  <span className="ig-wo-coach-sub">
                    Start in {restLeft} Sekunden
                  </span>
                </div>
              )}
              {!nextUp && (
                <span className="ig-wo-coach-sub">
                  Gleiche Übung — Satz {doneCount + 1} von {WO_TARGET_SETS}
                </span>
              )}
              <button className="ig-wo-undo" onClick={undoLastSet}>
                <RotateCcw size={13} /> Letzten Satz zurücknehmen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RestRing({ left, total }) {
  const r = 74;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? left / total : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="ig-wo-restring">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="11" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--plate-yellow)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="ig-wo-restring-center">
        <span className="ig-wo-rest-time mono">
          {mm}:{ss}
        </span>
        <span className="ig-caption-sub">Pause</span>
      </div>
    </div>
  );
}

/* ---------------- Plan / Split tab ---------------- */
function PlanTab({ data, update }) {
  const split = normalizeSplit(data.split);

  const setDay = (day, unit) =>
    update((prev) => {
      const s = normalizeSplit(prev.split);
      return {
        ...prev,
        split: { ...s, mode: "week", days: { ...s.days, [day]: unit } },
      };
    });

  const setMode = (mode) =>
    update((prev) => {
      const s = normalizeSplit(prev.split);
      const interval = { ...s.interval };
      if (mode === "interval" && !interval.anchor) interval.anchor = todayISO();
      return { ...prev, split: { ...s, mode, interval } };
    });

  const setInterval_ = (patch) =>
    update((prev) => {
      const s = normalizeSplit(prev.split);
      return {
        ...prev,
        split: {
          ...s,
          mode: "interval",
          interval: { ...s.interval, ...patch },
        },
      };
    });

  const applyPreset = (p) => update((prev) => ({ ...prev, split: p.make() }));

  const trainingDays = WEEKDAYS.filter((d) => split.days[d.key] !== "rest");

  const nextIntervalDays = useMemo(() => {
    if (split.mode !== "interval" || !split.interval.anchor) return [];
    const anchor = new Date(split.interval.anchor + "T00:00:00");
    const now = new Date(todayISO() + "T00:00:00");
    const out = [];
    for (let i = 0; i < 14 && out.length < 4; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const diff = Math.round((d - anchor) / 86400000);
      if (diff >= 0 && diff % split.interval.every === 0) {
        out.push(
          d.toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }),
        );
      }
    }
    return out;
  }, [split]);

  return (
    <div className="ig-tabpane">
      <div className="ig-card">
        <div className="ig-field-label">Split-Vorlagen</div>
        <div className="ig-preset-list">
          {SPLIT_PRESETS.map((p) => {
            const active = p.matches(split);
            return (
              <button
                key={p.id}
                className={"ig-preset-card" + (active ? " active" : "")}
                onClick={() => applyPreset(p)}
              >
                <span className="ig-preset-name">{p.name}</span>
                <span className="ig-preset-desc">{p.desc}</span>
                {active && <Check size={16} className="ig-preset-check" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Modus</div>
        <div className="ig-mode-toggle">
          <button
            className={"ig-chip" + (split.mode === "week" ? " active" : "")}
            onClick={() => setMode("week")}
          >
            Wochentage
          </button>
          <button
            className={"ig-chip" + (split.mode === "interval" ? " active" : "")}
            onClick={() => setMode("interval")}
          >
            Intervall
          </button>
        </div>

        {split.mode === "week" ? (
          <ul className="ig-week-list">
            {WEEKDAYS.map((d) => (
              <li
                key={d.key}
                className={
                  "ig-week-row" + (d.key === todayKey() ? " today" : "")
                }
              >
                <span className="ig-week-day">
                  {d.label}
                  {d.key === todayKey() && <span className="ig-today-dot" />}
                </span>
                <select
                  className="ig-select slim"
                  value={split.days[d.key]}
                  onChange={(e) => setDay(d.key, e.target.value)}
                >
                  <option value="rest">Ruhetag</option>
                  <option value="ok">Oberkörper</option>
                  <option value="uk">Unterkörper</option>
                  <option value="gk">Ganzkörper</option>
                </select>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ig-interval-box">
            <div className="ig-interval-row">
              <span>Trainiere alle</span>
              <select
                className="ig-select slim narrow"
                value={split.interval.every}
                onChange={(e) =>
                  setInterval_({ every: Number(e.target.value) })
                }
              >
                <option value={2}>2 Tage</option>
                <option value={3}>3 Tage</option>
                <option value={4}>4 Tage</option>
              </select>
            </div>
            <div className="ig-interval-row">
              <span>Einheit</span>
              <select
                className="ig-select slim"
                value={split.interval.unit}
                onChange={(e) => setInterval_({ unit: e.target.value })}
              >
                <option value="ok">Oberkörper</option>
                <option value="uk">Unterkörper</option>
                <option value="gk">Ganzkörper</option>
              </select>
            </div>
            <button
              className="ig-chip"
              onClick={() => setInterval_({ anchor: todayISO() })}
            >
              <RotateCcw
                size={13}
                style={{ verticalAlign: "-2px", marginRight: 5 }}
              />
              Heute als Starttag setzen
            </button>
            {nextIntervalDays.length > 0 && (
              <p className="ig-empty" style={{ color: "var(--chalk)" }}>
                Nächste Einheiten: {nextIntervalDays.join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Dein Split</div>
        {split.mode === "interval" ? (
          <p className="ig-empty" style={{ color: "var(--chalk)" }}>
            Alle {split.interval.every} Tage: {UNIT_LABEL[split.interval.unit]}
            {split.interval.anchor
              ? ` (Start ${fmtDate(split.interval.anchor)})`
              : " — Starttag noch setzen"}
          </p>
        ) : trainingDays.length === 0 ? (
          <p className="ig-empty">
            Noch kein Trainingstag gewählt. Nimm eine Vorlage oder stell die
            Tage oben ein.
          </p>
        ) : (
          <p className="ig-empty" style={{ color: "var(--chalk)" }}>
            {trainingDays.length}× pro Woche:{" "}
            {trainingDays
              .map((d) => `${d.short} (${UNIT_LABEL[split.days[d.key]]})`)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Progress tab ---------------- */
function ProgressTab({ data }) {
  const [exercise, setExercise] = useState(data.exercises[0] || "");

  useEffect(() => {
    if (!data.exercises.includes(exercise) && data.exercises.length)
      setExercise(data.exercises[0]);
  }, [data.exercises]); // eslint-disable-line

  const chartData = useMemo(() => {
    return data.logs
      .filter((l) => l.exercise === exercise)
      .map((l) => ({
        date: l.date,
        label: fmtDate(l.date),
        top: l.sets.reduce((m, s) => Math.max(m, s.weight), 0),
        volume: l.sets.reduce((v, s) => v + s.reps * s.weight, 0),
        e1: round1(
          l.sets.reduce((m, s) => Math.max(m, e1rm(s.weight, s.reps)), 0),
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.logs, exercise]);

  const best = chartData.reduce((m, r) => Math.max(m, r.top), 0);
  const bestE1 = chartData.reduce((m, r) => Math.max(m, r.e1), 0);
  const sessions = chartData.length;
  const first = chartData[0]?.top || 0;
  const last = chartData[chartData.length - 1]?.top || 0;
  const diff = round1(last - first);

  const records = useMemo(() => {
    const map = {};
    data.logs.forEach((l) =>
      l.sets.forEach((s) => {
        if (!map[l.exercise] || s.weight > map[l.exercise].weight) {
          map[l.exercise] = { weight: s.weight, reps: s.reps, date: l.date };
        }
      }),
    );
    return Object.entries(map).sort((a, b) => b[1].weight - a[1].weight);
  }, [data.logs]);

  const stats = useMemo(
    () => calcStats(data.logs, data.settings?.weeklyGoal || 3),
    [data.logs, data.settings?.weeklyGoal],
  );

  return (
    <div className="ig-tabpane">
      <div className="ig-dash-grid">
        <div className="ig-card ig-dash-stat">
          <CalendarDays size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp value={stats.totalWorkouts} />
          </span>
          <span className="ig-dash-label">Einheiten</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Scale size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp
              value={stats.totalVolume}
              format={(v) =>
                stats.totalVolume >= 1000
                  ? `${round1(v / 1000)}t`
                  : Math.round(v)
              }
            />
          </span>
          <span className="ig-dash-label">Gesamtvolumen</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Dumbbell size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp
              value={
                stats.totalWorkouts
                  ? Math.round(stats.totalSets / stats.totalWorkouts)
                  : 0
              }
            />
          </span>
          <span className="ig-dash-label">Ø Sätze/Einheit</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Trophy size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">
            <CountUp value={stats.prCount} />
          </span>
          <span className="ig-dash-label">Rekorde</span>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Übung</div>
        <select
          className="ig-select"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
        >
          {data.exercises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      <div className="ig-dash-grid">
        <div className="ig-card ig-dash-stat">
          <Trophy size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">{best} kg</span>
          <span className="ig-dash-label">Bestwert</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <Zap size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">{Math.round(bestE1)} kg</span>
          <span className="ig-dash-label">1RM geschätzt</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <CalendarDays size={16} className="ig-dash-icon" />
          <span className="ig-dash-num mono">{sessions}</span>
          <span className="ig-dash-label">Einheiten</span>
        </div>
        <div className="ig-card ig-dash-stat">
          <TrendingUp size={16} className="ig-dash-icon" />
          <span
            className="ig-dash-num mono"
            style={{
              color:
                diff > 0
                  ? "var(--plate-green)"
                  : diff < 0
                    ? "var(--plate-red)"
                    : undefined,
            }}
          >
            {diff > 0 ? "+" : ""}
            {diff} kg
          </span>
          <span className="ig-dash-label">Zuwachs</span>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Gewicht pro Einheit (Top-Satz)</div>
        {chartData.length < 2 ? (
          <p className="ig-empty">
            Sobald du diese Übung an mehr als einem Tag geloggt hast, siehst du
            hier deinen Fortschritt.
          </p>
        ) : (
          <div className="ig-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--chalk-dim)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--grid)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--chalk-dim)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--grid)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--chalk-dim)" }}
                  formatter={(v, name) => [
                    v + " kg",
                    name === "top" ? "Top-Satz" : "1RM geschätzt",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="top"
                  stroke="var(--plate-yellow)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--plate-yellow)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="e1"
                  stroke="var(--plate-blue)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="ig-legend">
              <span>
                <span
                  className="ig-legend-dot"
                  style={{ background: "var(--plate-yellow)" }}
                />
                Top-Satz
              </span>
              <span>
                <span
                  className="ig-legend-dot dashed"
                  style={{ background: "var(--plate-blue)" }}
                />
                1RM geschätzt
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">
          <Trophy size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Rekorde (alle Übungen)
        </div>
        {records.length === 0 ? (
          <p className="ig-empty">📊 Nach deinem ersten Training erscheinen hier deine Daten.</p>
        ) : (
          <ul className="ig-history-list">
            {records.map(([ex, r]) => (
              <li key={ex} className="ig-history-row">
                <span
                  className="ig-history-date"
                  style={{ color: "var(--chalk)" }}
                >
                  {ex}
                </span>
                <span className="mono">
                  {r.weight} kg × {r.reps}
                </span>
                <span className="ig-history-vol mono">{fmtDate(r.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Einheiten-Verlauf</div>
        {chartData.length === 0 ? (
          <p className="ig-empty">📊 Nach deinem ersten Training erscheinen hier deine Daten.</p>
        ) : (
          <ul className="ig-history-list">
            {[...chartData].reverse().map((r) => (
              <li key={r.date} className="ig-history-row">
                <span className="ig-history-date">{r.label}</span>
                <span className="mono">{r.top} kg</span>
                <span className="ig-history-vol mono">
                  Vol. {Math.round(r.volume)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">
          <Award size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Abzeichen
        </div>
        <div className="ig-achieve-grid">
          {BADGE_DEFS.map((b) => {
            const earned = b.check(stats);
            return (
              <div
                key={b.id}
                className={"ig-achieve" + (earned ? " earned" : "")}
              >
                <span className="ig-achieve-icon">{b.icon}</span>
                <span className="ig-achieve-name">{b.name}</span>
                <span className="ig-achieve-desc">{b.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- BMI tab ---------------- */
function BmiTab({ data, update }) {
  const [height, setHeight] = useState(data.profile.heightCm || "");
  const [weight, setWeight] = useState(data.profile.weightKg || "");

  useEffect(() => {
    const t = setTimeout(() => {
      update((prev) => {
        const w = Number(weight);
        let weightLog = prev.profile.weightLog || [];
        if (w > 0) {
          const today = todayISO();
          const rest = weightLog.filter((e) => e.date !== today);
          weightLog = [...rest, { date: today, kg: w }].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
        }
        return {
          ...prev,
          profile: {
            ...prev.profile,
            heightCm: height,
            weightKg: weight,
            weightLog,
          },
        };
      });
    }, 500);
    return () => clearTimeout(t);
  }, [height, weight]); // eslint-disable-line

  const h = Number(height) / 100;
  const w = Number(weight);
  const bmi = h > 0 && w > 0 ? w / (h * h) : null;

  let category = null,
    color = null;
  if (bmi != null) {
    if (bmi < 18.5) {
      category = "Untergewicht";
      color = "var(--plate-blue)";
    } else if (bmi < 25) {
      category = "Normalgewicht";
      color = "var(--plate-green)";
    } else if (bmi < 30) {
      category = "Übergewicht";
      color = "var(--plate-yellow)";
    } else {
      category = "Adipositas";
      color = "var(--plate-red)";
    }
  }

  const ranges = [
    { label: "< 18,5", name: "Untergewicht", color: "var(--plate-blue)" },
    {
      label: "18,5 – 24,9",
      name: "Normalgewicht",
      color: "var(--plate-green)",
    },
    { label: "25 – 29,9", name: "Übergewicht", color: "var(--plate-yellow)" },
    { label: "≥ 30", name: "Adipositas", color: "var(--plate-red)" },
  ];

  const weightChart = (data.profile.weightLog || []).map((e) => ({
    label: fmtDate(e.date),
    kg: e.kg,
  }));

  return (
    <div className="ig-tabpane">
      <div className="ig-card">
        <div className="ig-field-label">Profil</div>
        <div className="ig-set-inputs two">
          <div className="ig-num-field">
            <span>Geschlecht</span>
            <div className="ig-mode-toggle">
              <button
                className={
                  "ig-chip" + (data.profile.gender === "f" ? " active" : "")
                }
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, gender: "f" },
                  }))
                }
              >
                ♀ Frau
              </button>
              <button
                className={
                  "ig-chip" + (data.profile.gender === "m" ? " active" : "")
                }
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, gender: "m" },
                  }))
                }
              >
                ♂ Mann
              </button>
            </div>
          </div>
          <label className="ig-num-field">
            <span>Alter</span>
            <input
              type="number"
              inputMode="numeric"
              className="ig-input mono"
              value={data.profile.age || ""}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, age: e.target.value },
                }))
              }
              placeholder="25"
            />
          </label>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Einstellungen</div>
        <label className="ig-toggle-row">
          <input
            type="checkbox"
            checked={data.settings?.sound !== false}
            onChange={(e) => {
              update((prev) => ({
                ...prev,
                settings: { ...prev.settings, sound: e.target.checked },
              }));
              if (e.target.checked) playSound("tap");
            }}
          />
          <span>Sound-Effekte</span>
        </label>
        <label className="ig-toggle-row">
          <input
            type="checkbox"
            checked={data.settings?.haptics !== false}
            onChange={(e) => {
              update((prev) => ({
                ...prev,
                settings: { ...prev.settings, haptics: e.target.checked },
              }));
              if (e.target.checked) buzz(30);
            }}
          />
          <span>Haptisches Feedback (Vibration)</span>
        </label>
        <div className="ig-num-field">
          <span>Wochenziel (Trainingstage)</span>
          <div className="ig-mode-toggle">
            {[2, 3, 4, 5].map((g) => (
              <button
                key={g}
                className={
                  "ig-chip" +
                  ((data.settings?.weeklyGoal || 3) === g ? " active" : "")
                }
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, weeklyGoal: g },
                  }))
                }
              >
                {g}×
              </button>
            ))}
          </div>
        </div>
        <div className="ig-num-field">
          <span>Akzentfarbe</span>
          <div className="ig-accent-row">
            {ACCENT_COLORS.map((a) => (
              <button
                key={a.id}
                className={
                  "ig-accent-swatch" +
                  ((data.settings?.accent || "gold") === a.id ? " active" : "")
                }
                style={{ background: a.color }}
                aria-label={`Akzentfarbe ${a.name}`}
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, accent: a.id },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Körperdaten</div>
        <div className="ig-set-inputs two">
          <label className="ig-num-field">
            <span>Größe (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              className="ig-input mono"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="178"
            />
          </label>
          <label className="ig-num-field">
            <span>Gewicht (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="ig-input mono"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="75"
            />
          </label>
        </div>
      </div>

      <div className="ig-card ig-bmi-result">
        {bmi == null ? (
          <p className="ig-empty">
            Trag Größe und Gewicht ein, um deinen BMI zu berechnen.
          </p>
        ) : (
          <>
            <span className="ig-num" style={{ color }}>
              {round1(bmi)}
            </span>
            <span className="ig-bmi-cat" style={{ color }}>
              {category}
            </span>
            <div className="ig-bmi-bar">
              {ranges.map((r) => (
                <div
                  key={r.name}
                  className="ig-bmi-seg"
                  style={{
                    background: r.color,
                    opacity: r.name === category ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">
          <Scale size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Gewichtsverlauf
        </div>
        {weightChart.length < 2 ? (
          <p className="ig-empty">
            Dein Gewicht wird automatisch pro Tag gespeichert. Nach ein paar
            Einträgen siehst du hier den Verlauf.
          </p>
        ) : (
          <div className="ig-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={weightChart}
                margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--chalk-dim)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--grid)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--chalk-dim)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={["dataMin - 2", "dataMax + 2"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--grid)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--chalk-dim)" }}
                  formatter={(v) => [v + " kg", "Gewicht"]}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--plate-green)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--plate-green)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="ig-card">
        <div className="ig-field-label">Referenzwerte (WHO)</div>
        <ul className="ig-range-list">
          {ranges.map((r) => (
            <li key={r.name} className="ig-range-row">
              <span className="ig-range-dot" style={{ background: r.color }} />
              <span>{r.name}</span>
              <span className="mono ig-range-val">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Styles ---------------- */
function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

      .ig-app {
        --bg: #0d0f13;
        --surface-1: #1a1d24;
        --surface-2: #232730;
        --chalk: #edeae3;
        --chalk-dim: #94969b;
        --steel: #4f5767;
        --grid: #2a2e38;
        --plate-red: #e0503f;
        --plate-blue: #3f7fd4;
        --plate-yellow: #e3b23c;
        --accent-rgb: 227, 178, 60;
        --plate-green: #58a45c;
        --plate-white: #d8d5cc;
        --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        --glass-bg: rgba(26, 29, 36, 0.72);
        --glass-border: rgba(255, 255, 255, 0.06);
        --glass-blur: 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif;
        color: var(--chalk);
        background: var(--bg);
        background-image:
          radial-gradient(ellipse 80% 40% at 50% 0%, rgba(var(--accent-rgb),0.07) 0%, transparent 100%),
          radial-gradient(ellipse 60% 35% at 80% 100%, rgba(88,164,92,0.05) 0%, transparent 100%),
          radial-gradient(ellipse 50% 30% at 20% 80%, rgba(63,127,212,0.04) 0%, transparent 100%);
        min-height: 100vh;
        display: flex; justify-content: center;
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
        overscroll-behavior: none;
      }
      .ig-app * { box-sizing: border-box; }
      .ig-app input, .ig-app select, .ig-app textarea { user-select: text; -webkit-user-select: text; }

      .ig-toggle-row { display: flex; flex-direction: row-reverse; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; color: var(--chalk); cursor: pointer; padding: 3px 0; }
      .ig-toggle-row span { flex: 1; }
      .ig-toggle-row input { appearance: none; -webkit-appearance: none; width: 46px; height: 28px; border-radius: 999px; background: rgba(35,39,48,0.9); border: 1px solid var(--glass-border); position: relative; cursor: pointer; transition: background 0.25s var(--ease-out), border-color 0.25s; flex-shrink: 0; margin: 0; }
      .ig-toggle-row input::after { content: ""; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%; background: var(--chalk); box-shadow: 0 1px 3px rgba(0,0,0,0.4); transition: transform 0.25s var(--ease-spring), background 0.2s; }
      .ig-toggle-row input:checked { background: var(--plate-yellow); border-color: var(--plate-yellow); }
      .ig-toggle-row input:checked::after { transform: translateX(18px); background: #14161a; }
      .ig-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; height: 100vh; color: var(--chalk-dim); width: 100%; animation: ig-fade-up 0.5s var(--ease-out); }
      .ig-loading svg { animation: ig-pulse 2s ease infinite; opacity: 0.5; }

      @keyframes ig-fade-up { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes ig-pop { 0% { transform: scale(0.92); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      @keyframes ig-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(224,80,63,0.4); } 50% { box-shadow: 0 0 0 8px rgba(224,80,63,0); } }
      @keyframes ig-slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ig-scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

      .ig-onboarding { flex: 1; display: flex; flex-direction: column; gap: 16px; padding: 40px 22px 28px; animation: ig-fade-up 0.5s var(--ease-out); }
      .ig-onb-header { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--plate-yellow); margin-bottom: 4px; }
      .ig-onb-brand { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; color: var(--chalk); }
      .ig-onb-sub { font-size: 13px; color: var(--chalk-dim); }
      .ig-onb-dots { display: flex; justify-content: center; gap: 8px; }
      .ig-onb-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--grid); transition: all 0.3s var(--ease-spring); }
      .ig-onb-dot.active { background: var(--plate-yellow); transform: scale(1.3); box-shadow: 0 0 6px rgba(var(--accent-rgb),0.4); }
      .ig-onb-step { display: flex; flex-direction: column; gap: 14px; animation: ig-fade-up 0.4s var(--ease-out); }
      .ig-onb-gender-row { display: flex; gap: 10px; }
      .ig-onb-gender { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: rgba(26, 29, 36, 0.6); border: 1.5px solid var(--glass-border); color: var(--chalk); border-radius: 16px; padding: 20px 0 16px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s var(--ease-out); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
      .ig-onb-gender:active { transform: scale(0.96); }
      .ig-onb-gender.active { border-color: var(--plate-yellow); background: rgba(var(--accent-rgb),0.12); color: var(--plate-yellow); box-shadow: 0 0 0 3px rgba(var(--accent-rgb),0.1); }
      .ig-onb-gender-icon { font-size: 30px; line-height: 1; }
      .ig-onb-field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .ig-onb-back { background: none; border: none; color: var(--chalk-dim); font-family: inherit; font-size: 13px; cursor: pointer; padding: 8px; align-self: center; }

      .ig-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
      .ig-btn-primary:not(:disabled):active { transform: scale(0.96); }
      .ig-btn-primary:not(:disabled):hover { filter: brightness(1.1); }
      .ig-flash { animation: ig-fade-up 0.35s var(--ease-out); }
      .ig-flash.pr { animation: ig-pop 0.5s var(--ease-spring), ig-pulse 1.6s ease 2; }
      .ig-preset-card { transition: border-color 0.2s var(--ease-out), transform 0.15s var(--ease-out); }
      .ig-preset-card:active { transform: scale(0.97); }
      .ig-tab { transition: color 0.2s var(--ease-out), transform 0.15s var(--ease-out); }
      .ig-tab:active { transform: scale(0.92); }

      @media (prefers-reduced-motion: reduce) {
        .ig-app *, .ig-app *::before, .ig-app *::after { animation: none !important; transition: none !important; }
      }
      .ig-phone { width: 100%; max-width: 430px; display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); background-image: radial-gradient(ellipse 100% 30% at 50% 0%, rgba(var(--accent-rgb),0.04) 0%, transparent 100%); position: relative; }
      .ig-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 16px; border-bottom: 1px solid var(--glass-border); backdrop-filter: blur(var(--glass-blur)) saturate(1.4); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4); background: rgba(13, 15, 19, 0.6); position: sticky; top: 0; z-index: 10; }
      .ig-brand { display: flex; align-items: center; gap: 8px; font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
      .ig-date { font-size: 12px; color: var(--chalk-dim); text-transform: capitalize; }
      .ig-mute-btn { background: none; border: none; color: var(--chalk-dim); padding: 4px; cursor: pointer; display: flex; align-items: center; transition: color 0.2s; }
      .ig-mute-btn:hover { color: var(--chalk); }
      .ig-main { flex: 1; padding: 20px 16px 90px; overflow-y: auto; scroll-behavior: smooth; }
      .ig-tabpane { display: flex; flex-direction: column; gap: 14px; animation: ig-fade-up 0.4s var(--ease-out); }

      .ig-tabbar { position: sticky; bottom: 0; display: flex; background: rgba(26, 29, 36, 0.78); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); border-top: 1px solid var(--glass-border); padding: 6px 2px calc(env(safe-area-inset-bottom, 0px) + 6px); }
      .ig-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; color: var(--chalk-dim); font-family: inherit; font-size: 10px; padding: 5px 0 3px; cursor: pointer; letter-spacing: 0.2px; transition: color 0.2s var(--ease-out), transform 0.15s var(--ease-out); }
      .ig-tab.active { color: var(--plate-yellow); }
      .ig-tab svg { transition: transform 0.25s var(--ease-spring); }
      @keyframes ig-tab-bounce { 0% { transform: scale(1); } 45% { transform: scale(1.25); } 100% { transform: scale(1.08); } }
      .ig-tab.active svg { transform: scale(1.08); animation: ig-tab-bounce 0.35s var(--ease-spring); }
      .ig-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; backdrop-filter: blur(var(--glass-blur)) saturate(1.3); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.3); box-shadow: 0 1px 3px rgba(0,0,0,0.3); animation: ig-fade-up 0.45s var(--ease-out); transition: transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out); }
      @media (hover: hover) {
        .ig-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
      }
      .ig-field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--chalk-dim); font-weight: 600; }
      .ig-empty { font-size: 13px; color: var(--chalk-dim); margin: 0; line-height: 1.5; }

      .ig-select, .ig-input { background: rgba(35, 39, 48, 0.7); color: var(--chalk); border: 1px solid var(--glass-border); border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: inherit; width: 100%; appearance: none; transition: border-color 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out); }
      .ig-select:focus, .ig-input:focus { outline: none; border-color: var(--plate-yellow); box-shadow: 0 0 0 3px rgba(var(--accent-rgb),0.15); }
      .ig-input.center { text-align: center; }
      .mono { font-family: 'JetBrains Mono', monospace; }

      .ig-exercise-picker { display: flex; gap: 8px; }

      .ig-plan-hint { display: flex; flex-direction: column; gap: 6px; }
      .ig-plan-badges { display: flex; gap: 6px; flex-wrap: wrap; }
      .ig-badge { background: rgba(35, 39, 48, 0.5); border: 1px solid var(--glass-border); border-radius: 999px; padding: 4px 11px; font-size: 11px; color: var(--chalk); font-family: 'JetBrains Mono', monospace; }
      .ig-badge.dim { color: var(--chalk-dim); }
      .ig-plan-text { font-size: 12px; color: var(--chalk-dim); line-height: 1.45; }

      .ig-plan-banner { display: flex; align-items: center; gap: 8px; background: rgba(var(--accent-rgb),0.1); border: 1px solid rgba(var(--accent-rgb),0.25); color: var(--plate-yellow); border-radius: 12px; padding: 10px 14px; font-size: 13px; cursor: pointer; font-family: inherit; text-align: left; width: 100%; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: all 0.2s var(--ease-out); }
      .ig-plan-banner strong { font-weight: 600; }
      .ig-plan-banner.rest { background: rgba(79, 87, 103, 0.15); border-color: rgba(79, 87, 103, 0.25); color: var(--chalk-dim); }
      .ig-plan-banner:hover { filter: brightness(1.15); transform: translateY(-1px); }

      /* --- Streak Calendar --- */
      .ig-streak-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; backdrop-filter: blur(var(--glass-blur)) saturate(1.3); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.3); animation: ig-fade-up 0.4s var(--ease-out); }
      .ig-streak-header { display: flex; justify-content: space-between; align-items: center; }
      .ig-streak-title { font-weight: 600; font-size: 13px; color: var(--chalk); }
      .ig-streak-stats { display: flex; gap: 16px; justify-content: center; }
      .ig-streak-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
      .ig-streak-num { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--plate-green); }
      .ig-streak-label { font-size: 10px; color: var(--chalk-dim); text-transform: uppercase; letter-spacing: 0.5px; }
      .ig-cal-month-nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .ig-cal-month-label { font-size: 14px; font-weight: 600; color: var(--chalk); }
      .ig-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
      .ig-cal-wd { text-align: center; font-size: 10px; color: var(--chalk-dim); padding: 4px 0; font-weight: 500; }
      .ig-cal-cell { position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: transparent; border: none; cursor: pointer; font-family: inherit; padding: 0; transition: all 0.15s var(--ease-out); }
      .ig-cal-cell:hover { background: rgba(255,255,255,0.06); }
      .ig-cal-cell.empty { pointer-events: none; }
      .ig-cal-cell.trained { background: color-mix(in srgb, var(--plate-green) 18%, transparent); }
      .ig-cal-cell.trained:hover { background: color-mix(in srgb, var(--plate-green) 28%, transparent); }
      .ig-cal-cell.today { outline: 2px solid var(--plate-yellow); outline-offset: 2px; z-index: 1; }
      .ig-cal-cell.selected { background: var(--plate-green) !important; }
      .ig-cal-cell.selected .ig-cal-day { color: var(--bg); font-weight: 700; }
      .ig-cal-day { font-size: 13px; color: var(--chalk); font-family: 'JetBrains Mono', monospace; }
      .ig-cal-dot { position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--plate-green); }
      .ig-cal-cell.selected .ig-cal-dot { background: var(--bg); }
      .ig-cal-detail { display: flex; flex-direction: column; gap: 8px; background: rgba(35, 39, 48, 0.5); border-radius: 12px; padding: 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
      .ig-cal-ex-row { display: flex; flex-direction: column; gap: 4px; }
      .ig-cal-ex-name { font-size: 13px; font-weight: 600; color: var(--chalk); }
      .ig-cal-sets-row { display: flex; gap: 4px; flex-wrap: wrap; }
      .ig-cal-vol { font-size: 11px; color: var(--chalk-dim); font-weight: 500; text-align: right; padding-top: 4px; border-top: 1px solid var(--glass-border); }
      .ig-preset-list { display: flex; flex-direction: column; gap: 8px; }
      .ig-preset-card { position: relative; text-align: left; background: rgba(35, 39, 48, 0.5); border: 1px solid var(--glass-border); color: var(--chalk); border-radius: 12px; padding: 12px 14px; font-family: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: border-color 0.2s var(--ease-out), transform 0.15s var(--ease-out), box-shadow 0.2s var(--ease-out); }
      .ig-preset-card.active { border-color: var(--plate-yellow); box-shadow: 0 0 0 3px rgba(var(--accent-rgb),0.12); }
      .ig-preset-name { font-weight: 600; font-size: 14px; }
      .ig-preset-desc { font-size: 12px; color: var(--chalk-dim); }
      .ig-preset-check { position: absolute; right: 12px; top: 12px; color: var(--plate-yellow); }
      .ig-mode-toggle { display: flex; gap: 8px; }
      .ig-week-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-week-row { display: flex; align-items: center; gap: 10px; }
      .ig-week-row.today .ig-week-day { color: var(--plate-yellow); font-weight: 600; }
      .ig-week-day { flex: 1; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .ig-today-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--plate-yellow); }
      .ig-select.slim { width: 150px; padding: 8px 12px; font-size: 13px; border-radius: 10px; }
      .ig-select.slim.narrow { width: 110px; }
      .ig-interval-box { display: flex; flex-direction: column; gap: 10px; }
      .ig-interval-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }

      .ig-add-row { display: flex; gap: 8px; }
      .ig-icon-btn { background: rgba(35, 39, 48, 0.5); border: 1px solid var(--glass-border); color: var(--chalk); border-radius: 12px; width: 42px; height: 42px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s var(--ease-out); }
      .ig-icon-btn:hover { background: rgba(255,255,255,0.06); }
      .ig-icon-btn:active { transform: scale(0.94); }
      .ig-icon-btn.primary { background: var(--plate-yellow); border-color: var(--plate-yellow); color: #201a08; box-shadow: 0 2px 8px rgba(var(--accent-rgb),0.25); }
      .ig-icon-btn.ghost { background: transparent; border: none; width: 28px; height: 28px; color: var(--chalk-dim); }
      .ig-icon-btn.lg { width: 52px; height: 52px; }
      .ig-link-danger { background: none; border: none; color: #d97a70; font-size: 12px; display: flex; align-items: center; gap: 5px; padding: 2px 0; cursor: pointer; align-self: flex-start; }

      .ig-set-inputs { display: flex; gap: 8px; align-items: flex-end; }
      .ig-set-inputs.two { align-items: stretch; }
      .ig-num-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--chalk-dim); flex: 1; }

      .ig-stepper-row { display: flex; gap: 10px; }
      .ig-stepper { flex: 1; display: flex; flex-direction: column; gap: 5px; }
      .ig-stepper-label { font-size: 11px; color: var(--chalk-dim); }
      .ig-stepper-controls { display: flex; gap: 5px; align-items: stretch; }
      .ig-step-btn { background: var(--surface-2); border: 1px solid var(--grid); color: var(--chalk); border-radius: 10px; width: 38px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .ig-step-btn:active { background: var(--grid); }

      .ig-btn-primary { background: var(--plate-yellow); color: #201a08; border: none; border-radius: 12px; padding: 0 20px; height: 46px; font-family: inherit; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; justify-content: center; transition: all 0.2s var(--ease-out); box-shadow: 0 2px 10px rgba(var(--accent-rgb),0.2); }
      .ig-btn-primary:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(var(--accent-rgb),0.3); }
      .ig-btn-primary:not(:disabled):active { transform: scale(0.97) translateY(0); box-shadow: 0 1px 4px rgba(var(--accent-rgb),0.2); }
      .ig-btn-primary.wide { width: 100%; }
      .ig-btn-primary.lg { height: 60px; width: 60px; border-radius: 50%; padding: 0; }

      /* --- Pause Timer Box --- */
      .ig-pause-box { display: flex; align-items: center; gap: 10px; background: rgba(35, 39, 48, 0.5); border-radius: 12px; padding: 10px 12px; backdrop-filter: blur(8px) saturate(1.2); -webkit-backdrop-filter: blur(8px) saturate(1.2); }
      .ig-pause-label { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--chalk-dim); font-weight: 500; flex-shrink: 0; }
      .ig-pause-chips { display: flex; gap: 4px; flex-wrap: wrap; }
      .ig-pause-chip { font-size: 11px; padding: 5px 11px; border-radius: 999px; border: 1.5px solid var(--glass-border); background: transparent; color: var(--chalk-dim); cursor: pointer; font-family: inherit; transition: all 0.2s var(--ease-out); line-height: 1.3; }
      .ig-pause-chip:hover { border-color: var(--chalk-dim); color: var(--chalk); background: rgba(255,255,255,0.04); }
      .ig-pause-chip.active { background: var(--plate-yellow); border-color: var(--plate-yellow); color: #201a08; font-weight: 600; box-shadow: 0 2px 10px rgba(var(--accent-rgb),0.3); transform: scale(1.05); }

      .ig-last-card { gap: 8px; }
      .ig-last-sets { display: flex; gap: 6px; flex-wrap: wrap; }

      /* --- Exercise card --- */
      .ig-ex-card { gap: 12px; }
      .ig-ex-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .ig-ex-picker-row { flex: 1; display: flex; gap: 8px; align-items: flex-start; }
      .ig-ex-chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
      .ig-ex-chip { font-size: 12px; padding: 6px 12px; border-radius: 20px; border: 1.5px solid var(--glass-border); background: transparent; color: var(--chalk); cursor: pointer; transition: all 0.2s var(--ease-out); white-space: nowrap; }
      .ig-ex-chip:hover { border-color: var(--chalk-dim); background: rgba(255,255,255,0.04); }
      .ig-ex-chip.active { border-color: var(--plate-green); background: color-mix(in srgb, var(--plate-green) 18%, transparent); color: var(--plate-green); font-weight: 600; box-shadow: 0 0 0 3px rgba(88,164,92,0.12); }
      .ig-ex-chip.add { border-style: dashed; color: var(--chalk-dim); font-size: 11px; opacity: 0.7; }
      .ig-ex-chip.add:hover { border-color: var(--plate-yellow); color: var(--plate-yellow); border-style: dashed; opacity: 1; }
      .ig-ex-select { min-width: 0; flex: 1; }
      .ig-set-progress { display: flex; align-items: center; gap: 5px; flex-shrink: 0; padding-top: 2px; }
      .ig-progress-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
      .ig-prog-dot { width: 14px; height: 14px; border-radius: 50%; background: rgba(35, 39, 48, 0.5); border: 2px solid var(--glass-border); transition: all 0.35s var(--ease-spring); }
      @keyframes ig-dot-pop { 0% { transform: scale(0.6); } 55% { transform: scale(1.35); } 100% { transform: scale(1.1); } }
      .ig-prog-dot.done { background: var(--plate-green); border-color: var(--plate-green); box-shadow: 0 0 6px rgba(88,164,92,0.4); transform: scale(1.1); animation: ig-dot-pop 0.4s var(--ease-spring); }
      .ig-prog-dot.next { border-color: var(--plate-yellow); box-shadow: 0 0 0 3px rgba(var(--accent-rgb),0.2); }
      .ig-prog-text { font-size: 11px; font-weight: 600; color: var(--chalk-dim); font-family: 'JetBrains Mono', monospace; margin-left: 2px; }
      .ig-ex-meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
      .ig-ex-benefit { font-size: 11px; color: var(--plate-green); width: 100%; font-weight: 500; line-height: 1.4; }
      .ig-ex-hint { font-size: 11px; color: var(--chalk-dim); width: 100%; line-height: 1.4; }

      /* --- Logging stepper --- */
      .ig-set-log-row { display: flex; gap: 8px; align-items: stretch; }
      .ig-set-stepper { flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: center; }
      .ig-steplabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--chalk-dim); font-weight: 600; }
      .ig-steplabel-controls { display: flex; align-items: center; gap: 6px; background: rgba(35, 39, 48, 0.5); border-radius: 12px; padding: 3px; width: 100%; justify-content: center; backdrop-filter: blur(8px) saturate(1.2); -webkit-backdrop-filter: blur(8px) saturate(1.2); }
      .ig-step-mini { background: none; border: none; color: var(--chalk-dim); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; }
      .ig-step-mini:active { background: var(--grid); }
      .ig-step-val { font-size: 18px; font-weight: 700; min-width: 36px; text-align: center; color: var(--chalk); }

      /* --- Dashboard --- */
      .ig-hero { gap: 8px; background: linear-gradient(140deg, rgba(var(--accent-rgb),0.14), var(--glass-bg) 55%); border-color: rgba(var(--accent-rgb),0.25); }
      .ig-hero-greeting { font-family: 'Oswald', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.4px; color: var(--chalk); }
      .ig-hero-plan { font-size: 13px; color: var(--chalk-dim); line-height: 1.4; }
      .ig-btn-primary.ghosted { background: rgba(35,39,48,0.6); color: var(--chalk); box-shadow: none; border: 1px solid var(--glass-border); }
      .ig-level-card { gap: 8px; }
      .ig-level-head { display: flex; align-items: center; justify-content: space-between; }
      .ig-level-badge { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: var(--plate-yellow); }
      .ig-level-xp { font-size: 11px; color: var(--chalk-dim); }
      .ig-level-track { height: 8px; background: rgba(35,39,48,0.7); border-radius: 4px; overflow: hidden; }
      .ig-level-fill { height: 100%; background: linear-gradient(90deg, var(--plate-yellow), #f0d27a); border-radius: 4px; transition: width 0.6s var(--ease-out); box-shadow: 0 0 8px rgba(var(--accent-rgb),0.4); transform-origin: left; animation: ig-fill-in 0.9s var(--ease-out); }
      .ig-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .ig-dash-stat { align-items: flex-start; gap: 4px; padding: 14px; }
      .ig-dash-icon { color: var(--plate-yellow); }
      .ig-dash-num { font-size: 24px; font-weight: 700; color: var(--chalk); line-height: 1.1; }
      .ig-dash-label { font-size: 11px; color: var(--chalk-dim); }
      .ig-mini-track { width: 100%; height: 5px; background: rgba(35,39,48,0.7); border-radius: 3px; overflow: hidden; margin-top: 4px; }
      .ig-mini-fill { height: 100%; background: var(--plate-yellow); border-radius: 3px; transition: width 0.5s var(--ease-out); transform-origin: left; animation: ig-fill-in 0.8s var(--ease-out); }
      @keyframes ig-fill-in { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      .ig-hero-row { flex-direction: row; align-items: center; justify-content: space-between; padding: 14px 16px; gap: 10px; }
      .ig-hero-sil { display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 90px; }
      .ig-hero-mid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .ig-hero-mid-label { font-size: 10px; color: var(--chalk-dim); text-align: center; }
      .ig-hero-spark { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; font-family: inherit; cursor: pointer; padding: 0; }
      .ig-spark-empty { font-size: 10.5px; color: var(--chalk-dim); max-width: 100px; line-height: 1.4; text-align: center; }
      .ig-spark-detail { gap: 8px; }
      @keyframes ig-spark-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      .ig-spark-line { stroke-dasharray: 1; animation: ig-spark-draw 0.9s var(--ease-out) forwards; }
      @keyframes ig-ring-glow { 0%, 100% { filter: drop-shadow(0 0 2px rgba(88,164,92,0.4)); } 50% { filter: drop-shadow(0 0 10px rgba(88,164,92,0.8)); } }
      .ig-ring.complete { animation: ig-ring-glow 1.6s ease-in-out 3; }
      .ig-sil-zone { fill: var(--glass-border); transition: fill 0.3s var(--ease-out); }
      @keyframes ig-zone-pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.9; } }
      .ig-sil-zone.primary { fill: var(--plate-yellow); animation: ig-zone-pulse 0.9s var(--ease-out); opacity: 0.9; }
      .ig-sil-zone.secondary { fill: var(--plate-yellow); opacity: 0.35; }
      .ig-milestone { gap: 6px; padding: 12px 16px; }
      .ig-milestone-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .ig-milestone-goal { color: var(--plate-yellow); font-weight: 600; font-size: 12.5px; }
      .ig-milestone-pct { font-size: 11px; color: var(--chalk-dim); flex-shrink: 0; }
      .ig-rest-card { flex-direction: row; align-items: center; gap: 14px; text-align: left; cursor: pointer; font-family: inherit; color: var(--chalk); background: linear-gradient(140deg, rgba(79,87,103,0.25), var(--glass-bg) 60%); }
      .ig-rest-icon { color: var(--chalk-dim); flex-shrink: 0; }
      .ig-rest-body { display: flex; flex-direction: column; gap: 3px; }
      .ig-rest-title { font-size: 13px; font-weight: 600; }
      .ig-rest-count { font-size: 20px; font-weight: 700; color: var(--plate-yellow); }
      .ig-rest-sub { font-size: 11px; color: var(--chalk-dim); line-height: 1.4; }
      .ig-banner-chev { flex-shrink: 0; margin-left: auto; opacity: 0.6; transition: transform 0.25s var(--ease-out); }
      .ig-banner-chev.open { transform: rotate(90deg); }
      .ig-done-note { flex-direction: row; align-items: center; gap: 12px; font-size: 13px; color: var(--chalk-dim); line-height: 1.5; border-color: rgba(88,164,92,0.3); }
      .ig-done-note-icon { font-size: 24px; flex-shrink: 0; }
      .ig-empty-hero { align-items: center; text-align: center; padding: 34px 22px; gap: 12px; }
      .ig-empty-illu { font-size: 46px; line-height: 1; animation: ig-pop 0.6s var(--ease-spring); }
      .ig-num-pop { display: inline-block; animation: ig-pop 0.35s var(--ease-spring); }
      .ig-wo-swipe-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 4; background: rgba(13,15,19,0.85); border: 1px solid var(--glass-border); border-radius: 999px; padding: 9px 16px; font-size: 12px; color: var(--chalk-dim); pointer-events: none; animation: ig-fade-up 0.5s var(--ease-out); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }

      /* --- Pre-Workout Queue --- */
      .ig-queue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
      .ig-queue-row { display: flex; align-items: center; gap: 10px; background: rgba(35,39,48,0.45); border-radius: 10px; padding: 9px 12px; transition: opacity 0.3s var(--ease-out); }
      .ig-queue-row.done { opacity: 0.5; }
      .ig-queue-row.done .ig-queue-name { text-decoration: line-through; text-decoration-color: var(--plate-green); }
      .ig-queue-dot { width: 20px; text-align: center; color: var(--chalk-dim); flex-shrink: 0; }
      .ig-queue-row.done .ig-queue-dot { color: var(--plate-green); }
      .ig-queue-row.partial .ig-queue-dot { color: var(--plate-yellow); }
      .ig-queue-name { flex: 1; font-size: 13.5px; }
      .ig-queue-meta { font-size: 11px; color: var(--chalk-dim); }
      .ig-queue-vol { font-size: 12px; color: var(--chalk-dim); }
      .ig-btn-primary.xl { height: 56px; font-size: 15.5px; border-radius: 16px; gap: 8px; }
      @keyframes ig-cta-glow { 0%, 100% { box-shadow: 0 2px 10px rgba(var(--accent-rgb),0.2); } 50% { box-shadow: 0 5px 24px rgba(var(--accent-rgb),0.45); } }
      .ig-btn-primary.xl:not(:disabled) { animation: ig-cta-glow 2.8s ease-in-out infinite; }

      /* --- Fullscreen Workout Mode --- */
      .ig-wo { position: fixed; inset: 0; z-index: 60; background: var(--bg); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; overflow: hidden; animation: ig-fade-up 0.3s var(--ease-out); }
      .ig-wo-head { display: flex; align-items: center; gap: 12px; padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 10px; border-bottom: 1px solid var(--glass-border); }
      .ig-wo-head-mid { flex: 1; display: flex; flex-direction: column; gap: 5px; }
      .ig-wo-head-title { font-size: 12px; font-weight: 600; color: var(--chalk); }
      .ig-wo-head-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-size: 11px; color: var(--chalk-dim); }
      .ig-wo-nextline { padding: 9px 20px; font-size: 12px; color: var(--chalk-dim); flex-shrink: 0; animation: ig-fade-up 0.4s var(--ease-out); }
      .ig-wo-nextline strong { color: var(--chalk); font-weight: 600; }
      .ig-wo-feedback { font-family: 'Oswald', sans-serif; font-size: 22px; font-weight: 700; text-align: center; color: var(--chalk); animation: ig-pop 0.5s var(--ease-spring); }
      .ig-wo-track { flex: 1; display: flex; align-items: stretch; touch-action: pan-y; min-height: 0; }
      .ig-wo-card { flex: 0 0 100%; display: flex; flex-direction: column; gap: 12px; padding: 14px 20px; opacity: 0.35; transform: scale(0.94); transition: opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out); overflow-y: auto; }
      .ig-wo-card.active { opacity: 1; transform: scale(1); }
      .ig-wo-card.final { border-radius: 18px; background: linear-gradient(160deg, rgba(224,80,63,0.12), transparent 55%); }
      .ig-wo-final-banner { background: rgba(224,80,63,0.15); border: 1px solid rgba(224,80,63,0.35); color: var(--plate-red); border-radius: 12px; padding: 9px 12px; font-size: 12.5px; font-weight: 700; text-align: center; animation: ig-pop 0.5s var(--ease-spring); }
      .ig-wo-card-top { display: flex; gap: 16px; align-items: flex-start; }
      .ig-wo-card-info { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
      .ig-wo-ex-name { margin: 0; font-family: 'Oswald', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: 0.3px; line-height: 1.1; }
      .ig-wo-mini-stats { display: flex; gap: 12px; font-size: 11.5px; color: var(--chalk-dim); flex-wrap: wrap; }
      .ig-wo-hint { margin: 0; font-size: 12.5px; color: var(--chalk-dim); line-height: 1.5; }
      .ig-wo-milestone { font-size: 12.5px; color: var(--plate-yellow); font-weight: 600; }
      .ig-wo-motivation { font-size: 12px; color: var(--chalk-dim); animation: ig-fade-up 0.4s var(--ease-out); }
      .ig-wo-bottom { padding: 12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px); border-top: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 10px; background: rgba(13,15,19,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
      .ig-wo-sets { display: flex; gap: 8px; justify-content: center; }
      .ig-wo-rest { position: absolute; inset: 0; z-index: 5; background: rgba(13,15,19,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px; animation: ig-fade-up 0.25s var(--ease-out); }
      .ig-wo-restring { position: relative; }
      .ig-wo-restring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
      .ig-wo-rest-time { font-size: 34px; font-weight: 700; }
      .ig-wo-rest-btns { display: flex; gap: 10px; }
      .ig-wo-undo { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--chalk-dim); font-family: inherit; font-size: 12px; cursor: pointer; padding: 10px; opacity: 0.8; transition: opacity 0.2s; }
      .ig-wo-undo:active { opacity: 1; }
      .ig-wo-coach { display: flex; flex-direction: column; align-items: center; gap: 7px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 16px 22px; animation: ig-fade-up 0.4s var(--ease-out); max-width: 300px; }
      .ig-wo-coach-name { font-family: 'Oswald', sans-serif; font-size: 20px; font-weight: 700; }
      .ig-wo-coach-sub { font-size: 12px; color: var(--plate-yellow); font-weight: 600; }
      @keyframes ig-go-pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
      .ig-wo-go { font-family: 'Oswald', sans-serif; font-size: 44px; font-weight: 700; color: var(--plate-green); animation: ig-go-pop 0.5s var(--ease-spring); }
      .ig-wo-done { align-items: center; justify-content: center; overflow-y: auto; }
      .ig-wo-done-body { display: flex; flex-direction: column; gap: 14px; padding: 32px 22px; width: 100%; max-width: 380px; align-items: stretch; text-align: center; }
      .ig-wo-done-icon { font-size: 52px; line-height: 1; animation: ig-pop 0.6s var(--ease-spring); }
      .ig-wo-done-title { margin: 0; font-family: 'Oswald', sans-serif; font-size: 26px; letter-spacing: 0.4px; }
      .ig-wo-records { gap: 6px; text-align: left; }
      .ig-wo-record-row { font-size: 13px; }
      .ig-wo-recovery { margin: 0; font-size: 12.5px; color: var(--chalk-dim); line-height: 1.5; }
      .ig-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      @keyframes ig-confetti-fall { 0% { transform: translateY(-40px) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(340deg); opacity: 0.6; } }
      .ig-confetti-bit { position: absolute; top: -40px; font-size: 18px; animation: ig-confetti-fall linear infinite; }
      .ig-recent-list { display: flex; flex-direction: column; gap: 6px; }
      .ig-recent-row { display: flex; align-items: center; gap: 10px; background: rgba(35,39,48,0.5); border: none; border-radius: 10px; padding: 11px 12px; font-family: inherit; color: var(--chalk); cursor: pointer; text-align: left; transition: background 0.2s var(--ease-out); }
      .ig-recent-row:active { background: rgba(35,39,48,0.9); }
      .ig-recent-date { font-size: 13px; font-weight: 600; white-space: nowrap; }
      .ig-recent-meta { flex: 1; font-size: 11.5px; color: var(--chalk-dim); }
      .ig-recent-chev { color: var(--chalk-dim); flex-shrink: 0; }
      .ig-badge-row { display: flex; gap: 8px; align-items: stretch; overflow-x: auto; scrollbar-width: none; }
      .ig-badge-row::-webkit-scrollbar { display: none; }
      .ig-badge-chip { display: flex; flex-direction: column; align-items: center; gap: 3px; background: rgba(35,39,48,0.5); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 12px; min-width: 76px; }
      .ig-badge-icon { font-size: 20px; line-height: 1; }
      .ig-badge-name { font-size: 10px; color: var(--chalk-dim); text-align: center; white-space: nowrap; }
      .ig-badge-more { display: flex; align-items: center; justify-content: center; background: none; border: 1px dashed var(--glass-border); border-radius: 12px; color: var(--chalk-dim); min-width: 40px; cursor: pointer; }

      /* --- Achievements --- */
      .ig-achieve-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .ig-achieve { display: flex; flex-direction: column; align-items: center; gap: 2px; background: rgba(35,39,48,0.4); border: 1px solid var(--glass-border); border-radius: 12px; padding: 12px 8px; opacity: 0.35; filter: grayscale(1); transition: all 0.3s var(--ease-out); }
      .ig-achieve.earned { opacity: 1; filter: none; border-color: rgba(var(--accent-rgb),0.35); box-shadow: 0 0 12px rgba(var(--accent-rgb),0.08); }
      .ig-achieve-icon { font-size: 24px; line-height: 1.2; }
      .ig-achieve-name { font-size: 12px; font-weight: 600; color: var(--chalk); text-align: center; }
      .ig-achieve-desc { font-size: 10px; color: var(--chalk-dim); text-align: center; }

      /* --- Settings --- */
      .ig-accent-row { display: flex; gap: 10px; }
      .ig-accent-swatch { width: 34px; height: 34px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s var(--ease-spring), box-shadow 0.2s; }
      .ig-accent-swatch.active { border-color: var(--chalk); transform: scale(1.15); box-shadow: 0 0 10px rgba(255,255,255,0.2); }

      /* --- Log button --- */
      .ig-btn-log { flex: 0 0 auto; background: var(--plate-yellow); border: none; border-radius: 12px; color: #201a08; padding: 0 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; min-width: 90px; transition: all 0.2s var(--ease-out); box-shadow: 0 2px 8px rgba(var(--accent-rgb),0.2); }
      .ig-btn-log:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(var(--accent-rgb),0.3); }
      .ig-btn-log:active { transform: scale(0.96); }
      .ig-btn-log:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
      .ig-btn-log-icon { font-size: 18px; line-height: 1; }
      .ig-btn-log-label { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }

      /* --- Today's sets --- */
      .ig-today-sets { display: flex; flex-direction: column; gap: 5px; }
      .ig-today-set { display: flex; align-items: center; gap: 8px; background: rgba(35, 39, 48, 0.5); border-radius: 10px; padding: 8px 10px; transition: opacity 0.3s var(--ease-out); }
      .ig-today-set.done { opacity: 1; }
      .ig-today-set.done .ig-today-detail { text-decoration: line-through; text-decoration-color: var(--plate-green); }
      .ig-today-idx { width: 22px; height: 22px; border-radius: 50%; background: var(--steel); font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--chalk-dim); transition: all 0.2s var(--ease-spring); }
      .ig-today-set.done .ig-today-idx { background: var(--plate-green); color: #fff; box-shadow: 0 0 6px rgba(88,164,92,0.4); transform: scale(1.1); }
      .ig-today-detail { flex: 1; font-size: 13px; color: var(--chalk-dim); }
      .ig-today-check { font-size: 13px; flex-shrink: 0; }
      .ig-today-pending { flex: 1; font-size: 13px; color: var(--chalk-dim); opacity: 0.5; }
      .ig-pr-badge { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--plate-red); margin-top: 2px; }

      /* --- Last session inline --- */
      .ig-last-session { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--glass-border); padding-top: 12px; margin-top: 6px; }
      .ig-last-label { font-size: 10px; color: var(--chalk-dim); display: flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

      .ig-rest-inline { display: flex; align-items: center; gap: 10px; background: rgba(26, 29, 36, 0.8); border: 1px solid rgba(var(--accent-rgb),0.4); border-radius: 12px; padding: 10px 14px; color: var(--plate-yellow); backdrop-filter: blur(12px) saturate(1.2); -webkit-backdrop-filter: blur(12px) saturate(1.2); }
      .ig-rest-track { flex: 1; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
      .ig-rest-fill { height: 100%; background: var(--plate-yellow); border-radius: 3px; transition: width 1s linear; }
      .ig-rest-time { font-size: 13px; font-weight: 700; }

      .ig-set-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-set-row { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border-radius: 8px; padding: 8px 10px; }
      .ig-set-idx { width: 20px; height: 20px; border-radius: 50%; background: var(--steel); font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .ig-set-detail { flex: 1; font-size: 14px; }
      .ig-flame { color: var(--plate-red); flex-shrink: 0; }

      .ig-flash { display: flex; align-items: center; gap: 8px; background: rgba(88,164,92,0.12); border: 1px solid rgba(88,164,92,0.3); color: var(--plate-green); padding: 10px 14px; border-radius: 12px; font-size: 13px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
      .ig-flash.pr { background: rgba(224,80,63,0.12); border-color: rgba(224,80,63,0.3); color: var(--plate-red); }

      .ig-num { font-family: 'Oswald', sans-serif; font-size: 32px; font-weight: 700; line-height: 1; letter-spacing: -0.5px; }
      .ig-caption-sub { font-size: 11px; color: var(--chalk-dim); margin-top: 3px; }

      .ig-chart-wrap { margin-top: 2px; }
      .ig-legend { display: flex; gap: 16px; font-size: 11px; color: var(--chalk-dim); margin-top: 6px; }
      .ig-legend > span { display: flex; align-items: center; gap: 5px; }
      .ig-legend-dot { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
      .ig-history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-history-row { display: flex; align-items: center; gap: 10px; font-size: 13px; background: rgba(35, 39, 48, 0.4); padding: 10px 12px; border-radius: 10px; }
      .ig-history-date { flex: 1; color: var(--chalk-dim); }
      .ig-history-vol { color: var(--chalk-dim); font-size: 11px; }

      .ig-timer-pane { align-items: center; padding-top: 24px; gap: 28px; }
      .ig-ring-wrap { position: relative; width: 220px; height: 220px; filter: drop-shadow(0 4px 20px rgba(var(--accent-rgb),0.15)); }
      .ig-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
      .ig-timer-text { font-size: 40px; font-weight: 700; letter-spacing: -0.5px; }
      .ig-timer-controls { display: flex; align-items: center; gap: 22px; }
      .ig-preset-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
      .ig-chip { background: rgba(35, 39, 48, 0.5); border: 1px solid var(--glass-border); color: var(--chalk); border-radius: 999px; padding: 8px 14px; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s var(--ease-out); }
      .ig-chip:hover { border-color: var(--chalk-dim); background: rgba(255,255,255,0.04); }
      .ig-chip.active { background: var(--plate-yellow); border-color: var(--plate-yellow); color: #201a08; font-weight: 600; box-shadow: 0 2px 8px rgba(var(--accent-rgb),0.25); }

      .ig-bmi-result { align-items: center; text-align: center; padding: 24px 16px; }
      .ig-bmi-cat { font-size: 14px; font-weight: 600; margin-top: 2px; }
      .ig-bmi-bar { display: flex; gap: 3px; width: 100%; margin-top: 12px; }
      .ig-bmi-seg { height: 10px; flex: 1; border-radius: 6px; transition: all 0.3s var(--ease-out); }
      .ig-bmi-seg:hover { transform: scaleY(1.3); }
      .ig-range-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .ig-range-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .ig-range-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      .ig-range-val { margin-left: auto; color: var(--chalk-dim); }

      @media (max-width: 380px) {
        .ig-num { font-size: 26px; }
        .ig-timer-text { font-size: 32px; }
        .ig-main { padding: 16px 12px 80px; }
        .ig-card { padding: 14px; border-radius: 14px; }
      }
    `}</style>
  );
}
