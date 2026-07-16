/* Home — Hallmark workbench-lite:
   3 seconds: what today → start → week status.
   Logo files untouched. */

import React, { useMemo, useState } from "react";
import {
  Play,
  Flame,
  Trophy,
  Target,
  CalendarDays,
  Zap,
} from "lucide-react";
import { CountUp } from "../components/ui.jsx";
import StreakCalendar from "../components/StreakCalendar.jsx";
import {
  calcStats,
  dayStreak,
  getTodayPlan,
  isRestDay,
  nextTrainingDay,
  todayISO,
  todayKey,
  estimateDuration,
  lastRecord,
  relativeDay,
  fmtDate,
  round1,
  currentWeightKg,
  estimateKcal,
} from "../lib/utils.js";
import { weeklyAdherence, catchUpDay } from "../lib/planGenerator.js";

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function DashboardTab({ data, update: _update, goTo, onStart }) {
  const [showCal, setShowCal] = useState(false);
  const stats = useMemo(
    () => calcStats(data.logs, data.settings?.weeklyGoal || 3),
    [data.logs, data.settings?.weeklyGoal],
  );
  const plan = getTodayPlan(data);
  const restDay = isRestDay(data);
  const today = todayISO();
  const streak = useMemo(() => dayStreak(data.logs, today), [data.logs, today]);
  const next = useMemo(() => nextTrainingDay(data), [data]);
  const adherence = useMemo(() => weeklyAdherence(data), [data]);
  const catchUp = useMemo(() => catchUpDay(data), [data]);
  const planByIdName = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e.name;
    });
    return m;
  }, [data.library]);
  const record = useMemo(() => lastRecord(data.logs), [data.logs]);
  const lastWorkout = useMemo(() => {
    const lastDate = stats.lastDays.find((d) => d !== today) || stats.lastDays[0];
    if (!lastDate || lastDate === today) return null;
    const dayLogs = data.logs.filter((l) => l.date === lastDate);
    const vol = stats.dayVolumes[lastDate] || 0;
    return { date: lastDate, exercises: dayLogs.length, volume: Math.round(vol) };
  }, [stats, data.logs, today]);

  const weeklyGoal = data.settings?.weeklyGoal || 3;
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const trainedToday = !!stats.dayVolumes[today];
  const duration = plan
    ? estimateDuration(plan.exercises, data.settings?.restSeconds)
    : 0;
  const weekday = WEEKDAYS_DE[new Date().getDay()];
  const preview = (plan?.exercises || []).slice(0, 5);

  /* —— Empty: first session —— */
  if (stats.totalWorkouts === 0) {
    return (
      <div className="ig-tabpane ig-home">
        <div className="ig-home-hero">
          <span className="ig-home-eyebrow mono">{weekday} · Start</span>
          <h1 className="ig-home-title">{greeting}</h1>
          <p className="ig-home-sub">
            {plan
              ? `${plan.name} · ${plan.exercises.length} Übungen · ≈ ${duration} Min`
              : "Lege im Plan-Tab deinen Trainingsplan an — oder starte direkt."}
          </p>
        </div>
        <button
          className="ig-btn-primary wide xl ig-home-cta"
          onClick={() => (plan ? onStart() : goTo("plan"))}
        >
          <Play size={20} />
          {plan ? "Erstes Workout starten" : "Plan anlegen"}
        </button>
      </div>
    );
  }

  /* —— Status label —— */
  let eyebrow = `${weekday} · Heute`;
  let title = plan?.name || greeting;
  let sub = plan
    ? `${plan.exercises.length} Übungen · ≈ ${duration} Min · ${stats.thisWeekDays}/${weeklyGoal} diese Woche`
    : "Kein Plan für heute — im Plan-Tab zuweisen.";

  if (trainedToday) {
    eyebrow = `${weekday} · Erledigt`;
    title = "Stark gemacht.";
    // Echte Zahlen der heutigen Einheit(en) statt Floskel — Dauer aus der
    // persistierten Session, Kalorien nur als ehrliche ≈-Schätzung mit
    // vorhandenem Körpergewicht.
    const todaySessions = (data.sessions || []).filter((x) => x.date === today);
    const secondsToday = todaySessions.reduce((a, x) => a + (x.seconds || 0), 0);
    const kcal = estimateKcal(secondsToday, currentWeightKg(data.profile));
    sub =
      secondsToday > 0
        ? `${Math.max(1, Math.round(secondsToday / 60))} Min trainiert` +
          (kcal ? ` · ≈ ${kcal} kcal` : "") +
          ` · ${Math.round(stats.dayVolumes[today] || 0)} kg bewegt`
        : "Training für heute im Kasten.";
  } else if (restDay) {
    eyebrow = `${weekday} · Ruhetag`;
    title = "Regeneration.";
    sub = next
      ? `Nächstes Training: ${next.date.toLocaleDateString("de-DE", { weekday: "long" })} · ${next.plan.name}`
      : "Kein nächster Plan gesetzt.";
  }

  return (
    <div className="ig-tabpane ig-home">
      {/* 1 · Hero: plan first */}
      <div className="ig-home-hero">
        <span className="ig-home-eyebrow mono">{eyebrow}</span>
        <h1 className="ig-home-title">{title}</h1>
        <p className="ig-home-sub">{sub}</p>
      </div>

      {/* 2 · Primary CTA only when a session can still start */}
      {!restDay && !trainedToday && plan && (
        <button className="ig-btn-primary wide xl ig-home-cta" onClick={() => onStart()}>
          <Play size={20} /> Workout starten
        </button>
      )}
      {restDay && plan && !trainedToday && (
        <button
          className="ig-btn-primary wide ghosted ig-home-cta"
          onClick={() => onStart()}
        >
          <Play size={16} /> Trotzdem {plan.name} starten
        </button>
      )}
      {!plan && !trainedToday && (
        <button
          className="ig-btn-primary wide ghosted ig-home-cta"
          onClick={() => goTo("plan")}
        >
          Plan öffnen
        </button>
      )}

      {/* 3 · Week strip — all three actions are real */}
      <div className="ig-card ig-overview ig-home-overview">
        <div className="ig-overview-row">
          <button
            type="button"
            className="ig-overview-col"
            onClick={() => setShowCal((s) => !s)}
            aria-label="Kalender öffnen"
          >
            <Flame size={16} className="ig-dash-icon" />
            <span className="ig-overview-num mono">
              <CountUp value={streak.streak} />
            </span>
            <span className="ig-overview-label">Serie</span>
          </button>
          <div className="ig-overview-divider" />
          <button
            type="button"
            className="ig-overview-col"
            onClick={() => goTo("progress")}
            aria-label="Wochenfortschritt im Verlauf"
          >
            <Target size={16} className="ig-dash-icon" />
            <span className="ig-overview-num mono">
              {stats.thisWeekDays >= weeklyGoal
                ? "✓"
                : `${stats.thisWeekDays}/${weeklyGoal}`}
            </span>
            <span className="ig-overview-label">Woche</span>
          </button>
          <div className="ig-overview-divider" />
          <button
            type="button"
            className="ig-overview-col"
            onClick={() => goTo("progress")}
            aria-label="Rekorde im Verlauf"
          >
            <Trophy size={16} className="ig-dash-icon" />
            <span className="ig-overview-num mono">
              <CountUp value={stats.prCount} />
            </span>
            <span className="ig-overview-label">PR</span>
          </button>
        </div>
        <button
          type="button"
          className="ig-overview-level ig-overview-level-btn"
          onClick={() => goTo("progress")}
          aria-label={`Level ${stats.level} — Verlauf öffnen`}
        >
          <span className="ig-overview-level-label">
            <Zap size={12} /> Level {stats.level}
          </span>
          <div className="ig-level-track sm">
            <div
              className="ig-level-fill"
              style={{ width: `${stats.levelPct * 100}%` }}
            />
          </div>
        </button>
      </div>

      {/* Missed week nudge — actionable */}
      {adherence && adherence.missed > 0 && !trainedToday && (
        <button
          type="button"
          className="ig-card ig-nudge ig-nudge-btn"
          onClick={() => (plan ? onStart() : goTo("plan"))}
        >
          <span className="ig-nudge-icon">
            <Target size={16} />
          </span>
          <span className="ig-nudge-text">
            Diese Woche {adherence.missed}{" "}
            {adherence.missed === 1 ? "Einheit" : "Einheiten"} verpasst.
            {catchUp
              ? catchUp.key === todayKey()
                ? " Heute nachholen."
                : ` Nachholen: ${catchUp.label}.`
              : ""}
          </span>
          <Play size={16} className="ig-nudge-chev" aria-hidden="true" />
        </button>
      )}

      {/* 4 · Next exercises — tap opens workout */}
      {plan && !trainedToday && !restDay && preview.length > 0 && (
        <button
          type="button"
          className="ig-card ig-today-card ig-today-card-btn"
          onClick={() => onStart()}
        >
          <div className="ig-field-label">Nächste Übungen</div>
          <ol className="ig-today-plan">
            {preview.map((it, i) => (
              <li key={it.exerciseId + i}>
                <span className="ig-today-plan-num mono">{i + 1}</span>
                <span className="ig-today-plan-name">
                  {planByIdName[it.exerciseId] || "?"}
                </span>
                <span className="ig-today-plan-meta mono">
                  {it.sets} × {it.reps}
                </span>
              </li>
            ))}
          </ol>
          {plan.exercises.length > preview.length && (
            <p className="ig-plan-text" style={{ marginTop: 8 }}>
              +{plan.exercises.length - preview.length} weitere im Workout
            </p>
          )}
        </button>
      )}

      {/* Secondary lines — not competing with CTA */}
      {record && (
        <button className="ig-pr-banner" onClick={() => goTo("progress")}>
          <Trophy size={15} />
          <span className="ig-pr-text">
            Letzter PR: <strong>{record.exercise}</strong> {record.weight} kg
          </span>
          <span className="ig-pr-when">{relativeDay(record.date, today)}</span>
        </button>
      )}

      {lastWorkout && (
        <button className="ig-weight-line" onClick={() => goTo("progress")}>
          <span>Letztes Training · {fmtDate(lastWorkout.date)}</span>
          <span className="mono">
            {lastWorkout.exercises} Übungen ·{" "}
            {lastWorkout.volume >= 1000
              ? `${round1(lastWorkout.volume / 1000)}t`
              : `${lastWorkout.volume} kg`}
          </span>
        </button>
      )}

      {showCal && (
        <StreakCalendar
          logs={data.logs}
          today={today}
          onClose={() => setShowCal(false)}
        />
      )}
      {!showCal && (
        <button className="ig-cal-open" onClick={() => setShowCal(true)}>
          <CalendarDays size={14} /> Kalender
        </button>
      )}
    </div>
  );
}
