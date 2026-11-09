"use client";

import { LogOut, Music } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kicker } from "@/components/ui/Kicker";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";
import { authorizeUrl, challengeFor, randomVerifier } from "@/lib/spotify";

export function SpotifySection() {
  const { spotify, settings, setDuckSpotify } = useTraining();
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
    <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-5">
      <Kicker as="h2" className="mb-3">
        Spotify
      </Kicker>

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
        <div className="space-y-4">
          <p className="text-sm text-fg">Verbunden — Steuerung im Training aktiv.</p>
          {/* Gehört zu Spotify, nicht zum Gym-Modus: ohne Verbindung gibt es
              nichts abzusenken. */}
          <Toggle
            checked={settings.duckSpotify !== false}
            onChange={setDuckSpotify}
            label="Musik leiser bei Countdown"
            hint="Senkt Spotify in den letzten Sekunden kurz ab und stellt danach zurück — braucht Premium und ein aktives Gerät."
          />
          <Button variant="secondary" onClick={() => void spotify.disconnect()} aria-label="Spotify trennen">
            <LogOut size={16} aria-hidden /> Trennen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Verbinde Spotify, dann steuerst du deine Musik direkt im Training (aktueller Titel,
            Play/Pause/Skip). Steuern braucht Spotify Premium; der aktuelle Titel wird auch ohne
            angezeigt.
          </p>
          <Button variant="strong" full onClick={() => void connect()}>
            <Music size={16} aria-hidden /> Mit Spotify verbinden
          </Button>
        </div>
      )}
    </section>
  );
}
