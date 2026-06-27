import type { BriefingState, CustomRule } from "./types";

const STATE_KEY = "briefing-coach:state:v1";
const RULES_KEY = "briefing-coach:custom-rules:v1";

export function defaultState(): BriefingState {
  return {
    conditions: {
      venue: "",
      date: new Date().toISOString().slice(0, 10),
      time: "11:00",
      raceLabel: "Morgen-Briefing",
      windDirDeg: 270,
      windKnMin: 8,
      windKnMax: 12,
      trend: "steady",
      shift: "oscillating",
      currentKn: 0,
      currentDirDeg: 180,
      weatherModel: "best_match",
      favoredSide: "unknown",
      waveM: null,
      weatherSource: null,
      notes: "",
    },
    geo: {
      location: null,
      marks: {},
    },
    // Wind-up frame: viewBox 100 x 140, top = upwind.
    course: {
      windward: { x: 50, y: 18 },
      committee: { x: 66, y: 116 },
      pin: { x: 34, y: 116 },
      leewardLeft: { x: 42, y: 104 },
      leewardRight: { x: 58, y: 104 },
      currentFrom: { x: 16, y: 40 },
      currentTo: { x: 16, y: 78 },
    },
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadState(): BriefingState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BriefingState>;
    const base = defaultState();
    return {
      conditions: { ...base.conditions, ...parsed.conditions },
      course: { ...base.course, ...parsed.course },
      geo: {
        location: parsed.geo?.location ?? base.geo.location,
        marks: { ...base.geo.marks, ...parsed.geo?.marks },
      },
    };
  } catch {
    return null;
  }
}

export function saveState(state: BriefingState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function loadCustomRules(): CustomRule[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomRule[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomRules(rules: CustomRule[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
