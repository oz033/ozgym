/* Home — FitPal DNA: welcome · chips · summary · week status · start CTA */

import React, { useEffect, useMemo, useState } from "react";
import {
  Play,
  Flame,
  Target,
  Zap,
  Share2,
  CalendarDays,
  Trophy,
  ChevronRight,
  Dumbbell,
  Bell,
  Pencil,
  ScanBarcode,
} from "lucide-react";
import { CountUp, showToast } from "../components/ui.jsx";
import { OzGymMark } from "../components/brand.jsx";
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
  fmtDate,
  round1,
  currentWeightKg,
  estimateKcal,
  buzz,
  mondayOf,
  localISO,
  formatDisplayName,
} from "../lib/utils.js";
import { weeklyAdherence, catchUpDay } from "../lib/planGenerator.js";
import { sharePayload } from "../lib/iosShell.js";
import { APP_NAME } from "../lib/constants.js";

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEK_STRIP = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** FitPal-style area chart for weekly volume (kg). */
function WeekStatusChart({ days, peakLabel }) {
  const w = 320;
  const h = 96;
  const padX = 8;
  const padY = 12;
  const vols = days.map((d) => d.vol || 0);
  const max = Math.max(1, ...vols);
  const n = Math.max(1, days.length - 1);
  const pts = days.map((d, i) => {
    const x = padX + (i / n) * (w - padX * 2);
    const y = h - padY - ((d.vol || 0) / max) * (h - padY * 2);
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area =
    `${padX},${h - padY} ` +
    pts.map((p) => p.join(",")).join(" ") +
    ` ${w - padX},${h - padY}`;
  const last = pts[pts.length - 1] || [w / 2, h / 2];
  const todayIdx = days.findIndex((d) => d.isToday);
  const focus = todayIdx >= 0 ? pts[todayIdx] : last;

  return (
    <div className="ig-status-chart" aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ig-status-chart-svg">
        <defs>
          <linearGradient id="igWeekArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#igWeekArea)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={focus[0]} cy={focus[1]} r="5" fill="var(--accent)" />
        <circle
          cx={focus[0]}
          cy={focus[1]}
          r="9"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
      </svg>
      {peakLabel ? <span className="ig-status-chart-peak mono">{peakLabel}</span> : null}
      <div className="ig-status-chart-axis">
        {days.map((d) => (
          <span key={d.key} className={d.isToday ? "is-today" : d.trained ? "is-done" : ""}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mon–Sun of current week with trained flag */
function weekStripDays(dayVolumes, today) {
  const mon = mondayOf(today);
  const start = new Date(mon + "T00:00:00");
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = localISO(d);
    out.push({
      key: iso,
      label: WEEK_STRIP[i],
      dayNum: d.getDate(),
      trained: !!dayVolumes[iso],
      vol: Math.round(dayVolumes[iso] || 0),
      isToday: iso === today,
      future: iso > today,
    });
  }
  return out;
}

function weekVolumeKg(dayVolumes, today) {
  const mon = mondayOf(today);
  const start = new Date(mon + "T00:00:00");
  let vol = 0;
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = localISO(d);
    const v = dayVolumes[iso] || 0;
    if (v > 0) {
      vol += v;
      days++;
    }
  }
  return { vol: Math.round(vol), days };
}

export default function DashboardTab({ data, update, goTo, onStart, onScanFood }) {
  const [showCal, setShowCal] = useState(false);
  const [titleCompact, setTitleCompact] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    const main = document.querySelector(".ig-main");
    if (!main) return;
    const onScroll = () => setTitleCompact(main.scrollTop > 36);
    onScroll();
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

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

  const weekDays = useMemo(
    () => weekStripDays(stats.dayVolumes, today),
    [stats.dayVolumes, today],
  );
  const weekVol = useMemo(
    () => weekVolumeKg(stats.dayVolumes, today),
    [stats.dayVolumes, today],
  );

  const weeklyGoal = data.settings?.weeklyGoal || 3;
  const displayName = formatDisplayName(data.profile?.displayName);
  const hour = new Date().getHours();
  const timeHello =
    hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const hiTitle = displayName ? `Hi, ${displayName}!` : timeHello;
  const trainedToday = !!stats.dayVolumes[today];
  const duration = plan
    ? estimateDuration(plan.exercises, data.settings?.restSeconds)
    : 0;
  const weekday = WEEKDAYS_DE[new Date().getDay()];
  const preview = plan?.exercises || [];
  const activePlan = (data.plans || []).find((p) => p.id === data.activePlanId);

  const todaySessions = useMemo(
    () => (data.sessions || []).filter((x) => x.date === today),
    [data.sessions, today],
  );
  const secondsToday = todaySessions.reduce((a, x) => a + (x.seconds || 0), 0);
  const kcalToday = estimateKcal(secondsToday, currentWeightKg(data.profile));

  const lockedStats = stats.totalWorkouts === 0;

  /* —— Status copy —— Name nur in „Hi, …“, kein Guten-Tag-Kicker. */
  let eyebrow = null;
  let title = trainedToday
    ? displayName
      ? `Stark, ${displayName}.`
      : "Stark gemacht."
    : restDay
      ? "Regeneration."
      : plan?.name || hiTitle;
  let sub = plan
    ? `${plan.exercises.length} Übungen · ≈ ${duration} Min · ${stats.thisWeekDays}/${weeklyGoal} diese Woche`
    : "Kein Plan für heute — im Plan-Tab zuweisen.";

  if (trainedToday) {
    eyebrow = `${weekday} · Erledigt`;
    sub =
      secondsToday > 0
        ? `${Math.max(1, Math.round(secondsToday / 60))} Min trainiert` +
          (kcalToday ? ` · ≈ ${kcalToday} kcal` : "") +
          ` · ${Math.round(stats.dayVolumes[today] || 0)} kg bewegt`
        : "Training für heute im Kasten.";
  } else if (restDay) {
    eyebrow = `${weekday} · Ruhetag`;
    sub = next
      ? `Nächstes Training: ${next.date.toLocaleDateString("de-DE", { weekday: "long" })} · ${next.plan.name}`
      : "Kein nächster Plan gesetzt.";
  }

  const shareToday = async () => {
    const min =
      secondsToday > 0 ? Math.max(1, Math.round(secondsToday / 60)) : 0;
    const vol = Math.round(stats.dayVolumes[today] || 0);
    const text =
      min > 0
        ? `${APP_NAME} · Heute ${min} Min · ${vol} kg bewegt · Serie ${streak.streak}`
        : `${APP_NAME} · Training erledigt · Serie ${streak.streak}`;
    const result = await sharePayload({ title: APP_NAME, text });
    if (result === "shared") {
      buzz("success", data.settings?.haptics !== false);
    } else if (result === "unsupported") {
      try {
        await navigator.clipboard?.writeText?.(text);
        showToast("In Zwischenablage kopiert", "info");
      } catch {
        showToast("Teilen nicht verfügbar", "error");
      }
    }
  };

  const weekBarMax = Math.max(
    1,
    ...weekDays.map((d) => d.vol),
    weekVol.vol > 0 ? Math.round(weekVol.vol / 7) : 1,
  );

  const weekPeak =
    weekVol.vol >= 1000
      ? `${round1(weekVol.vol / 1000)} t`
      : weekVol.vol > 0
        ? `${weekVol.vol} kg`
        : null;

  /* Tease numbers when locked — widgets look filled, lightly blurred */
  const teaseWeek = lockedStats ? "2/3" : null;
  const teaseStreak = lockedStats ? 5 : null;
  const teaseLevel = lockedStats ? 4 : null;
  const teaseToday = lockedStats ? "6" : null;
  const showWeekDays = lockedStats
    ? weekDays.map((d, i) => ({
        ...d,
        trained: i < 3 && !d.future,
        vol: i < 3 && !d.future ? 1200 + i * 400 : 0,
      }))
    : weekDays;
  const showBarMax = lockedStats
    ? Math.max(1, ...showWeekDays.map((d) => d.vol))
    : weekBarMax;
  const showPeak = lockedStats ? "4.2 t" : weekPeak;

  const startEditName = () => {
    setNameDraft(displayName);
    setEditingName(true);
  };

  const saveName = () => {
    const next = formatDisplayName(nameDraft);
    setEditingName(false);
    if (next === displayName) return;
    update((prev) => ({
      ...prev,
      profile: { ...(prev.profile || {}), displayName: next },
    }));
    if (next) showToast(`Hallo, ${next}`, "info");
  };

  // Greeting line always shows name (editable); plan/status stays in title
  const nameLabel = displayName || "Name tippen";

  /* First-run tutorial — Häkchen nur nach User-Aktion (nicht Default-Pläne) */
  const tut = data.profile?.tutorial || {};
  const openedPlans = !!tut.openedPlans;
  const chosePlan = !!tut.chosePlan;
  const readyToStart = chosePlan && !!plan;
  const tutorialSteps = [
    {
      id: "plans",
      title: "Planliste öffnen",
      body: "Unten auf „Pläne“ tippen.",
      done: openedPlans,
      actionLabel: "Zu den Plänen",
      action: () => goTo("plan"),
    },
    {
      id: "fill",
      title: "Plan wählen oder erstellen",
      body: "Vorhandenen Plan tippen (aktivieren) oder „Neuer Plan“ / Vorlage.",
      done: chosePlan,
      actionLabel: "Plan wählen",
      action: () => goTo("plan"),
    },
    {
      id: "start",
      title: "Erstes Workout starten",
      body: readyToStart
        ? `Bereit: „${plan.name}“ · ${plan.exercises?.length || 0} Übungen.`
        : "Zuerst unter Pläne einen Plan wählen oder neu anlegen.",
      done: false,
      actionLabel: readyToStart ? "Workout starten" : "Plan wählen",
      action: () => (readyToStart ? onStart() : goTo("plan")),
    },
  ];
  const tutorialCurrent =
    tutorialSteps.findIndex((s) => !s.done) === -1
      ? tutorialSteps.length - 1
      : tutorialSteps.findIndex((s) => !s.done);
  const tutorialDoneCount = tutorialSteps.filter((s) => s.done).length;
  const tutorialActive =
    tutorialSteps[tutorialCurrent] || tutorialSteps[0];

  return (
    <div
      className={
        "ig-tabpane ig-home ig-home-dna ig-home-immersive" +
        (titleCompact ? " is-compact" : "")
      }
      aria-label="Heute"
    >
      {/* FitPal welcome row — avatar + greeting + calendar */}
      <header className="ig-home-welcome">
        <div className="ig-home-welcome-left">
          <span className="ig-home-avatar" aria-hidden="true">
            <OzGymMark size={44} variant="glass" title="" />
          </span>
          <div className="ig-home-welcome-text">
            {eyebrow ? (
              <span className="ig-home-welcome-kicker">{eyebrow}</span>
            ) : null}
            {editingName ? (
              <form
                className="ig-home-name-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveName();
                }}
              >
                <input
                  className="ig-home-name-input"
                  type="text"
                  maxLength={32}
                  autoFocus
                  autoComplete="given-name"
                  placeholder="Dein Name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  aria-label="Anzeigename"
                />
              </form>
            ) : (
              <button
                type="button"
                className="ig-home-name-btn"
                onClick={startEditName}
                aria-label="Name ändern"
              >
                <h1 className="ig-home-welcome-title">
                  {displayName ? (
                    <>
                      Hi, <span className="ig-home-name-value">{displayName}</span>
                    </>
                  ) : (
                    <span className="ig-home-name-placeholder">{nameLabel}</span>
                  )}
                </h1>
                <Pencil size={14} className="ig-home-name-pencil" aria-hidden="true" />
              </button>
            )}
            {/* Status / plan line under name */}
            <p className="ig-home-welcome-sub">
              {title !== hiTitle && title !== timeHello && !trainedToday && !restDay
                ? `${title} · ${sub}`
                : sub}
            </p>
          </div>
        </div>
        <div className="ig-home-welcome-actions">
          <button
            type="button"
            className="ig-home-bell"
            onClick={() => goTo("profile")}
            aria-label="Profil & Einstellungen"
          >
            <span className="ig-home-bell-letter mono" aria-hidden="true">
              {(displayName || "O").slice(0, 1).toUpperCase()}
            </span>
          </button>
          <button
            type="button"
            className="ig-home-bell"
            onClick={() => setShowCal((s) => !s)}
            aria-label="Trainingskalender"
            aria-expanded={showCal}
          >
            <Bell size={18} aria-hidden="true" />
            {streak.streak > 0 ? (
              <span className="ig-home-bell-dot" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </header>

      {/* Schnell-Scan Essen — immer greifbar */}
      {typeof onScanFood === "function" ? (
        <button
          type="button"
          className="ig-home-scan-food"
          onClick={onScanFood}
        >
          <ScanBarcode size={18} aria-hidden="true" />
          <span>Essen scannen</span>
        </button>
      ) : null}

      {/* First-run: compact tutorial oben, Stats-Teaser darunter */}
      {lockedStats ? (
        <section
          className="ig-home-tutorial is-compact"
          aria-label="Kurzanleitung"
        >
          <header className="ig-home-tutorial-head">
            <div className="ig-home-tutorial-head-row">
              <span className="ig-home-tutorial-kicker mono">
                Kurzanleitung · {tutorialCurrent + 1}/{tutorialSteps.length}
              </span>
              <span className="ig-home-tutorial-progress-lbl mono">
                {tutorialDoneCount} erledigt
              </span>
            </div>
            <h2 className="ig-home-tutorial-title">
              So startest du dein erstes Workout
            </h2>
            <div
              className="ig-home-tutorial-progress"
              role="progressbar"
              aria-valuenow={tutorialDoneCount}
              aria-valuemin={0}
              aria-valuemax={tutorialSteps.length}
              aria-label={`${tutorialDoneCount} von ${tutorialSteps.length} Schritten erledigt`}
            >
              <div
                className="ig-home-tutorial-progress-fill"
                style={{
                  width: `${(tutorialDoneCount / tutorialSteps.length) * 100}%`,
                }}
              />
            </div>
          </header>

          <ol className="ig-home-tutorial-steps">
            {tutorialSteps.map((step, i) => {
              const isCurrent = i === tutorialCurrent;
              const cls =
                "ig-home-tutorial-step" +
                (step.done ? " is-done" : "") +
                (isCurrent ? " is-current" : "");
              return (
                <li key={step.id} className={cls}>
                  <button
                    type="button"
                    className="ig-home-tutorial-step-btn"
                    onClick={step.action}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className="ig-home-tutorial-num" aria-hidden="true">
                      {step.done ? "✓" : i + 1}
                    </span>
                    <span className="ig-home-tutorial-step-body">
                      <strong>
                        {step.title}
                        {isCurrent ? (
                          <span className="ig-home-tutorial-now"> Jetzt</span>
                        ) : null}
                      </strong>
                      {isCurrent || !step.done ? (
                        <span className="ig-home-tutorial-step-text">
                          {step.body}
                        </span>
                      ) : null}
                    </span>
                    {isCurrent ? (
                      <ChevronRight
                        size={16}
                        className="ig-home-tutorial-chev"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            className="ig-btn-primary wide xl ig-home-cta ig-home-cta-glow"
            onClick={tutorialActive.action}
          >
            {tutorialActive.id === "start" && readyToStart ? (
              <Play size={20} aria-hidden="true" />
            ) : (
              <Dumbbell size={20} aria-hidden="true" />
            )}
            {tutorialActive.actionLabel}
          </button>
        </section>
      ) : (
        <>
          {!restDay && !trainedToday && plan && (
            <button
              type="button"
              className="ig-btn-primary wide xl ig-home-cta ig-home-cta-glow"
              onClick={() => onStart()}
            >
              <Play size={20} aria-hidden="true" /> Workout starten
            </button>
          )}
          {restDay && plan && !trainedToday && (
            <button
              type="button"
              className="ig-btn-primary wide ghosted ig-home-cta"
              onClick={() => onStart()}
            >
              <Play size={16} aria-hidden="true" /> Trotzdem {plan.name} starten
            </button>
          )}
          {!plan && !trainedToday && (
            <button
              type="button"
              className="ig-btn-primary wide ghosted ig-home-cta"
              onClick={() => goTo("plan")}
            >
              Plan öffnen
            </button>
          )}
          {trainedToday && (
            <div className="ig-home-cta-row">
              <button
                type="button"
                className="ig-btn-primary wide ghosted ig-home-share"
                onClick={shareToday}
              >
                <Share2 size={18} aria-hidden="true" /> Teilen
              </button>
              <button
                type="button"
                className="ig-btn-primary wide ghosted"
                onClick={() => goTo("progress")}
              >
                Verlauf
              </button>
            </div>
          )}
        </>
      )}

      {/* Stats — nach erstem Workout freigeschaltet; davor Teaser mit Overlay */}
      <div
        className={
          "ig-home-stats-stack" + (lockedStats ? " is-locked" : "")
        }
      >
        {lockedStats && (
          <div className="ig-home-lock-overlay" aria-hidden="true">
            <span className="ig-home-lock-msg">
              Wird nach deinem ersten Workout freigeschaltet
            </span>
          </div>
        )}
        <div
          className="ig-home-stats-inner"
          inert={lockedStats ? true : undefined}
          aria-hidden={lockedStats || undefined}
        >

      {/* Summary Activity — 2 mini cards */}
      <section className="ig-home-summary" aria-label="Übersicht">
        <div className="ig-home-summary-head">
          <h2 className="ig-home-section-title">Zusammenfassung</h2>
          <button
            type="button"
            className="ig-home-see-all"
            onClick={() => goTo("progress")}
          >
            Alles
          </button>
        </div>
        <div className="ig-home-summary-grid">
          <button
            type="button"
            className="ig-card ig-home-mini"
            onClick={() => goTo("progress")}
          >
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Target size={16} />
            </span>
            <span className="ig-home-mini-kicker">Diese Woche</span>
            <span className="ig-home-mini-num mono">
              {teaseWeek
                ? teaseWeek
                : stats.thisWeekDays >= weeklyGoal
                  ? "Ziel ✓"
                  : `${stats.thisWeekDays}/${weeklyGoal}`}
            </span>
            <span className="ig-home-mini-meta mono">
              {lockedStats
                ? "3.1 t Volumen"
                : weekVol.vol >= 1000
                  ? `${round1(weekVol.vol / 1000)} t`
                  : `${weekVol.vol} kg`}{" "}
              {!lockedStats && "Volumen"}
            </span>
          </button>
          <button
            type="button"
            className="ig-card ig-home-mini"
            onClick={() => setShowCal((s) => !s)}
            aria-expanded={showCal}
          >
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Flame size={16} />
            </span>
            <span className="ig-home-mini-kicker">Serie</span>
            <span className="ig-home-mini-num mono">
              <CountUp value={teaseStreak ?? streak.streak} />
              <span className="ig-home-mini-unit"> Tage</span>
            </span>
            <span className="ig-home-mini-meta">
              Best {lockedStats ? 12 : streak.bestStreak || streak.streak}
            </span>
          </button>
          <button
            type="button"
            className="ig-card ig-home-mini"
            onClick={() => goTo("progress")}
          >
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Zap size={16} />
            </span>
            <span className="ig-home-mini-kicker">Level</span>
            <span className="ig-home-mini-num mono">
              <CountUp value={teaseLevel ?? stats.level} />
            </span>
            <span className="ig-home-mini-meta mono">
              {lockedStats ? "62% XP" : `${Math.round((stats.levelPct || 0) * 100)}% XP`}
            </span>
          </button>
          <button
            type="button"
            className="ig-card ig-home-mini"
            onClick={() => (plan ? onStart() : goTo("plan"))}
          >
            <span className="ig-home-mini-icon" aria-hidden="true">
              <Dumbbell size={16} />
            </span>
            <span className="ig-home-mini-kicker">Heute</span>
            <span className="ig-home-mini-num mono">
              {teaseToday
                ? teaseToday
                : trainedToday
                  ? "✓"
                  : plan
                    ? `${preview.length}`
                    : "—"}
            </span>
            <span className="ig-home-mini-meta">
              {lockedStats
                ? "Üb. · ≈ 45 Min"
                : trainedToday
                  ? "Erledigt"
                  : plan
                    ? `Üb. · ≈ ${duration} Min`
                    : "Kein Plan"}
            </span>
          </button>
        </div>
      </section>

      {/* Overall Status — FitPal line/area chart */}
      <section className="ig-card ig-home-status" aria-label="Wochen-Status">
        <div className="ig-home-summary-head">
          <h2 className="ig-home-section-title">Gesamtstatus</h2>
          <button
            type="button"
            className="ig-home-see-all"
            onClick={() => goTo("progress")}
          >
            Alles
          </button>
        </div>
        <div className="ig-home-status-meta">
          <span className="ig-home-status-label">Diese Woche</span>
          <span className="ig-home-status-value mono">
            {showPeak || "0 kg"}
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        </div>
        <WeekStatusChart days={showWeekDays} peakLabel={showPeak} />
        <div className="ig-home-level" aria-label="Level-Fortschritt">
          <div className="ig-level-track sm">
            <div
              className="ig-level-fill"
              style={{
                width: `${lockedStats ? 62 : Math.round((stats.levelPct || 0) * 100)}%`,
              }}
            />
          </div>
          <span className="ig-home-level-meta mono">
            Lvl {lockedStats ? 4 : stats.level} ·{" "}
            {lockedStats ? 62 : Math.round((stats.levelPct || 0) * 100)}%
          </span>
        </div>
      </section>

      {/* Week strip — calendar DNA (day pills + barlets) */}
      <section className="ig-card ig-home-week" aria-label="Diese Woche">
        <div className="ig-home-week-head">
          <span className="ig-field-label">Wochen-Tage</span>
          <span className="ig-home-week-meta mono">
            {lockedStats ? `2/${weeklyGoal}` : `${stats.thisWeekDays}/${weeklyGoal}`} Ziel
          </span>
        </div>
        <div className="ig-home-week-strip" role="list">
          {showWeekDays.map((d) => (
            <div
              key={d.key}
              role="listitem"
              className={
                "ig-home-week-day" +
                (d.trained ? " is-done" : "") +
                (d.isToday ? " is-today" : "") +
                (d.future ? " is-future" : "")
              }
              aria-label={`${d.label} ${d.dayNum}${d.trained ? ", trainiert" : ""}${d.isToday ? ", heute" : ""}`}
            >
              <span className="ig-home-week-lbl">{d.label}</span>
              <span className="ig-home-week-num mono">{d.dayNum}</span>
              <span
                className="ig-home-week-barlet"
                style={{
                  height: d.vol
                    ? `${Math.max(18, Math.round((d.vol / showBarMax) * 36))}px`
                    : "4px",
                }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
        <div className="ig-home-week-bar" aria-hidden="true">
          <div
            className="ig-home-week-fill"
            style={{
              width: `${Math.min(
                100,
                ((lockedStats ? 2 : stats.thisWeekDays) / weeklyGoal) * 100,
              )}%`,
            }}
          />
        </div>
      </section>

      {/* Missed week nudge */}
      {adherence && adherence.missed > 0 && !trainedToday && (
        <button
          type="button"
          className="ig-card ig-nudge ig-nudge-btn"
          onClick={() => (plan ? onStart() : goTo("plan"))}
        >
          <span className="ig-nudge-icon" aria-hidden="true">
            <Target size={16} />
          </span>
          <span className="ig-nudge-text">
            {adherence.missed}{" "}
            {adherence.missed === 1 ? "Einheit" : "Einheiten"} offen diese Woche.
            {catchUp
              ? catchUp.key === todayKey()
                ? " Heute nachholen."
                : ` ${catchUp.label}.`
              : ""}
          </span>
          <Play size={16} className="ig-nudge-chev" aria-hidden="true" />
        </button>
      )}

      {/* Today's full plan list (not just 3) */}
      {plan && !trainedToday && !restDay && preview.length > 0 && (
        <button
          type="button"
          className="ig-card ig-today-card ig-today-card-btn"
          onClick={() => onStart()}
        >
          <div className="ig-today-card-head">
            <span className="ig-field-label">Heute im Plan</span>
            <span className="ig-today-card-meta mono">
              {preview.length} Üb. · ≈ {duration} Min
            </span>
          </div>
          <ol className="ig-today-plan">
            {preview.map((it, i) => (
              <li key={it.exerciseId + i}>
                <span className="ig-today-plan-num mono">{i + 1}</span>
                <span className="ig-today-plan-name">
                  {planByIdName[it.exerciseId] || "?"}
                </span>
                <span className="ig-today-plan-meta mono">
                  {it.sets}×{it.reps}
                </span>
              </li>
            ))}
          </ol>
          <span className="ig-today-card-go">
            Tippen zum Starten <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>
      )}

      {/* Done today: summary card */}
      {trainedToday && (
        <div className="ig-card ig-home-done-card">
          <div className="ig-field-label">Heutige Session</div>
          <div className="ig-home-done-grid">
            <div>
              <span className="ig-home-done-num mono">
                {secondsToday > 0
                  ? Math.max(1, Math.round(secondsToday / 60))
                  : "—"}
              </span>
              <span className="ig-home-done-lbl">Min</span>
            </div>
            <div>
              <span className="ig-home-done-num mono">
                {Math.round(stats.dayVolumes[today] || 0)}
              </span>
              <span className="ig-home-done-lbl">kg</span>
            </div>
            <div>
              <span className="ig-home-done-num mono">
                {kcalToday ?? "—"}
              </span>
              <span className="ig-home-done-lbl">kcal ≈</span>
            </div>
          </div>
        </div>
      )}

      {/* Rest day: next session card */}
      {restDay && next && (
        <button
          type="button"
          className="ig-card ig-home-next-card"
          onClick={() => goTo("plan")}
        >
          <CalendarDays size={18} className="ig-dash-icon" aria-hidden="true" />
          <div className="ig-home-next-body">
            <span className="ig-field-label">Als Nächstes</span>
            <strong>
              {next.date.toLocaleDateString("de-DE", { weekday: "long" })} ·{" "}
              {next.plan.name}
            </strong>
          </div>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      {/* Last session + PR cards */}
      <div className="ig-home-secondary-stack">
        {lastWorkout && (
          <button
            type="button"
            className="ig-home-secondary ig-home-secondary-card"
            onClick={() => goTo("progress")}
          >
            <span>
              <span className="ig-field-label">Zuletzt</span>
              <span className="ig-home-secondary-line">
                {fmtDate(lastWorkout.date)}
                <span className="mono">
                  {" "}
                  · {lastWorkout.exercises} Üb. ·{" "}
                  {lastWorkout.volume >= 1000
                    ? `${round1(lastWorkout.volume / 1000)}t`
                    : `${lastWorkout.volume} kg`}
                </span>
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
        {record && (
          <button
            type="button"
            className="ig-home-secondary ig-home-secondary-card"
            onClick={() => goTo("progress")}
          >
            <span>
              <span className="ig-field-label">
                <Trophy size={12} aria-hidden="true" /> Rekord
              </span>
              <span className="ig-home-secondary-line">
                {record.exercise}{" "}
                <span className="mono">{record.weight} kg</span>
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
        {activePlan && (
          <button
            type="button"
            className="ig-home-secondary ig-home-secondary-card"
            onClick={() => goTo("plan")}
          >
            <span>
              <span className="ig-field-label">Aktiver Plan</span>
              <span className="ig-home-secondary-line">
                {activePlan.icon ? (
                  <span className="ig-home-secondary-icon" aria-hidden="true">
                    {activePlan.icon}
                  </span>
                ) : null}
                <strong className="ig-home-secondary-name">{activePlan.name}</strong>
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

        </div>
      </div>

      {showCal && !lockedStats && (
        <StreakCalendar
          logs={data.logs}
          today={today}
          onClose={() => setShowCal(false)}
        />
      )}
    </div>
  );
}
