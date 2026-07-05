/* App-Shell: State, Persistenz, Theme/Modus, Navigation */

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home as HomeIcon,
  Dumbbell,
  CalendarDays,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
  Sun,
  Moon,
} from "lucide-react";
import { EclipseMark, SplashScreen } from "./components/brand.jsx";

import { STORAGE_KEY, blankPlan } from "./lib/constants.js";
import {
  playSound,
  buzz,
  todayISO,
  getTodayPlan,
  workoutReadiness,
} from "./lib/utils.js";
import { hydrate, freshState } from "./lib/migrate.js";
import { generatePlans } from "./lib/planGenerator.js";
import { TabBtn, TabSkeleton } from "./components/ui.jsx";
import Onboarding from "./components/Onboarding.jsx";
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
      : { "--accent": "#f2f3f7", "--accent-2": "#b9bdc9", "--accent-rgb": "242,243,247", "--on-accent": "#0c0d12" };
  }
  const hex = accent.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    "--accent": accent,
    "--accent-2": accent,
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const hydrated = hydrate(JSON.parse(raw));
        setData((prev) => ({ ...prev, ...hydrated }));
      }
    } catch (e) {
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

  const persist = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Speichern fehlgeschlagen", e);
      }
    }, 250);
  }, []);

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        const next = typeof fn === "function" ? fn(prev) : fn;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const theme = data.settings?.theme || "dark";
  const mode = data.profile?.gender || "n";
  const cfg = data.settings?.themeCfg || {};

  // Browser-Chrome (PWA-Statusleiste) an Theme anpassen
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f5fa" : "#0c0d12");
  }, [theme]);

  // Theme-Studio: Akzent-Variablen + Varianten-Attribute für die ganze App
  const accentStyle = useMemo(() => accentVars(cfg.accent, theme), [cfg.accent, theme]);
  const themeAttrs = {
    "data-theme": theme,
    "data-mode": mode,
    "data-radius": cfg.radius || "round",
    "data-density": cfg.density || "cozy",
    "data-font": cfg.font || "grotesk",
    "data-gradient": cfg.gradient === false ? "off" : "on",
    "data-glow": cfg.glow === false ? "off" : "on",
    "data-glass": cfg.glass ? "on" : "off",
    "data-motion": cfg.motion || "full",
  };
  const reduced = cfg.motion === "reduced";

  // Workout-Queue: Übungen des heutigen Plans inkl. Vorgaben
  const queue = useMemo(() => {
    const plan = getTodayPlan(data);
    if (!plan) return [];
    const byId = {};
    (data.library || []).forEach((e) => {
      byId[e.id] = e;
    });
    return plan.exercises
      .map((item) => {
        const entry = byId[item.exerciseId];
        if (!entry) return null;
        return {
          name: entry.name,
          sets: item.sets || 3,
          reps: item.reps || 10,
          weight: item.weight,
          rest: item.rest ?? data.settings?.restSeconds ?? 90,
          note: item.note || "",
          entry,
        };
      })
      .filter(Boolean);
  }, [data]);

  if (!loaded) {
    return (
      <div className="ig-app" {...themeAttrs} style={accentStyle}>
        <SplashScreen />
      </div>
    );
  }

  if (!data.profile.onboarded) {
    return (
      <div className="ig-app" {...themeAttrs} style={accentStyle}>
        <Onboarding
          profile={data.profile}
          onFinish={(profilePatch) => {
            playSound("pr", data.settings?.sound !== false);
            update((prev) => {
              const today = todayISO();
              const w = Number(profilePatch.weightKg);
              const rest = (prev.profile.weightLog || []).filter(
                (e) => e.date !== today,
              );
              const weightLog =
                w > 0
                  ? [...rest, { date: today, kg: w }].sort((a, b) =>
                      a.date.localeCompare(b.date),
                    )
                  : prev.profile.weightLog || [];
              const profile = {
                ...prev.profile,
                ...profilePatch,
                weightLog,
                onboarded: true,
              };
              const generated = generatePlans(profile, prev.library || []);
              return {
                ...prev,
                profile,
                plans: generated.length ? generated : prev.plans,
                activePlanId: generated[0]?.id || prev.activePlanId,
                settings: {
                  ...prev.settings,
                  weeklyGoal: Math.min(5, profilePatch.daysPerWeek || 3),
                },
              };
            });
          }}
        />
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

  return (
    <div className="ig-app" {...themeAttrs} style={accentStyle}>
      <div className="ig-phone">
        <header className="ig-header">
          <div className="ig-brand">
            <EclipseMark size={22} title="IronLog" />
            <span>IRONLOG</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              className="ig-mute-btn"
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    theme: theme === "dark" ? "light" : "dark",
                  },
                }))
              }
              aria-label={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="ig-mute-btn"
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, sound: !prev.settings?.sound },
                }))
              }
              aria-label={soundOn ? "Sound stummschalten" : "Sound einschalten"}
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          <span className="ig-date">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
          </span>
        </header>

        <main className="ig-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
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
                    onStart={() => setWorkoutOpen(true)}
                    onCreatePlan={createPlanAndEdit}
                    onCreateSmartPlan={createSmartPlanAndGo}
                    onEditPlan={editPlan}
                  />
                )}
                {tab === "plan" && (
                  <PlansTab
                    data={data}
                    update={update}
                    autoOpenPlanId={autoEditPlanId}
                    onAutoOpenHandled={() => setAutoEditPlanId(null)}
                  />
                )}
                {tab === "progress" && <ProgressTab data={data} onStart={startWorkout} />}
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
                goTo("home");
              }}
            />
          </Suspense>
        )}

        <nav className="ig-tabbar">
          <TabBtn
            active={tab === "home"}
            onClick={() => goTo("home")}
            icon={<HomeIcon size={20} />}
            label="Home"
          />
          <TabBtn
            active={tab === "workout"}
            onClick={() => goTo("workout")}
            icon={<Dumbbell size={20} />}
            label="Training"
          />
          <TabBtn
            active={tab === "plan"}
            onClick={() => goTo("plan")}
            icon={<CalendarDays size={20} />}
            label="Plan"
          />
          <TabBtn
            active={tab === "progress"}
            onClick={() => goTo("progress")}
            icon={<TrendingUp size={20} />}
            label="Verlauf"
          />
          <TabBtn
            active={tab === "profile"}
            onClick={() => goTo("profile")}
            icon={<User size={20} />}
            label="Profil"
          />
        </nav>
      </div>
    </div>
  );
}
