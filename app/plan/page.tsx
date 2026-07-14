"use client";

import { Bike, Check, ChevronRight, Copy, Pencil, Plus, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EQUIP_LIST, PATTERN_LABEL, TEMPLATE } from "@/lib/exercises";
import { reqOk } from "@/lib/progression";
import { muscleOf } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { Exercise, Pattern, Unit } from "@/lib/types";

export default function PlanPage() {
  const {
    equip,
    toggleEquip,
    custom,
    addCustom,
    removeCustom,
    sessionOf,
    allLib,
    days,
    addDay,
    removeDay,
    gyms,
    switchGym,
    addGym,
    removeGym,
    settings,
    aiPlan,
    aiPlanActive,
    aiPlanLoading,
    refreshWeekPlan,
  } = useTraining();
  const router = useRouter();

  const [name, setName] = useState("");
  const [newGym, setNewGym] = useState("");
  const equipStats = useMemo(() => {
    const has = (k: string) => (equip as string[]).includes(k);
    const available = allLib.filter((e) => reqOk(e, has));
    const muscles = new Set<string>();
    available.forEach((e) => {
      const m = muscleOf(e);
      muscles.add(m.primary);
      if (m.secondary) muscles.add(m.secondary);
    });
    return { count: available.length, cov: muscles.size };
  }, [equip, allLib]);
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

      {/* ATLAS-KI-Woche: der aktuelle Wochenplan (Claude) — oder der Weg dahin. */}
      {settings.aiPlanning !== false && (
        <Reveal>
          <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
                <Sparkles size={13} className="text-accent-ink" /> ATLAS-Wochenplan
              </p>
              <Pressable
                onClick={() => void refreshWeekPlan()}
                disabled={aiPlanLoading}
                className="rounded-pill bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
              >
                {aiPlanLoading ? "Plant…" : "Neu planen"}
              </Pressable>
            </div>
            {aiPlanActive && aiPlan ? (
              <>
                {aiPlan.weekNote && (
                  <p className="mb-3 text-sm leading-relaxed text-fg">{aiPlan.weekNote}</p>
                )}
                <div className="space-y-1.5">
                  {(["A", "B", "C"] as const).map((k) => {
                    const day = aiPlan.days[k];
                    if (!day) return null;
                    // Greift der KI-Tag wirklich? sessionOf verwirft ihn still,
                    // wenn zu wenige Übungen im aktiven Profil auflösbar sind —
                    // das darf die Karte nicht verschweigen.
                    const applied = sessionOf(k).some((s) =>
                      s.slotKey.startsWith(`${k}:ai`),
                    );
                    return (
                      <p key={k} className="text-xs leading-relaxed text-muted">
                        <span className="font-mono text-accent-ink">{k}</span> ·{" "}
                        {day.focusNote || `${day.slots.length} Übungen`}
                        {!applied && (
                          <span className="text-status-over">
                            {" "}
                            · greift nicht — zu wenige passende Übungen im aktiven
                            Profil, das Regelwerk übernimmt
                          </span>
                        )}
                      </p>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                Noch kein KI-Plan für diese Woche — ATLAS holt ihn automatisch, oder
                tippe „Neu planen“. Ohne Server-Schlüssel plant das bewährte Regelwerk
                (Status in Einstellungen → ATLAS-KI) — offline wie immer.
              </p>
            )}
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            Eigene Tage
          </p>
          {days.length === 0 ? (
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Bau dir eigene Trainingstage — Übungen, Reihenfolge und Schema ganz nach dir.
              Tipp: unten bei A/B/C auf „Anpassen“ tippen und als eigenen Tag speichern.
            </p>
          ) : (
            <div className="mb-3 space-y-2">
              {days.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-1 rounded-card bg-surface-2 px-3 py-2"
                >
                  <button
                    onClick={() => router.push(`/workout/${d.id}`)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                  >
                    <p className="truncate text-sm font-medium text-fg">{d.name}</p>
                    <p className="text-xs text-muted">
                      {d.focus} · {d.items.length} Übungen
                    </p>
                  </button>
                  <Pressable
                    onClick={() => router.push(`/day/${d.id}`)}
                    aria-label="Bearbeiten"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
                  >
                    <Pencil size={14} />
                  </Pressable>
                  <Pressable
                    onClick={() =>
                      addDay({
                        ...d,
                        id: "day_" + Date.now(),
                        name: `${d.name} (Kopie)`,
                        createdAt: new Date().toISOString(),
                      })
                    }
                    aria-label="Duplizieren"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
                  >
                    <Copy size={14} />
                  </Pressable>
                  <Pressable
                    onClick={() => removeDay(d.id)}
                    aria-label="Löschen"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
                  >
                    <Trash2 size={14} />
                  </Pressable>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Pressable
              onClick={() => router.push("/day/neu")}
              className="flex flex-1 items-center justify-center gap-2 rounded-card bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none"
            >
              <Plus size={16} strokeWidth={2.5} /> Eigener Tag
            </Pressable>
            <Pressable
              onClick={() => router.push("/day/neu?coach=1")}
              className="flex flex-1 items-center justify-center gap-2 rounded-card border border-surface-3 bg-surface-1 py-2.5 text-sm font-medium text-accent-2 shadow-card focus:outline-none"
            >
              <Sparkles size={16} strokeWidth={2.5} /> Coach-Tag
            </Pressable>
          </div>
          <Pressable
            onClick={() => router.push("/workout/reset")}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-card border border-surface-3 bg-surface-1 py-2.5 text-sm font-medium text-accent-2 shadow-card focus:outline-none"
          >
            <ShieldCheck size={16} strokeWidth={2.5} /> Rücken-Reset starten — ohne Gewichte
          </Pressable>
          {(equip as string[]).includes("bike") && (
            <Pressable
              onClick={() => router.push("/workout/peloton")}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-card border border-surface-3 bg-surface-1 py-2.5 text-sm font-medium text-accent-2 shadow-card focus:outline-none"
            >
              <Bike size={16} strokeWidth={2.5} /> Peloton-Tag starten
            </Pressable>
          )}
        </section>
      </Reveal>

      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
          Geräte & Profile
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {gyms.map((g) => {
            const active = settings.activeGymId === g.id;
            return (
              // Delete lives as a SIBLING control — a button can't nest a
              // second interactive element (and the old span was mouse-only).
              <div
                key={g.id}
                className={cn(
                  "flex items-center overflow-hidden rounded-full",
                  active ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                )}
              >
                <Pressable
                  onClick={() => switchGym(g.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-sessions"
                >
                  {g.name}
                </Pressable>
                {active && gyms.length > 1 && (
                  <Pressable
                    onClick={() => removeGym(g.id)}
                    aria-label={`Profil ${g.name} löschen`}
                    className="py-1.5 pl-0.5 pr-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-sessions"
                  >
                    <X size={12} />
                  </Pressable>
                )}
              </div>
            );
          })}
        </div>
        <div className="mb-4 flex gap-2">
          <input
            value={newGym}
            onChange={(e) => setNewGym(e.target.value)}
            placeholder="Neues Profil (z. B. Zuhause)"
            aria-label="Neues Gym-Profil anlegen"
            className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
          />
          <Pressable
            onClick={() => {
              if (!newGym.trim()) return;
              addGym(newGym);
              setNewGym("");
            }}
            disabled={!newGym.trim()}
            className="shrink-0 rounded-card bg-surface-2 px-3 py-2 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
          >
            Anlegen
          </Pressable>
        </div>

        <p className="mb-2 text-xs leading-relaxed text-muted">
          Tippe an, was im aktiven Profil verfügbar ist — die Übungsauswahl passt sich
          sofort an.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EQUIP_LIST.map((e) => {
            const on = equip.includes(e.key);
            return (
              <Pressable
                key={e.key}
                onClick={() => toggleEquip(e.key)}
                style={on ? { boxShadow: "0 0 14px -4px var(--accent)" } : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-card px-3 py-3 text-sm focus:outline-none",
                  on
                    ? "bg-accent-sessions font-medium text-on-accent"
                    : "bg-surface-2 text-muted",
                )}
              >
                <span className="min-w-0 truncate">{e.label}</span>
                {on && <Check size={15} strokeWidth={3} className="shrink-0" />}
              </Pressable>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-card bg-base px-3 py-2 text-xs text-muted">
          <span>
            <span className="font-mono tabular-nums text-fg">{equipStats.count}</span>{" "}
            Übungen verfügbar
          </span>
          <span>
            <span className="font-mono tabular-nums text-fg">{equipStats.cov}</span>/9
            Muskelgruppen
          </span>
        </div>
      </section>

      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
          Eigene Übung
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name der Übung"
          aria-label="Name der Übung"
          className="mb-2 w-full rounded-card bg-surface-2 px-3 py-2.5 text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        />
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value as Pattern)}
          className="mb-2 w-full rounded-card bg-surface-2 px-3 py-2.5 text-fg focus:outline-none focus:ring-2 focus:ring-accent-sessions"
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
                "flex-1 rounded-card py-2 text-sm focus:outline-none",
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
          className="flex w-full items-center justify-center gap-2 rounded-card bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} /> Hinzufügen
        </Pressable>
        {custom.length > 0 && (
          <div className="mt-3 space-y-1">
            {custom.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-card bg-base px-3 py-2"
              >
                <span className="truncate text-sm text-muted">
                  {c.name} <span className="text-faint">· {PATTERN_LABEL[c.pattern]}</span>
                </span>
                <Pressable
                  onClick={() => removeCustom(c.id)}
                  aria-label={`Übung ${c.name} löschen`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
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
            <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-sm text-muted">{t.key}</span>
                <h3 className="truncate font-semibold">{t.name}</h3>
                <span className="shrink-0 text-xs text-muted">· {t.focus}</span>
              </div>
              <Pressable
                onClick={() => router.push(`/day/neu?from=${t.key}`)}
                className="shrink-0 rounded-card px-1 py-1 text-xs text-accent-ink focus:outline-none"
              >
                Anpassen
              </Pressable>
            </div>
            <div className="space-y-1">
              {list.map(({ ex, slotKey }) => (
                <button
                  key={slotKey}
                  onClick={() => setGuideEx(ex)}
                  className="log-row flex w-full items-baseline justify-between gap-3 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
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
