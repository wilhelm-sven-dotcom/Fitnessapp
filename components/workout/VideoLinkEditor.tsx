"use client";

import { Pencil, Trash2, X, Youtube } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * Eigenes YouTube-Video verknüpfen — hinzufügen / ändern / entfernen. Geteilt
 * zwischen Übungs-Guide und Aufwärm-Drills. `prominent` rendert die Einladung
 * als Karte (wenn noch kein Video die Ausführung zeigt), sonst eine leise
 * Verwaltungszeile. Der Parent setzt `key` auf die Übungs-/Drill-Id, damit
 * Entwürfe beim Wechsel zurückgesetzt werden.
 */
export function VideoLinkEditor({
  url,
  offline,
  prominent = false,
  onChange,
}: {
  url?: string;
  offline: boolean;
  prominent?: boolean;
  onChange: (url: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const save = () => {
    const next = draft.trim();
    if (!next || !youtubeEmbedUrl(next)) {
      setInvalid(true);
      return;
    }
    onChange(next);
    setEditing(false);
    setInvalid(false);
  };

  const startEdit = (initial: string) => {
    setDraft(initial);
    setInvalid(false);
    setEditing(true);
  };

  const input = (
    <>
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="youtube.com/shorts/… einfügen"
          className={cn(
            "min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
            invalid && "ring-2 ring-status-danger",
          )}
        />
        <Pressable
          type="button"
          onClick={save}
          disabled={!draft.trim()}
          className="shrink-0 rounded-card bg-strong px-4 py-2.5 text-sm font-medium text-on-strong disabled:opacity-40"
        >
          Speichern
        </Pressable>
        <Pressable
          type="button"
          onClick={() => {
            setEditing(false);
            setInvalid(false);
          }}
          aria-label="Abbrechen"
          className="shrink-0 rounded-card bg-surface-2 px-3 py-2.5 text-muted"
        >
          <X size={16} />
        </Pressable>
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-status-danger">
          Kein gültiger YouTube-Link. Nutze z. B. youtube.com/shorts/… oder youtu.be/…
        </p>
      )}
    </>
  );

  if (url) {
    // Leise Verwaltungszeile: Video ist verknüpft.
    return editing ? (
      <div>{input}</div>
    ) : (
      <div className="flex items-center gap-2 text-xs text-muted">
        <Youtube size={14} className="shrink-0 text-accent-ink" />
        <span className="min-w-0 flex-1 truncate">
          {offline
            ? "YouTube-Video verknüpft — offline nicht verfügbar"
            : "YouTube-Video verknüpft"}
        </span>
        <Pressable
          type="button"
          onClick={() => startEdit(url)}
          aria-label="Link ändern"
          className="shrink-0 rounded-full p-1.5 text-muted"
        >
          <Pencil size={14} />
        </Pressable>
        <Pressable
          type="button"
          onClick={() => onChange(null)}
          aria-label="Link entfernen"
          className="shrink-0 rounded-full p-1.5 text-muted"
        >
          <Trash2 size={14} />
        </Pressable>
      </div>
    );
  }

  if (prominent) {
    // Einladungs-Karte: hier fehlt noch das Bild zur Ausführung.
    return (
      <div className="rounded-card border border-line bg-surface-0 p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
          Video-Anleitung
        </p>
        <p className="mt-1 text-sm text-muted">
          Verknüpfe ein YouTube-Video — z. B. ein Short mit sauberer Ausführung.
          Es öffnet sich direkt hier im Guide.
        </p>
        <div className="mt-3">
          {editing ? (
            input
          ) : (
            <Pressable
              type="button"
              onClick={() => startEdit("")}
              className="flex w-full items-center justify-center gap-1.5 rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              <Youtube size={15} /> YouTube-Link hinzufügen
            </Pressable>
          )}
        </div>
      </div>
    );
  }

  // Kleiner Einstieg (z. B. Katalog-Video vorhanden, eigener Link als Override).
  return editing ? (
    <div>{input}</div>
  ) : (
    <Pressable
      type="button"
      onClick={() => startEdit("")}
      className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs text-muted"
    >
      <Youtube size={14} /> YouTube-Link hinzufügen
    </Pressable>
  );
}
