/* Wiederverwendbare UI-Bausteine */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { REDUCED_MOTION } from "../lib/utils.js";

/* Skeleton statt leerem/weißem Frame beim ersten Laden eines lazy Tabs.
   Greift nur beim allerersten Besuch pro Chunk (React.lazy resolved danach
   synchron), macht diesen kurzen Moment aber sichtbar hochwertig statt blank. */
export function TabSkeleton() {
  return (
    <div className="ig-tabpane" aria-hidden="true">
      <div className="ig-skel ig-skel-hero" />
      <div className="ig-skel-row">
        <div className="ig-skel ig-skel-stat" />
        <div className="ig-skel ig-skel-stat" />
      </div>
      <div className="ig-skel ig-skel-card" />
      <div className="ig-skel ig-skel-card sm" />
    </div>
  );
}

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
