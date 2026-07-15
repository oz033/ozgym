/* Helfer: Datum, Sound, Haptik, Statistiken */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => localISO(new Date());
export const todayKey = () =>
  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
export const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};
export const mondayOf = (iso) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localISO(d);
};

export const round1 = (n) => Math.round(n * 10) / 10;
export const e1rm = (weight, reps) => (reps >= 1 ? weight * (1 + reps / 30) : 0);

export const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------------- Sounds (Web Audio, keine Dateien nötig) ---------------- */
let sharedAudioCtx = null;
export function playSound(type, enabled = true) {
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

export function buzz(pattern, enabled = true) {
  if (enabled && navigator.vibrate) navigator.vibrate(pattern);
}

/* ---------------- Statistiken (alles aus Logs abgeleitet) ---------------- */

export function calcStats(logs, weeklyGoal = 3) {
  const list = Array.isArray(logs) ? logs : [];
  const dayVolumes = {};
  let totalSets = 0;
  let totalVolume = 0;
  for (const l of list) {
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
  for (const l of list) {
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
  const weekCounts = {};
  for (const d of days) {
    const wk = mondayOf(d);
    weekCounts[wk] = (weekCounts[wk] || 0) + 1;
  }
  const thisMonday = mondayOf(todayISO());
  const thisWeekDays = weekCounts[thisMonday] || 0;
  let streakWeeks = 0;
  const cursor = new Date(thisMonday + "T00:00:00");
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

// Tages-Streak (aufeinanderfolgende Trainingstage bis heute/gestern)
export function dayStreak(logs, today) {
  const logDates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date(today + "T00:00:00");
  // Heute noch nicht trainiert? Serie zählt trotzdem ab gestern weiter.
  if (!logDates.has(localISO(d))) d.setDate(d.getDate() - 1);
  while (logDates.has(localISO(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  let bestStreak = 0;
  let cur = 0;
  const sorted = [...logDates].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      cur = 1;
      continue;
    }
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    if ((curr - prev) / 86400000 === 1) cur++;
    else {
      bestStreak = Math.max(bestStreak, cur);
      cur = 1;
    }
  }
  bestStreak = Math.max(bestStreak, cur);
  return { streak, bestStreak, totalDays: logDates.size };
}

export function exerciseStats(logs, name) {
  const list = logs
    .filter((l) => l.exercise === name)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return null;
  let best = 0;
  let bestE1 = 0;
  let volume = 0;
  let setCount = 0;
  let repSum = 0;
  let weightSum = 0;
  const tops = [];
  for (const l of list) {
    let top = 0;
    for (const s of l.sets) {
      if (s.weight > best) best = s.weight;
      if (s.weight > top) top = s.weight;
      const e1 = e1rm(s.weight, s.reps);
      if (e1 > bestE1) bestE1 = e1;
      volume += s.reps * s.weight;
      repSum += s.reps;
      weightSum += s.weight;
      setCount++;
    }
    if (top > 0) tops.push(top);
  }
  const first = tops[0] || 0;
  const last = tops[tops.length - 1] || 0;
  return {
    sessions: list.length,
    best,
    bestE1: Math.round(bestE1),
    volume,
    diff: round1(last - first),
    lastDate: list[list.length - 1].date,
    avgWeight: setCount ? round1(weightSum / setCount) : 0,
    avgReps: setCount ? Math.round(repSum / setCount) : 0,
    spark: tops.slice(-8),
  };
}

// Letzter erzielter Rekord über alle Übungen (für Home-Widget "Persönlicher Rekord")
export function lastRecord(logs) {
  const byExercise = {};
  for (const l of logs) (byExercise[l.exercise] = byExercise[l.exercise] || []).push(l);
  let latest = null;
  for (const [exercise, list] of Object.entries(byExercise)) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    let best = 0;
    for (const l of list) {
      const top = l.sets.reduce((m, s) => Math.max(m, s.weight), 0);
      if (top > best) {
        if (best > 0 && (!latest || l.date >= latest.date)) {
          latest = { exercise, weight: top, date: l.date };
        }
        best = top;
      }
    }
  }
  return latest;
}

// Gewichtstrend: letzter Eintrag + Differenz zum vorherigen
export function weightTrend(weightLog) {
  const log = weightLog || [];
  if (log.length < 2) return null;
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  return { kg: last.kg, diff: round1(last.kg - prev.kg), date: last.date };
}

// Relative Zeitangabe für kleine Widgets ("heute", "gestern", "vor 3 Tagen")
export function relativeDay(iso, today) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const days = Math.round((t - d) / 86400000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

// Kennzahlen eines Plans: Gesamtvolumen mit seinen Übungen + letzte Ausführung
export function planStats(plan, logs, libraryById) {
  const names = new Set(
    (plan?.exercises || []).map((e) => libraryById[e.exerciseId]?.name).filter(Boolean),
  );
  let volume = 0;
  let lastDate = null;
  for (const l of logs) {
    if (!names.has(l.exercise)) continue;
    for (const s of l.sets) volume += s.reps * s.weight;
    if (!lastDate || l.date > lastDate) lastDate = l.date;
  }
  return { volume: Math.round(volume), lastDate };
}

// Volumenanteil je Muskelgruppe (für Verlauf: "worauf trainiere ich wirklich?")
export function muscleVolumeBreakdown(logs, library) {
  const muscleByName = {};
  (library || []).forEach((e) => {
    if (e.muscle) muscleByName[e.name] = e.muscle;
  });
  const totals = {};
  let grand = 0;
  for (const l of logs) {
    const muscle = muscleByName[l.exercise];
    if (!muscle) continue;
    const vol = l.sets.reduce((v, s) => v + s.reps * s.weight, 0);
    totals[muscle] = (totals[muscle] || 0) + vol;
    grand += vol;
  }
  return Object.entries(totals)
    .map(([muscle, volume]) => ({ muscle, volume, pct: grand ? volume / grand : 0 }))
    .sort((a, b) => b.volume - a.volume);
}

// Trainingstage pro Woche der letzten N Wochen (für Verlauf: Frequenz-Trend)
export function weeklyFrequency(logs, weeks = 8) {
  const dayCounts = {};
  for (const l of logs) {
    const wk = mondayOf(l.date);
    (dayCounts[wk] = dayCounts[wk] || new Set()).add(l.date);
  }
  const thisMonday = mondayOf(todayISO());
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + "T00:00:00");
    d.setDate(d.getDate() - i * 7);
    const key = localISO(d);
    out.push({ week: key, days: dayCounts[key]?.size || 0 });
  }
  return out;
}

/* ---------------- Plan-Helfer ---------------- */

export function getTodayPlan(data) {
  const plans = data.plans || [];
  const key = todayKey();
  return (
    plans.find((p) => p.id === data.activePlanId) ||
    plans.find((p) => (p.days || []).includes(key)) ||
    plans[0] ||
    null
  );
}

export function isRestDay(data) {
  const plans = data.plans || [];
  const anyScheduled = plans.some((p) => (p.days || []).length > 0);
  if (!anyScheduled) return false;
  return !plans.some((p) => (p.days || []).includes(todayKey()));
}

// Zentrale Sackgassen-Prüfung: bevor irgendwo "Workout starten" navigiert,
// erst klären WAS überhaupt möglich ist. Ein Klick darf nie blind auf einen
// leeren/unbrauchbaren Screen führen.
//   'no-plans'   — es existiert noch gar kein Trainingsplan
//   'empty-plan' — ein Plan ist aktiv, hat aber keine Übungen
//   'ready'      — Plan mit Übungen vorhanden, Workout kann starten/fortsetzen
export function workoutReadiness(data) {
  const plans = data.plans || [];
  if (plans.length === 0) return { status: "no-plans" };
  const plan = getTodayPlan(data);
  if (!plan) return { status: "no-plans" };
  if (!plan.exercises || plan.exercises.length === 0) {
    return { status: "empty-plan", planId: plan.id, planName: plan.name };
  }
  return { status: "ready", planId: plan.id };
}

export function nextTrainingDay(data) {
  const plans = (data.plans || []).filter((p) => (p.days || []).length > 0);
  if (!plans.length) return null;
  const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const now = new Date(todayISO() + "T00:00:00");
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const key = order[d.getDay()];
    const plan = plans.find((p) => p.days.includes(key));
    if (plan) return { days: i, plan, date: d };
  }
  return null;
}

// Geschätzte Workout-Dauer in Minuten: ~45 s Arbeit pro Satz + Pausenzeit
export function estimateDuration(exercises, defaultRest = 90) {
  const seconds = (exercises || []).reduce(
    (sum, e) => sum + (e.sets || 3) * (45 + (e.rest ?? defaultRest)),
    0,
  );
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

// Tages-Zitat deterministisch wählen (wechselt täglich, gender-Pool gemischt)
export function dailyQuote(quotes, gender) {
  const pool = [...quotes.any, ...(quotes[gender] || [])];
  const d = new Date();
  const seed =
    d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  return pool[seed % pool.length];
}
