"use client";

import * as React from "react";
import { Sailboat, Settings2, Flag, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { RaceView } from "./_components/race-view";
import { AdminView } from "./_components/admin-view";
import {
  defaultState,
  loadCustomRules,
  loadState,
  saveCustomRules,
  saveState,
} from "@/lib/briefing/storage";
import {
  autoCourse,
  currentArrow,
  hasAllMarks,
  projectGeoToCourse,
} from "@/lib/briefing/geo";
import { fetchWeatherSeries, seriesIndexForTime } from "@/lib/briefing/weather";
import type {
  BriefingState,
  Conditions,
  CustomRule,
  GeoPoint,
  MarkKey,
  WeatherSeries,
} from "@/lib/briefing/types";

/** Apply one hour of the series to the state (wind/current values + arrow). */
function hourState(
  s: BriefingState,
  series: WeatherSeries,
  idx: number,
): BriefingState {
  const windDirDeg = series.windDir[idx];
  const currentDirDeg = series.currentDir[idx];
  const arrow = currentArrow(windDirDeg, currentDirDeg);
  return {
    ...s,
    selectedTime: series.times[idx],
    conditions: {
      ...s.conditions,
      windDirDeg,
      windKnMin: series.windKn[idx],
      windKnMax: series.gustKn[idx],
      currentKn: series.currentKn[idx],
      currentDirDeg,
      waveM: series.waveM[idx],
      weatherSource: series.source,
    },
    course: { ...s.course, currentFrom: arrow.from, currentTo: arrow.to },
  };
}

type View = "race" | "admin";

export default function BriefingPage() {
  const [state, setState] = React.useState<BriefingState>(defaultState);
  const [customRules, setCustomRules] = React.useState<CustomRule[]>([]);
  const [view, setView] = React.useState<View>("race");
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
        "Neues Rennen? Bedingungen, Kurs und Karten-Marken werden zurückgesetzt (eigene Regeln bleiben).",
      )
    ) {
      setState(defaultState());
      setWeatherMsg(null);
      setView("race");
    }
  };

  const loadWeather = async () => {
    const loc = state.geo.location;
    if (!loc) {
      setWeatherMsg("Bitte zuerst einen Standort auf der Karte setzen.");
      setView("admin");
      return;
    }
    setWeatherBusy(true);
    setWeatherMsg(null);
    try {
      const series = await fetchWeatherSeries(
        loc,
        state.conditions.date,
        state.conditions.weatherModel,
      );
      const idx = seriesIndexForTime(series, state.conditions.time);
      setState((s) => {
        // Lay a standard Up/Down course on the area from this hour's wind, then
        // apply the hour's wind/current. No mark setting needed.
        const marks = autoCourse(
          loc,
          series.windDir[idx],
          s.conditions.beatLengthNm,
        );
        const geo = { ...s.geo, marks };
        const withHour = hourState({ ...s, geo, weatherSeries: series }, series, idx);
        return {
          ...withHour,
          course: projectGeoToCourse(
            geo,
            series.windDir[idx],
            series.currentDir[idx],
            withHour.course,
          ),
        };
      });
      setWeatherMsg(
        `Tagesverlauf geladen (${series.source}) · ${series.times[0]}–${series.times[series.times.length - 1]} Uhr · Kurs automatisch gelegt`,
      );
    } catch {
      setWeatherMsg("Wetter konnte nicht geladen werden (Netzwerk prüfen).");
    } finally {
      setWeatherBusy(false);
    }
  };

  const selectHour = (hhmm: string) =>
    setState((s) => {
      if (!s.weatherSeries) return s;
      const idx = seriesIndexForTime(s.weatherSeries, hhmm);
      return hourState(s, s.weatherSeries, idx);
    });

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
    setView("race");
  };

  // Build the Up/Down course from the area + current wind, without refetching.
  const generateCourse = (gotoRace = false) => {
    setState((s) => {
      if (!s.geo.location) return s;
      const marks = autoCourse(
        s.geo.location,
        s.conditions.windDirDeg,
        s.conditions.beatLengthNm,
      );
      const geo = { ...s.geo, marks };
      return {
        ...s,
        geo,
        course: projectGeoToCourse(
          geo,
          s.conditions.windDirDeg,
          s.conditions.currentDirDeg,
          s.course,
        ),
      };
    });
    if (gotoRace) setView("race");
  };

  const setBeatLength = (beatLengthNm: number) => {
    setState((s) => {
      const conditions = { ...s.conditions, beatLengthNm };
      if (!s.geo.location) return { ...s, conditions };
      const marks = autoCourse(s.geo.location, s.conditions.windDirDeg, beatLengthNm);
      const geo = { ...s.geo, marks };
      return {
        ...s,
        conditions,
        geo,
        course: projectGeoToCourse(
          geo,
          s.conditions.windDirDeg,
          s.conditions.currentDirDeg,
          s.course,
        ),
      };
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col pb-10">
      {/* Top app bar */}
      <header className="sticky top-0 z-[1100] flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur no-print">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#15507a] text-white">
            <Sailboat className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Taktik-Briefing</span>
        </div>
        <div className="flex items-center gap-1">
          {view === "admin" ? (
            <button
              onClick={reset}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              title="Neues Rennen"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          ) : null}
          <div className="grid grid-flow-col gap-0.5 rounded-lg bg-secondary p-0.5">
            <button
              onClick={() => setView("race")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "race"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Flag className="h-4 w-4" /> Race
            </button>
            <button
              onClick={() => setView("admin")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "admin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Settings2 className="h-4 w-4" /> Setup
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-4">
        {view === "race" ? (
          <RaceView
            state={state}
            customRules={customRules}
            onChange={setConditions}
            onRefreshWeather={loadWeather}
            onSelectHour={selectHour}
            weatherBusy={weatherBusy}
            hasLocation={!!state.geo.location}
          />
        ) : (
          <AdminView
            state={state}
            customRules={customRules}
            onChangeConditions={setConditions}
            setLocation={setLocation}
            setMark={setMark}
            setCustomRules={setCustomRules}
            onRefreshWeather={loadWeather}
            weatherBusy={weatherBusy}
            weatherMsg={weatherMsg}
            onApplyCourse={applyCourseFromChart}
            onGenerateCourse={() => generateCourse(false)}
            onSetBeatLength={setBeatLength}
            allMarks={hasAllMarks(state.geo)}
          />
        )}
      </main>
    </div>
  );
}
