"use client";

import { useEffect } from "react";
import { SessionRunner } from "@/components/session/SessionRunner";
import { useTraining } from "@/components/providers/TrainingProvider";
import { applyTheme, setThemeLock } from "@/lib/theme";

/** /workout — das laufende Training. Die ganze Logik lebt im SessionRunner;
 *  ohne startbare Einheit leitet er zurück auf die Startseite.
 *  Der Fokus-Modus läuft IMMER im Atelier (dunkel): Lock setzen, beim
 *  Verlassen die gespeicherte Präferenz restaurieren. Den Kaltstart deckt
 *  das Pre-Paint-Skript in layout.tsx ab (kein Hell-Blitz). */
export default function WorkoutPage() {
  const { settings } = useTraining();
  useEffect(() => {
    setThemeLock("dark");
    applyTheme(settings.theme);
    return () => {
      setThemeLock(null);
      applyTheme(settings.theme);
    };
  }, [settings.theme]);
  return <SessionRunner />;
}
