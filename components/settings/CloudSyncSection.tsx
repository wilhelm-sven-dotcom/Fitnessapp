"use client";

import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";

export function CloudSyncSection() {
  const { cloud } = useTraining();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  if (!cloud.configured) {
    return (
      <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          Cloud-Sync
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Noch nicht eingerichtet. Hinterlege{" "}
          <span className="font-mono text-muted">NEXT_PUBLIC_SUPABASE_URL</span>{" "}
          und{" "}
          <span className="font-mono text-muted">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
          (Vercel → Environment Variables), dann kannst du dich per E-Mail
          anmelden und deine Daten über mehrere Geräte synchronisieren. Ohne das
          bleiben alle Daten lokal auf diesem Gerät.
        </p>
      </section>
    );
  }

  const sendLink = async () => {
    setMsg("");
    const res = await cloud.signIn(email);
    setMsg(
      res.ok
        ? "Magic-Link gesendet — schau in deine Mails."
        : res.error
          ? `Fehler: ${res.error}`
          : "Hat nicht geklappt.",
    );
  };

  const confirmCode = async () => {
    setMsg("");
    const res = await cloud.verifyCode(email, code);
    setMsg(
      res.ok
        ? "Angemeldet — Daten werden synchronisiert."
        : res.error
          ? `Fehler: ${res.error}`
          : "Code ungültig.",
    );
  };

  return (
    <section className="mb-4 rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Cloud-Sync
      </p>
      {cloud.email ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-fg">
            <Cloud size={16} className="shrink-0 text-accent-volume" />
            <span className="min-w-0 truncate">
              Eingeloggt als <span className="font-medium">{cloud.email}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Pressable
              onClick={() => void cloud.syncNow()}
              disabled={cloud.busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-50"
            >
              <RefreshCw size={15} /> {cloud.busy ? "Synct…" : "Jetzt synchronisieren"}
            </Pressable>
            <Pressable
              onClick={() => void cloud.signOut()}
              aria-label="Abmelden"
              className="flex items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted focus:outline-none"
            >
              <LogOut size={15} /> Abmelden
            </Pressable>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Melde dich per E-Mail an (kein Passwort). Klick den Link in der Mail —
            oder gib den 6-stelligen Code unten ein, falls der Link in einem anderen
            Browser landet.
          </p>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@mail.de"
            className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-volume"
          />
          <Pressable
            onClick={() => void sendLink()}
            disabled={cloud.busy || !email.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
          >
            {cloud.busy ? "Sendet…" : "Magic-Link senden"}
          </Pressable>
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-stelliger Code"
              className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-center font-mono tabular-nums tracking-widest text-fg placeholder:tracking-normal placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-volume"
            />
            <Pressable
              onClick={() => void confirmCode()}
              disabled={cloud.busy || !email.trim() || code.trim().length < 6}
              className="shrink-0 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
            >
              Anmelden
            </Pressable>
          </div>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </div>
      )}
    </section>
  );
}
