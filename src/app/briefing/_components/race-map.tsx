"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoPoint, GeoState, MarkKey } from "@/lib/briefing/types";
import { MARK_KEYS } from "@/lib/briefing/types";

const MARK_COLOR: Record<MarkKey, string> = {
  windward: "#f59e0b",
  committee: "#1e3a5f",
  pin: "#dc2626",
  leewardLeft: "#b45309",
  leewardRight: "#b45309",
};
const MARK_LABEL: Record<MarkKey, string> = {
  windward: "Luv",
  committee: "K",
  pin: "Pin",
  leewardLeft: "Lee",
  leewardRight: "Lee",
};

function dotIcon(key: MarkKey): L.DivIcon {
  const c = MARK_COLOR[key];
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:3px">
      <span style="width:11px;height:11px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 0 1px ${c}"></span>
      <span style="font:600 10px system-ui;color:${c};text-shadow:0 0 2px #fff,0 0 2px #fff">${MARK_LABEL[key]}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** A rotated arrow centred on a point, pointing toward `bearingDeg`. */
function arrowIcon(
  bearingDeg: number,
  color: string,
  label: string,
): L.DivIcon {
  const box = 96;
  return L.divIcon({
    className: "",
    html: `<div style="width:${box}px;height:${box}px;transform:rotate(${bearingDeg}deg);pointer-events:none">
      <svg width="${box}" height="${box}" viewBox="0 0 96 96" style="overflow:visible">
        <line x1="48" y1="72" x2="48" y2="20" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
        <path d="M48 12 L40 28 L48 23 L56 28 Z" fill="${color}"/>
      </svg>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${-bearingDeg}deg);font:700 10px system-ui;color:${color};background:rgba(255,255,255,.85);padding:0 3px;border-radius:3px">${label}</span>
    </div>`,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

function centroid(points: GeoPoint[]): GeoPoint {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  return { lat, lon };
}

export default function RaceMap({
  geo,
  windDirDeg,
  currentDirDeg,
  currentKn,
}: {
  geo: GeoState;
  windDirDeg: number;
  currentDirDeg: number;
  currentKn: number;
}) {
  const elRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layerRef = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const start: [number, number] = geo.location
      ? [geo.location.lat, geo.location.lon]
      : [54.43, 10.19];
    const map = L.map(elRef.current, {
      center: start,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const group = layerRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    const placed = MARK_KEYS.map((k) => geo.marks[k]).filter(
      (p): p is GeoPoint => !!p,
    );

    // Course lines: start → windward, and leeward gate.
    const m = geo.marks;
    if (m.committee && m.pin) {
      L.polyline(
        [
          [m.committee.lat, m.committee.lon],
          [m.pin.lat, m.pin.lon],
        ],
        { color: "#1e3a5f", weight: 2, dashArray: "4 3" },
      ).addTo(group);
    }
    if (m.windward && m.committee && m.pin) {
      const startMid = centroid([m.committee, m.pin]);
      L.polyline(
        [
          [startMid.lat, startMid.lon],
          [m.windward.lat, m.windward.lon],
        ],
        { color: "#7fa0b0", weight: 1.5, dashArray: "5 4" },
      ).addTo(group);
    }
    if (m.leewardLeft && m.leewardRight) {
      L.polyline(
        [
          [m.leewardLeft.lat, m.leewardLeft.lon],
          [m.leewardRight.lat, m.leewardRight.lon],
        ],
        { color: "#b45309", weight: 2 },
      ).addTo(group);
    }

    // Marks.
    for (const k of MARK_KEYS) {
      const p = geo.marks[k];
      if (p) L.marker([p.lat, p.lon], { icon: dotIcon(k) }).addTo(group);
    }

    // Wind + current arrows, anchored at the course centre (or location).
    const anchor = placed.length
      ? centroid(placed)
      : geo.location ?? { lat: 54.43, lon: 10.19 };
    // Wind blows toward windDir+180.
    L.marker([anchor.lat, anchor.lon], {
      icon: arrowIcon((windDirDeg + 180) % 360, "#1e3a5f", "Wind"),
      interactive: false,
      zIndexOffset: 500,
    }).addTo(group);
    if (currentKn > 0) {
      L.marker([anchor.lat, anchor.lon], {
        icon: arrowIcon(currentDirDeg % 360, "#0d9488", `${currentKn}kn`),
        interactive: false,
        zIndexOffset: 400,
      }).addTo(group);
    }

    // Frame the course.
    if (placed.length >= 2) {
      const b = L.latLngBounds(placed.map((p) => [p.lat, p.lon]));
      map.fitBounds(b.pad(0.6), { animate: false });
    } else if (geo.location) {
      map.setView([geo.location.lat, geo.location.lon], 13, { animate: false });
    }
  }, [geo, windDirDeg, currentDirDeg, currentKn]);

  return (
    <div
      ref={elRef}
      className="h-[46vh] min-h-[280px] w-full overflow-hidden rounded-2xl border"
    />
  );
}
