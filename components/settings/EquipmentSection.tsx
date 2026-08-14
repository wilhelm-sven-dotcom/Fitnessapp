"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EQUIP_LIST, STUDIO_EQUIP } from "@/lib/exercises";
import { reqOk } from "@/lib/progression";
import { muscleOf, MUSCLE_ORDER } from "@/lib/volume";
import { cn } from "@/lib/utils";

/**
 * Geräte & Gym-Profile — früher auf der Plan-Seite, jetzt in den
 * Einstellungen: es ist Setup, kein Tagesgeschäft. ATLAS komponiert nur aus
 * Übungen, die das aktive Profil hergibt.
 */
export function EquipmentSection() {
  const { equip, toggleEquip, allLib, gyms, switchGym, addGym, removeGym, settings } =
    useTraining();
  const [newGym, setNewGym] = useState("");

  const equipStats = useMemo(() => {
    const has = (k: string) => (equip as string[]).includes(k);
    const available = allLib.filter((e) => e.pattern !== "cardio" && reqOk(e, has));
    const muscles = new Set<string>();
    available.forEach((e) => {
      const m = muscleOf(e);
      muscles.add(m.primary);
      if (m.secondary) muscles.add(m.secondary);
    });
    return { count: available.length, cov: muscles.size };
  }, [equip, allLib]);

  return (
    <section className="mb-4 rounded-card border border-line bg-surface-1 p-5 shadow-card">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Geräte & Profile
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {gyms.map((g) => {
          const active = settings.activeGymId === g.id;
          return (
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
          placeholder="Neues Profil (z. B. Studio)"
          aria-label="Neues Gym-Profil anlegen"
          className="min-w-0 flex-1 rounded-pill bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        />
        <Pressable
          onClick={() => {
            if (!newGym.trim()) return;
            addGym(newGym);
            setNewGym("");
          }}
          disabled={!newGym.trim()}
          className="shrink-0 rounded-pill bg-surface-2 px-3 py-2 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
        >
          Anlegen
        </Pressable>
      </div>
      {!gyms.some((g) => g.name.toLowerCase().includes("studio")) && (
        <Pressable
          onClick={() => addGym("Studio", STUDIO_EQUIP)}
          className="mb-4 flex items-center gap-1 text-xs font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          + Studio-Profil anlegen — voll ausgestattet inkl. Kabelzug & Geräten
        </Pressable>
      )}

      <p className="mb-2 text-xs leading-relaxed text-muted">
        Tippe an, was im aktiven Profil verfügbar ist — ATLAS und die
        Übungsauswahl passen sich sofort an.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {EQUIP_LIST.map((e) => {
          const on = equip.includes(e.key);
          return (
            <Pressable
              key={e.key}
              onClick={() => toggleEquip(e.key)}
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

      <div className="mt-3 flex items-center justify-between rounded-card bg-surface-0 px-3 py-2 text-xs text-muted">
        <span>
          <span className="font-mono tabular-nums text-fg">{equipStats.count}</span>{" "}
          Übungen verfügbar
        </span>
        <span>
          <span className="font-mono tabular-nums text-fg">{equipStats.cov}</span>/
          {MUSCLE_ORDER.length} Muskelgruppen
        </span>
      </div>
    </section>
  );
}
