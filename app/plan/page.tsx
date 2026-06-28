"use client";

import { Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EQUIP_LIST, PATTERN_LABEL, TEMPLATE } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import type { Exercise, Pattern, Unit } from "@/lib/types";

export default function PlanPage() {
  const { equip, toggleEquip, custom, addCustom, removeCustom, sessionOf } =
    useTraining();

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<Pattern>("squat");
  const [unit, setUnit] = useState<Unit>("Wdh");
  const [weighted, setWeighted] = useState(true);
  const [guideEx, setGuideEx] = useState<Exercise | null>(null);

  const submit = () => {
    if (!name.trim()) return;
    addCustom({
      name: name.trim(),
      pattern,
      unit,
      weighted: unit === "Sek" ? false : weighted,
    });
    setName("");
  };

  return (
    <div>
      <PageHeader eyebrow="Dein Setup" title="Plan" />

      <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Geräte</p>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Abwählen, was du nicht (mehr) nutzt — die Übungsauswahl passt sich sofort an.
        </p>
        <div className="flex flex-wrap gap-2">
          {EQUIP_LIST.map((e) => {
            const on = equip.includes(e.key);
            return (
              <Pressable
                key={e.key}
                onClick={() => toggleEquip(e.key)}
                style={on ? { boxShadow: "0 0 12px -3px var(--accent)" } : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm focus:outline-none",
                  on
                    ? "bg-accent-sessions font-medium text-on-strong"
                    : "bg-surface-2 text-muted",
                )}
              >
                {on ? "✓ " : ""}
                {e.label}
              </Pressable>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
          Eigene Übung
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name der Übung"
          className="mb-2 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        />
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value as Pattern)}
          className="mb-2 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-fg focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        >
          {(Object.keys(PATTERN_LABEL) as Pattern[]).map((k) => (
            <option key={k} value={k}>
              {PATTERN_LABEL[k]}
            </option>
          ))}
        </select>
        <div className="mb-3 flex items-center gap-2">
          {(["Wdh", "Sek"] as Unit[]).map((u) => (
            <Pressable
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm focus:outline-none",
                unit === u ? "bg-surface-2 text-fg" : "bg-surface-2 text-muted",
              )}
            >
              {u === "Wdh" ? "Wiederholungen" : "Zeit (Timer)"}
            </Pressable>
          ))}
        </div>
        {unit === "Wdh" && (
          <Pressable
            onClick={() => setWeighted((w) => !w)}
            className="mb-3 flex items-center gap-2 rounded px-1 py-1 text-sm text-muted focus:outline-none"
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded",
                weighted ? "bg-accent-sessions" : "bg-surface-2",
              )}
            >
              {weighted && <Check size={13} className="text-on-strong" strokeWidth={3} />}
            </span>
            mit Gewicht (kg)
          </Pressable>
        )}
        <Pressable
          onClick={submit}
          disabled={!name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} /> Hinzufügen
        </Pressable>
        {custom.length > 0 && (
          <div className="mt-3 space-y-1">
            {custom.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-base px-3 py-2"
              >
                <span className="truncate text-sm text-muted">
                  {c.name} <span className="text-faint">· {PATTERN_LABEL[c.pattern]}</span>
                </span>
                <Pressable
                  onClick={() => removeCustom(c.id)}
                  className="shrink-0 rounded p-1 text-muted focus:outline-none"
                >
                  <Trash2 size={14} />
                </Pressable>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mb-3 px-1 text-xs text-muted">
        Übung antippen für Animation und Ausführung. Die grüne Linie ist deine
        Wirbelsäule, halte sie gerade.
      </p>

      {TEMPLATE.map((t, ti) => {
        const list = sessionOf(t.key);
        return (
          <Reveal key={t.key} delay={0.08 + ti * 0.05}>
            <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-mono text-sm text-muted">{t.key}</span>
              <h3 className="font-semibold">{t.name}</h3>
              <span className="text-xs text-muted">· {t.focus}</span>
            </div>
            <div className="space-y-1">
              {list.map(({ ex, slotKey }) => (
                <button
                  key={slotKey}
                  onClick={() => setGuideEx(ex)}
                  className="flex w-full items-baseline justify-between gap-3 py-1.5 text-left transition focus:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
                    <ChevronRight size={13} className="shrink-0 text-faint" />
                    <span className="truncate">{ex.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                    {ex.sets}×{ex.repLow}–{ex.repHigh}
                  </span>
                </button>
              ))}
            </div>
            </section>
          </Reveal>
        );
      })}

      <GuideSheet open={!!guideEx} onClose={() => setGuideEx(null)} ex={guideEx} />
    </div>
  );
}
