"use client";

import { Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Toggle } from "@/components/ui/Toggle";
import { CloudSyncSection } from "@/components/settings/CloudSyncSection";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDateShort } from "@/lib/format";
import { PROFILE } from "@/lib/exercises";

export default function SettingsPage() {
  const {
    resetAll,
    body,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
    settings,
    setVoiceCues,
    setSuperset,
  } = useTraining();

  const [confirmReset, setConfirmReset] = useState(false);
  const [bw, setBw] = useState("");
  const [waist, setWaist] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addBody = () => {
    if (!bw.trim() && !waist.trim()) return;
    void addBodyMetric({
      date: new Date().toISOString(),
      weightKg: bw.trim() ? Number(bw) : undefined,
      waistCm: waist.trim() ? Number(waist) : undefined,
    });
    setBw("");
    setWaist("");
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ok = await importData(JSON.parse(await file.text()));
      setImportMsg(ok ? "Import erfolgreich." : "Datei nicht erkannt.");
    } catch {
      setImportMsg("Datei konnte nicht gelesen werden.");
    }
  };

  return (
    <div>
      <h2 className="mb-5 text-2xl font-semibold tracking-tight">Einstellungen</h2>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Dein Plan
        </p>
        <div className="space-y-2">
          {PROFILE.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-neutral-500">{k}</span>
              <span className="font-medium text-neutral-200">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          3× pro Woche Ganzkörper, A → B → C rotieren. Gewicht steigt
          autoreguliert über RIR und Tagesform; bei Reizungen schützt die App den
          unteren Rücken automatisch.
        </p>
      </section>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Körperdaten
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={bw}
            onChange={(e) => setBw(e.target.value)}
            placeholder="Gewicht kg"
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2.5 text-center font-mono tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-sessions"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="Bauch cm"
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2.5 text-center font-mono tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-sessions"
          />
        </div>
        <Pressable
          onClick={addBody}
          disabled={!bw.trim() && !waist.trim()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-950 focus:outline-none disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} /> Eintragen
        </Pressable>
        {body.length > 0 && (
          <div className="mt-3 space-y-1">
            {[...body]
              .map((m, i) => ({ m, i }))
              .reverse()
              .map(({ m, i }) => (
                <div
                  key={m.date + i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-950 px-3 py-2"
                >
                  <span className="text-sm text-neutral-300">
                    {fmtDateShort(m.date)}
                    {m.weightKg != null ? ` · ${m.weightKg} kg` : ""}
                    {m.waistCm != null ? ` · ${m.waistCm} cm` : ""}
                  </span>
                  <Pressable
                    onClick={() => deleteBodyMetric(i)}
                    className="shrink-0 rounded p-1 text-neutral-500 focus:outline-none"
                  >
                    <Trash2 size={14} />
                  </Pressable>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Gym-Modus
        </p>
        <div className="space-y-5">
          <Toggle
            checked={!!settings.voiceCues}
            onChange={setVoiceCues}
            label="Sprach-Ansagen"
            hint="Sagt Satzpause-Countdown und neue Rekorde an — freihändig im Gym. Browser muss Sprachausgabe unterstützen."
          />
          <Toggle
            checked={!!settings.superset}
            onChange={setSuperset}
            label="Supersätze"
            hint="Die letzten zwei Übungen im Wechsel — spart Pausenzeit, mehr passt ins Zeitfenster."
          />
        </div>
      </section>

      <CloudSyncSection />

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Als App installieren
        </p>
        <p className="text-xs leading-relaxed text-neutral-500">
          iPhone: in Safari unten auf „Teilen“ tippen → „Zum Home-Bildschirm“.
          Android: im Chrome-Menü „App installieren“. Danach startet Training im
          Vollbild mit eigenem Icon — und läuft auch offline.
        </p>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-400">Daten</p>
        <p className="mb-3 text-xs leading-relaxed text-neutral-500">
          Alle Einheiten werden auf diesem Gerät gespeichert. Sichere sie als
          Datei oder spiele ein Backup zurück.
        </p>
        <div className="mb-4 flex flex-col gap-2">
          <Pressable
            onClick={exportFile}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-800 py-2.5 text-sm font-medium text-neutral-100 focus:outline-none"
          >
            <Download size={16} /> Export (JSON)
          </Pressable>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImport}
            className="hidden"
          />
          <Pressable
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-800 py-2.5 text-sm font-medium text-neutral-100 focus:outline-none"
          >
            <Upload size={16} /> Import (JSON)
          </Pressable>
          {importMsg && <p className="text-xs text-neutral-400">{importMsg}</p>}
        </div>
        {!confirmReset ? (
          <Pressable
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-neutral-400 focus:outline-none"
          >
            <RotateCcw size={15} /> Ganzen Verlauf zurücksetzen
          </Pressable>
        ) : (
          <div className="flex items-center gap-2">
            <Pressable
              onClick={() => {
                void resetAll();
                setConfirmReset(false);
              }}
              className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300 focus:outline-none"
            >
              Wirklich löschen
            </Pressable>
            <Pressable
              onClick={() => setConfirmReset(false)}
              className="rounded-lg px-3 py-2 text-sm text-neutral-400 focus:outline-none"
            >
              Abbrechen
            </Pressable>
          </div>
        )}
      </section>
    </div>
  );
}
