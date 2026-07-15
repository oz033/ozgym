/* Pläne: Manager + Editor + Übungsbibliothek */

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Check, ChevronLeft, Search, Sparkles, Pencil, Copy, Trash2, X, ClipboardList } from "lucide-react";
import {
  PLAN_COLORS,
  PLAN_ICONS,
  WEEKDAYS,
  MUSCLE_GROUPS,
  MUSCLE_NAME,
  MUSCLE_ZONE,
  blankPlan,
} from "../lib/constants.js";
import { uid, planStats, relativeDay, todayISO, round1 } from "../lib/utils.js";
import { generatePlans } from "../lib/planGenerator.js";
import { EmptyState } from "../components/ui.jsx";

export default function PlansTab({ data, update, autoOpenPlanId, onAutoOpenHandled }) {
  const [editingId, setEditingId] = useState(null);
  const plans = data.plans || [];
  const profileReady = !!data.profile?.goal;
  const today = todayISO();

  // Von außen (z. B. "Workout starten" bei leerem Plan) direkt in die Bearbeitung springen
  useEffect(() => {
    if (autoOpenPlanId) {
      setEditingId(autoOpenPlanId);
      onAutoOpenHandled?.();
    }
  }, [autoOpenPlanId, onAutoOpenHandled]);

  const libraryById = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [data.library]);

  const setActive = (id) => update((prev) => ({ ...prev, activePlanId: id }));

  const createPlan = () => {
    const plan = blankPlan(plans.length);
    update((prev) => ({
      ...prev,
      plans: [...(prev.plans || []), plan],
      activePlanId: prev.activePlanId || plan.id,
    }));
    setEditingId(plan.id);
  };

  // Für den Empty State: sofort eine fertige Vorlage statt eines leeren Plans,
  // hier gibt's noch nichts zu überschreiben — daher ohne Bestätigungsdialog.
  const createFromTemplate = () => {
    update((prev) => {
      const generated = generatePlans(prev.profile, prev.library || []);
      return {
        ...prev,
        plans: [...generated, ...(prev.plans || [])],
        activePlanId: generated[0]?.id || prev.activePlanId,
      };
    });
  };

  const regenerate = () => {
    if (
      !window.confirm(
        "Neuen Smart-Plan aus deinem Profil erstellen? Automatisch erstellte Pläne werden ersetzt, eigene bleiben erhalten.",
      )
    )
      return;
    update((prev) => {
      const kept = (prev.plans || []).filter((p) => !p.generated);
      const generated = generatePlans(prev.profile, prev.library || []);
      return {
        ...prev,
        plans: [...generated, ...kept],
        activePlanId: generated[0]?.id || prev.activePlanId,
      };
    });
  };

  const duplicatePlan = (p) => {
    const copy = {
      ...p,
      id: "plan-" + uid(),
      name: p.name + " (Kopie)",
      generated: false,
      days: [],
      exercises: p.exercises.map((e) => ({ ...e })),
    };
    update((prev) => ({ ...prev, plans: [...prev.plans, copy] }));
  };

  const deletePlan = (p) => {
    if (!window.confirm(`Plan "${p.name}" wirklich löschen?`)) return;
    update((prev) => {
      const plans = prev.plans.filter((x) => x.id !== p.id);
      return {
        ...prev,
        plans,
        activePlanId:
          prev.activePlanId === p.id ? plans[0]?.id || null : prev.activePlanId,
      };
    });
  };

  const editing = plans.find((p) => p.id === editingId);
  const activePlan = plans.find((p) => p.id === data.activePlanId) || plans[0] || null;
  const otherPlans = plans.filter((p) => p.id !== activePlan?.id);
  const activeStats = activePlan ? planStats(activePlan, data.logs, libraryById) : null;

  if (plans.length === 0) {
    return (
      <div className="ig-tabpane">
        <div className="ig-screen-head">
          <h1 className="ig-screen-title">Pläne</h1>
        </div>
        <EmptyState
          icon={<ClipboardList size={36} />}
          title="Noch kein Plan"
          description="Lege Übungen, Sätze und Wdh. fest — dann startest du unter Train."
          primaryLabel="Plan erstellen"
          onPrimary={createPlan}
          secondaryLabel={profileReady ? "Vorlage auswählen" : undefined}
          onSecondary={profileReady ? createFromTemplate : undefined}
        />
      </div>
    );
  }

  return (
    <div className="ig-tabpane">
      {/* Title + Neuer Plan above the fold — never under bottom dock */}
      <div className="ig-screen-head">
        <h1 className="ig-screen-title">Pläne</h1>
        <div className="ig-screen-head-actions">
          {profileReady && (
            <button
              type="button"
              className="ig-chip sm"
              onClick={regenerate}
              aria-label="Smart-Plan erstellen"
            >
              <Sparkles size={14} /> Smart
            </button>
          )}
          <button
            type="button"
            className="ig-btn-primary ig-plan-new-btn"
            onClick={createPlan}
          >
            <Plus size={16} /> Neuer Plan
          </button>
        </div>
      </div>

      {/* Aktiver Plan: klar dominant, sofort erkennbar als "das ist mein Plan" */}
      {activePlan && (
        <div className="ig-active-plan" style={{ "--plan-color": activePlan.color }}>
          <div className="ig-active-plan-head">
            <span className="ig-active-plan-icon">{activePlan.icon}</span>
            <div className="ig-active-plan-title">
              <span className="ig-active-plan-tag">Aktiver Plan</span>
              <h2>{activePlan.name}</h2>
            </div>
            <button
              className="ig-icon-btn ghost sm"
              onClick={() => setEditingId(activePlan.id)}
              aria-label="Bearbeiten"
            >
              <Pencil size={15} />
            </button>
          </div>

          <div className="ig-active-plan-stats">
            <div className="ig-active-plan-stat">
              <span className="ig-active-plan-num mono">{activePlan.exercises.length}</span>
              <span className="ig-active-plan-label">Übungen</span>
            </div>
            <div className="ig-active-plan-stat">
              <span className="ig-active-plan-num mono">
                {(activePlan.days || []).length > 0
                  ? WEEKDAYS.filter((d) => activePlan.days.includes(d.key)).map((d) => d.short).join(" ")
                  : "—"}
              </span>
              <span className="ig-active-plan-label">Split</span>
            </div>
            <div className="ig-active-plan-stat">
              <span className="ig-active-plan-num mono">
                {activeStats.volume >= 1000 ? `${round1(activeStats.volume / 1000)}t` : `${activeStats.volume} kg`}
              </span>
              <span className="ig-active-plan-label">Volumen</span>
            </div>
            <div className="ig-active-plan-stat">
              <span className="ig-active-plan-num mono">
                {activeStats.lastDate ? relativeDay(activeStats.lastDate, today) : "—"}
              </span>
              <span className="ig-active-plan-label">Zuletzt</span>
            </div>
          </div>

          {/* Planvorschau ohne in den Editor wechseln zu müssen */}
          <div className="ig-active-plan-preview">
            {activePlan.exercises.slice(0, 4).map((e, i) => (
              <span key={i} className="ig-badge">
                {libraryById[e.exerciseId]?.name || "?"}
              </span>
            ))}
            {activePlan.exercises.length > 4 && (
              <span className="ig-badge dim">+{activePlan.exercises.length - 4} weitere</span>
            )}
          </div>
        </div>
      )}

      {/* Andere Pläne: kompakt, ein Tap zum Aktivieren */}
      {otherPlans.length > 0 && (
        <div className="ig-card">
          <div className="ig-field-label">Weitere Pläne</div>
          <div className="ig-plan-list">
            {otherPlans.map((p) => (
              <div key={p.id} className="ig-plan-card" style={{ "--plan-color": p.color }}>
                <button
                  className="ig-plan-main"
                  onClick={() => setActive(p.id)}
                  aria-label={`Plan ${p.name} aktivieren`}
                >
                  <span className="ig-plan-icon">{p.icon}</span>
                  <span className="ig-plan-info">
                    <span className="ig-plan-name">
                      {p.name}
                      {p.generated && (
                        <span className="ig-plan-smart-tag" title="Automatisch erstellt">
                          <Sparkles size={9} /> Smart
                        </span>
                      )}
                    </span>
                    <span className="ig-plan-meta">
                      {p.exercises.length} {p.exercises.length === 1 ? "Übung" : "Übungen"}
                      {(p.days || []).length > 0 &&
                        " · " + WEEKDAYS.filter((d) => p.days.includes(d.key)).map((d) => d.short).join(" ")}
                    </span>
                  </span>
                </button>
                <div className="ig-plan-actions">
                  <button className="ig-icon-btn ghost sm" onClick={() => setEditingId(p.id)} aria-label="Bearbeiten">
                    <Pencil size={14} />
                  </button>
                  <button className="ig-icon-btn ghost sm" onClick={() => duplicatePlan(p)} aria-label="Duplizieren">
                    <Copy size={14} />
                  </button>
                  <button className="ig-icon-btn ghost sm" onClick={() => deletePlan(p)} aria-label="Löschen">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <PlanEditor
          plan={editing}
          data={data}
          update={update}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function PlanEditor({ plan, data, update, onClose }) {
  const [showPicker, setShowPicker] = useState(false);

  const patch = (fields) =>
    update((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === plan.id ? { ...p, ...fields } : p,
      ),
    }));

  const patchExercise = (i, fields) =>
    patch({
      exercises: plan.exercises.map((e, idx) =>
        idx === i ? { ...e, ...fields } : e,
      ),
    });

  const move = (i, dir) => {
    const arr = [...plan.exercises];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    patch({ exercises: arr });
  };

  const removeExercise = (i) =>
    patch({ exercises: plan.exercises.filter((_, idx) => idx !== i) });

  const addExercise = (libEntry) => {
    patch({
      exercises: [
        ...plan.exercises,
        {
          exerciseId: libEntry.id,
          sets: 3,
          reps: 10,
          weight: null,
          rest: data.settings?.restSeconds || 90,
        },
      ],
    });
    setShowPicker(false);
  };

  const toggleDay = (key) =>
    patch({
      days: (plan.days || []).includes(key)
        ? plan.days.filter((d) => d !== key)
        : [...(plan.days || []), key],
    });

  const byId = useMemo(() => {
    const m = {};
    (data.library || []).forEach((e) => {
      m[e.id] = e;
    });
    return m;
  }, [data.library]);

  return (
    <div className="ig-sheet">
      <div className="ig-sheet-head">
        <button className="ig-icon-btn ghost" onClick={onClose} aria-label="Zurück">
          <ChevronLeft size={20} />
        </button>
        <input
          className="ig-sheet-title-input"
          value={plan.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Plan-Name"
        />
        <button className="ig-icon-btn primary" onClick={onClose} aria-label="Fertig">
          <Check size={18} />
        </button>
      </div>

      <div className="ig-sheet-body">
        <div className="ig-card">
          <div className="ig-field-label">Aussehen</div>
          <div className="ig-accent-row">
            {PLAN_COLORS.map((c) => (
              <button
                key={c}
                className={"ig-accent-swatch" + (plan.color === c ? " active" : "")}
                style={{ background: c }}
                onClick={() => patch({ color: c })}
                aria-label={`Farbe ${c}`}
              />
            ))}
          </div>
          <div className="ig-icon-row">
            {PLAN_ICONS.map((ic) => (
              <button
                key={ic}
                className={"ig-emoji-btn" + (plan.icon === ic ? " active" : "")}
                onClick={() => patch({ icon: ic })}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Trainingstage (optional)</div>
          <div className="ig-day-row">
            {WEEKDAYS.map((d) => (
              <button
                key={d.key}
                className={
                  "ig-chip sm" + ((plan.days || []).includes(d.key) ? " active" : "")
                }
                onClick={() => toggleDay(d.key)}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <div className="ig-card">
          <div className="ig-field-label">Übungen ({plan.exercises.length})</div>
          {plan.exercises.length === 0 && (
            <p className="ig-empty">Noch keine Übungen im Plan.</p>
          )}
          <div className="ig-pe-list">
            {plan.exercises.map((e, i) => {
              const entry = byId[e.exerciseId];
              return (
                <div key={e.exerciseId + i} className="ig-pe-row">
                  <div className="ig-pe-head">
                    <span className="ig-pe-num mono">{i + 1}</span>
                    <span className="ig-pe-name">
                      {entry?.name || "Unbekannt"}
                      {entry?.muscle && (
                        <span className="ig-pe-muscle">
                          {MUSCLE_NAME[entry.muscle]}
                        </span>
                      )}
                    </span>
                    <div className="ig-pe-order">
                      <button
                        className="ig-icon-btn ghost sm"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        className="ig-icon-btn ghost sm"
                        onClick={() => move(i, 1)}
                        disabled={i === plan.exercises.length - 1}
                        aria-label="Nach unten"
                      >
                        ↓
                      </button>
                      <button
                        className="ig-icon-btn ghost sm"
                        onClick={() => removeExercise(i)}
                        aria-label="Entfernen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="ig-pe-config mono">
                    <label>
                      Sätze
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={e.sets}
                        onChange={(ev) =>
                          patchExercise(i, {
                            sets: Math.max(1, Number(ev.target.value) || 1),
                          })
                        }
                      />
                    </label>
                    <label>
                      Wdh.
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={e.reps}
                        onChange={(ev) =>
                          patchExercise(i, {
                            reps: Math.max(1, Number(ev.target.value) || 1),
                          })
                        }
                      />
                    </label>
                    <label>
                      kg (Ziel)
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="–"
                        value={e.weight ?? ""}
                        onChange={(ev) =>
                          patchExercise(i, {
                            weight:
                              ev.target.value === ""
                                ? null
                                : Number(ev.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Pause (s)
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="15"
                        value={e.rest ?? data.settings?.restSeconds ?? 90}
                        onChange={(ev) =>
                          patchExercise(i, {
                            rest: Math.max(0, Number(ev.target.value) || 0),
                          })
                        }
                      />
                    </label>
                  </div>
                  <div
                    className="ig-pe-rest-chips"
                    role="group"
                    aria-label={`Pause für ${name}`}
                  >
                    {[60, 90, 120, 180].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={
                          "ig-chip sm" +
                          ((e.rest ?? data.settings?.restSeconds ?? 90) === s
                            ? " active"
                            : "")
                        }
                        onClick={() => patchExercise(i, { rest: s })}
                      >
                        {s % 60 === 0 ? `${s / 60}m` : `${s}s`}
                      </button>
                    ))}
                  </div>
                  <input
                    className="ig-pe-note"
                    placeholder="Notiz (optional), z. B. Sitz auf Stufe 4"
                    value={e.note || ""}
                    onChange={(ev) => patchExercise(i, { note: ev.target.value })}
                  />
                </div>
              );
            })}
          </div>
          <button className="ig-btn-primary wide" onClick={() => setShowPicker(true)}>
            <Plus size={16} /> Übung hinzufügen
          </button>
        </div>
      </div>

      {showPicker && (
        <LibraryPicker
          data={data}
          update={update}
          usedIds={plan.exercises.map((e) => e.exerciseId)}
          onPick={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

const EMPTY_LIBRARY = [];

const PICKER_PAGE = 60;

function LibraryPicker({ data, update, usedIds, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [limit, setLimit] = useState(PICKER_PAGE);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("chest");
  const [customEquipment, setCustomEquipment] = useState("");

  const library = data.library || EMPTY_LIBRARY;

  const toggleFav = (id) =>
    update((prev) => ({
      ...prev,
      library: prev.library.map((e) =>
        e.id === id ? { ...e, favorite: !e.favorite } : e,
      ),
    }));

  const createCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const entry = {
      id: "custom-" + uid(),
      name,
      muscle: customMuscle,
      zone: MUSCLE_ZONE[customMuscle],
      zone2: null,
      equipment: customEquipment.trim(),
      custom: true,
    };
    update((prev) => ({ ...prev, library: [...prev.library, entry] }));
    onPick(entry);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library
      .filter((e) => {
        if (muscle && e.muscle !== muscle) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          (e.equipment || "").toLowerCase().includes(q) ||
          (e.equipmentRaw || "").toLowerCase().includes(q) ||
          (e.target || "").toLowerCase().includes(q) ||
          (MUSCLE_NAME[e.muscle] || "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) ||
          (b.machine ? 1 : 0) - (a.machine ? 1 : 0) ||
          a.name.localeCompare(b.name),
      );
  }, [library, query, muscle]);

  // Reset page when filters change
  useEffect(() => {
    setLimit(PICKER_PAGE);
  }, [query, muscle]);

  const visible = results.slice(0, limit);
  const hasMore = results.length > limit;

  return (
    <div className="ig-sheet ig-sheet-over">
      <div className="ig-sheet-head">
        <button className="ig-icon-btn ghost" onClick={onClose} aria-label="Zurück">
          <ChevronLeft size={20} />
        </button>
        <span className="ig-sheet-title">Übung wählen</span>
        <div style={{ width: 40 }} />
      </div>

      <div className="ig-sheet-search">
        <Search size={15} className="ig-sheet-search-icon" />
        <input
          className="ig-input"
          placeholder={`Suchen in ${library.length} Übungen …`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ig-picker-chips">
        <button
          className={"ig-chip sm" + (muscle === "" ? " active" : "")}
          onClick={() => setMuscle("")}
        >
          Alle
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m.id}
            className={"ig-chip sm" + (muscle === m.id ? " active" : "")}
            onClick={() => setMuscle(muscle === m.id ? "" : m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="ig-picker-count mono">
        {results.length} Treffer
        {results.length !== library.length ? ` · ${library.length} gesamt` : ""}
      </div>

      <div className="ig-sheet-body">
        {!showCustom ? (
          <button className="ig-picker-custom" onClick={() => setShowCustom(true)}>
            <Plus size={15} /> Eigene Übung erstellen
          </button>
        ) : (
          <div className="ig-card ig-custom-form">
            <div className="ig-field-label">Eigene Übung</div>
            <input
              className="ig-input"
              placeholder="Name, z. B. Butterfly Reverse"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
            <div className="ig-picker-chips wrap">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m.id}
                  className={"ig-chip sm" + (customMuscle === m.id ? " active" : "")}
                  onClick={() => setCustomMuscle(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <input
              className="ig-input"
              placeholder="Gerät (optional)"
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
            />
            <button
              className="ig-btn-primary wide"
              disabled={!customName.trim()}
              onClick={createCustom}
            >
              <Check size={16} /> Erstellen & hinzufügen
            </button>
          </div>
        )}

        <ul className="ig-picker-list media">
          {visible.map((e) => {
            const used = usedIds.includes(e.id);
            const thumb = e.image || e.gif;
            return (
              <li key={e.id} className="ig-picker-row media">
                <button
                  className="ig-picker-fav"
                  onClick={() => toggleFav(e.id)}
                  aria-label={e.favorite ? "Favorit entfernen" : "Als Favorit markieren"}
                >
                  {e.favorite ? "★" : "☆"}
                </button>
                <button
                  className="ig-picker-main media"
                  disabled={used}
                  onClick={() => onPick(e)}
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
                    <span className="ig-picker-name">
                      {e.name}
                      {e.custom && <span className="ig-pe-muscle">Eigene</span>}
                      {e.nr && <span className="ig-pe-muscle">Gerät {e.nr}</span>}
                    </span>
                    <span className="ig-picker-meta">
                      {[MUSCLE_NAME[e.muscle], e.equipment, e.target]
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
          {hasMore && (
            <li className="ig-picker-more">
              <button
                className="ig-btn-secondary wide"
                onClick={() => setLimit((n) => n + PICKER_PAGE)}
              >
                Mehr laden ({results.length - limit} weitere)
              </button>
            </li>
          )}
          {results.length === 0 && (
            <p className="ig-empty">Nichts gefunden — erstell sie als eigene Übung.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
