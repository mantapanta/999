"use client";

import * as React from "react";
import {
  Wind,
  Waves,
  Navigation,
  Flag,
  RefreshCw,
  Copy,
  Check,
  Printer,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseCanvas } from "./course-canvas";
import {
  STRENGTH_LABEL,
  SHIFT_LABEL,
  biasLabel,
  selectBriefing,
} from "@/lib/briefing/rules";
import { buildBriefingText, currentSummary } from "@/lib/briefing/format";
import type {
  BriefingState,
  Conditions,
  CustomRule,
  ShiftType,
  Side,
} from "@/lib/briefing/types";

function Chip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2",
        accent ? "border-teal-200 bg-teal-50" : "bg-card",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block text-sm font-semibold leading-tight">
          {value}
        </span>
      </span>
    </div>
  );
}

function MiniSeg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-0.5 rounded-lg bg-secondary p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-1 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RaceView({
  state,
  customRules,
  onChange,
  onRefreshWeather,
  weatherBusy,
  hasLocation,
}: {
  state: BriefingState;
  customRules: CustomRule[];
  onChange: (c: Conditions) => void;
  onRefreshWeather: () => void;
  weatherBusy: boolean;
  hasLocation: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const { facts, top } = selectBriefing(
    state.course,
    state.conditions,
    customRules,
  );
  const c = state.conditions;
  const set = <K extends keyof Conditions>(k: K, v: Conditions[K]) =>
    onChange({ ...c, [k]: v });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        buildBriefingText(state, top, facts),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Header band */}
      <div
        className="rounded-2xl px-4 py-4 text-white shadow-sm"
        style={{
          background: "linear-gradient(135deg,#0f2a44 0%,#15507a 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <input
              value={c.raceLabel}
              onChange={(e) => set("raceLabel", e.target.value)}
              className="w-full truncate bg-transparent text-lg font-semibold outline-none placeholder:text-white/50"
              placeholder="Race / Briefing"
            />
            <p className="mt-0.5 truncate text-sm text-white/70">
              {[c.venue || "Ort offen", c.time].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Button
            onClick={onRefreshWeather}
            disabled={weatherBusy || !hasLocation}
            size="sm"
            className="shrink-0 bg-white/15 text-white hover:bg-white/25"
            title={
              hasLocation
                ? "Wetter aktualisieren"
                : "Erst Standort im Setup setzen"
            }
          >
            {weatherBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Wetter
          </Button>
        </div>
      </div>

      {/* Conditions chips */}
      <div className="grid grid-cols-2 gap-2">
        <Chip
          icon={
            <Navigation
              className="h-4 w-4"
              style={{ transform: `rotate(${(c.windDirDeg + 180) % 360}deg)` }}
            />
          }
          label={`Wind · ${STRENGTH_LABEL[facts.windStrength]}`}
          value={`${c.windDirDeg}° · ${c.windKnMin}–${c.windKnMax} kn`}
        />
        <Chip
          icon={<Wind className="h-4 w-4" />}
          label="Strom"
          value={currentSummary(facts)}
          accent={facts.currentStrength !== "none"}
        />
        <Chip
          icon={<Flag className="h-4 w-4" />}
          label="Startlinie"
          value={biasLabel(facts)}
        />
        <Chip
          icon={<Waves className="h-4 w-4" />}
          label="Welle"
          value={c.waveM != null ? `${c.waveM} m` : "—"}
        />
      </div>

      {/* Quick tactical calls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Dreher
          </p>
          <MiniSeg<ShiftType>
            value={c.shift}
            onChange={(v) => set("shift", v)}
            options={[
              { value: "oscillating", label: "Pendel" },
              { value: "left", label: "Links" },
              { value: "right", label: "Rechts" },
              { value: "unknown", label: "?" },
            ]}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Vorzugsseite
          </p>
          <MiniSeg<Side>
            value={c.favoredSide}
            onChange={(v) => set("favoredSide", v)}
            options={[
              { value: "left", label: "Links" },
              { value: "unknown", label: "Offen" },
              { value: "right", label: "Rechts" },
            ]}
          />
        </div>
      </div>

      {/* The hero: 5 rules */}
      <div className="print-area space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Deine {top.length} Regeln
          </h2>
          <span className="text-xs text-muted-foreground">{SHIFT_LABEL[c.shift]}</span>
        </div>
        <ol className="space-y-2">
          {top.map((r, i) => (
            <li
              key={r.id}
              className="flex gap-3 rounded-xl border-l-4 border-l-teal-500 bg-card p-3 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#15507a] text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {r.action}
                </p>
              </div>
            </li>
          ))}
          {top.length === 0 ? (
            <li className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Noch keine Regeln — passe Bedingungen an oder lade Wetter.
            </li>
          ) : null}
        </ol>
      </div>

      {/* Mini course */}
      <div className="mx-auto max-w-[260px]">
        <CourseCanvas
          course={state.course}
          conditions={state.conditions}
          readOnly
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 no-print">
        <Button onClick={copy} variant="outline" className="flex-1">
          {copied ? (
            <>
              <Check className="h-5 w-5" /> Kopiert
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" /> Teilen / Text
            </>
          )}
        </Button>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="flex-1"
        >
          <Printer className="h-5 w-5" /> Drucken
        </Button>
      </div>
    </div>
  );
}
