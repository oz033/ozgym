import React, { useState, useEffect, memo } from "react";
import { findExerciseMedia } from "../lib/exerciseMedia.js";
import { preloadMedia, isMediaWarm } from "../lib/mediaCache.js";

/**
 * Real exercise GIF/thumbnail from hasaneyldrm/exercises-dataset.
 * Prefers explicit gif/image props from library entries.
 * Eager + cache-aware so swipe neighbor cards never flash empty.
 */
function ExerciseDemo({
  exerciseName,
  gif,
  image,
  className = "",
  /** compact: small thumb only (for info header next to title) */
  compact = false,
  /** Prefer network + decode before paint (swipe window / active card) */
  priority = false,
  /** Pause decorative motion styles from parent parallax when true */
  frozen = false,
}) {
  const looked = findExerciseMedia(exerciseName);
  const gifUrl = gif || looked?.gifUrl;
  const imageUrl = image || looked?.imageUrl;
  const preferred = gifUrl || imageUrl || null;
  const fallback =
    imageUrl && imageUrl !== gifUrl ? imageUrl : gifUrl && gifUrl !== imageUrl ? gifUrl : null;

  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState(() => {
    if (!preferred) return null;
    // If already warm, show immediately; else still set src so browser can paint
    return preferred;
  });

  // Warm cache + ensure decode for priority neighbors
  useEffect(() => {
    setFailed(false);
    if (!preferred) {
      setSrc(null);
      return;
    }
    setSrc(preferred);
    let cancelled = false;
    preloadMedia(preferred).then((status) => {
      if (cancelled) return;
      if (status === "err" && fallback && fallback !== preferred) {
        setSrc(fallback);
        preloadMedia(fallback);
      }
    });
    if (fallback && fallback !== preferred) preloadMedia(fallback);
    return () => {
      cancelled = true;
    };
  }, [preferred, fallback]);

  const displaySrc = !failed ? src : fallback && fallback !== src ? fallback : null;
  const warm = displaySrc ? isMediaWarm(displaySrc) : false;

  if (!displaySrc) {
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

  return (
    <div
      className={
        "ig-ex-demo" +
        (compact ? " compact" : "") +
        (priority ? " priority" : "") +
        (warm ? " warm" : "") +
        (frozen ? " frozen" : "") +
        (className ? ` ${className}` : "")
      }
      data-media-warm={warm ? "1" : "0"}
    >
      <div className="ig-ex-demo-frame" data-parallax-media>
        <img
          className="ig-ex-demo-gif"
          src={displaySrc}
          alt={compact ? "" : exerciseName}
          // Eager for swipe window — lazy would load after card becomes active (flash)
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          draggable={false}
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}

export default memo(ExerciseDemo);
