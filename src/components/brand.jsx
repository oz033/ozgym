/* OZGYM Mark — Classic O+Z, iOS glass. Z on top. No other changes. */

import React from "react";

const Z_CLASSIC = "M24 24 H40 L24 40 H40";

/**
 * @param {"glass" | "color" | "mono" | "onDark" | "onLight"} variant
 */
export function OzGymMark({
  size = 24,
  className = "",
  title = "OZGYM",
  variant = "glass",
}) {
  const uid = React.useId().replace(/:/g, "");
  const mode = variant === "color" ? "glass" : variant;

  if (mode === "mono") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={"ig-logo " + className}
        role={title ? "img" : "presentation"}
        aria-label={title || undefined}
        aria-hidden={title ? undefined : true}
        fill="none"
      >
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="5.5" />
        <path
          d={Z_CLASSIC}
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    );
  }

  if (mode === "onLight") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={"ig-logo ig-logo-on-light " + className}
        role={title ? "img" : "presentation"}
        aria-label={title || undefined}
        fill="none"
      >
        <circle cx="32" cy="32" r="16" stroke="#0A0A0A" strokeWidth="5.5" />
        <path
          className="ig-logo-z"
          d={Z_CLASSIC}
          stroke="#2E7BFF"
          strokeWidth="5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    );
  }

  if (mode === "onDark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={"ig-logo ig-logo-on-dark " + className}
        role={title ? "img" : "presentation"}
        aria-label={title || undefined}
        fill="none"
      >
        <circle cx="32" cy="32" r="16" stroke="#FFFFFF" strokeWidth="5.5" />
        <path
          className="ig-logo-z"
          d={Z_CLASSIC}
          stroke="#2E7BFF"
          strokeWidth="5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    );
  }

  // —— iOS glass — O first, Z on top ——
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={"ig-logo ig-logo-glass " + className}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      <defs>
        <linearGradient
          id={`gBody-${uid}`}
          x1="12"
          y1="4"
          x2="52"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#5B8CFF" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#1A1D28" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#0C0E14" stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id={`gShine-${uid}`}
          x1="32"
          y1="6"
          x2="32"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`gGlow-${uid}`}
          cx="32"
          cy="28"
          r="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2E7BFF" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#2E7BFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`gRim-${uid}`}
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <rect x="4" y="4" width="56" height="56" rx="15" />
        </clipPath>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#gBody-${uid})`} />
      <rect
        x="4.5"
        y="4.5"
        width="55"
        height="55"
        rx="14.5"
        stroke={`url(#gRim-${uid})`}
        strokeWidth="1"
        fill="none"
      />

      <g clipPath={`url(#clip-${uid})`}>
        <circle cx="32" cy="30" r="20" fill={`url(#gGlow-${uid})`} />
        <rect x="4" y="4" width="56" height="30" fill={`url(#gShine-${uid})`} />
        <path
          d="M12 10.5 C18 8.5 46 8.5 52 10.5"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeOpacity="0.28"
          strokeLinecap="round"
        />
      </g>

      {/* O */}
      <circle
        cx="32"
        cy="32"
        r="16"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeOpacity="0.95"
        fill="none"
      />
      <circle
        cx="32"
        cy="32"
        r="12.2"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeOpacity="0.14"
        fill="none"
      />

      {/* Z on top */}
      <path
        className="ig-logo-z"
        d={Z_CLASSIC}
        stroke="#2E7BFF"
        strokeWidth="5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function EclipseMark(props) {
  return <OzGymMark variant="mono" {...props} />;
}

export function SplashScreen({ label = "OZGYM" }) {
  return (
    <div className="ig-splash">
      <div className="ig-splash-mark ig-splash-glass">
        <OzGymMark size={92} variant="glass" title="OZGYM" />
      </div>
      <span className="ig-splash-word">{label}</span>
      <span className="ig-splash-tag">by OZ</span>
    </div>
  );
}
