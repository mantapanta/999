"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conditions, ShiftType, Side, Trend } from "@/lib/briefing/types";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function SegGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2 py-2 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ConditionsPanel({
  conditions,
  onChange,
}: {
  conditions: Conditions;
  onChange: (next: Conditions) => void;
}) {
  const set = <K extends keyof Conditions>(key: K, value: Conditions[K]) =>
    onChange({ ...conditions, [key]: value });

  return (
    <div className="space-y-5 px-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Revier / Ort">
          <Input
            value={conditions.venue}
            placeholder="z. B. Kiel"
            onChange={(e) => set("venue", e.target.value)}
          />
        </Field>
        <Field label="Datum">
          <Input
            type="date"
            value={conditions.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Bezeichnung" hint="z. B. „Race 3“ oder „Morgen-Briefing“">
        <Input
          value={conditions.raceLabel}
          onChange={(e) => set("raceLabel", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Windrichtung °">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={360}
            value={conditions.windDirDeg}
            onChange={(e) =>
              set("windDirDeg", clampNum(e.target.value, 0, 360))
            }
          />
        </Field>
        <Field label="Wind min (kn)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={conditions.windKnMin}
            onChange={(e) => set("windKnMin", clampNum(e.target.value, 0, 50))}
          />
        </Field>
        <Field label="Wind max (kn)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={conditions.windKnMax}
            onChange={(e) => set("windKnMax", clampNum(e.target.value, 0, 50))}
          />
        </Field>
      </div>

      <Field label="Wind-Tendenz">
        <SegGroup<Trend>
          value={conditions.trend}
          onChange={(v) => set("trend", v)}
          options={[
            { value: "building", label: "Auffrischend" },
            { value: "steady", label: "Konstant" },
            { value: "dying", label: "Abnehmend" },
          ]}
        />
      </Field>

      <Field
        label="Dreh-Charakter"
        hint="Pendeldreher → in Phasen. Anhaltend → eine Seite."
      >
        <SegGroup<ShiftType>
          value={conditions.shift}
          onChange={(v) => set("shift", v)}
          options={[
            { value: "oscillating", label: "Pendeln" },
            { value: "left", label: "Links" },
            { value: "right", label: "Rechts" },
            { value: "unknown", label: "Unklar" },
          ]}
        />
      </Field>

      <Field
        label="Strom-Stärke (kn)"
        hint="0 = kein Strom. Die Richtung ziehst du im Kurs-Tab mit dem Strompfeil ein."
      >
        <Input
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          max={6}
          value={conditions.currentKn}
          onChange={(e) => set("currentKn", clampNum(e.target.value, 0, 6, true))}
        />
      </Field>

      <Field
        label="Erwartete Vorzugsseite"
        hint="Wo erwartest du mehr Druck / die bessere Strategie?"
      >
        <SegGroup<Side>
          value={conditions.favoredSide}
          onChange={(v) => set("favoredSide", v)}
          options={[
            { value: "left", label: "Links" },
            { value: "unknown", label: "Offen" },
            { value: "right", label: "Rechts" },
          ]}
        />
      </Field>

      <Field label="Notizen (optional)">
        <textarea
          value={conditions.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="z. B. Welle von rechts, Böen aus NW …"
          className="flex w-full rounded-lg border border-input bg-background px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </Field>
    </div>
  );
}

function clampNum(raw: string, min: number, max: number, decimal = false) {
  const n = decimal ? parseFloat(raw) : parseInt(raw, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
