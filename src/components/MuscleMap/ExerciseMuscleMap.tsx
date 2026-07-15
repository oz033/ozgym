/**
 * Flaches 2D-Muskeldiagramm (kein 3D, kein GLB) — ein SVG pro Ansicht,
 * jede Muskelregion ein eigenes <g id="..."><path/></g>, einzeln einfärbbar.
 * Wechselt automatisch auf die Rückseite, wenn die primären Muskeln dort
 * liegen; der Nutzer kann per Front/Back-Chip trotzdem manuell umschalten.
 */
import React, { useEffect, useState } from "react";
import { BODY_DIAGRAMS, BACK_MUSCLES, MuscleId } from "./bodyData";

export type Gender = "m" | "f";
export type BodyView = "front" | "back";

export interface ExerciseMuscleMapProps {
  gender: Gender;
  activeMuscles: { primary: MuscleId[]; secondary?: MuscleId[] };
  /** Kontrollierte Ansicht von außen (optional) — ohne diese Prop entscheidet die Komponente selbst. */
  view?: BodyView;
  onViewChange?: (view: BodyView) => void;
  className?: string;
}

const ACTIVE_COLOR = "#5B8CFF";

function decideView(primary: MuscleId[], secondary: MuscleId[]): BodyView {
  const all = [...primary, ...secondary];
  if (all.length === 0) return "front";
  const backCount = all.filter((m) => BACK_MUSCLES.has(m)).length;
  return backCount > all.length / 2 ? "back" : "front";
}

export function ExerciseMuscleMap({ gender, activeMuscles, view: viewProp, onViewChange, className }: ExerciseMuscleMapProps) {
  const primary = activeMuscles.primary ?? [];
  const secondary = activeMuscles.secondary ?? [];
  // Trivial genug, um bei jedem Render einfach neu zu berechnen statt zu memoizen.
  const autoView = decideView(primary, secondary);

  const [internalView, setInternalView] = useState<BodyView>(autoView);
  const view = viewProp ?? internalView;

  // Bei Übungswechsel automatisch auf die richtige Seite springen, aber nur
  // wenn der Nutzer die Ansicht nicht schon manuell umgestellt hat für DIESE Übung.
  useEffect(() => {
    setInternalView(autoView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary.join(","), secondary.join(",")]);

  const setView = (v: BodyView) => {
    setInternalView(v);
    onViewChange?.(v);
  };

  const diagram = BODY_DIAGRAMS[gender][view];
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);

  const colorFor = () => ACTIVE_COLOR;
  const opacityFor = (id: MuscleId) => {
    if (primarySet.has(id)) return 1;
    if (secondarySet.has(id)) return 0.6;
    return 0;
  };

  return (
    <div className={"ig-musclemap" + (className ? ` ${className}` : "")}>
      <div className="ig-musclemap-toggle">
        <button className={"ig-chip sm" + (view === "front" ? " active" : "")} onClick={() => setView("front")}>
          Front
        </button>
        <button className={"ig-chip sm" + (view === "back" ? " active" : "")} onClick={() => setView("back")}>
          Back
        </button>
      </div>

      <svg viewBox={diagram.viewBox} className="ig-musclemap-svg" role="img" aria-label={`Muskeldiagramm ${view === "front" ? "Vorderseite" : "Rückseite"}`}>
        <path d={diagram.silhouette} className="ig-musclemap-skin" />
        {diagram.regions.map((region) => (
          <g key={region.id} id={region.id}>
            {region.paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill={colorFor(region.id)}
                opacity={opacityFor(region.id)}
                className={"ig-musclemap-region" + (primarySet.has(region.id) ? " primary" : secondarySet.has(region.id) ? " secondary" : "")}
              />
            ))}
          </g>
        ))}
      </svg>

      {(primary.length > 0 || secondary.length > 0) && (
        <div className="ig-musclemap-legend">
          {primary.length > 0 && (
            <div className="ig-musclemap-legend-row">
              <span className="ig-musclemap-legend-label">Primär</span>
              <span className="ig-musclemap-legend-chips">
                {primary.map((m) => (
                  <span key={m} className="ig-musclemap-legend-chip primary">
                    {labelFor(gender, view, m)}
                  </span>
                ))}
              </span>
            </div>
          )}
          {secondary.length > 0 && (
            <div className="ig-musclemap-legend-row">
              <span className="ig-musclemap-legend-label">Sekundär</span>
              <span className="ig-musclemap-legend-chips">
                {secondary.map((m) => (
                  <span key={m} className="ig-musclemap-legend-chip secondary">
                    {labelFor(gender, view, m)}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function labelFor(gender: Gender, view: BodyView, id: MuscleId): string {
  const region = BODY_DIAGRAMS[gender][view].regions.find((r) => r.id === id);
  if (region) return region.label;
  // Muskel gehört zur jeweils anderen Ansicht (z.B. Trizeps waehrend Front aktiv) — trotzdem lesbar anzeigen.
  const other = BODY_DIAGRAMS[gender][view === "front" ? "back" : "front"].regions.find((r) => r.id === id);
  return other?.label ?? id;
}
