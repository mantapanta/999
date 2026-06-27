"use client";

import * as React from "react";
import { Printer, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CourseCanvas } from "./course-canvas";
import {
  SHIFT_LABEL,
  TREND_LABEL,
  STRENGTH_LABEL,
  SIDE_LABEL,
  biasLabel,
  currentAlongLabel,
  currentCrossLabel,
  selectBriefing,
} from "@/lib/briefing/rules";
import type {
  BriefingState,
  CustomRule,
  Facts,
} from "@/lib/briefing/types";

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function currentSummary(f: Facts): string {
  if (f.currentStrength === "none") return "kein Strom";
  const parts = [`${f.currentKn} kn`, currentAlongLabel(f)];
  const cross = currentCrossLabel(f);
  if (cross) parts.push(cross);
  return parts.join(", ");
}

function buildText(
  state: BriefingState,
  top: { title: string; action: string }[],
  facts: Facts,
): string {
  const c = state.conditions;
  const head = [c.raceLabel, c.venue, `${c.date} ${c.time}`].filter(Boolean).join(" · ");
  const lines: string[] = [];
  lines.push(`SEGEL-BRIEFING — ${head}`);
  lines.push("");
  lines.push(
    `Wind: ${c.windDirDeg}° · ${c.windKnMin}–${c.windKnMax} kn (${STRENGTH_LABEL[facts.windStrength]}), ${TREND_LABEL[c.trend]}`,
  );
  lines.push(`Dreher: ${SHIFT_LABEL[c.shift]}`);
  lines.push(`Strom: ${currentSummary(facts)}`);
  if (c.waveM != null) lines.push(`Welle: ${c.waveM} m`);
  lines.push(`Startlinie: ${biasLabel(facts)}`);
  lines.push(`Vorzugsseite: ${SIDE_LABEL[c.favoredSide]}`);
  if (c.notes.trim()) lines.push(`Notizen: ${c.notes.trim()}`);
  lines.push("");
  lines.push("DIE 5 REGELN FÜR DIESES RENNEN:");
  top.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
    lines.push(`   ${r.action}`);
  });
  return lines.join("\n");
}

export function BriefingOutput({
  state,
  customRules,
}: {
  state: BriefingState;
  customRules: CustomRule[];
}) {
  const [copied, setCopied] = React.useState(false);
  const { facts, top, rest } = selectBriefing(
    state.course,
    state.conditions,
    customRules,
  );
  const c = state.conditions;
  const head = [c.raceLabel, c.venue, `${c.date} ${c.time}`].filter(Boolean).join(" · ");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText(state, top, facts));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="px-5">
      <div className="mb-4 flex gap-2 no-print">
        <Button onClick={() => window.print()} variant="outline" className="flex-1">
          <Printer className="h-5 w-5" /> Drucken / PDF
        </Button>
        <Button onClick={copy} variant="outline" className="flex-1">
          {copied ? (
            <>
              <Check className="h-5 w-5" /> Kopiert
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" /> Als Text
            </>
          )}
        </Button>
      </div>

      <div className="print-area space-y-5">
        <header className="border-b pb-3">
          <h1 className="text-xl font-bold tracking-tight">Segel-Briefing</h1>
          <p className="text-sm text-muted-foreground">{head}</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <CourseCanvas
            course={state.course}
            conditions={state.conditions}
            readOnly
          />
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lage
            </h2>
            <KeyRow
              label="Wind"
              value={`${c.windDirDeg}° · ${c.windKnMin}–${c.windKnMax} kn`}
            />
            <KeyRow label="Stärke" value={STRENGTH_LABEL[facts.windStrength]} />
            <KeyRow label="Tendenz" value={TREND_LABEL[c.trend]} />
            <KeyRow label="Dreher" value={SHIFT_LABEL[c.shift]} />
            <KeyRow label="Strom" value={currentSummary(facts)} />
            {c.waveM != null ? (
              <KeyRow label="Welle" value={`${c.waveM} m`} />
            ) : null}
            <KeyRow label="Startlinie" value={biasLabel(facts)} />
            <KeyRow label="Vorzugsseite" value={SIDE_LABEL[c.favoredSide]} />
          </div>
        </div>

        {c.notes.trim() ? (
          <p className="rounded-lg bg-secondary px-4 py-2 text-sm">
            <span className="font-medium">Notiz:</span> {c.notes.trim()}
          </p>
        ) : null}

        <section>
          <h2 className="mb-3 text-base font-semibold">
            Die {top.length} Regeln für dieses Rennen
          </h2>
          <ol className="space-y-2.5">
            {top.map((r, i) => (
              <li
                key={r.id}
                className="flex gap-3 rounded-xl border bg-card p-3.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-base font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">
                    {r.title}
                    {r.custom ? (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 align-middle text-[10px] font-normal text-muted-foreground">
                        eigene
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {r.action}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Regeln ausgewählt — passe die Bedingungen an.
            </p>
          ) : null}
        </section>

        {rest.length > 0 ? (
          <details className="no-print rounded-xl border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Weitere relevante Hinweise ({rest.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {rest.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-medium">{r.title}:</span>{" "}
                  <span className="text-muted-foreground">{r.action}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
