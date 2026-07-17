/* Gewichtsverlauf als leichte SVG-Linie — ersetzt recharts (−340 KB Chunk).
   Gleiche Aussage wie vorher: Trend, Punkte, Min/Max-Raster, letzter Wert
   hervorgehoben. Zeichnet sich animiert auf (ig-spark-draw). */

import React, { useLayoutEffect, useRef, useState } from "react";

export default function WeightChart({ data, height = 160 }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth || 0);
    measure();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const pad = { top: 16, right: 16, bottom: 24, left: 40 };
  const kgs = data.map((d) => d.kg);
  const min = Math.min(...kgs) - 2;
  const max = Math.max(...kgs) + 2;
  const range = max - min || 1;

  const innerW = Math.max(0, w - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const x = (i) =>
    pad.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (kg) => pad.top + innerH - ((kg - min) / range) * innerH;

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.kg).toFixed(1)}`)
    .join(" ");

  const gridKgs = [min, min + range / 2, max];
  const last = data[data.length - 1];

  return (
    <div className="ig-wchart" ref={wrapRef}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          {/* Raster + y-Beschriftung */}
          {gridKgs.map((g) => (
            <g key={g}>
              <line
                x1={pad.left}
                x2={w - pad.right}
                y1={y(g)}
                y2={y(g)}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text x={pad.left - 7} y={y(g) + 3.5} className="ig-wchart-tick" textAnchor="end">
                {Math.round(g)}
              </text>
            </g>
          ))}
          {/* Linie: zeichnet sich beim Einblenden auf */}
          <path
            className="ig-spark-line ig-wchart-line"
            d={path}
            pathLength="1"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Punkte; letzter hervorgehoben + Wert */}
          {data.map((d, i) => {
            const isLast = i === data.length - 1;
            return (
              <circle
                key={i}
                cx={x(i)}
                cy={y(d.kg)}
                r={isLast ? 4.5 : 3}
                fill={isLast ? "var(--accent)" : "var(--surface-2)"}
                stroke="var(--accent)"
                strokeWidth={isLast ? 0 : 1.5}
              />
            );
          })}
          <text
            x={Math.min(x(data.length - 1), w - pad.right)}
            y={y(last.kg) - 10}
            className="ig-wchart-last mono"
            textAnchor="end"
          >
            {last.kg} kg
          </text>
          {/* x-Beschriftung: erster und letzter Eintrag */}
          <text x={pad.left} y={height - 6} className="ig-wchart-tick" textAnchor="start">
            {data[0].label}
          </text>
          <text x={w - pad.right} y={height - 6} className="ig-wchart-tick" textAnchor="end">
            {last.label}
          </text>
        </svg>
      )}
    </div>
  );
}
