import React, { useState } from "react";
import { findExerciseMedia } from "../lib/exerciseMedia.js";

/**
 * Real exercise GIF/thumbnail from hasaneyldrm/exercises-dataset.
 * Prefers explicit gif/image props from library entries.
 * (Gym visual credit lives in dataset NOTICE — not shown under every GIF.)
 */
export default function ExerciseDemo({
  exerciseName,
  gif,
  image,
  className = "",
  /** compact: small thumb only (for info header next to title) */
  compact = false,
}) {
  const looked = findExerciseMedia(exerciseName);
  const gifUrl = gif || looked?.gifUrl;
  const imageUrl = image || looked?.imageUrl;
  const [failed, setFailed] = useState(false);
  const src = !failed ? gifUrl || imageUrl : imageUrl && imageUrl !== gifUrl ? imageUrl : null;

  if (!src) {
    if (compact) {
      return (
        <div
          className={
            "ig-ex-demo compact empty" + (className ? ` ${className}` : "")
          }
          aria-hidden="true"
        >
          <div className="ig-ex-demo-frame">
            <span className="ig-ex-demo-compact-ph">?</span>
          </div>
        </div>
      );
    }
    return (
      <div className={"ig-ex-demo empty" + (className ? ` ${className}` : "")}>
        <div className="ig-ex-demo-fallback">
          <span className="ig-ex-demo-fallback-label">Übung</span>
          <strong>{exerciseName}</strong>
          <span className="ig-ex-demo-fallback-hint">
            Kein Demo-Clip — trotzdem trainieren.
          </span>
        </div>
      </div>
    );
  }

  // GIF only — no English muscle/equipment chips under demos
  return (
    <div
      className={
        "ig-ex-demo" +
        (compact ? " compact" : "") +
        (className ? ` ${className}` : "")
      }
    >
      <div className="ig-ex-demo-frame">
        <img
          className="ig-ex-demo-gif"
          src={src}
          alt={compact ? "" : exerciseName}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}
