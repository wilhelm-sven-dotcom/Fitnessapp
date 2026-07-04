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
export function SpotifyNowPlaying() {
  const { connected, now, controlBlocked, play, pause, next, prev } = useSpotify();
  if (!connected) return null;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-card border border-line bg-panel p-2.5 shadow-card">
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

      <div className="flex shrink-0 items-center gap-0.5">
        <Pressable onClick={prev} aria-label="Vorheriger Titel" className="rounded-full p-2 text-muted">
          <SkipBack size={16} />
        </Pressable>
        {now?.isPlaying ? (
          <Pressable onClick={pause} aria-label="Pause" className="rounded-full p-2 text-fg">
            <Pause size={17} />
          </Pressable>
        ) : (
          <Pressable onClick={play} aria-label="Abspielen" className="rounded-full p-2 text-fg">
            <Play size={17} />
          </Pressable>
        )}
        <Pressable onClick={next} aria-label="Nächster Titel" className="rounded-full p-2 text-muted">
          <SkipForward size={16} />
        </Pressable>
      </div>
    </div>
  );
}
