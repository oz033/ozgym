/* OZGYM Mark — black brush O + black Z on white (iOS full-bleed) */

import React from "react";

const MARK_SRC = "/oz-mark.png";

/**
 * @param {"glass" | "color" | "mono" | "onDark" | "onLight"} variant
 */
export function OzGymMark({
  size = 24,
  className = "",
  title = "OZGYM",
  variant = "glass",
}) {
  const mode = variant === "color" ? "glass" : variant;
  const filter =
    mode === "mono"
      ? "grayscale(1) contrast(1.05)"
      : "none";

  return (
    <img
      src={MARK_SRC}
      width={size}
      height={size}
      alt={title || ""}
      draggable={false}
      className={
        "ig-logo ig-logo-oz" +
        (mode === "mono" ? " mono" : "") +
        (mode === "onLight" ? " on-light" : "") +
        (className ? ` ${className}` : "")
      }
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: Math.max(6, Math.round(size * 0.22)),
        display: "block",
        flexShrink: 0,
        filter,
        background: "#ffffff",
        WebkitUserDrag: "none",
        userSelect: "none",
      }}
    />
  );
}

/** @deprecated alias */
export function EclipseMark(props) {
  return <OzGymMark variant="mono" {...props} />;
}

export function SplashScreen({ label = "OZGYM" }) {
  return (
    <div className="ig-splash">
      <div className="ig-splash-mark ig-splash-oz">
        <OzGymMark size={108} variant="glass" title="OZGYM" />
      </div>
      <span className="ig-splash-word">{label}</span>
      <span className="ig-splash-tag">by OZ</span>
    </div>
  );
}
