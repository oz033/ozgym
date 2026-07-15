/**
 * Stilisierte menschliche Silhouette (Flat-Design, Gymshark/Hevy-Stil) +
 * Muskelregionen für ExerciseMuscleMap. Ein Körper (Kopf, Hals, Torso mit
 * eingebauten runden Schultern, Arme mit Händen, Beine mit Füßen) wird für
 * Front- und Rückansicht wiederverwendet; nur die aufgelegten Muskelformen
 * unterscheiden sich je Ansicht.
 */

export type MuscleId =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lats"
  | "traps"
  | "back"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves";

export interface MuscleRegion {
  id: MuscleId;
  label: string;
  paths: string[];
}

export interface BodyDiagram {
  viewBox: string;
  silhouette: string;
  regions: MuscleRegion[];
}

const VIEWBOX = "0 0 200 480";

const HEAD = "M81,26 A19,21 0 1,0 119,26 A19,21 0 1,0 81,26 Z";
const NECK = "M89,40 Q89,52 91,62 L109,62 Q111,52 111,40 Q100,36 89,40 Z";
const TORSO =
  "M88,54 Q100,48 112,54 Q130,60 134,66 Q150,70 150,78 Q150,86 142,92 Q138,105 140,120 " +
  "Q136,135 128,150 Q122,165 136,180 Q140,190 130,200 L70,200 Q60,190 64,180 Q78,165 72,150 " +
  "Q64,135 60,120 Q62,105 58,92 Q50,86 50,78 Q50,70 66,66 Q70,60 88,54 Z";
const ARM_L =
  "M48,96 C38,104 32,118 32,136 C32,152 35,166 38,180 C40,188 42,196 40,204 C34,210 28,220 26,232 " +
  "C24,244 28,254 38,258 C48,262 58,258 60,246 C62,236 58,226 52,220 C56,208 58,196 56,184 " +
  "C54,168 56,152 58,136 C60,120 58,104 50,96 Z";
const ARM_R =
  "M152,96 C162,104 168,118 168,136 C168,152 165,166 162,180 C160,188 158,196 160,204 C166,210 172,220 174,232 " +
  "C176,244 172,254 162,258 C152,262 142,258 140,246 C138,236 142,226 148,220 C144,208 142,196 144,184 " +
  "C146,168 144,152 142,136 C140,120 142,104 150,96 Z";
const LEG_L =
  "M74,206 C64,216 58,232 58,252 C58,272 62,290 66,308 C68,318 66,328 62,336 C56,350 52,366 52,382 " +
  "C52,396 55,408 58,418 C50,424 42,430 40,440 C38,450 44,458 56,460 C68,462 80,458 82,448 " +
  "C84,440 78,432 70,426 C74,412 76,398 76,384 C76,368 80,352 84,336 C88,320 86,304 88,288 " +
  "C90,270 92,252 92,234 C92,222 88,212 78,206 Z";
const LEG_R =
  "M126,206 C136,216 142,232 142,252 C142,272 138,290 134,308 C132,318 134,328 138,336 C144,350 148,366 148,382 " +
  "C148,396 145,408 142,418 C150,424 158,430 160,440 C162,450 156,458 144,460 C132,462 120,458 118,448 " +
  "C116,440 122,432 130,426 C126,412 124,398 124,384 C124,368 120,352 116,336 C112,320 114,304 112,288 " +
  "C110,270 108,252 108,234 C108,222 112,212 122,206 Z";

const SILHOUETTE = [HEAD, NECK, TORSO, ARM_L, ARM_R, LEG_L, LEG_R].join(" ");

const CHEST_L = "M62,84 C58,74 66,66 78,66 C90,66 96,76 94,88 C92,100 82,106 72,102 C64,98 60,92 62,84 Z";
const CHEST_R = "M138,84 C142,74 134,66 122,66 C110,66 104,76 106,88 C108,100 118,106 128,102 C136,98 140,92 138,84 Z";
const SHOULDER_L = "M40,92 C34,86 34,76 42,70 C50,64 60,66 62,76 C64,86 58,96 48,98 C44,99 42,96 40,92 Z";
const SHOULDER_R = "M160,92 C166,86 166,76 158,70 C150,64 140,66 138,76 C136,86 142,96 152,98 C156,99 158,96 160,92 Z";
const UPPER_ARM_L = "M36,116 C33,128 34,142 38,154 C42,160 50,160 52,152 C55,140 54,126 50,114 C46,108 39,109 36,116 Z";
const UPPER_ARM_R = "M164,116 C167,128 166,142 162,154 C158,160 150,160 148,152 C145,140 146,126 150,114 C154,108 161,109 164,116 Z";
const FOREARM_L = "M32,178 C28,190 27,204 30,216 C33,224 42,224 44,214 C46,202 45,188 42,176 C39,171 34,172 32,178 Z";
const FOREARM_R = "M168,178 C172,190 173,204 170,216 C167,224 158,224 156,214 C154,202 155,188 158,176 C161,171 166,172 168,178 Z";
const ABS = "M100,112 C88,112 76,120 76,136 L76,168 C76,184 84,194 100,196 C116,194 124,184 124,168 L124,136 C124,120 112,112 100,112 Z";
const OBLIQUE_L = "M70,116 C65,130 64,144 67,156 C64,166 63,178 66,190 C70,193 75,189 74,180 C71,168 71,152 74,140 C76,128 74,120 70,116 Z";
const OBLIQUE_R = "M130,116 C135,130 136,144 133,156 C136,166 137,178 134,190 C130,193 125,189 126,180 C129,168 129,152 126,140 C124,128 126,120 130,116 Z";
const QUAD_L = "M62,214 C56,228 54,248 58,268 C62,282 76,284 80,270 C84,250 84,228 78,212 C74,206 66,207 62,214 Z";
const QUAD_R = "M138,214 C144,228 146,248 142,268 C138,282 124,284 120,270 C116,250 116,228 122,212 C126,206 134,207 138,214 Z";
const CALF_L = "M54,368 C50,382 50,398 55,410 C59,418 68,418 71,408 C74,394 73,378 68,364 C64,358 57,360 54,368 Z";
const CALF_R = "M146,368 C150,382 150,398 145,410 C141,418 132,418 129,408 C126,394 127,378 132,364 C136,358 143,360 146,368 Z";
const TRAPS = "M82,50 L118,50 C122,58 122,70 116,80 L100,88 L84,80 C78,70 78,58 82,50 Z";
const LATS_L = "M50,110 C44,128 44,150 50,168 C56,178 66,176 66,164 C64,146 62,128 60,112 C58,104 52,104 50,110 Z";
const LATS_R = "M150,110 C156,128 156,150 150,168 C144,178 134,176 134,164 C136,146 138,128 140,112 C142,104 148,104 150,110 Z";
const BACK_MID = "M100,112 C86,112 76,122 76,138 L76,172 C76,186 86,194 100,196 C114,194 124,186 124,172 L124,138 C124,122 114,112 100,112 Z";
const GLUTE_L = "M66,206 C58,212 56,224 60,236 C64,246 78,248 82,236 C86,224 82,212 74,206 C71,204 68,204 66,206 Z";
const GLUTE_R = "M134,206 C142,212 144,224 140,236 C136,246 122,248 118,236 C114,224 118,212 126,206 C129,204 132,204 134,206 Z";
const HAM_L = "M64,244 C58,258 57,276 62,292 C66,300 78,300 80,290 C84,274 82,256 76,240 C72,236 66,238 64,244 Z";
const HAM_R = "M136,244 C142,258 143,276 138,292 C134,300 122,300 120,290 C116,274 118,256 124,240 C128,236 134,238 136,244 Z";

const FRONT_REGIONS: MuscleRegion[] = [
  { id: "shoulders", label: "Schultern", paths: [SHOULDER_L, SHOULDER_R] },
  { id: "chest", label: "Brust", paths: [CHEST_L, CHEST_R] },
  { id: "biceps", label: "Bizeps", paths: [UPPER_ARM_L, UPPER_ARM_R] },
  { id: "forearms", label: "Unterarme", paths: [FOREARM_L, FOREARM_R] },
  { id: "abs", label: "Bauch", paths: [ABS] },
  { id: "obliques", label: "Schräge Bauchmuskeln", paths: [OBLIQUE_L, OBLIQUE_R] },
  { id: "quadriceps", label: "Quadrizeps", paths: [QUAD_L, QUAD_R] },
  { id: "calves", label: "Waden", paths: [CALF_L, CALF_R] },
];

const BACK_REGIONS: MuscleRegion[] = [
  { id: "traps", label: "Trapez", paths: [TRAPS] },
  { id: "shoulders", label: "Schultern", paths: [SHOULDER_L, SHOULDER_R] },
  { id: "lats", label: "Latissimus", paths: [LATS_L, LATS_R] },
  { id: "back", label: "Rücken", paths: [BACK_MID] },
  { id: "triceps", label: "Trizeps", paths: [UPPER_ARM_L, UPPER_ARM_R] },
  { id: "forearms", label: "Unterarme", paths: [FOREARM_L, FOREARM_R] },
  { id: "glutes", label: "Gesäß", paths: [GLUTE_L, GLUTE_R] },
  { id: "hamstrings", label: "Beinbeuger", paths: [HAM_L, HAM_R] },
  { id: "calves", label: "Waden", paths: [CALF_L, CALF_R] },
];

function diagram(regions: MuscleRegion[]): BodyDiagram {
  return { viewBox: VIEWBOX, silhouette: SILHOUETTE, regions };
}

// Männlich und weiblich teilen sich dieselbe Silhouette — nur die Auswahl
// der Übungs-Zonen ändert sich, nicht die Körperform.
export const BODY_DIAGRAMS: Record<"m" | "f", Record<"front" | "back", BodyDiagram>> = {
  m: { front: diagram(FRONT_REGIONS), back: diagram(BACK_REGIONS) },
  f: { front: diagram(FRONT_REGIONS), back: diagram(BACK_REGIONS) },
};

export const BACK_MUSCLES: ReadonlySet<MuscleId> = new Set(["traps", "lats", "back", "triceps", "glutes", "hamstrings"]);
