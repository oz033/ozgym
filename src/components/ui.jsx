/* Wiederverwendbare UI-Bausteine */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { REDUCED_MOTION } from "../lib/utils.js";
import { ZONE_LABEL } from "../lib/constants.js";

/* Hochwertiger Leerzustand: Icon, Erklärung, ein primärer und ein optionaler
   sekundärer Weg nach vorn. Kein Screen der App darf einfach leer bleiben. */
export function EmptyState({ icon, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <div className="ig-empty-state">
      {icon && <div className="ig-empty-state-icon">{icon}</div>}
      <h2 className="ig-empty-state-title">{title}</h2>
      {description && <p className="ig-empty-state-desc">{description}</p>}
      {primaryLabel && (
        <button className="ig-btn-primary wide xl" onClick={onPrimary}>
          {primaryLabel}
        </button>
      )}
      {secondaryLabel && (
        <button className="ig-btn-primary wide ghosted" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}

/* Animierte Zahlen (Count-up) */
export function CountUp({ value, format = (v) => Math.round(v), duration = 750 }) {
  const [display, setDisplay] = useState(REDUCED_MOTION ? value : 0);
  const displayRef = useRef(REDUCED_MOTION ? value : 0);
  useEffect(() => {
    if (REDUCED_MOTION) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(display)}</>;
}

/* Sparkline: letzte Einheiten einer Übung */
export function Sparkline({ points, w = 90, h = 32 }) {
  if (points.length < 2) return null;
  const pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const path = coords.map((c) => c.join(",")).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        className="ig-spark-line"
        points={path}
        fill="none"
        stroke={up ? "var(--success)" : "var(--danger)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
      {coords.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === coords.length - 1 ? 2.6 : 1.6}
          fill={
            i === coords.length - 1
              ? up
                ? "var(--success)"
                : "var(--danger)"
              : "var(--text-dim)"
          }
        />
      ))}
    </svg>
  );
}

/* Muskel-Silhouette: anatomisch klar getrennte Muskelgruppen (Schulter/Trizeps/
   Unterarm etc. einzeln sichtbar statt ein Arm-Blob) mit weichem Glanz-Overlay
   für einen runden, plastischen ("3D") statt flachen Eindruck. */
let silGradSeq = 0;

export function BodySilhouette({ zone, zone2, pulseKey, size = 132 }) {
  const gradId = React.useMemo(() => `ig-sil-sheen-${++silGradSeq}`, []);
  const cls = (z) =>
    z === zone
      ? "ig-sil-zone primary"
      : z === zone2
        ? "ig-sil-zone secondary"
        : "ig-sil-zone";
  return (
    <svg
      key={pulseKey}
      width={size}
      height={size * 1.5}
      viewBox="0 0 160 240"
      role="img"
      className="ig-sil-svg"
      aria-label={
        zone
          ? `Zielmuskel: ${ZONE_LABEL[zone]}${zone2 ? `, auch ${ZONE_LABEL[zone2]}` : ""}`
          : "Körperübersicht"
      }
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="18%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Kopf & Hals */}
      <circle cx="80" cy="18" r="14" fill="var(--sil-base)" />
      <rect x="71" y="30" width="18" height="11" rx="4" fill="var(--sil-base)" />

      {/* Trapez (schmal, hinter dem Nacken) */}
      <path d="M58 40 Q80 33 102 40 L100 51 Q80 45 60 51 Z" className={cls("shoulders")} />
      {/* Deltamuskeln (Schulterkappen) */}
      <path d="M26 50 Q17 57 19 69 Q21 78 32 75 Q39 66 36 54 Q32 47 26 50 Z" className={cls("shoulders")} />
      <path d="M134 50 Q143 57 141 69 Q139 78 128 75 Q121 66 124 54 Q128 47 134 50 Z" className={cls("shoulders")} />

      {/* Brust (Pectoralis, links/rechts getrennt) */}
      <path d="M40 58 Q60 49 78 56 L76 83 Q58 91 42 81 Z" className={cls("chest")} />
      <path d="M120 58 Q100 49 82 56 L84 83 Q102 91 118 81 Z" className={cls("chest")} />

      {/* Rücken/Lat, seitlich sichtbar */}
      <path d="M29 76 Q24 93 29 109 L38 107 Q34 92 36 78 Z" className={cls("back")} />
      <path d="M131 76 Q136 93 131 109 L122 107 Q126 92 124 78 Z" className={cls("back")} />

      {/* Bizeps */}
      <path d="M19 70 Q12 85 15 101 L26 100 Q23 86 28 74 Z" className={cls("arms")} />
      <path d="M141 70 Q148 85 145 101 L134 100 Q137 86 132 74 Z" className={cls("arms")} />
      {/* Unterarme */}
      <path d="M14 103 Q8 118 12 134 L23 132 Q20 119 25 104 Z" className={cls("arms")} />
      <path d="M146 103 Q152 118 148 134 L137 132 Q140 119 135 104 Z" className={cls("arms")} />

      {/* Bauch: 6er-Pack + seitliche Obliques */}
      <path d="M61 90 Q56 106 61 123 L68 121 Q65 105 68 92 Z" className={cls("abs")} />
      <path d="M99 90 Q104 106 99 123 L92 121 Q95 105 92 92 Z" className={cls("abs")} />
      <rect x="68" y="88" width="11" height="13" rx="3" className={cls("abs")} />
      <rect x="81" y="88" width="11" height="13" rx="3" className={cls("abs")} />
      <rect x="68" y="103" width="11" height="13" rx="3" className={cls("abs")} />
      <rect x="81" y="103" width="11" height="13" rx="3" className={cls("abs")} />
      <rect x="68" y="118" width="11" height="13" rx="3" className={cls("abs")} />
      <rect x="81" y="118" width="11" height="13" rx="3" className={cls("abs")} />

      {/* Quadrizeps */}
      <path d="M62 138 Q55 166 60 196 L74 196 Q77 166 74 138 Z" className={cls("legs")} />
      <path d="M98 138 Q105 166 100 196 L86 196 Q83 166 86 138 Z" className={cls("legs")} />
      {/* Waden */}
      <path d="M61 199 Q57 217 61 235 L71 235 Q74 217 71 199 Z" className={cls("legs")} />
      <path d="M99 199 Q103 217 99 235 L89 235 Q86 217 89 199 Z" className={cls("legs")} />

      {/* Glanz-Overlay für plastischen Eindruck, unabhängig von der Zonenfarbe */}
      <rect x="0" y="0" width="160" height="240" fill={`url(#${gradId})`} className="ig-sil-sheen" />
    </svg>
  );
}

/* Kreisförmiger Pausen-Timer */
export function RestRing({ left, total }) {
  const r = 74;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? left / total : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="ig-wo-restring">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="11" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="ig-wo-restring-center">
        <span className="ig-wo-rest-time mono">
          {mm}:{ss}
        </span>
        <span className="ig-caption-sub">Pause</span>
      </div>
    </div>
  );
}

/* Konfetti-Overlay (bei Erfolgen): geometrische Formen in Akzentfarbe statt Emoji */
const CONFETTI_SHAPES = ["circle", "square", "diamond", "bar"];

export function Confetti({ count = 24 }) {
  return (
    <div className="ig-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={"ig-confetti-bit " + CONFETTI_SHAPES[i % CONFETTI_SHAPES.length]}
          style={{
            left: `${(i * 41) % 100}%`,
            animationDelay: `${(i % 8) * 0.18}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            opacity: 0.55 + (i % 3) * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/* Fortschritts-Ring klein (Wasser/Kalorien) */
export function MiniRing({ pct, size = 44, stroke = 5, color = "var(--accent)", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ig-mini-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, pct))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s var(--ease-out)" }}
        />
      </svg>
      <div className="ig-mini-ring-center">{children}</div>
    </div>
  );
}

/* Tab-Button der Bottom-Navigation: aktiver Zustand als wandernde Pill */
export function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      className={"ig-tab" + (active ? " active" : "")}
      onClick={onClick}
      aria-label={label}
    >
      {active && (
        <motion.span
          layoutId="ig-nav-pill"
          className="ig-tab-pill"
          transition={
            REDUCED_MOTION
              ? { duration: 0 }
              : { type: "spring", stiffness: 480, damping: 38 }
          }
        />
      )}
      <span className="ig-tab-icon">{icon}</span>
      <span className="ig-tab-label">{label}</span>
    </button>
  );
}

/* iOS-Style Schalter */
export function ToggleRow({ checked, onChange, children }) {
  return (
    <label className="ig-toggle-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
