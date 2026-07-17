/* First-run: Name · Geschlecht · Körper */

import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { OzGymMark } from "./brand.jsx";
import { todayISO, formatDisplayName } from "../lib/utils.js";

const STEPS = ["welcome", "you", "body"];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState(null); // "m" | "f" | null
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const id = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const nameOk = displayName.trim().length >= 1;
  const genderOk = gender === "m" || gender === "f";
  const weightNum = Number(String(weightKg).replace(",", "."));
  // Weight optional — empty OK; if filled, must be valid range
  const weightOk =
    weightKg === "" ||
    (Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 300);
  const heightNum = Number(heightCm);
  const heightOk =
    heightCm === "" ||
    (Number.isFinite(heightNum) && heightNum >= 100 && heightNum <= 250);
  const canNext = useMemo(() => {
    if (id === "welcome") return true;
    if (id === "you") return nameOk && genderOk; // only name (with gender) required
    if (id === "body") return weightOk && heightOk; // both optional, just valid if set
    return false;
  }, [id, nameOk, genderOk, weightOk, heightOk]);

  const finish = () => {
    const w = Number(String(weightKg).replace(",", "."));
    let weightLog = [];
    if (weightKg !== "" && Number.isFinite(w) && w >= 30 && w <= 300) {
      weightLog = [{ date: todayISO(), kg: Math.round(w * 10) / 10 }];
    }
    onComplete({
      profile: {
        displayName: formatDisplayName(displayName),
        gender,
        age: age === "" ? "" : String(age),
        heightCm: heightCm === "" ? "" : String(heightCm),
        weightKg: weightKg === "" ? "" : String(weightKg),
        weightLog,
        onboarded: true,
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

  // Live mode tint while picking gender (pink for f before save)
  const liveMode = gender === "f" ? "f" : gender === "m" ? "m" : "n";

  return (
    <div
      className="ig-onb"
      data-mode={liveMode}
      role="dialog"
      aria-modal="true"
      aria-label="Einrichtung"
    >
      <div className="ig-onb-progress" aria-hidden="true">
        <div className="ig-onb-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ig-onb-body">
        {id === "welcome" && (
          <div className="ig-onb-panel ig-onb-welcome">
            <span className="ig-onb-logo" aria-hidden="true">
              <OzGymMark size={72} variant="glass" title="" />
            </span>
            <h1 className="ig-onb-title">OZGYM</h1>
            <p className="ig-onb-sub">
              Kurz einrichten — dein Name und Körperdaten. Alles bleibt nur auf
              diesem Gerät.
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
              Alles optional. Leer lassen und mit „Loslegen“ weiter — später im
              Profil oder unter Verlauf nachtragbar.
            </p>
            <label className="ig-num-field ig-onb-field">
              <span>Gewicht (kg, optional)</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={30}
                max={300}
                placeholder="z. B. 68"
                autoFocus
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
            <label className="ig-num-field ig-onb-field" style={{ marginTop: 12 }}>
              <span>Größe (cm, optional)</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="numeric"
                min={100}
                max={250}
                placeholder="z. B. 168"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </label>
            {!weightOk && weightKg !== "" && (
              <p className="ig-onb-hint" style={{ color: "var(--danger)" }}>
                Wenn du etwas einträgst: 30–300 kg.
              </p>
            )}
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
