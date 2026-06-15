"use client";

import {
  Check,
  ChevronRight,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDateShort } from "@/lib/format";
import { EQUIP_LIST, PATTERN_LABEL, PROFILE, TEMPLATE } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import type { Exercise, Pattern, Unit } from "@/lib/types";

export default function SettingsPage() {
  const {
    equip,
    toggleEquip,
    custom,
    addCustom,
    removeCustom,
    sessionOf,
    resetAll,
    body,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
  } = useTraining();

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<Pattern>("squat");
  const [unit, setUnit] = useState<Unit>("Wdh");
  const [weighted, setWeighted] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [guideEx, setGuideEx] = useState<Exercise | null>(null);
  const [bw, setBw] = useState("");
  const [waist, setWaist] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!name.trim()) return;
    addCustom({
      name: name.trim(),
      pattern,
      unit,
      weighted: unit === "Sek" ? false : weighted,
    });
    setName("");
  };

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
      <h2 className="mb-5 text-2xl font-semibold tracking-tight">Programm & Info</h2>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-amber-400">
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
          3× pro Woche Ganzkörper, A → B → C rotieren. Das Gewicht steigt
          autoreguliert über dein RIR: leicht (RIR 0–1) → mehr Gewicht, schwer
          (RIR 3+) → eine Stufe zurück. In jeder Einheit rotiert ein
          Rücken-Stabi im Core-Slot.
        </p>
      </section>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-amber-400">Geräte</p>
        <p className="mb-3 text-xs leading-relaxed text-neutral-500">
          Abwählen, was du nicht (mehr) nutzt — die Übungsauswahl passt sich sofort an.
        </p>
        <div className="flex flex-wrap gap-2">
          {EQUIP_LIST.map((e) => {
            const on = equip.includes(e.key);
            return (
              <Pressable
                key={e.key}
                onClick={() => toggleEquip(e.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm focus:outline-none",
                  on
                    ? "bg-amber-400 font-medium text-neutral-950"
                    : "bg-neutral-800 text-neutral-400",
                )}
              >
                {on ? "✓ " : ""}
                {e.label}
              </Pressable>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-2xl bg-neutral-900 p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-amber-400">
          Eigene Übung
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name der Übung"
          className="mb-2 w-full rounded-xl bg-neutral-800 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value as Pattern)}
          className="mb-2 w-full rounded-xl bg-neutral-800 px-3 py-2.5 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {(Object.keys(PATTERN_LABEL) as Pattern[]).map((k) => (
            <option key={k} value={k}>
              {PATTERN_LABEL[k]}
            </option>
          ))}
        </select>
        <div className="mb-3 flex items-center gap-2">
          {(["Wdh", "Sek"] as Unit[]).map((u) => (
            <Pressable
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm focus:outline-none",
                unit === u ? "bg-neutral-700 text-neutral-100" : "bg-neutral-800 text-neutral-500",
              )}
            >
              {u === "Wdh" ? "Wiederholungen" : "Zeit (Timer)"}
            </Pressable>
          ))}
        </div>
        {unit === "Wdh" && (
          <Pressable
            onClick={() => setWeighted((w) => !w)}
            className="mb-3 flex items-center gap-2 rounded px-1 py-1 text-sm text-neutral-300 focus:outline-none"
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded",
                weighted ? "bg-amber-400" : "bg-neutral-700",
              )}
            >
              {weighted && <Check size={13} className="text-neutral-950" strokeWidth={3} />}
            </span>
            mit Gewicht (kg)
          </Pressable>
        )}
        <Pressable
          onClick={submit}
          disabled={!name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-950 focus:outline-none disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} /> Hinzufügen
        </Pressable>
        {custom.length > 0 && (
          <div className="mt-3 space-y-1">
            {custom.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-neutral-950 px-3 py-2"
              >
                <span className="truncate text-sm text-neutral-300">
                  {c.name} <span className="text-neutral-600">· {PATTERN_LABEL[c.pattern]}</span>
                </span>
                <Pressable
                  onClick={() => removeCustom(c.id)}
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
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-amber-400">
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
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2.5 text-center font-mono tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="Bauch cm"
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2.5 text-center font-mono tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
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

      <p className="mb-3 px-1 text-xs text-neutral-500">
        Übung antippen für Animation und Ausführung. Die grüne Linie ist deine
        Wirbelsäule, halte sie gerade.
      </p>

      {TEMPLATE.map((t) => {
        const list = sessionOf(t.key);
        return (
          <section key={t.key} className="mb-4 rounded-2xl bg-neutral-900 p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-mono text-sm text-neutral-500">{t.key}</span>
              <h3 className="font-semibold">{t.name}</h3>
              <span className="text-xs text-neutral-500">· {t.focus}</span>
            </div>
            <div className="space-y-1">
              {list.map(({ ex, slotKey }) => (
                <button
                  key={slotKey}
                  onClick={() => setGuideEx(ex)}
                  className="flex w-full items-baseline justify-between gap-3 py-1.5 text-left transition focus:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-neutral-300">
                    <ChevronRight size={13} className="shrink-0 text-neutral-600" />
                    <span className="truncate">{ex.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-500">
                    {ex.sets}×{ex.repLow}–{ex.repHigh}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl bg-neutral-900 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">Daten</p>
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

      <GuideSheet open={!!guideEx} onClose={() => setGuideEx(null)} ex={guideEx} />
    </div>
  );
}
