import { Flame } from "lucide-react";

/**
 * Leise Coach-Ansporn-Zeile im Training (an/aus über settings.coachMotivation).
 * Bewusst dezenter als die taktische ATLAS-Zeile (kein Kasten, kein „ATLAS"-Label)
 * — ein kurzer Motivations-Nudge in Akzentfarbe. Der Text kommt deterministisch
 * aus trainer.motivationLine; hier nur die Darstellung. Nur Text → stört nie die
 * Musik (im Gegensatz zu gesprochenen Ansagen).
 */
export function MotivationLine({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 px-1">
      <Flame size={13} strokeWidth={2.5} className="shrink-0 text-accent-ink" />
      <p className="text-xs font-medium leading-relaxed text-accent-ink">{text}</p>
    </div>
  );
}
