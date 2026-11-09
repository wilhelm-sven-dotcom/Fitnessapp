"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Kicker } from "@/components/ui/Kicker";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { Toggle } from "@/components/ui/Toggle";
import { EQUIP_LIST, MASCHINEN, MASCHINEN_KEYS } from "@/lib/exercises";
import { hasFuer } from "@/lib/orte";
import { availableExercises } from "@/lib/today-session";
import { muscleOf, MUSCLE_ORDER } from "@/lib/volume";

/**
 * Orte & Geräte — Setup, kein Tagesgeschäft. Das Register wählt nur, WELCHEN
 * Ort du hier bearbeitest; wo du heute trainierst, entscheidet die Heute-Seite
 * („Wo trainierst du heute?“). ATLAS komponiert nur aus Übungen, die der Ort
 * hergibt — ändern sich die Geräte des heutigen Orts, stellt Heute die noch
 * unberührte Einheit neu zusammen.
 */
export function EquipmentSection() {
  const {
    gyms,
    activeGym,
    toggleEquip,
    setOrtGeraete,
    setNurGeraete,
    addGym,
    renameGym,
    removeGym,
    allLib,
    disabledExercises,
  } = useTraining();
  const [editId, setEditId] = useState<string | null>(null);
  const [neuerOrt, setNeuerOrt] = useState("");
  const [loeschen, setLoeschen] = useState(false);
  const ort = gyms.find((g) => g.id === editId) ?? activeGym ?? gyms[0] ?? null;

  const stats = useMemo(() => {
    if (!ort) return { count: 0, cov: 0 };
    const has = hasFuer(ort);
    const available = availableExercises(allLib, has, disabledExercises);
    const muscles = new Set<string>();
    available.forEach((e) => {
      const m = muscleOf(e);
      muscles.add(m.primary);
      if (m.secondary) muscles.add(m.secondary);
    });
    return { count: available.length, cov: muscles.size };
  }, [ort, allLib, disabledExercises]);

  if (!ort) return null;
  const heute = ort.id === activeGym?.id;
  const alleMaschinen = MASCHINEN_KEYS.every((k) => ort.equip.includes(k));

  return (
    <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-4">
      <Kicker as="h2" className="mb-3">
        Orte & Geräte
      </Kicker>

      {gyms.length > 1 && (
        <Segment
          label="Ort bearbeiten"
          // Der Ort mit der Zahl seiner Geräte — „Studio · 10“.
          options={gyms.map((g) => ({
            value: g.id,
            label: `${g.name} · ${g.equip.length}`,
            ariaLabel: `${g.name}, ${g.equip.length} Geräte`,
          }))}
          value={ort.id}
          onChange={setEditId}
          className="mb-2"
        />
      )}
      <p className="mb-4 text-sm leading-relaxed text-muted">
        {heute
          ? "Hier trainierst du heute."
          : `Heute trainierst du: ${activeGym?.name ?? "–"}. Den Ort wählst du auf der Heute-Seite.`}
      </p>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-3xs font-bold text-muted">
          Name
        </span>
        <input
          key={ort.id}
          defaultValue={ort.name}
          maxLength={40}
          onBlur={(e) => {
            if (!e.target.value.trim()) e.target.value = ort.name;
            else if (e.target.value.trim() !== ort.name) renameGym(ort.id, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="min-h-11 w-full rounded-inner border-dick border-rand bg-surface-1 px-3 py-2.5 text-base text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        />
      </label>

      <p className="mb-2 text-sm leading-relaxed text-muted">
        Tippe an, was es an diesem Ort gibt. ATLAS plant nur mit diesen Geräten.
      </p>
      {/* Mehrfachauswahl im ChipToggle-Rezept: gewählt in Tinte mit Haken,
          nicht gewählt mit Rand, beide voll lesbar. */}
      <div className="flex flex-wrap gap-2">
        {EQUIP_LIST.map((e) => {
          const on = ort.equip.includes(e.key);
          return (
            <ChipToggle
              key={e.key}
              active={on}
              onClick={() => toggleEquip(e.key, ort.id)}
              className="flex min-h-11 items-center gap-1.5 px-4"
            >
              {on && <Check size={16} strokeWidth={2.5} aria-hidden />}
              {e.label}
            </ChipToggle>
          );
        })}
      </div>

      {/* Kraftgeräte einzeln; der Sammelknopf wählt alle an oder ab. */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-fg">Kraftgeräte einzeln</p>
        <ChipToggle
          active={alleMaschinen}
          onClick={() => setOrtGeraete(MASCHINEN_KEYS, !alleMaschinen, ort.id)}
          className="flex min-h-11 items-center gap-1.5 px-4"
        >
          {alleMaschinen && <Check size={16} strokeWidth={2.5} aria-hidden />}
          Kraftgeräte
        </ChipToggle>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {MASCHINEN.map((e) => {
          const on = ort.equip.includes(e.key);
          return (
            <ChipToggle
              key={e.key}
              active={on}
              onClick={() => toggleEquip(e.key, ort.id)}
              className="flex min-h-11 items-center gap-1.5 px-4"
            >
              {on && <Check size={16} strokeWidth={2.5} aria-hidden />}
              {e.label}
            </ChipToggle>
          );
        })}
      </div>

      <div className="mt-4 rounded-inner border-dick border-rand px-3.5 py-3">
        <Toggle
          checked={!!ort.nurGeraete}
          onChange={(on) => setNurGeraete(on, ort.id)}
          label="Nur an Geräten trainieren"
          hint="ATLAS plant hier nur Maschinen und Kabelzug, keine Hanteln und kein Körpergewicht."
        />
      </div>

      <p className="mt-3 flex items-center justify-between gap-2 rounded-inner bg-surface-0 px-3 py-2.5 text-sm text-muted">
        <span>
          <span className="font-semibold tabular-nums text-fg">{stats.count}</span> Übungen verfügbar
        </span>
        <span>
          <span className="font-semibold tabular-nums text-fg">{stats.cov}</span>/{MUSCLE_ORDER.length}{" "}
          Muskelgruppen
        </span>
      </p>

      {gyms.length > 1 && (
        <Pressable
          onClick={() => setLoeschen(true)}
          className="mt-3 flex min-h-11 items-center rounded-pill text-sm font-semibold text-gefahr focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          {`„${ort.name}“ löschen`}
        </Pressable>
      )}

      <div className="mt-5 border-t border-line-card pt-4">
        <Kicker className="mb-2">Neuer Ort</Kicker>
        <div className="flex gap-2">
          <input
            value={neuerOrt}
            onChange={(e) => setNeuerOrt(e.target.value)}
            maxLength={40}
            placeholder="z. B. Hotel"
            aria-label="Neuen Ort anlegen"
            className="min-h-11 min-w-0 flex-1 rounded-inner border-dick border-rand bg-surface-1 px-3 py-2 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          />
          <Button
            variant="secondary"
            disabled={!neuerOrt.trim()}
            onClick={() => {
              if (!neuerOrt.trim()) return;
              setEditId(addGym(neuerOrt));
              setNeuerOrt("");
            }}
          >
            Anlegen
          </Button>
        </div>
      </div>

      <Sheet open={loeschen} onClose={() => setLoeschen(false)} title={`„${ort.name}“ löschen?`}>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Der Ort und seine Geräteliste verschwinden. Gespeicherte Einheiten bleiben,
          wie sie sind.
        </p>
        <div className="flex flex-col gap-2 pb-2">
          <Button
            variant="danger"
            full
            onClick={() => {
              removeGym(ort.id);
              setEditId(null);
              setLoeschen(false);
            }}
          >
            Ort löschen
          </Button>
          <Button variant="ghost" full onClick={() => setLoeschen(false)}>
            Abbrechen
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
