/* OZGYM Mark — large black brush O+Z on frosted glass tile */

import React, { Suspense, lazy } from "react";

/* WebGL splash aura — deferred so first paint stays light */
const ShaderVeil = lazy(() => import("./ShaderVeil.jsx"));

/* ?v= busts CDN/browser when mark art changes */
const MARK_SRC = "/oz-mark.png?v=20260717g";

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

export function SplashScreen({ label = "OZ" }) {
  return (
    <div className="ig-splash">
      <Suspense fallback={null}>
        <ShaderVeil className="ig-splash-veil" opacity={0.5} />
      </Suspense>
      <div className="ig-splash-mark ig-splash-oz">
        <OzGymMark size={120} variant="glass" title="OZ" />
      </div>
      <span className="ig-splash-word">{label}</span>
      <span className="ig-splash-tag">train</span>
    </div>
  );
}
