"use client";

import { useEffect, useState } from "react";
import { GeraetZeichnung, type GeraetKey } from "@/components/geraete/GeraetZeichnung";
import { useTraining } from "@/components/providers/TrainingProvider";
import { geraetName } from "@/lib/geraete";
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
 * Bild eines Geräts: das eigene Foto aus dem Studio, sonst die Zeichnung im
 * spotter-Stil. Füllt seine Box; Abdeckung für Text darüber setzt der
 * Aufrufer (`bg-bild-scrim`).
 */
export function GeraetBild({
  geraet,
  variante = "hell",
  className,
  dekorativ,
}: {
  geraet: GeraetKey;
  /** Variante der Zeichnung (das Foto bleibt ein Foto). */
  variante?: "hell" | "auf-blau";
  className?: string;
  /** Nur Hintergrund — Screenreader überspringen das Bild. */
  dekorativ?: boolean;
}) {
  const foto = useGeraetFoto(geraet);
  const name = geraetName(geraet);
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={dekorativ ? "" : `Foto: ${name}`}
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
