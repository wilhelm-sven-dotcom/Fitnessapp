import { cn } from "@/lib/utils";

/**
 * ATLAS-Antworten als Studienprotokoll (Chat.dc): Zeilen mit den Feld-Labels
 * BEOBACHTUNG/HYPOTHESE/VERSUCHSANORDNUNG/ANPASSUNG/HINWEIS werden zu
 * Cyanotypie-Schildern mit Buchsatz-Absatz; eine Versuchsanordnung mit
 * Zahlenwerk (×, kg, Pause) steht als fette Mono-Zeile. Labelloser Text
 * bleibt ein normaler Absatz — das Protokoll ist robust gegen freie Prosa.
 */

const LABEL_RE =
  /^\s*(Beobachtung|Einschätzung|Plan|Anpassung|Hinweis)\s*:\s*(.*)$/i;
const ANORDNUNG_RE = /(×|\d\s*kg|pause)/i;

interface Block {
  label: string | null;
  text: string;
}

function parseBloecke(text: string): Block[] {
  return text
    .split(/\n+/)
    .map((zeile): Block => {
      const m = zeile.match(LABEL_RE);
      return m
        ? { label: m[1].toUpperCase(), text: m[2] }
        : { label: null, text: zeile.trim() };
    })
    .filter((b) => b.label != null || b.text !== "");
}

export function ProtokollBubble({ text, busy }: { text: string; busy?: boolean }) {
  const bloecke = parseBloecke(text);
  return (
    <div className="mr-4 rounded-card border border-line-card bg-surface-1 px-3.5 py-3">
      {bloecke.length === 0 && (
        <p className="font-display text-base leading-relaxed text-faint">
          {busy ? "…" : ""}
        </p>
      )}
      {bloecke.map((b, i) => (
        <div key={i} className={cn(i > 0 && "mt-2.5")}>
          {b.label && (
            <p className="font-mono text-3xs font-semibold uppercase tracking-gesperrt text-cyanotypie">
              {b.label}
            </p>
          )}
          <p
            className={cn(
              b.label === "PLAN" && ANORDNUNG_RE.test(b.text)
                ? "font-mono text-sm font-bold tabular-nums text-fg"
                : "font-display text-base leading-relaxed text-fg",
              b.label && "mt-0.5",
            )}
          >
            {b.text}
          </p>
        </div>
      ))}
    </div>
  );
}
