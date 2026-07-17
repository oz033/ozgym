/* Theme Studio: der Nutzer baut sein eigenes Theme — live in der ganzen App */

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, RotateCcw, Check, Sun, Moon, ImagePlus } from "lucide-react";
import { DEFAULT_THEME_CFG } from "../lib/migrate.js";
import { EclipseMark } from "./brand.jsx";
import { trapFocus } from "../lib/dialogFocus.js";
import {
  MASCOT_CATALOG,
  getMascot,
  sampleAccentFromImage,
  resolveMascotSrc,
} from "../lib/mascots.js";

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

const MAX_CUSTOM_GIF_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB

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
  const fileRef = useRef(null);
  const [mascotBusy, setMascotBusy] = useState(false);
  const [mascotError, setMascotError] = useState("");

  useEffect(() => {
    return trapFocus(sheetRef.current, { onEscape: onClose });
  }, [onClose]);

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

  const applyMascotColors = async (src, fallbackAccent, fallback2) => {
    if (cfg.mascotTint === false) return {};
    let accent = fallbackAccent;
    let accent2 = fallback2;
    if (src) {
      const sampled = await sampleAccentFromImage(src);
      if (sampled?.accent) {
        accent = sampled.accent;
        accent2 = sampled.accent2 || accent2;
      }
    }
    if (!accent) return {};
    return { accent };
  };

  const pickMascot = async (id) => {
    setMascotError("");
    if (id === "none") {
      patch({ mascot: "none", mascotSrc: null });
      return;
    }
    const m = getMascot(id);
    if (!m?.src) return;
    setMascotBusy(true);
    try {
      const colorPatch = await applyMascotColors(m.src, m.accent, m.accent2);
      patch({ mascot: id, mascotSrc: null, ...colorPatch });
    } finally {
      setMascotBusy(false);
    }
  };

  const onCustomGif = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMascotError("");
    if (!file.type.startsWith("image/")) {
      setMascotError("Bitte ein Bild oder GIF wählen.");
      return;
    }
    if (file.size > MAX_CUSTOM_GIF_BYTES) {
      setMascotError("Max. 1,5 MB — kürzeres GIF nutzen.");
      return;
    }
    setMascotBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      if (!dataUrl) throw new Error("empty");
      const colorPatch = await applyMascotColors(dataUrl, "#c084fc", "#7c3aed");
      patch({ mascot: "custom", mascotSrc: dataUrl, ...colorPatch });
    } catch {
      setMascotError("Upload fehlgeschlagen.");
    } finally {
      setMascotBusy(false);
    }
  };

  const isCustomHex =
    cfg.accent && cfg.accent !== "mono" && !ACCENT_PRESETS.some((p) => p.id === cfg.accent);
  const activeMascot = cfg.mascot || "none";
  const previewMascotSrc = resolveMascotSrc(cfg);

  return (
    <div
      ref={sheetRef}
      className="ig-sheet"
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

      <div className="ig-sheet-body">
        {/* Live-Vorschau — rein visuell, keine toten Buttons */}
        <div className="ig-card ig-ts-preview" aria-hidden="true">
          <div className="ig-ts-preview-row">
            <EclipseMark size={22} />
            <span className="ig-ts-preview-title">Vorschau</span>
            {previewMascotSrc ? (
              <img
                className="ig-ts-mascot-preview"
                src={previewMascotSrc}
                alt=""
                width={28}
                height={28}
              />
            ) : (
              <span className="ig-badge dim mono">01</span>
            )}
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
          <div className="ig-theme-row" role="group" aria-label="Erscheinung">
            <button
              type="button"
              className={"ig-theme-btn" + (theme === "light" ? " active" : "")}
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
            >
              <Sun size={16} aria-hidden="true" /> Hell
            </button>
            <button
              type="button"
              className={"ig-theme-btn" + (theme === "dark" ? " active" : "")}
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              <Moon size={16} aria-hidden="true" /> Dunkel
            </button>
          </div>
        </div>

        {/* Header GIF / Mascot + auto accent tint */}
        <div className="ig-card">
          <div className="ig-field-label">Header-GIF</div>
          <p className="ig-plan-text" style={{ marginTop: 0 }}>
            Ersetzt das Logo neben „OZ“. Mit „Farben anpassen“ folgt der Akzent
            den GIF-Farben.
          </p>
          <div className="ig-ts-mascot-grid" role="listbox" aria-label="Header-GIF">
            {MASCOT_CATALOG.map((m) => {
              const active =
                activeMascot === m.id ||
                (m.id === "none" && (!activeMascot || activeMascot === "none"));
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={"ig-ts-mascot" + (active ? " active" : "")}
                  onClick={() => pickMascot(m.id)}
                  disabled={mascotBusy}
                >
                  {m.src ? (
                    <img src={m.src} alt="" className="ig-ts-mascot-img" />
                  ) : (
                    <span className="ig-ts-mascot-off">Aus</span>
                  )}
                  <span className="ig-ts-mascot-label">{m.label}</span>
                  {m.accent && (
                    <span
                      className="ig-ts-mascot-swatch"
                      style={{ background: m.accent }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={activeMascot === "custom"}
              className={
                "ig-ts-mascot" + (activeMascot === "custom" ? " active" : "")
              }
              onClick={() => fileRef.current?.click()}
              disabled={mascotBusy}
            >
              {activeMascot === "custom" && cfg.mascotSrc ? (
                <img src={cfg.mascotSrc} alt="" className="ig-ts-mascot-img" />
              ) : (
                <span className="ig-ts-mascot-off">
                  <ImagePlus size={18} aria-hidden="true" />
                </span>
              )}
              <span className="ig-ts-mascot-label">Eigenes</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/gif,image/png,image/webp,image/jpeg"
            className="sr-only"
            onChange={onCustomGif}
          />
          <div className="ig-num-field" style={{ marginTop: 10 }}>
            <span>Farben anpassen</span>
            <Segment
              label="Farben aus GIF"
              value={cfg.mascotTint !== false ? "on" : "off"}
              onChange={(v) => patch({ mascotTint: v === "on" })}
              options={[
                { id: "on", label: "An" },
                { id: "off", label: "Aus" },
              ]}
            />
          </div>
          {mascotBusy && (
            <p className="ig-plan-text" role="status">
              Farben werden gelesen…
            </p>
          )}
          {mascotError && (
            <p className="ig-plan-text" role="alert" style={{ color: "var(--danger)" }}>
              {mascotError}
            </p>
          )}
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
          <p className="ig-plan-text">
            „A" folgt deinem Modus (Frau/Mann). „Mono" = Schwarz/Weiß pur.
          </p>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Oberfläche</div>
          <div className="ig-num-field">
            <span>Ecken</span>
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
          <div className="ig-num-field">
            <span>Dichte</span>
            <Segment
              label="Dichte"
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
              label="Schrift"
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
              label="Button-Stil"
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
              label="Glow"
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
              label="Glas-Effekt"
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
              label="Animationen"
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
