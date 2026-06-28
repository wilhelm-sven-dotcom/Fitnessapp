"use client";

import { Check } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { ACCENTS, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
];

export function AppearanceSection() {
  const { settings, setTheme, setAccent } = useTraining();
  const theme = settings.theme ?? "dark";
  const accent = settings.accentColor ?? "red";

  return (
    <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 p-5 shadow-card">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Darstellung
      </p>

      <p className="mb-2 text-sm font-medium text-fg">Modus</p>
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {THEMES.map((t) => (
          <Pressable
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium focus:outline-none",
              theme === t.id ? "bg-strong text-on-strong" : "text-muted",
            )}
          >
            {t.label}
          </Pressable>
        ))}
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-fg">Akzentfarbe</p>
      <div className="flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <Pressable
            key={a.id}
            onClick={() => setAccent(a.id)}
            aria-label={a.label}
            className="flex h-9 w-9 items-center justify-center rounded-full focus:outline-none"
            style={{
              backgroundColor: a.hex,
              boxShadow: accent === a.id ? `0 0 0 3px var(--card), 0 0 0 5px ${a.hex}` : undefined,
            }}
          >
            {accent === a.id && (
              <Check size={16} strokeWidth={3} style={{ color: "#fff" }} />
            )}
          </Pressable>
        ))}
      </div>
    </section>
  );
}
