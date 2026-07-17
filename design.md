# Design — OZGYM

A locked design system for this app. Every Hallmark redesign reads this file
before emitting code. Consistency across tabs > variety.

## Inferences (user said go ahead)

- **Audience** · OZ + max a few friends (private gym companion, not product marketing)
- **Use case** · One job: **start and finish today’s workout** with minimal friction
- **Tone** · utilitarian · technical calm (not playful, not manifesto)
- **Genre** · modern-minimal (instrument panel, not lifestyle brand)

## Reference DNA (v2.3)

**Studied (structure only, not pixel-clone):** FitPal — Fitness Health Tracker Mobile App UI Kits
(Envato / slabdsgn). Extracted DNA applied to gym-log surfaces:

| FitPal pattern | OZGYM mapping |
| --- | --- |
| Dark OLED + lime accent | `--bg #0a0c0b` · `--accent #b8f24a` |
| Welcome row (avatar + Hi) | Home `.ig-home-welcome` + glass mark |
| Pill chip rail | `.ig-home-chips` → Heute / Plan / Verlauf / Serie |
| Summary Activity 2×2 cards | `.ig-home-summary-grid` mini cards |
| Overall Status line chart | `.ig-home-status` + SVG area chart (week kg) |
| Lime pill primary CTA | `.ig-btn-primary` `border-radius: 999px` |
| Bottom nav filled active | `.ig-tab-pill` solid accent |

OZGYM domain stays gym (sets / plans / streak), not running GPS/HR. Theme Studio can still override accent to mono.

## Macrostructure family

App is a **phone shell** (single viewport, bottom tabs) — not a marketing site.

| Surface | Shape | Notes |
| --- | --- | --- |
| App shell | Workbench-lite | Sticky top brand bar · content pane · floating pill dock |
| Home | FitPal welcome + summary + status | Avatar greeting · chips · CTA · 2×2 stats · week chart · plan list |
| Workout | Full-bleed mode | Exercise focus · GIF · set controls · no chrome clutter |
| Pläne | Index + detail | Weekly days control · active plan card · list |
| Verlauf | Spec sheet denser | Mini DNA cards · freq bars · muscle · weight |
| Profil | Identity + utility | Glass logo · mode · body · sound · backup |

## Brand (locked — do not redesign without ask)

- **Wordmark:** OZGYM (Space Grotesk, letter-spacing ~0.14–0.18em, weight 700)
- **Mark:** Frosted glass tile · larger black brush **O**+**Z** (~90% fill, iOS full-bleed)  
  Source: `public/logo-source-oz.png` · runtime: `public/oz-mark.png`  
  Component: `src/components/brand.jsx` · regenerate: `node scripts/gen-icons-from-source.mjs`  
  Glass: soft cool gradient + specular highlight in icon pipeline; in-app CSS glass rim
- **UI accent (default):** Lime fitness `#b8f24a` on dark OLED · Theme Studio may set mono or custom
- **Credit line:** “by OZ” only where identity needs it (Profil, splash)

## Theme tokens (v2.3 FitPal dark)

Dark default (paper = ink ground):

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0a0c0b` | App paper (OLED) |
| `--surface` | `#121512` | Card / sheet |
| `--surface-2` | `#1a1f1b` | Nested control |
| `--text` | `#f0f4ec` | Ink |
| `--text-dim` | `#8a9485` | Secondary |
| `--border` | `rgba(255,255,255,0.07)` | Hairlines |
| `--accent` | `#b8f24a` | Primary signal (lime) |
| `--accent-2` | `#7bc41f` | Accent companion |
| `--on-accent` | `#0a1006` | Text on lime |
| `--font-display` | Space Grotesk | Titles, brand |
| `--font-body` | Inter | UI body |
| `--font-mono` | JetBrains Mono | Stats, chips meta |
| `--radius-md` | 18px | Cards |
| `--radius-pill` | 999px | CTAs, chips |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Motion |

### Mode accents (signal < 8% of viewport)

| Mode | `--accent` | Use |
| --- | --- | --- |
| default | lime `#b8f24a` | FitPal DNA default |
| mono (Theme Studio) | silver / ink | brand override |
| custom hex | user | Theme Studio |

**Discipline:** One solid accent CTA per screen. No gradient text. No aurora blobs on content. Glass only on the **logo mark** (brand signature), not every card.

## Typography scale (app)

| Role | Size | Weight | Face |
| --- | --- | --- | --- |
| Screen title | 28–32px | 700 | display |
| Section label | 11px · uppercase · 0.06em | 600 | mono or body |
| Body | 14–15px | 400–500 | body |
| Stat number | 22–28px · tabular | 700 | mono |
| Tab label | 10–11px | 600 | body |

No italic headers. Emphasis via weight or accent underline.

## Layout rules

1. **Phone max-width 430px**, centered on desktop.
2. **One primary CTA** per view (Home start, Workout complete set).
3. **Cards are hairline surfaces**, not floating marketing tiles — reduce stacked “generic card soup.”
4. **Home hierarchy (3 seconds):** What today? → Start → How’s the week?
5. **Home chrome:** No global app bar on Home (`data-home-chrome="immersive"`) — welcome row owns identity.
6. **Brand locked:** App title always **OZGYM**; header icon always **OzGymMark** (no custom app name / no header GIF).
7. **Profil:** displayName · body · mode · Theme Studio (colors only) · backup.
8. **Training days/week:** Pläne tab only.
9. **Exercise media:** GIF in workout; no Gym-visual credit under clip.
10. **First-run Onboarding** (`profile.onboarded === false`): Name · gender · height/weight. Existing installs skip via hydrate.

## Identity fields

| Field | Path | Notes |
| --- | --- | --- |
| Display name | `profile.displayName` | Home “Hi, …” |
| Gender | `profile.gender` `m`/`f` | Mode accents + plan goals |
| Height / weight / age | `profile.*` | BMI, kcal estimate |
| App title / mark | fixed | Always OZGYM + glass O+Z mark |

## Motion

- framer-motion allowed but **sparse**: tab fade, workout phase, confetti only on finish.
- Prefer `transform` + `opacity`, `--ease-out`, respect `prefers-reduced-motion`.
- Buttons: 1px press, no bounce.

## Interaction layer (v2.1 — locked 2026-07-16)

Lives at the end of `src/index.css` ("Interaction Consistency Layer"). Rules:

- **Every pressable element** gets `:active` feedback: `scale(0.97)` standard,
  `scale(0.9)` icon-only, compositor-only (`transform`), `--dur-fast` (120ms).
- **Focus ring everywhere:** `.ig-app :focus-visible` = 2px accent outline,
  offset 2px, never animated (transition-property lists exclude `outline`).
  Text inputs keep their border+glow focus style; checkboxes/radios keep the ring.
- **Global haptics:** one `pointerdown` listener in `gym-app.jsx` buzzes 10ms on
  any button tap (respects `settings.haptics`). Local, stronger patterns
  (workout events) fire on click and override the tap pattern. New components
  never need their own tap-buzz.
- **Touch targets:** `.ig-icon-btn` = 44pt (`--touch`); `.sm`/`.ghost` variants
  are deliberate exceptions for inline contexts.
- Timing tokens: `--dur-fast: 120ms`, `--dur-med: 200ms` — new transitions use
  these, not ad-hoc values.

## System-Overlays (v2.2 — 2026-07-16)

- **Toast** (`showToast`, z 120) — Fehler/Hinweise in-app; `window.alert` ist verboten.
- **Confirm-Sheet** (`showConfirm`, z 130, Promise<boolean>) — ersetzt `window.confirm`;
  destruktive Aktionen: roter Bestätigen-Button (`.ig-btn-danger`).
- z-Ordnung: Dock 40 · Sheet 70/80 · Workout 100 · Toast 120 · Confirm 130.
- **Sessions-Datenmodell:** `data.sessions[] = { date, seconds, sets, volume, prs }`,
  geschrieben beim Workout-Abschluss. Dashboard zeigt daraus Dauer + ≈kcal
  (MET 5,0 × kg × h — nur mit echtem Körpergewicht, sonst keine Zahl).
- **PWA:** Service Worker aktiv (registerType "prompt" — Update-Toast „Neu
  laden", nie Auto-Reload mitten im Workout), Übungs-GIFs CacheFirst (offline
  im Gym). Manifest-Shortcuts: Workout/Pläne/Verlauf via
  `?quick=start|plan|progress`.

## Gesten & Kontextaktionen (v2.3 — 2026-07-16)

- **SwipeRow** (`ui.jsx`) — Zeile nach links = roter Löschen-Reveal (84px,
  framer-motion drag="x"). Nur Abkürzung: sichtbare Buttons bleiben immer als
  Fallback. Eingesetzt: Plan-Liste + Übungszeilen im Editor.
- **ActionSheet** (`showActionSheet`, Promise<id|null>) — Quick-Menü, gleiche
  Optik wie Confirm-Sheet. Long-Press (500 ms, 12px-Toleranz) auf Plan-Karte:
  Aktivieren · Bearbeiten · Duplizieren · Löschen.
- **Toast-Actions** — `showToast(msg, type, { sticky, actionLabel, onAction })`;
  Typ `info` (blaue Border). Nutzer: Update-Toast, Backup-Erinnerung.
- **Backup-Erinnerung:** ab 10 Logs, >30 Tage ohne Backup, Nag max. alle
  14 Tage (`settings.lastBackup` / `settings.lastBackupNag`).
- **Verlauf → Editor:** Übungs-Statistik-Karten sind Buttons (Chevron rechts),
  öffnen den Plan im Editor.
- **Trainingszeit-Karte** im Verlauf: Min diese Woche · Ø Min/Einheit ·
  Std gesamt (aus `data.sessions`).

## Trainings-Flow (v2.4 — 2026-07-16)

- **Warm-up** (`StretchFlow`, `lib/stretches.js`): vor frischem Workout,
  zonenbasiert aus der Queue (max. 5), Reps- oder Timer-Übungen, alles
  überspringbar. Toggle `settings.warmup`. Kein Warm-up beim Fortsetzen.
- **Cool-down**: nach dem letzten Satz automatisch, statische Dehnungen für
  die TATSÄCHLICH trainierten Zonen (`sessionRef.zones`), Haltezeit-Countdown.
  Toggle `settings.cooldown`. Summary zeigt Dehnungs-Badge.
- **Übung ersetzen** (`ReplacePanel` im Workout, z 110): gleiche Muskelgruppe,
  Equipment-Chips (Maschine/Kurzhantel/Langhantel/Kabelzug/Körpergewicht),
  gleiches Equipment sortiert zuerst, GIF-Thumb + Hinweis je Zeile. Tausch =
  `exerciseId`-Swap im heutigen Plan — Sätze/Wdh./Pause/Notiz bleiben,
  geloggte Sätze bleiben unterm alten Namen, smartSuggest belegt Gewicht vor.
  2 Taps, Workout läuft weiter.
- Stretch-Übungen: deutsche Namen + verifizierte Dataset-mediaNames
  (GIF-Fallback via ExerciseDemo). Kein Schwierigkeitsgrad — Datenfeld
  existiert nicht, nichts erfinden.

## Copy voice

- German, short, second person optional.
- Utilitarian: “Workout starten”, “Satz abschließen”, not “Crush your goals!”
- No invented metrics or fake social proof.

## Anti-patterns (for this app)

- Onboarding wizard / Erste Schritte checklist
- Trainingsziel / Tagesziele / Wochenziel in Profil
- Purple aurora gradients behind every card
- Equal 3-icon feature grids
- Icon-in-colored-square soup
- Celebratory toasts for routine actions
- Changing the OZGYM monogram without explicit ask

## Implementation boundaries

**In scope (when approved):**
- `src/index.css` token cleanup + density
- `src/tabs/DashboardTab.jsx` home hierarchy polish
- `src/tabs/PlansTab.jsx` weekly days presentation
- `src/tabs/ProfileTab.jsx` identity already logo-led — polish only
- `src/components/ui.jsx` button/chip states if needed

**Out of scope unless asked:**
- New routes / rewrite of electron/native
- Deleting exercise dataset or Clever Fit plans
- Replacing logo path / brand mark
- Theme Studio removal

## Hallmark stamp

```
/* Hallmark · project: OZGYM · genre: modern-minimal · tone: utilitarian
 * macrostructure family: workbench-lite (app shell)
 * brand: black O+Z on gray · accent: mono
 * audience: private (OZ + few friends) · use: start workout
 */
```
