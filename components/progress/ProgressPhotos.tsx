"use client";

import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchPhoto } from "@/lib/photo-store";
import { fmtDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BodyMetric } from "@/lib/types";

function PhotoImg({ id, className }: { id: string; className?: string }) {
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

function Figure({ id, label }: { id: string; label: string }) {
  return (
    <div>
      <PhotoImg id={id} className="h-48 w-full rounded-card" />
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

export function ProgressPhotos({ body }: { body: BodyMetric[] }) {
  const photos = body.filter((b) => b.photoId);
  if (!photos.length) return null;
  const first = photos[0];
  const last = photos[photos.length - 1];
  const tag = (m: BodyMetric) =>
    `${fmtDateShort(m.date)}${m.weightKg != null ? ` · ${m.weightKg} kg` : ""}`;

  return (
    <Card className="mb-3">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Fortschritts-Fotos
      </p>

      {photos.length > 1 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Figure id={first.photoId as string} label={`Start · ${tag(first)}`} />
          <Figure id={last.photoId as string} label={`Jetzt · ${tag(last)}`} />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {[...photos].reverse().map((p) => (
          <div key={p.photoId} className="shrink-0">
            <PhotoImg id={p.photoId as string} className="h-20 w-20 rounded-card" />
            <p className="mt-1 text-center text-xs text-muted">
              {fmtDateShort(p.date)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
