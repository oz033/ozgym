/* App-Shell: State, Persistenz, Theme/Modus, Navigation */

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  House,
  Dumbbell,
  ClipboardList,
  ChartColumn,
  UserRound,
  Volume2,
  VolumeX,
  Sun,
  Moon,
} from "lucide-react";
import { OzGymMark, SplashScreen } from "./components/brand.jsx";
import Onboarding from "./components/Onboarding.jsx";

import { STORAGE_KEY, STORAGE_KEY_LEGACY, blankPlan, APP_NAME } from "./lib/constants.js";
import {
  playSound,
  buzz,
  todayISO,
  getTodayPlan,
  workoutReadiness,
  trimExercisesToDuration,
  deferredFromTrim,
  mergeQueues,
  hydrateCarryItem,
} from "./lib/utils.js";
import { hydrate, freshState, prepareForStorage } from "./lib/migrate.js";
import { generatePlans } from "./lib/planGenerator.js";
import {
  TabBtn,
  TabSkeleton,
  ToastHost,
  ConfirmHost,
  ActionSheetHost,
  showToast,
} from "./components/ui.jsx";
import { OfflineBanner, InstallCoach } from "./components/IosChrome.jsx";
import { isStandalone } from "./lib/iosShell.js";
// Home ist der erste Screen nach dem Laden — sofort verfügbar statt nachgeladen.
import DashboardTab from "./tabs/DashboardTab.jsx";
// Alles andere (inkl. recharts in ProgressTab) erst bei Bedarf laden, damit der
// initiale Bundle klein bleibt. Als Funktionen abgelegt, damit sie sich nach
// dem ersten Idle-Moment zusätzlich vorab aufwärmen lassen (siehe unten).
const routeImports = {
  workout: () => import("./tabs/LogTab.jsx"),
  workoutMode: () => import("./tabs/WorkoutMode.jsx"),
  plan: () => import("./tabs/PlansTab.jsx"),
  progress: () => import("./tabs/ProgressTab.jsx"),
  profile: () => import("./tabs/ProfileTab.jsx"),
};

const LogTab = lazy(routeImports.workout);
const WorkoutMode = lazy(routeImports.workoutMode);
const PlansTab = lazy(routeImports.plan);
const ProgressTab = lazy(routeImports.progress);
const ProfileTab = lazy(routeImports.profile);

/* Akzent aus Theme-Studio: null = Modus-Standard (CSS), "mono" = S/W, sonst Hex */
function accentVars(accent, theme) {
  if (!accent) return {};
  if (accent === "mono") {
    return theme === "light"
      ? { "--accent": "#191c26", "--accent-2": "#4b5060", "--accent-rgb": "25,28,38", "--on-accent": "#ffffff" }
      : { "--accent": "#e8eaed", "--accent-2": "#9aa0ad", "--accent-rgb": "232,234,237", "--on-accent": "#0a0c0b" };
  }
  const hex = String(accent).replace("#", "");
  if (hex.length < 6) return {};
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return {};
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const full = `#${hex.slice(0, 6)}`;
  // slightly deeper companion for gradients
  const r2 = Math.round(r * 0.62);
  const g2 = Math.round(g * 0.62);
  const b2 = Math.round(b * 0.72);
  const accent2 = `#${[r2, g2, b2].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  return {
    "--accent": full,
    "--accent-2": accent2,
    "--accent-rgb": `${r},${g},${b}`,
    "--on-accent": lum > 0.62 ? "#0c0d12" : "#ffffff",
  };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(() => freshState());
  const [tab, setTab] = useState("home");
  const [workoutOpen, setWorkoutOpen] = useState(false);
  // Wenn ein leerer Plan direkt bearbeitet werden soll (statt nur die Liste
  // zu zeigen), merkt sich das die App hier und reicht es an PlansTab durch.
  const [autoEditPlanId, setAutoEditPlanId] = useState(null);
  const saveTimer = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const mainRef = useRef(null);

  // Reset scroll when switching tabs so iOS doesn't keep a stuck offset
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [tab]);

  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const k of STORAGE_KEY_LEGACY || []) {
          raw = localStorage.getItem(k);
          if (raw) break;
        }
      }
      if (raw) {
        const hydrated = hydrate(JSON.parse(raw));
        setData((prev) => ({ ...prev, ...hydrated }));
      }
    } catch {
      /* keine gespeicherten Daten vorhanden */
    }
    setLoaded(true);
  }, []);

  // Sobald der Browser Leerlaufzeit hat, alle Tab-Chunks im Hintergrund laden.
  // Danach zeigt kein Tab-Wechsel mehr das Skeleton — der Chunk ist längst da.
  useEffect(() => {
    if (!loaded) return;
    const warm = () => Object.values(routeImports).forEach((imp) => imp());
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const id = idle(warm);
    return () => cancelIdle(id);
  }, [loaded]);

  // Globale Haptik: jeder Button-Tap gibt sofort spürbares Feedback, ohne dass
  // jede Komponente selbst buzz() aufrufen muss. Lokale, stärkere Muster (z. B.
  // Satz abschließen) feuern auf click und ersetzen das kurze Tap-Muster.
  const hapticsRef = useRef(true);
  useEffect(() => {
    hapticsRef.current = data.settings?.haptics !== false;
  }, [data.settings?.haptics]);
  useEffect(() => {
    const onPointerDown = (e) => {
      const btn = e.target?.closest?.('button, [role="button"]');
      if (!btn || btn.disabled) return;
      buzz(10, hapticsRef.current);
    };
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const writeStorage = useCallback((next) => {
    try {
      // Full catalog is static — only store customs + favorites.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prepareForStorage(next)));
      return true;
    } catch (e) {
      console.error("Speichern fehlgeschlagen", e);
      // User-sichtbar: sonst wirkt es, als würde nichts gespeichert
      const quota =
        e?.name === "QuotaExceededError" ||
        /quota|storage/i.test(String(e?.message || e));
      showToast(
        quota
          ? "Speicher voll — Backup exportieren oder alte Logs löschen."
          : "Speichern fehlgeschlagen. Bitte erneut versuchen.",
        "error",
      );
      return false;
    }
  }, []);

  const persist = useCallback(
    (next, { immediate = false } = {}) => {
      dataRef.current = next;
      clearTimeout(saveTimer.current);
      if (immediate) {
        writeStorage(next);
        return;
      }
      saveTimer.current = setTimeout(() => {
        writeStorage(next);
      }, 250);
    },
    [writeStorage],
  );

  // Tab schließen / App in Hintergrund: pending Debounce sofort flushen
  useEffect(() => {
    const flush = () => {
      clearTimeout(saveTimer.current);
      writeStorage(dataRef.current);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [writeStorage]);

  const update = useCallback(
    (fn, opts) => {
      setData((prev) => {
        const next = typeof fn === "function" ? fn(prev) : fn;
        persist(next, opts);
        return next;
      });
    },
    [persist],
  );

  const theme = data.settings?.theme || "dark";
  const mode = data.profile?.gender || "n";
  const cfg = data.settings?.themeCfg || {};

  // Browser-Chrome (PWA-Statusleiste) an Theme anpassen
  // Sync root/html/body background with theme so iOS home-indicator zone
  // never shows a stale white/black strip when toggling light ↔ dark.
  useEffect(() => {
    const fallback = theme === "light" ? "#eef1ea" : "#0a0c0b";
    // Prefer live CSS token from .ig-app (mode-specific dark tints etc.)
    const appEl = document.querySelector(".ig-app");
    const token = appEl
      ? getComputedStyle(appEl).getPropertyValue("--bg").trim()
      : "";
    const bg = token || fallback;

    document.documentElement.style.setProperty("--boot-bg", bg);
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    const root = document.getElementById("root");
    if (root) root.style.backgroundColor = bg;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
    // iOS status bar / PWA chrome
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m) => m.setAttribute("content", bg));
  }, [theme, mode, cfg.accent]);

  // Theme-Studio: Akzent-Variablen + Varianten-Attribute für die ganze App
  const accentStyle = useMemo(() => accentVars(cfg.accent, theme), [cfg.accent, theme]);
  const [standalone, setStandalone] = useState(() =>
    typeof window !== "undefined" ? isStandalone() : false,
  );
  useEffect(() => {
    setStandalone(isStandalone());
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  const themeAttrs = {
    "data-theme": theme,
    "data-mode": mode,
    "data-standalone": standalone ? "yes" : "no",
    "data-radius": cfg.radius || "round",
    "data-density": cfg.density || "cozy",
    "data-font": cfg.font || "grotesk",
    "data-gradient": cfg.gradient === false ? "off" : "on",
    "data-glow": cfg.glow === false ? "off" : "on",
    "data-glass": cfg.glass ? "on" : "off",
    "data-motion": cfg.motion || "full",
  };
  const reduced = cfg.motion === "reduced";

  // Heutiger Plan: full → trim by Dauer; optional Carry-Over anhängen
  const { queue, deferredQueue, carryHydrated } = useMemo(() => {
    const plan = getTodayPlan(data);
    const byId = {};
    (data.library || []).forEach((e) => {
      byId[e.id] = e;
    });
    const rest = data.settings?.restSeconds ?? 90;
    const empty = {
      queue: [],
      deferredQueue: [],
      carryHydrated: [],
    };
    if (!plan) return empty;

    const full = plan.exercises
      .map((item) => {
        const entry = byId[item.exerciseId];
        if (!entry) return null;
        return {
          name: entry.name,
          sets: item.sets || 3,
          reps: item.reps || 10,
          weight: item.weight,
          rest: item.rest ?? rest,
          note: item.note || "",
          entry,
        };
      })
      .filter(Boolean);

    const sessionMin =
      data.settings?.sessionMinutes != null
        ? data.settings.sessionMinutes
        : data.profile?.duration ?? 45;
    const trimmed = trimExercisesToDuration(full, sessionMin, rest);
    const deferred = deferredFromTrim(full, trimmed);
    const carryHydrated = (data.carryOver || [])
      .map((raw) => hydrateCarryItem(raw, byId, rest))
      .filter(Boolean);
    // Carry nur anhängen wenn Nutzer das will (nicht doppelt mit heutiger Session)
    const includeCarry = data.settings?.includeCarryOver === true;
    const session = includeCarry
      ? mergeQueues(trimmed, carryHydrated)
      : trimmed;

    return {
      queue: session,
      deferredQueue: deferred,
      carryHydrated,
    };
  }, [data]);

  // PWA-Shortcut (Homescreen-Long-Press): ?quick=start|plan|progress.
  // Hook MUSS vor dem Splash-Early-Return stehen. startWorkout ist erst nach
  // dem Return definiert — deshalb über Ref aufrufen (im selben Render-Pass
  // bereits zugewiesen, Effects laufen nach dem Body).
  const quickRef = useRef(
    new URLSearchParams(window.location.search).get("quick"),
  );
  const startWorkoutRef = useRef(null);
  useEffect(() => {
    const q = quickRef.current;
    if (!loaded || !q) return;
    quickRef.current = null;
    window.history.replaceState(null, "", window.location.pathname);
    if (q === "plan") setTab("plan");
    else if (q === "progress") setTab("progress");
    else if (q === "start") startWorkoutRef.current?.();
  }, [loaded]);

  // Backup-Erinnerung: alles liegt nur in localStorage — Gerätewechsel oder
  // Browser-Datenlöschung = Totalverlust. Ab 10 Einheiten alle 30 Tage ohne
  // Backup erinnern (Nag selbst max. alle 14 Tage).
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      const days = (iso) =>
        iso ? (Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000 : Infinity;
      const s = data.settings || {};
      if (
        (data.logs || []).length >= 10 &&
        days(s.lastBackup) > 30 &&
        days(s.lastBackupNag) > 14
      ) {
        showToast("Lange kein Backup — sichere deine Daten.", "info", {
          actionLabel: "Zum Profil",
          onAction: () => setTab("profile"),
        });
        update((prev) => ({
          ...prev,
          settings: { ...prev.settings, lastBackupNag: todayISO() },
        }));
      }
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const needsOnboarding = loaded && data.profile?.onboarded !== true;

  useEffect(() => {
    if (!loaded) return;
    document.title = APP_NAME;
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="ig-app" {...themeAttrs} style={accentStyle}>
        <SplashScreen label="OZ" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="ig-app" {...themeAttrs} style={accentStyle}>
        <div className="ig-phone">
          <Onboarding
            onComplete={({ profile }) => {
              update((prev) => ({
                ...prev,
                profile: { ...prev.profile, ...profile, onboarded: true },
              }));
              playSound("pr", data.settings?.sound !== false);
              buzz(30, data.settings?.haptics !== false);
            }}
          />
        </div>
      </div>
    );
  }

  const soundOn = data.settings?.sound !== false;
  const goTo = (t) => {
    setTab(t);
    playSound("tap", soundOn);
    buzz(15, data.settings?.haptics !== false);
  };
  // Sackgassen-Check: NIE blind zum Workout-Screen springen. Erst prüfen ob
  // ein Plan existiert und ob er Übungen enthält — sonst zum jeweils
  // richtigen nächsten Schritt führen (Plan anlegen bzw. Plan befüllen).
  const startWorkout = () => {
    const readiness = workoutReadiness(data);
    if (readiness.status === "no-plans") {
      goTo("plan");
      return;
    }
    if (readiness.status === "empty-plan") {
      setAutoEditPlanId(readiness.planId);
      goTo("plan");
      return;
    }
    if (queue.length === 0) {
      // Sicherheitsnetz: Übung im Plan referenziert eine gelöschte Bibliothekseinheit
      goTo("plan");
      return;
    }
    setTab("workout");
    setWorkoutOpen(true);
  };
  startWorkoutRef.current = startWorkout;

  // Leeren Plan anlegen und direkt in die Bearbeitung springen — ein Tap statt zwei.
  const createPlanAndEdit = () => {
    const plan = blankPlan((data.plans || []).length);
    update((prev) => ({
      ...prev,
      plans: [...(prev.plans || []), plan],
      activePlanId: prev.activePlanId || plan.id,
    }));
    setAutoEditPlanId(plan.id);
    setTab("plan");
  };

  // Bestehenden (leeren) Plan direkt zur Bearbeitung öffnen statt nur die Liste zu zeigen
  const editPlan = (planId) => {
    setAutoEditPlanId(planId);
    setTab("plan");
  };

  // Theme-Wechsel als kreisförmiger Wipe vom Tap-Punkt aus (View Transitions
  // API). flushSync: der DOM muss synchron im Transition-Callback stehen,
  // sonst friert die API den alten Zustand ein. Fallback (kein Support /
  // reduced motion): normaler Toggle mit CSS-Farb-Transition.
  const toggleTheme = (e) => {
    const apply = () =>
      update((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          theme: theme === "dark" ? "light" : "dark",
        },
      }));
    const reducedPref =
      reduced ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (typeof document.startViewTransition !== "function" || reducedPref) {
      apply();
      return;
    }
    const x = e?.clientX ?? window.innerWidth - 40;
    const y = e?.clientY ?? 40;
    const vt = document.startViewTransition(() => flushSync(apply));
    vt.ready
      .then(() => {
        const r = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${r}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
  };

  // Fertige Vorlage aus dem Profil generieren (Ziel/Level/Equipment bereits bekannt)
  const createSmartPlanAndGo = () => {
    update((prev) => {
      const generated = generatePlans(prev.profile, prev.library || []);
      return {
        ...prev,
        plans: [...generated, ...(prev.plans || [])],
        activePlanId: generated[0]?.id || prev.activePlanId,
      };
    });
    setTab("plan");
  };

  // Home has its own welcome chrome — hide global header (FitPal rhythm)
  const hideHeader = tab === "home";

  return (
    <div
      className="ig-app"
      {...themeAttrs}
      style={accentStyle}
      data-home-chrome={hideHeader ? "immersive" : "bar"}
    >
      <div className="ig-phone">
        {!hideHeader && (
          <header className="ig-header">
            <div className="ig-brand">
              <span className="ig-brand-mark">
                <OzGymMark size={30} variant="glass" title={APP_NAME} />
              </span>
              <span className="ig-brand-name">{APP_NAME}</span>
            </div>
            <div className="ig-header-actions">
              <button
                className="ig-mute-btn"
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {/* key erzwingt Remount → Swap-Animation beim Wechsel */}
                <span className="ig-icon-swap" key={theme}>
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </span>
              </button>
              <button
                className="ig-mute-btn"
                type="button"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      sound: prev.settings?.sound === false,
                    },
                  }))
                }
                aria-label={soundOn ? "Sound stummschalten" : "Sound einschalten"}
              >
                <span className="ig-icon-swap" key={soundOn ? "on" : "off"}>
                  {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </span>
              </button>
            </div>
          </header>
        )}

        <main className="ig-main" ref={mainRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              className="ig-tab-motion"
              /* Opacity only — y/transform breaks nested overflow scroll on iOS */
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              <Suspense fallback={<TabSkeleton />}>
                {tab === "home" && (
                  <DashboardTab
                    data={data}
                    update={update}
                    goTo={goTo}
                    onStart={startWorkout}
                  />
                )}
                {tab === "workout" && (
                  <LogTab
                    data={data}
                    update={update}
                    goTo={goTo}
                    queue={queue}
                    deferredQueue={deferredQueue}
                    carryHydrated={carryHydrated}
                    onStart={startWorkout}
                    onCreatePlan={createPlanAndEdit}
                    onCreateSmartPlan={createSmartPlanAndGo}
                    onEditPlan={editPlan}
                  />
                )}
                {tab === "plan" && (
                  <PlansTab
                    data={data}
                    update={update}
                    goTo={goTo}
                    autoOpenPlanId={autoEditPlanId}
                    onAutoOpenHandled={() => setAutoEditPlanId(null)}
                  />
                )}
                {tab === "progress" && (
                  <ProgressTab
                    data={data}
                    update={update}
                    onStart={startWorkout}
                    onEditPlan={editPlan}
                  />
                )}
                {tab === "profile" && <ProfileTab data={data} update={update} goTo={goTo} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        {workoutOpen && (
          <Suspense fallback={<div className="ig-wo"><TabSkeleton /></div>}>
            <WorkoutMode
              data={data}
              update={update}
              queue={queue}
              onExit={() => setWorkoutOpen(false)}
              onFinish={() => {
                setWorkoutOpen(false);
                // Nachholen-Liste leeren, wenn sie in dieser Session drin war
                update((prev) => {
                  if (!prev.settings?.includeCarryOver) {
                    return prev;
                  }
                  return {
                    ...prev,
                    carryOver: [],
                    settings: { ...prev.settings, includeCarryOver: false },
                  };
                });
                goTo("home");
              }}
            />
          </Suspense>
        )}

        <ToastHost hapticsOn={data.settings?.haptics !== false} />
        <ConfirmHost hapticsOn={data.settings?.haptics !== false} />
        <ActionSheetHost hapticsOn={data.settings?.haptics !== false} />
        <OfflineBanner />
        {!workoutOpen && <InstallCoach hidden={standalone} />}

        {/* Dock shell paints app bg into home-indicator zone; pill floats above */}
        {!workoutOpen && (
          <div className="ig-dock">
            <nav className="ig-tabbar" aria-label="Hauptnavigation" role="navigation">
              <TabBtn
                active={tab === "home"}
                onClick={() => goTo("home")}
                icon={<House size={20} strokeWidth={1.75} />}
                label="Heute"
              />
              <TabBtn
                active={tab === "workout"}
                onClick={() => goTo("workout")}
                icon={<Dumbbell size={20} strokeWidth={1.75} />}
                label="Train"
              />
              <TabBtn
                active={tab === "plan"}
                onClick={() => goTo("plan")}
                icon={<ClipboardList size={20} strokeWidth={1.75} />}
                label="Pläne"
              />
              <TabBtn
                active={tab === "progress"}
                onClick={() => goTo("progress")}
                icon={<ChartColumn size={20} strokeWidth={1.75} />}
                label="Verlauf"
              />
              <TabBtn
                active={tab === "profile"}
                onClick={() => goTo("profile")}
                icon={<UserRound size={20} strokeWidth={1.75} />}
                label="Profil"
              />
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
