import type { GeoPoint, WeatherResult } from "./types";

const KMH_TO_KN = 1 / 1.852;

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
): Promise<WeatherResult> {
  const hour = (timeHHMM || "11:00").slice(0, 2);
  const target = `${dateIso}T${hour}:00`;
  const { lat, lon } = loc;

  const windUrl =
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

  let windDirDeg = 270;
  let windKnMin = 0;
  let windKnMax = 0;
  let source = "Open-Meteo";

  if (windRes.status === "fulfilled" && windRes.value) {
    const h = (windRes.value.hourly ?? {}) as OpenMeteoHourly;
    const i = indexForHour(h.time, target);
    if (i >= 0) {
      const speed = num(h["wind_speed_10m"], i);
      const dir = num(h["wind_direction_10m"], i);
      const gust = num(h["wind_gusts_10m"], i);
      if (dir != null) windDirDeg = Math.round(dir);
      if (speed != null) windKnMin = Math.round(speed);
      if (gust != null) windKnMax = Math.round(gust);
      else if (speed != null) windKnMax = Math.round(speed);
    }
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
