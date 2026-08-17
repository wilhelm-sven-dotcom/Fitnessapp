"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LiftMark } from "@/components/brand/LiftMark";
import { useTraining } from "@/components/providers/TrainingProvider";

export default function StravaCallbackPage() {
  const router = useRouter();
  const { strava } = useTraining();
  const [msg, setMsg] = useState("Verbinde mit Strava…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setMsg(
        error === "access_denied"
          ? "Zugriff abgelehnt — du kannst es jederzeit erneut versuchen."
          : "Kein Code von Strava erhalten.",
      );
      const t = setTimeout(() => router.replace("/settings?seg=verbindungen"), 2000);
      return () => clearTimeout(t);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const r = await strava.connect(code);
      if (r.ok) {
        // Erfolg braucht keine Show — sofort zurück in die Einstellungen.
        router.replace("/settings?seg=verbindungen");
        return;
      }
      setMsg(`Fehler: ${r.error ?? "unbekannt"}`);
      timer = setTimeout(() => router.replace("/settings?seg=verbindungen"), 2000);
    })();
    return () => clearTimeout(timer);
  }, [strava, router]);

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
