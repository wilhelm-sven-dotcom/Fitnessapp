"use client";

import { Activity, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { buildAuthorizeUrl } from "@/lib/strava";

export function StravaSection() {
  const { strava, cardio } = useTraining();
  const [msg, setMsg] = useState("");

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const configured = !!clientId;
  const rides = cardio.filter((c) => c.source === "strava").length;

  const connect = () => {
    if (!clientId) return;
    window.location.href = buildAuthorizeUrl(
      clientId,
      window.location.origin + "/strava/callback",
    );
  };

  const sync = async () => {
    setMsg("");
    const r = await strava.syncNow();
    setMsg(r.ok ? "Aktualisiert." : `Fehler: ${r.error ?? "unbekannt"}`);
  };

  return (
    <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 p-5 shadow-card">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <Activity size={13} /> Strava
      </p>

      {!configured ? (
        <p className="text-xs leading-relaxed text-muted">
          Noch nicht eingerichtet. Hinterlege{" "}
          <span className="font-mono text-muted">NEXT_PUBLIC_STRAVA_CLIENT_ID</span> und{" "}
          <span className="font-mono text-muted">STRAVA_CLIENT_SECRET</span> (Vercel →
          Environment Variables) und lege eine Strava-API-App an. Dann kannst du dein
          Konto verbinden — Peloton-Fahrten landen über „Connect to Strava“ automatisch
          hier und der Coach plant sie ein.
        </p>
      ) : strava.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-fg">
            <Activity size={16} className="shrink-0 text-accent-volume" />
            <span className="min-w-0 truncate">
              Verbunden{strava.athlete ? ` als ${strava.athlete}` : ""} · {rides} Einheiten
            </span>
          </div>
          <div className="flex gap-2">
            <Pressable
              onClick={() => void sync()}
              disabled={strava.busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-50"
            >
              <RefreshCw size={15} /> {strava.busy ? "Synct…" : "Jetzt syncen"}
            </Pressable>
            <Pressable
              onClick={() => strava.disconnect()}
              aria-label="Strava trennen"
              className="flex items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted focus:outline-none"
            >
              <LogOut size={15} /> Trennen
            </Pressable>
          </div>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Verbinde dein Strava-Konto, damit der Coach deine Fahrten in den Plan einbezieht.
            Aktiviere im Peloton-Konto „Connect to Strava“, dann kommen deine Bike-Einheiten
            automatisch an.
          </p>
          <Pressable
            onClick={connect}
            disabled={strava.busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
          >
            <Activity size={16} /> {strava.busy ? "Verbinde…" : "Mit Strava verbinden"}
          </Pressable>
        </div>
      )}
    </section>
  );
}
