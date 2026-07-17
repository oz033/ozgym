/* Essen: Scan, Cache, Eigenprodukte, Filter, Wie gestern, Wasser */

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ScanBarcode,
  Trash2,
  Plus,
  Search,
  X,
  Apple,
  Star,
  Copy,
  PackagePlus,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import FoodScoreBadges from "../components/FoodScoreBadges.jsx";
import MacroStrip from "../components/MacroStrip.jsx";
import WaterBottle from "../components/WaterBottle.jsx";
import {
  requestBarcodeCamera,
  stopMediaStream,
  cameraErrorMessage,
} from "../lib/camera.js";
import { isIos } from "../lib/iosShell.js";
import {
  fetchProductByBarcode,
  scalePer100,
  parseGramsHint,
  allergenLabels,
  nutriscoreWorseThan,
  matchingAvoidedAllergens,
} from "../lib/openFoodFacts.js";
import {
  makeFoodEntry,
  foodEntriesForDay,
  dayFoodTotals,
  MEAL_TYPES,
  WATER_PRESETS_ML,
  recentFoodProducts,
  isFoodFavorite,
  toggleFoodFavorite,
  getWaterMl,
  addWaterMl,
  setWaterMl,
  productSnapshotFromProduct,
  putProductCache,
  getProductCache,
  makeCustomProduct,
  upsertCustomProduct,
  findCustomByBarcode,
  mealsFromYesterday,
  copyMealFromYesterday,
  foodEntriesYesterday,
} from "../lib/foodLog.js";
import { todayISO } from "../lib/utils.js";
import { showToast, showConfirm } from "../components/ui.jsx";

const GRAM_PRESETS = [50, 100, 150, 200, 250];

export default function FoodTab({
  data,
  update,
  autoOpenScan,
  onAutoScanHandled,
}) {
  const [scanning, setScanning] = useState(false);
  /** Stream muss im Button-Klick geholt werden (iOS User-Gesture) */
  const [scanStream, setScanStream] = useState(null);
  const [scanCamError, setScanCamError] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("snack");
  const [manualCode, setManualCode] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "",
    brand: "",
    barcode: "",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const today = todayISO();
  const favorites = data.foodFavorites || [];
  const customProducts = data.foodCustomProducts || [];
  const avoidAllergens = data.settings?.foodAvoidAllergens || [];
  const nutriMax = data.settings?.foodNutriMax || null;

  const entries = useMemo(
    () => foodEntriesForDay(data.foodLog, today),
    [data.foodLog, today],
  );
  const totals = useMemo(() => dayFoodTotals(entries), [entries]);
  const recent = useMemo(
    () => recentFoodProducts(data.foodLog, 10),
    [data.foodLog],
  );
  const yMeals = useMemo(
    () => mealsFromYesterday(data.foodLog, today),
    [data.foodLog, today],
  );
  const yAllCount = useMemo(
    () => foodEntriesYesterday(data.foodLog, null, today).length,
    [data.foodLog, today],
  );

  const kcalGoal = Number(data.settings?.kcalGoal) || 0;
  const waterGoal = Number(data.settings?.waterGoal) || 0;
  const waterMl = getWaterMl(data.wellness, today);
  const scaled = useMemo(
    () => (product ? scalePer100(product.per100, grams) : null),
    [product, grams],
  );
  const productIsFav = product ? isFoodFavorite(favorites, product) : false;
  const hitAllergens = product
    ? matchingAvoidedAllergens(product.allergens, avoidAllergens)
    : [];
  const nutriWarn =
    product && nutriMax
      ? nutriscoreWorseThan(product.nutriscore, nutriMax)
      : false;

  const closeScanner = useCallback(() => {
    setScanning(false);
    setScanStream((prev) => {
      stopMediaStream(prev);
      return null;
    });
    setScanCamError("");
  }, []);

  /**
   * iPhone Safari: kein Live-Stream — Foto über Systemkamera (einziger
   * zuverlässige Web-Weg für EAN). Android: Stream im Klick holen.
   */
  const openScanner = useCallback(async () => {
    setScanCamError("");
    setScanStream((prev) => {
      stopMediaStream(prev);
      return null;
    });

    // iOS: Live-EAN im Safari-Web ist praktisch unbrauchbar
    if (isIos()) {
      setScanning(true);
      return;
    }

    try {
      const stream = await requestBarcodeCamera();
      setScanStream(stream);
      setScanning(true);
    } catch (e) {
      console.warn("[food] camera", e);
      setScanCamError(cameraErrorMessage(e));
      setScanStream(null);
      setScanning(true);
      showToast(cameraErrorMessage(e), "info");
    }
  }, []);

  useEffect(() => {
    if (!autoOpenScan) return;
    onAutoScanHandled?.();
    // Auto-open: kein User-Gesture → Scanner ohne Stream (Foto/Manuell)
    setScanCamError("");
    setScanStream(null);
    setScanning(true);
  }, [autoOpenScan, onAutoScanHandled]);

  // Stream aufräumen beim Unmount
  useEffect(() => {
    return () => {
      setScanStream((prev) => {
        stopMediaStream(prev);
        return null;
      });
    };
  }, []);

  const presentProduct = useCallback((p, offlineNote = false) => {
    const hint =
      parseGramsHint(p.servingSize) || parseGramsHint(p.quantity) || 100;
    setGrams(hint);
    setProduct(p);
    if (offlineNote) {
      showToast(`${p.name} (gespeichert)`, "info");
    } else {
      showToast(p.name, "info");
    }
  }, []);

  const cacheProduct = useCallback(
    (p) => {
      if (!p?.barcode) return;
      update((prev) => ({
        ...prev,
        foodProductCache: putProductCache(prev.foodProductCache, p),
      }));
    },
    [update],
  );

  const lookup = useCallback(
    async (code) => {
      const clean = String(code || "").replace(/\D/g, "");
      if (clean.length < 8) {
        showToast("Barcode ungültig", "error");
        return;
      }
      // Scanner schließen + Kamera freigeben, Lookup sichtbar machen
      closeScanner();
      setLoading(true);
      setProduct(null);

      const openManualStub = (msg, extra = {}) => {
        if (msg) showToast(msg, "info");
        setProduct({
          barcode: clean,
          name: extra.name || "",
          brand: extra.brand || "",
          image: extra.image || null,
          per100: {
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
            sugar: null,
            salt: null,
            ...(extra.per100 || {}),
          },
          nutriscore: extra.nutriscore || null,
          allergens: extra.allergens || [],
          source: extra.source || "manual",
          notFound: true,
        });
        setGrams(100);
        setLoading(false);
      };

      try {
        // 1) Eigenprodukte
        const custom = findCustomByBarcode(data.foodCustomProducts, clean);
        if (custom) {
          presentProduct({ ...custom, fromCache: false });
          setLoading(false);
          return;
        }

        // 2) Offline-Cache zuerst (schneller, ohne Netz)
        const cachedHit = getProductCache(data.foodProductCache, clean);
        if (cachedHit && !navigator.onLine) {
          presentProduct(cachedHit, true);
          setLoading(false);
          return;
        }

        // 3) Online Open Food Facts
        try {
          const p = await fetchProductByBarcode(clean);
          if (p && !p.notFound) {
            cacheProduct(p);
            presentProduct(p);
            if (p.incomplete) {
              showToast("Unvollständige Daten — bitte prüfen", "info");
            }
            setLoading(false);
            return;
          }
          if (p?.notFound) {
            // In OFF, aber ohne Namen/kcal
            openManualStub(
              "Produkt lückenhaft — Name und kcal ergänzen",
              p,
            );
            return;
          }
        } catch (err) {
          const cached = getProductCache(data.foodProductCache, clean);
          if (cached) {
            presentProduct(cached, true);
            setLoading(false);
            return;
          }
          openManualStub(
            err?.message ||
              "Netzfehler — manuell anlegen oder später erneut scannen",
          );
          return;
        }

        // 4) Online: nicht in OFF → Cache oder manuell
        const cached = getProductCache(data.foodProductCache, clean);
        if (cached) {
          presentProduct(cached, true);
          setLoading(false);
          return;
        }
        openManualStub(
          "Nicht in Open Food Facts — Name & kcal eintippen (danach speicherbar)",
        );
      } catch (e) {
        console.error("[food] lookup", e);
        showToast("Suche fehlgeschlagen", "error");
        setLoading(false);
      }
    },
    [
      data.foodCustomProducts,
      data.foodProductCache,
      cacheProduct,
      presentProduct,
      closeScanner,
    ],
  );

  const openSnapshot = (snap) => {
    setProduct({
      barcode: snap.barcode || "",
      name: snap.name || "",
      brand: snap.brand || "",
      image: snap.image || null,
      per100: { ...(snap.per100 || {}) },
      nutriscore: snap.nutriscore || null,
      nova: snap.nova ?? null,
      greenscore: snap.greenscore || null,
      allergens: Array.isArray(snap.allergens) ? snap.allergens : [],
      source: snap.source || "favorite",
      notFound: false,
    });
    setGrams(snap.lastGrams || 100);
    if (snap.lastMeal) setMeal(snap.lastMeal);
  };

  const saveEntry = () => {
    if (!product) return;
    let name = product.name?.trim();
    if (!name) {
      showToast("Bitte Produktname eingeben", "error");
      return;
    }
    let per100 = { ...(product.per100 || {}) };
    if (product.notFound || per100.kcal == null) {
      const kcalInput = product._manualKcal;
      if (kcalInput != null && Number.isFinite(Number(kcalInput))) {
        per100 = { ...per100, kcal: Number(kcalInput) };
      }
    }
    const payload = {
      ...product,
      name,
      per100,
      allergens: product.allergens || [],
      source: product.source || "openfoodfacts",
    };
    const entry = makeFoodEntry(payload, grams, meal);
    update((prev) => {
      let foodFavorites = prev.foodFavorites || [];
      const snap = productSnapshotFromProduct(payload, grams, meal);
      foodFavorites = foodFavorites.map((f) => {
        const same =
          (f.barcode && f.barcode === snap.barcode) ||
          (!f.barcode &&
            !snap.barcode &&
            String(f.name).toLowerCase() === String(snap.name).toLowerCase());
        return same
          ? { ...f, lastGrams: grams, lastMeal: meal, at: Date.now() }
          : f;
      });
      return {
        ...prev,
        foodLog: [entry, ...(prev.foodLog || [])].slice(0, 500),
        foodFavorites,
        foodProductCache: putProductCache(prev.foodProductCache, payload),
      };
    });
    setProduct(null);
    showToast(`${entry.name} · ${entry.totals.kcal ?? "?"} kcal`, "success");
  };

  const saveAsCustom = () => {
    if (!product?.name?.trim()) {
      showToast("Name fehlt", "error");
      return;
    }
    let per100 = { ...(product.per100 || {}) };
    if (product._manualKcal != null && product._manualKcal !== "") {
      per100 = { ...per100, kcal: Number(product._manualKcal) };
    }
    const custom = makeCustomProduct({
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      per100,
      allergens: product.allergens || [],
      nutriscore: product.nutriscore,
    });
    if (!custom) return;
    update((prev) => ({
      ...prev,
      foodCustomProducts: upsertCustomProduct(prev.foodCustomProducts, custom),
      foodProductCache: putProductCache(prev.foodProductCache, custom),
    }));
    showToast("Eigenes Produkt gespeichert", "success");
  };

  const submitCustomForm = (e) => {
    e?.preventDefault?.();
    const custom = makeCustomProduct({
      name: customForm.name,
      brand: customForm.brand,
      barcode: customForm.barcode,
      per100: {
        kcal: customForm.kcal === "" ? null : Number(customForm.kcal),
        protein: customForm.protein === "" ? null : Number(customForm.protein),
        carbs: customForm.carbs === "" ? null : Number(customForm.carbs),
        fat: customForm.fat === "" ? null : Number(customForm.fat),
      },
    });
    if (!custom) {
      showToast("Name eingeben", "error");
      return;
    }
    update((prev) => ({
      ...prev,
      foodCustomProducts: upsertCustomProduct(prev.foodCustomProducts, custom),
      foodProductCache: putProductCache(prev.foodProductCache, custom),
    }));
    setShowCustom(false);
    setCustomForm({
      name: "",
      brand: "",
      barcode: "",
      kcal: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    openSnapshot({ ...custom, lastGrams: 100, lastMeal: meal });
    showToast("Produkt angelegt", "success");
  };

  const toggleFav = (item, g, m) => {
    update((prev) => {
      const { list, added } = toggleFoodFavorite(
        prev.foodFavorites,
        item,
        g,
        m,
      );
      showToast(added ? "Zu Favoriten" : "Favorit entfernt", "info");
      return { ...prev, foodFavorites: list };
    });
  };

  const copyYesterday = async (mealId) => {
    const copies = copyMealFromYesterday(data.foodLog, mealId, today);
    if (!copies.length) {
      showToast("Gestern nichts geloggt", "info");
      return;
    }
    const label = mealId
      ? MEAL_TYPES.find((m) => m.id === mealId)?.label || "Mahlzeit"
      : "ganzen Tag";
    const ok = await showConfirm({
      title: `„Wie gestern“ — ${label}?`,
      message: `${copies.length} Einträg${copies.length === 1 ? "" : "e"} auf heute kopieren.`,
      confirmLabel: "Kopieren",
    });
    if (!ok) return;
    update((prev) => ({
      ...prev,
      foodLog: [...copies, ...(prev.foodLog || [])].slice(0, 500),
    }));
    showToast(`${copies.length}× hinzugefügt`, "success");
  };

  const removeEntry = async (id) => {
    const ok = await showConfirm({
      title: "Eintrag löschen?",
      message: "Der Lebensmittel-Eintrag wird entfernt.",
      confirmLabel: "Löschen",
      destructive: true,
    });
    if (!ok) return;
    update((prev) => ({
      ...prev,
      foodLog: (prev.foodLog || []).filter((e) => e.id !== id),
    }));
  };

  const mealLabel = (id) =>
    MEAL_TYPES.find((m) => m.id === id)?.label || "";

  const favKeys = new Set(
    favorites.map((f) =>
      f.barcode ? "b:" + f.barcode : "n:" + String(f.name || "").toLowerCase(),
    ),
  );
  const recentOnly = recent.filter((r) => {
    const k = r.barcode
      ? "b:" + r.barcode
      : "n:" + String(r.name || "").toLowerCase();
    return !favKeys.has(k);
  });

  return (
    <div className="ig-tabpane ig-food">
      <div className="ig-screen-head">
        <h1 className="ig-screen-title">Essen</h1>
        <div className="ig-screen-head-actions">
          <button
            type="button"
            className="ig-chip sm"
            onClick={() => setShowCustom((s) => !s)}
            aria-expanded={showCustom}
          >
            <PackagePlus size={14} /> Eigenes
          </button>
        </div>
      </div>

      {/* Tages-Summe oben — Überblick vor dem Scan */}
      <section className="ig-card ig-food-summary" aria-label="Heute">
        <MacroStrip
          variant="day"
          kcal={totals.kcal}
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
          kcalGoal={kcalGoal}
        />
      </section>

      {/* Scan — unter der Übersicht */}
      <div className="ig-food-actions ig-food-actions-top">
        <button
          type="button"
          className="ig-btn-primary wide xl ig-home-cta-glow"
          onClick={openScanner}
          disabled={loading}
        >
          <ScanBarcode size={20} aria-hidden="true" />
          Barcode scannen
        </button>
        <form
          className="ig-food-manual-row"
          onSubmit={(e) => {
            e.preventDefault();
            const c = manualCode.replace(/\D/g, "");
            if (c.length >= 8) lookup(c);
            else showToast("Mindestens 8 Ziffern", "error");
          }}
        >
          <input
            className="ig-input mono"
            type="text"
            inputMode="numeric"
            placeholder="EAN eintippen…"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            maxLength={18}
            aria-label="Barcode manuell"
          />
          <button
            type="submit"
            className="ig-btn-primary"
            disabled={loading}
            aria-label="Suchen"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {loading ? (
        <p className="ig-food-loading dim" role="status">
          Produkt wird geladen…
        </p>
      ) : null}

      {/* Produktkarte */}
      {product ? (
        <section
          className="ig-card ig-food-product"
          aria-label="Produkt hinzufügen"
        >
          {product.fromCache ? (
            <p className="ig-food-offline-badge">
              <WifiOff size={12} /> Aus Offline-Cache
            </p>
          ) : null}
          {(hitAllergens.length > 0 || nutriWarn) && (
            <div className="ig-food-warn" role="status">
              {hitAllergens.length > 0 ? (
                <p>
                  Enthält gemiedene Allergene:{" "}
                  <strong>{allergenLabels(hitAllergens).join(", ")}</strong>
                </p>
              ) : null}
              {nutriWarn ? (
                <p>
                  Nutri-Score {product.nutriscore} schlechter als dein Limit{" "}
                  {nutriMax}
                </p>
              ) : null}
            </div>
          )}
          <div className="ig-food-product-head">
            {product.image && !product._imgBroken ? (
              <img
                src={product.image}
                alt={product.name || "Produkt"}
                className="ig-food-thumb"
                width={72}
                height={72}
                loading="eager"
                decoding="async"
                /* Safari blockiert OFF-Bilder manchmal mit Referrer */
                referrerPolicy="no-referrer"
                onError={() =>
                  setProduct((p) => (p ? { ...p, _imgBroken: true } : p))
                }
              />
            ) : (
              <span className="ig-food-thumb ig-food-thumb-ph" aria-hidden="true">
                <Apple size={26} />
              </span>
            )}
            <div className="ig-food-product-meta">
              {product.notFound || !product.name ? (
                <label className="ig-num-field">
                  <span>Produktname</span>
                  <input
                    className="ig-input"
                    value={product.name}
                    onChange={(e) =>
                      setProduct((p) => ({
                        ...p,
                        name: e.target.value,
                        notFound: true,
                      }))
                    }
                    placeholder="z. B. Ja! Naturjoghurt 200g"
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  <strong className="ig-food-product-name">{product.name}</strong>
                  {product.brand ? (
                    <span className="dim">{product.brand}</span>
                  ) : null}
                </>
              )}
              <span className="mono dim" style={{ fontSize: 11 }}>
                EAN {product.barcode || ""}
              </span>
              {product.notFound ? (
                <span className="dim" style={{ fontSize: 11 }}>
                  Nicht (vollständig) in Open Food Facts — manuell ergänzen
                </span>
              ) : !product.image || product._imgBroken ? (
                <span className="dim" style={{ fontSize: 11 }}>
                  Kein Produktfoto in der Datenbank
                </span>
              ) : null}
              {(product.allergens || []).length > 0 ? (
                <span className="ig-food-allergen-line dim">
                  Allergene: {allergenLabels(product.allergens).join(", ")}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className={
                "ig-icon-btn ghost sm" + (productIsFav ? " is-fav" : "")
              }
              onClick={() => toggleFav(product, grams, meal)}
              aria-label={
                productIsFav ? "Favorit entfernen" : "Zu Favoriten"
              }
            >
              <Star size={16} fill={productIsFav ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className="ig-icon-btn ghost sm"
              onClick={() => setProduct(null)}
              aria-label="Abbrechen"
            >
              <X size={16} />
            </button>
          </div>

          {/* Visuelle Scores (Nutri / NOVA / Green) – wie Open Food Facts */}
          <FoodScoreBadges
            nutriscore={product.nutriscore}
            nova={product.nova}
            greenscore={product.greenscore}
          />

          {(product.notFound || product.per100?.kcal == null) && (
            <label className="ig-num-field" style={{ marginTop: 10 }}>
              <span>kcal pro 100 g</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                placeholder="z. B. 250"
                value={product._manualKcal ?? ""}
                onChange={(e) =>
                  setProduct((p) => ({
                    ...p,
                    _manualKcal: e.target.value,
                    per100: {
                      ...p.per100,
                      kcal:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    },
                  }))
                }
              />
            </label>
          )}

          {/* Kompakt: Menge + Gramm-Feld in einer Zeile */}
          <div className="ig-food-add-compact">
            <div className="ig-food-add-row">
              <span className="ig-food-add-lbl">g</span>
              <div className="ig-food-gram-presets ig-food-add-chips">
                {GRAM_PRESETS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={"ig-chip xs" + (grams === g ? " active" : "")}
                    onClick={() => setGrams(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <input
                className="ig-input mono ig-food-add-grams"
                type="number"
                inputMode="numeric"
                min={1}
                max={5000}
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
                aria-label="Gramm"
              />
            </div>

            <div className="ig-food-add-row">
              <span className="ig-food-add-lbl">Mahlzeit</span>
              <div className="ig-food-meals ig-food-add-chips" role="group">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={
                      "ig-chip xs" + (meal === m.id ? " active" : "")
                    }
                    onClick={() => setMeal(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {scaled ? (
              <MacroStrip
                variant="product"
                kcal={scaled.kcal}
                protein={scaled.protein}
                carbs={scaled.carbs}
                fat={scaled.fat}
              />
            ) : null}

            <div className="ig-food-product-actions">
              <button
                type="button"
                className="ig-btn-primary wide"
                onClick={saveEntry}
              >
                <Plus size={16} /> Hinzufügen
              </button>
              {(product.notFound || product.source === "manual") && (
                <button
                  type="button"
                  className="ig-btn-primary wide ghosted"
                  onClick={saveAsCustom}
                >
                  <PackagePlus size={15} /> Als eigenes speichern
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Eigenes Produkt Formular */}
      {showCustom ? (
        <form
          className="ig-card ig-food-custom-form"
          onSubmit={submitCustomForm}
          aria-label="Eigenes Produkt"
        >
          <div className="ig-field-label">Eigenes Produkt speichern</div>
          <label className="ig-num-field">
            <span>Name *</span>
            <input
              className="ig-input"
              value={customForm.name}
              onChange={(e) =>
                setCustomForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="z. B. Proteinriegel Eigenmarke"
              required
            />
          </label>
          <div className="ig-food-custom-grid">
            <label className="ig-num-field">
              <span>Marke</span>
              <input
                className="ig-input"
                value={customForm.brand}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, brand: e.target.value }))
                }
              />
            </label>
            <label className="ig-num-field">
              <span>EAN (opt.)</span>
              <input
                className="ig-input mono"
                inputMode="numeric"
                value={customForm.barcode}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, barcode: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="ig-food-custom-grid">
            <label className="ig-num-field">
              <span>kcal/100g</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                value={customForm.kcal}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, kcal: e.target.value }))
                }
              />
            </label>
            <label className="ig-num-field">
              <span>P g</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                value={customForm.protein}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, protein: e.target.value }))
                }
              />
            </label>
            <label className="ig-num-field">
              <span>KH g</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                value={customForm.carbs}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, carbs: e.target.value }))
                }
              />
            </label>
            <label className="ig-num-field">
              <span>F g</span>
              <input
                className="ig-input mono"
                type="number"
                inputMode="decimal"
                value={customForm.fat}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, fat: e.target.value }))
                }
              />
            </label>
          </div>
          <button type="submit" className="ig-btn-primary wide">
            <Plus size={16} /> Speichern &amp; nutzen
          </button>
        </form>
      ) : null}

      {/* Wie gestern */}
      {(yMeals.length > 0 || yAllCount > 0) && (
        <section className="ig-card ig-food-yesterday" aria-label="Wie gestern">
          <div className="ig-field-label">
            <Copy size={12} aria-hidden="true" /> Wie gestern
          </div>
          <div className="ig-food-meals">
            {yMeals.map((m) => (
              <button
                key={m.id}
                type="button"
                className="ig-chip sm"
                onClick={() => copyYesterday(m.id)}
              >
                {m.label} ({m.count})
              </button>
            ))}
            <button
              type="button"
              className="ig-chip sm"
              onClick={() => copyYesterday(null)}
            >
              Ganzer Tag
            </button>
          </div>
        </section>
      )}

      {/* Wasser — Flasche + kompakte Buttons; Ziel unter Profil → Einstellungen */}
      <section className="ig-food-water-compact" aria-label="Wasser">
        <div className="ig-food-water-compact-row">
          <WaterBottle ml={waterMl} goal={waterGoal} size={38} />
          <div className="ig-food-water-compact-meta">
            <span className="ig-food-water-compact-ml mono">
              {waterMl}
              <span className="dim">
                {waterGoal > 0 ? ` / ${waterGoal}` : ""} ml
              </span>
            </span>
            {waterGoal > 0 ? (
              <span className="ig-food-water-compact-pct mono">
                {Math.min(999, Math.round((waterMl / waterGoal) * 100))}%
              </span>
            ) : null}
          </div>
          <div className="ig-food-water-compact-btns">
            {WATER_PRESETS_ML.map((ml) => (
              <button
                key={ml}
                type="button"
                className="ig-chip xs"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    wellness: addWaterMl(prev.wellness, today, ml),
                  }))
                }
              >
                +{ml}
              </button>
            ))}
            {waterMl > 0 ? (
              <button
                type="button"
                className="ig-chip xs ig-food-water-reset"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    wellness: setWaterMl(prev.wellness, today, 0),
                  }))
                }
                aria-label="Wasser zurücksetzen"
                title="Zurücksetzen"
              >
                <RotateCcw size={13} strokeWidth={2.25} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Favoriten / Eigen / Zuletzt */}
      {favorites.length > 0 ? (
        <QuickRow
          label="Favoriten"
          icon={<Star size={12} />}
          items={favorites}
          onPick={openSnapshot}
        />
      ) : null}
      {customProducts.length > 0 ? (
        <QuickRow
          label="Eigene Produkte"
          icon={<PackagePlus size={12} />}
          items={customProducts}
          onPick={(p) =>
            openSnapshot({ ...p, lastGrams: 100, lastMeal: meal })
          }
        />
      ) : null}
      {recentOnly.length > 0 ? (
        <QuickRow
          label="Zuletzt"
          items={recentOnly}
          onPick={openSnapshot}
        />
      ) : null}

      {/* Einträge */}
      <section className="ig-card" aria-label="Einträge heute">
        <div className="ig-field-label">Einträge · {today}</div>
        {entries.length > 0 ? (
          <ul className="ig-food-list">
            {entries.map((e) => {
              const fav = isFoodFavorite(favorites, e);
              return (
                <li key={e.id} className="ig-food-row">
                  {e.image ? (
                    <img
                      src={e.image}
                      alt=""
                      className="ig-food-thumb sm"
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="ig-food-thumb sm ig-food-thumb-ph"
                      aria-hidden="true"
                    >
                      <Apple size={16} />
                    </span>
                  )}
                  <div className="ig-food-row-body">
                    <strong>{e.name}</strong>
                    <span className="dim">
                      {e.grams} g
                      {e.meal ? ` · ${mealLabel(e.meal)}` : ""}
                      {e.brand ? ` · ${e.brand}` : ""}
                    </span>
                  </div>
                  <span className="ig-food-row-kcal mono">
                    {e.totals?.kcal ?? "—"}
                  </span>
                  <button
                    type="button"
                    className={"ig-icon-btn ghost sm" + (fav ? " is-fav" : "")}
                    onClick={() => toggleFav(e)}
                    aria-label={fav ? "Favorit entfernen" : "Favorit"}
                  >
                    <Star size={14} fill={fav ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    className="ig-icon-btn ghost sm"
                    onClick={() => removeEntry(e.id)}
                    aria-label={`${e.name} löschen`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="ig-food-empty" role="status">
            <Apple size={28} aria-hidden="true" />
            <p className="ig-food-empty-title">Noch keine Einträge heute</p>
            <p className="ig-food-empty-desc dim">
              Barcode scannen, eigenes Produkt anlegen
              {yAllCount > 0 ? " oder „Wie gestern“ nutzen" : ""}.
            </p>
          </div>
        )}
      </section>

      {scanning ? (
        <BarcodeScanner
          onDetect={lookup}
          onClose={closeScanner}
          stream={scanStream}
          cameraError={scanCamError}
          preferPhoto={isIos()}
        />
      ) : null}
    </div>
  );
}

function QuickRow({ label, icon, items, onPick }) {
  return (
    <section className="ig-card ig-food-quick" aria-label={label}>
      <div className="ig-field-label">
        {icon} {label}
      </div>
      <div className="ig-food-quick-scroll">
        {items.map((f, i) => (
          <button
            key={(f.barcode || f.id || f.name) + "-" + i}
            type="button"
            className="ig-food-quick-chip"
            onClick={() => onPick(f)}
          >
            {f.image ? (
              <img
                src={f.image}
                alt=""
                width={28}
                height={28}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Apple size={14} aria-hidden="true" />
            )}
            <span>{f.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
