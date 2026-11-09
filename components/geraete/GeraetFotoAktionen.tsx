"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import type { GeraetKey } from "@/components/geraete/GeraetZeichnung";
import { useTraining } from "@/components/providers/TrainingProvider";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { geraetName } from "@/lib/geraete";
import { downscaleImage, putPhoto, uploadPhoto } from "@/lib/photo-store";
import { toast } from "@/lib/toast";

/**
 * „Foto vom Gerät“: ein Bild aus der Kamera oder Mediathek (iOS bietet beides
 * an), verkleinert auf 1280 px, lokal gespeichert und bei Cloud-Sync
 * gespiegelt. Ersetzen löscht das alte Foto. Die Fotos liegen NICHT im
 * JSON-Backup.
 */
export function GeraetFotoAktionen({
  geraet,
  kompakt,
}: {
  geraet: GeraetKey;
  /** Nur der runde Kamera-Knopf (Katalog-Gruppenkopf). */
  kompakt?: boolean;
}) {
  const { settings, setGeraetFoto } = useTraining();
  const hatFoto = !!settings.geraetFotos?.[geraet];
  const eingabe = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);
  const name = geraetName(geraet);

  const uebernehme = async (datei: File) => {
    setLaedt(true);
    try {
      const blob = await downscaleImage(datei, 1280, 0.82);
      const id = `geraet_${geraet}_${Date.now()}`;
      await putPhoto(id, blob);
      void uploadPhoto(id, blob);
      setGeraetFoto(geraet, id);
      toast(`Foto für ${name} gespeichert.`, { kind: "success" });
    } catch {
      toast("Das Foto ließ sich nicht speichern. Versuch es noch einmal.", { kind: "error" });
    } finally {
      setLaedt(false);
    }
  };

  const waehle = () => eingabe.current?.click();
  const datei = (
    <input
      ref={eingabe}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) void uebernehme(f);
      }}
    />
  );

  if (kompakt) {
    return (
      <>
        {datei}
        <Pressable
          onClick={waehle}
          disabled={laedt}
          aria-label={hatFoto ? `Foto von ${name} ersetzen` : `Foto von ${name} aufnehmen`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-dick border-rand bg-surface-1 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-40"
        >
          <Camera size={18} strokeWidth={2.5} aria-hidden />
        </Pressable>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {datei}
      <Button
        variant="secondary"
        onClick={waehle}
        disabled={laedt}
        aria-label={hatFoto ? `Foto von ${name} ersetzen` : `Foto von ${name} aufnehmen`}
      >
        <Camera size={16} strokeWidth={2.5} aria-hidden />
        {laedt ? "Speichert …" : hatFoto ? "Foto ersetzen" : "Foto vom Gerät"}
      </Button>
      {hatFoto && (
        <Button variant="ghost" onClick={() => setGeraetFoto(geraet, null)}>
          Foto entfernen
        </Button>
      )}
    </div>
  );
}
