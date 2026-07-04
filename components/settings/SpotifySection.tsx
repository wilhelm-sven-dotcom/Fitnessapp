"use client";

import { LogOut, Music } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { authorizeUrl, challengeFor, randomVerifier } from "@/lib/spotify";

export function SpotifySection() {
  const { spotify } = useTraining();
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const configured = spotify.configured;
  const connected = configured && !!spotify.auth;

  const connect = async () => {
    if (!clientId) return;
    const verifier = randomVerifier();
    const challenge = await challengeFor(verifier);
    const state = randomVerifier().slice(0, 16);
    try {
      sessionStorage.setItem("spotify-verifier", verifier);
      sessionStorage.setItem("spotify-state", state);
    } catch {
      /* storage unavailable — the callback will reject gracefully */
    }
    window.location.href = authorizeUrl(
      clientId,
      window.location.origin + "/spotify/callback",
      challenge,
      state,
    );
  };

  return (
    <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 p-5 shadow-card">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <Music size={13} /> Spotify
      </p>

      {!configured ? (
        <p className="text-xs leading-relaxed text-muted">
          Noch nicht eingerichtet. Lege eine Spotify-App an (developer.spotify.com), trage
          als Redirect-URI <span className="font-mono">{"<deine-domain>/spotify/callback"}</span>{" "}
          ein und hinterlege{" "}
          <span className="font-mono">NEXT_PUBLIC_SPOTIFY_CLIENT_ID</span> (Vercel → Environment
          Variables). Danach kannst du Spotify verbinden — Titel und Steuerung erscheinen im
          Training. Ein Server-Secret ist nicht nötig (PKCE).
        </p>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-fg">
            <Music size={16} className="shrink-0 text-accent-volume" />
            <span className="min-w-0 truncate">Verbunden — Steuerung im Training aktiv.</span>
          </div>
          <Pressable
            onClick={() => void spotify.disconnect()}
            aria-label="Spotify trennen"
            className="flex items-center justify-center gap-2 rounded-card bg-surface-2 px-3 py-2.5 text-sm text-muted focus:outline-none"
          >
            <LogOut size={15} /> Trennen
          </Pressable>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Verbinde Spotify, dann steuerst du deine Musik direkt im Training (aktueller Titel,
            Play/Pause/Skip). Steuern braucht Spotify Premium; der aktuelle Titel wird auch ohne
            angezeigt.
          </p>
          <Pressable
            onClick={() => void connect()}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none"
          >
            <Music size={16} /> Mit Spotify verbinden
          </Pressable>
        </div>
      )}
    </section>
  );
}
