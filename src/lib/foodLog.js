/* Food-Log-Helfer — Einträge, Favoriten, Cache, Eigenprodukte, Gestern, Wasser */

import { uid, todayISO, localISO, mondayOf } from "./utils.js";
import { scalePer100, toCacheProduct } from "./openFoodFacts.js";

const CACHE_MAX = 120;
const CUSTOM_MAX = 80;

export const MEAL_TYPES = [
  { id: "breakfast", label: "Frühstück" },
  { id: "lunch", label: "Mittag" },
  { id: "dinner", label: "Abend" },
  { id: "snack", label: "Snack" },
];

export const WATER_PRESETS_ML = [200, 250, 300, 500];

/**
 * @param {object} product — aus openFoodFacts
 * @param {number} grams
 * @param {string|null} meal
 */
export function makeFoodEntry(product, grams, meal = null, date = todayISO()) {
  const g = Math.max(1, Math.round(Number(grams) || 100));
  const totals = scalePer100(product.per100, g);
  return {
    id: "food-" + uid(),
    date,
    at: Date.now(),
    barcode: product.barcode || "",
    name: product.name || "Produkt",
    brand: product.brand || "",
    image: product.image || null,
    grams: g,
    meal: meal || null,
    per100: { ...(product.per100 || {}) },
    totals,
    nutriscore: product.nutriscore || null,
    nova: product.nova ?? null,
    greenscore: product.greenscore || null,
    allergens: Array.isArray(product.allergens) ? [...product.allergens] : [],
    source: product.source || "openfoodfacts",
  };
}

/** Gestern als ISO (lokal). */
export function yesterdayISO(today = todayISO()) {
  const d = new Date(today + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return localISO(d);
}

/** Einträge gestern, optional nur eine Mahlzeit. */
export function foodEntriesYesterday(foodLog, mealId = null, today = todayISO()) {
  const y = yesterdayISO(today);
  return foodEntriesForDay(foodLog, y).filter(
    (e) => !mealId || e.meal === mealId,
  );
}

/** Mahlzeiten die gestern Einträge hatten. */
export function mealsFromYesterday(foodLog, today = todayISO()) {
  const yEntries = foodEntriesYesterday(foodLog, null, today);
  const ids = new Set(yEntries.map((e) => e.meal).filter(Boolean));
  return MEAL_TYPES.filter((m) => ids.has(m.id)).map((m) => ({
    ...m,
    count: yEntries.filter((e) => e.meal === m.id).length,
    entries: yEntries.filter((e) => e.meal === m.id),
  }));
}

/**
 * Kopiert gestrige Mahlzeit (oder ganzen Tag) auf heute.
 * @returns {object[]} neue Einträge
 */
export function copyMealFromYesterday(foodLog, mealId = null, today = todayISO()) {
  const src = foodEntriesYesterday(foodLog, mealId, today);
  return src.map((e) =>
    makeFoodEntry(
      {
        barcode: e.barcode,
        name: e.name,
        brand: e.brand,
        image: e.image,
        per100: e.per100,
        nutriscore: e.nutriscore,
        nova: e.nova,
        greenscore: e.greenscore,
        allergens: e.allergens,
        source: e.source || "copy",
      },
      e.grams,
      e.meal,
      today,
    ),
  );
}

/** Offline-Cache: Produkt merken (nach Barcode). */
export function putProductCache(cache, product) {
  const code = String(product?.barcode || "").replace(/\D/g, "");
  if (!code || code.length < 8) return cache || {};
  const snap = toCacheProduct(product);
  if (!snap) return cache || {};
  const next = { ...(cache || {}), [code]: snap };
  // LRU-ähnlich: älteste raus wenn zu voll
  const keys = Object.keys(next);
  if (keys.length > CACHE_MAX) {
    const sorted = keys.sort(
      (a, b) => (next[a].cachedAt || 0) - (next[b].cachedAt || 0),
    );
    for (let i = 0; i < sorted.length - CACHE_MAX; i++) {
      delete next[sorted[i]];
    }
  }
  return next;
}

export function getProductCache(cache, barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (!code) return null;
  const hit = cache?.[code];
  return hit ? { ...hit, fromCache: true } : null;
}

/** Eigenes Produkt anlegen. */
export function makeCustomProduct({
  name,
  brand = "",
  barcode = "",
  per100 = {},
  allergens = [],
  nutriscore = null,
}) {
  const n = String(name || "").trim();
  if (!n) return null;
  return {
    id: "custom-" + uid(),
    barcode: String(barcode || "").replace(/\D/g, ""),
    name: n,
    brand: String(brand || "").trim(),
    image: null,
    per100: {
      kcal: per100.kcal != null ? Number(per100.kcal) : null,
      protein: per100.protein != null ? Number(per100.protein) : null,
      carbs: per100.carbs != null ? Number(per100.carbs) : null,
      fat: per100.fat != null ? Number(per100.fat) : null,
      sugar: null,
      salt: null,
    },
    nutriscore: nutriscore || null,
    allergens: Array.isArray(allergens) ? allergens : [],
    source: "custom",
    cachedAt: Date.now(),
  };
}

export function upsertCustomProduct(list, product) {
  const arr = Array.isArray(list) ? [...list] : [];
  const k = foodKey(product);
  const idx = arr.findIndex((p) => foodKey(p) === k || p.id === product.id);
  if (idx >= 0) arr[idx] = { ...arr[idx], ...product, cachedAt: Date.now() };
  else arr.unshift(product);
  return arr.slice(0, CUSTOM_MAX);
}

export function findCustomByBarcode(list, barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (!code) return null;
  return (list || []).find((p) => p.barcode === code) || null;
}

/** Snapshot für Favoriten / Recent-Reuse */
export function productSnapshotFromEntry(entry) {
  return {
    id: entry.barcode || entry.id || "p-" + uid(),
    barcode: entry.barcode || "",
    name: entry.name || "Produkt",
    brand: entry.brand || "",
    image: entry.image || null,
    per100: { ...(entry.per100 || {}) },
    nutriscore: entry.nutriscore || null,
    nova: entry.nova ?? null,
    greenscore: entry.greenscore || null,
    allergens: Array.isArray(entry.allergens) ? [...entry.allergens] : [],
    lastGrams: entry.grams || 100,
    lastMeal: entry.meal || "snack",
    at: entry.at || Date.now(),
    source: entry.source || "openfoodfacts",
  };
}

export function productSnapshotFromProduct(product, grams = 100, meal = "snack") {
  return {
    id: product.barcode || product.id || "p-" + uid(),
    barcode: product.barcode || "",
    name: product.name || "Produkt",
    brand: product.brand || "",
    image: product.image || null,
    per100: { ...(product.per100 || {}) },
    nutriscore: product.nutriscore || null,
    nova: product.nova ?? null,
    greenscore: product.greenscore || null,
    allergens: Array.isArray(product.allergens) ? [...product.allergens] : [],
    lastGrams: grams,
    lastMeal: meal,
    at: Date.now(),
    source: product.source || "openfoodfacts",
  };
}

export function foodKey(item) {
  if (item?.barcode) return "b:" + item.barcode;
  return "n:" + String(item?.name || "").toLowerCase().trim();
}

export function foodEntriesForDay(foodLog, date = todayISO()) {
  return (foodLog || [])
    .filter((e) => e.date === date)
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

export function dayFoodTotals(entries) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    t.kcal += e.totals?.kcal || 0;
    t.protein += e.totals?.protein || 0;
    t.carbs += e.totals?.carbs || 0;
    t.fat += e.totals?.fat || 0;
  }
  return {
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein * 10) / 10,
    carbs: Math.round(t.carbs * 10) / 10,
    fat: Math.round(t.fat * 10) / 10,
  };
}

/** Einzigartige zuletzt genutzte Produkte (max n). */
export function recentFoodProducts(foodLog, limit = 12) {
  const seen = new Set();
  const out = [];
  const sorted = [...(foodLog || [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  for (const e of sorted) {
    const k = foodKey(e);
    if (!k || k === "n:" || seen.has(k)) continue;
    seen.add(k);
    out.push(productSnapshotFromEntry(e));
    if (out.length >= limit) break;
  }
  return out;
}

export function isFoodFavorite(favorites, item) {
  const k = foodKey(item);
  return (favorites || []).some((f) => foodKey(f) === k);
}

export function toggleFoodFavorite(favorites, productOrEntry, grams, meal) {
  const snap =
    productOrEntry.per100 != null && productOrEntry.name
      ? productSnapshotFromProduct(
          productOrEntry,
          grams ?? productOrEntry.lastGrams ?? 100,
          meal ?? productOrEntry.lastMeal ?? "snack",
        )
      : productSnapshotFromEntry(productOrEntry);
  const k = foodKey(snap);
  const list = Array.isArray(favorites) ? [...favorites] : [];
  const idx = list.findIndex((f) => foodKey(f) === k);
  if (idx >= 0) {
    list.splice(idx, 1);
    return { list, added: false };
  }
  list.unshift(snap);
  return { list: list.slice(0, 40), added: true };
}

/** Wasser ml für einen Tag aus wellness-Map. */
export function getWaterMl(wellness, date = todayISO()) {
  return Math.max(0, Math.round(Number(wellness?.[date]?.water) || 0));
}

export function setWaterMl(wellness, date, ml) {
  const next = { ...(wellness || {}) };
  const day = { ...(next[date] || {}) };
  day.water = Math.max(0, Math.round(Number(ml) || 0));
  next[date] = day;
  return next;
}

export function addWaterMl(wellness, date, delta) {
  return setWaterMl(wellness, date, getWaterMl(wellness, date) + delta);
}

/** Mon–heute (oder volle Woche) Food-Totals. */
export function weekFoodSummary(foodLog, today = todayISO()) {
  const mon = mondayOf(today);
  const start = new Date(mon + "T00:00:00");
  const days = [];
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let entryCount = 0;
  const byDay = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = localISO(d);
    if (iso > today) break;
    const entries = foodEntriesForDay(foodLog, iso);
    const t = dayFoodTotals(entries);
    days.push(iso);
    entryCount += entries.length;
    kcal += t.kcal;
    protein += t.protein;
    carbs += t.carbs;
    fat += t.fat;
    byDay.push({
      date: iso,
      label: d.toLocaleDateString("de-DE", { weekday: "short" }),
      ...t,
      count: entries.length,
    });
  }

  const n = Math.max(1, byDay.filter((d) => d.count > 0).length);
  return {
    daysLogged: byDay.filter((d) => d.count > 0).length,
    entryCount,
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    avgKcal: Math.round(kcal / n),
    byDay,
  };
}
