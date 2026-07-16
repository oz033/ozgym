/* Warm-up / Cool-down: zuweisbare Vorlagen am Trainingsplan */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  Check,
  Plus,
  Search,
  Sparkles,
  X,
  Flame,
  Wind,
} from "lucide-react";
import { ZONE_LABEL, MUSCLE_NAME } from "../lib/constants.js";
import {
  CARDIO_INTENSITIES,
  zonesFromPlan,
  focusLabelForZones,
  filterPrepCatalog,
  prepItemFromCatalog,
  prepItemFromCustom,
  prepItemFromLibrary,
  suggestCooldownForPlan,
  suggestWarmupForPlan,
  formatPrepMeta,
  blankPrepTemplate,
  getPrepTemplate,
  getAlwaysTopWarmupItems,
  ALWAYS_TOP_WARMUP_IDS,
} from "../lib/stretches.js";
import { findExerciseMedia } from "../lib/exerciseMedia.js";
import { showToast } from "./ui.jsx";

/** Sheet über Topbar/Tabbar — in .ig-app (Theme-Vars), nicht in motion-Container. */
function prepPortal(node) {
  if (typeof document === "undefined") return node;
  const root = document.querySelector(".ig-app") || document.body;
  return createPortal(node, root);
}

/** Kompakte Chips rechts neben dem Plan-Titel */
export function PlanPrepChips({ plan, templates, onWarmup, onCooldown, compact = false }) {
  const wu = getPrepTemplate(templates, plan?.warmupTemplateId);
  const cd = getPrepTemplate(templates, plan?.cooldownTemplateId);

  return (
    <div
      className={"ig-plan-prep-chips" + (compact ? " compact" : "")}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={"ig-plan-prep-chip" + (wu?.items?.length ? " set" : "")}
        onClick={(e) => {
          e.stopPropagation();
          onWarmup?.(e);
        }}
        aria-label={
          wu?.items?.length
            ? `Warm-up: ${wu.items.length} Übungen bearbeiten`
            : "Warm-up hinzufügen"
        }
      >
        {wu?.items?.length ? (
          <>
            <Flame size={12} aria-hidden="true" />
            <span>Warm-up</span>
            <span className="ig-plan-prep-n mono">{wu.items.length}</span>
          </>
        ) : (
          <>
            <Plus size={12} aria-hidden="true" />
            <span>Warm-up</span>
          </>
        )}
      </button>
      <button
        type="button"
        className={"ig-plan-prep-chip cool" + (cd?.items?.length ? " set" : "")}
        onClick={(e) => {
          e.stopPropagation();
          onCooldown?.(e);
        }}
        aria-label={
          cd?.items?.length
            ? `Cool-down: ${cd.items.length} Übungen bearbeiten`
            : "Cool-down hinzufügen"
        }
      >
        {cd?.items?.length ? (
          <>
            <Wind size={12} aria-hidden="true" />
            <span>Cool-down</span>
            <span className="ig-plan-prep-n mono">{cd.items.length}</span>
          </>
        ) : (
          <>
            <Plus size={12} aria-hidden="true" />
            <span>Cool-down</span>
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Warm-up / Cool-down: direkt im Editor. Leer starten — Nutzer baut selbst.
 */
export function PrepAssignSheet({ kind, plan, data, update, onClose }) {
  const field = kind === "cooldown" ? "cooldownTemplateId" : "warmupTemplateId";
  const assignedId = plan?.[field] || null;
  const title = kind === "cooldown" ? "Cool-down" : "Warm-up";
  const [editingId, setEditingId] = useState(assignedId || null);
  const bootRef = useRef(false);

  // Direkt Editor öffnen: zugewiesen → öffnen, sonst leere Vorlage anlegen.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    if (assignedId) {
      setEditingId(assignedId);
      return;
    }

    const t = blankPrepTemplate(kind, `${plan.name || "Plan"} · ${title}`);
    t.items = [];

    update((prev) => ({
      ...prev,
      prepTemplates: [...(prev.prepTemplates || []), t],
      plans: (prev.plans || []).map((p) =>
        p.id === plan.id ? { ...p, [field]: t.id } : p,
      ),
    }));
    setEditingId(t.id);
  }, [assignedId, field, kind, plan, title, update]);

  const templates = data.prepTemplates || [];
  const editing =
    templates.find((t) => t.id === editingId) ||
    (editingId ? getPrepTemplate(templates, editingId) : null);

  // Ein Frame, bis create/update die Vorlage hat
  if (!editing) {
    return prepPortal(
      <div className="ig-sheet ig-sheet-over ig-prep-editor-sheet">
        <div className="ig-prep-title-bar">
          <span className="ig-sheet-title">{title}</span>
        </div>
        <div className="ig-sheet-body">
          <p className="ig-empty">Lädt…</p>
        </div>
        <div className="ig-prep-footer-nav ig-prep-footer-fixed">
          <button type="button" className="ig-btn-secondary" onClick={onClose}>
            <ChevronLeft size={16} /> Zurück
          </button>
          <button type="button" className="ig-btn-primary" onClick={onClose}>
            <Check size={16} /> Fertig
          </button>
        </div>
      </div>,
    );
  }

  return (
    <PrepTemplateEditor
      template={editing}
      plan={plan}
      data={data}
      update={update}
      onClose={onClose}
      onDone={onClose}
    />
  );
}

/** Übungen einer Vorlage bearbeiten (Smart-Filter + Cardio) */
function thumbUrlForItem(item) {
  // Nur echte Medien: direkte URL oder exakter Dataset-Treffer (kein Fuzzy).
  if (item?.gif || item?.image) return item.gif || item.image;
  if (!item?.mediaName) return null;
  const media = findExerciseMedia(item.mediaName);
  return media?.gifUrl || media?.imageUrl || null;
}

function PrepTemplateEditor({ template, plan, data, update, onClose, onDone }) {
  const [showPicker, setShowPicker] = useState(false);
  /** Index der aufgeklappten Zeile zum Bearbeiten */
  const [editIdx, setEditIdx] = useState(null);
  const kind = template.kind;
  const title = kind === "cooldown" ? "Cool-down" : "Warm-up";

  const byId = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [data.library]);

  const planZones = useMemo(() => zonesFromPlan(plan, byId), [plan, byId]);
  const focusLabel = focusLabelForZones(planZones);

  const patchTemplate = (fieldsOrFn) => {
    update((prev) => ({
      ...prev,
      prepTemplates: (prev.prepTemplates || []).map((t) => {
        if (t.id !== template.id) return t;
        const fields =
          typeof fieldsOrFn === "function" ? fieldsOrFn(t) : fieldsOrFn;
        return { ...t, ...fields };
      }),
    }));
  };

  // Live template from data
  const live =
    (data.prepTemplates || []).find((t) => t.id === template.id) || template;
  const items = live.items || [];

  const removeItem = (idx) =>
    patchTemplate((t) => ({
      items: (t.items || []).filter((_, i) => i !== idx),
    }));

  const patchItem = (idx, fields) =>
    patchTemplate((t) => ({
      items: (t.items || []).map((it, i) =>
        i === idx ? { ...it, ...fields } : it,
      ),
    }));

  // Fertiges Prep-Item anhängen (aus Picker inkl. Minuten-Config)
  const addItem = (entry, { keepOpen = true } = {}) => {
    let item = entry;
    if (!entry) return;
    if (entry.custom === true || entry._custom) {
      item = entry;
    } else if (entry.catalogId && entry.name && (entry.seconds != null || entry.reps != null || entry.kind)) {
      // bereits aufbereitet (z. B. nach Minuten-Dialog)
      item = { ...entry };
    } else if (entry._fromLibrary) {
      item = prepItemFromLibrary(
        entry,
        kind === "cooldown" ? "static_stretch" : "warmup",
      );
    } else {
      item = prepItemFromCatalog(entry);
    }
    if (!item?.name) return;
    patchTemplate((t) => ({
      items: [...(t.items || []), item],
    }));
    if (!keepOpen) setShowPicker(false);
  };

  const smartFill = () => {
    const list =
      kind === "cooldown"
        ? suggestCooldownForPlan(plan, byId, 6)
        : suggestWarmupForPlan(plan, byId, 6);
    if (!list.length) {
      showToast("Zuerst Übungen im Trainingsplan setzen", "info");
      return;
    }
    patchTemplate({ items: list });
  };

  /** Leere Auto-Vorlage entfernen + Zuweisung am Plan lösen */
  const cleanupEmptyTemplate = () => {
    const liveItems = live.items || [];
    if (liveItems.length > 0) return;
    const field =
      kind === "cooldown" ? "cooldownTemplateId" : "warmupTemplateId";
    update((prev) => ({
      ...prev,
      prepTemplates: (prev.prepTemplates || []).filter(
        (t) => t.id !== template.id,
      ),
      plans: (prev.plans || []).map((p) =>
        p[field] === template.id ? { ...p, [field]: null } : p,
      ),
    }));
  };

  const goBack = () => {
    cleanupEmptyTemplate();
    onClose();
  };
  const finish = () => {
    cleanupEmptyTemplate();
    if (onDone) onDone();
    else onClose();
  };

  // Picker als eigener Fullscreen-Screen (Portal) — nicht im motion-Tab
  // verschachteln, sonst sind Zurück/Fertig unsichtbar unter Topbar/Tabbar.
  if (showPicker) {
    return (
      <PrepExercisePicker
        mode={kind === "cooldown" ? "cooldown" : "warmup"}
        planZones={planZones}
        focusLabel={focusLabel}
        library={data.library || []}
        usedIds={items.map((x) => x.catalogId || x.id)}
        onPick={addItem}
        onClose={() => setShowPicker(false)}
      />
    );
  }

  return prepPortal(
    <div className="ig-sheet ig-sheet-over ig-prep-editor-sheet">
      {/* Titel oben, Navigation nur unten */}
      <div className="ig-prep-title-bar">
        <input
          className="ig-sheet-title-input ig-prep-title-input"
          value={live.name}
          onChange={(e) => patchTemplate({ name: e.target.value })}
          placeholder={`${title}-Name`}
        />
      </div>

      <div className="ig-sheet-body ig-prep-editor-body">
        <div className="ig-prep-toolbar">
          <span className="ig-prep-toolbar-count mono">
            {items.length} Übungen
            {focusLabel ? ` · ${focusLabel}` : ""}
          </span>
          <div className="ig-prep-section-actions">
            {kind === "cooldown" && (
              <button type="button" className="ig-chip sm" onClick={smartFill}>
                <Sparkles size={12} /> Smart
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                className="ig-chip sm"
                onClick={() => patchTemplate({ items: [] })}
              >
                Leeren
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="ig-prep-empty-box">
            <p className="ig-empty" style={{ margin: 0 }}>
              Noch keine Übungen.
            </p>
            <button
              type="button"
              className="ig-btn-primary wide ig-prep-add-btn"
              onClick={() => setShowPicker(true)}
            >
              <Plus size={16} />{" "}
              {kind === "cooldown"
                ? "Cool-down hinzufügen"
                : "Warm-up hinzufügen"}
            </button>
          </div>
        ) : (
          <>
            <div className="ig-pe-list ig-prep-list-rich">
              {items.map((item, i) => {
                const thumb = thumbUrlForItem(item);
                const open = editIdx === i;
                const isCardio = item.kind === "cardio";
                const secs = Math.max(
                  isCardio ? 30 : 10,
                  Number(item.seconds) || (isCardio ? 300 : 30),
                );
                const mins = Math.max(1, Math.round(secs / 60));
                return (
                  <div
                    key={(item.id || item.name) + i}
                    className={"ig-prep-item-card" + (open ? " open" : "")}
                  >
                    <button
                      type="button"
                      className="ig-prep-item-head"
                      onClick={() => setEditIdx(open ? null : i)}
                      aria-expanded={open}
                    >
                      <span className="ig-pe-num mono">{i + 1}</span>
                      <span className="ig-prep-item-thumb">
                        {thumb ? (
                          <img src={thumb} alt="" loading="lazy" />
                        ) : (
                          <span className="ig-picker-thumb-ph">
                            {(item.name || "?").slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <span className="ig-prep-row-main">
                        <span className="ig-prep-row-name">{item.name}</span>
                        <span className="ig-prep-meta dim">
                          {formatPrepMeta(item)}
                        </span>
                      </span>
                      <span className="ig-prep-item-edit-hint dim">
                        {open ? "▲" : "Bearbeiten"}
                      </span>
                    </button>

                    {open && (
                      <div className="ig-prep-item-edit">
                        {/* Cardio in Minuten, Dehnungen/Mobility in Sekunden */}
                        {isCardio ? (
                          <label className="ig-prep-draft-field">
                            <span>Minuten</span>
                            <div className="ig-prep-draft-stepper">
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    seconds: Math.max(60, secs - 60),
                                    reps: null,
                                  })
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="90"
                                value={mins}
                                onChange={(ev) =>
                                  patchItem(i, {
                                    seconds:
                                      Math.max(
                                        1,
                                        Number(ev.target.value) || 1,
                                      ) * 60,
                                    reps: null,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    seconds: Math.min(90 * 60, secs + 60),
                                    reps: null,
                                  })
                                }
                              >
                                +
                              </button>
                            </div>
                          </label>
                        ) : item.seconds != null || !item.reps ? (
                          <label className="ig-prep-draft-field">
                            <span>Sekunden halten</span>
                            <div className="ig-prep-draft-stepper">
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    seconds: Math.max(10, secs - 5),
                                    reps: null,
                                  })
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="10"
                                max="600"
                                value={secs}
                                onChange={(ev) =>
                                  patchItem(i, {
                                    seconds: Math.max(
                                      10,
                                      Math.min(
                                        600,
                                        Number(ev.target.value) || 30,
                                      ),
                                    ),
                                    reps: null,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    seconds: Math.min(600, secs + 5),
                                    reps: null,
                                  })
                                }
                              >
                                +
                              </button>
                            </div>
                          </label>
                        ) : null}

                        {!isCardio && (
                          <label className="ig-prep-draft-field">
                            <span>Wiederholungen</span>
                            <div className="ig-prep-draft-stepper">
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    reps: Math.max(1, (item.reps || 10) - 1),
                                    seconds: null,
                                  })
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={item.reps ?? ""}
                                placeholder="–"
                                onChange={(ev) =>
                                  patchItem(i, {
                                    reps:
                                      ev.target.value === ""
                                        ? null
                                        : Math.max(
                                            1,
                                            Number(ev.target.value) || 1,
                                          ),
                                    seconds:
                                      ev.target.value === ""
                                        ? item.seconds || 30
                                        : null,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="ig-icon-btn ghost sm"
                                onClick={() =>
                                  patchItem(i, {
                                    reps: Math.min(100, (item.reps || 10) + 1),
                                    seconds: null,
                                  })
                                }
                              >
                                +
                              </button>
                            </div>
                          </label>
                        )}

                        {isCardio && (
                          <>
                            <label className="ig-prep-draft-field">
                              <span>Distanz km (optional)</span>
                              <input
                                className="ig-input"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="–"
                                value={item.distanceKm ?? ""}
                                onChange={(ev) =>
                                  patchItem(i, {
                                    distanceKm:
                                      ev.target.value === ""
                                        ? null
                                        : Number(ev.target.value),
                                  })
                                }
                              />
                            </label>
                            <div className="ig-prep-draft-field">
                              <span>Intensität</span>
                              <div
                                className="ig-picker-chips wrap"
                                style={{ padding: 0 }}
                              >
                                {CARDIO_INTENSITIES.map((lvl) => (
                                  <button
                                    key={lvl.id}
                                    type="button"
                                    className={
                                      "ig-chip sm" +
                                      ((item.intensity || "moderat") ===
                                      lvl.id
                                        ? " active"
                                        : "")
                                    }
                                    onClick={() =>
                                      patchItem(i, { intensity: lvl.id })
                                    }
                                  >
                                    {lvl.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <label className="ig-prep-draft-field">
                          <span>Notiz</span>
                          <input
                            className="ig-input"
                            placeholder="optional"
                            value={item.note || ""}
                            onChange={(ev) =>
                              patchItem(i, { note: ev.target.value })
                            }
                          />
                        </label>

                        <div className="ig-prep-item-edit-actions">
                          <button
                            type="button"
                            className="ig-btn-secondary sm"
                            onClick={() => setEditIdx(null)}
                          >
                            Fertig
                          </button>
                          <button
                            type="button"
                            className="ig-btn-secondary sm danger"
                            onClick={() => {
                              removeItem(i);
                              setEditIdx(null);
                            }}
                          >
                            <X size={14} /> Entfernen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="ig-btn-secondary wide ig-prep-add-btn"
              onClick={() => setShowPicker(true)}
            >
              <Plus size={15} /> Übung hinzufügen
            </button>
          </>
        )}
      </div>

      <div className="ig-prep-footer-nav ig-prep-footer-fixed">
        <button type="button" className="ig-btn-secondary" onClick={goBack}>
          <ChevronLeft size={16} /> Zurück
        </button>
        <button type="button" className="ig-btn-primary" onClick={finish}>
          <Check size={16} /> Fertig
        </button>
      </div>
    </div>,
  );
}

function PrepExercisePicker({
  mode,
  planZones,
  focusLabel,
  library = [],
  usedIds,
  onPick,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customSeconds, setCustomSeconds] = useState("30");
  const [customReps, setCustomReps] = useState("");
  const [customNote, setCustomNote] = useState("");
  /** Draft vor dem Hinzufügen: Minuten / Wdh. einstellen */
  const [draft, setDraft] = useState(null);

  const toPrepItem = (e) => {
    if (e?._fromLibrary) {
      return prepItemFromLibrary(
        e,
        mode === "cooldown" ? "static_stretch" : "warmup",
      );
    }
    return prepItemFromCatalog(e);
  };

  const openDraft = (e) => {
    if (usedIds.includes(e.id)) return;
    const base = toPrepItem(e);
    const isCardio = base.kind === "cardio";
    setDraft({
      ...base,
      seconds:
        base.seconds != null
          ? base.seconds
          : isCardio
            ? 300
            : base.reps
              ? null
              : 30,
      reps: base.reps != null ? base.reps : isCardio ? null : base.seconds ? null : 10,
      intensity: base.intensity || (isCardio ? "moderat" : null),
      distanceKm: base.distanceKm ?? null,
    });
    setShowCustom(false);
  };

  const confirmDraft = () => {
    if (!draft?.name) return;
    onPick({ ...draft }, { keepOpen: true });
    setDraft(null);
  };

  const submitCustom = () => {
    const name = customName.trim();
    if (!name) {
      showToast("Name eingeben", "error");
      return;
    }
    // Eigene Übung: ebenfalls in Draft-Dialog mit Sek/Wdh
    setDraft(
      prepItemFromCustom({
        name,
        kind: mode === "cooldown" ? "static_stretch" : "warmup",
        zone: null,
        seconds: customReps ? null : Number(customSeconds) || 30,
        reps: customReps ? Number(customReps) || 10 : null,
        note: customNote.trim(),
      }),
    );
    setCustomName("");
    setCustomNote("");
    setCustomSeconds("30");
    setCustomReps("");
    setShowCustom(false);
  };

  const q = query.trim();
  const searching = q.length > 0;
  const ql = q.toLowerCase();

  const { recommended, rest } = useMemo(() => {
    if (mode === "cooldown") {
      const list = filterPrepCatalog({
        mode: "cooldown",
        planZones,
        query: q,
        smart: !searching,
        excludeIds: usedIds,
      });
      return { recommended: list, rest: [] };
    }

    const top = getAlwaysTopWarmupItems(usedIds);
    if (!searching) {
      return { recommended: top, rest: [] };
    }

    const base = filterPrepCatalog({
      mode: "warmup",
      planZones,
      query: q,
      smart: false,
      excludeIds: usedIds,
    });
    const cardio = filterPrepCatalog({
      mode: "cardio",
      planZones,
      query: q,
      smart: false,
      excludeIds: usedIds,
    });
    const ids = new Set([...base, ...cardio].map((x) => x.id));
    const prepHits = [...base, ...cardio.filter((c) => !ids.has(c.id))];

    const usedSet = new Set(usedIds);
    const libHits = (library || [])
      .filter((e) => {
        if (usedSet.has(e.id) || ids.has(e.id)) return false;
        if (!e.gif && !e.image) return false;
        const blob = [
          e.name,
          e.equipment,
          e.target,
          e.muscle,
          MUSCLE_NAME[e.muscle],
          ZONE_LABEL[e.zone],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(ql);
      })
      .slice(0, 40)
      .map((e) => ({
        ...e,
        kind: "warmup",
        zones: e.zone ? [e.zone] : [],
        mediaName: e.name,
        _fromLibrary: true,
      }));

    const topIds = new Set(ALWAYS_TOP_WARMUP_IDS);
    const topOrder = Object.fromEntries(
      ALWAYS_TOP_WARMUP_IDS.map((id, i) => [id, i]),
    );
    const pinned = prepHits
      .filter((e) => topIds.has(e.id))
      .sort((a, b) => (topOrder[a.id] ?? 99) - (topOrder[b.id] ?? 99));
    const other = [
      ...prepHits.filter((e) => !topIds.has(e.id)),
      ...libHits,
    ].sort((a, b) => {
      const ag = a.gif || a.image ? 0 : 1;
      const bg = b.gif || b.image ? 0 : 1;
      return ag - bg || a.name.localeCompare(b.name, "de");
    });

    return { recommended: pinned, rest: other };
  }, [mode, planZones, q, searching, usedIds, library, ql]);

  const title =
    mode === "cooldown" ? "Cool-down-Übung" : "Warm-up / Cardio";

  const thumbFor = (e) => {
    if (e.gif || e.image) return e.gif || e.image;
    // Nur mediaName mit exaktem Match — Anzeigename nicht fuzzy matchen
    if (!e.mediaName) return null;
    const media = findExerciseMedia(e.mediaName);
    return media?.gifUrl || media?.imageUrl || null;
  };

  const handleBack = () => {
    if (draft) {
      setDraft(null);
      return;
    }
    if (showCustom) {
      setShowCustom(false);
      return;
    }
    onClose();
  };

  const renderRow = (e) => {
    const used = usedIds.includes(e.id);
    const thumb = thumbFor(e);
    return (
      <li key={e.id} className="ig-picker-row media ig-prep-picker-row">
        <button
          type="button"
          className="ig-picker-main media ig-prep-pick-btn"
          disabled={used}
          onClick={() => openDraft(e)}
        >
          <span className="ig-picker-thumb">
            {thumb ? (
              <img src={thumb} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="ig-picker-thumb-ph">
                {(e.name || "?").slice(0, 1)}
              </span>
            )}
          </span>
          <span className="ig-picker-text">
            <span className="ig-picker-name">{e.name}</span>
            <span className="ig-picker-meta">
              {[
                formatPrepMeta(toPrepItem(e)),
                e.kind === "cardio"
                  ? "Cardio"
                  : e._fromLibrary
                    ? "Bibliothek"
                    : e.zones?.length
                      ? e.zones.map((z) => ZONE_LABEL[z] || z).join(", ")
                      : "Allgemein",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="ig-prep-pick-plus" aria-hidden="true">
            {used ? <Check size={18} /> : <Plus size={18} />}
          </span>
        </button>
      </li>
    );
  };

  const draftIsCardio = draft?.kind === "cardio";
  const draftSecs = Math.max(
    draftIsCardio ? 30 : 10,
    Number(draft?.seconds) || (draftIsCardio ? 300 : 30),
  );
  const draftMin = Math.max(1, Math.round(draftSecs / 60));

  return prepPortal(
    <div className="ig-sheet ig-sheet-over ig-prep-picker-sheet">
      {/* Nur Titel oben — Zurück/Fertig nur unten unter der Liste */}
      <div className="ig-prep-title-bar">
        <span className="ig-sheet-title" style={{ textAlign: "center", width: "100%" }}>
          {draft ? draft.name : title}
        </span>
      </div>

      {draft ? (
        <div className="ig-sheet-body ig-prep-editor-body">
          <div className="ig-card ig-prep-draft-card">
            <div className="ig-prep-draft-head">
              {thumbFor(draft) ? (
                <span className="ig-picker-thumb">
                  <img src={thumbFor(draft)} alt="" />
                </span>
              ) : null}
              <div>
                <div className="ig-field-label" style={{ margin: 0 }}>
                  {draftIsCardio ? "Cardio" : "Übung"}
                </div>
                <h3 className="ig-prep-draft-name">{draft.name}</h3>
              </div>
            </div>

            {draftIsCardio ? (
              <label className="ig-prep-draft-field">
                <span>Minuten</span>
                <div className="ig-prep-draft-stepper">
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.max(60, (d.seconds || 300) - 60),
                        reps: null,
                      }))
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="90"
                    value={draftMin}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.max(1, Number(ev.target.value) || 1) * 60,
                        reps: null,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.min(90 * 60, (d.seconds || 300) + 60),
                        reps: null,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </label>
            ) : draft.seconds != null || !draft.reps ? (
              <label className="ig-prep-draft-field">
                <span>Sekunden halten</span>
                <div className="ig-prep-draft-stepper">
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.max(10, (d.seconds || 30) - 5),
                        reps: null,
                      }))
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="600"
                    value={draftSecs}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.max(
                          10,
                          Math.min(600, Number(ev.target.value) || 30),
                        ),
                        reps: null,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        seconds: Math.min(600, (d.seconds || 30) + 5),
                        reps: null,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </label>
            ) : null}

            {!draftIsCardio && (
              <label className="ig-prep-draft-field">
                <span>Wiederholungen (optional)</span>
                <div className="ig-prep-draft-stepper">
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        reps: Math.max(1, (d.reps || 10) - 1),
                        seconds: null,
                      }))
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={draft.reps ?? ""}
                    placeholder="–"
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        reps:
                          ev.target.value === ""
                            ? null
                            : Math.max(1, Number(ev.target.value) || 1),
                        seconds:
                          ev.target.value === "" ? d.seconds || 30 : null,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        reps: Math.min(100, (d.reps || 10) + 1),
                        seconds: null,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </label>
            )}

            {draftIsCardio && (
              <>
                <label className="ig-prep-draft-field">
                  <span>Distanz km (optional)</span>
                  <input
                    className="ig-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="–"
                    value={draft.distanceKm ?? ""}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        distanceKm:
                          ev.target.value === ""
                            ? null
                            : Number(ev.target.value),
                      }))
                    }
                  />
                </label>
                <div className="ig-prep-draft-field">
                  <span>Intensität</span>
                  <div className="ig-picker-chips wrap" style={{ padding: 0 }}>
                    {CARDIO_INTENSITIES.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        className={
                          "ig-chip sm" +
                          ((draft.intensity || "moderat") === lvl.id
                            ? " active"
                            : "")
                        }
                        onClick={() =>
                          setDraft((d) => ({ ...d, intensity: lvl.id }))
                        }
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <label className="ig-prep-draft-field">
              <span>Notiz (optional)</span>
              <input
                className="ig-input"
                placeholder="z. B. Stufe 5"
                value={draft.note || ""}
                onChange={(ev) =>
                  setDraft((d) => ({ ...d, note: ev.target.value }))
                }
              />
            </label>

            <div className="ig-prep-draft-actions">
              <button
                type="button"
                className="ig-btn-primary wide xl"
                onClick={confirmDraft}
              >
                <Check size={18} /> Speichern &amp; hinzufügen
              </button>
              <button
                type="button"
                className="ig-btn-secondary wide"
                onClick={() => setDraft(null)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ig-sheet-search">
            <Search
              size={16}
              className="ig-sheet-search-icon"
              aria-hidden="true"
            />
            <input
              className="ig-input"
              type="search"
              placeholder={
                mode === "cooldown"
                  ? "Dehnung suchen…"
                  : "Weitere Übungen suchen…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="ig-sheet-body ig-prep-editor-body">
            {!showCustom ? (
              <button
                type="button"
                className="ig-picker-custom"
                onClick={() => setShowCustom(true)}
              >
                <Plus size={15} /> Eigene Übung erstellen
              </button>
            ) : (
              <div className="ig-card ig-custom-form">
                <div className="ig-field-label">Eigene Übung</div>
                <input
                  className="ig-input"
                  placeholder="Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                />
                <div className="ig-pe-config mono" style={{ marginTop: 4 }}>
                  <label>
                    Sek.
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="30"
                      value={customSeconds}
                      onChange={(e) => {
                        setCustomSeconds(e.target.value);
                        if (e.target.value) setCustomReps("");
                      }}
                    />
                  </label>
                  <label>
                    Wdh.
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="–"
                      value={customReps}
                      onChange={(e) => {
                        setCustomReps(e.target.value);
                        if (e.target.value) setCustomSeconds("");
                      }}
                    />
                  </label>
                </div>
                <input
                  className="ig-input"
                  placeholder="Notiz (optional)"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="ig-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowCustom(false)}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="ig-btn-primary"
                    style={{ flex: 1 }}
                    disabled={!customName.trim()}
                    onClick={submitCustom}
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}

            {recommended.length > 0 && (
              <>
                <div className="ig-field-label" style={{ marginTop: 8 }}>
                  {mode === "cooldown"
                    ? `Empfohlen${focusLabel ? ` · ${focusLabel}` : ""}`
                    : searching
                      ? "Treffer · Aufwärmen"
                      : "Empfohlen · Aufwärmen"}
                </div>
                <ul className="ig-picker-list media">
                  {recommended.map(renderRow)}
                </ul>
              </>
            )}

            {rest.length > 0 && (
              <>
                <div className="ig-field-label" style={{ marginTop: 12 }}>
                  Weitere Treffer
                </div>
                <ul className="ig-picker-list media">{rest.map(renderRow)}</ul>
              </>
            )}

            {searching &&
              recommended.length === 0 &&
              rest.length === 0 &&
              !showCustom && (
                <p className="ig-empty">
                  Keine Treffer — eigene Übung erstellen.
                </p>
              )}
          </div>
        </>
      )}

      {/* Footer nur bei der Liste — beim Einstellen (draft) reichen die Buttons in der Karte */}
      {!draft && (
        <div className="ig-prep-footer-nav ig-prep-footer-fixed">
          <button type="button" className="ig-btn-secondary" onClick={handleBack}>
            <ChevronLeft size={16} /> Zurück
          </button>
          <button type="button" className="ig-btn-primary" onClick={onClose}>
            <Check size={16} /> Fertig
          </button>
        </div>
      )}
    </div>,
  );
}
