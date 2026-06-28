"use client";

import { Bike, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";

export function PelotonSection() {
  const { peloton, cardio } = useTraining();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  const connect = async () => {
    setMsg("");
    const r = await peloton.connect(email, pw);
    setPw("");
    setMsg(r.ok ? "Verbunden — Fahrten werden geladen." : `Fehler: ${r.error ?? "unbekannt"}`);
  };
  const sync = async () => {
    setMsg("");
    const r = await peloton.syncNow();
    setMsg(r.ok ? "Aktualisiert." : `Fehler: ${r.error ?? "unbekannt"}`);
  };

  const rides = cardio.filter((c) => c.source === "peloton").length;

  return (
    <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 p-5 shadow-card">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <Bike size={13} /> Peloton
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-faint">Beta</span>
      </p>

      {peloton.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-fg">
            <Bike size={16} className="shrink-0 text-accent-volume" />
            <span className="min-w-0 truncate">
              Verbunden{peloton.username ? ` als ${peloton.username}` : ""} · {rides} Fahrten
            </span>
          </div>
          <div className="flex gap-2">
            <Pressable
              onClick={() => void sync()}
              disabled={peloton.busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-50"
            >
              <RefreshCw size={15} /> {peloton.busy ? "Synct…" : "Jetzt syncen"}
            </Pressable>
            <Pressable
              onClick={() => peloton.disconnect()}
              aria-label="Peloton trennen"
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
            Verbinde dein Peloton-Konto, damit der Coach deine Fahrten in den Plan
            einbezieht. Inoffizielle Schnittstelle (Beta) — dein Passwort wird nur zum
            Anmelden genutzt und nicht gespeichert.
          </p>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Peloton-E-Mail"
            className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-volume"
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Passwort"
            className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-volume"
          />
          <Pressable
            onClick={() => void connect()}
            disabled={peloton.busy || !email.trim() || !pw}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
          >
            {peloton.busy ? "Verbinde…" : "Verbinden"}
          </Pressable>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </div>
      )}
    </section>
  );
}
