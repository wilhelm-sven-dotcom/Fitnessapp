"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/Toggle";
import {
  useTraining,
  type CustomExerciseInput,
} from "@/components/providers/TrainingProvider";
import { EQUIP_LIST, PATTERN_LABEL } from "@/lib/exercises";
import { MUSCLE_LABEL, MUSCLE_ORDER } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { Exercise, Muscle, Pattern } from "@/lib/types";

const PATTERNS: Pattern[] = [
  "squat", "lunge", "hinge", "hpush", "vpush", "hpull", "vpull", "arm", "lateral", "core", "calf",
];

const inputClass =
  "w-full rounded-card bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 mt-4 font-mono text-xs uppercase tracking-widest text-muted">
      {children}
    </p>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onClick={onClick}
      className={cn(
        "rounded-pill px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
        active ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
      )}
    >
      {children}
    </Pressable>
  );
}

/**
 * Voller Editor für eigene Übungen — erstklassig wie der Katalog: Muster,
 * Muskeln, Equipment, Schema und Coaching-Texte. Fließt über `allLib`
 * automatisch in Pools, Wochenvolumen und ATLAS' Auswahl.
 */
export function CustomExerciseEditor({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  /** Bestehende eigene Übung zum Bearbeiten; null = neu anlegen. */
  initial?: Exercise | null;
}) {
  const { addCustom, updateCustom, removeCustom } = useTraining();

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<Pattern>("hpush");
  const [muscle, setMuscle] = useState<Muscle | undefined>(undefined);
  const [muscle2, setMuscle2] = useState<Muscle | undefined>(undefined);
  const [unit, setUnit] = useState<"Wdh" | "Sek">("Wdh");
  const [weighted, setWeighted] = useState(true);
  const [req, setReq] = useState<string[]>([]);
  const [sets, setSets] = useState(3);
  const [repLow, setRepLow] = useState("8");
  const [repHigh, setRepHigh] = useState("12");
  const [cue, setCue] = useState("");
  const [steps, setSteps] = useState("");
  const [back, setBack] = useState("");
  const [easier, setEasier] = useState("");
  const [backCaution, setBackCaution] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Formular beim Öffnen aus der Übung (Bearbeiten) bzw. den Defaults füllen.
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (initial) {
      setName(initial.name);
      setPattern(initial.pattern === "cardio" ? "core" : initial.pattern);
      setMuscle(initial.muscle);
      setMuscle2(initial.muscleSecondary);
      setUnit(initial.unit === "Sek" ? "Sek" : "Wdh");
      setWeighted(initial.weighted);
      setReq(initial.req.filter((t) => t !== "none"));
      setSets(initial.sets);
      setRepLow(String(initial.repLow));
      setRepHigh(String(initial.repHigh));
      setCue(initial.cue === "Eigene Übung." ? "" : initial.cue);
      setSteps(initial.steps.join("\n"));
      setBack(initial.back);
      setEasier(initial.easier);
      setBackCaution(!!initial.backCaution);
    } else {
      setName("");
      setPattern("hpush");
      setMuscle(undefined);
      setMuscle2(undefined);
      setUnit("Wdh");
      setWeighted(true);
      setReq([]);
      setSets(3);
      setRepLow("8");
      setRepHigh("12");
      setCue("");
      setSteps("");
      setBack("");
      setEasier("");
      setBackCaution(false);
    }
  }, [open, initial]);

  const toggleReq = (k: string) =>
    setReq((r) => (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]));

  const save = () => {
    if (!name.trim()) return;
    const data: CustomExerciseInput = {
      name,
      pattern,
      unit,
      weighted,
      req,
      muscle,
      muscleSecondary: muscle2,
      sets,
      repLow: Number(repLow),
      repHigh: Number(repHigh),
      cue,
      steps: steps.split("\n"),
      back,
      easier,
      backCaution,
    };
    if (initial) updateCustom(initial.id, data);
    else addCustom(data);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "Übung bearbeiten" : "Eigene Übung"}
    >
      <FieldLabel>Name</FieldLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Landmine Press"
        className={inputClass}
      />

      <FieldLabel>Bewegungsmuster</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {PATTERNS.map((p) => (
          <ChipButton key={p} active={pattern === p} onClick={() => setPattern(p)}>
            {PATTERN_LABEL[p]}
          </ChipButton>
        ))}
      </div>

      <FieldLabel>Hauptmuskel</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_ORDER.map((m) => (
          <ChipButton
            key={m}
            active={muscle === m}
            onClick={() => setMuscle((cur) => (cur === m ? undefined : m))}
          >
            {MUSCLE_LABEL[m]}
          </ChipButton>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">
        Ohne Auswahl leitet die App den Muskel aus dem Muster ab.
      </p>

      {muscle && (
        <>
          <FieldLabel>Zweitmuskel (zählt halb)</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_ORDER.filter((m) => m !== muscle).map((m) => (
              <ChipButton
                key={m}
                active={muscle2 === m}
                onClick={() => setMuscle2((cur) => (cur === m ? undefined : m))}
              >
                {MUSCLE_LABEL[m]}
              </ChipButton>
            ))}
          </div>
        </>
      )}

      <FieldLabel>Benötigtes Equipment</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {EQUIP_LIST.filter((e) => e.key !== "bike").map((e) => (
          <ChipButton
            key={e.key}
            active={req.includes(e.key)}
            onClick={() => toggleReq(e.key)}
          >
            {e.label}
          </ChipButton>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">
        Nichts ausgewählt = ohne Geräte machbar.
      </p>

      <FieldLabel>Schema</FieldLabel>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-pill bg-surface-2">
          {(["Wdh", "Sek"] as const).map((u) => (
            <Pressable
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium focus:outline-none",
                unit === u ? "bg-accent-sessions text-on-accent" : "text-muted",
              )}
            >
              {u === "Wdh" ? "Wiederholungen" : "Sekunden"}
            </Pressable>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-xs text-faint">Sätze</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <ChipButton key={n} active={sets === n} onClick={() => setSets(n)}>
            {n}
          </ChipButton>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={repLow}
          onChange={(e) => setRepLow(e.target.value)}
          type="number"
          inputMode="numeric"
          aria-label={unit === "Sek" ? "Sekunden von" : "Wiederholungen von"}
          className={cn(inputClass, "w-20 text-center font-mono tabular-nums")}
        />
        <span className="text-sm text-muted">bis</span>
        <input
          value={repHigh}
          onChange={(e) => setRepHigh(e.target.value)}
          type="number"
          inputMode="numeric"
          aria-label={unit === "Sek" ? "Sekunden bis" : "Wiederholungen bis"}
          className={cn(inputClass, "w-20 text-center font-mono tabular-nums")}
        />
        <span className="text-sm text-muted">{unit === "Sek" ? "Sek" : "Wdh"}</span>
      </div>

      <div className="mt-4 space-y-3">
        <Toggle
          label="Mit Gewicht protokollieren"
          hint="Zeigt im Training ein Gewichtsfeld samt Aufwärmsätzen und Vorschlägen."
          checked={weighted}
          onChange={setWeighted}
        />
        <Toggle
          label="Vorsicht bei gereiztem Rücken"
          hint="Wird bei Rückenschonung automatisch gegen eine sanfte Alternative getauscht."
          checked={backCaution}
          onChange={setBackCaution}
        />
      </div>

      <FieldLabel>Kurz-Cue (eine Zeile)</FieldLabel>
      <input
        value={cue}
        onChange={(e) => setCue(e.target.value)}
        placeholder="Worauf kommt es an?"
        className={inputClass}
      />

      <FieldLabel>Ausführung (ein Schritt pro Zeile)</FieldLabel>
      <textarea
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        rows={3}
        placeholder={"Ausgangsposition…\nBewegung…\nZurück…"}
        className={cn(inputClass, "resize-none")}
      />

      <FieldLabel>Rücken-Hinweis (optional)</FieldLabel>
      <input
        value={back}
        onChange={(e) => setBack(e.target.value)}
        placeholder="Worauf der Rücken achten sollte"
        className={inputClass}
      />

      <FieldLabel>Leichtere Variante (optional)</FieldLabel>
      <input
        value={easier}
        onChange={(e) => setEasier(e.target.value)}
        placeholder="Wie man die Übung vereinfacht"
        className={inputClass}
      />

      <Pressable
        onClick={save}
        disabled={!name.trim()}
        className="mt-5 w-full rounded-card bg-strong py-3.5 text-base font-semibold text-on-strong focus:outline-none disabled:opacity-40"
      >
        {initial ? "Änderungen speichern" : "Übung anlegen"}
      </Pressable>

      {initial && (
        confirmDelete ? (
          <Pressable
            onClick={() => {
              removeCustom(initial.id);
              onClose();
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-card py-2.5 text-sm font-medium text-status-danger focus:outline-none"
          >
            <Trash2 size={14} /> Wirklich löschen?
          </Pressable>
        ) : (
          <Pressable
            onClick={() => setConfirmDelete(true)}
            className="mt-2 w-full rounded-card py-2.5 text-sm text-muted focus:outline-none"
          >
            Übung löschen…
          </Pressable>
        )
      )}
    </Sheet>
  );
}
