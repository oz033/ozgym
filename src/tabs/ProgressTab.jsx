/* Verlauf: Kalender, Muskelgruppen, Frequenz, Gewicht-Tracking, Übungs-Fortschritt, Abzeichen. */

import React, { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  Scale,
  Trophy,
  Award,
  TrendingUp,
  Timer,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { CountUp, Sparkline, EmptyState, showToast } from "../components/ui.jsx";
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

/** Körpergewicht: Eintrag mit Datum speichern, Liste, Chart — immer nutzbar. */
function WeightTracker({ profile, update }) {
  const log = useMemo(() => {
    const raw = Array.isArray(profile?.weightLog) ? profile.weightLog : [];
    return [...raw]
      .filter((e) => e && e.date && Number(e.kg) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [profile?.weightLog]);

  const today = todayISO();
  const last = log[log.length - 1];
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState(() =>
    last?.kg != null ? String(last.kg) : profile?.weightKg ? String(profile.weightKg) : "",
  );

  // Prefill kg when picking a date that already has an entry
  useEffect(() => {
    const hit = log.find((e) => e.date === date);
    if (hit) setKg(String(hit.kg));
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const weightChart = log.map((e) => ({
    label: fmtDate(e.date),
    kg: Number(e.kg),
    date: e.date,
  }));

  const saveEntry = () => {
    const w = Number(String(kg).replace(",", "."));
    if (!date || !Number.isFinite(w) || w < 20 || w > 400) {
      showToast("Gewicht zwischen 20 und 400 kg eingeben.", "error");
      return;
    }
    const rounded = Math.round(w * 10) / 10;
    update((prev) => {
      const prevLog = Array.isArray(prev.profile?.weightLog)
        ? prev.profile.weightLog
        : [];
      const rest = prevLog.filter((e) => e.date !== date);
      const nextLog = [...rest, { date, kg: rounded }].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const latest = nextLog[nextLog.length - 1];
      return {
        ...prev,
        profile: {
          ...prev.profile,
          weightKg: latest ? String(latest.kg) : prev.profile?.weightKg,
          weightLog: nextLog,
        },
      };
    });
    showToast(`${rounded} kg · ${fmtDate(date)}`, "info");
  };

  const removeEntry = (d) => {
    update((prev) => {
      const nextLog = (prev.profile?.weightLog || [])
        .filter((e) => e.date !== d)
        .sort((a, b) => a.date.localeCompare(b.date));
      const latest = nextLog[nextLog.length - 1];
      return {
        ...prev,
        profile: {
          ...prev.profile,
          weightKg: latest ? String(latest.kg) : "",
          weightLog: nextLog,
        },
      };
    });
    showToast("Eintrag gelöscht", "info");
  };

  const delta =
    weightChart.length >= 2
      ? round1(
          Number(weightChart[weightChart.length - 1].kg) -
            Number(weightChart[0].kg),
        )
      : null;

  // Newest first for the list
  const listNewest = [...log].reverse();

  return (
    <div className="ig-card ig-weight-tracker">
      <div className="ig-home-summary-head" style={{ marginBottom: 10 }}>
        <h2 className="ig-home-section-title">Körpergewicht</h2>
        <Scale size={16} className="ig-dash-icon" aria-hidden="true" />
      </div>

      {/* Add / edit form */}
      <div className="ig-weight-form" role="group" aria-label="Gewicht eintragen">
        <label className="ig-num-field">
          <span>Datum</span>
          <input
            type="date"
            className="ig-input mono"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
          />
        </label>
        <label className="ig-num-field">
          <span>Gewicht (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={20}
            max={400}
            className="ig-input mono"
            placeholder="z. B. 78.5"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEntry();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="ig-btn-primary ig-weight-save"
          onClick={saveEntry}
        >
          <Plus size={16} aria-hidden="true" /> Speichern
        </button>
      </div>
      <p className="ig-plan-text" style={{ margin: "4px 0 0" }}>
        Gleicher Tag = überschreiben. Beliebige Tage nachtragen.
      </p>

      {weightChart.length > 0 && (
        <div
          className="ig-home-summary-grid"
          style={{ marginTop: 12, marginBottom: weightChart.length >= 2 ? 12 : 0 }}
        >
          <div className="ig-card ig-home-mini" style={{ margin: 0 }}>
            <span className="ig-home-mini-kicker">Aktuell</span>
            <span className="ig-home-mini-num mono">
              {weightChart[weightChart.length - 1]?.kg ?? "—"}
              <span className="ig-home-mini-unit"> kg</span>
            </span>
            <span className="ig-home-mini-meta mono">
              {weightChart[weightChart.length - 1]?.label || ""}
            </span>
          </div>
          {delta != null && (
            <div className="ig-card ig-home-mini" style={{ margin: 0 }}>
              <span className="ig-home-mini-kicker">Δ seit Start</span>
              <span className="ig-home-mini-num mono">
                {(delta > 0 ? "+" : "") + delta}
                <span className="ig-home-mini-unit"> kg</span>
              </span>
              <span className="ig-home-mini-meta mono">
                {weightChart.length} Einträge
              </span>
            </div>
          )}
        </div>
      )}

      {weightChart.length >= 2 && (
        <div className="ig-chart-wrap" style={{ marginTop: 4 }}>
          <WeightChart data={weightChart} height={160} />
        </div>
      )}

      {listNewest.length > 0 && (
        <ul className="ig-weight-log" aria-label="Gewichtseinträge">
          {listNewest.map((e) => (
            <li key={e.date} className="ig-weight-log-row">
              <button
                type="button"
                className="ig-weight-log-main"
                onClick={() => {
                  setDate(e.date);
                  setKg(String(e.kg));
                }}
                aria-label={`${fmtDate(e.date)} · ${e.kg} kg bearbeiten`}
              >
                <span className="mono ig-weight-log-date">{fmtDate(e.date)}</span>
                <span className="mono ig-weight-log-kg">{e.kg} kg</span>
              </button>
              <button
                type="button"
                className="ig-icon-btn ghost sm"
                onClick={() => removeEntry(e.date)}
                aria-label={`${fmtDate(e.date)} löschen`}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProgressTab({ data, update, onStart, onEditPlan }) {
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

  const rows = useMemo(() => {
    if (!plan) return [];
    return plan.exercises.map((it) => {
      const name = byId[it.exerciseId]?.name || "?";
      return { name, item: it, s: exerciseStats(data.logs, name) };
    });
  }, [plan, byId, data.logs]);

  const weightBlock = (
    <WeightTracker profile={data.profile || {}} update={update} />
  );

  if (stats.totalWorkouts === 0) {
    return (
      <div className="ig-tabpane ig-progress-dna">
        <div className="ig-home-summary-head">
          <h1 className="ig-screen-title">Verlauf</h1>
        </div>
        {weightBlock}
        <EmptyState
          icon={<TrendingUp size={40} />}
          kicker="Training"
          title="Noch keine Workouts"
          description="Gewicht kannst du schon tracken. Trainingsdaten erscheinen nach dem ersten Workout."
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

      <StreakCalendar logs={data.logs} today={today} />

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

      {weightBlock}

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
              <span
                className={
                  "ig-ex-stat-diff mono" +
                  (s.diff > 0 ? " pos" : s.diff < 0 ? " neg" : "")
                }
              >
                {s.diff > 0 ? "+" : s.diff < 0 ? "" : "±"}
                {s.diff} kg
              </span>
            )}
            <ChevronRight size={15} className="ig-ex-stat-chev" aria-hidden="true" />
          </div>
          {!s ? (
            <p className="ig-empty">
              Noch keine Daten — nach dem ersten Training geht&apos;s hier los.
            </p>
          ) : (
            <div className="ig-ex-stat-row">
              <Sparkline points={s.spark} w={110} h={34} />
              <div className="ig-ex-stat-facts mono">
                <span>Bestwert {s.best} kg</span>
                <span>1RM {s.bestE1} kg</span>
                <span>
                  {s.sessions} Einheiten · zuletzt {fmtDate(s.lastDate)}
                </span>
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
            let earned = false;
            try {
              earned = b.check(stats);
            } catch {
              earned = false;
            }
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
