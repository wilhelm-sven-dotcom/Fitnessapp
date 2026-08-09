"use client";

import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { PALETTE, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
];

export function AppearanceSection() {
  const { settings, setTheme, setAccentOverride, setUserName } = useTraining();
  const theme = settings.theme ?? "dark";
  const accentOverride = settings.accentOverride;
  const [name, setName] = useState(settings.userName ?? "");

  return (
    <section className="mb-4 rounded-card border border-line bg-panel p-5 shadow-card">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Darstellung
      </p>

      <p className="mb-2 text-sm font-medium text-fg">Name</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setUserName(name)}
        placeholder="Wie sollen wir dich begrüßen?"
        className="w-full rounded-pill bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      />
      <p className="mb-5 mt-1.5 text-xs text-muted">
        Für die persönliche Begrüßung auf der Startseite.
      </p>

      <p className="mb-2 text-sm font-medium text-fg">Akzent</p>
      <div className="flex flex-wrap items-center gap-3">
        <Pressable
          onClick={() => setAccentOverride(undefined)}
          aria-label="Standard-Akzent (Bernstein)"
          className="flex h-9 items-center rounded-pill border border-line px-3 text-xs font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          style={{ boxShadow: !accentOverride ? "0 0 0 2px var(--accent)" : undefined }}
        >
          Standard
        </Pressable>
        {PALETTE.map((hex) => (
          <Pressable
            key={hex}
            onClick={() => setAccentOverride(hex)}
            aria-label={`Akzent ${hex}`}
            className="h-9 w-9 rounded-full focus:outline-none"
            style={{
              backgroundColor: hex,
              boxShadow: accentOverride === hex ? `0 0 0 3px var(--card), 0 0 0 5px ${hex}` : undefined,
            }}
          />
        ))}
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-fg">Modus</p>
      <div className="flex gap-1 rounded-pill bg-surface-2 p-1">
        {THEMES.map((t) => (
          <Pressable
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex-1 rounded-pill py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
              theme === t.id ? "bg-strong text-on-strong" : "text-muted",
            )}
          >
            {t.label}
          </Pressable>
        ))}
      </div>
    </section>
  );
}
