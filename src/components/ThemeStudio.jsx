/* Theme Studio: der Nutzer baut sein eigenes Theme — live in der ganzen App */

import React from "react";
import { ChevronLeft, RotateCcw, Check, Sun, Moon } from "lucide-react";
import { DEFAULT_THEME_CFG } from "../lib/migrate.js";
import { EclipseMark } from "./brand.jsx";

const ACCENT_PRESETS = [
  { id: "mono", label: "Mono", color: null },
  { id: "#e8eaed", label: "Silver", color: "#e8eaed" },
  { id: "#f2f3f7", label: "White", color: "#f2f3f7" },
  { id: "#1a1a1c", label: "Ink", color: "#1a1a1c" },
  { id: "#9aa0ad", label: "Steel", color: "#9aa0ad" },
  { id: "#2f5bff", label: "Kobalt", color: "#2f5bff" },
  { id: "#f5a524", label: "Orange", color: "#f5a524" },
  { id: "#1f6b4f", label: "Forest", color: "#1f6b4f" },
];

function Segment({ value, options, onChange }) {
  return (
    <div className="ig-segment">
      {options.map((o) => (
        <button
          key={o.id}
          className={"ig-segment-btn" + (value === o.id ? " active" : "")}
          onClick={() => onChange(o.id)}
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

  const patch = (fields) =>
    update((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeCfg: { ...DEFAULT_THEME_CFG, ...(prev.settings?.themeCfg || {}), ...fields },
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
    <div className="ig-sheet">
      <div className="ig-sheet-head">
        <button className="ig-icon-btn ghost" onClick={onClose} aria-label="Zurück">
          <ChevronLeft size={20} />
        </button>
        <span className="ig-sheet-title">Theme Studio</span>
        <button className="ig-icon-btn ghost" onClick={reset} aria-label="Zurücksetzen">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="ig-sheet-body">
        {/* Live-Vorschau — rein visuell, keine toten Buttons */}
        <div className="ig-card ig-ts-preview" aria-hidden="true">
          <div className="ig-ts-preview-row">
            <EclipseMark size={22} />
            <span className="ig-ts-preview-title">Vorschau</span>
            <span className="ig-badge dim mono">01</span>
          </div>
          <div className="ig-level-track">
            <div className="ig-level-fill" style={{ width: "64%" }} />
          </div>
          <div className="ig-ts-preview-row">
            <span className="ig-btn-primary ig-ts-fake-btn" style={{ flex: 1 }}>
              <Check size={15} /> Primär
            </span>
            <span className="ig-btn-primary ghosted ig-ts-fake-btn" style={{ flex: 1 }}>
              Sekundär
            </span>
          </div>
          <div className="ig-plan-badges">
            <span className="ig-chip sm active">Aktiv</span>
            <span className="ig-chip sm">Chip</span>
            <span className="ig-badge">3 × 10</span>
          </div>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Erscheinung</div>
          <div className="ig-theme-row">
            <button
              className={"ig-theme-btn" + (theme === "light" ? " active" : "")}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} /> Hell
            </button>
            <button
              className={"ig-theme-btn" + (theme === "dark" ? " active" : "")}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} /> Dunkel
            </button>
          </div>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Akzentfarbe</div>
          <div className="ig-ts-swatches">
            <button
              className={"ig-ts-swatch mode" + (cfg.accent === null ? " active" : "")}
              onClick={() => patch({ accent: null })}
              title="Automatisch (folgt deinem Modus)"
            >
              A
            </button>
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.id}
                className={"ig-ts-swatch" + (cfg.accent === p.id ? " active" : "")}
                style={
                  p.color
                    ? { background: p.color }
                    : { background: "linear-gradient(135deg,#f2f3f7 50%,#0c0d12 50%)" }
                }
                onClick={() => patch({ accent: p.id })}
                title={p.label}
                aria-label={`Akzent ${p.label}`}
              />
            ))}
            <label
              className={"ig-ts-swatch custom" + (isCustomHex ? " active" : "")}
              title="Eigene Farbe"
              style={isCustomHex ? { background: cfg.accent } : undefined}
            >
              +
              <input
                type="color"
                value={isCustomHex ? cfg.accent : "#8b5cf6"}
                onChange={(e) => patch({ accent: e.target.value })}
              />
            </label>
          </div>
          <p className="ig-plan-text">
            „A" folgt deinem Modus (Frau/Mann). „Mono" = Schwarz/Weiß pur.
          </p>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Oberfläche</div>
          <div className="ig-num-field">
            <span>Ecken</span>
            <Segment
              value={cfg.radius}
              onChange={(v) => patch({ radius: v })}
              options={[
                { id: "round", label: "Rund" },
                { id: "sharp", label: "Kantig" },
              ]}
            />
          </div>
          <div className="ig-num-field">
            <span>Dichte</span>
            <Segment
              value={cfg.density}
              onChange={(v) => patch({ density: v })}
              options={[
                { id: "cozy", label: "Großzügig" },
                { id: "compact", label: "Kompakt" },
              ]}
            />
          </div>
          <div className="ig-num-field">
            <span>Schrift</span>
            <Segment
              value={cfg.font}
              onChange={(v) => patch({ font: v })}
              options={[
                { id: "grotesk", label: "Grotesk" },
                { id: "mono", label: "Mono" },
              ]}
            />
          </div>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Effekte</div>
          <div className="ig-num-field">
            <span>Buttons & Balken</span>
            <Segment
              value={cfg.gradient ? "grad" : "flat"}
              onChange={(v) => patch({ gradient: v === "grad" })}
              options={[
                { id: "grad", label: "Verlauf" },
                { id: "flat", label: "Flach" },
              ]}
            />
          </div>
          <div className="ig-num-field">
            <span>Glow</span>
            <Segment
              value={cfg.glow ? "on" : "off"}
              onChange={(v) => patch({ glow: v === "on" })}
              options={[
                { id: "on", label: "An" },
                { id: "off", label: "Aus" },
              ]}
            />
          </div>
          <div className="ig-num-field">
            <span>Glas-Effekt</span>
            <Segment
              value={cfg.glass ? "on" : "off"}
              onChange={(v) => patch({ glass: v === "on" })}
              options={[
                { id: "on", label: "An" },
                { id: "off", label: "Aus" },
              ]}
            />
          </div>
          <div className="ig-num-field">
            <span>Animationen</span>
            <Segment
              value={cfg.motion}
              onChange={(v) => patch({ motion: v })}
              options={[
                { id: "full", label: "Voll" },
                { id: "reduced", label: "Dezent" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
