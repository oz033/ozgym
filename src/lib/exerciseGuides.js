/**
 * Detailed DE guides for catalog entries that lack EXERCISE_META
 * (dataset swaps / classics). Same shape as machine guides:
 * { setup[], move[], avoid[] } + hint + benefit.
 */

const MUSCLE_DE = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  legs: "Beine",
  glutes: "Gesäß",
  biceps: "Bizeps",
  triceps: "Trizeps",
  core: "Rumpf",
  abs: "Bauch",
};

/** Detect movement family from English dataset name */
function patternOf(name = "") {
  const n = String(name).toLowerCase();
  if (/deadlift|romanian|rdl|good morning|hip hinge/.test(n)) return "hinge";
  if (/squat|lunge|split squat|step.?up|leg press|hack squat/.test(n))
    return "squat";
  if (/calf|gastroc|soleus|donkey/.test(n)) return "calf";
  if (/adduct/.test(n)) return "adduct";
  if (/abduct|hip abduc|lateral walk/.test(n)) return "abduct";
  if (/pulldown|pull.?down|lat pull|chin.?up|pull.?up|pullup/.test(n))
    return "pulldown";
  if (/row|face pull|shrug/.test(n)) return "row";
  if (/curl|preacher|concentration/.test(n) && !/leg curl|hamstring/.test(n))
    return "curl";
  if (/leg curl|hamstring curl|lying curl|seated curl/.test(n)) return "legcurl";
  if (/extension|pushdown|kickback|skull|close.?grip.*press/.test(n) &&
    !/leg extension|back extension|hyperextension/.test(n))
    return "triceps";
  if (/leg extension|knee extension/.test(n)) return "legext";
  if (/back extension|hyperextension|lower back/.test(n)) return "backext";
  if (/fly|flye|pec deck|crossover/.test(n)) return "fly";
  if (/lateral raise|side raise|front raise|rear delt|upright row/.test(n))
    return "raise";
  if (/press|push|bench|dip|overhead|military|shoulder press|chest press/.test(n))
    return "press";
  if (/crunch|sit.?up|plank|leg raise|russian|ab wheel|mountain|burpee|twist/.test(n))
    return "core";
  if (/shrug/.test(n)) return "shrug";
  return "general";
}

function eqKey(meta) {
  if (meta?.machine) return "machine";
  const e = String(meta?.equipment || "").toLowerCase();
  if (e === "maschine") return "machine";
  if (e === "kabelzug") return "cable";
  if (e === "kurzhantel") return "db";
  if (e === "langhantel" || e === "sz-stange") return "bb";
  if (e === "körpergewicht") return "bw";
  const raw = String(meta?.equipmentRaw || "").toLowerCase();
  if (/leverage|smith|sled|hammer/.test(raw)) return "machine";
  if (/cable|rope/.test(raw)) return "cable";
  if (/dumbbell|kettlebell/.test(raw)) return "db";
  if (/barbell|ez /.test(raw)) return "bb";
  if (/body weight|band/.test(raw)) return "bw";
  return "machine";
}

function muscleLabel(meta) {
  return MUSCLE_DE[meta?.muscle] || "Zielmuskel";
}

function secondaryHint(meta) {
  const sec = meta?.secondary;
  if (Array.isArray(sec) && sec.length) {
    return sec.slice(0, 2).join(", ");
  }
  return null;
}

/**
 * Build full guide for an entry without authored EXERCISE_META.
 * @returns {{ setup: string[], move: string[], avoid: string[], hint: string, benefit: string }}
 */
export function synthesizeGuide(meta) {
  const pat = patternOf(meta?.name);
  const eq = eqKey(meta);
  const mLabel = muscleLabel(meta);
  const target = meta?.target || meta?.muscle || "target muscle";
  const sec = secondaryHint(meta);

  const setup = setupSteps(eq, pat, meta);
  const move = moveSteps(eq, pat, meta, mLabel);
  const avoid = avoidSteps(eq, pat, meta);
  const hint = hintLine(eq, pat, meta);
  const benefit = benefitLine(mLabel, target, sec);

  return { setup, move, avoid, hint, benefit };
}

function setupSteps(eq, pat, meta) {
  const steps = [];

  if (eq === "machine") {
    steps.push(
      "Sitz- und Polsterhöhe so wählen, dass die Gelenke in der Startposition bequem und stabil sind.",
    );
    steps.push(
      "Rücken / Brust am Polster fixieren, Füße fest (Boden oder Plattform), Bauch leicht anspannen.",
    );
    if (pat === "press" || pat === "fly") {
      steps.push(
        "Griffe greifen: Handgelenke gerade, Ellbogen unter den Händen bzw. leicht unter Schulterhöhe.",
      );
    } else if (pat === "row" || pat === "pulldown") {
      steps.push(
        "Griffe greifen (schulterbreit bis etwas breiter), Schultern vor dem Zug absenken — nicht hochziehen.",
      );
    } else if (pat === "squat" || pat === "legext" || pat === "legcurl" || pat === "calf") {
      steps.push(
        "Füße schulterbreit platzieren, Knie in Richtung der Zehenspitzen, Bewegungsweg prüfen (kein Anschlag mitten in der ROM).",
      );
    } else {
      steps.push(
        "Griff und Bewegungsbahn einmal ohne Last testen, dann das Arbeitsgewicht einstellen.",
      );
    }
  } else if (eq === "cable") {
    steps.push(
      "Kabelzug-Höhe und Griff so wählen, dass die Zug-/Drucklinie zum Zielmuskel passt.",
    );
    steps.push(
      "Stabiler Stand (Versatzschritt oder schulterbreit), Rumpf fest, Schultern unten.",
    );
    steps.push(
      "Gewicht so wählen, dass die letzten Wiederholungen hart, aber sauber sind.",
    );
  } else if (eq === "db") {
    steps.push(
      "Kurzhanteln greifen, Handgelenke neutral, Schultern von den Ohren weg.",
    );
    steps.push(
      "Stand schulterbreit (oder sitzend mit Rückenlehne), Bauch anspannen, Blick geradeaus.",
    );
    steps.push(
      "Gewicht so, dass 1–2 Wiederholungen in Reserve bleiben — Technik vor Last.",
    );
  } else if (eq === "bb") {
    steps.push(
      "Stange greifen (meist schulterbreit), Handgelenke gerade, Schulterblätter leicht setzen.",
    );
    steps.push(
      "Stand schulterbreit, Füße fest, Bauch und Po vor dem Start anspannen.",
    );
    steps.push(
      "Stange eng am Körper führen; bei Unsicherheit mit leichterem Gewicht starten.",
    );
  } else {
    // bodyweight
    steps.push(
      "Ausgangsposition stabil aufbauen: Hände/Füße sicher, Rumpf angespannt.",
    );
    steps.push(
      "Gelenke in einer angenehmen Linie — kein Hohlkreuz, kein eingesunkener Brustkorb.",
    );
    steps.push(
      "Tempo bewusst wählen; bei zu leichter Ausführung ROM vergrößern oder Pause verkürzen.",
    );
  }

  return steps;
}

function moveSteps(eq, pat, meta, mLabel) {
  switch (pat) {
    case "press":
      return [
        `${mLabel} anspannen und das Gewicht kontrolliert wegdrücken, bis die Arme fast gestreckt sind (Ellbogen nicht hart durchdrücken).`,
        "Oben kurz halten, Schultern bleiben unten — nicht zu den Ohren ziehen.",
        "Langsam und kontrolliert in die Startposition zurück (ca. 2 Sekunden negativ).",
      ];
    case "fly":
      return [
        "Arme mit leichter Ellbogenbeugung öffnen, Dehnung in der Brust spüren — nicht zu tief hinter die Körperlinie.",
        "Über die Brust wieder zusammenführen, am Schluss die Brust anspannen.",
        "Kontrolliertes Tempo; Schwung aus dem Rücken vermeiden.",
      ];
    case "row":
      return [
        "Ellbogen nah am Körper nach hinten ziehen, Schulterblätter zusammen und nach unten.",
        "Am Endpunkt den mittleren Rücken kurz anspannen, Brust bleibt offen.",
        "Gewicht kontrolliert vorlassen, Arme strecken ohne die Schultern nach vorne kollabieren zu lassen.",
      ];
    case "pulldown":
      return [
        "Mit den Ellbogen nach unten/hinten ziehen, Stange oder Griff Richtung obere Brust / Schlüsselbein.",
        "Am tiefsten Punkt Lat und Schulterblätter bewusst anspannen.",
        "Kontrolliert nach oben führen, bis die Arme gestreckt sind — ohne aus dem Sitz zu springen.",
      ];
    case "curl":
      return [
        "Ellenbogen fixiert an der Seite (oder am Polster), nur die Unterarme bewegen.",
        "Hanteln/Griff nach oben curl en, Bizeps oben kurz anspannen.",
        "Langsam absenken bis fast gestreckt — nicht ausschleudern.",
      ];
    case "triceps":
      return [
        "Ellenbogen eng und möglichst still, Unterarme strecken bis fast durchgedrückt.",
        "Trizeps oben bewusst anspannen, Schultern bleiben ruhig.",
        "Kontrolliert beugen, bis ca. 90° im Ellbogen — kein Schwung aus den Schultern.",
      ];
    case "raise":
      return [
        "Arme mit leichter Ellbogenbeugung heben, bis etwa Schulterhöhe (seitlich/frontal je nach Variante).",
        "Oben kurz kontrollieren, Schultern nicht hochziehen.",
        "Langsam absenken — der negative Teil zählt.",
      ];
    case "squat":
      return [
        "Hüfte nach hinten-unten, Knie folgen den Zehen, Brust bleibt aufrecht.",
        "So tief wie mobil und schmerzfrei möglich (Oberschenkel ideal parallel), Fersen am Boden.",
        "Über die ganze Fußsohle nach oben drücken, Hüfte und Knie strecken, Po oben anspannen.",
      ];
    case "hinge":
      return [
        "Hüfte nach hinten schieben, Rücken lang und neutral, Schienbeine relativ steil.",
        "Dehnung in der Beinrückseite / im Po spüren, Stange nah am Bein.",
        "Hüfte nach vorne schieben, aufrecht aufrichten, Po anspannen — nicht ins Hohlkreuz überstrecken.",
      ];
    case "legext":
      return [
        "Unterschenkel gegen den Polsterhebel strecken, bis das Knie fast gestreckt ist.",
        "Oben Quadrizeps kurz anspannen, nicht hart einrasten.",
        "Kontrolliert beugen, bis ca. 90° — Gewicht nicht baumeln lassen.",
      ];
    case "legcurl":
      return [
        "Fersen gegen den Polsterhebel ziehen, Beinbeuger anspannen.",
        "Oben kurz halten, Hüfte bleibt am Polster (nicht abheben).",
        "Langsam strecken bis fast gestreckt, ohne das Gewicht abzuwerfen.",
      ];
    case "calf":
      return [
        "Über den Vorfuß nach oben drücken, Waden maximal anspannen.",
        "Oben 1 Sekunde halten.",
        "Fersen langsam unter die neutrale Linie absenken für volle Dehnung.",
      ];
    case "adduct":
      return [
        "Beine kontrolliert gegen den Widerstand schließen.",
        "Innen-Oberschenkel anspannen, Becken stabil halten.",
        "Langsam wieder öffnen — nicht federn.",
      ];
    case "abduct":
      return [
        "Beine gegen den Widerstand nach außen drücken.",
        "Po / äußere Hüfte anspannen, Oberkörper ruhig.",
        "Kontrolliert zurückführen.",
      ];
    case "backext":
      return [
        "Oberkörper über die Hüfte strecken, Rücken lang — nicht überstrecken.",
        "Oben Gesäß und untere Rückenmuskulatur anspannen.",
        "Kontrolliert absenken, bis eine leichte Dehnung spürbar ist.",
      ];
    case "core":
      return [
        "Rumpf fest, Bewegung aus der Körpermitte — nicht aus dem Schwung der Beine/Arme.",
        "Am engsten Punkt Bauch anspannen, ausatmen.",
        "Kontrolliert in die Startposition zurück, Lendenwirbelsäule stabil halten.",
      ];
    case "shrug":
      return [
        "Schultern gerade nach oben Richtung Ohren ziehen.",
        "Oben kurz halten, ohne den Kopf vorzuschieben.",
        "Langsam absenken, Trapez bewusst nachgeben lassen.",
      ];
    default:
      return [
        `${mLabel} bewusst ansteuern und die Last kontrolliert durch die volle, schmerzfreie ROM bewegen.`,
        "Am stärksten Punkt kurz anspannen (1 Sekunde).",
        "Negativphase langsam (ca. 2 Sekunden) — Technik vor Gewicht.",
      ];
  }
}

function avoidSteps(eq, pat, meta) {
  const common = [
    "Kein Schwung, kein Abfälschen — lieber Gewicht reduzieren.",
    "Bei stechendem Gelenkschmerz abbrechen und Einstellung/Technik prüfen.",
  ];
  const specific = {
    press: [
      "Schultern nicht nach vorne rollen oder hochziehen.",
      "Nicht ins Hohlkreuz ausweichen, um mehr Gewicht zu bewegen.",
    ],
    fly: [
      "Ellbogen nicht komplett durchstrecken (Gelenkschutz).",
      "Nicht zu tief absenken, wenn die Schulter zieht.",
    ],
    row: [
      "Nicht mit dem ganzen Oberkörper reißen.",
      "Schultern nicht zu den Ohren ziehen.",
    ],
    pulldown: [
      "Stange nicht hinter den Nacken ziehen.",
      "Nicht aus dem Sitz springen oder mit dem Körper schwingen.",
    ],
    curl: [
      "Ellenbogen nicht nach vorne wandern lassen.",
      "Oberkörper nicht nach hinten legen für Schwung.",
    ],
    triceps: [
      "Ellenbogen nicht nach außen abspreizen.",
      "Schultern nicht mitbewegen.",
    ],
    raise: [
      "Nicht über Schulterhöhe mit zu viel Gewicht schwingen.",
      "Nacken entspannt lassen.",
    ],
    squat: [
      "Knie nicht nach innen knicken.",
      "Fersen nicht abheben, Rücken nicht stark runden.",
    ],
    hinge: [
      "Rücken nicht runden — lieber weniger ROM.",
      "Stange nicht weit vom Körper wegführen.",
    ],
    legext: ["Gewicht nicht in die Kniekehle knallen lassen."],
    legcurl: ["Hüfte nicht vom Polster abheben."],
    calf: ["Nicht nur wippen — volle Dehnung und Anspannung."],
    core: [
      "Nicht am Nacken ziehen.",
      "Lendenwirbelsäule nicht überstrecken.",
    ],
  };
  return [...(specific[pat] || []), ...common].slice(0, 4);
}

function hintLine(eq, pat, meta) {
  const map = {
    press: "Volle ROM, Schultern unten, kontrolliert drücken",
    fly: "Leichte Ellbogenbeugung, Brust dehnen und anspannen",
    row: "Ellbogen nach hinten, Schulterblätter zusammen",
    pulldown: "Brust raus, Ellbogen zur Körpermitte ziehen",
    curl: "Ellenbogen fix, nur Unterarme",
    triceps: "Ellenbogen eng, nur strecken",
    raise: "Bis Schulterhöhe, kein Schwung",
    squat: "Knie den Zehen folgen, Ferse am Boden",
    hinge: "Hüfte zurück, Rücken lang",
    legext: "Oben anspannen, langsam beugen",
    legcurl: "Hüfte fix, Beinbeuger isolieren",
    calf: "Oben halten, unten voll dehnen",
    adduct: "Innen-OS anspannen, Becken still",
    abduct: "Po/äußere Hüfte, Oberkörper ruhig",
    core: "Aus der Mitte, kein Schwung",
    backext: "Lang strecken, nicht überstrecken",
    shrug: "Schultern hoch, Nacken lang",
    general: "Kontrolliert, volle ROM, Zielmuskel spüren",
  };
  return map[pat] || map.general;
}

function benefitLine(mLabel, target, sec) {
  let s = `Trainiert vor allem ${mLabel}`;
  if (target && String(target) !== metaMuscleEn(mLabel)) {
    s += ` (${String(target).replace(/_/g, " ")})`;
  }
  if (sec) s += ` · mit ${sec}`;
  return s + ".";
}

function metaMuscleEn(de) {
  // rough — only for avoiding duplicate in benefit string
  return "";
}

/**
 * Ensure entry has guide/hint/benefit (mutates shallow copy).
 * Authored machine guides are kept as-is.
 */
export function withGuide(entry) {
  if (!entry) return entry;
  if (entry.guide?.setup?.length && entry.guide?.move?.length) {
    return entry;
  }
  const g = synthesizeGuide(entry);
  return {
    ...entry,
    guide: {
      setup: g.setup,
      move: g.move,
      avoid: g.avoid,
    },
    hint: entry.hint || g.hint,
    benefit: entry.benefit || g.benefit,
  };
}
