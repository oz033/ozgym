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
}) {
  const looked = findExerciseMedia(exerciseName);
  const gifUrl = gif || looked?.gifUrl;
  const imageUrl = image || looked?.imageUrl;
  const [failed, setFailed] = useState(false);
  const src = !failed ? gifUrl || imageUrl : imageUrl && imageUrl !== gifUrl ? imageUrl : null;

  if (!src) {
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

  const chips = [
    looked?.target && { label: looked.target, kind: "primary" },
    looked?.equipment && { label: looked.equipment, kind: "equip" },
    ...(looked?.secondary || []).slice(0, 3).map((m) => ({
      label: m,
      kind: "secondary",
    })),
  ].filter(Boolean);

  return (
    <div className={"ig-ex-demo" + (className ? ` ${className}` : "")}>
      <div className="ig-ex-demo-frame">
        <img
          className="ig-ex-demo-gif"
          src={src}
          alt={exerciseName}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
      {looked?.name &&
        looked.name.toLowerCase() !== String(exerciseName || "").toLowerCase() &&
        !gif && (
          <div className="ig-ex-demo-match mono">Demo: {looked.name}</div>
        )}
      {chips.length > 0 && (
        <div className="ig-ex-demo-chips">
          {chips.map((c) => (
            <span key={c.kind + c.label} className={"ig-ex-demo-chip " + c.kind}>
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
