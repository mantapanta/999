// Domain model for the tactics briefing coach.
//
// Geometry convention: the course canvas is drawn in a WIND-RELATIVE frame.
// The viewBox is 100 wide x 140 tall. "Up" (smaller y) is upwind / toward the
// windward mark; "down" (larger y) is downwind / toward the start. Wind always
// blows from top to bottom of the canvas. This keeps all tactical math free of
// compass trigonometry — the drawing itself encodes direction.

export type WindStrength = "light" | "medium" | "strong";
export type Trend = "building" | "steady" | "dying";
export type ShiftType = "oscillating" | "right" | "left" | "unknown";
export type Side = "left" | "right" | "unknown";

export interface Point {
  x: number;
  y: number;
}

/** A geographic position (WGS84). */
export interface GeoPoint {
  lat: number;
  lon: number;
}

/** The course marks that can be placed on a real chart. */
export type MarkKey =
  | "windward"
  | "committee"
  | "pin"
  | "leewardLeft"
  | "leewardRight";

export const MARK_KEYS: MarkKey[] = [
  "windward",
  "committee",
  "pin",
  "leewardLeft",
  "leewardRight",
];

export interface GeoState {
  /** Race-area location, used as the point for the weather/current lookup. */
  location: GeoPoint | null;
  /** Real positions of the course marks drawn on the chart. */
  marks: Partial<Record<MarkKey, GeoPoint>>;
}

export interface CourseLayout {
  /** Start line starboard end (Komiteeboot). */
  committee: Point;
  /** Start line port end (Pin / Steuerbordtonne). */
  pin: Point;
  /** Windward mark (Luvtonne). */
  windward: Point;
  /** Leeward gate, port-side mark. */
  leewardLeft: Point;
  /** Leeward gate, starboard-side mark. */
  leewardRight: Point;
  /** Current arrow tail. */
  currentFrom: Point;
  /** Current arrow head — the direction the water flows TOWARD. */
  currentTo: Point;
}

export interface Conditions {
  venue: string;
  date: string; // ISO date (yyyy-mm-dd)
  /** Target time of day for the forecast lookup (HH:MM). */
  time: string;
  raceLabel: string;
  /** Compass bearing the wind comes FROM (0–360). */
  windDirDeg: number;
  windKnMin: number;
  windKnMax: number;
  trend: Trend;
  shift: ShiftType;
  /** Current strength in knots (0 = no current). */
  currentKn: number;
  /** Compass bearing the current flows TOWARD (0–360). */
  currentDirDeg: number;
  /** Open-Meteo weather model id used for the auto wind lookup. */
  weatherModel: string;
  /** Side of the beat the sailor expects to pay (pressure / strategy call). */
  favoredSide: Side;
  /** Significant wave height in metres, if known (from the marine forecast). */
  waveM: number | null;
  /** Where the auto-loaded weather came from, e.g. "Open-Meteo" or "Windy". */
  weatherSource: string | null;
  notes: string;
}

export interface BriefingState {
  conditions: Conditions;
  course: CourseLayout;
  geo: GeoState;
}

/** Normalised result of an automatic weather/current lookup. */
export interface WeatherResult {
  windDirDeg: number;
  windKnMin: number;
  windKnMax: number;
  currentKn: number;
  currentDirDeg: number;
  waveM: number | null;
  source: string;
}

export type RuleCategory =
  | "Start"
  | "Wind"
  | "Strom"
  | "Layline"
  | "Speed"
  | "Position";

export interface Facts {
  windKnAvg: number;
  windStrength: WindStrength;
  trend: Trend;
  shift: ShiftType;
  favoredSide: Side;
  /** Which start-line end is favoured (further upwind). */
  lineBiasEnd: "committee" | "pin" | "even";
  /** Line tilt in degrees off square. */
  lineBiasDeg: number;
  currentKn: number;
  currentStrength: "none" | "weak" | "strong";
  /** "up" = sets you toward the windward mark (Strom von unten); "down" = sets you toward the start (Strom von oben). */
  currentAlong: "up" | "down" | "none";
  currentCross: "left" | "right" | "none";
}

/** Condition tags a user can attach to a custom rule. */
export type RuleTag =
  | "always"
  | "light"
  | "medium"
  | "strong"
  | "building"
  | "dying"
  | "osc"
  | "shift-right"
  | "shift-left"
  | "current-up"
  | "current-down"
  | "current-cross"
  | "fav-left"
  | "fav-right";

export interface CustomRule {
  id: string;
  title: string;
  action: string;
  weight: number;
  category: RuleCategory;
  tags: RuleTag[];
}

export interface Rule {
  id: string;
  category: RuleCategory;
  weight: number;
  custom?: boolean;
  when: (f: Facts) => boolean;
  title: (f: Facts, c: Conditions) => string;
  action: (f: Facts, c: Conditions) => string;
}
