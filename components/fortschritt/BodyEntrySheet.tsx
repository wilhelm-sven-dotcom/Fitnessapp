"use client";

import { Camera, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { downscaleImage, genPhotoId, putPhoto, uploadPhoto } from "@/lib/photo-store";
import { toast } from "@/lib/toast";

/**
 * Körperdaten erfassen — lebt bei der Ansicht (Fortschritt → Körper) statt in
 * den Einstellungen. Formular 1:1 vom alten Settings-Block übernommen.
 */
export function BodyEntrySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addBodyMetric } = useTraining();
  const [bw, setBw] = useState("");
  const [waist, setWaist] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const clearPhoto = () => {
    setPhotoUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setPhotoId(null);
  };

  // Objekt-URL beim Unmount freigeben (Foto-Staging überlebt ein Schließen
  // ohne Speichern bewusst — harmlos, nur der Blob-URL-Leak wird verhindert).
  useEffect(
    () => () => {
      setPhotoUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    },
    [],
  );

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const blob = await downscaleImage(file);
      const id = genPhotoId();
      await putPhoto(id, blob);
      void uploadPhoto(id, blob);
      setPhotoUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return URL.createObjectURL(blob);
      });
      setPhotoId(id);
    } finally {
      setPhotoBusy(false);
    }
  };

  const addBody = () => {
    if (!bw.trim() && !waist.trim() && !photoId) return;
    void addBodyMetric({
      date: new Date().toISOString(),
      weightKg: bw.trim() ? Number(bw) : undefined,
      waistCm: waist.trim() ? Number(waist) : undefined,
      photoId: photoId ?? undefined,
    });
    setBw("");
    setWaist("");
    clearPhoto();
    toast("Eintrag gespeichert.", { kind: "success" });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Körperdaten eintragen">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={bw}
          onChange={(e) => setBw(e.target.value)}
          placeholder="Gewicht kg"
          aria-label="Körpergewicht in kg"
          className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
          placeholder="Bauch cm"
          aria-label="Bauchumfang in cm"
          className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        />
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhoto}
        className="hidden"
      />
      {photoUrl ? (
        <div className="mt-2 flex items-center gap-3 rounded-card bg-surface-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Vorschau"
            className="h-14 w-14 rounded-card object-cover"
          />
          <span className="flex-1 text-sm text-muted">Foto angehängt</span>
          <Pressable
            onClick={clearPhoto}
            aria-label="Foto entfernen"
            className="rounded-card p-1.5 text-muted focus:outline-none"
          >
            <X size={16} />
          </Pressable>
        </div>
      ) : (
        <Button
          variant="secondary"
          full
          onClick={() => photoRef.current?.click()}
          disabled={photoBusy}
          className="mt-2"
        >
          <Camera size={16} /> {photoBusy ? "Lädt…" : "Fortschritts-Foto"}
        </Button>
      )}
      <Button
        variant="strong"
        full
        onClick={addBody}
        disabled={!bw.trim() && !waist.trim() && !photoId}
        className="mt-2"
      >
        <Plus size={16} strokeWidth={2.5} /> Eintragen
      </Button>
    </Sheet>
  );
}
