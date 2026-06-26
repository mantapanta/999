"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

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
import type {
  BriefingState,
  CustomRule,
  CourseLayout,
  Conditions,
} from "@/lib/briefing/types";

type Tab = "conditions" | "course" | "briefing" | "rules";

const TABS: { id: Tab; label: string }[] = [
  { id: "conditions", label: "Bedingungen" },
  { id: "course", label: "Kurs" },
  { id: "briefing", label: "Briefing" },
  { id: "rules", label: "Regeln" },
];

export default function BriefingPage() {
  const [state, setState] = React.useState<BriefingState>(defaultState);
  const [customRules, setCustomRules] = React.useState<CustomRule[]>([]);
  const [tab, setTab] = React.useState<Tab>("conditions");
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted data after mount (avoids SSR hydration mismatch).
  React.useEffect(() => {
    const saved = loadState();
    if (saved) setState(saved);
    setCustomRules(loadCustomRules());
    setHydrated(true);
  }, []);

  // Autosave.
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

  const reset = () => {
    if (
      window.confirm(
        "Neues Rennen starten? Bedingungen und Kurs werden zurückgesetzt (deine eigenen Regeln bleiben).",
      )
    ) {
      setState(defaultState());
      setTab("conditions");
    }
  };

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

      {/* Tab bar */}
      <div className="sticky top-0 z-10 mb-4 bg-background/95 px-5 pb-2 pt-1 backdrop-blur no-print">
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
          <RulesLibrary
            customRules={customRules}
            onChange={setCustomRules}
          />
        ) : null}
      </main>
    </div>
  );
}
