import {
  SHIFT_LABEL,
  TREND_LABEL,
  STRENGTH_LABEL,
  SIDE_LABEL,
  biasLabel,
  currentAlongLabel,
  currentCrossLabel,
} from "./rules";
import type { BriefingState, Facts } from "./types";

export function currentSummary(f: Facts): string {
  if (f.currentStrength === "none") return "kein Strom";
  const parts = [`${f.currentKn} kn`, currentAlongLabel(f)];
  const cross = currentCrossLabel(f);
  if (cross) parts.push(cross);
  return parts.join(", ");
}

export function buildBriefingText(
  state: BriefingState,
  top: { title: string; action: string }[],
  facts: Facts,
): string {
  const c = state.conditions;
  const head = [c.raceLabel, c.venue, `${c.date} ${c.time}`]
    .filter(Boolean)
    .join(" · ");
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
