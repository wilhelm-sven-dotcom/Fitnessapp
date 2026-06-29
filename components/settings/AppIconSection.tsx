"use client";

import { RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { DEFAULT_ICON, ICON_BG_PRESETS, drawIcon, loadIconImage } from "@/lib/app-icon";
import { downscaleImage, genPhotoId, putPhoto } from "@/lib/photo-store";
import type { IconConfig, IconGlyph } from "@/lib/types";
import { cn } from "@/lib/utils";

const GLYPHS: { id: IconGlyph; label: string }[] = [
  { id: "chevron", label: "Chevron" },
  { id: "dumbbell", label: "Hantel" },
  { id: "letter", label: "Buchstabe" },
];

export function AppIconSection() {
  const { settings, setIcon } = useTraining();
  const cfg = settings.icon ?? DEFAULT_ICON;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);

  // Decode the uploaded image for the preview when kind = image.
  useEffect(() => {
    let on = true;
    if (cfg.kind === "image") {
      void loadIconImage(cfg).then((i) => {
        if (on) setImg(i);
      });
    } else {
      setImg(null);
    }
    return () => {
      on = false;
    };
  }, [cfg.kind, cfg.imageId]);

  // Redraw the live preview on any change.
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) drawIcon(ctx, c.width, cfg, img);
  }, [cfg, img]);

  const update = (patch: Partial<IconConfig>) => setIcon({ ...cfg, ...patch });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await downscaleImage(file, 512);
      const id = genPhotoId();
      await putPhoto(id, blob);
      setIcon({ ...cfg, kind: "image", imageId: id });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-card border border-line bg-panel p-5 shadow-card">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">App-Icon</p>

      <div className="flex items-center gap-4">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="h-20 w-20 shrink-0 rounded-card border border-line"
          aria-label="Icon-Vorschau"
        />
        <p className="text-xs leading-relaxed text-muted">
          Gestalte dein Homescreen-Icon. Ein bereits installiertes Icon wird erst nach
          erneutem „Zum Home-Bildschirm“ aktualisiert.
        </p>
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-fg">Motiv</p>
      <div className="flex gap-1 rounded-pill bg-surface-2 p-1">
        {GLYPHS.map((g) => {
          const active = cfg.kind === "preset" && cfg.glyph === g.id;
          return (
            <Pressable
              key={g.id}
              onClick={() => update({ kind: "preset", glyph: g.id })}
              className={cn(
                "flex-1 rounded-pill py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
                active ? "bg-strong text-on-strong" : "text-muted",
              )}
            >
              {g.label}
            </Pressable>
          );
        })}
      </div>

      {cfg.kind === "preset" && cfg.glyph === "letter" && (
        <input
          type="text"
          maxLength={2}
          value={cfg.letter ?? ""}
          onChange={(e) => update({ letter: e.target.value })}
          placeholder="z. B. S"
          className="mt-2 w-full rounded-pill bg-surface-2 px-3 py-2.5 text-center text-sm uppercase text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        />
      )}

      {cfg.kind === "preset" && (
        <>
          <p className="mb-2 mt-5 text-sm font-medium text-fg">Hintergrund</p>
          <div className="flex flex-wrap gap-3">
            {ICON_BG_PRESETS.map((hex) => (
              <Pressable
                key={hex}
                onClick={() => update({ bg: hex })}
                aria-label={`Hintergrund ${hex}`}
                className="h-9 w-9 rounded-full focus:outline-none"
                style={{
                  backgroundColor: hex,
                  boxShadow: cfg.bg === hex ? `0 0 0 3px var(--card), 0 0 0 5px ${hex}` : undefined,
                }}
              />
            ))}
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      <Pressable
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-pill bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
      >
        <Upload size={16} /> {busy ? "Lädt…" : cfg.kind === "image" ? "Anderes Bild" : "Eigenes Bild hochladen"}
      </Pressable>

      {settings.icon && (
        <Pressable
          onClick={() => setIcon(undefined)}
          className="mt-2 flex items-center gap-2 rounded-md px-1 py-1 text-sm text-muted focus:outline-none"
        >
          <RotateCcw size={15} /> Auf Standard zurücksetzen
        </Pressable>
      )}
    </section>
  );
}
