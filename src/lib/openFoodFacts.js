/**
 * Open Food Facts — Barcode → Nährwerte, Allergene, Nutri-Score.
 * Offline: Aufrufer speichert Produkte im foodProductCache.
 */

const API = "https://world.openfoodfacts.org/api/v2/product";

/** Häufige Allergene (OFF-Tags → DE) */
export const ALLERGEN_DEFS = [
  { id: "gluten", tag: "en:gluten", label: "Gluten" },
  { id: "milk", tag: "en:milk", label: "Milch" },
  { id: "eggs", tag: "en:eggs", label: "Eier" },
  { id: "nuts", tag: "en:nuts", label: "Schalenfrüchte" },
  { id: "peanuts", tag: "en:peanuts", label: "Erdnüsse" },
  { id: "soybeans", tag: "en:soybeans", label: "Soja" },
  { id: "sesame", tag: "en:sesame-seeds", label: "Sesam" },
  { id: "fish", tag: "en:fish", label: "Fisch" },
  { id: "crustaceans", tag: "en:crustaceans", label: "Krebstiere" },
  { id: "celery", tag: "en:celery", label: "Sellerie" },
  { id: "mustard", tag: "en:mustard", label: "Senf" },
  { id: "lupin", tag: "en:lupin", label: "Lupine" },
  { id: "molluscs", tag: "en:molluscs", label: "Weichtiere" },
  { id: "sulphites", tag: "en:sulphur-dioxide-and-sulphites", label: "Sulfite" },
];

export const NUTRISCORE_GRADES = ["A", "B", "C", "D", "E"];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kcalPer100(n) {
  if (!n || typeof n !== "object") return null;
  const direct =
    num(n["energy-kcal_100g"]) ??
    num(n.energy_kcal_100g) ??
    num(n["energy-kcal_value"]);
  if (direct != null && direct > 0) return Math.round(direct * 10) / 10;
  const kj = num(n.energy_100g) ?? num(n["energy-kj_100g"]);
  if (kj != null && kj > 0) return Math.round((kj / 4.184) * 10) / 10;
  return null;
}

function parseAllergens(p) {
  const tags = Array.isArray(p.allergens_tags) ? p.allergens_tags : [];
  const fromTags = tags.map((t) => String(t).toLowerCase());
  const ids = [];
  for (const a of ALLERGEN_DEFS) {
    if (fromTags.some((t) => t === a.tag || t.includes(a.id))) {
      ids.push(a.id);
    }
  }
  // Freitext-Fallback
  const text = String(p.allergens || p.allergens_from_ingredients || "").toLowerCase();
  if (text) {
    for (const a of ALLERGEN_DEFS) {
      if (ids.includes(a.id)) continue;
      if (text.includes(a.label.toLowerCase()) || text.includes(a.id)) {
        ids.push(a.id);
      }
    }
  }
  return ids;
}

export function allergenLabels(ids) {
  return (ids || [])
    .map((id) => ALLERGEN_DEFS.find((a) => a.id === id)?.label || id)
    .filter(Boolean);
}

/**
 * @param {string} barcode
 * @returns {Promise<object|null>}
 */
export async function fetchProductByBarcode(barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (code.length < 8) {
    throw new Error("Barcode zu kurz (mind. 8 Ziffern).");
  }

  const fields = [
    "product_name",
    "product_name_de",
    "product_name_en",
    "brands",
    "image_front_small_url",
    "image_url",
    "quantity",
    "serving_size",
    "nutriments",
    "nutriscore_grade",
    "nutrition_grades",
    "nova_group",
    "nova_groups",
    "ecoscore_grade",
    "environmental_score_grade",
    "allergens_tags",
    "allergens",
    "allergens_from_ingredients",
    "code",
  ].join(",");

  // v2 + v0 (Fallback), world + de — manches AT-Produkt nur in einer Spiegelung
  const urls = [
    `${API}/${encodeURIComponent(code)}.json?fields=${fields}`,
    `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
    `https://de.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
  ];

  const signal = AbortSignal.timeout
    ? AbortSignal.timeout(12000)
    : undefined;

  let data = null;
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal,
      });
      // 404 = unbekanntes Produkt, nicht Netzfehler
      if (res.status === 404) {
        data = { status: 0 };
        break;
      }
      if (!res.ok) {
        lastErr = new Error(`Produkt-Suche fehlgeschlagen (${res.status}).`);
        continue;
      }
      data = await res.json();
      if (data.status === 1 && data.product) break;
      if (data.status === 0) break;
    } catch (e) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") {
        throw new Error("Zeitüberschreitung — Netz prüfen oder manuell anlegen.");
      }
      lastErr = e;
    }
  }

  if (!data) {
    throw lastErr || new Error("Produkt-Suche fehlgeschlagen.");
  }
  if (data.status !== 1 || !data.product) {
    return null;
  }

  const p = data.product;
  const n = p.nutriments || {};
  const name =
    p.product_name_de ||
    p.product_name ||
    p.product_name_en ||
    "Unbekanntes Produkt";

  const novaRaw = num(p.nova_group) ?? num(p.nova_groups);
  const ecoRaw =
    p.environmental_score_grade || p.ecoscore_grade || null;
  const nutriRaw = p.nutriscore_grade || p.nutrition_grades || null;

  return {
    barcode: code,
    name: String(name).trim(),
    brand: String(p.brands || "")
      .split(",")[0]
      .trim(),
    image: p.image_front_small_url || p.image_url || null,
    quantity: String(p.quantity || "").trim(),
    servingSize: String(p.serving_size || "").trim(),
    per100: {
      kcal: kcalPer100(n),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
      sugar: num(n.sugars_100g),
      salt: num(n.salt_100g),
    },
    nutriscore: nutriRaw ? String(nutriRaw).toUpperCase().slice(0, 1) : null,
    nova:
      novaRaw != null && novaRaw >= 1 && novaRaw <= 4
        ? Math.round(novaRaw)
        : null,
    greenscore: ecoRaw ? String(ecoRaw).toUpperCase().slice(0, 1) : null,
    allergens: parseAllergens(p),
    source: "openfoodfacts",
    cachedAt: Date.now(),
  };
}

/** Slim-Snapshot für Offline-Cache (ohne raw). */
export function toCacheProduct(product) {
  if (!product) return null;
  return {
    barcode: product.barcode || "",
    name: product.name || "",
    brand: product.brand || "",
    image: product.image || null,
    quantity: product.quantity || "",
    servingSize: product.servingSize || "",
    per100: { ...(product.per100 || {}) },
    nutriscore: product.nutriscore || null,
    nova: product.nova ?? null,
    greenscore: product.greenscore || null,
    allergens: Array.isArray(product.allergens) ? [...product.allergens] : [],
    source: product.source || "openfoodfacts",
    cachedAt: product.cachedAt || Date.now(),
  };
}

/** Labels wie auf openfoodfacts.org (kurz, DE) */
export const NUTRI_COPY = {
  A: { title: "Nutri-Score A", sub: "Sehr gute Nährqualität" },
  B: { title: "Nutri-Score B", sub: "Gute Nährqualität" },
  C: { title: "Nutri-Score C", sub: "Mittlere Nährqualität" },
  D: { title: "Nutri-Score D", sub: "Geringe Nährqualität" },
  E: { title: "Nutri-Score E", sub: "Sehr geringe Nährqualität" },
};

export const NOVA_COPY = {
  1: { title: "NOVA 1", sub: "Unverarbeitet / minimal" },
  2: { title: "NOVA 2", sub: "Verarbeitete Zutaten" },
  3: { title: "NOVA 3", sub: "Verarbeitete Lebensmittel" },
  4: { title: "NOVA 4", sub: "Ultravearbeitet" },
};

export const GREEN_COPY = {
  A: { title: "Green-Score A", sub: "Sehr geringer Umwelt-Impact" },
  B: { title: "Green-Score B", sub: "Geringer Umwelt-Impact" },
  C: { title: "Green-Score C", sub: "Mittlerer Umwelt-Impact" },
  D: { title: "Green-Score D", sub: "Hoher Umwelt-Impact" },
  E: { title: "Green-Score E", sub: "Sehr hoher Umwelt-Impact" },
};

export function scalePer100(per100, grams) {
  const g = Math.max(0, Number(grams) || 0);
  const f = g / 100;
  const scale = (v) =>
    v == null || !Number.isFinite(v) ? null : Math.round(v * f * 10) / 10;
  return {
    kcal: scale(per100?.kcal),
    protein: scale(per100?.protein),
    carbs: scale(per100?.carbs),
    fat: scale(per100?.fat),
    sugar: scale(per100?.sugar),
    salt: scale(per100?.salt),
  };
}

export function parseGramsHint(text) {
  const s = String(text || "").toLowerCase().replace(",", ".");
  const mG = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (mG) return Math.round(Number(mG[1]));
  const mMl = s.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (mMl) return Math.round(Number(mMl[1]));
  const mKg = s.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (mKg) return Math.round(Number(mKg[1]) * 1000);
  return null;
}

/** Nutri-Score schlechter als max? (A=best, E=worst) */
export function nutriscoreWorseThan(grade, maxAllowed) {
  if (!grade || !maxAllowed) return false;
  const g = String(grade).toUpperCase();
  const m = String(maxAllowed).toUpperCase();
  const iG = NUTRISCORE_GRADES.indexOf(g);
  const iM = NUTRISCORE_GRADES.indexOf(m);
  if (iG < 0 || iM < 0) return false;
  return iG > iM;
}

/** Schnittmenge Allergene mit Meiden-Liste */
export function matchingAvoidedAllergens(productAllergens, avoidList) {
  const avoid = new Set(avoidList || []);
  return (productAllergens || []).filter((id) => avoid.has(id));
}
