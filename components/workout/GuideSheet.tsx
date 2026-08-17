"use client";

import { Pencil, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtKatalogNr, katalogNummern } from "@/lib/platte";
import { MUSCLE_LABEL, muscleOf } from "@/lib/volume";
import { VideoLinkEditor } from "@/components/workout/VideoLinkEditor";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { useOffline } from "@/lib/use-offline";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Exercise } from "@/lib/types";

/**
 * Der Übungs-Guide: DEIN Video zeigt die Ausführung (die ungenauen
 * Strichfiguren sind bewusst raus). Ohne Video tragen die Schritt-Texte,
 * plus eine klare Einladung, ein YouTube-Video zu verknüpfen.
 */
export function GuideSheet({
  open,
  onClose,
  ex,
}: {
  open: boolean;
  onClose: () => void;
  ex: Exercise | null;
}) {
  const { allLib, exerciseVideos, setExerciseVideo, exerciseNotes, setExerciseNote } =
    useTraining();
  const katalogNr = ex ? katalogNummern(allLib).get(ex.id) : undefined;

  // Clip resolution, highest priority first: a user-pasted YouTube link (shown
  // as an embed), then the exercise's own `videoUrl` (YouTube → embed, else an
  // mp4), then a drop-in file `/exercise-media/<id>.mp4` (probed per exercise —
  // drop a file in and it appears, no code change).
  const userUrl = ex ? exerciseVideos[ex.id] : undefined;
  const userNote = ex ? exerciseNotes[ex.id] : undefined;
  // Offline rendert ein YouTube-iframe nur einen leeren Block → Steps-first.
  const offline = useOffline();
  const embedUrl = offline
    ? null
    : (youtubeEmbedUrl(userUrl) ?? youtubeEmbedUrl(ex?.videoUrl));
  const nativeSrc = embedUrl
    ? undefined
    : ex
      ? (ex.videoUrl ?? `/exercise-media/${ex.id}.mp4`)
      : undefined;

  // BEWUSST kein Spotify-Auto-Resume nach dem YouTube-Guide mehr: ob die
  // Musik weiterläuft, entscheidet der Nutzer (Play im Now-Playing-Widget).

  const [hasVideo, setHasVideo] = useState(false);

  // A YouTube embed needs no existence check (and is offline-instant); an mp4 is
  // HEAD-probed so a missing file silently keeps the steps-first layout.
  useEffect(() => {
    if (embedUrl) {
      setHasVideo(true);
      return;
    }
    setHasVideo(false);
    if (!nativeSrc) return;
    let on = true;
    fetch(nativeSrc, { method: "HEAD" })
      .then((r) => {
        if (on && r.ok) setHasVideo(true);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [ex?.id, embedUrl, nativeSrc]);

  // Inline editor for the per-exercise aid note (z. B. „Unterstützungsband").
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => {
    setNoteEditing(false);
    setNoteDraft("");
  }, [ex?.id]);

  // Leerer Entwurf löscht die Notiz (setExerciseNote trimmt/entfernt bei leer).
  const saveNote = () => {
    if (!ex) return;
    setExerciseNote(ex.id, noteDraft);
    setNoteEditing(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title={ex?.name}>
      {ex && (
        <>
          <p className="mb-3 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
            Guide · {fmtKatalogNr(katalogNr)} · {MUSCLE_LABEL[muscleOf(ex).primary]}
          </p>
          {/* Media-Slot: das Video IST die Ausführungs-Anleitung. */}
          {hasVideo &&
            (embedUrl ? (
              <div className="mb-3 flex justify-center">
                <div
                  className="overflow-hidden rounded-card border border-line-card bg-surface-0"
                  style={{ height: "min(60vh, 480px)", aspectRatio: "9 / 16" }}
                >
                  <iframe
                    src={embedUrl}
                    title={`YouTube-Video: ${ex.name}`}
                    className="h-full w-full"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <video
                src={nativeSrc}
                className="mb-3 w-full rounded-card border border-line-card bg-surface-0"
                loop
                muted
                playsInline
                autoPlay
                controls
              />
            ))}

          {/* Leise Verwaltungszeile, sobald ein Video da ist (eigener Link
              verwalten bzw. Katalog-Video mit eigenem Link überstimmen). */}
          {(hasVideo || userUrl) && (
            <div className="mb-3">
              <VideoLinkEditor
                key={ex.id}
                url={userUrl}
                offline={offline}
                onChange={(u) => setExerciseVideo(ex.id, u)}
              />
            </div>
          )}

          {ex.cue && (
            <div className="mb-3">
              <p className="font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                Technik
              </p>
              <p className="mt-1 font-display text-base leading-relaxed text-fg">{ex.cue}</p>
            </div>
          )}

          {(ex.steps?.length ?? 0) > 0 ? (
            <div className="mb-3">
              <p className="mb-1 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                Versuchsablauf
              </p>
              <ol className="space-y-1.5">
                {(ex.steps ?? []).map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-fg">
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-cyanotypie">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            !hasVideo && (
              <p className="mb-3 text-sm text-muted">
                Noch keine Anleitung hinterlegt — ein verknüpftes Video zeigt die
                Ausführung.
              </p>
            )
          )}

          {/* Einladung: ohne Video ist der eigene Link DER Weg zur Ausführung. */}
          {!hasVideo && !userUrl && (
            <div className="mb-3">
              <VideoLinkEditor
                key={ex.id}
                offline={offline}
                prominent
                onChange={(u) => setExerciseVideo(ex.id, u)}
              />
            </div>
          )}

          {/* Hilfsmittel-/Ausführungs-Notiz pro Übung — der Coach berücksichtigt sie. */}
          <div className="mb-3">
            {noteEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  autoFocus
                  maxLength={120}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNote();
                  }}
                  placeholder="z. B. Unterstützungsband, Gurte, 20-kg-Band"
                  className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                />
                <Pressable
                  type="button"
                  onClick={saveNote}
                  className="shrink-0 rounded-card bg-strong px-4 py-2.5 text-sm font-medium text-on-strong"
                >
                  Speichern
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => setNoteEditing(false)}
                  aria-label="Abbrechen"
                  className="shrink-0 rounded-card bg-surface-2 px-3 py-2.5 text-muted"
                >
                  <X size={16} />
                </Pressable>
              </div>
            ) : userNote ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Wrench size={14} className="shrink-0 text-accent-ink" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-fg">Hilfsmittel:</span> {userNote}
                </span>
                <Pressable
                  type="button"
                  onClick={() => {
                    setNoteDraft(userNote);
                    setNoteEditing(true);
                  }}
                  aria-label="Hilfsmittel ändern"
                  className="shrink-0 rounded-full p-1.5 text-muted"
                >
                  <Pencil size={14} />
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => setExerciseNote(ex.id, null)}
                  aria-label="Hilfsmittel entfernen"
                  className="shrink-0 rounded-full p-1.5 text-muted"
                >
                  <Trash2 size={14} />
                </Pressable>
              </div>
            ) : (
              <Pressable
                type="button"
                onClick={() => {
                  setNoteDraft("");
                  setNoteEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs text-muted"
              >
                <Wrench size={14} /> Hilfsmittel notieren
              </Pressable>
            )}
          </div>

          {ex.back && (
            <div className="mb-2 rounded-card border-l-2 border-status-over bg-surface-2 px-3 py-2">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-status-over">
                Rücken
              </p>
              <p className="text-sm text-fg">{ex.back}</p>
            </div>
          )}

          {ex.easier && (
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">Wenn&apos;s zwickt:</span> {ex.easier}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
