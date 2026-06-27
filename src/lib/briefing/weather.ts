import type { GeoPoint, WeatherResult } from "./types";

const KMH_TO_KN = 1 / 1.852;

/** Selectable Open-Meteo forecast models. */
export const WEATHER_MODELS: { id: string; label: string; note?: string }[] = [
  { id: "best_match", label: "Auto (beste Quelle)" },
  {
    id: "meteofrance_arome_france_hd",
    label: "AROME HD · 1,5 km",
    note: "Météo-France, nur Frankreich & angrenzende Küsten",
  },
  {
    id: "meteofrance_arome_france",
    label: "AROME · 2,5 km",
    note: "Météo-France",
  },
  { id: "icon_d2", label: "ICON-D2 · 2 km", note: "DWD, Mitteleuropa" },
  { id: "icon_eu", label: "ICON-EU · 7 km", note: "DWD, Europa" },
  { id: "ecmwf_ifs025", label: "ECMWF IFS · 9 km", note: "global" },
  { id: "gfs_seamless", label: "GFS", note: "NOAA, global" },
];

export function modelLabel(id: string): string {
  return WEATHER_MODELS.find((m) => m.id === id)?.label ?? id;
}

interface OpenMeteoHourly {
  time?: string[];
  [key: string]: unknown;
}

/** Pick the array index whose timestamp best matches the target hour. */
function indexForHour(times: string[] | undefined, target: string): number {
  if (!times || times.length === 0) return -1;
  const exact = times.findIndex((t) => t.startsWith(target));
  if (exact >= 0) return exact;
  // Fallback: nearest by absolute time difference.
  const targetMs = Date.parse(target);
  if (Number.isNaN(targetMs)) return 0;
  let best = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(Date.parse(t) - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

function num(arr: unknown, i: number): number | null {
  if (!Array.isArray(arr)) return null;
  const v = arr[i];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/**
 * Fetch wind, gusts, ocean current and wave height for a position and time.
 * Wind + currents + waves come from Open-Meteo (free, no key). If a Windy API
 * key is configured server-side, wind is taken from Windy instead.
 */
export async function fetchWeather(
  loc: GeoPoint,
  dateIso: string,
  timeHHMM: string,
  model = "best_match",
): Promise<WeatherResult> {
  const hour = (timeHHMM || "11:00").slice(0, 2);
  const target = `${dateIso}T${hour}:00`;
  const { lat, lon } = loc;

  const modelParam =
    model && model !== "best_match" ? `&models=${model}` : "";
  const windUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&wind_speed_unit=kn&timezone=auto&forecast_days=7${modelParam}`;
  const windFallbackUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&wind_speed_unit=kn&timezone=auto&forecast_days=7`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=ocean_current_velocity,ocean_current_direction,wave_height` +
    `&timezone=auto&forecast_days=7`;

  const [windRes, marineRes, windyRes] = await Promise.allSettled([
    fetch(windUrl).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(marineUrl).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch("/api/windy-wind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, target }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch(() => null),
  ]);

  const parseWind = (
    value: { hourly?: OpenMeteoHourly } | undefined,
  ): { dir: number; min: number; max: number } | null => {
    const h = (value?.hourly ?? {}) as OpenMeteoHourly;
    const i = indexForHour(h.time, target);
    if (i < 0) return null;
    const speed = num(h["wind_speed_10m"], i);
    const dir = num(h["wind_direction_10m"], i);
    const gust = num(h["wind_gusts_10m"], i);
    if (dir == null && speed == null) return null;
    return {
      dir: dir != null ? Math.round(dir) : 270,
      min: speed != null ? Math.round(speed) : 0,
      max:
        gust != null
          ? Math.round(gust)
          : speed != null
            ? Math.round(speed)
            : 0,
    };
  };

  let windDirDeg = 270;
  let windKnMin = 0;
  let windKnMax = 0;
  let source =
    model && model !== "best_match" ? modelLabel(model) : "Open-Meteo";

  let parsed =
    windRes.status === "fulfilled" ? parseWind(windRes.value) : null;
  // The chosen model has no data at this point (outside its domain) → fall
  // back to the auto/best-match source so the user still gets wind.
  if (!parsed && modelParam) {
    try {
      const r = await fetch(windFallbackUrl);
      if (r.ok) {
        parsed = parseWind(await r.json());
        source = "Open-Meteo (Auto-Fallback)";
      }
    } catch {
      /* ignore */
    }
  }
  if (parsed) {
    windDirDeg = parsed.dir;
    windKnMin = parsed.min;
    windKnMax = parsed.max;
  }

  // Prefer Windy for wind if the server route returned data.
  if (
    windyRes.status === "fulfilled" &&
    windyRes.value &&
    windyRes.value.configured &&
    typeof windyRes.value.windDirDeg === "number"
  ) {
    windDirDeg = Math.round(windyRes.value.windDirDeg);
    if (typeof windyRes.value.windKn === "number") {
      windKnMin = Math.round(windyRes.value.windKn);
    }
    if (typeof windyRes.value.gustKn === "number") {
      windKnMax = Math.round(windyRes.value.gustKn);
    } else {
      windKnMax = Math.max(windKnMax, windKnMin);
    }
    source = "Windy (Wind) + Open-Meteo (Strom)";
  }

  if (windKnMax < windKnMin) windKnMax = windKnMin;

  let currentKn = 0;
  let currentDirDeg = 180;
  let waveM: number | null = null;

  if (marineRes.status === "fulfilled" && marineRes.value) {
    const h = (marineRes.value.hourly ?? {}) as OpenMeteoHourly;
    const i = indexForHour(h.time, target);
    if (i >= 0) {
      const vel = num(h["ocean_current_velocity"], i); // km/h
      const dir = num(h["ocean_current_direction"], i);
      const wave = num(h["wave_height"], i);
      if (vel != null) currentKn = Math.round(vel * KMH_TO_KN * 10) / 10;
      if (dir != null) currentDirDeg = Math.round(dir);
      if (wave != null) waveM = Math.round(wave * 10) / 10;
    }
  }

  return {
    windDirDeg,
    windKnMin,
    windKnMax,
    currentKn,
    currentDirDeg,
    waveM,
    source,
  };
}
