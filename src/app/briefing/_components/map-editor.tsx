"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GeoPoint, GeoState, MarkKey } from "@/lib/briefing/types";
import { MARK_KEYS } from "@/lib/briefing/types";

type Target = "location" | MarkKey;

const TARGET_META: Record<Target, { label: string; color: string }> = {
  location: { label: "Standort", color: "#2563eb" },
  windward: { label: "Luv", color: "#f59e0b" },
  committee: { label: "Komitee", color: "#1e3a5f" },
  pin: { label: "Pin", color: "#dc2626" },
  leewardLeft: { label: "Lee L", color: "#b45309" },
  leewardRight: { label: "Lee R", color: "#b45309" },
};

const TARGETS: Target[] = ["location", ...MARK_KEYS];

const DEFAULT_CENTER: [number, number] = [54.43, 10.19]; // Kiel

function badgeIcon(target: Target): L.DivIcon {
  const { label, color } = TARGET_META[target];
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <div style="background:${color};color:#fff;font:600 11px system-ui;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.4)">${label}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color}"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function MapEditor({
  geo,
  onSetLocation,
  onSetMark,
}: {
  geo: GeoState;
  onSetLocation: (p: GeoPoint) => void;
  onSetMark: (key: MarkKey, p: GeoPoint) => void;
}) {
  const mapElRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layerRef = React.useRef<L.LayerGroup | null>(null);
  const [target, setTarget] = React.useState<Target>("location");
  const targetRef = React.useRef<Target>(target);
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  // Stable refs so the (once-registered) click handler sees current values.
  const cbRef = React.useRef({ onSetLocation, onSetMark });
  cbRef.current = { onSetLocation, onSetMark };
  targetRef.current = target;

  // Init map once.
  React.useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    const start: [number, number] = geo.location
      ? [geo.location.lat, geo.location.lon]
      : geo.marks.windward
        ? [geo.marks.windward.lat, geo.marks.windward.lon]
        : DEFAULT_CENTER;

    const map = L.map(mapElRef.current, {
      center: start,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenSeaMap",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const p = { lat: e.latlng.lat, lon: e.latlng.lng };
      const t = targetRef.current;
      if (t === "location") cbRef.current.onSetLocation(p);
      else cbRef.current.onSetMark(t, p);
    });

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet needs a size recalculation once laid out.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever geo changes.
  React.useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();

    const addMarker = (t: Target, p: GeoPoint) => {
      const m = L.marker([p.lat, p.lon], {
        icon: badgeIcon(t),
        draggable: true,
      });
      m.on("dragend", () => {
        const ll = m.getLatLng();
        const np = { lat: ll.lat, lon: ll.lng };
        if (t === "location") cbRef.current.onSetLocation(np);
        else cbRef.current.onSetMark(t, np);
      });
      m.addTo(group);
    };

    if (geo.location) addMarker("location", geo.location);
    for (const k of MARK_KEYS) {
      const p = geo.marks[k];
      if (p) addMarker(k, p);
    }
  }, [geo]);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      onSetLocation(p);
      mapRef.current?.setView([p.lat, p.lon], 14);
    });
  };

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (data[0]) {
        const p = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        onSetLocation(p);
        mapRef.current?.setView([p.lat, p.lon], 13);
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={doSearch} className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Revier suchen, z. B. „Kiel Schilksee“"
        />
        <Button type="submit" variant="outline" size="icon" disabled={searching}>
          <Search className="h-5 w-5" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={locateMe}>
          <LocateFixed className="h-5 w-5" />
        </Button>
      </form>

      <div>
        <p className="mb-1.5 text-sm font-medium">Was setzen? (dann auf die Karte tippen)</p>
        <div className="flex flex-wrap gap-1.5">
          {TARGETS.map((t) => {
            const placed =
              t === "location" ? !!geo.location : !!geo.marks[t as MarkKey];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  target === t
                    ? "border-transparent text-white"
                    : "border-input bg-background text-muted-foreground hover:text-foreground",
                )}
                style={
                  target === t
                    ? { background: TARGET_META[t].color }
                    : undefined
                }
              >
                {TARGET_META[t].label}
                {placed ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={mapElRef}
        className="h-[58vh] min-h-[320px] w-full overflow-hidden rounded-xl border"
      />
      <p className="text-xs text-muted-foreground">
        Basiskarte © OpenStreetMap · Seezeichen © OpenSeaMap. Marker lassen sich
        auch direkt verschieben.
      </p>
    </div>
  );
}
