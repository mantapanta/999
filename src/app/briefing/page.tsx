"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { RotateCcw, CloudDownload, MoveRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConditionsPanel } from "./_components/conditions-panel";
import { CourseCanvas } from "./_components/course-canvas";
import { BriefingOutput } from "./_components/briefing-output";
import { RulesLibrary } from "./_components/rules-library";
import {
  defaultState,
  loadCustomRules,
  loadState,
  saveCustomRules,
  saveState,
} from "@/lib/briefing/storage";
import { currentArrow, hasAllMarks, projectGeoToCourse } from "@/lib/briefing/geo";
import { fetchWeather } from "@/lib/briefing/weather";
import type {
  BriefingState,
  CustomRule,
  CourseLayout,
  Conditions,
  GeoPoint,
  MarkKey,
} from "@/lib/briefing/types";

const MapEditor = dynamic(() => import("./_components/map-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[58vh] min-h-[320px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
      Karte wird geladen …
    </div>
  ),
});

type Tab = "conditions" | "map" | "course" | "briefing" | "rules";

const TABS: { id: Tab; label: string }[] = [
  { id: "conditions", label: "Lage" },
  { id: "map", label: "Karte" },
  { id: "course", label: "Kurs" },
  { id: "briefing", label: "Briefing" },
  { id: "rules", label: "Regeln" },
];

export default function BriefingPage() {
  const [state, setState] = React.useState<BriefingState>(defaultState);
  const [customRules, setCustomRules] = React.useState<CustomRule[]>([]);
  const [tab, setTab] = React.useState<Tab>("conditions");
  const [hydrated, setHydrated] = React.useState(false);
  const [weatherBusy, setWeatherBusy] = React.useState(false);
  const [weatherMsg, setWeatherMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const saved = loadState();
    if (saved) setState(saved);
    setCustomRules(loadCustomRules());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);
  React.useEffect(() => {
    if (hydrated) saveCustomRules(customRules);
  }, [customRules, hydrated]);

  const setConditions = (conditions: Conditions) =>
    setState((s) => ({ ...s, conditions }));
  const setCourse = (course: CourseLayout) =>
    setState((s) => ({ ...s, course }));
  const setLocation = (location: GeoPoint) =>
    setState((s) => ({ ...s, geo: { ...s.geo, location } }));
  const setMark = (key: MarkKey, p: GeoPoint) =>
    setState((s) => ({
      ...s,
      geo: { ...s.geo, marks: { ...s.geo.marks, [key]: p } },
    }));

  const reset = () => {
    if (
      window.confirm(
        "Neues Rennen starten? Bedingungen, Kurs und Karten-Marken werden zurückgesetzt (deine eigenen Regeln bleiben).",
      )
    ) {
      setState(defaultState());
      setWeatherMsg(null);
      setTab("conditions");
    }
  };

  const loadWeather = async () => {
    const loc = state.geo.location;
    if (!loc) {
      setWeatherMsg("Bitte zuerst einen Standort auf der Karte setzen.");
      return;
    }
    setWeatherBusy(true);
    setWeatherMsg(null);
    try {
      const w = await fetchWeather(loc, state.conditions.date, state.conditions.time);
      setState((s) => {
        const arrow = currentArrow(w.windDirDeg, w.currentDirDeg);
        return {
          ...s,
          conditions: {
            ...s.conditions,
            windDirDeg: w.windDirDeg,
            windKnMin: w.windKnMin,
            windKnMax: w.windKnMax,
            currentKn: w.currentKn,
            currentDirDeg: w.currentDirDeg,
            waveM: w.waveM,
            weatherSource: w.source,
          },
          course: { ...s.course, currentFrom: arrow.from, currentTo: arrow.to },
        };
      });
      setWeatherMsg(
        `Geladen (${w.source}): Wind ${w.windDirDeg}° · ${w.windKnMin}–${w.windKnMax} kn · Strom ${w.currentKn} kn` +
          (w.waveM != null ? ` · Welle ${w.waveM} m` : ""),
      );
    } catch {
      setWeatherMsg(
        "Wetter konnte nicht geladen werden (Netzwerk/Standort prüfen).",
      );
    } finally {
      setWeatherBusy(false);
    }
  };

  const applyCourseFromChart = () => {
    setState((s) => ({
      ...s,
      course: projectGeoToCourse(
        s.geo,
        s.conditions.windDirDeg,
        s.conditions.currentDirDeg,
        s.course,
      ),
    }));
    setTab("course");
  };

  const allMarks = hasAllMarks(state.geo);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-16">
      <header className="flex items-end justify-between gap-4 px-5 pb-3 pt-6 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Taktik-Briefing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One-Design · J70 &amp; Drachen
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" /> Neu
        </Button>
      </header>

      <div className="sticky top-0 z-[1100] mb-4 bg-background/95 px-5 pb-2 pt-1 backdrop-blur no-print">
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-secondary p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-1.5 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {tab === "conditions" ? (
          <ConditionsPanel
            conditions={state.conditions}
            onChange={setConditions}
          />
        ) : null}

        {tab === "map" ? (
          <div className="space-y-4 px-5">
            <MapEditor
              geo={state.geo}
              onSetLocation={setLocation}
              onSetMark={setMark}
            />

            <div className="space-y-2">
              <Button
                onClick={loadWeather}
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  Lädt Wind, Böen, Meeresströmung und Welle für Standort, Datum
                  und Uhrzeit (Quelle: Open-Meteo, kostenlos).
                </p>
              )}

              <Button
                variant="outline"
                onClick={applyCourseFromChart}
                disabled={!allMarks}
                className="w-full"
              >
                <MoveRight className="h-5 w-5" />
                Kurs ins Taktik-Diagramm übernehmen
              </Button>
              {!allMarks ? (
                <p className="text-xs text-muted-foreground">
                  Setze alle fünf Marken (Luv, Komitee, Pin, Lee L, Lee R), um
                  den echten Kurs windgedreht ins Diagramm zu übernehmen.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "course" ? (
          <div className="px-5">
            <CourseCanvas
              course={state.course}
              conditions={state.conditions}
              onChange={setCourse}
            />
          </div>
        ) : null}

        {tab === "briefing" ? (
          <BriefingOutput state={state} customRules={customRules} />
        ) : null}

        {tab === "rules" ? (
          <RulesLibrary customRules={customRules} onChange={setCustomRules} />
        ) : null}
      </main>
    </div>
  );
}
