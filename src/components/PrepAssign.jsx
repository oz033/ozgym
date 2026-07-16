/* Warm-up / Cool-down: zuweisbare Vorlagen am Trainingsplan */

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  Check,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Search,
  Sparkles,
  X,
  Flame,
  Wind,
} from "lucide-react";
import { ZONE_LABEL } from "../lib/constants.js";
import {
  PREP_KINDS,
  PREP_EQUIPMENT,
  CARDIO_INTENSITIES,
  ALL_ZONES,
  zonesFromPlan,
  focusLabelForZones,
  filterPrepCatalog,
  prepItemFromCatalog,
  suggestWarmupForPlan,
  suggestCooldownForPlan,
  formatPrepMeta,
  blankPrepTemplate,
  getPrepTemplate,
  templatesOfKind,
} from "../lib/stretches.js";
import { showToast, showConfirm } from "./ui.jsx";

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
 * Hub: vorhandene Vorlagen zuweisen, neu anlegen, duplizieren, bearbeiten, löschen.
 * kind: 'warmup' | 'cooldown'
 */
export function PrepAssignSheet({ kind, plan, data, update, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const templates = data.prepTemplates || [];
  const list = templatesOfKind(templates, kind);
  const field = kind === "cooldown" ? "cooldownTemplateId" : "warmupTemplateId";
  const assignedId = plan?.[field] || null;
  const title = kind === "cooldown" ? "Cool-down" : "Warm-up";
  const Icon = kind === "cooldown" ? Wind : Flame;

  const byId = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [data.library]);

  const assign = (templateId) => {
    update((prev) => ({
      ...prev,
      plans: (prev.plans || []).map((p) =>
        p.id === plan.id ? { ...p, [field]: templateId } : p,
      ),
    }));
    showToast(
      templateId ? `${title} zugewiesen` : `${title} entfernt`,
      "success",
    );
  };

  const createNew = () => {
    const t = blankPrepTemplate(
      kind,
      `${plan.name || "Plan"} · ${title}`,
    );
    // Smart-Seed aus Plan-Zonen
    t.items =
      kind === "cooldown"
        ? suggestCooldownForPlan(plan, byId, 5)
        : suggestWarmupForPlan(plan, byId, 5);
    update((prev) => ({
      ...prev,
      prepTemplates: [...(prev.prepTemplates || []), t],
      plans: (prev.plans || []).map((p) =>
        p.id === plan.id ? { ...p, [field]: t.id } : p,
      ),
    }));
    setEditingId(t.id);
    showToast(
      t.items.length
        ? `${title} mit ${t.items.length} Übungen erstellt`
        : `${title} angelegt — Übungen wählen`,
      "success",
    );
  };

  const duplicate = (t) => {
    const copy = {
      ...blankPrepTemplate(kind, `${t.name} (Kopie)`),
      items: (t.items || []).map((i) => ({ ...i })),
    };
    update((prev) => ({
      ...prev,
      prepTemplates: [...(prev.prepTemplates || []), copy],
    }));
    showToast("Vorlage dupliziert", "success");
  };

  const removeTemplate = async (t) => {
    const ok = await showConfirm({
      title: `${title} löschen?`,
      message:
        "Die Vorlage wird von allen Plänen entfernt, die sie nutzen.",
      confirmLabel: "Löschen",
      destructive: true,
    });
    if (!ok) return;
    update((prev) => ({
      ...prev,
      prepTemplates: (prev.prepTemplates || []).filter((x) => x.id !== t.id),
      plans: (prev.plans || []).map((p) => ({
        ...p,
        warmupTemplateId:
          p.warmupTemplateId === t.id ? null : p.warmupTemplateId,
        cooldownTemplateId:
          p.cooldownTemplateId === t.id ? null : p.cooldownTemplateId,
      })),
    }));
    showToast("Vorlage gelöscht", "success");
  };

  const editing = list.find((t) => t.id === editingId) ||
    (templates || []).find((t) => t.id === editingId);

  if (editing) {
    return (
      <PrepTemplateEditor
        template={editing}
        plan={plan}
        data={data}
        update={update}
        onClose={() => setEditingId(null)}
        onDone={() => {
          setEditingId(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="ig-sheet ig-sheet-over">
      <div className="ig-sheet-head">
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={onClose}
          aria-label="Zurück"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="ig-sheet-title">
          <Icon size={16} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {title} · {plan.name}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div className="ig-sheet-body">
        <p className="ig-prep-hub-hint dim">
          Vorlagen sind wiederverwendbar — dieselbe {title}-Routine für
          mehrere Pläne.
        </p>

        <button type="button" className="ig-btn-primary wide" onClick={createNew}>
          <Plus size={16} /> Neuen {title}-Plan erstellen
        </button>

        {assignedId && (
          <button
            type="button"
            className="ig-btn-secondary wide"
            onClick={() => assign(null)}
          >
            Zuweisung entfernen
          </button>
        )}

        <div className="ig-field-label" style={{ marginTop: 8 }}>
          Vorlagen ({list.length})
        </div>

        {list.length === 0 ? (
          <p className="ig-empty">Noch keine {title}-Vorlagen.</p>
        ) : (
          <div className="ig-pe-list">
            {list.map((t) => {
              const active = t.id === assignedId;
              const n = t.items?.length || 0;
              return (
                <div
                  key={t.id}
                  className={"ig-pe-row ig-prep-hub-row" + (active ? " active" : "")}
                >
                  <button
                    type="button"
                    className="ig-prep-hub-main"
                    onClick={() => assign(t.id)}
                  >
                    <span className="ig-pe-name">
                      {t.name}
                      {active && <span className="ig-pe-muscle">Aktiv</span>}
                    </span>
                    <span className="ig-picker-meta">
                      {n} {n === 1 ? "Übung" : "Übungen"}
                      {active ? " · diesem Plan zugewiesen" : ""}
                    </span>
                  </button>
                  <div className="ig-prep-hub-actions">
                    <button
                      type="button"
                      className="ig-icon-btn ghost sm"
                      onClick={() => setEditingId(t.id)}
                      aria-label="Bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ig-icon-btn ghost sm"
                      onClick={() => duplicate(t)}
                      aria-label="Duplizieren"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="ig-icon-btn ghost sm"
                      onClick={() => removeTemplate(t)}
                      aria-label="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Übungen einer Vorlage bearbeiten (Smart-Filter + Cardio) */
function PrepTemplateEditor({ template, plan, data, update, onClose, onDone }) {
  const [showPicker, setShowPicker] = useState(false);
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

  const addItem = (entry) => {
    patchTemplate((t) => ({
      items: [...(t.items || []), prepItemFromCatalog(entry)],
    }));
    setShowPicker(false);
    showToast("Übung hinzugefügt", "success");
  };

  const smartFill = () => {
    const list =
      kind === "cooldown"
        ? suggestCooldownForPlan(plan, byId, 6)
        : suggestWarmupForPlan(plan, byId, 6);
    patchTemplate({ items: list });
    showToast(
      list.length
        ? `${list.length} passende Übungen für ${focusLabel}`
        : "Zuerst Übungen im Trainingsplan setzen",
      list.length ? "success" : "info",
    );
  };

  return (
    <div className="ig-sheet ig-sheet-over">
      <div className="ig-sheet-head">
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={onClose}
          aria-label="Zurück"
        >
          <ChevronLeft size={20} />
        </button>
        <input
          className="ig-sheet-title-input"
          value={live.name}
          onChange={(e) => patchTemplate({ name: e.target.value })}
          placeholder={`${title}-Name`}
        />
        <button
          type="button"
          className="ig-icon-btn primary"
          onClick={() => {
            showToast(`${title} gespeichert`, "success");
            if (onDone) onDone();
            else onClose();
          }}
          aria-label="Fertig"
        >
          <Check size={18} />
        </button>
      </div>

      <div className="ig-sheet-body">
        <div className="ig-card ig-prep-focus">
          <div className="ig-field-label">Filter-Fokus (aus Trainingsplan)</div>
          <p className="ig-prep-focus-text">
            <span className="ig-badge">{focusLabel}</span>
            <span className="ig-prep-focus-zones">
              {planZones.size
                ? [...planZones].map((z) => ZONE_LABEL[z] || z).join(" · ")
                : "Alle generischen + Cardio-Übungen"}
            </span>
          </p>
        </div>

        <div className="ig-prep-section-actions" style={{ marginBottom: 8 }}>
          <button type="button" className="ig-chip sm" onClick={smartFill}>
            <Sparkles size={12} /> Smart füllen
          </button>
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

        <div className="ig-card">
          <div className="ig-field-label">
            Übungen ({items.length})
            {kind === "warmup" && (
              <span className="dim" style={{ fontWeight: 500 }}>
                {" "}
                · inkl. Cardio möglich
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="ig-empty">Noch keine Übungen — Smart oder +.</p>
          ) : (
            <div className="ig-pe-list">
              {items.map((item, i) => (
                <div key={(item.id || item.name) + i} className="ig-pe-row">
                  <div className="ig-pe-head">
                    <span className="ig-pe-num mono">{i + 1}</span>
                    <span className="ig-pe-name">
                      {item.name}
                      {item.kind === "cardio" && (
                        <span className="ig-pe-muscle">Cardio</span>
                      )}
                      {item.zones?.[0] && (
                        <span className="ig-pe-muscle">
                          {ZONE_LABEL[item.zones[0]] || item.zones[0]}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="ig-icon-btn ghost sm"
                      onClick={() => removeItem(i)}
                      aria-label="Entfernen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="ig-prep-meta dim">{formatPrepMeta(item)}</p>
                  {item.kind === "cardio" && (
                    <div className="ig-pe-config mono ig-prep-cardio-config">
                      <label>
                        Min
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="90"
                          value={Math.max(
                            1,
                            Math.round((item.seconds || 300) / 60),
                          )}
                          onChange={(ev) =>
                            patchItem(i, {
                              seconds:
                                Math.max(1, Number(ev.target.value) || 1) * 60,
                            })
                          }
                        />
                      </label>
                      <label>
                        km
                        <input
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
                      <div
                        className="ig-prep-intensity"
                        role="group"
                        aria-label="Intensität"
                      >
                        {CARDIO_INTENSITIES.map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            className={
                              "ig-chip sm" +
                              ((item.intensity || "moderat") === lvl.id
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
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="ig-btn-secondary wide"
            onClick={() => setShowPicker(true)}
            style={{ marginTop: 10 }}
          >
            <Plus size={16} /> Übung hinzufügen
          </button>
        </div>
      </div>

      {showPicker && (
        <PrepExercisePicker
          mode={kind === "cooldown" ? "cooldown" : "warmup"}
          planZones={planZones}
          focusLabel={focusLabel}
          usedIds={items.map((x) => x.catalogId || x.id)}
          onPick={addItem}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function PrepExercisePicker({
  mode,
  planZones,
  focusLabel,
  usedIds,
  onPick,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [zone, setZone] = useState("");
  const [equipment, setEquipment] = useState("");
  const [smart, setSmart] = useState(true);

  const kindOptions = useMemo(() => {
    if (mode === "cooldown") {
      return PREP_KINDS.filter((k) =>
        ["static_stretch", "mobility", "dynamic_stretch"].includes(k.id),
      );
    }
    // Warm-up: inkl. Cardio
    return PREP_KINDS.filter((k) =>
      ["warmup", "mobility", "dynamic_stretch", "cardio"].includes(k.id),
    );
  }, [mode]);

  const zoneOptions = useMemo(() => {
    if (planZones.size > 0) return ALL_ZONES.filter((z) => planZones.has(z));
    return ALL_ZONES;
  }, [planZones]);

  const results = useMemo(() => {
    // Cardio-Modus im Katalog: wenn kind=cardio oder warm-up all, cardios mit einbeziehen
    if (kind === "cardio") {
      return filterPrepCatalog({
        mode: "cardio",
        planZones,
        kind: "cardio",
        zone,
        equipment,
        query,
        smart: false,
        excludeIds: usedIds,
      });
    }
    const base = filterPrepCatalog({
      mode: mode === "cooldown" ? "cooldown" : "warmup",
      planZones,
      kind,
      zone,
      equipment,
      query,
      smart: mode === "cooldown" ? smart : smart,
      excludeIds: usedIds,
    });
    // Warm-up: Cardio immer mit anbieten wenn smart/all und kein Art-Filter
    if (mode !== "cooldown" && !kind) {
      const cardio = filterPrepCatalog({
        mode: "cardio",
        planZones,
        equipment,
        query,
        smart: false,
        excludeIds: usedIds,
      });
      const ids = new Set(base.map((x) => x.id));
      return [...base, ...cardio.filter((c) => !ids.has(c.id))];
    }
    return base;
  }, [mode, planZones, kind, zone, equipment, query, smart, usedIds]);

  const title =
    mode === "cooldown" ? "Cool-down-Übung" : "Warm-up / Cardio-Übung";

  return (
    <div className="ig-sheet ig-sheet-over" style={{ zIndex: 90 }}>
      <div className="ig-sheet-head">
        <button
          type="button"
          className="ig-icon-btn ghost"
          onClick={onClose}
          aria-label="Zurück"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="ig-sheet-title">{title}</span>
        <div style={{ width: 40 }} />
      </div>

      <div className="ig-prep-smart-bar">
        <button
          type="button"
          className={"ig-chip sm" + (smart ? " active" : "")}
          onClick={() => setSmart(true)}
        >
          Passend zu {focusLabel}
        </button>
        <button
          type="button"
          className={"ig-chip sm" + (!smart ? " active" : "")}
          onClick={() => setSmart(false)}
        >
          Alle
        </button>
      </div>

      <div className="ig-sheet-search">
        <Search size={16} className="ig-sheet-search-icon" aria-hidden="true" />
        <input
          className="ig-input"
          type="search"
          placeholder="Suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ig-picker-chips">
        <button
          type="button"
          className={"ig-chip sm" + (kind === "" ? " active" : "")}
          onClick={() => setKind("")}
        >
          Art: alle
        </button>
        {kindOptions.map((k) => (
          <button
            key={k.id}
            type="button"
            className={"ig-chip sm" + (kind === k.id ? " active" : "")}
            onClick={() => setKind(kind === k.id ? "" : k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="ig-picker-chips">
        <button
          type="button"
          className={"ig-chip sm" + (zone === "" ? " active" : "")}
          onClick={() => setZone("")}
        >
          Muskel: alle
        </button>
        {zoneOptions.map((z) => (
          <button
            key={z}
            type="button"
            className={"ig-chip sm" + (zone === z ? " active" : "")}
            onClick={() => setZone(zone === z ? "" : z)}
          >
            {ZONE_LABEL[z] || z}
          </button>
        ))}
      </div>

      <div className="ig-picker-chips">
        <button
          type="button"
          className={"ig-chip sm" + (equipment === "" ? " active" : "")}
          onClick={() => setEquipment("")}
        >
          Equipment: alle
        </button>
        {PREP_EQUIPMENT.map((e) => (
          <button
            key={e.id}
            type="button"
            className={"ig-chip sm" + (equipment === e.id ? " active" : "")}
            onClick={() => setEquipment(equipment === e.id ? "" : e.id)}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="ig-picker-count mono">{results.length} Treffer</div>

      <div className="ig-sheet-body">
        <ul className="ig-picker-list">
          {results.map((e) => {
            const used = usedIds.includes(e.id);
            return (
              <li key={e.id} className="ig-picker-row">
                <button
                  type="button"
                  className="ig-picker-main"
                  disabled={used}
                  onClick={() => onPick(e)}
                >
                  <span className="ig-picker-text">
                    <span className="ig-picker-name">{e.name}</span>
                    <span className="ig-picker-meta">
                      {[
                        formatPrepMeta(prepItemFromCatalog(e)),
                        e.zones?.length
                          ? e.zones.map((z) => ZONE_LABEL[z] || z).join(", ")
                          : e.kind === "cardio"
                            ? "Cardio"
                            : "Allgemein",
                        e.equipment,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
                {used ? (
                  <Check size={16} className="ig-picker-used" />
                ) : (
                  <Plus size={16} className="ig-picker-add" />
                )}
              </li>
            );
          })}
          {results.length === 0 && (
            <p className="ig-empty">Keine Treffer — Filter lockern.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
