/* Nutri / NOVA / Green — klein, ohne Karten-Rahmen.
   Tippen → Erklärung darunter. */

import React, { useState } from "react";

const NUTRI_COLORS = {
  A: "#038141",
  B: "#85bb2f",
  C: "#fecb02",
  D: "#ee8100",
  E: "#e63e11",
};

const NUTRI_SUB = {
  A: "Sehr gute Nährqualität",
  B: "Gute Nährqualität",
  C: "Mittlere Nährqualität",
  D: "Geringe Nährqualität",
  E: "Sehr geringe Nährqualität",
};

const NOVA_COLORS = {
  1: "#00a95c",
  2: "#f4b400",
  3: "#ff8a3d",
  4: "#e53935",
};

const NOVA_SUB = {
  1: "Unverarbeitet oder nur minimal verarbeitet.",
  2: "Verarbeitete Zutaten (z. B. Öl, Zucker, Salz).",
  3: "Verarbeitete Lebensmittel — zubereitet aus 2–3 Zutaten.",
  4: "Ultravearbeitete Lebensmittel mit vielen Zusatzstoffen.",
};

const GREEN_COLORS = {
  A: "#1b5e20",
  B: "#43a047",
  C: "#c0a000",
  D: "#ef6c00",
  E: "#c62828",
};

const GREEN_SUB = {
  A: "Sehr geringer Umwelt-Impact (Green-Score).",
  B: "Geringer Umwelt-Impact.",
  C: "Mittlerer Umwelt-Impact.",
  D: "Hoher Umwelt-Impact.",
  E: "Sehr hoher Umwelt-Impact.",
};

function NutriMark({ grade }) {
  const g = String(grade).toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        gap: 0.5,
        padding: 1,
        borderRadius: 3,
        background: "rgba(0,0,0,0.45)",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {["A", "B", "C", "D", "E"].map((letter) => {
        const active = letter === g;
        const bg = NUTRI_COLORS[letter];
        return (
          <span
            key={letter}
            style={{
              width: active ? 12 : 8,
              height: active ? 15 : 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: active ? 9 : 6,
              fontWeight: 900,
              color: letter === "C" && active ? "#1a1a1a" : "#fff",
              background: active ? bg : `${bg}70`,
              borderRadius: 2,
              lineHeight: 1,
              zIndex: active ? 1 : 0,
              boxShadow: active ? "0 0 0 1px rgba(255,255,255,0.85)" : "none",
            }}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}

function NovaMark({ nova }) {
  const n = Number(nova);
  const bg = NOVA_COLORS[n] || "#e53935";
  const dark = n === 2;
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        background: bg,
        color: dark ? "#1a1a1a" : "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: 5, fontWeight: 800, letterSpacing: "0.02em" }}>
        NOVA
      </span>
      <span style={{ fontSize: 10, fontWeight: 900, marginTop: -0.5 }}>{n}</span>
    </span>
  );
}

function GreenMark({ grade }) {
  const g = String(grade).toUpperCase();
  const bg = GREEN_COLORS[g] || "#1b5e20";
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: 5, fontWeight: 800 }}>ECO</span>
      <span style={{ fontSize: 9, fontWeight: 900, marginTop: 0 }}>{g}</span>
    </span>
  );
}

/**
 * @param {{ nutriscore?: string|null, nova?: number|null, greenscore?: string|null }} props
 */
export default function FoodScoreBadges({ nutriscore, nova, greenscore }) {
  const [open, setOpen] = useState(null);

  const n = nutriscore ? String(nutriscore).toUpperCase().trim() : null;
  const v =
    nova != null && Number(nova) >= 1 && Number(nova) <= 4
      ? Math.round(Number(nova))
      : null;
  const e = greenscore ? String(greenscore).toUpperCase().trim() : null;

  const nutriOk = n && NUTRI_COLORS[n] ? n : null;
  const greenOk = e && GREEN_COLORS[e] ? e : null;

  if (!nutriOk && !v && !greenOk) return null;

  const items = [];
  if (nutriOk) {
    items.push({
      id: "nutri",
      title: `Nutri-Score ${nutriOk}`,
      detail: NUTRI_SUB[nutriOk],
      color: NUTRI_COLORS[nutriOk],
      mark: <NutriMark grade={nutriOk} />,
      label: `Nutri ${nutriOk}`,
    });
  }
  if (v) {
    items.push({
      id: "nova",
      title: `NOVA ${v}`,
      detail: NOVA_SUB[v],
      color: NOVA_COLORS[v],
      mark: <NovaMark nova={v} />,
      label: `NOVA ${v}`,
    });
  }
  if (greenOk) {
    items.push({
      id: "green",
      title: `Green-Score ${greenOk}`,
      detail: GREEN_SUB[greenOk],
      color: GREEN_COLORS[greenOk],
      mark: <GreenMark grade={greenOk} />,
      label: `Green ${greenOk}`,
    });
  }

  const active = items.find((i) => i.id === open) || null;
  const toggle = (id) => setOpen((cur) => (cur === id ? null : id));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        margin: "8px 0 4px",
        width: "100%",
      }}
      role="group"
      aria-label="Produkt-Bewertungen"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        }}
      >
        {items.map((item) => {
          const isOpen = open === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-label={`${item.title}. ${item.detail}`}
              title={item.detail}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 4px",
                margin: 0,
                border: "none",
                borderRadius: 6,
                background: isOpen ? `${item.color}22` : "transparent",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                opacity: isOpen ? 1 : 0.92,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {item.mark}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 650,
                  color: "var(--text-dim, #9aa0ad)",
                  letterSpacing: "-0.1px",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {active ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "6px 8px",
            borderRadius: 8,
            fontSize: 11.5,
            lineHeight: 1.35,
            color: "var(--text-dim, #9aa0ad)",
            background: "var(--surface-2, rgba(255,255,255,0.04))",
          }}
        >
          <strong style={{ color: "var(--text, #e8eaed)", fontWeight: 650 }}>
            {active.title}
          </strong>
          {" — "}
          {active.detail}
        </p>
      ) : null}
    </div>
  );
}
