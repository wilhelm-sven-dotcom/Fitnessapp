"use client";

import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";

const inputCls =
  "rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-volume";

export function CloudSyncSection() {
  const { cloud } = useTraining();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  if (!cloud.configured) {
    return (
      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          Cloud-Sync
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Noch nicht eingerichtet. Hinterlege{" "}
          <span className="font-mono text-muted">NEXT_PUBLIC_SUPABASE_URL</span> und{" "}
          <span className="font-mono text-muted">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
          (Vercel → Environment Variables), dann kannst du dich anmelden und deine Daten
          über mehrere Geräte synchronisieren. Ohne das bleiben alle Daten lokal auf
          diesem Gerät.
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
  const loginPw = async () => {
    setMsg("");
    const res = await cloud.signInWithPassword(email, password);
    if (res.ok) setPassword("");
    else setMsg(res.error ? `Fehler: ${res.error}` : "Anmeldung fehlgeschlagen.");
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
  const savePw = async () => {
    setMsg("");
    const res = await cloud.setPassword(newPassword);
    if (res.ok) setNewPassword("");
    setMsg(
      res.ok
        ? "Passwort gesetzt — damit meldest du dich jetzt in der App an."
        : res.error
          ? `Fehler: ${res.error}`
          : "Hat nicht geklappt.",
    );
  };

  return (
    <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Cloud-Sync</p>

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
          <div className="border-t border-surface-3 pt-3">
            <p className="mb-2 text-xs leading-relaxed text-muted">
              Passwort setzen — danach meldest du dich in der installierten App (iPhone)
              direkt damit an, ganz ohne Mail.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 6)"
                className={`min-w-0 flex-1 ${inputCls}`}
              />
              <Pressable
                onClick={() => void savePw()}
                disabled={cloud.busy || newPassword.length < 6}
                className="shrink-0 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
              >
                Setzen
              </Pressable>
            </div>
          </div>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Melde dich an — am besten mit{" "}
            <span className="font-medium text-fg">Passwort</span>. Das funktioniert auch in
            der installierten App auf dem iPhone (der Magic-Link öffnet dort nur Safari).
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@mail.de"
            className={`w-full ${inputCls}`}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className={`w-full ${inputCls}`}
          />
          <Pressable
            onClick={() => void loginPw()}
            disabled={cloud.busy || !email.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
          >
            {cloud.busy ? "Anmelden…" : "Anmelden"}
          </Pressable>

          <p className="pt-2 text-xs leading-relaxed text-muted">
            Noch kein Passwort? Einmalig per Magic-Link oder 6-stelligem Code anmelden —
            dann oben ein Passwort setzen.
          </p>
          <Pressable
            onClick={() => void sendLink()}
            disabled={cloud.busy || !email.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
          >
            {cloud.busy ? "Sendet…" : "Magic-Link senden"}
          </Pressable>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-stelliger Code"
              className={`min-w-0 flex-1 text-center font-mono tabular-nums tracking-widest placeholder:tracking-normal ${inputCls}`}
            />
            <Pressable
              onClick={() => void confirmCode()}
              disabled={cloud.busy || !email.trim() || code.trim().length < 6}
              className="shrink-0 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-40"
            >
              Code einlösen
            </Pressable>
          </div>
          {msg && <p className="text-xs text-muted">{msg}</p>}
        </div>
      )}
    </section>
  );
}
