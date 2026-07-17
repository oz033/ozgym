/* Theme Studio: Farben, Ecken, Motion — ohne Icon/Mascot-Upload */

import React, { useEffect, useRef } from "react";
import { ChevronLeft, RotateCcw, Sun, Moon } from "lucide-react";
import { DEFAULT_THEME_CFG } from "../lib/migrate.js";
import { trapFocus } from "../lib/dialogFocus.js";

/* B&W first — color accents optional only */
const ACCENT_PRESETS = [
  { id: "mono", label: "B/W", color: null },
  { id: "#b8f24a", label: "Lime", color: "#b8f24a" },
  { id: "#e8eaed", label: "Silver", color: "#e8eaed" },
  { id: "#ffffff", label: "White", color: "#ffffff" },
  { id: "#a3a3a3", label: "Gray", color: "#a3a3a3" },
  { id: "#2f5bff", label: "Kobalt", color: "#2f5bff" },
  { id: "#f5a524", label: "Orange", color: "#f5a524" },
];

function Segment({ value, options, onChange, label }) {
  return (
    <div
      className="ig-segment"
      role="group"
      aria-label={label || "Optionen"}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={"ig-segment-btn" + (value === o.id ? " active" : "")}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ThemeStudio({ data, update, onClose }) {
  const cfg = { ...DEFAULT_THEME_CFG, ...(data.settings?.themeCfg || {}) };
  const theme = data.settings?.theme || "dark";
  const sheetRef = useRef(null);

  useEffect(() => {
    return trapFocus(sheetRef.current, { onEscape: onClose });
  }, [onClose]);

  const patch = (fields) =>
    update((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeCfg: {
          ...DEFAULT_THEME_CFG,
          ...(prev.settings?.themeCfg || {}),
          ...fields,
          mascot: "none",
          mascotSrc: null,
        },
      },
    }));

  const setTheme = (t) =>
    update((prev) => ({ ...prev, settings: { ...prev.settings, theme: t } }));

  const reset = () =>
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, themeCfg: { ...DEFAULT_THEME_CFG } },
    }));

  const isCustomHex =
    cfg.accent && cfg.accent !== "mono" && !ACCENT_PRESETS.some((p) => p.id === cfg.accent);

  return (
    <div
      ref={sheetRef}
      className="ig-sheet ig-ts-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ig-ts-title"
    >
      <div className="ig-sheet-head">
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={onClose}
          aria-label="Theme Studio schließen"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2 id="ig-ts-title" className="ig-sheet-title">
          Theme Studio
        </h2>
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={reset}
          aria-label="Theme zurücksetzen"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="ig-sheet-body ig-ts-body">
        {/* Hell / Dunkel + Akzent in einer Karte */}
        <div className="ig-card ig-ts-card">
          <div className="ig-theme-row ig-ts-theme-row" role="group" aria-label="Erscheinung">
            <button
              type="button"
              className={"ig-theme-btn ig-ts-theme-btn" + (theme === "light" ? " active" : "")}
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
            >
              <Sun size={15} aria-hidden="true" /> Hell
            </button>
            <button
              type="button"
              className={"ig-theme-btn ig-ts-theme-btn" + (theme === "dark" ? " active" : "")}
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              <Moon size={15} aria-hidden="true" /> Dunkel
            </button>
          </div>
          <div className="ig-ts-swatches">
            <button
              type="button"
              className={"ig-ts-swatch mode" + (cfg.accent === null ? " active" : "")}
              onClick={() => patch({ accent: null })}
              title="Standard-Akzent"
            >
              A
            </button>
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={"ig-ts-swatch" + (cfg.accent === p.id ? " active" : "")}
                style={
                  p.color
                    ? { background: p.color }
                    : { background: "linear-gradient(135deg,#f2f3f7 50%,#0c0d12 50%)" }
                }
                onClick={() => patch({ accent: p.id })}
                title={p.label}
                aria-label={`Akzent ${p.label}`}
                aria-pressed={cfg.accent === p.id}
              />
            ))}
            <label
              className={"ig-ts-swatch custom" + (isCustomHex ? " active" : "")}
              title="Eigene Farbe"
              style={isCustomHex ? { background: cfg.accent } : undefined}
            >
              <span className="sr-only">Eigene Akzentfarbe wählen</span>
              <span aria-hidden="true">+</span>
              <input
                type="color"
                value={isCustomHex ? cfg.accent : "#8b5cf6"}
                onChange={(e) => patch({ accent: e.target.value })}
                aria-label="Eigene Akzentfarbe"
              />
            </label>
          </div>
        </div>

        {/* Alle Optionen in einer dichten Karte — alles auf einen Blick */}
        <div className="ig-card ig-ts-card">
          <div className="ig-ts-opts">
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Ecken</span>
              <Segment
                label="Ecken"
                value={cfg.radius}
                onChange={(v) => patch({ radius: v })}
                options={[
                  { id: "round", label: "Rund" },
                  { id: "sharp", label: "Kantig" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Dichte</span>
              <Segment
                label="Dichte"
                value={cfg.density}
                onChange={(v) => patch({ density: v })}
                options={[
                  { id: "cozy", label: "Weit" },
                  { id: "compact", label: "Eng" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Schrift</span>
              <Segment
                label="Schrift"
                value={cfg.font}
                onChange={(v) => patch({ font: v })}
                options={[
                  { id: "grotesk", label: "Grotesk" },
                  { id: "mono", label: "Mono" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Animation</span>
              <Segment
                label="Animationen"
                value={cfg.motion}
                onChange={(v) => patch({ motion: v })}
                options={[
                  { id: "full", label: "Voll" },
                  { id: "reduced", label: "Dezent" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Buttons</span>
              <Segment
                label="Button-Stil"
                value={cfg.gradient ? "grad" : "flat"}
                onChange={(v) => patch({ gradient: v === "grad" })}
                options={[
                  { id: "grad", label: "Verlauf" },
                  { id: "flat", label: "Flach" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Glow</span>
              <Segment
                label="Glow"
                value={cfg.glow ? "on" : "off"}
                onChange={(v) => patch({ glow: v === "on" })}
                options={[
                  { id: "on", label: "An" },
                  { id: "off", label: "Aus" },
                ]}
              />
            </div>
            <div className="ig-ts-opt">
              <span className="ig-ts-opt-lbl">Glas</span>
              <Segment
                label="Glas-Effekt"
                value={cfg.glass ? "on" : "off"}
                onChange={(v) =>
                  patch({ glass: v === "on", glassUserSet: true })
                }
                options={[
                  { id: "on", label: "An" },
                  { id: "off", label: "Aus" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
