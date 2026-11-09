"use client";

import { useEffect, useState } from "react";
import { GeraetZeichnung, type GeraetKey } from "@/components/geraete/GeraetZeichnung";
import { useTraining } from "@/components/providers/TrainingProvider";
import { geraetBildUrl, geraetName } from "@/lib/geraete";
import { fetchPhoto } from "@/lib/photo-store";
import { cn } from "@/lib/utils";

/**
 * Das eigene Foto eines Geräts als Object-URL (IndexedDB, bei Cloud-Sync aus
 * dem Speicher geholt); null, solange keins da ist oder es lädt. Die URL wird
 * beim Wechsel und im Cleanup freigegeben.
 */
export function useGeraetFoto(geraet: GeraetKey | null): string | null {
  const { settings } = useTraining();
  const id = geraet ? settings.geraetFotos?.[geraet] : undefined;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let aktiv = true;
    let obj: string | null = null;
    setUrl(null);
    if (!id) return;
    void fetchPhoto(id).then((blob) => {
      if (!aktiv || !blob) return;
      obj = URL.createObjectURL(blob);
      setUrl(obj);
    });
    return () => {
      aktiv = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [id]);
  return url;
}

/**
 * Bild eines Geräts, in dieser Reihenfolge: das eigene Foto aus dem Studio,
 * das mitgelieferte Bild (`public/geraete/`, 3:2), sonst die Zeichnung im
 * spotter-Stil. Füllt seine Box (ohne Beschnitt im Format `aspect-bild`);
 * Abdeckung für Text darüber setzt der Aufrufer (`bg-bild-scrim`).
 */
export function GeraetBild({
  geraet,
  variante = "hell",
  className,
  dekorativ,
  klein,
}: {
  geraet: GeraetKey;
  /** Variante der Zeichnung (Foto und Bild bleiben, wie sie sind). */
  variante?: "hell" | "auf-blau";
  className?: string;
  /** Nur Hintergrund — Screenreader überspringen das Bild. */
  dekorativ?: boolean;
  /** Kleine Datei des mitgelieferten Bilds (Listen, Gruppenköpfe). */
  klein?: boolean;
}) {
  const foto = useGeraetFoto(geraet);
  const bild = foto ?? geraetBildUrl(geraet, klein);
  const name = geraetName(geraet);
  if (bild) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bild}
        alt={dekorativ ? "" : `${foto ? "Foto" : "Bild"}: ${name}`}
        decoding="async"
        loading={klein ? "lazy" : undefined}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <GeraetZeichnung
      geraet={geraet}
      variante={variante}
      className={className}
      titel={dekorativ ? undefined : `Zeichnung: ${name}`}
    />
  );
}
