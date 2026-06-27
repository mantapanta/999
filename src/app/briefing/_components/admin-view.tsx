"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { CloudDownload, MoveRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConditionsPanel } from "./conditions-panel";
import { RulesLibrary } from "./rules-library";
import { WEATHER_MODELS } from "@/lib/briefing/weather";
import type {
  BriefingState,
  Conditions,
  CustomRule,
  GeoPoint,
  MarkKey,
} from "@/lib/briefing/types";

const MapEditor = dynamic(() => import("./map-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[58vh] min-h-[320px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
      Karte wird geladen …
    </div>
  ),
});

type AdminTab = "course" | "weather" | "rules";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "course", label: "Kurs & Ort" },
  { id: "weather", label: "Wetter & Modell" },
  { id: "rules", label: "Regeln" },
];

export function AdminView({
  state,
  customRules,
  onChangeConditions,
  setLocation,
  setMark,
  setCustomRules,
  onRefreshWeather,
  weatherBusy,
  weatherMsg,
  onApplyCourse,
  allMarks,
}: {
  state: BriefingState;
  customRules: CustomRule[];
  onChangeConditions: (c: Conditions) => void;
  setLocation: (p: GeoPoint) => void;
  setMark: (key: MarkKey, p: GeoPoint) => void;
  setCustomRules: (r: CustomRule[]) => void;
  onRefreshWeather: () => void;
  weatherBusy: boolean;
  weatherMsg: string | null;
  onApplyCourse: () => void;
  allMarks: boolean;
}) {
  const [tab, setTab] = React.useState<AdminTab>("course");
  const c = state.conditions;

  return (
    <div>
      <div className="mb-4 px-4">
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-secondary p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "course" ? (
        <div className="space-y-4 px-4">
          <MapEditor
            geo={state.geo}
            onSetLocation={setLocation}
            onSetMark={setMark}
          />
          <div className="space-y-2">
            <Button
              onClick={onRefreshWeather}
              disabled={weatherBusy || !state.geo.location}
              className="w-full"
            >
              {weatherBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CloudDownload className="h-5 w-5" />
              )}
              Wetter &amp; Strom laden
            </Button>
            {weatherMsg ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
                {weatherMsg}
              </p>
            ) : null}
            <Button
              variant="outline"
              onClick={onApplyCourse}
              disabled={!allMarks}
              className="w-full"
            >
              <MoveRight className="h-5 w-5" />
              Kurs ins Taktik-Diagramm übernehmen
            </Button>
            {!allMarks ? (
              <p className="text-xs text-muted-foreground">
                Setze alle fünf Marken (Luv, Komitee, Pin, Lee L, Lee R), um den
                echten Kurs windgedreht zu übernehmen.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "weather" ? (
        <div className="space-y-5">
          <div className="px-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Wettermodell
              </span>
              <select
                value={c.weatherModel}
                onChange={(e) =>
                  onChangeConditions({ ...c, weatherModel: e.target.value })
                }
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {WEATHER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.note ? ` — ${m.note}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Wind kommt aus dem gewählten Modell (Open-Meteo). Liegt das Revier
              außerhalb der Modell-Abdeckung, wird automatisch auf „Auto“
              zurückgegriffen. Strom &amp; Welle stammen aus dem Meeresmodell.
            </p>
            <Button
              onClick={onRefreshWeather}
              disabled={weatherBusy || !state.geo.location}
              className="mt-3 w-full"
            >
              {weatherBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CloudDownload className="h-5 w-5" />
              )}
              Wetter &amp; Strom laden
            </Button>
            {!state.geo.location ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Standort im Tab „Kurs &amp; Ort“ setzen, dann lädt das Wetter.
              </p>
            ) : null}
          </div>

          <div>
            <p className="px-5 text-sm font-semibold text-muted-foreground">
              Manuelle Werte (überschreiben den Abruf)
            </p>
            <div className="mt-2">
              <ConditionsPanel
                conditions={state.conditions}
                onChange={onChangeConditions}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "rules" ? (
        <RulesLibrary customRules={customRules} onChange={setCustomRules} />
      ) : null}
    </div>
  );
}
