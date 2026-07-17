/* Moderne Sport-Trinkflasche (blau), Füllstand = ml/Ziel */

import React, { useId } from "react";

/**
 * @param {{ ml?: number, goal?: number, size?: number }} props
 */
export default function WaterBottle({ ml = 0, goal = 0, size = 36 }) {
  const uid = useId().replace(/:/g, "");
  const clipId = `wb-c-${uid}`;
  const waterId = `wb-w-${uid}`;
  const bodyId = `wb-b-${uid}`;

  const fill =
    goal > 0
      ? Math.min(1, Math.max(0, Number(ml) / Number(goal)))
      : ml > 0
        ? Math.min(1, Number(ml) / 2500)
        : 0;

  // Innenraum y: 20 → 56
  const y0 = 20;
  const y1 = 56;
  const h = y1 - y0;
  const waterTop = y1 - h * fill;
  const waterH = h * fill;

  const svgW = size;
  const svgH = Math.round(size * 1.55);

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox="0 0 48 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ig-water-bottle"
    >
      <defs>
        <linearGradient id={bodyId} x1="8" y1="18" x2="40" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.08" />
          <stop offset="1" stopColor="#0284c7" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={waterId} x1="24" y1={waterTop} x2="24" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3fc" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M15 20C15 18.3431 16.3431 17 18 17H30C31.6569 17 33 18.3431 33 20V52C33 54.7614 30.7614 57 28 57H20C17.2386 57 15 54.7614 15 52V20Z" />
        </clipPath>
      </defs>

      {/* Schatten unter Flasche */}
      <ellipse cx="24" cy="68" rx="11" ry="2.2" fill="#0ea5e9" opacity="0.12" />

      {/* Kappe */}
      <rect x="17" y="2" width="14" height="7" rx="3" fill="#0369a1" />
      <rect x="18.5" y="3.2" width="11" height="1.4" rx="0.7" fill="#38bdf8" opacity="0.35" />
      <rect x="18.5" y="5.5" width="11" height="1.4" rx="0.7" fill="#38bdf8" opacity="0.25" />
      {/* Kappen-Ring */}
      <rect x="18" y="8.5" width="12" height="3.5" rx="1.2" fill="#0284c7" />

      {/* Hals */}
      <path
        d="M19.5 12H28.5V17H19.5V12Z"
        fill="#0c4a6e"
        opacity="0.9"
      />
      <path
        d="M20 12.5H28V16.5H20V12.5Z"
        fill="#38bdf8"
        opacity="0.2"
      />

      {/* Körper Außen */}
      <path
        d="M15 20C15 18.3431 16.3431 17 18 17H30C31.6569 17 33 18.3431 33 20V52C33 54.7614 30.7614 57 28 57H20C17.2386 57 15 54.7614 15 52V20Z"
        fill={`url(#${bodyId})`}
        stroke="#38bdf8"
        strokeWidth="1.75"
      />

      {/* Wasser */}
      {fill > 0.015 ? (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="15"
            y={waterTop}
            width="18"
            height={waterH + 0.5}
            fill={`url(#${waterId})`}
          />
          {/* Meniskus */}
          <path
            d={`M15 ${waterTop + 1.5} Q19 ${waterTop - 1.8} 24 ${waterTop + 1.2} T33 ${waterTop + 1.5}`}
            stroke="#e0f2fe"
            strokeWidth="1.5"
            strokeOpacity="0.75"
            fill="none"
            strokeLinecap="round"
          />
          {fill > 0.2 ? (
            <>
              <circle cx="20" cy={Math.min(54, waterTop + waterH * 0.4)} r="1.1" fill="#fff" opacity="0.4" />
              <circle cx="26" cy={Math.min(54, waterTop + waterH * 0.58)} r="0.8" fill="#fff" opacity="0.3" />
              <circle cx="22.5" cy={Math.min(54, waterTop + waterH * 0.75)} r="0.6" fill="#fff" opacity="0.25" />
            </>
          ) : null}
        </g>
      ) : null}

      {/* Glas-Glanz */}
      <path
        d="M18 22C18 22 18 48 18 48"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M20.5 24C20.5 24 20.5 40 20.5 40"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.12"
      />

      {/* Markierungen */}
      <g stroke="#7dd3fc" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round">
        <line x1="33.5" y1="28" x2="36" y2="28" />
        <line x1="33.5" y1="36" x2="36" y2="36" />
        <line x1="33.5" y1="44" x2="36" y2="44" />
      </g>
    </svg>
  );
}
