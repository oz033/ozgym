/* Wiederverwendbare UI-Bausteine */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Info, Trash2 } from "lucide-react";
import { REDUCED_MOTION, buzz } from "../lib/utils.js";
import { trapFocus, dialogCloseMs } from "../lib/dialogFocus.js";

/* Leichter Toast-Bus: showToast() feuert ein CustomEvent, das der ToastHost in
   der App-Shell rendert. Kein Prop-Drilling, kein Context — Fehlertexte dürfen
   aus jedem Tab kommen. Ersetzt window.alert() (bricht Premium-Gefühl). */
export function showToast(message, type = "error", opts = {}) {
  window.dispatchEvent(
    new CustomEvent("ozgym:toast", { detail: { message, type, ...opts } }),
  );
}

/* In-App-Bestätigung statt window.confirm(): Promise<boolean>.
   Destruktive Aktionen bekommen einen roten Bestätigen-Button. */
export function showConfirm({
  title,
  message,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  destructive = false,
}) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("ozgym:confirm", {
        detail: { title, message, confirmLabel, cancelLabel, destructive, resolve },
      }),
    );
  });
}

export function ConfirmHost({ hapticsOn = true }) {
  const [req, setReq] = useState(null);
  /** "pre" | "open" | "closing" — enter needs a paint of pre, then open */
  const [state, setState] = useState("pre");
  const closingRef = useRef(false);
  const reqRef = useRef(null);
  const panelRef = useRef(null);
  const hapticsRef = useRef(hapticsOn);
  useEffect(() => {
    hapticsRef.current = hapticsOn;
  }, [hapticsOn]);
  useEffect(() => {
    const onConfirm = (e) => {
      if (!e.detail?.resolve) return;
      buzz(15, hapticsRef.current);
      closingRef.current = false;
      reqRef.current = e.detail;
      setState("pre");
      setReq(e.detail);
    };
    window.addEventListener("ozgym:confirm", onConfirm);
    return () => window.removeEventListener("ozgym:confirm", onConfirm);
  }, []);
  // First paint at pre-scale, then open (guarantees enter transition)
  useEffect(() => {
    if (!req || state !== "pre") return;
    const id = requestAnimationFrame(() => setState("open"));
    return () => cancelAnimationFrame(id);
  }, [req, state]);
  const close = useCallback((result) => {
    const r = reqRef.current;
    if (!r || closingRef.current) return;
    closingRef.current = true;
    setState("closing");
    const ms = REDUCED_MOTION ? 0 : dialogCloseMs();
    window.setTimeout(() => {
      r.resolve(result);
      reqRef.current = null;
      setReq(null);
      closingRef.current = false;
      setState("pre");
    }, ms);
  }, []);
  // Focus trap while open; restore trigger on cleanup
  useEffect(() => {
    if (!req || state !== "open") return;
    return trapFocus(panelRef.current, { onEscape: () => close(false) });
  }, [req, state, close]);
  if (!req) return null;
  const titleId = "ig-confirm-title";
  const msgId = "ig-confirm-msg";
  return (
    <div
      className="ig-confirm-backdrop"
      data-state={state === "pre" ? "pre" : state}
      onClick={() => close(false)}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="ig-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={req.title ? titleId : undefined}
        aria-describedby={req.message ? msgId : undefined}
        aria-label={!req.title ? req.message || "Bestätigung" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {req.title && (
          <h3 id={titleId} className="ig-confirm-title">
            {req.title}
          </h3>
        )}
        {req.message && (
          <p id={msgId} className="ig-confirm-msg">
            {req.message}
          </p>
        )}
        <div className="ig-confirm-actions">
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            onClick={() => close(false)}
          >
            {req.cancelLabel}
          </button>
          <button
            type="button"
            className={
              "ig-btn-primary wide" + (req.destructive ? " ig-btn-danger" : "")
            }
            onClick={() => close(true)}
            autoFocus={!req.destructive}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastHost({ hapticsOn = true }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const hapticsRef = useRef(hapticsOn);
  useEffect(() => {
    hapticsRef.current = hapticsOn;
  }, [hapticsOn]);
  useEffect(() => {
    const onToast = (e) => {
      const { message, type = "error", sticky, actionLabel, onAction } =
        e.detail || {};
      if (!message) return;
      clearTimeout(timer.current);
      // key erzwingt Remount → Ein-Animation (inkl. Shake) spielt erneut
      setToast({ message, type, sticky, actionLabel, onAction, key: Date.now() });
      if (type === "error") buzz([30, 40, 30], hapticsRef.current);
      if (!sticky) timer.current = setTimeout(() => setToast(null), 3600);
    };
    window.addEventListener("ozgym:toast", onToast);
    return () => {
      window.removeEventListener("ozgym:toast", onToast);
      clearTimeout(timer.current);
    };
  }, []);
  if (!toast) return null;
  const dismiss = () => {
    clearTimeout(timer.current);
    setToast(null);
  };
  return (
    <div
      key={toast.key}
      className={"ig-toast " + toast.type}
      role="status"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      onClick={dismiss}
    >
      <span className="ig-toast-icon" aria-hidden="true">
        {toast.type === "error" ? (
          <AlertTriangle size={16} />
        ) : toast.type === "info" ? (
          <Info size={16} />
        ) : (
          <Check size={16} />
        )}
      </span>
      <span className="ig-toast-msg">{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className="ig-toast-action"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
            toast.onAction?.();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}

/* Skeleton — mirrors home rhythm so lazy tabs don't flash empty */
export function TabSkeleton({ variant = "home" }) {
  return (
    <div
      className={"ig-tabpane ig-skel-pane" + (variant === "home" ? " ig-skel-home" : "")}
      aria-hidden="true"
      aria-busy="true"
    >
      <div className="ig-skel ig-skel-eyebrow" />
      <div className="ig-skel ig-skel-hero" />
      <div className="ig-skel ig-skel-cta" />
      <div className="ig-skel ig-skel-card" />
      <div className="ig-skel-row">
        <div className="ig-skel ig-skel-stat" />
        <div className="ig-skel ig-skel-stat" />
        <div className="ig-skel ig-skel-stat" />
      </div>
      <div className="ig-skel ig-skel-card sm" />
      <div className="ig-skel ig-skel-card sm" />
    </div>
  );
}

/* Unified empty state — every tab can use the same voice */
export function EmptyState({
  icon,
  kicker,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
  className = "",
}) {
  return (
    <div className={"ig-empty-state" + (className ? " " + className : "")} role="status">
      {icon && (
        <div className="ig-empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {kicker && <span className="ig-empty-state-kicker mono">{kicker}</span>}
      <h2 className="ig-empty-state-title">{title}</h2>
      {description && <p className="ig-empty-state-desc">{description}</p>}
      {children}
      {primaryLabel && (
        <button type="button" className="ig-btn-primary wide xl" onClick={onPrimary}>
          {primaryLabel}
        </button>
      )}
      {secondaryLabel && (
        <button type="button" className="ig-btn-primary wide ghosted" onClick={onSecondary}>
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
  const stroke = up ? "var(--accent)" : "var(--danger)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        className="ig-spark-line"
        points={path}
        fill="none"
        stroke={stroke}
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
              ? stroke
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
    // Letzte 5 Sekunden: Ring pulsiert mit Glow — "gleich geht's weiter"
    <div className={"ig-wo-restring" + (left <= 5 && left > 0 ? " ending" : "")}>
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
      type="button"
      className={"ig-tab" + (active ? " active" : "")}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="ig-nav-pill"
          className="ig-tab-pill"
          aria-hidden="true"
          transition={
            REDUCED_MOTION
              ? { duration: 0 }
              : { type: "spring", stiffness: 480, damping: 38 }
          }
        />
      )}
      <span className="ig-tab-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ig-tab-label">{label}</span>
    </button>
  );
}

/* Swipe-to-Delete: Zeile nach links ziehen legt roten Löschen-Button frei.
   Nur eine Geste-Abkürzung — die sichtbaren Buttons bleiben als Fallback,
   keine Funktion hängt allein am Swipe. */
export function SwipeRow({
  onDelete,
  deleteLabel = "Löschen",
  contentClassName = "",
  style,
  children,
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"ig-swipe" + (open ? " open" : "")} style={style}>
      <button
        type="button"
        className="ig-swipe-del"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={deleteLabel}
        onClick={() => {
          setOpen(false);
          onDelete();
        }}
      >
        <Trash2 size={18} />
      </button>
      <motion.div
        className={"ig-swipe-content " + contentClassName}
        drag="x"
        dragConstraints={{ left: -84, right: 0 }}
        dragElastic={0.04}
        dragMomentum={false}
        animate={{ x: open ? -84 : 0 }}
        transition={
          REDUCED_MOTION
            ? { duration: 0 }
            : { type: "spring", stiffness: 500, damping: 40 }
        }
        onDragEnd={(_, info) =>
          setOpen(info.offset.x < -40 || info.velocity.x < -300)
        }
        onClickCapture={(e) => {
          // Offene Zeile: erster Tap schließt nur (iOS-Verhalten), löst nichts aus
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* Action-Sheet (Quick-Menü, z. B. Long-Press auf Plan-Karte):
   Promise<string|null> — id der gewählten Aktion, null bei Abbruch. */
export function showActionSheet({ title, actions }) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("ozgym:actionsheet", { detail: { title, actions, resolve } }),
    );
  });
}

export function ActionSheetHost({ hapticsOn = true }) {
  const [req, setReq] = useState(null);
  const [state, setState] = useState("pre");
  const closingRef = useRef(false);
  const reqRef = useRef(null);
  const panelRef = useRef(null);
  const hapticsRef = useRef(hapticsOn);
  useEffect(() => {
    hapticsRef.current = hapticsOn;
  }, [hapticsOn]);
  useEffect(() => {
    const onOpen = (e) => {
      if (!e.detail?.resolve) return;
      buzz(15, hapticsRef.current);
      closingRef.current = false;
      reqRef.current = e.detail;
      setState("pre");
      setReq(e.detail);
    };
    window.addEventListener("ozgym:actionsheet", onOpen);
    return () => window.removeEventListener("ozgym:actionsheet", onOpen);
  }, []);
  useEffect(() => {
    if (!req || state !== "pre") return;
    const id = requestAnimationFrame(() => setState("open"));
    return () => cancelAnimationFrame(id);
  }, [req, state]);
  const close = useCallback((id) => {
    const r = reqRef.current;
    if (!r || closingRef.current) return;
    closingRef.current = true;
    setState("closing");
    const ms = REDUCED_MOTION ? 0 : dialogCloseMs();
    window.setTimeout(() => {
      r.resolve(id);
      reqRef.current = null;
      setReq(null);
      closingRef.current = false;
      setState("pre");
    }, ms);
  }, []);
  useEffect(() => {
    if (!req || state !== "open") return;
    return trapFocus(panelRef.current, { onEscape: () => close(null) });
  }, [req, state, close]);
  if (!req) return null;
  const sheetTitleId = "ig-action-sheet-title";
  return (
    <div
      className="ig-confirm-backdrop"
      data-state={state === "pre" ? "pre" : state}
      onClick={() => close(null)}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="ig-confirm ig-action-sheet"
        role="menu"
        aria-labelledby={req.title ? sheetTitleId : undefined}
        aria-label={!req.title ? "Aktionen" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {req.title && (
          <h3 id={sheetTitleId} className="ig-confirm-title">
            {req.title}
          </h3>
        )}
        <div className="ig-action-list" role="none">
          {(req.actions || []).map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className={"ig-action-item" + (a.destructive ? " destructive" : "")}
              onClick={() => close(a.id)}
            >
              {a.icon ? <span aria-hidden="true">{a.icon}</span> : null}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ig-btn-primary wide ghosted"
          onClick={() => close(null)}
        >
          Abbrechen
        </button>
      </div>
    </div>
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
