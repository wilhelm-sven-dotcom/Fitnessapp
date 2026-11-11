"use client";

import { useState } from "react";
import { Kicker } from "@/components/ui/Kicker";
import { Segment } from "@/components/ui/Segment";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";
import { type ThemePref } from "@/lib/theme";

/** Darstellung: Name, Hell/Dunkel/Auto (gilt überall, auch im Training),
 *  Figuren animieren, Startbild an/aus. Die App hat EINE Farbtafel. */
const THEMES: { id: ThemePref; label: string }[] = [
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
  { id: "system", label: "Auto" },
];


export function AppearanceSection() {
  const { settings, setTheme, setUserName, setZoetrope, setSplash } = useTraining();
  const theme = settings.theme ?? "light";
  // Ein Startbild im Look „spotter“: alte Werte v1/v2/v3/zufall heißen „an“.
  const splashAn = (settings.splash ?? "v3") !== "aus";
  const [name, setName] = useState(settings.userName ?? "");

  return (
    <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-4">
      <Kicker as="h2" className="mb-4">
        Darstellung
      </Kicker>

      <p className="mb-2 text-sm font-medium text-fg">Dein Name</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setUserName(name)}
        placeholder="z. B. J. Weber"
        aria-label="Dein Name"
        className="min-h-11 w-full rounded-inner border-dick border-rand bg-surface-1 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      />
      <p className="mb-5 mt-1.5 text-sm text-muted">So spricht ATLAS dich an.</p>

      <p className="mb-2 text-sm font-medium text-fg">Modus</p>
      <Segment
        label="Modus"
        options={THEMES.map((t) => ({ value: t.id, label: t.label }))}
        value={theme}
        onChange={setTheme}
      />
      <p className="mt-1.5 text-sm text-muted">
        Gilt für die ganze App, auch im Training. „Auto“ folgt dem iPhone.
      </p>

      <div className="mt-5 border-t border-line-card pt-4">
        <Toggle
          checked={settings.zoetrope !== false}
          onChange={setZoetrope}
          label="Figuren animieren"
          hint="Die Übungsfiguren blättern mit 8 Bildern pro Sekunde durch ihre Bewegung. Aus: stehendes Bild."
        />
      </div>

      <div className="mt-5 border-t border-line-card pt-4">
        <Toggle
          checked={splashAn}
          onChange={(an) => setSplash(an ? "v3" : "aus")}
          label="Startbild"
          hint="Beim Öffnen rasten die vier Scheiben ein, gut eine Sekunde. Aus: die App startet sofort."
        />
      </div>
    </section>
  );
}
