/* Fullscreen Workout-Modus mit Pausen-Timer, Coach-Feedback & Abschluss-Konfetti */

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  X,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Timer as TimerIcon,
  Scale,
  Zap,
  Flame,
  Trophy,
  TrendingUp,
  Info,
  Repeat,
  SkipForward,
  Play,
  Pause,
  Search,
} from "lucide-react";
import { CountUp, RestRing, Confetti, showConfirm } from "../components/ui.jsx";
import { EclipseMark } from "../components/brand.jsx";
import ExerciseDemo from "../components/ExerciseDemo.jsx";
import {
  todayISO,
  calcStats,
  playSound,
  buzz,
  round1,
  getTodayPlan,
} from "../lib/utils.js";
import { setWorkoutWakeLock } from "../lib/wakeLock.js";
import { ZONE_LABEL, MUSCLE_NAME, MOTIVATION_POOL } from "../lib/constants.js";
import { smartSuggest } from "../lib/planGenerator.js";
import {
  resolveWarmupItems,
  resolveCooldownItems,
  resolveCardioItems,
  formatPrepMeta,
  CARDIO_INTENSITIES,
} from "../lib/stretches.js";

/** Truncate cleanly at word boundary. */
function shortTip(text, max = 72) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return (at > 40 ? cut.slice(0, at) : cut).trimEnd() + "…";
}

/**
 * Lift-Screen tip: device setup + movement cue (better than raw hint alone).
 * @returns {{ setup: string, cue: string } | null}
 */
function liftTipFromMeta(meta) {
  if (!meta) return null;
  const setupRaw =
    meta.guide?.setup?.[0] ||
    meta.hint ||
    "";
  const cueRaw =
    meta.guide?.move?.[0] ||
    meta.benefit ||
    meta.hint ||
    "";
  const setup = shortTip(setupRaw, 78);
  // Avoid repeating the same string twice
  let cue = shortTip(cueRaw, 78);
  if (cue && setup && cue === setup) {
    cue = shortTip(meta.guide?.move?.[1] || meta.benefit || "", 78);
  }
  if (!setup && !cue) return null;
  return { setup, cue };
}

/* Cardio / Warm-up / Cool-down: geführte Abfolge. Jede Übung erledigen,
   überspringen oder (bei Zeitangabe) per Countdown. Alles überspringbar. */
function StretchFlow({ mode, items, soundOn, hapticsOn, onDone }) {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState(() => items.map(() => "open"));
  const [timeLeft, setTimeLeft] = useState(items[0]?.seconds || 0);
  const [running, setRunning] = useState(false);
  const item = items[idx];
  const isWarmup = mode === "warmup";
  const isCardio = mode === "cardio";
  const doneCount = status.filter((s) => s !== "open").length;

  const titles = {
    cardio: "Cardio",
    warmup: "Warm-up",
    cooldown: "Cool-down",
  };
  const skipAllLabel = {
    cardio: "Cardio überspringen — weiter",
    warmup: "Warm-up überspringen — direkt trainieren",
    cooldown: "Cool-down beenden",
  };

  const finishWith = (finalStatus) => {
    const stretched = finalStatus.filter((s) => s === "done").length;
    onDone(stretched);
  };

  const advance = (nextStatus) => {
    setStatus(nextStatus);
    const next = items.findIndex((_, i) => i !== idx && nextStatus[i] === "open");
    if (next === -1) {
      finishWith(nextStatus);
      return;
    }
    setIdx(next);
    setTimeLeft(items[next]?.seconds || 0);
    setRunning(false);
  };

  const completeCurrent = (kind) => {
    const nextStatus = status.map((s, i) => (i === idx ? kind : s));
    if (kind === "done") {
      playSound("set", soundOn);
      buzz(30, hapticsOn);
    }
    advance(nextStatus);
  };

  useEffect(() => {
    if (!running || !item?.seconds) return;
    const iv = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [running, idx, item?.seconds]);
  useEffect(() => {
    if (!running || !item?.seconds || timeLeft > 0) return;
    setRunning(false);
    playSound("timer", soundOn);
    buzz([120, 80, 120], hapticsOn);
    completeCurrent("done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, running]);

  if (!item) return null;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const intensityLabel =
    CARDIO_INTENSITIES.find((x) => x.id === item.intensity)?.label ||
    item.intensity;

  return (
    <div className="ig-wo ig-wo-stretch">
      <header className="ig-wo-head">
        <button
          className="ig-icon-btn ghost"
          onClick={() => finishWith(status)}
          aria-label={`${titles[mode] || "Phase"} überspringen`}
        >
          <X size={20} />
        </button>
        <div className="ig-wo-head-mid">
          <span className="ig-wo-head-title">{titles[mode] || mode}</span>
          <span className="ig-wo-stretch-count mono">
            {Math.min(doneCount + 1, items.length)}/{items.length}
          </span>
        </div>
        <span className="ig-wo-stretch-headspace" aria-hidden="true" />
      </header>

      <div className="ig-wo-sets ig-wo-stretch-dots" aria-hidden="true">
        {items.map((_, i) => (
          <span
            key={i}
            className={
              "ig-prog-dot" +
              (status[i] === "done" ? " done" : i === idx ? " next" : "")
            }
          />
        ))}
      </div>

      <div className="ig-wo-stretch-body">
        <div className="ig-wo-stretch-card">
          <div className="ig-wo-stretch-meta">
            {item.zone && (
              <span className="ig-badge">{ZONE_LABEL[item.zone] || item.zone}</span>
            )}
            {isCardio ? (
              <>
                {item.seconds ? (
                  <span className="ig-badge dim">
                    {Math.round(item.seconds / 60)} Min
                  </span>
                ) : null}
                {item.distanceKm != null && item.distanceKm > 0 ? (
                  <span className="ig-badge dim">{item.distanceKm} km</span>
                ) : null}
                {intensityLabel ? (
                  <span className="ig-badge dim">{intensityLabel}</span>
                ) : null}
              </>
            ) : (
              <span className="ig-badge dim">
                {item.seconds
                  ? `${item.seconds}s halten`
                  : `${item.reps || "–"} Wdh.`}
              </span>
            )}
          </div>
          <h3 className="ig-wo-ex-name">{item.name}</h3>
          {item.mediaName ? (
            <ExerciseDemo exerciseName={item.mediaName} />
          ) : null}
          {item.note && <p className="ig-wo-hint dim">{item.note}</p>}
          {!isCardio && formatPrepMeta(item) ? (
            <p className="ig-wo-hint dim mono">{formatPrepMeta(item)}</p>
          ) : null}
          {item.seconds ? (
            <div className="ig-wo-stretch-timer mono" aria-live="polite">
              {mm}:{ss}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ig-wo-stretch-actions">
        {item.seconds ? (
          <button
            type="button"
            className="ig-btn-secondary"
            onClick={() => {
              setRunning((r) => !r);
              playSound("tap", soundOn);
            }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : timeLeft < item.seconds ? "Weiter" : "Timer starten"}
          </button>
        ) : null}
        <button
          type="button"
          className="ig-btn-secondary"
          onClick={() => completeCurrent("skipped")}
        >
          <SkipForward size={16} /> Überspringen
        </button>
        <button
          type="button"
          className="ig-btn-primary"
          onClick={() => completeCurrent("done")}
        >
          <Check size={16} /> Erledigt
        </button>
      </div>

      <button
        type="button"
        className="ig-wo-stretch-skipall"
        onClick={() => finishWith(status)}
      >
        {skipAllLabel[mode] || "Überspringen"}
      </button>
    </div>
  );
}

/* Übung ersetzen, ohne das Workout zu verlassen: Alternativen aus derselben
   Muskelgruppe, nach Equipment filterbar. Gerät besetzt/defekt → 2 Taps. */
function ReplacePanel({ current, library, queueNames, onPick, onClose }) {
  const [equip, setEquip] = useState(null);
  const [query, setQuery] = useState("");
  const EQUIPS = ["Maschine", "Kurzhantel", "Langhantel", "Kabelzug", "Körpergewicht"];

  const alternatives = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (library || []).filter(
      (e) =>
        e.muscle === current.muscle &&
        e.id !== current.id &&
        !queueNames.has(e.name) &&
        // "assisted" = Partner hilft — kein echter Geräte-Ersatz im Studio
        e.equipmentRaw !== "assisted" &&
        !/^assisted\b/i.test(e.name) &&
        (!equip || e.equipment === equip) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
    // Gleiches Equipment zuerst — wahrscheinlichster 1-Tap-Ersatz
    return list
      .sort(
        (a, b) =>
          (a.equipment === current.equipment ? -1 : 0) -
            (b.equipment === current.equipment ? -1 : 0) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 40);
  }, [library, current, equip, queueNames, query]);

  return (
    <div className="ig-wo-replace-backdrop" onClick={onClose} role="presentation">
      <div
        className="ig-wo-replace"
        role="dialog"
        aria-modal="true"
        aria-label={`Alternative zu ${current.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ig-wo-replace-head">
          <div className="ig-wo-replace-title">
            <span className="ig-field-label">Übung ersetzen</span>
            <strong>
              Alternativen zu {current.name}
              {current.muscle ? ` · ${MUSCLE_NAME[current.muscle] || ""}` : ""}
            </strong>
          </div>
          <button className="ig-icon-btn ghost" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div className="ig-wo-replace-search">
          <Search size={15} className="ig-wo-replace-search-icon" aria-hidden="true" />
          <input
            className="ig-input"
            type="search"
            placeholder="Übung suchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Alternative Übung suchen"
          />
        </div>
        <div className="ig-wo-replace-chips">
          <button
            type="button"
            className={"ig-chip sm" + (equip === null ? " active" : "")}
            onClick={() => setEquip(null)}
          >
            Alle
          </button>
          {EQUIPS.map((eq) => (
            <button
              key={eq}
              type="button"
              className={"ig-chip sm" + (equip === eq ? " active" : "")}
              onClick={() => setEquip(equip === eq ? null : eq)}
            >
              {eq}
            </button>
          ))}
        </div>
        <div className="ig-wo-replace-list">
          {alternatives.length === 0 && (
            <p className="ig-empty">
              Keine Alternative mit diesem Filter — wähle ein anderes Equipment.
            </p>
          )}
          {alternatives.map((e) => (
            <button
              key={e.id}
              type="button"
              className="ig-wo-replace-row"
              onClick={() => onPick(e)}
            >
              <ExerciseDemo exerciseName={e.name} gif={e.gif} image={e.image} compact />
              <span className="ig-wo-replace-info">
                <span className="ig-wo-replace-name">{e.name}</span>
                <span className="ig-wo-replace-meta">
                  {MUSCLE_NAME[e.muscle] || e.muscle}
                  {e.equipment ? ` · ${e.equipment}` : ""}
                </span>
                {e.hint && (
                  <span className="ig-wo-replace-hint">{shortTip(e.hint, 64)}</span>
                )}
              </span>
              <Repeat size={15} className="ig-wo-replace-chev" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutMode({ data, update, queue, onExit, onFinish }) {
  const today = todayISO();
  const soundOn = data.settings?.sound !== false;
  const hapticsOn = data.settings?.haptics !== false;
  const restSeconds = data.settings?.restSeconds || 90;
  /** Live-Pause-Overrides (exerciseId → sec), bis Plan-Update durchkommt */
  const restOverrideRef = useRef({});
  const [restSavedHint, setRestSavedHint] = useState(null);

  // Screen Wake Lock während des Workouts (ohne Banner)
  useEffect(() => {
    setWorkoutWakeLock(true);
    return () => setWorkoutWakeLock(false);
  }, []);

  const itemDone = useCallback(
    (it) =>
      data.logs
        .filter((l) => l.date === today && l.exercise === it.name)
        .reduce((n, l) => n + l.sets.length, 0) >= it.sets,
    [data.logs, today],
  );

  const setsFor = useCallback(
    (ex) =>
      data.logs
        .filter((l) => l.date === today && l.exercise === ex)
        .reduce((n, l) => n + l.sets.length, 0),
    [data.logs, today],
  );

  const firstOpen = queue.findIndex((it) => !itemDone(it));
  const [idx, setIdx] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [phase, setPhase] = useState(firstOpen === -1 ? "done" : "lift"); // lift | rest | go | done
  const [restLeft, setRestLeft] = useState(restSeconds);
  const [restTotal, setRestTotal] = useState(restSeconds);
  const trackWrapRef = useRef(null);
  const trackRef = useRef(null);
  const [trackW, setTrackW] = useState(0);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [suggestion, setSuggestion] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteFocused, setNoteFocused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  /** Bottom sheet: start collapsed so GIF has room; swipe up for note/last-load */
  const [bottomCollapsed, setBottomCollapsed] = useState(true);
  /** px from layout bottom to top of keyboard (0 = no keyboard) */
  const [kbBottom, setKbBottom] = useState(0);
  const noteSaveTimer = useRef(null);
  const noteInputRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const bottomExtrasRef = useRef(null);
  /** 1 = fully expanded extras, 0 = collapsed (steppers+CTA always stay) */
  const sheetRatioRef = useRef(0);
  const sheetDragRef = useRef({
    active: false,
    locked: false,
    y0: 0,
    dy: 0,
    lastY: 0,
    lastT: 0,
    vy: 0,
    startRatio: 1,
  });
  const sheetRafRef = useRef(0);

  // Live refs for swipe handlers (avoid stale closures / React re-renders mid-drag)
  const idxRef = useRef(firstOpen === -1 ? 0 : firstOpen);
  const phaseRef = useRef(phase);
  const trackWRef = useRef(0);
  const queueLenRef = useRef(queue?.length || 0);
  const dragRef = useRef({
    active: false,
    locked: false,
    startX: 0,
    startY: 0,
    dx: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
  });

  const [showSwipeHint, setShowSwipeHint] = useState(
    () => !localStorage.getItem("ozgym:swipehint") && queue.length > 1,
  );
  useEffect(() => {
    if (!showSwipeHint) return;
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      try {
        localStorage.setItem("ozgym:swipehint", "1");
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

  // Keep refs in sync
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    queueLenRef.current = queue?.length || 0;
  }, [queue?.length]);

  // Apply track transform without React state during drag (60fps on iOS)
  const applyTrackX = useCallback((offsetPx, withTransition) => {
    const el = trackRef.current;
    if (!el) return;
    if (withTransition) {
      el.style.transition = "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)";
    } else {
      el.style.transition = "none";
    }
    el.style.transform = `translate3d(${offsetPx}px, 0, 0)`;
  }, []);

  const settleTrack = useCallback(
    (nextIdx) => {
      const w = trackWRef.current || 0;
      applyTrackX(-nextIdx * w, true);
    },
    [applyTrackX],
  );

  // Kartenbreite in px messen — %-translateX am Track ist unzuverlässig
  useLayoutEffect(() => {
    if (phase === "done") return;
    const el = trackWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || 0;
      trackWRef.current = w;
      setTrackW(w);
      // re-snap to current index after measure
      const i = idxRef.current;
      applyTrackX(-i * w, false);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [phase, queue?.length, applyTrackX]);

  // Snap when idx changes (from buttons / complete-set advance)
  useLayoutEffect(() => {
    if (phase === "done") return;
    if (dragRef.current.active) return;
    settleTrack(idx);
  }, [idx, phase, trackW, settleTrack]);

  const sessionRef = useRef({
    sets: 0,
    volume: 0,
    prs: 0,
    records: [],
    zones: new Set(),
    stretches: 0,
  });

  /* ---- Cardio / Warm-up / Cool-down / Übung ersetzen ---- */
  const plan = useMemo(() => getTodayPlan(data), [data]);
  const warmupEnabled = data.settings?.warmup !== false;
  const cooldownEnabled = data.settings?.cooldown !== false;
  const cardioItems = useMemo(() => resolveCardioItems(plan), [plan]);
  const warmupItems = useMemo(
    () => (warmupEnabled ? resolveWarmupItems(plan, queue) : []),
    [plan, queue, warmupEnabled],
  );
  // Cardio → Warm-up → Main; nur beim frischen Einstieg (nicht Resume)
  const [flowPhase, setFlowPhase] = useState(() => {
    if (firstOpen === -1) return "main";
    const logged = queue.some((it) =>
      data.logs.some(
        (l) => l.date === today && l.exercise === it.name && l.sets.length > 0,
      ),
    );
    if (logged) return "main";
    const cardio = resolveCardioItems(getTodayPlan(data));
    if (cardio.length) return "cardio";
    if (warmupEnabled && resolveWarmupItems(getTodayPlan(data), queue).length) {
      return "warmup";
    }
    return "main";
  });
  const [cooldownItems, setCooldownItems] = useState(null);
  const [cooldownDone, setCooldownDone] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const queueNames = useMemo(() => new Set(queue.map((it) => it.name)), [queue]);

  // Nach dem letzten Satz: Cool-down (Plan-Override oder trainierte Zonen)
  useEffect(() => {
    if (phase !== "done" || cooldownItems !== null) return;
    const s = sessionRef.current;
    if (!cooldownEnabled || s.sets === 0) {
      setCooldownItems([]);
      setCooldownDone(true);
      return;
    }
    const items = resolveCooldownItems(plan, s.zones);
    setCooldownItems(items);
    if (!items.length) setCooldownDone(true);
  }, [phase, cooldownEnabled, cooldownItems, plan]);

  // Einheit beim Abschluss einmalig persistieren (Dauer, Sätze, Volumen, PRs)
  // — Grundlage für Trainingszeit + ≈kcal auf dem Dashboard und im Verlauf.
  const sessionSavedRef = useRef(false);
  useEffect(() => {
    if (phase !== "done" || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    const s = sessionRef.current;
    if (s.sets === 0) return; // nichts geloggt — keine leere Einheit speichern
    const entry = {
      date: today,
      seconds: Math.floor((Date.now() - startRef.current) / 1000),
      sets: s.sets,
      volume: Math.round(s.volume),
      prs: s.prs,
    };
    update((prev) => ({
      ...prev,
      sessions: [...(prev.sessions || []), entry],
    }));
  }, [phase, today, update]);

  const item = queue[idx] || null;
  const exercise = item?.name || "";
  const targetSets = item?.sets || 3;
  const meta = item?.entry || {};
  const exerciseGuide = meta?.guide || null;
  const hasGuide =
    exerciseGuide &&
    (exerciseGuide.setup?.length ||
      exerciseGuide.move?.length ||
      exerciseGuide.avoid?.length);
  const doneCount = setsFor(exercise);


  // Beim Übungswechsel Guide schließen
  useEffect(() => {
    setGuideOpen(false);
  }, [exercise]);

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
  /** Letzter Arbeitssatz (kg × Wdh.) — 1-Tap im Ein-Hand-Flow */
  const lastLoad = useMemo(() => {
    const sets = lastSession?.sets || [];
    if (!sets.length) return null;
    const s = sets[sets.length - 1];
    const w = Number(s.weight);
    const r = Number(s.reps);
    if (!Number.isFinite(w) && !Number.isFinite(r)) return null;
    return {
      weight: Number.isFinite(w) ? w : 0,
      reps: Number.isFinite(r) && r > 0 ? r : item?.reps || 10,
    };
  }, [lastSession, item?.reps]);
  const bestBefore = useMemo(() => {
    let best = 0;
    logsForExercise
      .filter((l) => l.date !== today)
      .forEach((l) =>
        (l.sets || []).forEach((s) => {
          if (s.weight > best) best = s.weight;
        }),
      );
    return best;
  }, [logsForExercise, today]);

  // Smart Coach: Eingaben aus letzter Einheit vorbelegen, ggf. Steigerung vorschlagen
  useEffect(() => {
    const pastLogs = data.logs.filter((l) => l.date !== today);
    const s = smartSuggest(pastLogs, exercise, item?.reps, {
      weight: item?.weight,
      reps: item?.reps,
    });
    setWeight(s.weight);
    setReps(s.reps);
    setSuggestion(s.bump ? s : null);
    setNoteDraft(item?.note || "");
  }, [exercise]); // eslint-disable-line

  /** Eigene Notiz pro Übung im Plan speichern (Gerät, Sitz, Griff, …) */
  const persistExerciseNote = useCallback(
    (text) => {
      const eid = item?.entry?.id;
      if (!eid) return;
      const note = String(text || "").trim();
      update((prev) => ({
        ...prev,
        plans: (prev.plans || []).map((p) => ({
          ...p,
          exercises: (p.exercises || []).map((e) =>
            e.exerciseId === eid ? { ...e, note } : e,
          ),
        })),
      }));
    },
    [item?.entry?.id, update],
  );

  const onNoteChange = (val) => {
    setNoteDraft(val);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => {
      persistExerciseNote(val);
    }, 450);
  };

  const onNoteBlur = () => {
    setNoteFocused(false);
    setKbBottom(0);
    if (noteSaveTimer.current) {
      clearTimeout(noteSaveTimer.current);
      noteSaveTimer.current = null;
    }
    persistExerciseNote(noteDraft);
  };

  const onNoteFocus = () => {
    setNoteFocused(true);
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {
      /* ignore */
    }
  };

  const finishNote = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (noteSaveTimer.current) {
      clearTimeout(noteSaveTimer.current);
      noteSaveTimer.current = null;
    }
    persistExerciseNote(noteDraft);
    setNoteFocused(false);
    setKbBottom(0);
    try {
      noteInputRef.current?.blur();
    } catch {
      /* ignore */
    }
  };

  // Pin note dock to the top edge of the keyboard (visual viewport), not the layout bottom
  useEffect(() => {
    if (!noteFocused) {
      setKbBottom(0);
      return;
    }
    const place = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setKbBottom(0);
        return;
      }
      // Distance from bottom of layout viewport to bottom of visible area
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - (vv.offsetTop + vv.height)),
      );
      setKbBottom(inset);
    };
    place();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    window.addEventListener("resize", place);
    // Keyboard animation on iOS
    const t1 = setTimeout(place, 50);
    const t2 = setTimeout(place, 200);
    const t3 = setTimeout(place, 400);
    return () => {
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [noteFocused]);

  useEffect(
    () => () => {
      if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    },
    [],
  );

  const applyLastLoad = () => {
    if (!lastLoad) return;
    setWeight(lastLoad.weight);
    setReps(lastLoad.reps);
    playSound("tap", soundOn);
    buzz(20, hapticsOn);
  };

  const lastMatchesInput =
    lastLoad &&
    Number(weight) === Number(lastLoad.weight) &&
    Number(reps) === Number(lastLoad.reps);

  // Kompakter Chip: Smart-Coach-Steigerung oder nächster runder Meilenstein.
  // Keine Redundanz zu Satz-Dots / PR in den Mini-Stats.
  const milestone = useMemo(() => {
    if (suggestion?.bump) {
      return { label: `Empfehlung ${suggestion.weight} kg`, smart: true };
    }
    const current = Number(weight) || 0;
    if (current > 0) {
      const stepKg = current < 100 ? 10 : 25;
      const next = Math.ceil((current + 0.01) / stepKg) * stepKg;
      if (next !== bestBefore) {
        return {
          label: `Noch ${round1(next - current)} kg → ${next}`,
          smart: false,
        };
      }
    }
    return null;
  }, [bestBefore, weight, suggestion]);

  const [feedback, setFeedback] = useState(null);

  const step = (setter, current, delta, min) =>
    setter(round1(Math.max(min, (Number(current) || 0) + delta)));

  // Hold +/- : first step immediately, then accelerate while pressed
  const holdTimer = useRef(null);
  const stopHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);
  useEffect(() => () => stopHold(), [stopHold]);

  const startHold = useCallback(
    (applyOnce) => {
      stopHold();
      applyOnce();
      let delay = 380;
      const loop = () => {
        applyOnce();
        delay = Math.max(45, delay * 0.82);
        holdTimer.current = setTimeout(loop, delay);
      };
      holdTimer.current = setTimeout(loop, delay);
    },
    [stopHold],
  );

  const bumpWeight = useCallback((delta) => {
    setWeight((w) => round1(Math.max(0, (Number(w) || 0) + delta)));
  }, []);
  const bumpReps = useCallback((delta) => {
    setReps((r) => Math.max(1, Math.round((Number(r) || 0) + delta)));
  }, []);

  const parseWeightInput = (raw) => {
    const v = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
    // allow intermediate "12." while typing
    if (v === "" || v === ".") return v;
    if ((v.match(/\./g) || []).length > 1) return weight;
    return v;
  };
  const commitWeight = () => {
    const n = Number(String(weight).replace(",", "."));
    setWeight(round1(Math.max(0, Number.isFinite(n) ? n : 0)));
  };
  const commitReps = () => {
    const n = parseInt(String(reps), 10);
    setReps(Math.max(1, Number.isFinite(n) ? n : 1));
  };

  const advance = useCallback(() => {
    const currentDone = item ? itemDone(item) : true;
    if (!currentDone) {
      setPhase("lift");
      return;
    }
    const nextIdx = queue.findIndex((it, i) => i > idx && !itemDone(it));
    const anyOpen = queue.findIndex((it) => !itemDone(it));
    if (nextIdx !== -1) {
      setIdx(nextIdx);
      setPhase("lift");
    } else if (anyOpen !== -1) {
      setIdx(anyOpen);
      setPhase("lift");
    } else {
      setPhase("done");
    }
  }, [item, idx, queue, itemDone]);

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

  // "Weiter!"-Moment, dann automatisch weiter
  useEffect(() => {
    if (phase !== "go") return;
    const t = setTimeout(advance, 1300);
    return () => clearTimeout(t);
  }, [phase, advance]);

  const completeSet = () => {
    const w = Number(String(weight).replace(",", "."));
    const r = parseInt(String(reps), 10);
    // Allow 0 kg (bodyweight / machine without stack load)
    if (!exercise || !Number.isFinite(w) || w < 0 || !Number.isFinite(r) || r < 1) {
      return;
    }
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
    const willBeDone = doneCount + 1 >= targetSets;
    const openAfter = queue.filter((it) =>
      it.name === exercise ? doneCount + 1 < it.sets : !itemDone(it),
    ).length;

    // Coach-Feedback für die Pause
    const lastTop = lastSession
      ? lastSession.sets.reduce((m, x) => Math.max(m, x.weight), 0)
      : 0;
    const setsLeft = targetSets - (doneCount + 1);
    let fb;
    if (isPr) fb = `Neuer Rekord — ${w} kg!`;
    else if (lastTop > 0 && w > lastTop) fb = "Stärker als letzte Woche!";
    else if (willBeDone && openAfter === 1)
      fb = "Stark! Nur noch eine Übung.";
    else if (willBeDone) fb = `${exercise} erledigt!`;
    else if (setsLeft === 1) fb = "Stark gemacht — noch ein Satz.";
    else fb = MOTIVATION_POOL[s.sets % MOTIVATION_POOL.length];
    setFeedback(fb);

    if (willBeDone && openAfter === 0) {
      setPhase("done");
      playSound("pr", soundOn);
    } else {
      const eid = item?.entry?.id;
      const r0 =
        (eid && restOverrideRef.current[eid]) ??
        item?.rest ??
        restSeconds;
      setRestTotal(r0);
      setRestLeft(r0);
      setPhase("rest");
    }
  };

  /* Übung ersetzen (Gerät besetzt/defekt): tauscht die Übung im heutigen Plan.
     Bereits geloggte Sätze bleiben unter dem alten Namen in der Historie;
     Sätze/Wdh./Pause/Notiz des Plan-Eintrags bleiben erhalten, Gewicht schlägt
     smartSuggest für die neue Übung vor (Effekt auf exercise-Wechsel). */
  const replaceExercise = (newEntry) => {
    const eid = item?.entry?.id;
    if (!eid || !newEntry) return;
    update((prev) => {
      const plan = getTodayPlan(prev);
      if (!plan) return prev;
      return {
        ...prev,
        plans: prev.plans.map((p) =>
          p.id !== plan.id
            ? p
            : {
                ...p,
                exercises: p.exercises.map((it) =>
                  it.exerciseId === eid ? { ...it, exerciseId: newEntry.id } : it,
                ),
              },
        ),
      };
    });
    setReplaceOpen(false);
    playSound("tap", soundOn);
    buzz(30, hapticsOn);
  };

  /** Pause live ändern und im aktiven Plan speichern (pro Übung) */
  const applyRestSeconds = useCallback(
    (seconds, { restartTimer = true } = {}) => {
      const sec = Math.max(5, Math.round(Number(seconds) || restSeconds));
      const eid = item?.entry?.id;
      if (restartTimer) {
        setRestTotal(sec);
        setRestLeft(sec);
      } else {
        setRestTotal(sec);
        setRestLeft((l) => Math.min(l, sec));
      }
      if (!eid) return;
      restOverrideRef.current[eid] = sec;
      update((prev) => ({
        ...prev,
        plans: (prev.plans || []).map((p) => ({
          ...p,
          exercises: (p.exercises || []).map((e) =>
            e.exerciseId === eid ? { ...e, rest: sec } : e,
          ),
        })),
      }));
      setRestSavedHint(`${sec}s für ${item?.name || "Übung"} gespeichert`);
      window.clearTimeout(applyRestSeconds._t);
      applyRestSeconds._t = window.setTimeout(() => setRestSavedHint(null), 2200);
    },
    [item, restSeconds, update],
  );

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

  // Swipe between exercises — pointer + capture, DOM transform (no React mid-drag)
  useEffect(() => {
    const wrap = trackWrapRef.current;
    if (!wrap || phase === "done") return;

    const d = dragRef.current;
    let pid = null;

    const onStart = (e) => {
      if (phaseRef.current !== "lift") return;
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target?.closest?.("button, input, a, [data-no-swipe]")) return;
      pid = e.pointerId;
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const now = performance.now();
      d.active = true;
      d.locked = false;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.dx = 0;
      d.lastX = e.clientX;
      d.lastT = now;
      d.vx = 0;
      wrap.classList.add("is-dragging");
      applyTrackX(-(idxRef.current) * (trackWRef.current || 0), false);
    };

    const onMove = (e) => {
      if (!d.active || (pid != null && e.pointerId !== pid)) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const now = performance.now();
      const dt = Math.max(8, now - d.lastT);
      d.vx = d.vx * 0.55 + ((e.clientX - d.lastX) / dt) * 0.45;
      d.lastX = e.clientX;
      d.lastT = now;

      if (!d.locked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        // Clearly vertical → give up
        if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          d.active = false;
          d.locked = false;
          pid = null;
          wrap.classList.remove("is-dragging");
          try {
            wrap.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          settleTrack(idxRef.current);
          return;
        }
        // Commit horizontal once sideways enough
        if (Math.abs(dx) < 8 && Math.abs(dx) <= Math.abs(dy)) return;
        d.locked = true;
      }

      if (e.cancelable) e.preventDefault();

      const i = idxRef.current;
      const len = queueLenRef.current;
      let next = dx;
      if ((i <= 0 && next > 0) || (i >= len - 1 && next < 0)) next *= 0.32;
      d.dx = next;
      applyTrackX(-i * (trackWRef.current || 0) + next, false);
    };

    const finish = (e) => {
      if (!d.active) return;
      if (pid != null && e.pointerId != null && e.pointerId !== pid) return;
      const wasLocked = d.locked;
      const dx = d.dx;
      const vx = d.vx;
      d.active = false;
      d.locked = false;
      pid = null;
      wrap.classList.remove("is-dragging");
      try {
        if (e.pointerId != null) wrap.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (!wasLocked) {
        settleTrack(idxRef.current);
        return;
      }

      const i = idxRef.current;
      const len = Math.max(1, queueLenRef.current);
      const w = trackWRef.current || 1;
      const distOk = Math.abs(dx) > Math.min(48, w * 0.15);
      const flingOk = Math.abs(vx) > 0.32;
      let nextIdx = i;
      if ((dx < -12 && distOk) || (vx < -0.32 && flingOk && dx <= 4)) {
        nextIdx = Math.min(i + 1, len - 1);
      } else if ((dx > 12 && distOk) || (vx > 0.32 && flingOk && dx >= -4)) {
        nextIdx = Math.max(i - 1, 0);
      }

      if (nextIdx !== i) {
        idxRef.current = nextIdx;
        setIdx(nextIdx);
        settleTrack(nextIdx);
        playSound("tap", soundOn);
        setShowSwipeHint(false);
        if (hapticsOn) buzz(10, true);
      } else {
        settleTrack(i);
      }
      d.dx = 0;
      d.vx = 0;
    };

    wrap.addEventListener("pointerdown", onStart);
    wrap.addEventListener("pointermove", onMove, { passive: false });
    wrap.addEventListener("pointerup", finish);
    wrap.addEventListener("pointercancel", finish);
    // Lost capture (iOS edge cases)
    wrap.addEventListener("lostpointercapture", finish);

    return () => {
      wrap.removeEventListener("pointerdown", onStart);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", finish);
      wrap.removeEventListener("pointercancel", finish);
      wrap.removeEventListener("lostpointercapture", finish);
    };
  }, [phase, applyTrackX, settleTrack, soundOn, hapticsOn]);

  // Measure extras height when content changes
  const measureSheetExtras = useCallback(() => {
    const extras = bottomExtrasRef.current;
    if (!extras) return 1;
    // Temporarily expand to measure natural height
    const prevH = extras.style.height;
    const prevO = extras.style.opacity;
    const prevT = extras.style.transition;
    extras.style.transition = "none";
    extras.style.height = "auto";
    extras.style.opacity = "1";
    const h = Math.max(1, extras.scrollHeight);
    extras.dataset.fullH = String(h);
    extras.style.height = prevH;
    extras.style.opacity = prevO;
    extras.style.transition = prevT;
    return h;
  }, []);

  /** Apply collapse ratio 0..1 live (no React re-render mid-drag) */
  const applySheetRatio = useCallback((ratio, { animate = false } = {}) => {
    const extras = bottomExtrasRef.current;
    const sheet = bottomSheetRef.current;
    if (!extras || !sheet) return;
    const r = Math.max(0, Math.min(1, ratio));
    sheetRatioRef.current = r;
    let h = Number(extras.dataset.fullH) || 0;
    if (!h || h < 8) {
      extras.style.transition = "none";
      extras.style.height = "auto";
      h = Math.max(1, extras.scrollHeight);
      extras.dataset.fullH = String(h);
    }
    extras.style.transition = animate
      ? "height 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease"
      : "none";
    extras.style.height = `${Math.round(h * r)}px`;
    extras.style.opacity = String(0.15 + r * 0.85);
    extras.style.pointerEvents = r < 0.2 ? "none" : "auto";
    sheet.classList.toggle("is-collapsed", r < 0.45);
    sheet.classList.toggle("is-dragging-sheet", !animate && sheetDragRef.current.active);
  }, []);

  const springSheetTo = useCallback(
    (target) => {
      cancelAnimationFrame(sheetRafRef.current);
      const goal = target <= 0 ? 0 : target >= 1 ? 1 : target;
      const tick = () => {
        const cur = sheetRatioRef.current;
        const next = cur + (goal - cur) * 0.28;
        if (Math.abs(goal - next) < 0.012) {
          applySheetRatio(goal, { animate: false });
          setBottomCollapsed(goal < 0.5);
          return;
        }
        applySheetRatio(next, { animate: false });
        sheetRafRef.current = requestAnimationFrame(tick);
      };
      sheetRafRef.current = requestAnimationFrame(tick);
    },
    [applySheetRatio],
  );

  // Note focus always expands the bottom sheet
  useEffect(() => {
    if (noteFocused) {
      setBottomCollapsed(false);
      measureSheetExtras();
      springSheetTo(1);
    }
  }, [noteFocused, measureSheetExtras, springSheetTo]);

  // Keep extras measured after paint; default collapsed on lift
  useLayoutEffect(() => {
    if (phase !== "lift") return;
    measureSheetExtras();
    const r = bottomCollapsed ? 0 : 1;
    sheetRatioRef.current = r;
    applySheetRatio(r, { animate: false });
  }, [phase, milestone, lastLoad, noteFocused, measureSheetExtras, applySheetRatio, bottomCollapsed]);

  // Vertical drag — same feel as horizontal exercise swipe (live + spring)
  useEffect(() => {
    if (phase !== "lift") return;
    const el = bottomSheetRef.current;
    if (!el) return;
    const d = sheetDragRef.current;
    let pid = null;

    const onStart = (e) => {
      if (noteFocused) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      // Drag from handle / top bar / empty sheet chrome — not from inputs/steppers
      if (t.closest("input, textarea, [data-no-sheet-drag]")) return;
      if (
        t.closest(".ig-step-mini") ||
        t.closest(".ig-step-input") ||
        t.closest(".ig-wo-cta") ||
        t.closest(".ig-wo-last-load") ||
        t.closest(".ig-wo-note-edit")
      ) {
        // Still allow starting on handle area only
        if (!t.closest(".ig-wo-bottom-handle") && !t.closest(".ig-wo-bottom-top")) {
          return;
        }
        if (t.closest("button.ig-wo-exit, button.ig-wo-info-btn")) return;
      }
      // Prefer handle + top strip; also allow drag on sheet padding edge
      const okZone =
        t.closest(".ig-wo-bottom-handle") ||
        t.closest(".ig-wo-bottom-top") ||
        t.classList?.contains?.("ig-wo-bottom") ||
        t.closest(".ig-wo-bottom-extras");
      if (!okZone) return;
      if (t.closest("button.ig-wo-exit, button.ig-wo-info-btn")) return;

      cancelAnimationFrame(sheetRafRef.current);
      measureSheetExtras();
      d.active = true;
      d.locked = false;
      d.y0 = e.clientY;
      d.dy = 0;
      d.lastY = e.clientY;
      d.lastT = performance.now();
      d.vy = 0;
      d.startRatio = sheetRatioRef.current;
      pid = e.pointerId;
      el.classList.add("is-dragging-sheet");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onMove = (e) => {
      if (!d.active) return;
      if (pid != null && e.pointerId !== pid) return;
      const y = e.clientY;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      d.vy = (y - d.lastY) / dt; // px/ms
      d.lastY = y;
      d.lastT = now;
      d.dy = y - d.y0;

      // Axis lock after small move (same idea as L/R exercise swipe)
      if (!d.locked) {
        if (Math.abs(d.dy) < 8) return;
        d.locked = true;
      }
      e.preventDefault();

      const extras = bottomExtrasRef.current;
      const h = Number(extras?.dataset?.fullH) || 120;
      // Finger down → collapse (ratio down); finger up → expand
      const next = d.startRatio - d.dy / h;
      applySheetRatio(next, { animate: false });
    };

    const onEnd = (e) => {
      if (!d.active) return;
      if (pid != null && e.pointerId != null && e.pointerId !== pid) return;
      const wasLocked = d.locked;
      d.active = false;
      d.locked = false;
      pid = null;
      el.classList.remove("is-dragging-sheet");
      try {
        if (e.pointerId != null) el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (!wasLocked) {
        // Tap handle → toggle
        const t = e.target;
        if (t instanceof Element && t.closest(".ig-wo-bottom-handle")) {
          const to = sheetRatioRef.current > 0.5 ? 0 : 1;
          springSheetTo(to);
          if (hapticsOn) buzz(8, true);
          playSound("tap", soundOn);
        } else {
          springSheetTo(sheetRatioRef.current > 0.5 ? 1 : 0);
        }
        d.dy = 0;
        d.vy = 0;
        return;
      }

      const r = sheetRatioRef.current;
      const vy = d.vy; // + down
      let goal = r >= 0.5 ? 1 : 0;
      // Fling wins over midpoint
      if (vy > 0.45) goal = 0;
      else if (vy < -0.45) goal = 1;
      else if (r > 0.55) goal = 1;
      else if (r < 0.45) goal = 0;

      springSheetTo(goal);
      if (hapticsOn) buzz(8, true);
      playSound("tap", soundOn);
      d.dy = 0;
      d.vy = 0;
    };

    el.addEventListener("pointerdown", onStart);
    el.addEventListener("pointermove", onMove, { passive: false });
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("lostpointercapture", onEnd);
    return () => {
      cancelAnimationFrame(sheetRafRef.current);
      el.removeEventListener("pointerdown", onStart);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("lostpointercapture", onEnd);
    };
  }, [
    phase,
    noteFocused,
    soundOn,
    hapticsOn,
    measureSheetExtras,
    applySheetRatio,
    springSheetTo,
  ]);

  // Nächste offene Übung (für Coach-Karte in der Pause)
  const nextUp = useMemo(() => {
    if (item && !itemDone(item)) return null;
    return (
      queue.find((it, i) => i > idx && !itemDone(it)) ||
      queue.find((it) => !itemDone(it)) ||
      null
    );
  }, [queue, idx, item, itemDone]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  /* ---- Cardio vor Warm-up / Training ---- */
  if (flowPhase === "cardio" && phase !== "done") {
    return (
      <StretchFlow
        mode="cardio"
        items={cardioItems}
        soundOn={soundOn}
        hapticsOn={hapticsOn}
        onDone={(n) => {
          sessionRef.current.stretches += n;
          if (warmupEnabled && warmupItems.length) {
            setFlowPhase("warmup");
          } else {
            setFlowPhase("main");
          }
          playSound("pr", soundOn);
          buzz(40, hapticsOn);
        }}
      />
    );
  }

  /* ---- Warm-up vor dem Training ---- */
  if (flowPhase === "warmup" && phase !== "done") {
    return (
      <StretchFlow
        mode="warmup"
        items={warmupItems}
        soundOn={soundOn}
        hapticsOn={hapticsOn}
        onDone={(n) => {
          sessionRef.current.stretches += n;
          setFlowPhase("main");
          playSound("pr", soundOn);
          buzz(40, hapticsOn);
        }}
      />
    );
  }

  /* ---- Cool-down nach dem letzten Satz ---- */
  if (phase === "done" && cooldownEnabled && !cooldownDone) {
    if (!cooldownItems) return null; // ein Frame, bis der Effekt die Liste baut
    return (
      <StretchFlow
        mode="cooldown"
        items={cooldownItems}
        soundOn={soundOn}
        hapticsOn={hapticsOn}
        onDone={(n) => {
          sessionRef.current.stretches += n;
          setCooldownDone(true);
          playSound("timer", soundOn);
        }}
      />
    );
  }

  /* ---- Abschluss-Screen ---- */
  if (phase === "done") {
    const s = sessionRef.current;
    const xp = s.sets * 10 + s.prs * 30;
    const stats = calcStats(data.logs, data.settings?.weeklyGoal || 3);
    // Level vor der Einheit (ohne heutige Logs) — nur so lässt sich ein echter
    // Level-Up erkennen statt bei jedem Abschluss zu feiern.
    const prevStats = calcStats(
      data.logs.filter((l) => l.date !== today),
      data.settings?.weeklyGoal || 3,
    );
    const leveledUp = stats.level > prevStats.level;
    // Konfetti ist ein Meilenstein-Signal, kein Standard-Feedback: nur bei
    // echtem Rekord oder Level-Up, sonst wirkt die App schnell kindisch.
    const celebrate = s.records.length > 0 || leveledUp;
    return (
      <div className="ig-wo ig-wo-done">
        {celebrate && <Confetti />}
        <div className="ig-wo-done-body">
          <span className="ig-wo-done-icon">
            <EclipseMark size={48} />
          </span>
          <h2 className="ig-wo-done-title">Workout abgeschlossen!</h2>
          {leveledUp && (
            <div className="ig-level-up">
              <Zap size={16} /> Level {stats.level} erreicht!
            </div>
          )}
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
                  <Trophy size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                  {r.exercise}: <strong>{r.weight} kg</strong>
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
              {s.stretches > 0 && (
                <span className="ig-badge dim">
                  {s.stretches} {s.stretches === 1 ? "Dehnung" : "Dehnungen"}
                </span>
              )}
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

  /* ---- Leere Queue (Plan ohne auflösbare Übungen) ---- */
  if (!queue?.length) {
    return (
      <div className="ig-wo">
        <header className="ig-wo-head">
          <button className="ig-icon-btn ghost" onClick={onExit} aria-label="Workout verlassen">
            <X size={20} />
          </button>
          <div className="ig-wo-head-mid">
            <span className="ig-wo-head-title">Kein Workout</span>
          </div>
        </header>
        <div className="ig-wo-empty">
          <p>Keine Übungen in der heutigen Queue.</p>
          <button className="ig-btn-primary wide" onClick={onExit}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  /* ---- Aktiver Modus ---- */
  return (
    <div className="ig-wo">
      <header className="ig-wo-head">
        <div className="ig-wo-head-row">
          <div className="ig-wo-head-timer mono" aria-label="Trainingszeit">
            <TimerIcon size={14} strokeWidth={2.25} aria-hidden="true" />
            <span>
              {mm}:{ss}
            </span>
          </div>
          <div className="ig-wo-head-pos" aria-label={`Übung ${idx + 1} von ${queue.length}`}>
            <span className="ig-wo-head-pos-cur mono">{idx + 1}</span>
            <span className="ig-wo-head-pos-sep">/</span>
            <span className="ig-wo-head-pos-total mono">{queue.length}</span>
          </div>
          <div
            className="ig-wo-head-vol mono"
            key={Math.round(sessionRef.current.volume)}
          >
            <span className="ig-num-pop">
              {Math.round(sessionRef.current.volume)}
            </span>
            <span className="ig-wo-head-vol-unit">kg</span>
          </div>
        </div>
        {/* Eine Segment-Leiste: folgt Swipe; tippen springt zur Übung */}
        <div className="ig-wo-segbar" role="tablist" aria-label="Übungen">
          {queue.map((it, i) => {
            const done = itemDone(it);
            return (
              <button
                key={`${it.name}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`Übung ${i + 1}: ${it.name}`}
                className={
                  "ig-wo-seg" +
                  (done ? " done" : "") +
                  (i === idx ? " current" : "") +
                  (i < idx ? " past" : "")
                }
                onClick={() => {
                  setIdx(i);
                  playSound("tap", soundOn);
                }}
              />
            );
          })}
        </div>
      </header>

      {showSwipeHint && (
        <div className="ig-wo-swipe-hint" aria-hidden="true">
          ← wischen: nächste Übung
        </div>
      )}

      <div ref={trackWrapRef} className="ig-wo-track-wrap">
      <div
        ref={trackRef}
        className="ig-wo-track"
        style={{
          width: trackW > 0 ? `${Math.max(queue.length, 1) * trackW}px` : `${Math.max(queue.length, 1) * 100}%`,
        }}
      >
        {queue.map((it, i) => {
          const e = it.name;
          const m = it.entry || {};
          const active = i === idx;
          return (
            <div
              key={`${e}-${i}`}
              className={"ig-wo-card" + (active ? " active" : "")}
              style={trackW > 0 ? { width: trackW, minWidth: trackW, maxWidth: trackW } : undefined}
            >
              <div className="ig-wo-card-top">
                <div className="ig-wo-card-info">
                  <h3 className="ig-wo-ex-name">{e}</h3>
                  <div className="ig-plan-badges">
                    {m?.nr && <span className="ig-badge">Gerät {m.nr}</span>}
                    <span className="ig-badge">{it.sets} × {it.reps} Wdh.</span>
                    {it.weight != null && (
                      <span className="ig-badge dim">Ziel {it.weight} kg</span>
                    )}
                  </div>
                  {active && bestBefore > 0 && (
                    <div className="ig-wo-mini-stats mono">
                      <span>PR: {bestBefore} kg</span>
                    </div>
                  )}
                </div>
                {active && (
                  <button
                    type="button"
                    className="ig-wo-replace-btn"
                    data-no-swipe
                    onClick={() => {
                      setReplaceOpen(true);
                      playSound("tap", soundOn);
                    }}
                    aria-label={`${e} ersetzen — Alternativen zeigen`}
                    title="Übung ersetzen"
                  >
                    <Repeat size={16} />
                  </button>
                )}
              </div>
              {active && (
                <ExerciseDemo
                  exerciseName={e}
                  gif={m?.gif}
                  image={m?.image}
                />
              )}
              {active && !noteDraft.trim() && (() => {
                const tip = liftTipFromMeta(m);
                if (!tip) return null;
                return (
                  <button
                    type="button"
                    className="ig-wo-hint dim ig-wo-hint-btn ig-wo-hint-rich"
                    data-no-swipe
                    onClick={() => {
                      setGuideOpen(true);
                      playSound("tap", soundOn);
                    }}
                    aria-label={`Geräte-Anleitung für ${e}`}
                  >
                    <span className="ig-wo-hint-rich-body">
                      {tip.setup && (
                        <span className="ig-wo-hint-line">
                          <span className="ig-wo-hint-kicker">Gerät</span>
                          <span className="ig-wo-hint-text">{tip.setup}</span>
                        </span>
                      )}
                      {tip.cue && (
                        <span className="ig-wo-hint-line">
                          <span className="ig-wo-hint-kicker">Cue</span>
                          <span className="ig-wo-hint-text">{tip.cue}</span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })()}
              {active && noteDraft.trim() && (
                <p className="ig-wo-hint note">{shortTip(noteDraft, 80)}</p>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Übung ersetzen: Alternativen derselben Muskelgruppe, 2 Taps */}
      {replaceOpen && item?.entry && (
        <ReplacePanel
          current={item.entry}
          library={data.library}
          queueNames={queueNames}
          onPick={replaceExercise}
          onClose={() => setReplaceOpen(false)}
        />
      )}

      {/* Ausführliche Geräte-Anleitung */}
      {guideOpen && (
        <div
          className="ig-wo-guide"
          role="dialog"
          aria-modal="true"
          aria-label={`Anleitung ${exercise}`}
        >
          <div className="ig-wo-guide-panel">
            <header className="ig-wo-guide-head">
              <div className="ig-wo-guide-titles">
                <span className="ig-wo-guide-kicker">Geräte-Anleitung</span>
                <h2 className="ig-wo-guide-title">{exercise}</h2>
                {meta?.nr != null && (
                  <span className="ig-badge">Gerät {meta.nr}</span>
                )}
              </div>
              {/* Demo sits between title and X — fills that empty top gap */}
              <div className="ig-wo-guide-mid">
                <ExerciseDemo
                  exerciseName={exercise}
                  gif={meta?.gif}
                  image={meta?.image}
                  className="ig-wo-guide-demo"
                />
              </div>
              <button
                type="button"
                className="ig-wo-exit"
                onClick={() => setGuideOpen(false)}
                aria-label="Anleitung schließen"
              >
                <X size={20} />
              </button>
            </header>
            <div className="ig-wo-guide-body">
              {meta?.benefit && (
                <p className="ig-wo-guide-benefit">{meta.benefit}</p>
              )}
              {hasGuide ? (
                <>
                  {exerciseGuide.setup?.length > 0 && (
                    <section className="ig-wo-guide-sec">
                      <h3>1. Einstellen</h3>
                      <ol>
                        {exerciseGuide.setup.map((s, i) => (
                          <li key={`s${i}`}>{s}</li>
                        ))}
                      </ol>
                    </section>
                  )}
                  {exerciseGuide.move?.length > 0 && (
                    <section className="ig-wo-guide-sec">
                      <h3>2. Ausführung</h3>
                      <ol>
                        {exerciseGuide.move.map((s, i) => (
                          <li key={`m${i}`}>{s}</li>
                        ))}
                      </ol>
                    </section>
                  )}
                  {exerciseGuide.avoid?.length > 0 && (
                    <section className="ig-wo-guide-sec avoid">
                      <h3>3. Fehler vermeiden</h3>
                      <ul>
                        {exerciseGuide.avoid.map((s, i) => (
                          <li key={`a${i}`}>{s}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : (
                <p className="ig-wo-guide-benefit">
                  {meta?.hint ||
                    "Stelle Sitz und Polster bequem ein, bewege das Gewicht kontrolliert und atme gleichmäßig."}
                </p>
              )}
            </div>
            <div className="ig-wo-guide-foot">
              <button
                type="button"
                className="ig-btn-primary wide"
                onClick={() => setGuideOpen(false)}
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ein-Hand-Zone: swipe ↓ collapse · ↑ expand — more room for GIF */}
      <div
        ref={bottomSheetRef}
        className={
          "ig-wo-bottom ig-wo-onehand" +
          (noteFocused ? " note-focus" : "") +
          (bottomCollapsed ? " is-collapsed" : "")
        }
      >
        <div
          className="ig-wo-bottom-handle"
          role="button"
          tabIndex={0}
          aria-label={
            bottomCollapsed
              ? "Hoch wischen: mehr Optionen"
              : "Runter wischen: verkleinern"
          }
          aria-expanded={!bottomCollapsed}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              springSheetTo(sheetRatioRef.current > 0.5 ? 0 : 1);
              playSound("tap", soundOn);
            }
          }}
        >
          <span className="ig-wo-bottom-handle-bar" aria-hidden="true" />
        </div>
        {/* Always visible: X · dots · Info */}
        <div className="ig-wo-bottom-top">
          <button
            type="button"
            className="ig-wo-exit"
            data-no-sheet-drag
            onClick={async () => {
              const open = queue.some((it) => !itemDone(it));
              if (open) {
                const ok = await showConfirm({
                  title: "Workout beenden?",
                  message: "Deine geloggten Sätze bleiben gespeichert.",
                  confirmLabel: "Beenden",
                });
                if (!ok) return;
              }
              onExit();
            }}
            aria-label="Workout beenden"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
          <div className="ig-wo-sets">
            {Array.from({ length: targetSets }, (_, i) => (
              <span
                key={i}
                className={
                  "ig-prog-dot" +
                  (i < doneCount ? " done" : i === doneCount ? " next" : "")
                }
              />
            ))}
          </div>
          <button
            type="button"
            className="ig-wo-info-btn"
            data-no-sheet-drag
            onClick={() => {
              setGuideOpen(true);
              playSound("tap", soundOn);
            }}
            aria-label={`Anleitung für ${exercise || "Übung"}`}
          >
            <Info size={20} strokeWidth={2.25} />
          </button>
        </div>

        {/* Collapsible extras only (note / last load / milestone) */}
        <div
          ref={bottomExtrasRef}
          className="ig-wo-bottom-extras"
          aria-hidden={bottomCollapsed}
        >
          {milestone && !noteFocused && (
            <span
              className={"ig-wo-milestone" + (milestone.smart ? " smart" : "")}
              key={milestone.label}
            >
              {milestone.smart && <TrendingUp size={13} aria-hidden="true" />}
              {milestone.label}
            </span>
          )}
          {lastLoad && !noteFocused && (
            <button
              type="button"
              className={
                "ig-wo-last-load" + (lastMatchesInput ? " active" : "")
              }
              onClick={applyLastLoad}
              aria-label={`Zuletzt ${lastLoad.weight} Kilo mal ${lastLoad.reps} übernehmen`}
            >
              <span className="ig-wo-last-load-kicker">Zuletzt</span>
              <span className="ig-wo-last-load-val mono">
                {lastLoad.weight} kg × {lastLoad.reps}
              </span>
              <span className="ig-wo-last-load-cta">
                {lastMatchesInput ? "Aktiv" : "Übernehmen"}
              </span>
            </button>
          )}
          <div
            className={
              "ig-wo-note-edit" + (noteFocused ? " is-dock" : "")
            }
            data-no-swipe
            data-no-sheet-drag
            style={
              noteFocused
                ? { bottom: kbBottom > 0 ? kbBottom : 0 }
                : undefined
            }
          >
            <div className="ig-wo-note-head">
              <label className="ig-wo-note-label" htmlFor="ig-wo-note">
                {noteFocused ? `Notiz · ${exercise || "Übung"}` : "Notiz"}
              </label>
              {noteFocused && (
                <button
                  type="button"
                  className="ig-wo-note-done"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={finishNote}
                >
                  Fertig
                </button>
              )}
            </div>
            <input
              ref={noteInputRef}
              id="ig-wo-note"
              type="text"
              className="ig-wo-note-input"
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="on"
              value={noteDraft}
              onChange={(ev) => onNoteChange(ev.target.value)}
              onFocus={onNoteFocus}
              onBlur={(e) => {
                const next = e.relatedTarget;
                if (next?.classList?.contains?.("ig-wo-note-done")) return;
                onNoteBlur();
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  finishNote(ev);
                }
              }}
              placeholder="Sitz · Pin · Griff…"
              maxLength={120}
            />
          </div>
        </div>

        {/* Always visible: weight · reps · complete set */}
        <div className="ig-set-inputs two ig-wo-steppers" data-no-sheet-drag>
          <div className="ig-num-field">
            <span className="ig-steplabel">Gewicht (kg)</span>
            <div className="ig-steplabel-controls ig-step-lg">
              <button
                type="button"
                className="ig-step-mini"
                data-no-sheet-drag
                onPointerDown={(e) => {
                  e.preventDefault();
                  startHold(() => bumpWeight(-2.5));
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                aria-label="Gewicht verringern"
              >
                <Minus size={22} strokeWidth={2.25} />
              </button>
              <input
                className="ig-step-val mono ig-step-input"
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                value={weight}
                onChange={(e) => setWeight(parseWeightInput(e.target.value))}
                onBlur={commitWeight}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitWeight();
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Gewicht eingeben"
              />
              <button
                type="button"
                className="ig-step-mini"
                data-no-sheet-drag
                onPointerDown={(e) => {
                  e.preventDefault();
                  startHold(() => bumpWeight(2.5));
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                aria-label="Gewicht erhöhen"
              >
                <Plus size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
          <div className="ig-num-field">
            <span className="ig-steplabel">Wdh.</span>
            <div className="ig-steplabel-controls ig-step-lg">
              <button
                type="button"
                className="ig-step-mini"
                data-no-sheet-drag
                onPointerDown={(e) => {
                  e.preventDefault();
                  startHold(() => bumpReps(-1));
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                aria-label="Wiederholungen verringern"
              >
                <Minus size={22} strokeWidth={2.25} />
              </button>
              <input
                className="ig-step-val mono ig-step-input"
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                pattern="[0-9]*"
                value={reps}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setReps(v === "" ? "" : v);
                }}
                onBlur={commitReps}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitReps();
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Wiederholungen eingeben"
              />
              <button
                type="button"
                className="ig-step-mini"
                data-no-sheet-drag
                onPointerDown={(e) => {
                  e.preventDefault();
                  startHold(() => bumpReps(1));
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                aria-label="Wiederholungen erhöhen"
              >
                <Plus size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="ig-btn-primary wide xl ig-wo-cta"
          data-no-sheet-drag
          disabled={doneCount >= targetSets}
          onClick={completeSet}
        >
          <Check size={22} strokeWidth={2.5} />
          {doneCount >= targetSets ? "Übung fertig" : "Satz abschließen"}
        </button>
      </div>

      {(phase === "rest" || phase === "go") && (
        <div className="ig-wo-rest">
          {phase === "go" ? (
            <div className="ig-wo-go">Weiter!</div>
          ) : (
            <>
              {feedback && (
                <div className="ig-wo-feedback" key={feedback}>
                  {feedback}
                </div>
              )}
              <RestRing left={restLeft} total={restTotal} />
              <p className="ig-wo-rest-label">
                Pause
                {item?.entry?.id
                  ? ` · wird für ${item.name} gespeichert`
                  : ` · Standard ${restSeconds}s`}
              </p>
              {restSavedHint && (
                <p className="ig-wo-rest-saved" role="status">
                  {restSavedHint}
                </p>
              )}
              {/* Presets + ±15 speichern im Plan (nächste Sätze / nächstes Mal) */}
              <div
                className="ig-wo-rest-presets"
                role="group"
                aria-label="Pause anpassen"
              >
                {[60, 90, 120, 180].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      "ig-chip sm" + (restTotal === s ? " active" : "")
                    }
                    onClick={() => {
                      playSound("tap", soundOn);
                      applyRestSeconds(s, { restartTimer: true });
                    }}
                  >
                    {s % 60 === 0 ? `${s / 60} Min` : `${s}s`}
                  </button>
                ))}
              </div>
              <div className="ig-wo-rest-btns">
                <button
                  type="button"
                  className="ig-chip"
                  disabled={restTotal <= 15}
                  onClick={() => {
                    playSound("tap", soundOn);
                    applyRestSeconds(restTotal - 15, { restartTimer: true });
                  }}
                >
                  −15 Sek
                </button>
                <button
                  type="button"
                  className="ig-chip"
                  onClick={() => {
                    playSound("tap", soundOn);
                    applyRestSeconds(restTotal + 15, { restartTimer: true });
                  }}
                >
                  +15 Sek
                </button>
                <button
                  type="button"
                  className="ig-chip"
                  onClick={() => {
                    playSound("tap", soundOn);
                    setPhase("go");
                    setRestLeft(0);
                  }}
                >
                  Überspringen
                </button>
              </div>
              {nextUp && (
                <div className="ig-wo-coach">
                  <span className="ig-field-label">Als Nächstes</span>
                  <span className="ig-wo-coach-name">{nextUp.name}</span>
                  <div className="ig-plan-badges">
                    <span className="ig-badge">{nextUp.sets} Sätze</span>
                    <span className="ig-badge">{nextUp.reps} Wdh.</span>
                    {nextUp.entry?.zone && (
                      <span className="ig-badge dim">
                        {ZONE_LABEL[nextUp.entry.zone]}
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
                  Gleiche Übung — Satz {doneCount + 1} von {targetSets}
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
