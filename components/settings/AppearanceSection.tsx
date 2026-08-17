"use client";

import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Darstellung „Platte 311": Name fürs Protokoll + Modus-Segment.
 *  Archiv = Albumin-Hell (Grundzustand), Atelier = Kollodium-Dunkel,
 *  Auto folgt dem System. Der Fokus-Modus läuft unabhängig davon IMMER im
 *  Atelier (Theme-Lock). Akzent-Override und Icon-Designer sind mit dem
 *  Design entfallen — das Labor hat EINE Farbtafel. */
const THEMES: { id: ThemePref; label: string }[] = [
  { id: "light", label: "Archiv" },
  { id: "dark", label: "Atelier" },
  { id: "system", label: "Auto" },
];

export function AppearanceSection() {
  const { settings, setTheme, setUserName } = useTraining();
  const theme = settings.theme ?? "light";
  const [name, setName] = useState(settings.userName ?? "");

  return (
    <section className="mb-4 rounded-card border border-line bg-surface-1 p-5">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Darstellung
      </p>

      <p className="mb-2 text-sm font-medium text-fg">Name des Athleten</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setUserName(name)}
        placeholder="z. B. J. Weber"
        className="w-full rounded-pill border border-line bg-surface-1 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
      />
      <p className="mb-5 mt-1.5 text-xs text-muted">
        Für die Anrede im Protokoll und auf der Startseite.
      </p>

      <p className="mb-2 text-sm font-medium text-fg">Modus</p>
      <div className="flex gap-1 rounded-pill border border-line bg-surface-1 p-1">
        {THEMES.map((t) => (
          <Pressable
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-pressed={theme === t.id}
            className={cn(
              "flex-1 rounded-pill py-2 font-mono text-3xs uppercase tracking-gesperrt focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
              theme === t.id ? "bg-strong text-on-strong" : "text-muted",
            )}
          >
            {t.label}
          </Pressable>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Der Fokus-Modus (laufende Studie) arbeitet immer im Atelier.
      </p>
    </section>
  );
}
