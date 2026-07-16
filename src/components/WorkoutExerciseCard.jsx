import React, { memo } from "react";
import ExerciseDemo from "./ExerciseDemo.jsx";

/**
 * One full exercise page in the workout pager.
 * Always paints title, load targets, badges, and media when `showMedia`
 * so neighbor pages are complete *during* a finger swipe — not after release.
 */
function WorkoutExerciseCard({
  name,
  meta,
  sets,
  reps,
  targetWeight,
  loadPreview,
  prKg,
  doneSets,
  active,
  showMedia,
  priorityMedia,
  widthPx,
  hint,
  note,
  shortTip,
}) {
  const wStyle =
    widthPx > 0
      ? { width: widthPx, minWidth: widthPx, maxWidth: widthPx }
      : undefined;

  const loadW = loadPreview?.weight;
  const loadR = loadPreview?.reps;
  const showLoad =
    Number.isFinite(Number(loadW)) || Number.isFinite(Number(loadR));

  return (
    <div
      className={"ig-wo-card" + (active ? " active" : "")}
      style={wStyle}
      data-active={active ? "1" : "0"}
      aria-hidden={!active}
    >
      <div className="ig-wo-card-inner" data-card-inner>
        <div className="ig-wo-card-top">
          <div className="ig-wo-card-info">
            <h3 className="ig-wo-ex-name">{name}</h3>
            <div className="ig-plan-badges">
              {meta?.nr != null && meta?.nr !== "" && (
                <span className="ig-badge">Gerät {meta.nr}</span>
              )}
              <span className="ig-badge">
                {sets} × {reps} Wdh.
              </span>
              {targetWeight != null && (
                <span className="ig-badge dim">Ziel {targetWeight} kg</span>
              )}
            </div>

            {/* Weight × reps live on every page (not only after settle) */}
            {showLoad && (
              <div className="ig-wo-card-load mono" aria-label="Vorgabe">
                <span className="ig-wo-card-load-w">
                  {Number(loadW) || 0}
                  <small>kg</small>
                </span>
                <span className="ig-wo-card-load-x">×</span>
                <span className="ig-wo-card-load-r">
                  {Number(loadR) || reps || 10}
                  <small>wdh</small>
                </span>
              </div>
            )}

            <div className="ig-wo-mini-stats mono">
              {prKg > 0 && <span>PR: {prKg} kg</span>}
              {sets > 0 && (
                <span>
                  {Math.min(doneSets, sets)}/{sets} Sätze
                </span>
              )}
            </div>
          </div>
        </div>

        {showMedia && (
          <ExerciseDemo
            exerciseName={name}
            gif={meta?.gif}
            image={meta?.image}
            priority={priorityMedia}
          />
        )}

        {hint && !note && (
          <p className="ig-wo-hint dim ig-wo-hint-static">
            {shortTip ? shortTip(hint, 64) : hint}
          </p>
        )}
        {note && (
          <p className="ig-wo-hint note">
            {shortTip ? shortTip(note, 80) : note}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(WorkoutExerciseCard);
