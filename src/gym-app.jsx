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
  Trash2,
  TrendingUp,
  Timer as TimerIcon,
  Home as HomeIcon,
  Play,
  Pause,
  RotateCcw,
  Ruler,
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
    nr: 12,
    reps: "8–12",
    hint: "Rechtwinkel der Arme, Griffe auf Schulterhöhe",
  },
  Chestpress: {
    group: "Oberkörper",
    nr: 10,
    reps: "8–12",
    hint: "Rechtwinkel der Arme, Griffe auf Brusthöhe",
  },
  Pulldown: {
    group: "Oberkörper",
    nr: 13,
    reps: "8–12",
    hint: "Brust zum Polster, Ellbogen nach unten zur Körpermitte",
  },
  "Low Row": {
    group: "Oberkörper",
    nr: 16,
    reps: "8–12",
    hint: "Brust zum Polster, Ellbogen nach hinten ziehen",
  },
  "Lower Back": {
    group: "Oberkörper",
    nr: 23,
    reps: "8–12",
    hint: "Hüfte nach hinten, Schultern auf dem oberen Polster",
  },
  "Arm Extension": {
    group: "Oberkörper",
    nr: 18,
    reps: "8–12",
    hint: "Oberarme am Körper, nur die Unterarme bewegen",
  },
  "Arm Curl": {
    group: "Oberkörper",
    nr: 19,
    reps: "8–12",
    hint: "Oberarme am Körper, nur die Unterarme bewegen",
  },
  "Leg Press": {
    group: "Unterkörper",
    nr: 3,
    reps: "6–10",
    hint: "2er- oder 3er-Linie, Fußspitzen leicht nach außen",
  },
  "Leg Extension": {
    group: "Unterkörper",
    nr: 2,
    reps: "8–12",
    hint: "Polster oberhalb vom Knöchel, Fußspitzen nach oben strecken",
  },
  "Leg Curl": {
    group: "Unterkörper",
    nr: 7,
    reps: "8–12",
    hint: "Polster oberhalb vom Knöchel, Fußspitzen nach oben strecken",
  },
  Adductor: {
    group: "Unterkörper",
    nr: 8,
    reps: "8–12",
    hint: "Selbsterklärend",
  },
  Abductor: {
    group: "Unterkörper",
    nr: 1,
    reps: "8–12",
    hint: "Selbsterklärend",
  },
  "Abdominal Crunch": {
    group: "Unterkörper",
    nr: 20,
    reps: "8–12",
    hint: "Selbsterklärend",
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

const todayISO = () => new Date().toISOString().slice(0, 10);
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

/* ---------- Signature: barbell that loads up with weight ---------- */
function Barbell({ weight = 0, size = "md" }) {
  const w = Math.max(0, Number(weight) || 0);
  const tiers = [
    { min: 80, color: "var(--plate-red)", h: 46, wd: 12 },
    { min: 60, color: "var(--plate-blue)", h: 40, wd: 11 },
    { min: 40, color: "var(--plate-yellow)", h: 34, wd: 10 },
    { min: 20, color: "var(--plate-green)", h: 28, wd: 9 },
    { min: 1, color: "var(--plate-white)", h: 20, wd: 7 },
  ];
  const plates = tiers.filter((t) => w >= t.min);
  const scale = size === "sm" ? 0.62 : 1;
  const barW = 200 * scale;
  const centerH = 8 * scale;
  return (
    <svg
      width={barW + 44 * scale}
      height={70 * scale}
      viewBox={`0 0 ${barW + 44 * scale} ${70 * scale}`}
      role="img"
      aria-label={`Balkendarstellung ${w} Kilogramm`}
    >
      <rect
        x={22 * scale}
        y={(70 * scale - centerH) / 2}
        width={barW}
        height={centerH}
        rx={centerH / 2}
        fill="var(--steel)"
      />
      {plates.map((p, i) => {
        const x = 22 * scale - (i + 1) * (p.wd * scale * 0.9);
        return (
          <rect
            key={"l" + i}
            x={x}
            y={(70 * scale - p.h * scale) / 2}
            width={p.wd * scale}
            height={p.h * scale}
            rx={2 * scale}
            fill={p.color}
          />
        );
      })}
      {plates.map((p, i) => {
        const x = 22 * scale + barW + i * (p.wd * scale * 0.9);
        return (
          <rect
            key={"r" + i}
            x={x}
            y={(70 * scale - p.h * scale) / 2}
            width={p.wd * scale}
            height={p.h * scale}
            rx={2 * scale}
            fill={p.color}
          />
        );
      })}
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
    settings: { autoRest: true, restSeconds: 90, sound: true },
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

  if (!loaded) {
    return (
      <div className="ig-app">
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
      <div className="ig-app">
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

  return (
    <div className="ig-app">
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
            aria-label={
              data.settings?.sound !== false
                ? "Sound stummschalten"
                : "Sound einschalten"
            }
          >
            {data.settings?.sound !== false ? (
              <Volume2 size={18} />
            ) : (
              <VolumeX size={18} />
            )}
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
          {tab === "home" && <LogTab data={data} update={update} />}
          {tab === "plan" && <PlanTab data={data} update={update} />}
          {tab === "progress" && <ProgressTab data={data} />}
          {tab === "timer" && (
            <TimerTab soundOn={data.settings?.sound !== false} />
          )}
          {tab === "bmi" && <BmiTab data={data} update={update} />}
        </main>

        <nav className="ig-tabbar">
          <TabBtn
            active={tab === "home"}
            onClick={() => setTab("home")}
            icon={<HomeIcon size={20} />}
            label="Training"
          />
          <TabBtn
            active={tab === "plan"}
            onClick={() => setTab("plan")}
            icon={<CalendarDays size={20} />}
            label="Plan"
          />
          <TabBtn
            active={tab === "progress"}
            onClick={() => setTab("progress")}
            icon={<TrendingUp size={20} />}
            label="Verlauf"
          />
          <TabBtn
            active={tab === "timer"}
            onClick={() => setTab("timer")}
            icon={<TimerIcon size={20} />}
            label="Timer"
          />
          <TabBtn
            active={tab === "bmi"}
            onClick={() => setTab("bmi")}
            icon={<Ruler size={20} />}
            label="BMI"
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

/* ---------------- Inline rest timer ---------------- */
function InlineRestTimer({ seconds, onDone, onCancel, soundOn = true }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const iv = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(iv);
          playSound("timer", soundOn);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          onDone();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [seconds]); // eslint-disable-line
  const pct = Math.max(0, left / seconds);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="ig-rest-inline">
      <TimerIcon size={16} />
      <div className="ig-rest-track">
        <div className="ig-rest-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="mono ig-rest-time">
        {mm}:{ss}
      </span>
      <button
        className="ig-icon-btn ghost"
        onClick={onCancel}
        aria-label="Pause beenden"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ---------------- Home / Log tab ---------------- */
function LogTab({ data, update }) {
  const todayUnit = getTodayUnit(data.split);
  const unitGroup =
    todayUnit === "ok"
      ? "Oberkörper"
      : todayUnit === "uk"
        ? "Unterkörper"
        : null;

  const firstOfGroup = unitGroup
    ? data.exercises.find((ex) => EXERCISE_META[ex]?.group === unitGroup)
    : null;

  const [exercise, setExercise] = useState(
    firstOfGroup || data.exercises[0] || "",
  );
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [flash, setFlash] = useState(null);
  const [resting, setResting] = useState(false);

  const today = todayISO();

  const logsForExercise = useMemo(
    () => data.logs.filter((l) => l.exercise === exercise),
    [data.logs, exercise],
  );

  const todayLog = logsForExercise.find((l) => l.date === today);

  const lastSession = useMemo(() => {
    return (
      logsForExercise
        .filter((l) => l.date !== today)
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null
    );
  }, [logsForExercise, today]);

  useEffect(() => {
    if (lastSession && !todayLog) {
      const top = lastSession.sets[lastSession.sets.length - 1];
      if (top) {
        setWeight(top.weight);
        setReps(top.reps);
      }
    }
  }, [exercise]); // eslint-disable-line

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

  const todayTop = todayLog
    ? todayLog.sets.reduce((m, s) => Math.max(m, s.weight), 0)
    : 0;

  const weekCount = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const dates = new Set(
      data.logs
        .filter((l) => new Date(l.date + "T00:00:00") >= monday)
        .map((l) => l.date),
    );
    return dates.size;
  }, [data.logs]);

  const todayVolume = useMemo(() => {
    return data.logs
      .filter((l) => l.date === today)
      .reduce(
        (v, l) => v + l.sets.reduce((sv, s) => sv + s.reps * s.weight, 0),
        0,
      );
  }, [data.logs, today]);

  const step = (setter, current, delta, min) => {
    const v = round1(Math.max(min, (Number(current) || 0) + delta));
    setter(v);
  };

  const addSet = () => {
    const w = Number(weight);
    const r = Number(reps);
    if (!exercise || !w || !r) return;
    update((prev) => {
      const logs = [...prev.logs];
      const idx = logs.findIndex(
        (l) => l.exercise === exercise && l.date === today,
      );
      if (idx >= 0)
        logs[idx] = {
          ...logs[idx],
          sets: [...logs[idx].sets, { reps: r, weight: w }],
        };
      else
        logs.push({
          id: Date.now(),
          exercise,
          date: today,
          sets: [{ reps: r, weight: w }],
        });
      return { ...prev, logs };
    });
    const soundOn = data.settings?.sound !== false;
    if (w > bestBefore && bestBefore > 0) {
      setFlash({ type: "pr", text: `Neuer Rekord bei ${exercise}: ${w} kg` });
      setTimeout(() => setFlash(null), 3200);
      playSound("pr", soundOn);
      if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
    } else {
      setFlash(null);
      playSound("set", soundOn);
      if (navigator.vibrate) navigator.vibrate(40);
    }
    if (data.settings?.autoRest) setResting(true);
  };

  const removeSet = (setIdx) => {
    update((prev) => {
      const logs = prev.logs
        .map((l) => {
          if (l.exercise === exercise && l.date === today) {
            return { ...l, sets: l.sets.filter((_, i) => i !== setIdx) };
          }
          return l;
        })
        .filter((l) => l.sets.length > 0);
      return { ...prev, logs };
    });
  };

  const addExercise = () => {
    const name = newName.trim();
    if (!name || data.exercises.includes(name)) {
      setShowAdd(false);
      setNewName("");
      return;
    }
    update((prev) => ({ ...prev, exercises: [...prev.exercises, name] }));
    setExercise(name);
    setShowAdd(false);
    setNewName("");
  };

  const removeExercise = (name) => {
    if (EXERCISE_META[name]) return;
    update((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((e) => e !== name),
    }));
    if (exercise === name)
      setExercise(data.exercises.find((e) => e !== name) || "");
  };

  const TARGET_SETS = 3;
  const doneCount = todayLog?.sets.length || 0;

  return (
    <div className="ig-tabpane">
      {todayUnit !== "rest" ? (
        <div className="ig-plan-banner">
          <CalendarDays size={16} />
          <span>
            Heute laut Plan:{" "}
            <strong>
              {UNIT_LABEL[todayUnit]}
              {todayUnit !== "gk" ? " Einheit" : ""}
            </strong>
          </span>
        </div>
      ) : (
        <div className="ig-plan-banner rest">
          <Moon size={16} />
          <span>Heute laut Plan: Ruhetag — Regeneration zählt auch.</span>
        </div>
      )}

      <div className="ig-barbell-row">
        <Barbell weight={todayTop || bestBefore} />
        <div className="ig-barbell-caption">
          <span className="ig-num">{todayTop || bestBefore || 0} kg</span>
          <span className="ig-caption-sub">
            {todayTop
              ? "Heute bewegt"
              : bestBefore
                ? "Letzte Bestleistung"
                : "Noch kein Satz geloggt"}
          </span>
        </div>
      </div>

      <div className="ig-stat-grid">
        <div className="ig-stat">
          <span className="ig-stat-label">Diese Woche</span>
          <span className="ig-stat-value mono">{weekCount}× </span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-label">Volumen heute</span>
          <span className="ig-stat-value mono">
            {Math.round(todayVolume)} kg
          </span>
        </div>
      </div>

      {flash && (
        <div className={"ig-flash" + (flash.type === "pr" ? " pr" : "")}>
          {flash.type === "pr" ? <Flame size={16} /> : <TrendingUp size={16} />}
          <span>{flash.text}</span>
        </div>
      )}

      {resting && (
        <InlineRestTimer
          seconds={data.settings?.restSeconds || 90}
          onDone={() => setResting(false)}
          onCancel={() => setResting(false)}
          soundOn={data.settings?.sound !== false}
        />
      )}

      {/* --- Exercise + Set counter card --- */}
      <div className="ig-card ig-ex-card">
        <div className="ig-ex-header">
          <div className="ig-ex-picker-row">
            <select
              className="ig-select ig-ex-select"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
            >
              <optgroup label="Oberkörper Einheit">
                {data.exercises
                  .filter((ex) => EXERCISE_META[ex]?.group === "Oberkörper")
                  .map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Unterkörper Einheit">
                {data.exercises
                  .filter((ex) => EXERCISE_META[ex]?.group === "Unterkörper")
                  .map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
              </optgroup>
              {data.exercises.some((ex) => !EXERCISE_META[ex]) && (
                <optgroup label="Eigene Übungen">
                  {data.exercises
                    .filter((ex) => !EXERCISE_META[ex])
                    .map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <button
              className="ig-icon-btn"
              onClick={() => setShowAdd((s) => !s)}
              aria-label="Übung hinzufügen"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Set progress dots */}
          <div className="ig-set-progress">
            {Array.from({ length: TARGET_SETS }, (_, i) => (
              <span
                key={i}
                className={
                  "ig-prog-dot" +
                  (i < doneCount ? " done" : "") +
                  (i === doneCount ? " next" : "")
                }
              />
            ))}
            <span className="ig-prog-text">
              {doneCount >= TARGET_SETS
                ? "Fertig!"
                : `${doneCount} / ${TARGET_SETS}`}
            </span>
          </div>
        </div>

        {showAdd && (
          <div className="ig-add-row">
            <input
              className="ig-input"
              placeholder="Neue Übung, z. B. Beinbeuger"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
            />
            <button
              className="ig-icon-btn primary"
              onClick={addExercise}
              aria-label="Speichern"
            >
              <Check size={18} />
            </button>
          </div>
        )}

        {EXERCISE_META[exercise] && (
          <div className="ig-ex-meta">
            <span className="ig-badge">Gerät {EXERCISE_META[exercise].nr}</span>
            <span className="ig-ex-hint">{EXERCISE_META[exercise].hint}</span>
          </div>
        )}

        {!EXERCISE_META[exercise] && data.exercises.length > 1 && (
          <button
            className="ig-link-danger"
            onClick={() => removeExercise(exercise)}
          >
            <Trash2 size={13} /> &quot;{exercise}&quot; entfernen
          </button>
        )}

        {/* --- Stepper row --- */}
        <div className="ig-set-log-row">
          <div className="ig-set-stepper">
            <span className="ig-steplabel">Wdh.</span>
            <div className="ig-steplabel-controls">
              <button
                className="ig-step-mini"
                onClick={() => step(setReps, reps, -1, 1)}
              >
                <Minus size={14} />
              </button>
              <span className="ig-step-val mono">{reps}</span>
              <button
                className="ig-step-mini"
                onClick={() => step(setReps, reps, 1, 1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="ig-set-stepper">
            <span className="ig-steplabel">kg</span>
            <div className="ig-steplabel-controls">
              <button
                className="ig-step-mini"
                onClick={() => step(setWeight, weight, -2.5, 0)}
              >
                <Minus size={14} />
              </button>
              <span className="ig-step-val mono">{weight}</span>
              <button
                className="ig-step-mini"
                onClick={() => step(setWeight, weight, 2.5, 0)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button
            className="ig-btn-log"
            onClick={addSet}
            disabled={doneCount >= TARGET_SETS}
          >
            <span className="ig-btn-log-icon">
              {doneCount >= TARGET_SETS ? "\u2713" : "\u26A1"}
            </span>
            <span className="ig-btn-log-label">
              {doneCount >= TARGET_SETS
                ? "Alle Sätze erledigt"
                : `Satz ${doneCount + 1} von ${TARGET_SETS}`}
            </span>
          </button>
        </div>

        {/* --- Toggles --- */}
        <div className="ig-toggles">
          <label className="ig-toggle-row">
            <input
              type="checkbox"
              checked={!!data.settings?.autoRest}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, autoRest: e.target.checked },
                }))
              }
            />
            <span>Pause ({data.settings?.restSeconds || 90}s)</span>
          </label>
        </div>

        {data.settings?.autoRest && (
          <div className="ig-preset-row" style={{ marginTop: 0 }}>
            {[30, 60, 90, 120, 180].map((s) => (
              <button
                key={s}
                className={
                  "ig-chip" +
                  ((data.settings?.restSeconds || 90) === s ? " active" : "")
                }
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, restSeconds: s },
                  }))
                }
              >
                {s < 60 ? `${s}s` : `${s / 60} min`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Today's sets card --- */}
      <div className="ig-card">
        <div className="ig-field-label">Heute — {exercise}</div>
        {!todayLog || todayLog.sets.length === 0 ? (
          <p className="ig-empty">Noch keine Sätze. Los legst!</p>
        ) : (
          <div className="ig-today-sets">
            {Array.from({ length: TARGET_SETS }, (_, i) => {
              const set = todayLog.sets[i];
              const isDone = !!set;
              return (
                <div
                  key={i}
                  className={
                    "ig-today-set" +
                    (isDone ? " done" : "") +
                    (i === doneCount - 1 ? " last" : "")
                  }
                >
                  <span className="ig-today-idx">{i + 1}</span>
                  {isDone ? (
                    <>
                      <span className="ig-today-detail mono">
                        {set.reps} × {set.weight} kg
                      </span>
                      <span className="ig-today-check">
                        {i === doneCount - 1 &&
                        todayLog.sets.length >= TARGET_SETS
                          ? "\u2B50"
                          : "\u2713"}
                      </span>
                      <button
                        className="ig-icon-btn ghost"
                        onClick={() => removeSet(i)}
                        aria-label="Satz löschen"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="ig-today-pending mono">
                      {reps} × {weight} kg
                    </span>
                  )}
                </div>
              );
            })}
            {todayLog.sets.filter(
              (s) => s.weight > bestBefore && bestBefore > 0,
            ).length > 0 && (
              <div className="ig-pr-badge">
                <Flame size={12} /> Neuer Rekord!
              </div>
            )}
          </div>
        )}

        {lastSession && (
          <div className="ig-last-session">
            <span className="ig-last-label">
              <History size={11} /> Letztes Mal · {fmtDate(lastSession.date)}
            </span>
            <div className="ig-last-sets">
              {lastSession.sets.map((s, i) => (
                <span key={i} className="ig-badge dim mono">
                  {s.reps} × {s.weight} kg
                </span>
              ))}
            </div>
          </div>
        )}
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

  return (
    <div className="ig-tabpane">
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

      <div className="ig-stat-grid four">
        <div className="ig-stat">
          <span className="ig-stat-label">Bestwert</span>
          <span className="ig-stat-value mono">{best} kg</span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-label">1RM geschätzt</span>
          <span className="ig-stat-value mono">{Math.round(bestE1)} kg</span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-label">Einheiten</span>
          <span className="ig-stat-value mono">{sessions}</span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-label">Zuwachs</span>
          <span
            className={
              "ig-stat-value mono" +
              (diff > 0 ? " pos" : diff < 0 ? " neg" : "")
            }
          >
            {diff > 0 ? "+" : ""}
            {diff} kg
          </span>
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
          <p className="ig-empty">Noch keine Einträge.</p>
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
          <p className="ig-empty">Noch keine Einträge.</p>
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
    </div>
  );
}

/* ---------------- Timer tab ---------------- */
const PRESETS = [30, 60, 90, 120, 180];

function TimerTab({ soundOn = true }) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            playSound("timer", soundOn);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line

  const setPreset = (s) => {
    setDuration(s);
    setRemaining(s);
    setRunning(false);
  };
  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setRemaining(duration);
  };

  const pct = duration > 0 ? remaining / duration : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const r = 90;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="ig-tabpane ig-timer-pane">
      <div className="ig-ring-wrap">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="14"
          />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={
              remaining === 0 ? "var(--plate-green)" : "var(--plate-yellow)"
            }
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            transform="rotate(-90 110 110)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="ig-ring-center">
          <span className="ig-timer-text mono">
            {mm}:{ss}
          </span>
          <span className="ig-caption-sub">Pause</span>
        </div>
      </div>

      <div className="ig-timer-controls">
        <button
          className="ig-icon-btn lg"
          onClick={reset}
          aria-label="Zurücksetzen"
        >
          <RotateCcw size={20} />
        </button>
        <button className="ig-btn-primary lg round" onClick={toggle}>
          {running ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <div style={{ width: 44 }} />
      </div>

      <div className="ig-preset-row">
        {PRESETS.map((s) => (
          <button
            key={s}
            className={"ig-chip" + (duration === s ? " active" : "")}
            onClick={() => setPreset(s)}
          >
            {s < 60 ? `${s}s` : `${s / 60}min`}
          </button>
        ))}
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
        --bg: #14161a;
        --surface-1: #1c1f26;
        --surface-2: #23262e;
        --chalk: #edeae3;
        --chalk-dim: #9a9ca3;
        --steel: #565f70;
        --grid: #2c2f38;
        --plate-red: #e0503f;
        --plate-blue: #3f7fd4;
        --plate-yellow: #e3b23c;
        --plate-green: #58a45c;
        --plate-white: #d8d5cc;
        font-family: 'Inter', system-ui, sans-serif;
        color: var(--chalk);
        background: var(--bg);
        min-height: 100vh;
        display: flex; justify-content: center;
        box-sizing: border-box;
      }
      .ig-app * { box-sizing: border-box; }
      .ig-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100vh; color: var(--chalk-dim); width: 100%; }

      @keyframes ig-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      @keyframes ig-pop { 0% { transform: scale(0.96); } 45% { transform: scale(1.04); } 100% { transform: scale(1); } }
      @keyframes ig-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(224,80,63,0.4); } 50% { box-shadow: 0 0 0 6px rgba(224,80,63,0); } }

      .ig-onboarding { flex: 1; display: flex; flex-direction: column; gap: 16px; padding: 40px 22px 28px; animation: ig-fade-up 0.35s ease; }
      .ig-onb-header { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--plate-yellow); margin-bottom: 4px; }
      .ig-onb-brand { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; color: var(--chalk); }
      .ig-onb-sub { font-size: 13px; color: var(--chalk-dim); }
      .ig-onb-dots { display: flex; justify-content: center; gap: 8px; }
      .ig-onb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--grid); transition: background 0.25s, transform 0.25s; }
      .ig-onb-dot.active { background: var(--plate-yellow); transform: scale(1.25); }
      .ig-onb-step { display: flex; flex-direction: column; gap: 14px; animation: ig-fade-up 0.3s ease; }
      .ig-onb-gender-row { display: flex; gap: 10px; }
      .ig-onb-gender { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: var(--surface-1); border: 1.5px solid var(--grid); color: var(--chalk); border-radius: 14px; padding: 18px 0 14px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s; }
      .ig-onb-gender:active { transform: scale(0.97); }
      .ig-onb-gender.active { border-color: var(--plate-yellow); background: rgba(227,178,60,0.1); color: var(--plate-yellow); }
      .ig-onb-gender-icon { font-size: 30px; line-height: 1; }
      .ig-onb-field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .ig-onb-back { background: none; border: none; color: var(--chalk-dim); font-family: inherit; font-size: 13px; cursor: pointer; padding: 8px; align-self: center; }

      .ig-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
      .ig-btn-primary:not(:disabled):active { transform: scale(0.97); }
      .ig-card { animation: ig-fade-up 0.3s ease; }
      .ig-flash { animation: ig-fade-up 0.25s ease; }
      .ig-flash.pr { animation: ig-pop 0.45s ease, ig-pulse 1.4s ease 2; }
      .ig-preset-card { transition: border-color 0.2s, transform 0.15s; }
      .ig-preset-card:active { transform: scale(0.98); }
      .ig-tab { transition: color 0.2s, transform 0.15s; }
      .ig-tab:active { transform: scale(0.94); }

      @media (prefers-reduced-motion: reduce) {
        .ig-app *, .ig-app *::before, .ig-app *::after { animation: none !important; transition: none !important; }
      }
      .ig-phone { width: 100%; max-width: 430px; display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
      .ig-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--grid); }
      .ig-brand { display: flex; align-items: center; gap: 8px; font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
      .ig-date { font-size: 12px; color: var(--chalk-dim); text-transform: capitalize; }
      .ig-mute-btn { background: none; border: none; color: var(--chalk-dim); padding: 4px; cursor: pointer; display: flex; align-items: center; transition: color 0.2s; }
      .ig-mute-btn:hover { color: var(--chalk); }
      .ig-main { flex: 1; padding: 16px 16px 90px; overflow-y: auto; }
      .ig-tabpane { display: flex; flex-direction: column; gap: 14px; }

      .ig-tabbar { position: sticky; bottom: 0; display: flex; background: var(--surface-1); border-top: 1px solid var(--grid); padding: 6px 2px calc(env(safe-area-inset-bottom, 0px) + 6px); }
      .ig-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: var(--chalk-dim); font-family: inherit; font-size: 10.5px; padding: 6px 0; cursor: pointer; }
      .ig-tab.active { color: var(--plate-yellow); }

      .ig-card { background: var(--surface-1); border: 1px solid var(--grid); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .ig-field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--chalk-dim); font-weight: 600; }
      .ig-empty { font-size: 13px; color: var(--chalk-dim); margin: 0; line-height: 1.5; }

      .ig-select, .ig-input { background: var(--surface-2); color: var(--chalk); border: 1px solid var(--grid); border-radius: 10px; padding: 10px 12px; font-size: 15px; font-family: inherit; width: 100%; appearance: none; }
      .ig-select:focus, .ig-input:focus { outline: 2px solid var(--plate-yellow); outline-offset: 1px; }
      .ig-input.center { text-align: center; }
      .mono { font-family: 'JetBrains Mono', monospace; }

      .ig-exercise-picker { display: flex; gap: 8px; }

      .ig-plan-hint { display: flex; flex-direction: column; gap: 6px; }
      .ig-plan-badges { display: flex; gap: 6px; flex-wrap: wrap; }
      .ig-badge { background: var(--surface-2); border: 1px solid var(--grid); border-radius: 999px; padding: 3px 10px; font-size: 11px; color: var(--chalk); font-family: 'JetBrains Mono', monospace; }
      .ig-badge.dim { color: var(--chalk-dim); }
      .ig-plan-text { font-size: 12px; color: var(--chalk-dim); line-height: 1.45; }

      .ig-plan-banner { display: flex; align-items: center; gap: 8px; background: rgba(227,178,60,0.12); border: 1px solid var(--plate-yellow); color: var(--plate-yellow); border-radius: 10px; padding: 9px 12px; font-size: 13px; }
      .ig-plan-banner strong { font-weight: 600; }
      .ig-plan-banner.rest { background: rgba(86,95,112,0.18); border-color: var(--steel); color: var(--chalk-dim); }

      .ig-preset-list { display: flex; flex-direction: column; gap: 8px; }
      .ig-preset-card { position: relative; text-align: left; background: var(--surface-2); border: 1px solid var(--grid); color: var(--chalk); border-radius: 10px; padding: 10px 12px; font-family: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
      .ig-preset-card.active { border-color: var(--plate-yellow); }
      .ig-preset-name { font-weight: 600; font-size: 14px; }
      .ig-preset-desc { font-size: 12px; color: var(--chalk-dim); }
      .ig-preset-check { position: absolute; right: 12px; top: 12px; color: var(--plate-yellow); }
      .ig-mode-toggle { display: flex; gap: 8px; }
      .ig-week-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-week-row { display: flex; align-items: center; gap: 10px; }
      .ig-week-row.today .ig-week-day { color: var(--plate-yellow); font-weight: 600; }
      .ig-week-day { flex: 1; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .ig-today-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--plate-yellow); }
      .ig-select.slim { width: 150px; padding: 7px 10px; font-size: 13px; }
      .ig-select.slim.narrow { width: 110px; }
      .ig-interval-box { display: flex; flex-direction: column; gap: 10px; }
      .ig-interval-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }

      .ig-add-row { display: flex; gap: 8px; }
      .ig-icon-btn { background: var(--surface-2); border: 1px solid var(--grid); color: var(--chalk); border-radius: 10px; width: 42px; height: 42px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .ig-icon-btn.primary { background: var(--plate-yellow); border-color: var(--plate-yellow); color: #201a08; }
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

      .ig-btn-primary { background: var(--plate-yellow); color: #201a08; border: none; border-radius: 10px; padding: 0 16px; height: 44px; font-family: inherit; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; justify-content: center; }
      .ig-btn-primary.wide { width: 100%; }
      .ig-btn-primary.lg { height: 60px; width: 60px; border-radius: 50%; padding: 0; }

      .ig-toggle-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--chalk-dim); cursor: pointer; }
      .ig-toggle-row input { accent-color: var(--plate-yellow); width: 16px; height: 16px; }

      .ig-last-card { gap: 8px; }
      .ig-last-sets { display: flex; gap: 6px; flex-wrap: wrap; }

      /* --- Exercise card --- */
      .ig-ex-card { gap: 12px; }
      .ig-ex-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .ig-ex-picker-row { flex: 1; display: flex; gap: 8px; }
      .ig-ex-select { min-width: 0; flex: 1; }
      .ig-set-progress { display: flex; align-items: center; gap: 5px; flex-shrink: 0; padding-top: 2px; }
      .ig-prog-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--surface-2); border: 2px solid var(--grid); transition: all 0.3s; }
      .ig-prog-dot.done { background: var(--plate-green); border-color: var(--plate-green); }
      .ig-prog-dot.next { border-color: var(--plate-yellow); box-shadow: 0 0 0 2px rgba(227,178,60,0.3); }
      .ig-prog-text { font-size: 11px; font-weight: 600; color: var(--chalk-dim); font-family: 'JetBrains Mono', monospace; margin-left: 2px; }
      .ig-ex-meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
      .ig-ex-hint { font-size: 11px; color: var(--chalk-dim); width: 100%; line-height: 1.4; margin-top: 2px; }

      /* --- Logging stepper --- */
      .ig-set-log-row { display: flex; gap: 8px; align-items: stretch; }
      .ig-set-stepper { flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: center; }
      .ig-steplabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--chalk-dim); font-weight: 600; }
      .ig-steplabel-controls { display: flex; align-items: center; gap: 6px; background: var(--surface-2); border-radius: 10px; padding: 2px; width: 100%; justify-content: center; }
      .ig-step-mini { background: none; border: none; color: var(--chalk-dim); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; }
      .ig-step-mini:active { background: var(--grid); }
      .ig-step-val { font-size: 18px; font-weight: 700; min-width: 36px; text-align: center; color: var(--chalk); }

      /* --- Log button --- */
      .ig-btn-log { flex: 0 0 auto; background: var(--plate-yellow); border: none; border-radius: 10px; color: #201a08; padding: 0 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; cursor: pointer; min-width: 90px; transition: transform 0.15s, opacity 0.2s; }
      .ig-btn-log:active { transform: scale(0.96); }
      .ig-btn-log:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .ig-btn-log-icon { font-size: 18px; line-height: 1; }
      .ig-btn-log-label { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }

      /* --- Toggles row --- */
      .ig-toggles { display: flex; gap: 16px; }

      /* --- Today's sets --- */
      .ig-today-sets { display: flex; flex-direction: column; gap: 5px; }
      .ig-today-set { display: flex; align-items: center; gap: 8px; background: var(--surface-2); border-radius: 8px; padding: 7px 9px; transition: opacity 0.3s; }
      .ig-today-set.done { opacity: 1; }
      .ig-today-set.done .ig-today-detail { text-decoration: line-through; text-decoration-color: var(--plate-green); }
      .ig-today-idx { width: 20px; height: 20px; border-radius: 50%; background: var(--steel); font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--chalk-dim); }
      .ig-today-set.done .ig-today-idx { background: var(--plate-green); color: #fff; }
      .ig-today-detail { flex: 1; font-size: 13px; color: var(--chalk-dim); }
      .ig-today-check { font-size: 13px; flex-shrink: 0; }
      .ig-today-pending { flex: 1; font-size: 13px; color: var(--chalk-dim); opacity: 0.5; }
      .ig-pr-badge { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--plate-red); margin-top: 2px; }

      /* --- Last session inline --- */
      .ig-last-session { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--grid); padding-top: 10px; margin-top: 4px; }
      .ig-last-label { font-size: 10px; color: var(--chalk-dim); display: flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.4px; }

      .ig-rest-inline { display: flex; align-items: center; gap: 10px; background: var(--surface-1); border: 1px solid var(--plate-yellow); border-radius: 10px; padding: 9px 12px; color: var(--plate-yellow); }
      .ig-rest-track { flex: 1; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
      .ig-rest-fill { height: 100%; background: var(--plate-yellow); border-radius: 3px; transition: width 1s linear; }
      .ig-rest-time { font-size: 13px; font-weight: 700; }

      .ig-set-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-set-row { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border-radius: 8px; padding: 8px 10px; }
      .ig-set-idx { width: 20px; height: 20px; border-radius: 50%; background: var(--steel); font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .ig-set-detail { flex: 1; font-size: 14px; }
      .ig-flame { color: var(--plate-red); flex-shrink: 0; }

      .ig-flash { display: flex; align-items: center; gap: 8px; background: rgba(88,164,92,0.15); border: 1px solid var(--plate-green); color: var(--plate-green); padding: 9px 12px; border-radius: 10px; font-size: 13px; }
      .ig-flash.pr { background: rgba(224,80,63,0.15); border-color: var(--plate-red); color: var(--plate-red); }

      .ig-barbell-row { display: flex; align-items: center; gap: 14px; padding: 6px 2px 2px; }
      .ig-barbell-caption { display: flex; flex-direction: column; }
      .ig-num { font-family: 'Oswald', sans-serif; font-size: 30px; font-weight: 600; line-height: 1; }
      .ig-caption-sub { font-size: 11px; color: var(--chalk-dim); margin-top: 3px; }

      .ig-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .ig-stat-grid.four { grid-template-columns: repeat(2, 1fr); }
      .ig-stat { background: var(--surface-1); border: 1px solid var(--grid); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 4px; }
      .ig-stat-label { font-size: 10px; color: var(--chalk-dim); text-transform: uppercase; letter-spacing: 0.4px; }
      .ig-stat-value { font-size: 17px; font-weight: 600; }
      .ig-stat-value.pos { color: var(--plate-green); }
      .ig-stat-value.neg { color: var(--plate-red); }

      .ig-chart-wrap { margin-top: 2px; }
      .ig-legend { display: flex; gap: 16px; font-size: 11px; color: var(--chalk-dim); margin-top: 6px; }
      .ig-legend > span { display: flex; align-items: center; gap: 5px; }
      .ig-legend-dot { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
      .ig-history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .ig-history-row { display: flex; align-items: center; gap: 10px; font-size: 13px; background: var(--surface-2); padding: 8px 10px; border-radius: 8px; }
      .ig-history-date { flex: 1; color: var(--chalk-dim); }
      .ig-history-vol { color: var(--chalk-dim); font-size: 11px; }

      .ig-timer-pane { align-items: center; padding-top: 20px; gap: 26px; }
      .ig-ring-wrap { position: relative; width: 220px; height: 220px; }
      .ig-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
      .ig-timer-text { font-size: 38px; font-weight: 700; }
      .ig-timer-controls { display: flex; align-items: center; gap: 22px; }
      .ig-preset-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
      .ig-chip { background: var(--surface-2); border: 1px solid var(--grid); color: var(--chalk); border-radius: 999px; padding: 8px 14px; font-size: 13px; font-family: inherit; cursor: pointer; }
      .ig-chip.active { background: var(--plate-yellow); border-color: var(--plate-yellow); color: #201a08; font-weight: 600; }

      .ig-bmi-result { align-items: center; text-align: center; padding: 20px 14px; }
      .ig-bmi-cat { font-size: 14px; font-weight: 600; margin-top: 2px; }
      .ig-bmi-bar { display: flex; gap: 3px; width: 100%; margin-top: 12px; }
      .ig-bmi-seg { height: 8px; flex: 1; border-radius: 4px; }
      .ig-range-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .ig-range-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .ig-range-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      .ig-range-val { margin-left: auto; color: var(--chalk-dim); }

      @media (max-width: 380px) {
        .ig-num { font-size: 26px; }
        .ig-timer-text { font-size: 32px; }
      }
    `}</style>
  );
}
