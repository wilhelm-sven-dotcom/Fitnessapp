"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LiftMark } from "@/components/brand/LiftMark";
import { useTraining } from "@/components/providers/TrainingProvider";
import { exchangeCode } from "@/lib/spotify";

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const { spotify } = useTraining();
  const [msg, setMsg] = useState("Verbinde mit Spotify…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const state = params.get("state");
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

    let savedState = "";
    let verifier = "";
    try {
      savedState = sessionStorage.getItem("spotify-state") || "";
      verifier = sessionStorage.getItem("spotify-verifier") || "";
    } catch {
      /* storage unavailable */
    }

    const invalid =
      !!error ||
      !code ||
      !clientId ||
      !verifier ||
      (!!state && !!savedState && state !== savedState);

    if (invalid) {
      setMsg(
        error === "access_denied"
          ? "Zugriff abgelehnt — du kannst es jederzeit erneut versuchen."
          : "Kein gültiger Code von Spotify.",
      );
      const t = setTimeout(() => router.replace("/settings?seg=verbindungen"), 2000);
      return () => clearTimeout(t);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const auth = await exchangeCode(
        clientId as string,
        code as string,
        verifier,
        window.location.origin + "/spotify/callback",
      );
      try {
        sessionStorage.removeItem("spotify-verifier");
        sessionStorage.removeItem("spotify-state");
      } catch {
        /* ignore */
      }
      if (auth) {
        await spotify.connect(auth);
        // Erfolg braucht keine Show — sofort zurück in die Einstellungen.
        router.replace("/settings?seg=verbindungen");
        return;
      }
      setMsg("Verbindung fehlgeschlagen — bitte erneut versuchen.");
      timer = setTimeout(() => router.replace("/settings?seg=verbindungen"), 2000);
    })();
    return () => clearTimeout(timer);
  }, [spotify, router]);

  // Nüchterner Wartezustand des Labors: Marke in Tinte, Meldung darunter —
  // kein Verlauf, keine Rotation (Verbotsliste Platte 311).
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-24 w-24 items-center justify-center text-fg">
        <LiftMark size={56} />
      </div>
      <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">{msg}</p>
    </div>
  );
}
