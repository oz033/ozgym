/* Train-Tab: Session heute — Sätze, Fortschritt, Start (Ausführung) */

import React, { useState, useEffect, useMemo } from "react";
import { Play, Moon, Check, Dumbbell, ListPlus, CalendarDays } from "lucide-react";
import { Sparkline, EmptyState } from "../components/ui.jsx";
import StreakCalendar from "../components/StreakCalendar.jsx";
import {
  todayISO,
  getTodayPlan,
  isRestDay,
  nextTrainingDay,
  playSound,
  buzz,
  workoutReadiness,
  estimateDuration,
  SESSION_DURATION_OPTIONS,
  serializeQueueItem,
} from "../lib/utils.js";

export default function LogTab({
  data,
  update,
  queue,
  deferredQueue = [],
  carryHydrated = [],
  onStart,
  onCreatePlan,
  onCreateSmartPlan,
  onEditPlan,
}) {
  const today = todayISO();
  const [showStreak, setShowStreak] = useState(false);

  const plan = getTodayPlan(data);
  const restDay = isRestDay(data);
  const readiness = useMemo(() => workoutReadiness(data), [data]);
  const profileReady = !!data.profile?.goal;
  const restDefault = data.settings?.restSeconds ?? 90;
  const sessionMinutes =
    data.settings?.sessionMinutes != null
      ? data.settings.sessionMinutes
      : data.profile?.duration ?? 45;
  const includeCarry = data.settings?.includeCarryOver === true;
  const estMin = estimateDuration(queue, restDefault);
  const planExerciseCount = plan?.exercises?.length || 0;
  const deferred = deferredQueue || [];
  const carry = carryHydrated || [];

  const setSessionMinutes = (min) => {
    update((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        sessionMinutes: min,
        // "Alles" → Carry-Anhängen nicht nötig
        includeCarryOver: min === 0 ? false : prev.settings?.includeCarryOver,
      },
      profile: {
        ...prev.profile,
        duration: min > 0 ? min : prev.profile?.duration || 45,
      },
    }));
  };

  /** Dauer-Lücken in carryOver merken (merge unique) */
  const saveDeferredForLater = () => {
    if (!deferred.length) return;
    update((prev) => {
      const existing = prev.carryOver || [];
      const byKey = new Map(
        existing.map((x) => [x.exerciseId || x.name, x]),
      );
      deferred.forEach((e) => {
        const s = serializeQueueItem(e);
        byKey.set(s.exerciseId || s.name, s);
      });
      return { ...prev, carryOver: [...byKey.values()] };
    });
    playSound("tap", data.settings?.sound !== false);
  };

  const trainCarryToday = () => {
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, includeCarryOver: true },
    }));
    playSound("tap", data.settings?.sound !== false);
  };

  const discardCarry = () => {
    update((prev) => ({
      ...prev,
      carryOver: [],
      settings: { ...prev.settings, includeCarryOver: false },
    }));
  };

  const trainAllToday = () => {
    setSessionMinutes(0);
  };

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
    (it) => (setsToday[it.name] || 0) >= it.sets,
  ).length;

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!restDay) return;
    const iv = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(iv);
  }, [restDay]);
  const countdown = useMemo(() => {
    if (!restDay) return null;
    const next = nextTrainingDay(data);
    if (!next) return null;
    const target = new Date(today + "T00:00:00");
    target.setDate(target.getDate() + next.days);
    const ms = target.getTime() - nowTick;
    if (ms <= 0) return null;
    const totalH = Math.floor(ms / 3600000);
    return {
      days: Math.floor(totalH / 24),
      hours: totalH % 24,
      planName: next.plan.name,
      planIcon: next.plan.icon,
      weekday: target.toLocaleDateString("de-DE", { weekday: "long" }),
    };
  }, [restDay, data, today, nowTick]);

  const soundOn = data.settings?.sound !== false;
  const hapticsOn = data.settings?.haptics !== false;

  // Kein Plan oder ein leerer Plan sind KEIN Ruhetag — das war vorher verwechselt
  // und zeigte fälschlich "Heute: Ruhetag" an. Erst hier klären, dann erst die
  // eigentliche Trainingsansicht zeigen.
  if (readiness.status === "no-plans") {
    return (
      <div className="ig-tabpane">
        <EmptyState
          icon={<Dumbbell size={40} />}
          kicker="Trainieren"
          title="Noch kein Plan"
          description="Lege einen Split an oder nimm eine Vorlage — dann startet das erste Workout in Sekunden."
          primaryLabel="Plan erstellen"
          onPrimary={onCreatePlan}
          secondaryLabel={profileReady ? "Vorlage auswählen" : undefined}
          onSecondary={profileReady ? onCreateSmartPlan : undefined}
        />
      </div>
    );
  }
  if (readiness.status === "empty-plan") {
    return (
      <div className="ig-tabpane">
        <EmptyState
          icon={<ListPlus size={40} />}
          kicker="Trainieren"
          title={`„${readiness.planName}" ist leer`}
          description="Füge Übungen hinzu — Sätze und Wiederholungen kannst du jederzeit anpassen."
          primaryLabel="Übungen hinzufügen"
          onPrimary={() => onEditPlan(readiness.planId)}
        />
      </div>
    );
  }

  return (
    <div className="ig-tabpane">
      <h1 className="ig-screen-title">Trainieren</h1>
      {!restDay && plan ? (
        <button
          type="button"
          className="ig-plan-banner"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
          aria-label={
            showStreak
              ? "Trainingskalender schließen"
              : `Session ${plan.name} — Kalender öffnen`
          }
        >
          <span className="ig-banner-icon" aria-hidden="true">
            {plan.icon}
          </span>
          <span>
            Session: <strong>{plan.name}</strong>
          </span>
          <CalendarDays
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
            aria-hidden="true"
          />
        </button>
      ) : countdown ? (
        <button
          type="button"
          className="ig-card ig-rest-card"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
          aria-label={
            showStreak
              ? "Trainingskalender schließen"
              : "Ruhetag — Kalender öffnen"
          }
        >
          <Moon size={22} className="ig-rest-icon" />
          <div className="ig-rest-body">
            <span className="ig-rest-title">
              Nächstes Training: {countdown.weekday} · {countdown.planIcon}{" "}
              {countdown.planName}
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
          <CalendarDays
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
            aria-hidden="true"
          />
        </button>
      ) : (
        <button
          type="button"
          className="ig-plan-banner rest"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
          aria-label={
            showStreak
              ? "Trainingskalender schließen"
              : "Ruhetag — Kalender öffnen"
          }
        >
          <Moon size={16} />
          <span>Heute: Ruhetag — Regeneration zählt auch.</span>
          <CalendarDays
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
            aria-hidden="true"
          />
        </button>
      )}

      {restDay && plan && queue.length > 0 && (
        <p className="ig-rest-hint">
          Trotzdem Lust? Du kannst {plan.icon} {plan.name} auch heute starten.
        </p>
      )}

      {showStreak && (
        <StreakCalendar
          logs={data.logs}
          today={today}
          onClose={() => setShowStreak(false)}
        />
      )}

      {(data.plans || []).length > 1 && (
        <div className="ig-progress-plans" role="group" aria-label="Plan für heute">
          {data.plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className={"ig-chip" + (p.id === plan?.id ? " active" : "")}
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  activePlanId: p.id,
                  // Override day schedule for today only (see getTodayPlan)
                  settings: {
                    ...prev.settings,
                    sessionPlanId: p.id,
                    sessionPlanDate: today,
                  },
                }))
              }
              aria-pressed={p.id === plan?.id}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Session-Dauer: steuert, wie viele Übungen ins heutige Workout passen */}
      <div className="ig-card ig-session-duration">
        <div className="ig-session-duration-head">
          <span className="ig-field-label" style={{ margin: 0 }}>
            Workout-Dauer
          </span>
          <span className="ig-session-duration-est mono">
            ≈ {estMin} Min
            {planExerciseCount > 0 &&
              ` · ${queue.length}/${planExerciseCount} Übungen`}
            {includeCarry && carry.length > 0 ? " · +Nachholen" : ""}
          </span>
        </div>
        <div className="ig-mode-toggle ig-session-duration-chips" role="group" aria-label="Ziel-Dauer">
          {SESSION_DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.min}
              type="button"
              className={
                "ig-chip sm" + (sessionMinutes === opt.min ? " active" : "")
              }
              onClick={() => setSessionMinutes(opt.min)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Durch Dauer ausgelassen — merken oder alles trainieren */}
      {deferred.length > 0 && (
        <div className="ig-card ig-carry-card">
          <div className="ig-field-label">
            Nicht in der Session · {deferred.length}{" "}
            {deferred.length === 1 ? "Übung" : "Übungen"}
          </div>
          <p className="ig-plan-text" style={{ margin: 0 }}>
            {deferred.map((e) => e.name).join(" · ")}
          </p>
          <div className="ig-plan-add-row">
            <button
              type="button"
              className="ig-btn-primary wide ghosted"
              onClick={saveDeferredForLater}
            >
              Für später merken
            </button>
            <button
              type="button"
              className="ig-btn-primary wide ghosted"
              onClick={trainAllToday}
            >
              Heute alles
            </button>
          </div>
        </div>
      )}

      {/* Gemerkte Nachhol-Übungen */}
      {carry.length > 0 && (
        <div className="ig-card ig-carry-card saved">
          <div className="ig-field-label">
            Zum Nachholen · {carry.length}{" "}
            {carry.length === 1 ? "Übung" : "Übungen"}
            {includeCarry ? " · in Session" : ""}
          </div>
          <p className="ig-plan-text" style={{ margin: 0 }}>
            {carry.map((e) => e.name).join(" · ")}
          </p>
          <div className="ig-plan-add-row">
            {!includeCarry ? (
              <button
                type="button"
                className="ig-btn-primary wide ghosted"
                onClick={trainCarryToday}
              >
                Heute mit trainieren
              </button>
            ) : (
              <button
                type="button"
                className="ig-btn-primary wide ghosted"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, includeCarryOver: false },
                  }))
                }
              >
                Aus Session nehmen
              </button>
            )}
            <button
              type="button"
              className="ig-btn-primary wide ghosted"
              onClick={discardCarry}
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      <div className="ig-card">
        <div className="ig-field-label">
          {doneExercises >= queue.length && queue.length > 0
            ? "Alles geschafft — starke Leistung!"
            : queue.length - doneExercises === 1 && doneExercises > 0
              ? "Fast geschafft — nur noch eine Übung"
              : queue.length - doneExercises === 2 && doneExercises > 0
                ? "Fast geschafft — nur noch zwei Übungen"
                : `Heutiges Workout · ${queue.length} Übungen · ≈ ${estMin} Min`}
        </div>
        <ul className="ig-queue-list">
          {queue.map((it, i) => {
            const done = (setsToday[it.name] || 0) >= it.sets;
            const partial = !done && (setsToday[it.name] || 0) > 0;
            return (
              <li key={it.name}>
                <button
                  type="button"
                  className={
                    "ig-queue-row" +
                    (done ? " done" : "") +
                    (partial ? " partial" : "")
                  }
                  onClick={() => {
                    if (doneExercises >= queue.length) return;
                    onStart();
                    playSound("tap", soundOn);
                    buzz(15, hapticsOn);
                  }}
                  aria-label={
                    done
                      ? `${it.name} erledigt`
                      : `${it.name} — Workout starten`
                  }
                >
                  <span className="ig-queue-dot" aria-hidden="true">
                    {done ? "✓" : partial ? "◐" : i + 1}
                  </span>
                  <span className="ig-queue-name">{it.name}</span>
                  {(sparkByExercise[it.name] || []).length >= 2 && (
                    <Sparkline points={sparkByExercise[it.name]} w={54} h={20} />
                  )}
                  <span className="ig-queue-meta mono">
                    {setsToday[it.name] || 0}/{it.sets}
                  </span>
                </button>
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

      {/* Sticky: bei langen Plänen bleibt der Start-Button per Daumen erreichbar */}
      <div className="ig-sticky-cta">
        {doneExercises >= queue.length && queue.length > 0 ? (
          <div className="ig-card ig-done-note">
            <span className="ig-done-note-icon"><Check size={20} /></span>
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
              onStart();
              playSound("pr", soundOn);
              buzz([40, 30, 40], hapticsOn);
            }}
          >
            <Play size={20} />
            {doneExercises > 0 ? "Workout fortsetzen" : "Workout starten"}
          </button>
        )}
      </div>
    </div>
  );
}
