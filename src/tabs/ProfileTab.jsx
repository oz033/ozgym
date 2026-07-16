/* Profil: Identität + Körper + Trainingsziel + App-Settings */

import React, { useState, useEffect, useRef } from "react";
import {
  Palette,
  ChevronRight,
  Zap,
  Award,
  Download,
  Upload,
} from "lucide-react";
import ThemeStudio from "../components/ThemeStudio.jsx";
import { OzGymMark } from "../components/brand.jsx";
import { ToggleRow, showToast, showConfirm } from "../components/ui.jsx";
import { todayISO, round1, playSound, buzz, calcStats } from "../lib/utils.js";
import { hydrate } from "../lib/migrate.js";
import { BADGE_DEFS, GOALS, LEVELS } from "../lib/constants.js";

export default function ProfileTab({ data, update, goTo }) {
  const profile = data?.profile || {};
  const settings = data?.settings || {};
  const logs = Array.isArray(data?.logs) ? data.logs : [];

  const [height, setHeight] = useState(profile.heightCm || "");
  const [weight, setWeight] = useState(profile.weightKg || "");
  const [showStudio, setShowStudio] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      update((prev) => {
        const prevProfile = prev?.profile || {};
        const w = Number(weight);
        let weightLog = prevProfile.weightLog || [];
        if (w > 0) {
          const today = todayISO();
          const rest = weightLog.filter((e) => e.date !== today);
          weightLog = [...rest, { date: today, kg: w }].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
        }
        return {
          ...prev,
          profile: { ...prevProfile, heightCm: height, weightKg: weight, weightLog },
        };
      });
    }, 500);
    return () => clearTimeout(t);
  }, [height, weight]); // eslint-disable-line

  const patchProfile = (fields) =>
    update((prev) => ({
      ...prev,
      profile: { ...(prev?.profile || {}), ...fields },
    }));
  const patchSettings = (fields) =>
    update((prev) => ({
      ...prev,
      settings: { ...(prev?.settings || {}), ...fields },
    }));

  const gender = profile.gender;
  const h = Number(height) / 100;
  const w = Number(weight);
  const bmi = h > 0 && w > 0 ? w / (h * h) : null;
  const stats = calcStats(logs, settings.weeklyGoal || 3);
  const earnedBadges = BADGE_DEFS.filter((b) => {
    try {
      return b.check(stats);
    } catch {
      return false;
    }
  }).length;

  let category = null,
    color = null;
  if (bmi != null) {
    if (bmi < 18.5) {
      category = "Untergewicht";
      color = "var(--info)";
    } else if (bmi < 25) {
      category = "Normalgewicht";
      color = "var(--success)";
    } else if (bmi < 30) {
      category = "Übergewicht";
      color = "var(--warning)";
    } else {
      category = "Adipositas";
      color = "var(--danger)";
    }
  }

  const ranges = [
    { label: "< 18,5", name: "Untergewicht", color: "var(--info)" },
    { label: "18,5 – 24,9", name: "Normalgewicht", color: "var(--success)" },
    { label: "25 – 29,9", name: "Übergewicht", color: "var(--warning)" },
    { label: "≥ 30", name: "Adipositas", color: "var(--danger)" },
  ];

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ozgym-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Backup-Erinnerung (App-Shell) zurücksetzen
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, lastBackup: todayISO() },
    }));
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object") throw new Error("invalid");
        // Accept full app state or older shapes; hydrate migrates + fills defaults
        if (!Array.isArray(parsed.logs) && !parsed.profile && !parsed.plans) {
          throw new Error("invalid");
        }
        const ok = await showConfirm({
          title: "Backup einspielen?",
          message: "Das ersetzt deine aktuellen Daten auf diesem Gerät.",
          confirmLabel: "Einspielen",
          destructive: true,
        });
        if (ok) {
          update(() => hydrate(parsed));
          playSound("pr", settings.sound !== false);
          buzz(40, settings.haptics !== false);
        }
      } catch {
        showToast("Diese Datei ist kein gültiges OZGYM-Backup.");
      }
    };
    reader.readAsText(file);
  };

  const goalList =
    gender === "f" ? GOALS.f : gender === "m" ? GOALS.m : [...GOALS.m, ...GOALS.f];

  return (
    <div className="ig-tabpane">
      {/* Identität: Glas-Logo + OZGYM (kein Trainingsziel-Text) */}
      <div className="ig-identity-card">
        <div className="ig-identity-head">
          <span className="ig-identity-avatar ig-brand-mark">
            <OzGymMark size={44} variant="glass" title="OZGYM" />
          </span>
          <div className="ig-identity-text">
            <span className="ig-identity-tag">
              {gender === "f" ? "Frauen-Modus" : gender === "m" ? "Männer-Modus" : "Profil"}
            </span>
            <h2>OZGYM</h2>
            <span className="ig-identity-sub">by OZ</span>
          </div>
        </div>
        <div className="ig-identity-level">
          <span className="ig-identity-level-label">
            <Zap size={12} /> Level {stats.level}
          </span>
          <div className="ig-level-track sm">
            <div className="ig-level-fill" style={{ width: `${stats.levelPct * 100}%` }} />
          </div>
        </div>
        <button className="ig-identity-badges" onClick={() => goTo && goTo("progress")}>
          <Award size={14} />
          <span>{earnedBadges} von {BADGE_DEFS.length} Abzeichen freigeschaltet</span>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Persönliches: Modus + Alter */}
      <div className="ig-card">
        <div className="ig-field-label">Persönliches</div>
        <div className="ig-set-inputs two">
          <div className="ig-num-field">
            <span>Modus</span>
            <div className="ig-mode-toggle">
              <button
                className={"ig-chip" + (gender === "f" ? " active" : "")}
                onClick={() => patchProfile({ gender: "f" })}
              >
                ♀ Frau
              </button>
              <button
                className={"ig-chip" + (gender === "m" ? " active" : "")}
                onClick={() => patchProfile({ gender: "m" })}
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
              value={profile.age || ""}
              onChange={(e) => patchProfile({ age: e.target.value })}
              placeholder="25"
            />
          </label>
        </div>
      </div>

      {/* Darstellung */}
      <div className="ig-card">
        <div className="ig-field-label">Darstellung</div>
        <button className="ig-studio-open" onClick={() => setShowStudio(true)}>
          <span className="ig-studio-dot" />
          <span className="ig-studio-text">
            <span className="ig-studio-title">
              <Palette size={14} /> Theme Studio
            </span>
            <span className="ig-studio-sub">
              Farben, Ecken, Glow, Glas, Schrift — bau dein eigenes Theme
            </span>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Trainingsziel — steuert Wochen-Ziel & Smart-Plan */}
      <div className="ig-card">
        <div className="ig-field-label">Trainingsziel</div>
        <div className="ig-session-duration-head">
          <span className="ig-field-label" style={{ margin: 0 }}>
            Einheiten pro Woche
          </span>
          <span className="ig-session-duration-est mono">
            {settings.weeklyGoal || 3}×
          </span>
        </div>
        <div
          className="ig-mode-toggle ig-session-duration-chips"
          role="group"
          aria-label="Wochenziel"
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={
                "ig-chip sm" + ((settings.weeklyGoal || 3) === n ? " active" : "")
              }
              onClick={() => {
                patchSettings({ weeklyGoal: n });
                patchProfile({ daysPerWeek: n });
                playSound("tap", settings.sound !== false);
              }}
            >
              {n}×
            </button>
          ))}
        </div>

        <div className="ig-field-label" style={{ marginTop: 14 }}>
          Level
        </div>
        <div
          className="ig-mode-toggle ig-session-duration-chips"
          role="group"
          aria-label="Trainingslevel"
        >
          {LEVELS.map((lv) => (
            <button
              key={lv.id}
              type="button"
              className={
                "ig-chip sm" + (profile.level === lv.id ? " active" : "")
              }
              onClick={() => {
                patchProfile({ level: lv.id });
                playSound("tap", settings.sound !== false);
              }}
              title={lv.desc}
            >
              {lv.name}
            </button>
          ))}
        </div>

        <div className="ig-field-label" style={{ marginTop: 14 }}>
          Fokus
        </div>
        <p className="ig-plan-text" style={{ margin: "0 0 8px" }}>
          Für Smart-Pläne unter Pläne → Smart. Ohne Fokus bleibt die Clever-Fit-Vorlage.
        </p>
        <div className="ig-goal-grid" role="group" aria-label="Trainingsfokus">
          {goalList.map((g) => (
            <button
              key={g.id}
              type="button"
              className={"ig-goal-chip" + (profile.goal === g.id ? " active" : "")}
              onClick={() => {
                patchProfile({ goal: g.id });
                playSound("tap", settings.sound !== false);
              }}
            >
              <span className="ig-goal-chip-icon" aria-hidden="true">
                {g.icon}
              </span>
              <span className="ig-goal-chip-name">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Einstellungen */}
      <div className="ig-card">
        <div className="ig-field-label">Einstellungen</div>
        <div className="ig-rest-setting">
          <div className="ig-session-duration-head">
            <span className="ig-field-label" style={{ margin: 0 }}>
              Standard-Pause
            </span>
            <span className="ig-session-duration-est mono">
              {settings.restSeconds ?? 90}s zwischen Sätzen
            </span>
          </div>
          <p className="ig-plan-text" style={{ margin: 0 }}>
            Gilt für neue Übungen und wenn im Plan keine eigene Pause steht.
            Pro Übung im Plan-Editor überschreibbar.
          </p>
          <div className="ig-mode-toggle ig-session-duration-chips" role="group" aria-label="Standard-Pause">
            {[60, 90, 120, 180].map((s) => (
              <button
                key={s}
                type="button"
                className={
                  "ig-chip sm" +
                  ((settings.restSeconds ?? 90) === s ? " active" : "")
                }
                onClick={() => patchSettings({ restSeconds: s })}
              >
                {s < 60 ? `${s}s` : s % 60 === 0 ? `${s / 60} Min` : `${s}s`}
              </button>
            ))}
          </div>
        </div>
        <ToggleRow
          checked={settings.sound !== false}
          onChange={(v) => {
            patchSettings({ sound: v });
            if (v) playSound("tap");
          }}
        >
          Sound-Effekte
        </ToggleRow>
        <ToggleRow
          checked={settings.haptics !== false}
          onChange={(v) => {
            patchSettings({ haptics: v });
            if (v) buzz(30);
          }}
        >
          Haptisches Feedback (Vibration)
        </ToggleRow>
        <ToggleRow
          checked={settings.warmup !== false}
          onChange={(v) => patchSettings({ warmup: v })}
        >
          Warm-up vor dem Training
        </ToggleRow>
        <ToggleRow
          checked={settings.cooldown !== false}
          onChange={(v) => patchSettings({ cooldown: v })}
        >
          Cool-down nach dem Training
        </ToggleRow>
      </div>

      {/* Körper: Eingabe + BMI + WHO-Referenz */}
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

        {bmi == null ? (
          <p className="ig-empty">Trag Größe und Gewicht ein, um deinen BMI zu berechnen.</p>
        ) : (
          <div className="ig-bmi-result">
            <span className="ig-num" style={{ color }}>{round1(bmi)}</span>
            <span className="ig-bmi-cat" style={{ color }}>{category}</span>
            <div className="ig-bmi-bar">
              {ranges.map((r) => (
                <div
                  key={r.name}
                  className="ig-bmi-seg"
                  style={{ background: r.color, opacity: r.name === category ? 1 : 0.35 }}
                />
              ))}
            </div>
          </div>
        )}

        <ul className="ig-range-list compact">
          {ranges.map((r) => (
            <li key={r.name} className="ig-range-row">
              <span className="ig-range-dot" style={{ background: r.color }} />
              <span>{r.name}</span>
              <span className="mono ig-range-val">{r.label}</span>
            </li>
          ))}
        </ul>

        <p className="ig-plan-text">
          Deinen Gewichtsverlauf über Zeit findest du im Verlauf-Tab.
        </p>
      </div>

      {/* Daten: ehrlich nur das, was eine reine Client-App leisten kann — lokales Backup statt vorgetäuschter Cloud-Sync */}
      <div className="ig-card">
        <div className="ig-field-label">Daten</div>
        <p className="ig-plan-text">
          OZGYM speichert alles nur auf diesem Gerät. Exportiere regelmäßig ein Backup,
          um beim Gerätewechsel nichts zu verlieren.
        </p>
        <div className="ig-plan-add-row ig-profile-backup-row">
          <button type="button" className="ig-btn-primary wide ghosted" onClick={exportData}>
            <Download size={15} /> Exportieren
          </button>
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} /> Importieren
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importData(file);
            e.target.value = "";
          }}
        />
      </div>

      {showStudio && data && (
        <ThemeStudio data={data} update={update} onClose={() => setShowStudio(false)} />
      )}
    </div>
  );
}
