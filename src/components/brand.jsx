/* OZGYM Mark — large black brush O+Z on frosted glass tile */

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
  const r = Math.max(6, Math.round(size * 0.22));

  return (
    <span
      className={
        "ig-logo ig-logo-oz" +
        (mode === "glass" || mode === "mono" ? " ig-logo-glass" : "") +
        (mode === "mono" ? " mono" : "") +
        (mode === "onLight" ? " on-light" : "") +
        (mode === "onDark" ? " on-dark" : "") +
        (className ? ` ${className}` : "")
      }
      style={{
        width: size,
        height: size,
        borderRadius: r,
        display: "inline-flex",
        flexShrink: 0,
        lineHeight: 0,
      }}
      title={title || undefined}
    >
      <img
        src={MARK_SRC}
        width={size}
        height={size}
        alt={title || ""}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: r,
          display: "block",
          WebkitUserDrag: "none",
          userSelect: "none",
        }}
      />
    </span>
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
        <OzGymMark size={120} variant="glass" title="OZGYM" />
      </div>
      <span className="ig-splash-word">{label}</span>
      <span className="ig-splash-tag">by OZ</span>
    </div>
  );
}
