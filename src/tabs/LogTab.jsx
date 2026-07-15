/* Train-Tab: Session heute — Sätze, Fortschritt, Start (Ausführung) */

import React, { useState, useEffect, useMemo } from "react";
import { Play, Moon, ChevronRight, Check, Dumbbell, ListPlus } from "lucide-react";
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
} from "../lib/utils.js";

export default function LogTab({ data, update, queue, onStart, onCreatePlan, onCreateSmartPlan, onEditPlan }) {
  const today = todayISO();
  const [showStreak, setShowStreak] = useState(false);

  const plan = getTodayPlan(data);
  const restDay = isRestDay(data);
  const readiness = useMemo(() => workoutReadiness(data), [data]);
  const profileReady = !!data.profile?.goal;

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
          title="Du hast noch keinen Trainingsplan"
          description="Erstelle zuerst einen Trainingsplan, um dein erstes Workout zu starten."
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
          title={`"${readiness.planName}" hat noch keine Übungen`}
          description="Füge Übungen zu deinem Plan hinzu, bevor du dein Workout startest."
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
          className="ig-plan-banner"
          onClick={() => setShowStreak((s) => !s)}
          aria-expanded={showStreak}
        >
          <span className="ig-banner-icon">{plan.icon}</span>
          <span>
            Session: <strong>{plan.name}</strong>
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
          <span>Heute: Ruhetag — Regeneration zählt auch.</span>
          <ChevronRight
            size={15}
            className={"ig-banner-chev" + (showStreak ? " open" : "")}
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
        <div className="ig-progress-plans">
          {data.plans.map((p) => (
            <button
              key={p.id}
              className={"ig-chip" + (p.id === plan?.id ? " active" : "")}
              onClick={() =>
                update((prev) => ({ ...prev, activePlanId: p.id }))
              }
            >
              {p.icon} {p.name}
            </button>
          ))}
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
                : `Heutiges Workout · ${queue.length} Übungen`}
        </div>
        <ul className="ig-queue-list">
          {queue.map((it, i) => {
            const done = (setsToday[it.name] || 0) >= it.sets;
            const partial = !done && (setsToday[it.name] || 0) > 0;
            return (
              <li
                key={it.name}
                className={
                  "ig-queue-row" +
                  (done ? " done" : "") +
                  (partial ? " partial" : "")
                }
              >
                <span className="ig-queue-dot">
                  {done ? "✓" : partial ? "◐" : i + 1}
                </span>
                <span className="ig-queue-name">{it.name}</span>
                {(sparkByExercise[it.name] || []).length >= 2 && (
                  <Sparkline points={sparkByExercise[it.name]} w={54} h={20} />
                )}
                <span className="ig-queue-meta mono">
                  {setsToday[it.name] || 0}/{it.sets}
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
