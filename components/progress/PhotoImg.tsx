"use client";

import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPhoto } from "@/lib/photo-store";
import { cn } from "@/lib/utils";

/**
 * Löst eine photoId (IndexedDB, bei Login Cloud-Spiegel) in ein Bild auf —
 * ObjectURL wird im Cleanup wieder freigegeben. Kamera-Platzhalter, solange
 * der Blob lädt oder fehlt. Einzige Foto-Anzeige-Komponente der App.
 */
export function PhotoImg({ id, className }: { id: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let obj: string | null = null;
    void fetchPhoto(id).then((blob) => {
      if (!active || !blob) return;
      obj = URL.createObjectURL(blob);
      setUrl(obj);
    });
    return () => {
      active = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [id]);

  if (!url) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2", className)}>
        <Camera size={18} className="text-faint" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Fortschrittsfoto" className={cn("object-cover", className)} />
  );
}
