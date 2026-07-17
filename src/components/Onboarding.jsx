/* First-run: Name · Geschlecht · Körper · App-Name — FitPal-style lime CTAs */

import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { OzGymMark } from "./brand.jsx";
import { APP_NAME } from "../lib/constants.js";
import { sanitizeAppName } from "../lib/migrate.js";
import { todayISO } from "../lib/utils.js";

const STEPS = ["welcome", "you", "body", "app"];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState(null); // "m" | "f" | null
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [appName, setAppName] = useState(APP_NAME);

  const id = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const nameOk = displayName.trim().length >= 1;
  const genderOk = gender === "m" || gender === "f";
  const canNext = useMemo(() => {
    if (id === "welcome") return true;
    if (id === "you") return nameOk && genderOk;
    if (id === "body") return true; // optional fields
    if (id === "app") return sanitizeAppName(appName).length >= 1;
    return false;
  }, [id, nameOk, genderOk, appName]);

  const finish = () => {
    const w = Number(weightKg);
    let weightLog = [];
    if (w > 0) {
      weightLog = [{ date: todayISO(), kg: w }];
    }
    onComplete({
      profile: {
        displayName: displayName.trim().slice(0, 32),
        gender,
        age: age === "" ? "" : String(age),
        heightCm: heightCm === "" ? "" : String(heightCm),
        weightKg: weightKg === "" ? "" : String(weightKg),
        weightLog,
        onboarded: true,
      },
      settings: {
        appName: sanitizeAppName(appName),
      },
    });
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="ig-onb" role="dialog" aria-modal="true" aria-label="Einrichtung">
      <div className="ig-onb-progress" aria-hidden="true">
        <div className="ig-onb-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ig-onb-body">
        {id === "welcome" && (
          <div className="ig-onb-panel ig-onb-welcome">
            <span className="ig-onb-logo" aria-hidden="true">
              <OzGymMark size={72} variant="glass" title="" />
            </span>
            <h1 className="ig-onb-title">Dein Gym-Tracker</h1>
            <p className="ig-onb-sub">
              Kurz einrichten — Name, Körperdaten und wie die App heißen soll.
              Alles bleibt nur auf diesem Gerät.
            </p>
          </div>
        )}

        {id === "you" && (
          <div className="ig-onb-panel">
            <p className="ig-onb-kicker mono">Schritt 1 · Du</p>
            <h1 className="ig-onb-title">Wie heißt du?</h1>
            <p className="ig-onb-sub">Für die Begrüßung auf dem Home-Screen.</p>
            <label className="ig-num-field ig-onb-field">
              <span>Name</span>
              <input
                className="ig-input"
                type="text"
                autoComplete="given-name"
                autoFocus
                maxLength={32}
                placeholder="z. B. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <div className="ig-field-label" style={{ marginTop: 16 }}>
              Geschlecht
            </div>
            <p className="ig-onb-hint">
              Steuert Modus-Farben und passende Plan-Vorschläge.
            </p>
            <div className="ig-mode-toggle ig-onb-gender-chips" role="group" aria-label="Geschlecht">
              <button
                type="button"
                className={"ig-chip" + (gender === "m" ? " active" : "")}
                onClick={() => setGender("m")}
              >
                ♂ Männlich
              </button>
              <button
                type="button"
                className={"ig-chip" + (gender === "f" ? " active" : "")}
                onClick={() => setGender("f")}
              >
                ♀ Weiblich
              </button>
            </div>
            <label className="ig-num-field ig-onb-field" style={{ marginTop: 14 }}>
              <span>Alter (optional)</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="numeric"
                min={10}
                max={100}
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
          </div>
        )}

        {id === "body" && (
          <div className="ig-onb-panel">
            <p className="ig-onb-kicker mono">Schritt 2 · Körper</p>
            <h1 className="ig-onb-title">Größe & Gewicht</h1>
            <p className="ig-onb-sub">
              Optional — für BMI, kcal-Schätzung und Verlauf. Später im Profil änderbar.
            </p>
            <div className="ig-set-inputs two">
              <label className="ig-num-field">
                <span>Größe (cm)</span>
                <input
                  className="ig-input mono"
                  type="number"
                  inputMode="numeric"
                  min={100}
                  max={250}
                  placeholder="178"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </label>
              <label className="ig-num-field">
                <span>Gewicht (kg)</span>
                <input
                  className="ig-input mono"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={30}
                  max={300}
                  placeholder="75"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {id === "app" && (
          <div className="ig-onb-panel">
            <p className="ig-onb-kicker mono">Schritt 3 · App</p>
            <h1 className="ig-onb-title">App-Name</h1>
            <p className="ig-onb-sub">
              Erscheint im Header und im Profil. Standard ist {APP_NAME}.
            </p>
            <label className="ig-num-field ig-onb-field">
              <span>Name der App</span>
              <input
                className="ig-input"
                type="text"
                maxLength={24}
                placeholder={APP_NAME}
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </label>
            <div className="ig-onb-preview" aria-hidden="true">
              <span className="ig-onb-preview-mark">
                <OzGymMark size={28} variant="glass" title="" />
              </span>
              <span className="ig-onb-preview-name">
                {sanitizeAppName(appName)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ig-onb-footer">
        {step > 0 ? (
          <button type="button" className="ig-btn-secondary" onClick={back}>
            <ChevronLeft size={18} aria-hidden="true" /> Zurück
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="ig-btn-primary xl ig-onb-next"
          disabled={!canNext}
          onClick={next}
        >
          {step >= STEPS.length - 1 ? "Loslegen" : "Weiter"}
          {step < STEPS.length - 1 ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : null}
        </button>
      </div>
    </div>
  );
}
