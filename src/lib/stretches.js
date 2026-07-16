/* Warm-up- & Cool-down-Bibliothek.
   mediaName = Name im Übungs-Dataset (englisch) für GIF-Lookup via
   findExerciseMedia; name = deutsche Anzeige. Alle mediaNames sind gegen
   exercisesIndex.json verifiziert — fehlt ein Clip trotzdem, zeigt
   ExerciseDemo den Text-Fallback. */

/** Dynamisches Aufwärmen je Zone (reps ODER seconds pro Übung) */
const WARMUP_POOL = {
  generic: [
    {
      name: "Squat to Overhead Reach",
      mediaName: "squat to overhead reach",
      reps: 10,
      note: "Ganzer Körper wach: tief in die Hocke, Arme gestreckt nach oben.",
    },
    {
      name: "High Knees an der Wand",
      mediaName: "high knee against wall",
      seconds: 30,
      note: "Puls hoch: Knie zügig abwechselnd Richtung Brust.",
    },
  ],
  chest: [
    {
      name: "Dynamischer Brust-Stretch",
      mediaName: "dynamic chest stretch (male)",
      seconds: 30,
      note: "Arme schwungvoll öffnen und schließen — Brust öffnet sich.",
    },
  ],
  shoulders: [
    {
      name: "Schulter-Öffner",
      mediaName: "dynamic chest stretch (male)",
      seconds: 30,
      note: "Arme auf Schulterhöhe schwingen, Schulterblätter aktiv.",
    },
  ],
  back: [
    {
      name: "Bodyweight Squat Row",
      mediaName: "bodyweight squatting row",
      reps: 10,
      note: "Rücken-Aktivierung: aus der Hocke ziehen, Schulterblätter zusammen.",
    },
    {
      name: "Seitneigung im Stand",
      mediaName: "standing lateral stretch",
      seconds: 30,
      note: "Langsam zur Seite neigen, Lat länger werden lassen.",
    },
  ],
  arms: [
    {
      name: "Handgelenk-Kreisen",
      mediaName: "wrist circles",
      seconds: 25,
      note: "Handgelenke mobilisieren — wichtig vor Druck- und Curl-Übungen.",
    },
  ],
  legs: [
    {
      name: "Glute Bridge March",
      mediaName: "glute bridge march",
      reps: 10,
      note: "Po anspannen, Becken oben halten, Knie abwechselnd heben.",
    },
    {
      name: "Knie zur Brust",
      mediaName: "hug keens to chest",
      reps: 8,
      note: "Im Wechsel ein Knie zur Brust ziehen, kurz halten.",
    },
    {
      name: "Fußgelenk-Kreisen",
      mediaName: "ankle circles",
      seconds: 25,
      note: "Sprunggelenke lockern — stabiler Stand bei Beinübungen.",
    },
  ],
  abs: [
    {
      name: "Crab Twist Toe Touch",
      mediaName: "crab twist toe touch",
      reps: 8,
      note: "Rotation aus der Körpermitte, Gegenhand zum Fuß.",
    },
  ],
};

/** Statische Dehnungen je Zone (Haltezeit in Sekunden) */
const COOLDOWN_POOL = {
  chest: [
    {
      name: "Brust-Stretch hinter dem Kopf",
      mediaName: "behind head chest stretch",
      seconds: 35,
      note: "Hände hinterm Kopf, Ellenbogen sanft nach hinten öffnen.",
    },
    {
      name: "Brust & vordere Schulter",
      mediaName: "chest and front of shoulder stretch",
      seconds: 35,
      note: "Arm strecken, Brust wegdrehen — Zug über die ganze Vorderseite.",
    },
  ],
  shoulders: [
    {
      name: "Hintere Schulter dehnen",
      mediaName: "rear deltoid stretch",
      seconds: 30,
      note: "Arm quer vor die Brust ziehen, Schulter unten lassen.",
    },
  ],
  back: [
    {
      name: "Kniender Lat-Stretch",
      mediaName: "kneeling lat stretch",
      seconds: 35,
      note: "Arme weit nach vorn, Brust Richtung Boden sinken lassen.",
    },
    {
      name: "Unterer Rücken im Sitzen",
      mediaName: "seated lower back stretch",
      seconds: 35,
      note: "Rund werden, Bauch Richtung Oberschenkel sinken lassen.",
    },
  ],
  arms: [
    {
      name: "Trizeps über Kopf",
      mediaName: "overhead triceps stretch",
      seconds: 30,
      note: "Ellenbogen hinter den Kopf, mit der Gegenhand sanft nachdrücken.",
    },
  ],
  legs: [
    {
      name: "Beinrückseite dehnen",
      mediaName: "hamstring stretch",
      seconds: 35,
      note: "Bein gestreckt, Oberkörper lang nach vorn — kein runder Rücken.",
    },
    {
      name: "Quadrizeps im Vierfüßler",
      mediaName: "all fours squad stretch",
      seconds: 35,
      note: "Fuß zum Po ziehen, Hüfte bleibt gestreckt.",
    },
    {
      name: "Waden an der Wand",
      mediaName: "calf stretch with hands against wall",
      seconds: 30,
      note: "Hinteres Bein gestreckt, Ferse bleibt am Boden.",
    },
    {
      name: "Schmetterling",
      mediaName: "butterfly yoga pose",
      seconds: 40,
      note: "Fußsohlen zusammen, Knie sanft Richtung Boden sinken lassen.",
    },
  ],
  abs: [
    {
      name: "Sphinx",
      mediaName: "sphinx",
      seconds: 35,
      note: "Auf die Unterarme stützen, Bauch lang machen, ruhig atmen.",
    },
  ],
};

/** Zonen aus der heutigen Queue ableiten (zone + zone2 der Übungen) */
export function zonesFromQueue(queue) {
  const zones = new Set();
  (queue || []).forEach((it) => {
    if (it?.entry?.zone) zones.add(it.entry.zone);
    if (it?.entry?.zone2) zones.add(it.entry.zone2);
  });
  return zones;
}

function pickForZones(pool, zones, perZone, cap) {
  const out = [];
  const seen = new Set();
  for (const z of zones) {
    for (const item of (pool[z] || []).slice(0, perZone)) {
      if (seen.has(item.mediaName)) continue;
      seen.add(item.mediaName);
      out.push({ ...item, zone: z });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Warm-up-Plan: 1–2 generische Aktivierungen + zonenspezifische Mobilisation */
export function buildWarmup(queue, cap = 5) {
  const zones = zonesFromQueue(queue);
  if (!zones.size) return [];
  const generic = WARMUP_POOL.generic.map((g) => ({ ...g, zone: null }));
  const specific = pickForZones(WARMUP_POOL, zones, 2, cap - generic.length);
  return [...generic, ...specific].slice(0, cap);
}

/** Cool-down-Plan: statische Dehnungen für die tatsächlich trainierten Zonen */
export function buildCooldown(zones, cap = 5) {
  const zoneSet = zones instanceof Set ? zones : new Set(zones || []);
  if (!zoneSet.size) return [];
  return pickForZones(COOLDOWN_POOL, zoneSet, 2, cap);
}
