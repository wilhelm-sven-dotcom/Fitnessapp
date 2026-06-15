"use client";

import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";

export function CloudSyncSection() {
  const { cloud } = useTraining();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  if (!cloud.configured) {
    return (
      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Cloud-Sync
        </p>
        <p className="text-xs leading-relaxed text-neutral-500">
          Noch nicht eingerichtet. Hinterlege{" "}
          <span className="font-mono text-neutral-400">NEXT_PUBLIC_SUPABASE_URL</span>{" "}
          und{" "}
          <span className="font-mono text-neutral-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
          (Vercel → Environment Variables), dann kannst du dich per E-Mail
          anmelden und deine Daten über mehrere Geräte synchronisieren. Ohne das
          bleiben alle Daten lokal auf diesem Gerät.
        </p>
      </section>
    );
  }

  const sendLink = async () => {
    setMsg("");
    const ok = await cloud.signIn(email);
    setMsg(
      ok
        ? "Magic-Link gesendet — schau in deine Mails."
        : "Hat nicht geklappt. Prüf die E-Mail-Adresse.",
    );
  };

  return (
    <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
        Cloud-Sync
      </p>
      {cloud.email ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-neutral-200">
            <Cloud size={16} className="shrink-0 text-accent-volume" />
            <span className="min-w-0 truncate">
              Eingeloggt als <span className="font-medium">{cloud.email}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Pressable
              onClick={() => void cloud.syncNow()}
              disabled={cloud.busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 py-2.5 text-sm font-medium text-neutral-100 focus:outline-none disabled:opacity-50"
            >
              <RefreshCw size={15} /> {cloud.busy ? "Synct…" : "Jetzt synchronisieren"}
            </Pressable>
            <Pressable
              onClick={() => void cloud.signOut()}
              aria-label="Abmelden"
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-800 px-3 py-2.5 text-sm text-neutral-400 focus:outline-none"
            >
              <LogOut size={15} /> Abmelden
            </Pressable>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-neutral-500">
            Melde dich per E-Mail an (Magic-Link, kein Passwort). Danach werden
            deine Einheiten automatisch über deine Geräte synchronisiert.
          </p>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@mail.de"
            className="w-full rounded-xl bg-neutral-800 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-volume"
          />
          <Pressable
            onClick={() => void sendLink()}
            disabled={cloud.busy || !email.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-950 focus:outline-none disabled:opacity-40"
          >
            {cloud.busy ? "Sendet…" : "Magic-Link senden"}
          </Pressable>
          {msg && <p className="text-xs text-neutral-400">{msg}</p>}
        </div>
      )}
    </section>
  );
}
