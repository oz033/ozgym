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

/** http→https, Protocol-relative → https (iOS Safari blockiert mixed content) */
export function fixImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  let s = url.trim();
  if (!s) return null;
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("http://")) s = "https://" + s.slice(7);
  if (!/^https:\/\//i.test(s)) return null;
  return s;
}

/**
 * Beste verfügbare Produkt-Front aus OFF-Feldern.
 * Viele AT-Produkte haben nur selected_images, nicht image_front_*.
 */
export function pickProductImage(p) {
  if (!p || typeof p !== "object") return null;
  const fromSelected = (node) => {
    if (!node || typeof node !== "object") return [];
    // Prefer DE → EN → any
    const order = ["de", "en", "fr", "it", "es"];
    const out = [];
    for (const lang of order) {
      if (node[lang]) out.push(node[lang]);
    }
    for (const v of Object.values(node)) {
      if (typeof v === "string") out.push(v);
    }
    return out;
  };

  const candidates = [
    p.image_front_url,
    p.image_url,
    p.image_front_small_url,
    p.image_small_url,
    p.image_front_thumb_url,
    p.image_thumb_url,
    ...fromSelected(p.selected_images?.front?.display),
    ...fromSelected(p.selected_images?.front?.small),
    ...fromSelected(p.selected_images?.front?.thumb),
  ];

  for (const c of candidates) {
    const fixed = fixImageUrl(c);
    if (fixed) return fixed;
  }
  return null;
}

/** UPC-A (12) ↔ EAN-13 (13 mit führender 0) — Scanner liefern oft eine Variante */
function barcodeVariants(code) {
  const c = String(code || "").replace(/\D/g, "");
  const out = [];
  const add = (x) => {
    if (x && x.length >= 8 && !out.includes(x)) out.push(x);
  };
  add(c);
  if (c.length === 12) add("0" + c);
  if (c.length === 13 && c.startsWith("0")) add(c.slice(1));
  // Manche Codes mit führenden Nullen als 14-stellig
  if (c.length === 14 && c.startsWith("0")) add(c.slice(1));
  return out;
}

/** Bester Anzeigename aus OFF-Feldern (leer → null, kein Fake-„Unbekannt“) */
export function pickProductName(p) {
  if (!p || typeof p !== "object") return null;
  const candidates = [
    p.product_name_de,
    p.product_name,
    p.product_name_en,
    p.product_name_fr,
    p.product_name_it,
    p.generic_name_de,
    p.generic_name,
    p.generic_name_en,
    p.abbreviated_product_name,
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (s && !/^unknown$/i.test(s)) return s;
  }
  const brand = String(p.brands || "")
    .split(",")[0]
    .trim();
  const qty = String(p.quantity || "").trim();
  if (brand && qty) return `${brand} (${qty})`;
  if (brand) return brand;
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * OFF rate-limited stark (429). Wenige Requests, mit Retry — nicht 9 URLs am Stück.
 */
async function fetchOffJson(url, signal) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (res.status === 404) return { status: 0 };
      if (res.status === 429) {
        lastErr = new Error("Open Food Facts ausgelastet — kurz warten…");
        await sleep(700 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Produkt-Suche fehlgeschlagen (${res.status}).`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) {
        lastErr = new Error("Open Food Facts vorübergehend nicht erreichbar.");
        await sleep(500 * (attempt + 1));
        continue;
      }
      return await res.json();
    } catch (e) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") throw e;
      lastErr = e;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr || new Error("Produkt-Suche fehlgeschlagen.");
}

/**
 * @param {string} barcode
 * @returns {Promise<object|null>} null = nicht in der Datenbank
 */
export async function fetchProductByBarcode(barcode) {
  const raw = String(barcode || "").replace(/\D/g, "");
  if (raw.length < 8) {
    throw new Error("Barcode zu kurz (mind. 8 Ziffern).");
  }

  const variants = barcodeVariants(raw);
  const signal = AbortSignal.timeout
    ? AbortSignal.timeout(16000)
    : undefined;

  // Sparsam: 1) world v0 je Variante, 2) erst dann de-Spiegel — vermeidet 429
  const urls = [];
  for (const code of variants) {
    urls.push(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
    );
  }
  for (const code of variants) {
    urls.push(
      `https://de.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
    );
  }

  let product = null;
  let matchedCode = raw;
  let lastErr = null;
  let sawNotFound = false;

  for (const url of urls) {
    try {
      const data = await fetchOffJson(url, signal);
      if (data?.status === 1 && data.product) {
        product = data.product;
        matchedCode =
          String(data.code || data.product.code || raw).replace(/\D/g, "") ||
          raw;
        break;
      }
      if (data?.status === 0) {
        sawNotFound = true;
        continue;
      }
    } catch (e) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") {
        throw new Error(
          "Zeitüberschreitung — Netz prüfen oder manuell anlegen.",
        );
      }
      lastErr = e;
      continue;
    }
  }

  if (!product) {
    if (sawNotFound && !lastErr) return null;
    if (lastErr) throw lastErr;
    return null;
  }

  const p = product;
  const n = p.nutriments || {};
  const name =
    pickProductName(p) ||
    // Kein Fake-„Unbekanntes Produkt“ als Name — leer lässt UI editieren
    "";
  const brand = String(p.brands || "")
    .split(",")[0]
    .trim();

  const novaRaw = num(p.nova_group) ?? num(p.nova_groups);
  const ecoRaw =
    p.environmental_score_grade || p.ecoscore_grade || null;
  const nutriRaw = p.nutriscore_grade || p.nutrition_grades || null;
  const image = pickProductImage(p);

  const per100 = {
    kcal: kcalPer100(n),
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    sugar: num(n.sugars_100g),
    salt: num(n.salt_100g),
  };

  // OFF-Eintrag ohne Namen und ohne kcal = praktisch unbrauchbar
  const incomplete = !name || per100.kcal == null;

  return {
    barcode: matchedCode || raw,
    name: name || brand || "",
    brand,
    image,
    quantity: String(p.quantity || "").trim(),
    servingSize: String(p.serving_size || "").trim(),
    per100,
    nutriscore: nutriRaw ? String(nutriRaw).toUpperCase().slice(0, 1) : null,
    nova:
      novaRaw != null && novaRaw >= 1 && novaRaw <= 4
        ? Math.round(novaRaw)
        : null,
    greenscore: ecoRaw ? String(ecoRaw).toUpperCase().slice(0, 1) : null,
    allergens: parseAllergens(p),
    source: "openfoodfacts",
    incomplete,
    // true nur wenn wirklich nichts Verwertbares da ist → UI zum Ausfüllen
    notFound: !name && per100.kcal == null,
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
    image: fixImageUrl(product.image) || product.image || null,
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
