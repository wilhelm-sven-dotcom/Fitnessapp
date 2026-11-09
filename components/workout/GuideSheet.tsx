"use client";

import { Pencil, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MyologieFigur } from "@/components/phasen/MyologieFigur";
import { GeraetBild } from "@/components/geraete/GeraetBild";
import { GeraetFotoAktionen } from "@/components/geraete/GeraetFotoAktionen";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { useTraining } from "@/components/providers/TrainingProvider";
import { PATTERN_LABEL } from "@/lib/exercises";
import type { MyologieStufe } from "@/lib/heat";
import { geraetVon } from "@/lib/geraete";
import { figurFor } from "@/lib/phasen/figuren";
import { MUSCLE_LABEL, muscleOf } from "@/lib/volume";
import { GuideVerlauf } from "@/components/workout/GuideVerlauf";
import { VideoLinkEditor } from "@/components/workout/VideoLinkEditor";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { Sheet } from "@/components/ui/sheet";
import { useOffline } from "@/lib/use-offline";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Exercise, Muscle } from "@/lib/types";

type Reiter = "anleitung" | "verlauf";

/**
 * Das Übungsdetail: oben Figur (Zoetrop) und Muskelkarte, darunter zwei
 * Reiter. „Anleitung“: DEIN Video zeigt die Ausführung, ohne Video tragen
 * die Schritt-Texte plus die Einladung, ein YouTube-Video zu verknüpfen.
 * „Verlauf“: Bestwert, letzte Sätze, Kurve (GuideVerlauf).
 */
export function GuideSheet({
  open,
  onClose,
  ex,
  startTab = "anleitung",
}: {
  open: boolean;
  onClose: () => void;
  ex: Exercise | null;
  /** Aus dem Fortschritt kommend: direkt den Verlauf zeigen. */
  startTab?: Reiter;
}) {
  const { exerciseVideos, setExerciseVideo, exerciseNotes, setExerciseNote, settings } =
    useTraining();
  const [tab, setTab] = useState<Reiter>(startTab);
  useEffect(() => {
    if (open) setTab(startTab);
  }, [open, startTab, ex?.id]);
  // Muskelkarte: Hauptmuskel volle Stufe, Nebenmuskel halbe.
  const stufen = useMemo(() => {
    const m = new Map<Muscle, MyologieStufe>();
    if (!ex) return m;
    const { primary, secondary } = muscleOf(ex);
    m.set(primary, 4);
    if (secondary && secondary !== primary) m.set(secondary, 2);
    return m;
  }, [ex]);

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

  const geraet = geraetVon(ex);

  return (
    <Sheet open={open} onClose={onClose} title={ex?.name}>
      {ex && (
        <>
          {/* Übung an einem Gerät: das Gerät groß oben — eigenes Foto aus dem
              Studio, sonst die Zeichnung. */}
          {geraet && (
            <div className="mb-4 space-y-2.5">
              <div className="h-44 overflow-hidden rounded-card border-dick border-rand bg-surface-1">
                <GeraetBild geraet={geraet} className="h-full w-full" />
              </div>
              <GeraetFotoAktionen geraet={geraet} />
            </div>
          )}
          <div className="mb-3 flex items-center gap-3">
            <div className="w-20 shrink-0" aria-hidden>
              <PhasenFigur
                figur={figurFor(ex)}
                mode="zoetrop"
                color="var(--fg)"
                zoetropOn={settings.zoetrope !== false}
              />
            </div>
            <div className="flex shrink-0 gap-1" aria-hidden>
              <div className="w-10">
                <MyologieFigur seite="vorn" stufen={stufen} />
              </div>
              <div className="w-10">
                <MyologieFigur seite="hinten" stufen={stufen} />
              </div>
            </div>
            <p className="min-w-0 text-sm leading-snug text-muted">
              <span className="font-semibold text-fg">{MUSCLE_LABEL[muscleOf(ex).primary]}</span>
              {muscleOf(ex).secondary && muscleOf(ex).secondary !== muscleOf(ex).primary
                ? ` · ${MUSCLE_LABEL[muscleOf(ex).secondary!]}`
                : ""}
              <br />
              {PATTERN_LABEL[ex.pattern]}
            </p>
          </div>
          <Segment
            label="Ansicht"
            options={[
              { value: "anleitung", label: "Anleitung" },
              { value: "verlauf", label: "Verlauf" },
            ]}
            value={tab}
            onChange={(v) => setTab(v as Reiter)}
            className="mb-4"
          />
          {tab === "verlauf" && <GuideVerlauf ex={ex} />}
          {tab === "anleitung" && (
          <>
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
              <p className="text-3xs font-bold text-muted">
                Technik
              </p>
              <p className="mt-1 text-base leading-relaxed text-fg">{ex.cue}</p>
            </div>
          )}

          {(ex.steps?.length ?? 0) > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-3xs font-bold text-muted">
                Ausführung
              </p>
              <ol className="space-y-1.5">
                {(ex.steps ?? []).map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-fg">
                    <span className="w-4 shrink-0 text-sm font-bold tabular-nums text-fg">
                      {i + 1}
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
                  className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
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
                  className="shrink-0 rounded-pill p-1.5 text-muted"
                >
                  <Pencil size={14} />
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => setExerciseNote(ex.id, null)}
                  aria-label="Hilfsmittel entfernen"
                  className="shrink-0 rounded-pill p-1.5 text-muted"
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
            <div className="mb-2 rounded-inner border border-line px-3 py-2.5">
              <p className="mb-1 text-3xs font-bold text-warnung">
                Rücken
              </p>
              <p className="text-sm text-fg">{ex.back}</p>
            </div>
          )}

          {ex.easier && (
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg">Wenn&apos;s zwickt:</span> {ex.easier}
            </p>
          )}
          </>
          )}
        </>
      )}
    </Sheet>
  );
}
