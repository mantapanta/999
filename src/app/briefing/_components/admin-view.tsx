"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { CloudDownload, MoveRight, Loader2, Wand2 } from "lucide-react";

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
  onGenerateCourse,
  onSetBeatLength,
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
  onGenerateCourse: () => void;
  onSetBeatLength: (nm: number) => void;
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
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
            <p className="text-sm font-medium">
              1. Segelgebiet auf der Karte setzen → 2. Wetter laden.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Die App legt automatisch einen windorientierten Up/Down-Kurs aufs
              Revier. Tonnen musst du nicht setzen — das weißt du erst draußen.
            </p>
          </div>

          <MapEditor
            geo={state.geo}
            onSetLocation={setLocation}
            onSetMark={setMark}
          />

          <div>
            <p className="mb-1.5 text-sm font-medium">Kreuzlänge (1. Kreuz)</p>
            <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-secondary p-1">
              {[0.6, 0.75, 1.0].map((nm) => (
                <button
                  key={nm}
                  type="button"
                  onClick={() => onSetBeatLength(nm)}
                  className={cn(
                    "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    Math.abs(state.conditions.beatLengthNm - nm) < 0.01
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {nm.toFixed(2).replace(/0$/, "")} sm
                </button>
              ))}
            </div>
          </div>

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
              Wetter laden &amp; Kurs automatisch legen
            </Button>
            {weatherMsg ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
                {weatherMsg}
              </p>
            ) : null}
            {!state.geo.location ? (
              <p className="text-xs text-muted-foreground">
                Tippe oben auf die Karte (oder nutze Suche / Standort), um das
                Revier zu setzen.
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={onGenerateCourse}
                className="w-full text-muted-foreground"
              >
                <Wand2 className="h-4 w-4" /> Kurs neu aus aktuellem Wind legen
              </Button>
            )}
          </div>

          <details className="rounded-xl border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Tonnen manuell setzen (optional)
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Wenn du draußen die echten Positionen kennst: oben über die Karte
              die einzelnen Marken setzen, dann hier übernehmen.
            </p>
            <Button
              variant="outline"
              onClick={onApplyCourse}
              disabled={!allMarks}
              className="mt-2 w-full"
            >
              <MoveRight className="h-5 w-5" />
              Manuell gesetzten Kurs übernehmen
            </Button>
            {!allMarks ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Dafür alle fünf Marken (Luv, Komitee, Pin, Lee L, Lee R) setzen.
              </p>
            ) : null}
          </details>
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
