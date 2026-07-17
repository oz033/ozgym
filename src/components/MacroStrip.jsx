/* Makro-Leiste: day = groß, product = kompakt — theme-aware via CSS vars */

import React from "react";

const MACROS = [
  {
    key: "protein",
    short: "P",
    label: "Protein",
    var: "--macro-p",
  },
  {
    key: "carbs",
    short: "KH",
    label: "Kohlenh.",
    var: "--macro-c",
  },
  {
    key: "fat",
    short: "F",
    label: "Fett",
    var: "--macro-f",
  },
];

function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 100) return String(Math.round(v));
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * @param {object} props
 * @param {number|null} [props.kcal]
 * @param {number|null} [props.protein]
 * @param {number|null} [props.carbs]
 * @param {number|null} [props.fat]
 * @param {number} [props.kcalGoal]
 * @param {"product"|"day"} [props.variant]
 */
export default function MacroStrip({
  kcal,
  protein,
  carbs,
  fat,
  kcalGoal = 0,
  variant = "product",
}) {
  const values = { protein, carbs, fat };
  const isDay = variant === "day";
  const kcalNum =
    kcal != null && Number.isFinite(Number(kcal)) ? Number(kcal) : null;
  const pct =
    kcalGoal > 0 && kcalNum != null
      ? Math.min(100, Math.round((kcalNum / kcalGoal) * 100))
      : null;

  if (!isDay) {
    return (
      <div
        className="ig-macro-strip is-product"
        role="group"
        aria-label="Portion Nährwerte"
      >
        <div className="ig-macro-kcal">
          <span className="ig-macro-kcal-num">
            {kcalNum != null ? Math.round(kcalNum) : "—"}
          </span>
          <span className="ig-macro-kcal-unit">kcal</span>
        </div>
        <div className="ig-macro-tiles">
          {MACROS.map((m) => (
            <div
              key={m.key}
              className="ig-macro-tile"
              style={{ "--macro": `var(${m.var})` }}
            >
              <span className="ig-macro-tile-lbl">{m.short}</span>
              <span className="ig-macro-tile-val">
                {fmt(values[m.key])}
                <span className="ig-macro-tile-g">g</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="ig-macro-strip is-day"
      role="group"
      aria-label="Tages-Nährwerte"
    >
      <div className="ig-macro-day-head">
        <div className="ig-macro-kcal">
          <span className="ig-macro-kcal-num is-lg">
            {kcalNum != null ? Math.round(kcalNum) : "—"}
          </span>
          <span className="ig-macro-kcal-unit">
            kcal
            {kcalGoal > 0 ? (
              <span className="ig-macro-kcal-goal"> / {kcalGoal}</span>
            ) : null}
          </span>
        </div>
        {pct != null ? (
          <span className="ig-macro-pct mono">{pct}%</span>
        ) : (
          <span className="ig-macro-tag">Heute</span>
        )}
      </div>

      {kcalGoal > 0 && kcalNum != null ? (
        <div className="ig-macro-goal-bar" aria-hidden="true">
          <div className="ig-macro-goal-fill" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      <div className="ig-macro-tiles is-day">
        {MACROS.map((m) => (
          <div
            key={m.key}
            className="ig-macro-tile is-day"
            style={{ "--macro": `var(${m.var})` }}
          >
            <span className="ig-macro-tile-lbl">
              <span className="ig-macro-dot" aria-hidden="true" />
              {m.label}
            </span>
            <span className="ig-macro-tile-val is-lg">
              {fmt(values[m.key])}
              <span className="ig-macro-tile-g">g</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
