import { bewegungMiniUrl } from "@/lib/bewegung";
import { cn } from "@/lib/utils";

/**
 * Vorschaubild einer Übung für Listen (Heute, Katalog): Phase 3 des
 * Bewegungsbilds als kleine quadratische Kachel mit Rand. Reiner Schmuck, der
 * Name steht daneben. Ohne Bild rendert nichts, dann zeigt der Aufrufer die
 * Phasenfigur.
 */
export function BewegungsMini({ id, className }: { id: string; className?: string }) {
  const url = bewegungMiniUrl(id);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statische Datei aus public/, vom Service Worker vorgeladen
    <img
      src={url}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      width={132}
      height={132}
      className={cn(
        "h-11 w-11 shrink-0 rounded-kachel border-dick border-rand bg-surface-1 object-cover",
        className,
      )}
    />
  );
}
