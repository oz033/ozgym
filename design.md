# Design — OZGYM

A locked design system for this app. Every Hallmark redesign reads this file
before emitting code. Consistency across tabs > variety.

## Inferences (user said go ahead)

- **Audience** · OZ + max a few friends (private gym companion, not product marketing)
- **Use case** · One job: **start and finish today’s workout** with minimal friction
- **Tone** · utilitarian · technical calm (not playful, not manifesto)
- **Genre** · modern-minimal (instrument panel, not lifestyle brand)

## Macrostructure family

App is a **phone shell** (single viewport, bottom tabs) — not a marketing site.

| Surface | Shape | Notes |
| --- | --- | --- |
| App shell | Workbench-lite | Sticky top brand bar · content pane · bottom tab rail |
| Home | Stat-led hero + one CTA | Greeting · today plan · primary “Workout starten” · week strip |
| Workout | Full-bleed mode | Exercise focus · GIF · set controls · no chrome clutter |
| Pläne | Index + detail | Weekly days control · active plan card · list |
| Verlauf | Spec sheet denser | Charts optional · records · weight |
| Profil | Identity + utility | Glass logo · mode · body · sound · backup |

## Brand (locked — do not redesign without ask)

- **Wordmark:** OZGYM (Space Grotesk, letter-spacing ~0.14–0.18em, weight 700)
- **Mark:** Subtle gray tile · pure black brush **O** · pure black **Z** (iOS full-bleed)  
  Source: `public/logo-source-oz.png` · runtime: `public/oz-mark.png`  
  Component: `src/components/brand.jsx` · regenerate: `node scripts/gen-icons-from-source.mjs`
- **UI accent:** Mono silver/white on dark · ink on light · bg `#0c0d12` / light `#e8e8ea`
- **Credit line:** “by OZ” only where identity needs it (Profil, splash)

## Theme tokens (preserve existing, clarify names)

Dark default (paper = ink ground):

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0c0d12` | App paper |
| `--surface` | `#16181f` | Card / sheet |
| `--surface-2` | `#1e212b` | Nested control |
| `--text` | `#f2f3f7` | Ink |
| `--text-dim` | `#9aa0ad` | Secondary |
| `--border` | `rgba(255,255,255,0.08)` | Hairlines |
| `--accent` | silver / ink (mono) | Primary signal only |
| `--font-display` | Space Grotesk | Titles, brand |
| `--font-body` | Inter | UI body |
| `--font-mono` | JetBrains Mono | Stats, chips meta |
| `--radius-md` | 14px | Cards / buttons |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Motion |

### Mode accents (signal < 8% of viewport)

| Mode | `--accent` | Use |
| --- | --- | --- |
| m | silver `#e8eaed` (dark) / ink (light) | mono brand default |
| f | lighter silver | optional |
| n | steel | optional |

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
5. **Profil:** Logo + OZGYM identity · no goals / first-steps / daily targets.
6. **Training days/week:** Pläne tab only.
7. **Exercise media:** GIF in workout; no Gym-visual credit under clip.

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
