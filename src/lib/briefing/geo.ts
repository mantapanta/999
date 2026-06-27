import type {
  CourseLayout,
  GeoPoint,
  GeoState,
  MarkKey,
  Point,
} from "./types";
import { MARK_KEYS } from "./types";

const VB_W = 100;
const VB_H = 140;
const DEG = Math.PI / 180;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Build the current arrow (in the wind-up viewBox frame) from the wind and
 * current bearings. Wind blows from `windDirDeg`; "up" in the frame points
 * toward the wind source. The current flows TOWARD `currentDirDeg`.
 */
export function currentArrow(
  windDirDeg: number,
  currentDirDeg: number,
  anchor: Point = { x: 18, y: 62 },
  length = 30,
): { from: Point; to: Point } {
  // Angle of the current relative to "up" (toward wind source).
  const rel = (currentDirDeg - windDirDeg) * DEG;
  const acrossRight = Math.sin(rel);
  const alongUp = Math.cos(rel);
  // Screen: up = -y, right = +x.
  const dx = acrossRight;
  const dy = -alongUp;
  const half = length / 2;
  return {
    from: {
      x: clamp(anchor.x - dx * half, 4, 96),
      y: clamp(anchor.y - dy * half, 6, 134),
    },
    to: {
      x: clamp(anchor.x + dx * half, 4, 96),
      y: clamp(anchor.y + dy * half, 6, 134),
    },
  };
}

export function hasAllMarks(geo: GeoState): boolean {
  return MARK_KEYS.every((k) => !!geo.marks[k]);
}

/**
 * Project real (lat/lon) course marks into the wind-up viewBox frame so the
 * briefing diagram shows the actual course geometry, rotated so the wind blows
 * straight down the page. Falls back to the existing layout for missing marks.
 */
export function projectGeoToCourse(
  geo: GeoState,
  windDirDeg: number,
  currentDirDeg: number,
  existing: CourseLayout,
): CourseLayout {
  if (!hasAllMarks(geo)) return existing;

  const marks = geo.marks as Record<MarkKey, GeoPoint>;
  const lat0 =
    MARK_KEYS.reduce((sum, k) => sum + marks[k].lat, 0) / MARK_KEYS.length;
  const lon0 =
    MARK_KEYS.reduce((sum, k) => sum + marks[k].lon, 0) / MARK_KEYS.length;
  const cosLat = Math.cos(lat0 * DEG);

  // Local east/north metres relative to the centroid.
  const enu = (p: GeoPoint) => ({
    e: (p.lon - lon0) * cosLat * 111_320,
    n: (p.lat - lat0) * 110_540,
  });

  // Wind-up basis: up = toward wind source; right = up rotated clockwise.
  const w = windDirDeg * DEG;
  const upE = Math.sin(w);
  const upN = Math.cos(w);
  const rightE = Math.cos(w);
  const rightN = -Math.sin(w);

  const projected = MARK_KEYS.map((k) => {
    const { e, n } = enu(marks[k]);
    return {
      key: k,
      along: e * upE + n * upN, // metres toward windward
      across: e * rightE + n * rightN, // metres to the right
    };
  });

  const alongs = projected.map((p) => p.along);
  const acrosses = projected.map((p) => p.across);
  const minA = Math.min(...alongs);
  const maxA = Math.max(...alongs);
  const minX = Math.min(...acrosses);
  const maxX = Math.max(...acrosses);
  const spanA = Math.max(maxA - minA, 1);
  const spanX = Math.max(maxX - minX, 1);

  // Fit into a padded box, preserving aspect ratio.
  const boxW = 78;
  const boxH = 112;
  const scale = Math.min(boxW / spanX, boxH / spanA);
  const midA = (minA + maxA) / 2;
  const midX = (minX + maxX) / 2;

  const place = (along: number, across: number): Point => ({
    x: clamp(VB_W / 2 + (across - midX) * scale, 4, 96),
    y: clamp(VB_H / 2 - (along - midA) * scale, 6, 134),
  });

  const out: Partial<CourseLayout> = {};
  for (const p of projected) {
    out[p.key] = place(p.along, p.across);
  }

  const arrow = currentArrow(windDirDeg, currentDirDeg);
  return {
    windward: out.windward!,
    committee: out.committee!,
    pin: out.pin!,
    leewardLeft: out.leewardLeft!,
    leewardRight: out.leewardRight!,
    currentFrom: arrow.from,
    currentTo: arrow.to,
  };
}
