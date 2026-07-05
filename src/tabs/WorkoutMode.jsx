/* Fullscreen Workout-Modus mit Pausen-Timer, Coach-Feedback & Abschluss-Konfetti */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
} from "lucide-react";
import { CountUp, BodySilhouette, RestRing, Confetti } from "../components/ui.jsx";
import { EclipseMark } from "../components/brand.jsx";
import {
  todayISO,
  calcStats,
  playSound,
  buzz,
  round1,
} from "../lib/utils.js";
import { ZONE_LABEL, MOTIVATION_POOL } from "../lib/constants.js";
import { smartSuggest } from "../lib/planGenerator.js";

export default function WorkoutMode({ data, update, queue, onExit, onFinish }) {
  const today = todayISO();
  const soundOn = data.settings?.sound !== false;
  const hapticsOn = data.settings?.haptics !== false;
  const restSeconds = data.settings?.restSeconds || 90;
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
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef(null);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [suggestion, setSuggestion] = useState(null);

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

  const item = queue[idx] || null;
  const exercise = item?.name || "";
  const targetSets = item?.sets || 3;
  const meta = item?.entry || {};
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
  }, [exercise]); // eslint-disable-line

  // Nur Infos, die nirgendwo sonst auf dem Screen stehen: Fortschrittspunkte
  // zeigen bereits "Sätze übrig", Mini-Stats zeigen bereits den PR — beides
  // hier nochmal zu behaupten wäre Redundanz statt Mehrwert.
  const milestone = useMemo(() => {
    if (suggestion?.bump) {
      return `Smart Coach: Zeit für ${suggestion.weight} kg — du hast das Gewicht 2× gemeistert!`;
    }
    const current = Number(weight) || 0;
    if (current > 0) {
      const stepKg = current < 100 ? 10 : 25;
      const next = Math.ceil((current + 0.01) / stepKg) * stepKg;
      if (next !== bestBefore) return `Noch ${round1(next - current)} kg bis ${next} kg`;
    }
    return null;
  }, [bestBefore, weight, suggestion]);

  const [feedback, setFeedback] = useState(null);

  const step = (setter, current, delta, min) =>
    setter(round1(Math.max(min, (Number(current) || 0) + delta)));

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
      const r0 = item?.rest ?? restSeconds;
      setRestTotal(r0);
      setRestLeft(r0);
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
    if (item && !itemDone(item)) return null;
    return (
      queue.find((it, i) => i > idx && !itemDone(it)) ||
      queue.find((it) => !itemDone(it)) ||
      null
    );
  }, [queue, idx, item, itemDone]);

  const totalTarget = queue.reduce((n, it) => n + it.sets, 0);
  const totalSetsDone = queue.reduce(
    (n, it) => n + Math.min(setsFor(it.name), it.sets),
    0,
  );
  const totalPct = totalTarget ? totalSetsDone / totalTarget : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

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
          const open = queue.filter((it) => !itemDone(it)).length;
          const next =
            queue.find((it, i) => i > idx && !itemDone(it)) ||
            queue.find((it, i) => i !== idx && !itemDone(it));
          if (open <= 1 && item && !itemDone(item))
            return "Letzte Übung — dann hast du's geschafft!";
          if (!next) return "Gleich geschafft!";
          return (
            <>
              Danach: <strong>{next.name}</strong>
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
        {queue.map((it, i) => {
          const e = it.name;
          const m = it.entry || {};
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
                <div className="ig-wo-final-banner">Letzte Übung — jetzt alles geben!</div>
              )}
              <div className="ig-wo-card-top">
                <div className="ig-hero-sil">
                  <BodySilhouette zone={m?.zone} zone2={m?.zone2} pulseKey={e + active} size={150} />
                  <span className="ig-hero-mid-label">
                    {[ZONE_LABEL[m?.zone], ZONE_LABEL[m?.zone2]]
                      .filter(Boolean)
                      .join(" + ") || "Eigene Übung"}
                  </span>
                </div>
                <div className="ig-wo-card-info">
                  <h3 className="ig-wo-ex-name">{e}</h3>
                  <div className="ig-plan-badges">
                    {m?.nr && <span className="ig-badge">Gerät {m.nr}</span>}
                    <span className="ig-badge">{it.sets} × {it.reps} Wdh.</span>
                    {it.weight != null && (
                      <span className="ig-badge dim">Ziel {it.weight} kg</span>
                    )}
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
              {active && m?.hint && <p className="ig-wo-hint">{m.hint}</p>}
              {active && it.note && (
                <p className="ig-wo-hint note">{it.note}</p>
              )}
              {active && milestone && (
                <span
                  className={"ig-wo-milestone" + (suggestion?.bump ? " smart" : "")}
                  key={milestone}
                >
                  {suggestion?.bump && <TrendingUp size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />}
                  {milestone}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="ig-wo-bottom">
        <div className="ig-wo-sets">
          {Array.from({ length: targetSets }, (_, i) => (
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
          disabled={doneCount >= targetSets}
          onClick={completeSet}
        >
          <Check size={20} />
          {doneCount >= targetSets
            ? "Übung fertig"
            : `Satz ${doneCount + 1} von ${targetSets} abschließen`}
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
