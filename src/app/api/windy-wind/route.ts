import { NextResponse } from "next/server";

// Optional Windy enhancement: if WINDY_API_KEY is set, fetch wind + gusts from
// the Windy Point Forecast API. Windy's point API does NOT provide ocean
// currents — those come from Open-Meteo on the client.

const MS_TO_KN = 1.943_844;

export async function POST(request: Request) {
  const key = process.env.WINDY_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false });
  }

  let body: { lat?: number; lon?: number; target?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { configured: true, error: "bad request" },
      { status: 400 },
    );
  }

  const { lat, lon, target } = body;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return NextResponse.json(
      { configured: true, error: "lat/lon required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.windy.com/api/point-forecast/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lon,
        model: "gfs",
        parameters: ["wind", "windGust"],
        levels: ["surface"],
        key,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { configured: true, error: `windy ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    const ts = data.ts as number[] | undefined;
    const u = data["wind_u-surface"] as number[] | undefined;
    const v = data["wind_v-surface"] as number[] | undefined;
    const gust = data["gust-surface"] as number[] | undefined;

    if (!ts || !u || !v) {
      return NextResponse.json(
        { configured: true, error: "unexpected windy response" },
        { status: 502 },
      );
    }

    // Nearest forecast step to the requested time.
    const targetMs = target ? Date.parse(target) : NaN;
    let i = 0;
    if (!Number.isNaN(targetMs)) {
      let bestDiff = Infinity;
      ts.forEach((t, idx) => {
        const diff = Math.abs(t - targetMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          i = idx;
        }
      });
    }

    const ue = u[i];
    const vn = v[i];
    const speedKn = Math.hypot(ue, vn) * MS_TO_KN;
    // Meteorological direction the wind comes FROM.
    const windDirDeg = (Math.atan2(-ue, -vn) * 180) / Math.PI;
    const gustKn =
      gust && typeof gust[i] === "number" ? gust[i] * MS_TO_KN : undefined;

    return NextResponse.json({
      configured: true,
      windDirDeg: ((windDirDeg % 360) + 360) % 360,
      windKn: Math.round(speedKn),
      gustKn: gustKn != null ? Math.round(gustKn) : undefined,
    });
  } catch {
    return NextResponse.json(
      { configured: true, error: "windy request failed" },
      { status: 502 },
    );
  }
}
