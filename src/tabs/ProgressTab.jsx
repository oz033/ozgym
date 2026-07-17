/* Verlauf: Kalender, Muskelgruppen, Frequenz, Gewicht, Übungs-Fortschritt, Abzeichen.
   Bewusst kuratiert statt "viele Diagramme": jedes Widget beantwortet eine andere Frage,
   nichts dupliziert die Overview-Zahlen von Home. */

import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Scale,
  Trophy,
  Award,
  TrendingUp,
  Timer,
  ChevronRight,
} from "lucide-react";
import { CountUp, Sparkline, EmptyState } from "../components/ui.jsx";
import WeightChart from "../components/WeightChart.jsx";
import StreakCalendar from "../components/StreakCalendar.jsx";
import {
  calcStats,
  exerciseStats,
  getTodayPlan,
  fmtDate,
  round1,
  todayISO,
  muscleVolumeBreakdown,
  weeklyFrequency,
} from "../lib/utils.js";
import { BADGE_DEFS, MUSCLE_NAME } from "../lib/constants.js";

export default function ProgressTab({ data, onStart, onEditPlan }) {
  const plans = data.plans || [];
  const [planId, setPlanId] = useState(
    () => getTodayPlan(data)?.id || plans[0]?.id || null,
  );
  const plan = plans.find((p) => p.id === planId) || plans[0] || null;
  const today = todayISO();

  const byId = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [data.library]);

  const stats = useMemo(
    () => calcStats(data.logs, data.settings?.weeklyGoal || 3),
    [data.logs, data.settings?.weeklyGoal],
  );

  const muscleBreakdown = useMemo(
    () => muscleVolumeBreakdown(data.logs, data.library).slice(0, 5),
    [data.logs, data.library],
  );

  const frequency = useMemo(() => weeklyFrequency(data.logs, 8), [data.logs]);
  const maxFreqDays = Math.max(1, ...frequency.map((f) => f.days));

  // Trainingszeit aus persistierten Sessions (seit v2.2 beim Abschluss gespeichert)
  const timeStats = useMemo(() => {
    const ss = data.sessions || [];
    if (!ss.length) return null;
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekSec = ss
      .filter((x) => new Date(x.date + "T12:00:00") >= monday)
      .reduce((a, x) => a + (x.seconds || 0), 0);
    const totalSec = ss.reduce((a, x) => a + (x.seconds || 0), 0);
    return {
      weekMin: Math.round(weekSec / 60),
      avgMin: Math.round(totalSec / ss.length / 60),
      totalH: round1(totalSec / 3600),
    };
  }, [data.sessions]);

  const weightChart = (data.profile.weightLog || []).map((e) => ({
    label: fmtDate(e.date),
    kg: e.kg,
  }));

  const rows = useMemo(() => {
    if (!plan) return [];
    return plan.exercises.map((it) => {
      const name = byId[it.exerciseId]?.name || "?";
      return { name, item: it, s: exerciseStats(data.logs, name) };
    });
  }, [plan, byId, data.logs]);

  if (stats.totalWorkouts === 0) {
    return (
      <div className="ig-tabpane">
        <h1 className="ig-screen-title">Verlauf</h1>
        <EmptyState
          icon={<TrendingUp size={40} />}
          kicker="Verlauf"
          title="Noch keine Daten"
          description="Nach dem ersten Workout siehst du hier Volumen, Rekorde und deine Serie."
          primaryLabel="Workout starten"
          onPrimary={onStart}
        />
      </div>
    );
  }

  return (
    <div className="ig-tabpane ig-progress-dna">
      <div className="ig-home-summary-head">
        <h1 className="ig-screen-title">Verlauf</h1>
      </div>

      {/* Lifetime summary — mini DNA cards */}
      <div className="ig-home-summary-grid ig-progress-summary">
        <div className="ig-card ig-home-mini">
          <span className="ig-home-mini-icon" aria-hidden="true">
            <CalendarDays size={16} />
          </span>
          <span className="ig-home-mini-kicker">Einheiten</span>
          <span className="ig-home-mini-num mono">
            <CountUp value={stats.totalWorkouts} />
          </span>
        </div>
        <div className="ig-card ig-home-mini">
          <span className="ig-home-mini-icon" aria-hidden="true">
            <Scale size={16} />
          </span>
          <span className="ig-home-mini-kicker">Volumen</span>
          <span className="ig-home-mini-num mono">
            <CountUp
              value={stats.totalVolume}
              format={(v) =>
                stats.totalVolume >= 1000 ? `${round1(v / 1000)}t` : Math.round(v)
              }
            />
          </span>
        </div>
        <div className="ig-card ig-home-mini">
          <span className="ig-home-mini-icon" aria-hidden="true">
            <Trophy size={16} />
          </span>
          <span className="ig-home-mini-kicker">Rekorde</span>
          <span className="ig-home-mini-num mono">
            <CountUp value={stats.prCount} />
          </span>
        </div>
        {timeStats ? (
          <div className="ig-card ig-home-mini">
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Timer size={16} />
            </span>
            <span className="ig-home-mini-kicker">Diese Woche</span>
            <span className="ig-home-mini-num mono">
              <CountUp value={timeStats.weekMin} />
              <span className="ig-home-mini-unit"> Min</span>
            </span>
            <span className="ig-home-mini-meta mono">
              Ø {timeStats.avgMin} · {timeStats.totalH}h gesamt
            </span>
          </div>
        ) : (
          <div className="ig-card ig-home-mini">
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Timer size={16} />
            </span>
            <span className="ig-home-mini-kicker">Zeit</span>
            <span className="ig-home-mini-num mono">—</span>
            <span className="ig-home-mini-meta">nach Sessions</span>
          </div>
        )}
      </div>

      {/* Trainingskalender */}
      <StreakCalendar logs={data.logs} today={today} />

      {/* Muskelgruppen-Verteilung */}
      {muscleBreakdown.length > 0 && (
        <div className="ig-card">
          <div className="ig-home-summary-head" style={{ marginBottom: 8 }}>
            <h2 className="ig-home-section-title">Muskelgruppen</h2>
          </div>
          <div className="ig-muscle-bars">
            {muscleBreakdown.map((m) => (
              <div key={m.muscle} className="ig-muscle-row">
                <span className="ig-muscle-name">{MUSCLE_NAME[m.muscle] || m.muscle}</span>
                <div className="ig-muscle-track">
                  <div className="ig-muscle-fill" style={{ width: `${Math.round(m.pct * 100)}%` }} />
                </div>
                <span className="ig-muscle-pct mono">{Math.round(m.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequenz — bar chart DNA */}
      <div className="ig-card ig-progress-freq-card">
        <div className="ig-home-summary-head" style={{ marginBottom: 10 }}>
          <h2 className="ig-home-section-title">Frequenz</h2>
          <span className="ig-home-week-meta mono">8 Wochen</span>
        </div>
        <div className="ig-freq-bars">
          {frequency.map((f) => (
            <div key={f.week} className="ig-freq-col">
              <div className="ig-freq-track">
                <div
                  className="ig-freq-fill"
                  style={{ height: `${(f.days / maxFreqDays) * 100}%` }}
                />
              </div>
              <span className="ig-freq-num mono">{f.days}</span>
            </div>
          ))}
        </div>
      </div>

      {weightChart.length >= 2 && (
        <div className="ig-card">
          <div className="ig-home-summary-head" style={{ marginBottom: 8 }}>
            <h2 className="ig-home-section-title">Körpergewicht</h2>
            <Scale size={16} className="ig-dash-icon" aria-hidden="true" />
          </div>
          <div className="ig-chart-wrap">
            <WeightChart data={weightChart} height={160} />
          </div>
        </div>
      )}

      {/* Übungs-Fortschritt je Plan */}
      {plans.length > 1 && (
        <div className="ig-progress-plans">
          {plans.map((p) => (
            <button
              key={p.id}
              className={"ig-chip" + (p.id === plan?.id ? " active" : "")}
              onClick={() => setPlanId(p.id)}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      )}

      {!plan && (
        <div className="ig-card">
          <p className="ig-empty">
            Leg im Plan-Tab einen Trainingsplan an, um hier deinen Fortschritt zu sehen.
          </p>
        </div>
      )}

      {rows.map(({ name, s }) => (
        <button
          type="button"
          className="ig-card ig-ex-stat ig-ex-stat-btn"
          key={name}
          onClick={() => onEditPlan && plan && onEditPlan(plan.id)}
          aria-label={`${name} im Plan-Editor öffnen`}
        >
          <div className="ig-ex-stat-head">
            <span className="ig-ex-stat-name">{name}</span>
            {s && (
              <span className={"ig-ex-stat-diff mono" + (s.diff > 0 ? " pos" : s.diff < 0 ? " neg" : "")}>
                {s.diff > 0 ? "+" : s.diff < 0 ? "" : "±"}
                {s.diff} kg
              </span>
            )}
            <ChevronRight size={15} className="ig-ex-stat-chev" aria-hidden="true" />
          </div>
          {!s ? (
            <p className="ig-empty">Noch keine Daten — nach dem ersten Training geht's hier los.</p>
          ) : (
            <div className="ig-ex-stat-row">
              <Sparkline points={s.spark} w={110} h={34} />
              <div className="ig-ex-stat-facts mono">
                <span>Bestwert {s.best} kg</span>
                <span>1RM {s.bestE1} kg</span>
                <span>{s.sessions} Einheiten · zuletzt {fmtDate(s.lastDate)}</span>
              </div>
            </div>
          )}
        </button>
      ))}

      <div className="ig-card">
        <div className="ig-home-summary-head" style={{ marginBottom: 10 }}>
          <h2 className="ig-home-section-title">Abzeichen</h2>
          <Award size={16} className="ig-dash-icon" aria-hidden="true" />
        </div>
        <div className="ig-achieve-grid">
          {BADGE_DEFS.map((b) => {
            const earned = b.check(stats);
            return (
              <div key={b.id} className={"ig-achieve" + (earned ? " earned" : "")}>
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
