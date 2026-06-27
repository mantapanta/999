"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_RULES, TAG_LABEL } from "@/lib/briefing/rules";
import { defaultState, newId } from "@/lib/briefing/storage";
import type {
  CustomRule,
  Facts,
  RuleCategory,
  RuleTag,
} from "@/lib/briefing/types";

const CATEGORIES: RuleCategory[] = [
  "Start",
  "Wind",
  "Strom",
  "Layline",
  "Speed",
  "Position",
];

const ALL_TAGS = Object.keys(TAG_LABEL) as RuleTag[];

const NEUTRAL_FACTS: Facts = {
  windKnAvg: 10,
  windStrength: "medium",
  trend: "steady",
  shift: "oscillating",
  favoredSide: "unknown",
  lineBiasEnd: "even",
  lineBiasDeg: 0,
  currentKn: 0,
  currentStrength: "none",
  currentAlong: "none",
  currentCross: "none",
};

export function RulesLibrary({
  customRules,
  onChange,
}: {
  customRules: CustomRule[];
  onChange: (next: CustomRule[]) => void;
}) {
  const neutralConditions = defaultState().conditions;
  const [title, setTitle] = React.useState("");
  const [action, setAction] = React.useState("");
  const [category, setCategory] = React.useState<RuleCategory>("Wind");
  const [weight, setWeight] = React.useState(6);
  const [tags, setTags] = React.useState<RuleTag[]>([]);

  const toggleTag = (t: RuleTag) =>
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const add = () => {
    if (!title.trim() || !action.trim()) return;
    const rule: CustomRule = {
      id: newId(),
      title: title.trim(),
      action: action.trim(),
      category,
      weight,
      tags,
    };
    onChange([rule, ...customRules]);
    setTitle("");
    setAction("");
    setTags([]);
    setWeight(6);
  };

  const remove = (id: string) =>
    onChange(customRules.filter((r) => r.id !== id));

  return (
    <div className="space-y-6 px-5">
      {/* Add custom rule */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">Eigene Regel hinzufügen</h2>
        <div className="space-y-3">
          <Input
            value={title}
            placeholder="Kurz-Titel, z. B. „Böen aus den Bäumen links“"
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            value={action}
            rows={2}
            placeholder="Was ist zu tun? Eine klare Anweisung."
            onChange={(e) => setAction(e.target.value)}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Kategorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RuleCategory)}
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Wichtigkeit: {weight}
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value, 10))}
                className="mt-4 w-full accent-[#1e3a5f]"
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">
              Wann greift die Regel?
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    tags.includes(t)
                      ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                      : "border-input bg-background text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={tags.includes(t)}
                >
                  {TAG_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Mehrere Bedingungen = alle müssen zutreffen. Nichts gewählt =
              „immer berücksichtigen“ (geringe Priorität).
            </p>
          </div>

          <Button
            type="button"
            onClick={add}
            disabled={!title.trim() || !action.trim()}
            className="w-full"
          >
            <Plus className="h-5 w-5" /> Regel speichern
          </Button>
        </div>
      </section>

      {/* Custom rules list */}
      {customRules.length > 0 ? (
        <section>
          <h2 className="mb-2 text-base font-semibold">
            Meine Regeln ({customRules.length})
          </h2>
          <ul className="space-y-2">
            {customRules.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      {r.category} · {r.weight}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.action}
                  </p>
                  {r.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                        >
                          {TAG_LABEL[t]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Regel löschen"
                  onClick={() => remove(r.id)}
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Built-in reference */}
      <section>
        <h2 className="mb-2 text-base font-semibold">
          Standard-Regeln ({DEFAULT_RULES.length})
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Diese sind eingebaut und werden je nach Bedingungen automatisch
          ausgewählt.
        </p>
        <ul className="space-y-2">
          {DEFAULT_RULES.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {r.title(NEUTRAL_FACTS, neutralConditions)}
                </span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                  {r.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.action(NEUTRAL_FACTS, neutralConditions)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
