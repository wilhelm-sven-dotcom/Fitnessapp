"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Music, Pencil, Trash2, Wrench, X, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { FIG, muscleBones } from "@/components/figures/figureData";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { useTraining } from "@/components/providers/TrainingProvider";
import { useSpotifyResume } from "@/components/spotify/useSpotifyResume";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Exercise } from "@/lib/types";

export function GuideSheet({
  open,
  onClose,
  ex,
}: {
  open: boolean;
  onClose: () => void;
  ex: Exercise | null;
}) {
  const { exerciseVideos, setExerciseVideo, exerciseNotes, setExerciseNote } = useTraining();
  const fig = ex ? FIG[ex.id] : undefined;
  const accent = ex ? muscleBones(ex.pattern) : undefined;

  // Clip resolution, highest priority first: a user-pasted YouTube link (shown
  // as an embed), then the exercise's own `videoUrl` (YouTube → embed, else an
  // mp4), then a drop-in file `/exercise-media/<id>.mp4` (probed per exercise —
  // drop a file in and it appears, no code change).
  const userUrl = ex ? exerciseVideos[ex.id] : undefined;
  const userNote = ex ? exerciseNotes[ex.id] : undefined;
  // Offline, a YouTube iframe renders an empty block — fall back to the figure
  // (the mp4 HEAD probe below already fails silently on its own).
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () =>
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const embedUrl = offline
    ? null
    : (youtubeEmbedUrl(userUrl) ?? youtubeEmbedUrl(ex?.videoUrl));
  const nativeSrc = embedUrl
    ? undefined
    : ex
      ? (ex.videoUrl ?? `/exercise-media/${ex.id}.mp4`)
      : undefined;

  // Nur ein YouTube-Embed kann die iOS-Audio-Session übernehmen; nach dem
  // Schließen Spotify wieder anwerfen (der native <video muted> triggert nichts).
  const { notice: spotifyNotice } = useSpotifyResume(open && !!embedUrl);

  const [hasVideo, setHasVideo] = useState(false);
  const [mode, setMode] = useState<"video" | "figure">("figure");

  // A YouTube embed needs no existence check (and is offline-instant); an mp4 is
  // HEAD-probed so a missing file silently falls back to the figure.
  useEffect(() => {
    if (embedUrl) {
      setHasVideo(true);
      setMode("video");
      return;
    }
    setHasVideo(false);
    setMode("figure");
    if (!nativeSrc) return;
    let on = true;
    fetch(nativeSrc, { method: "HEAD" })
      .then((r) => {
        if (on && r.ok) {
          setHasVideo(true);
          setMode("video");
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [ex?.id, embedUrl, nativeSrc]);

  // Step ↔ pose sync: walk the active step in the figure's rhythm (half period).
  const reduce = useReducedMotion();
  const stepCount = ex?.steps?.length ?? 0;
  const syncing = mode === "figure" && !!fig && !reduce && stepCount >= 2;
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    setActiveStep(0);
    if (!syncing) return;
    const id = setInterval(() => setActiveStep((s) => (s + 1) % stepCount), 1300);
    return () => clearInterval(id);
  }, [ex?.id, syncing, stepCount]);

  // Inline editor for the user's own YouTube demo link.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  // Inline editor for the per-exercise aid note (z. B. „Unterstützungsband").
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setInvalid(false);
    setNoteEditing(false);
    setNoteDraft("");
  }, [ex?.id]);

  const saveLink = () => {
    if (!ex) return;
    const url = draft.trim();
    if (!url || !youtubeEmbedUrl(url)) {
      setInvalid(true);
      return;
    }
    setExerciseVideo(ex.id, url);
    setEditing(false);
    setInvalid(false);
  };

  // Leerer Entwurf löscht die Notiz (setExerciseNote trimmt/entfernt bei leer).
  const saveNote = () => {
    if (!ex) return;
    setExerciseNote(ex.id, noteDraft);
    setNoteEditing(false);
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={ex?.name}>
      {ex && (
        <>
          {hasVideo && (
            <div className="mb-3 flex gap-1 rounded-pill bg-surface-2 p-1">
              {(["video", "figure"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-pill py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
                    mode === m ? "bg-strong text-on-strong" : "text-muted",
                  )}
                >
                  {m === "video" ? "Video" : "Illustration"}
                </button>
              ))}
            </div>
          )}

          {hasVideo && mode === "video" ? (
            embedUrl ? (
              <div className="mb-3 flex justify-center">
                <div
                  className="overflow-hidden rounded-card border border-line bg-base"
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
                className="mb-3 w-full rounded-card border border-line bg-base"
                loop
                muted
                playsInline
                autoPlay
                controls
              />
            )
          ) : fig ? (
            <>
              <div className="mb-3 flex items-end gap-1 rounded-card border border-line bg-base p-3">
                <FigurePanel label="Seitlich" fig={fig} viewKey="side" accentBones={accent} />
                {fig.front ? (
                  <FigurePanel label="Frontal" fig={fig} viewKey="front" accentBones={accent} />
                ) : (
                  <FigurePanel label="Andere Seite" fig={fig} viewKey="side" flip accentBones={accent} />
                )}
              </div>
              {/* Movement broken into 3 frozen positions — studyable, and the full
                  range stays visible even with reduced motion. */}
              <div className="mb-3 rounded-card border border-line bg-base p-3">
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-2">
                  Bewegung · 3 Positionen
                </p>
                <div className="flex items-end gap-2">
                  {[
                    { f: 0, label: "Start" },
                    { f: 0.5, label: "Mitte" },
                    { f: 1, label: "Ende" },
                  ].map((p) => (
                    <FigurePanel
                      key={p.f}
                      label={p.label}
                      fig={fig}
                      viewKey="side"
                      accentBones={accent}
                      freeze={p.f}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="mb-3 rounded-card border border-line bg-base px-3 py-2">
              <p className="font-mono text-xs text-faint">Animation folgt — Schritte unten.</p>
            </div>
          )}

          {/* Eigenes YouTube-Video pro Übung — hinzufügen / ändern / entfernen. */}
          <div className="mb-3">
            {editing ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (invalid) setInvalid(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveLink();
                    }}
                    placeholder="youtube.com/shorts/… einfügen"
                    className={cn(
                      "min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions",
                      invalid && "ring-2 ring-status-danger",
                    )}
                  />
                  <Pressable
                    type="button"
                    onClick={saveLink}
                    disabled={!draft.trim()}
                    className="shrink-0 rounded-card bg-strong px-4 py-2.5 text-sm font-medium text-on-strong disabled:opacity-40"
                  >
                    Speichern
                  </Pressable>
                  <Pressable
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setInvalid(false);
                    }}
                    aria-label="Abbrechen"
                    className="shrink-0 rounded-card bg-surface-2 px-3 py-2.5 text-muted"
                  >
                    <X size={16} />
                  </Pressable>
                </div>
                {invalid && (
                  <p className="mt-1 text-xs text-status-danger">
                    Kein gültiger YouTube-Link. Nutze z. B. youtube.com/shorts/… oder youtu.be/…
                  </p>
                )}
              </>
            ) : userUrl ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Youtube size={14} className="shrink-0 text-accent-ink" />
                <span className="min-w-0 flex-1 truncate">
                  {offline
                    ? "YouTube-Video verknüpft — offline nicht verfügbar"
                    : "YouTube-Video verknüpft"}
                </span>
                <Pressable
                  type="button"
                  onClick={() => {
                    setDraft(userUrl);
                    setInvalid(false);
                    setEditing(true);
                  }}
                  aria-label="Link ändern"
                  className="shrink-0 rounded-full p-1.5 text-muted"
                >
                  <Pencil size={14} />
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => setExerciseVideo(ex.id, null)}
                  aria-label="Link entfernen"
                  className="shrink-0 rounded-full p-1.5 text-muted"
                >
                  <Trash2 size={14} />
                </Pressable>
              </div>
            ) : (
              <Pressable
                type="button"
                onClick={() => {
                  setDraft("");
                  setInvalid(false);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs text-muted"
              >
                <Youtube size={14} /> YouTube-Link hinzufügen
              </Pressable>
            )}
          </div>

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
                  className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
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

          {/* Colour legend + worked area. */}
          {mode === "figure" && fig && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent-sessions" />
                Arbeitsmuskeln{ex.tag ? ` · ${ex.tag}` : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: "#34d399" }} />
                Wirbelsäule neutral
              </span>
            </div>
          )}

          {ex.cue && (
            <p className="mb-3 rounded-card border border-line bg-surface-1 px-3 py-2 text-sm text-fg">
              <span className="font-medium text-accent-ink">Technik: </span>
              {ex.cue}
            </p>
          )}

          {(ex.steps?.length ?? 0) > 0 && (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-faint">
              {(ex.steps ?? []).map((s, i) => (
                <li
                  key={i}
                  className={cn(
                    "text-sm transition-colors",
                    syncing ? (i === activeStep ? "font-medium text-fg" : "text-muted") : "text-fg",
                  )}
                >
                  {s}
                </li>
              ))}
            </ol>
          )}

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
      {/* Dezenter Hinweis, wenn Spotify nicht automatisch fortgesetzt werden kann
          (kein Premium / kein aktives Gerät). GuideSheet bleibt gemountet, also
          überlebt der Toast das Schließen des Sheets. */}
      <AnimatePresence>
        {spotifyNotice === "blocked" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="fixed inset-x-0 z-50 flex justify-center px-5"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="flex items-center gap-2 rounded-card border border-line bg-surface-1 px-3 py-2 text-xs text-muted shadow-card">
              <Music size={14} className="shrink-0 text-accent-ink" />
              <span>Spotify pausiert — Musik in der Spotify-App fortsetzen.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
