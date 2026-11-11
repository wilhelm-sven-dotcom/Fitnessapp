"use client";

import { Music, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { useSpotify } from "./useSpotify";

/**
 * Compact Spotify now-playing bar for the workout screen: current track + cover
 * and play/pause/skip. Renders nothing unless Spotify is connected, so it is
 * completely inert until the user links their account (and stays out of the way
 * for everyone else). Controls need Premium — a free account still sees the
 * track and gets a gentle hint instead of controls silently failing.
 */
/** Tippfläche 44 × 44 px, das Symbol bleibt klein. */
const KNOPF = "flex h-11 w-11 items-center justify-center rounded-pill";

export function SpotifyNowPlaying() {
  const { connected, now, controlBlocked, play, pause, next, prev } = useSpotify();
  if (!connected) return null;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-card border-dick border-rand bg-surface-1 p-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-surface-2 bg-cover bg-center text-accent-ink"
        style={now?.artUrl ? { backgroundImage: `url(${now.artUrl})` } : undefined}
      >
        {!now?.artUrl && <Music size={16} />}
      </span>

      <div className="min-w-0 flex-1">
        {now ? (
          <>
            <p className="truncate text-sm font-medium text-fg">{now.title}</p>
            <p className="truncate text-xs text-muted">{now.artist}</p>
          </>
        ) : (
          <p className="text-xs text-muted">
            {controlBlocked
              ? "Steuerung braucht Spotify Premium."
              : "Spotify verbunden — gerade läuft nichts."}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <Pressable onClick={prev} aria-label="Vorheriger Titel" className={KNOPF + " text-muted"}>
          <SkipBack size={16} />
        </Pressable>
        {now?.isPlaying ? (
          <Pressable onClick={pause} aria-label="Pause" className={KNOPF + " text-fg"}>
            <Pause size={17} />
          </Pressable>
        ) : (
          <Pressable onClick={play} aria-label="Abspielen" className={KNOPF + " text-fg"}>
            <Play size={17} />
          </Pressable>
        )}
        <Pressable onClick={next} aria-label="Nächster Titel" className={KNOPF + " text-muted"}>
          <SkipForward size={16} />
        </Pressable>
      </div>
    </div>
  );
}
