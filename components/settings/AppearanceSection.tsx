"use client";

import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { SKINS, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
];

export function AppearanceSection() {
  const { settings, setTheme, setSkin, setUserName } = useTraining();
  const theme = settings.theme ?? "dark";
  const skin = settings.skin ?? "blueprint";
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

      <p className="mb-2 text-sm font-medium text-fg">Design</p>
      <div className="grid grid-cols-2 gap-2">
        {SKINS.map((s) => {
          const active = skin === s.id;
          return (
            <Pressable
              key={s.id}
              onClick={() => setSkin(s.id)}
              aria-pressed={active}
              className={cn(
                "rounded-card border p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
                active ? "border-accent-sessions bg-surface-2" : "border-line",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    active ? "bg-accent-sessions" : "bg-faint",
                  )}
                />
                <span className="font-display text-sm font-semibold text-fg">{s.label}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-snug text-muted">{s.hint}</span>
            </Pressable>
          );
        })}
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
