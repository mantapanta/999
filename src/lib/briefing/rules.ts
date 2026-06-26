import type {
  Conditions,
  CourseLayout,
  CustomRule,
  Facts,
  Rule,
  RuleTag,
  Side,
} from "./types";

// ---------------------------------------------------------------------------
// German labels
// ---------------------------------------------------------------------------

export const SHIFT_LABEL: Record<Conditions["shift"], string> = {
  oscillating: "Pendeldreher (oszillierend)",
  right: "Rechtsdreher (anhaltend)",
  left: "Linksdreher (anhaltend)",
  unknown: "Drehung unklar",
};

export const TREND_LABEL: Record<Conditions["trend"], string> = {
  building: "auffrischend",
  steady: "konstant",
  dying: "abnehmend",
};

export const STRENGTH_LABEL: Record<Facts["windStrength"], string> = {
  light: "Leichtwind",
  medium: "Mittelwind",
  strong: "Starkwind",
};

export const SIDE_LABEL: Record<Side, string> = {
  left: "links (Backbord-Seite)",
  right: "rechts (Steuerbord-Seite)",
  unknown: "offen",
};

function sideShort(side: Side): string {
  return side === "left" ? "links" : side === "right" ? "rechts" : "offen";
}

export function currentAlongLabel(f: Facts): string {
  if (f.currentAlong === "up") return "von unten (setzt nach Luv)";
  if (f.currentAlong === "down") return "von oben (setzt nach Lee)";
  return "kein Längsstrom";
}

export function currentCrossLabel(f: Facts): string {
  if (f.currentCross === "left") return "quer nach links";
  if (f.currentCross === "right") return "quer nach rechts";
  return "";
}

export function biasLabel(f: Facts): string {
  if (f.lineBiasEnd === "even" || f.lineBiasDeg < 4) return "ausgeglichen";
  const end = f.lineBiasEnd === "committee" ? "Komitee-Ende" : "Pin-Ende";
  return `${f.lineBiasDeg}° zum ${end}`;
}

// ---------------------------------------------------------------------------
// Geometry → Facts
// ---------------------------------------------------------------------------

export function deriveFacts(course: CourseLayout, c: Conditions): Facts {
  const windKnAvg = (c.windKnMin + c.windKnMax) / 2;
  const windStrength: Facts["windStrength"] =
    windKnAvg < 8 ? "light" : windKnAvg <= 15 ? "medium" : "strong";

  // Line bias: in the wind-up frame, the end with the smaller y is more upwind
  // and therefore favoured. Tilt = angle of the line off horizontal (square).
  const horiz = Math.abs(course.pin.x - course.committee.x) || 0.001;
  const vert = course.pin.y - course.committee.y; // >0 => committee more upwind
  const lineBiasDeg = Math.round(
    (Math.atan2(Math.abs(vert), horiz) * 180) / Math.PI,
  );
  let lineBiasEnd: Facts["lineBiasEnd"] = "even";
  if (lineBiasDeg >= 4) lineBiasEnd = vert > 0 ? "committee" : "pin";

  // Current vector in the wind-up frame. Up = -y (toward windward).
  const dx = course.currentTo.x - course.currentFrom.x;
  const dy = course.currentTo.y - course.currentFrom.y;
  const len = Math.hypot(dx, dy) || 0.001;
  const alongNorm = -dy / len; // +1 = flowing toward windward
  const crossNorm = dx / len; // +1 = flowing right

  const currentStrength: Facts["currentStrength"] =
    c.currentKn <= 0 ? "none" : c.currentKn < 0.8 ? "weak" : "strong";

  const hasCurrent = currentStrength !== "none";
  const currentAlong: Facts["currentAlong"] =
    !hasCurrent || Math.abs(alongNorm) < 0.35
      ? "none"
      : alongNorm > 0
        ? "up"
        : "down";
  const currentCross: Facts["currentCross"] =
    !hasCurrent || Math.abs(crossNorm) < 0.35
      ? "none"
      : crossNorm > 0
        ? "right"
        : "left";

  return {
    windKnAvg,
    windStrength,
    trend: c.trend,
    shift: c.shift,
    favoredSide: c.favoredSide,
    lineBiasEnd,
    lineBiasDeg,
    currentKn: c.currentKn,
    currentStrength,
    currentAlong,
    currentCross,
  };
}

// ---------------------------------------------------------------------------
// Default tactical rule library (J70 / Dragon one-design)
// ---------------------------------------------------------------------------

const s = (text: string) => () => text; // static text helper

export const DEFAULT_RULES: Rule[] = [
  // ---- Start ----
  {
    id: "start-light-ends",
    category: "Start",
    weight: 9,
    when: (f) => f.windStrength === "light",
    title: s("Leichtwind: nicht in der Feldmitte starten"),
    action: s(
      "Geh auf ein Linien-Ende mit freier Luft und Druck — in der Mitte des Pulks wirst du abgedeckt und stehst. Lieber sauber als perfekt platziert.",
    ),
  },
  {
    id: "start-bias",
    category: "Start",
    weight: 8,
    when: (f) => f.lineBiasDeg >= 6 && f.lineBiasEnd !== "even",
    title: (f) =>
      `Linie ${f.lineBiasDeg}° zum ${f.lineBiasEnd === "committee" ? "Komitee-Ende" : "Pin-Ende"} gefavt`,
    action: (f) =>
      `Plane den Start am ${f.lineBiasEnd === "committee" ? "Komitee" : "Pin"}-Ende, aber sichere dir rechtzeitig Lee-Platz und eine Lücke zum Beschleunigen.`,
  },
  {
    id: "start-current-over",
    category: "Start",
    weight: 8,
    when: (f) => f.currentAlong === "up" && f.currentStrength === "strong",
    title: s("Strom von unten = Frühstart-Gefahr"),
    action: s(
      "Der Strom drückt dich über die Linie. Konservativ anfahren, dich unter der Linie halten, lieber eine Bootslänge zurück als OCS.",
    ),
  },
  {
    id: "start-current-back",
    category: "Start",
    weight: 6,
    when: (f) => f.currentAlong === "down" && f.currentStrength === "strong",
    title: s("Strom von oben = aggressiv starten"),
    action: s(
      "Der Strom zieht dich von der Linie zurück. Du kannst dichter ranfahren — das Frühstart-Risiko ist gering, der Vorteil eines Speed-Starts groß.",
    ),
  },
  {
    id: "start-strong-speed",
    category: "Start",
    weight: 7,
    when: (f) => f.windStrength === "strong",
    title: s("Starkwind: Speed vor Position"),
    action: s(
      "Bei Starkwind zählt sauberer Speed und freie Luft mehr als der perfekte Linienplatz. Geh auf Tempo, nicht auf Risiko — ein vermurkster Start kostet weniger als ein Patzer.",
    ),
  },

  // ---- Wind / Shifts ----
  {
    id: "wind-osc",
    category: "Wind",
    weight: 9,
    when: (f) => f.shift === "oscillating",
    title: s("Pendeldreher: in Phasen segeln"),
    action: s(
      "Immer auf dem gehobenen Bug segeln, bei jeder Drehung wenden. Bleib in der Feldmitte mit kleinen Hebeln — nicht an einen Rand committen.",
    ),
  },
  {
    id: "wind-persistent-right",
    category: "Wind",
    weight: 9,
    when: (f) => f.shift === "right",
    title: s("Anhaltender Rechtsdreher: rechte Seite"),
    action: s(
      "Geh früh nach rechts und segle den langen Schlag zuerst. Nicht zu früh nach links kreuzen — der Rechtsdreher hebt die Steuerbord-Seite an.",
    ),
  },
  {
    id: "wind-persistent-left",
    category: "Wind",
    weight: 9,
    when: (f) => f.shift === "left",
    title: s("Anhaltender Linksdreher: linke Seite"),
    action: s(
      "Geh früh nach links und segle den langen Schlag zuerst. Nicht zu früh nach rechts — der Linksdreher hebt die Backbord-Seite an.",
    ),
  },
  {
    id: "wind-pressure-side",
    category: "Wind",
    weight: 7,
    when: (f) => f.favoredSide !== "unknown",
    title: (f) => `Druck-/Strategieseite: ${sideShort(f.favoredSide)}`,
    action: (f) =>
      `Mehr Druck erwartet ${sideShort(f.favoredSide)} — dorthin arbeiten. Höhe kommt aus Speed, nicht aus Klemmen; lieber schnell und in den Druck als hoch und langsam.`,
  },
  {
    id: "wind-unknown-middle",
    category: "Wind",
    weight: 6,
    when: (f) => f.shift === "unknown" && f.favoredSide === "unknown",
    title: s("Unklarer Wind: Mitte halten, abgesichert"),
    action: s(
      "Erste Kreuz konservativ: bleib in der Mitte, beidseitig abgesichert, kleine Hebel. Lass den Anfang das Bild geben, dann entscheide.",
    ),
  },
  {
    id: "wind-building",
    category: "Wind",
    weight: 5,
    when: (f) => f.trend === "building",
    title: s("Auffrischend: Neuwind & rechte Tendenz beachten"),
    action: s(
      "Mit auffrischendem Wind kommt oft mehr Druck zuerst auf einer Seite und der Wind kann rechtdrehen. Früh dran sein, Setup auf mehr Wind vorbereiten.",
    ),
  },
  {
    id: "wind-dying",
    category: "Wind",
    weight: 6,
    when: (f) => f.trend === "dying",
    title: s("Abnehmend: zum Druck, weiche Bewegungen"),
    action: s(
      "Bei abnehmdem Wind ist Druck wertvoller als Winkel. Geh zur Seite mit mehr Wind, halte das Boot in Fahrt, jede Bewegung kostet Speed.",
    ),
  },

  // ---- Strom / Layline ----
  {
    id: "current-overstand",
    category: "Layline",
    weight: 9,
    when: (f) => f.currentAlong === "down" && f.currentStrength !== "none",
    title: s("Strom von oben: Luv-Layline überstehen"),
    action: s(
      "Der Strom setzt dich nach Lee — lege die Luv-Layline nicht zu knapp an. Lieber 2–3 Bootslängen überstehen, sonst musst du am Schluss anluven und verlierst.",
    ),
  },
  {
    id: "current-understand",
    category: "Layline",
    weight: 8,
    when: (f) => f.currentAlong === "up" && f.currentStrength !== "none",
    title: s("Strom von unten: Layline kommt früher"),
    action: s(
      "Der Strom drückt dich hoch — die Layline liegt früher als gedacht. Nicht überstehen, sonst verschenkst du Höhe und fährst zu viel Strecke.",
    ),
  },
  {
    id: "current-cross",
    category: "Strom",
    weight: 7,
    when: (f) => f.currentCross !== "none" && f.currentStrength !== "none",
    title: (f) => `Querstrom nach ${f.currentCross === "left" ? "links" : "rechts"}`,
    action: (f) =>
      `Der Strom setzt nach ${f.currentCross === "left" ? "links" : "rechts"} — die luvseitige Seite zahlt sich aus. Anlieger entsprechend planen und den Lee-Bug rechtzeitig fahren.`,
  },
  {
    id: "layline-late",
    category: "Layline",
    weight: 5,
    when: () => true,
    title: s("Laylines spät anfahren"),
    action: s(
      "Generell: Laylines erst spät anlegen. Früh auf der Layline = keine Optionen mehr, Abdeckung von oben und kein Spielraum für Dreher.",
    ),
  },

  // ---- Speed / Mode (One-Design) ----
  {
    id: "speed-light-mode",
    category: "Speed",
    weight: 6,
    when: (f) => f.windStrength === "light",
    title: s("Leichtwind: krängen lassen, ruhig bleiben"),
    action: s(
      "Crew nach Lee und vorn, Boot leicht krängen für ein sauberes Profil. Ruhige, minimale Bewegungen, Segel offen und twistig — Speed vor Höhe.",
    ),
  },
  {
    id: "speed-strong-depower",
    category: "Speed",
    weight: 7,
    when: (f) => f.windStrength === "strong",
    title: s("Starkwind: früh depowern, flach segeln"),
    action: s(
      "Rechtzeitig Achterstag/Cunningham, Profil flach und Twist oben offen. Boot flach segeln statt gegen die Krängung kämpfen — in Böen abfeuern, nicht anluven.",
    ),
  },
  {
    id: "speed-onedesign",
    category: "Speed",
    weight: 4,
    when: () => true,
    title: s("One-Design: Mode an Welle & Wasser anpassen"),
    action: s(
      "Gleiche Boote — Trimm entscheidet. Bei Welle mehr Twist und Tiefe für Vortrieb, bei Flachwasser höher und flacher. Auf die Schnellen in deiner Gruppe schauen.",
    ),
  },

  // ---- Position / Risk ----
  {
    id: "pos-mark-rounding",
    category: "Position",
    weight: 5,
    when: () => true,
    title: s("Tonnenrundung: breit rein, eng raus"),
    action: s(
      "An der Luvtonne breit-eng anfahren für freie Luft danach. Am Lee-Tor das windrichtige und weniger überfüllte Tor wählen — Innenposition früh sichern.",
    ),
  },
  {
    id: "pos-cover-lead",
    category: "Position",
    weight: 4,
    when: () => true,
    title: s("In Führung: lose abdecken, nicht überdecken"),
    action: s(
      "Bleib zwischen Verfolgern und der nächsten Marke, aber decke nur lose ab. Eigenen Speed nicht für ein Duell opfern — die Flotte zieht sonst durch.",
    ),
  },
];

// ---------------------------------------------------------------------------
// Custom rules → Rule
// ---------------------------------------------------------------------------

function tagMatches(tag: RuleTag, f: Facts): boolean {
  switch (tag) {
    case "always":
      return true;
    case "light":
      return f.windStrength === "light";
    case "medium":
      return f.windStrength === "medium";
    case "strong":
      return f.windStrength === "strong";
    case "building":
      return f.trend === "building";
    case "dying":
      return f.trend === "dying";
    case "osc":
      return f.shift === "oscillating";
    case "shift-right":
      return f.shift === "right";
    case "shift-left":
      return f.shift === "left";
    case "current-up":
      return f.currentAlong === "up" && f.currentStrength !== "none";
    case "current-down":
      return f.currentAlong === "down" && f.currentStrength !== "none";
    case "current-cross":
      return f.currentCross !== "none" && f.currentStrength !== "none";
    case "fav-left":
      return f.favoredSide === "left";
    case "fav-right":
      return f.favoredSide === "right";
    default:
      return false;
  }
}

export function customToRule(cr: CustomRule): Rule {
  return {
    id: cr.id,
    category: cr.category,
    weight: cr.weight,
    custom: true,
    when: (f) =>
      cr.tags.length === 0 || cr.tags.every((t) => tagMatches(t, f)),
    title: () => cr.title,
    action: () => cr.action,
  };
}

export const TAG_LABEL: Record<RuleTag, string> = {
  always: "Immer",
  light: "Leichtwind",
  medium: "Mittelwind",
  strong: "Starkwind",
  building: "Auffrischend",
  dying: "Abnehmend",
  osc: "Pendeldreher",
  "shift-right": "Rechtsdreher",
  "shift-left": "Linksdreher",
  "current-up": "Strom von unten",
  "current-down": "Strom von oben",
  "current-cross": "Querstrom",
  "fav-left": "Seite links",
  "fav-right": "Seite rechts",
};

// ---------------------------------------------------------------------------
// Selection: max 5, with category diversity
// ---------------------------------------------------------------------------

export interface SelectedRule {
  id: string;
  category: Rule["category"];
  weight: number;
  custom?: boolean;
  title: string;
  action: string;
}

export function selectBriefing(
  course: CourseLayout,
  conditions: Conditions,
  customRules: CustomRule[],
  options?: { max?: number; categoryCap?: number },
): { facts: Facts; top: SelectedRule[]; rest: SelectedRule[] } {
  const max = options?.max ?? 5;
  const cap = options?.categoryCap ?? 2;
  const facts = deriveFacts(course, conditions);

  const all: Rule[] = [
    ...DEFAULT_RULES,
    ...customRules.map(customToRule),
  ];

  const matched = all
    .filter((r) => {
      try {
        return r.when(facts);
      } catch {
        return false;
      }
    })
    .map<SelectedRule>((r) => ({
      id: r.id,
      category: r.category,
      weight: r.weight,
      custom: r.custom,
      title: r.title(facts, conditions),
      action: r.action(facts, conditions),
    }))
    .sort((a, b) => b.weight - a.weight);

  const top: SelectedRule[] = [];
  const counts: Record<string, number> = {};
  for (const r of matched) {
    if (top.length >= max) break;
    if ((counts[r.category] ?? 0) < cap) {
      top.push(r);
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
  }
  // Relax the category cap if we couldn't fill the slots.
  if (top.length < max) {
    for (const r of matched) {
      if (top.length >= max) break;
      if (!top.includes(r)) top.push(r);
    }
  }

  const rest = matched.filter((r) => !top.includes(r));
  return { facts, top, rest };
}
